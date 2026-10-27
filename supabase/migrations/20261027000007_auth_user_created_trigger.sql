-- Migration: 20261027000007_auth_user_created_trigger.sql
-- Description: Trigger para criar automaticamente a linha em public.profiles quando um usuário é inserido em auth.users

-- 1. Função de criação/sincronização de perfil automática
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_email TEXT;
  v_role_id UUID;
  v_dept_id UUID;
  v_role_name TEXT;
  v_dept_name TEXT;
  v_is_director BOOLEAN := false;
BEGIN
  v_email := COALESCE(NEW.email, NEW.id::text || '@tecnosystem.local');
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    INITCAP(REPLACE(split_part(v_email, '@', 1), '.', ' '))
  );

  -- 1. Identificar o cargo (role)
  v_role_name := COALESCE(
    NEW.raw_user_meta_data->>'role_name',
    NEW.raw_user_meta_data->>'role',
    CASE
      WHEN v_email ILIKE 'presidente@%' THEN 'Presidente'
      WHEN v_email ILIKE 'vicepresidente@%' THEN 'Vice-presidente'
      WHEN v_email ILIKE 'rh@%' OR v_email ILIKE 'financeiro@%' OR v_email ILIKE 'marketing@%' OR v_email ILIKE 'projetos@%' THEN 'Diretor'
      ELSE 'Membro'
    END
  );

  SELECT id INTO v_role_id FROM public.roles WHERE LOWER(name) = LOWER(v_role_name) LIMIT 1;
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM public.roles WHERE LOWER(name) = 'membro' LIMIT 1;
  END IF;
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM public.roles LIMIT 1;
  END IF;

  -- 2. Identificar o departamento
  v_dept_name := COALESCE(
    NEW.raw_user_meta_data->>'department_code',
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'departmentCode',
    CASE
      WHEN v_email ILIKE 'presidente@%' OR v_email ILIKE 'vicepresidente@%' OR v_email ILIKE 'admin@%' THEN 'Administração'
      WHEN v_email ILIKE '%rh%' THEN 'RH'
      WHEN v_email ILIKE '%financeiro%' THEN 'Financeiro'
      WHEN v_email ILIKE '%marketing%' THEN 'Marketing'
      ELSE 'Projetos'
    END
  );

  SELECT id INTO v_dept_id FROM public.departments WHERE LOWER(code) = LOWER(v_dept_name) OR LOWER(name) = LOWER(v_dept_name) LIMIT 1;
  IF v_dept_id IS NULL THEN
    SELECT id INTO v_dept_id FROM public.departments WHERE LOWER(code) = 'projetos' LIMIT 1;
  END IF;

  IF v_role_name IN ('Presidente', 'Diretor') THEN
    v_is_director := true;
  END IF;

  -- 3. Upsert no perfil
  INSERT INTO public.profiles (
    id,
    name,
    email,
    department_id,
    role_id,
    avatar_url,
    is_active,
    must_change_password,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_name,
    v_email,
    v_dept_id,
    v_role_id,
    NEW.raw_user_meta_data->>'avatar_url',
    true,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
    email = EXCLUDED.email,
    department_id = COALESCE(EXCLUDED.department_id, public.profiles.department_id),
    role_id = COALESCE(EXCLUDED.role_id, public.profiles.role_id),
    updated_at = NOW();

  -- 4. Inserir em department_memberships se houver departamento
  IF v_dept_id IS NOT NULL THEN
    INSERT INTO public.department_memberships (user_id, department_id, is_director, created_at)
    VALUES (NEW.id, v_dept_id, v_is_director, NOW())
    ON CONFLICT (user_id, department_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Vincular o Trigger à tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Atualizar função de departamentos do usuário para verificar is_active
CREATE OR REPLACE FUNCTION public.user_department_ids(check_user_id uuid)
RETURNS TABLE(department_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.department_id
  FROM public.profiles p
  WHERE p.id = check_user_id AND p.department_id IS NOT NULL AND p.is_active = true
  UNION
  SELECT dm.department_id
  FROM public.department_memberships dm
  JOIN public.profiles p ON p.id = dm.user_id
  WHERE dm.user_id = check_user_id AND p.is_active = true;
END;
$$;

-- 4. Atualizar tickets_select_policy garantindo que usuário inativo não leia nenhum chamado
DROP POLICY IF EXISTS "Leitura de chamados por setor ou permissão global" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;

CREATE POLICY "tickets_select_policy" ON public.tickets FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true)
    AND (
      public.is_executive(auth.uid())
      OR (department_id IN (SELECT department_id FROM public.user_department_ids(auth.uid())))
      OR (assigned_department_id IN (SELECT department_id FROM public.user_department_ids(auth.uid())))
      OR (requester_id = auth.uid())
      OR (assignee_id = auth.uid())
    )
  );

