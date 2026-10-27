-- ==============================================================================
-- Migration: 20261027000006_vice_president_departments_and_permissions.sql
-- 1. Departamento Administração (is_executive_department = true)
-- 2. Cargo Vice-presidente em roles
-- 3. Tabela department_memberships (suporte a múltiplos departamentos)
-- 4. Funções helpers: is_executive() e user_department_ids()
-- 5. Trigger garantindo ao menos um Presidente ativo (ensure_at_least_one_active_president)
-- 6. Tabela department_role_permissions e função has_department_permission()
-- 7. Função can_manage_user() e RPC hr_responders_stats()
-- 8. Tabelas finance_months, finance_entries, finance_month_projects, finance_attachments
-- 9. Bucket finance-files no Supabase Storage com RLS restrito a finance.view
-- 10. Atualização de RLS em tickets, audit_logs e profiles para is_executive()
-- ==============================================================================

-- 1. Adicionar is_executive_department e departamento Administração
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS is_executive_department BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.departments (id, code, name, email, is_executive_department)
VALUES ('d1000000-0000-0000-0000-000000000000', 'Administração', 'Administração', 'administracao@tecnosystem.com', true)
ON CONFLICT (code) DO UPDATE SET
  is_executive_department = true,
  name = excluded.name,
  email = excluded.email;

-- Garante que os demais 4 departamentos não sejam executivos
UPDATE public.departments
SET is_executive_department = false
WHERE code <> 'Administração';

CREATE INDEX IF NOT EXISTS idx_departments_is_executive ON public.departments(is_executive_department);

-- 2. Cargo Vice-presidente na tabela roles
INSERT INTO public.roles (id, name, description, permissions)
VALUES (
  'b1000000-0000-0000-0000-000000000006',
  'Vice-presidente',
  'Vice-presidente executivo da Tecno System',
  ARRAY[
    'ticket.view_all',
    'ticket.delete',
    'ticket.assign',
    'user.manage',
    'audit.view',
    'profile.change_department',
    'attachment.upload',
    'people.view_all',
    'people.edit_all',
    'people.create_member',
    'people.create_leadership',
    'people.create_executive',
    'people.deactivate',
    'people.view_activity',
    'finance.view',
    'finance.manage',
    'finance.close_month'
  ]
)
ON CONFLICT (name) DO UPDATE SET
  description = excluded.description,
  permissions = excluded.permissions;

-- 3. Tabela department_memberships
CREATE TABLE IF NOT EXISTS public.department_memberships (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_director BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_memberships_user ON public.department_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_memberships_dept ON public.department_memberships(department_id);

ALTER TABLE public.department_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "department_memberships_select_policy" ON public.department_memberships;
CREATE POLICY "department_memberships_select_policy"
  ON public.department_memberships FOR SELECT
  TO authenticated
  USING (true);

-- 4. Funções helpers: is_executive() e user_department_ids()
CREATE OR REPLACE FUNCTION public.is_executive(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = check_user_id
      AND p.is_active = true
      AND (r.name = 'Presidente' OR r.name = 'Vice-presidente')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_department_ids(check_user_id uuid)
RETURNS TABLE(department_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT p.department_id
  FROM public.profiles p
  WHERE p.id = check_user_id AND p.department_id IS NOT NULL
  UNION
  SELECT dm.department_id
  FROM public.department_memberships dm
  WHERE dm.user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Trigger garantindo ao menos um Presidente ativo
CREATE OR REPLACE FUNCTION public.ensure_at_least_one_active_president()
RETURNS TRIGGER AS $$
DECLARE
  v_pres_role_id uuid;
  v_active_presidents int;
BEGIN
  SELECT id INTO v_pres_role_id FROM public.roles WHERE name = 'Presidente';

  IF TG_OP = 'DELETE' AND OLD.role_id = v_pres_role_id THEN
    SELECT count(*) INTO v_active_presidents
    FROM public.profiles
    WHERE role_id = v_pres_role_id AND is_active = true AND id <> OLD.id;

    IF v_active_presidents < 1 THEN
      RAISE EXCEPTION 'Operação negada: O sistema deve manter sempre ao menos um Presidente ativo.';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.role_id = v_pres_role_id THEN
    IF (NEW.is_active = false OR NEW.role_id <> v_pres_role_id) THEN
      SELECT count(*) INTO v_active_presidents
      FROM public.profiles
      WHERE role_id = v_pres_role_id AND is_active = true AND id <> OLD.id;

      IF v_active_presidents < 1 THEN
        RAISE EXCEPTION 'Operação negada: O sistema deve manter sempre ao menos um Presidente ativo.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ensure_active_president ON public.profiles;
CREATE TRIGGER trg_ensure_active_president
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_at_least_one_active_president();

-- 6. Tabela department_role_permissions
CREATE TABLE IF NOT EXISTS public.department_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, department_id, permission)
);

ALTER TABLE public.department_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "department_role_permissions_select" ON public.department_role_permissions;
CREATE POLICY "department_role_permissions_select"
  ON public.department_role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Popular matriz de permissões granulares da Seção 3
DO $$
DECLARE
  v_role_dir uuid;
  v_role_mem uuid;
  v_dept_rh uuid;
  v_dept_fin uuid;
BEGIN
  SELECT id INTO v_role_dir FROM public.roles WHERE name = 'Diretor';
  SELECT id INTO v_role_mem FROM public.roles WHERE name = 'Membro';
  SELECT id INTO v_dept_rh FROM public.departments WHERE code = 'RH';
  SELECT id INTO v_dept_fin FROM public.departments WHERE code = 'Financeiro';

  -- Diretor do RH: todas as permissões de people.*
  INSERT INTO public.department_role_permissions (role_id, department_id, permission)
  VALUES
    (v_role_dir, v_dept_rh, 'people.view_all'),
    (v_role_dir, v_dept_rh, 'people.create_member'),
    (v_role_dir, v_dept_rh, 'people.create_leadership'),
    (v_role_dir, v_dept_rh, 'people.create_executive'),
    (v_role_dir, v_dept_rh, 'people.edit_members_other_depts'),
    (v_role_dir, v_dept_rh, 'people.edit_all'),
    (v_role_dir, v_dept_rh, 'people.deactivate'),
    (v_role_dir, v_dept_rh, 'people.view_activity')
  ON CONFLICT DO NOTHING;

  -- Membro do RH: permissões restritas
  INSERT INTO public.department_role_permissions (role_id, department_id, permission)
  VALUES
    (v_role_mem, v_dept_rh, 'people.view_all'),
    (v_role_mem, v_dept_rh, 'people.create_member'),
    (v_role_mem, v_dept_rh, 'people.edit_members_other_depts'),
    (v_role_mem, v_dept_rh, 'people.view_activity')
  ON CONFLICT DO NOTHING;

  -- Diretor do Financeiro: finance.view, finance.manage, finance.close_month
  INSERT INTO public.department_role_permissions (role_id, department_id, permission)
  VALUES
    (v_role_dir, v_dept_fin, 'finance.view'),
    (v_role_dir, v_dept_fin, 'finance.manage'),
    (v_role_dir, v_dept_fin, 'finance.close_month')
  ON CONFLICT DO NOTHING;

  -- Membro do Financeiro: finance.view, finance.manage
  INSERT INTO public.department_role_permissions (role_id, department_id, permission)
  VALUES
    (v_role_mem, v_dept_fin, 'finance.view'),
    (v_role_mem, v_dept_fin, 'finance.manage')
  ON CONFLICT DO NOTHING;
END $$;

-- Função helper has_department_permission
CREATE OR REPLACE FUNCTION public.has_department_permission(check_user_id uuid, check_perm text)
RETURNS boolean AS $$
BEGIN
  IF public.is_executive(check_user_id) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.department_role_permissions drp ON drp.role_id = p.role_id
    WHERE p.id = check_user_id
      AND p.is_active = true
      AND (
        drp.department_id = p.department_id
        OR drp.department_id IN (SELECT dm.department_id FROM public.department_memberships dm WHERE dm.user_id = p.id)
      )
      AND drp.permission = check_perm
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. Função can_manage_user
CREATE OR REPLACE FUNCTION public.can_manage_user(
  actor_id uuid,
  target_id uuid,
  action_name text,
  new_values jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean AS $$
DECLARE
  actor_role_name text;
  actor_dept_code text;
  target_role_name text;
  target_dept_code text;
  requested_role_name text;
  requested_dept_code text;
BEGIN
  IF public.is_executive(actor_id) THEN
    RETURN true;
  END IF;

  SELECT r.name, d.code INTO actor_role_name, actor_dept_code
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  LEFT JOIN public.departments d ON p.department_id = d.id
  WHERE p.id = actor_id;

  IF actor_dept_code <> 'RH' THEN
    RETURN false;
  END IF;

  IF new_values ? 'role' THEN
    requested_role_name := new_values->>'role';
  END IF;
  IF new_values ? 'department' THEN
    requested_dept_code := new_values->>'department';
  END IF;

  -- Criação de Usuário
  IF action_name = 'create' THEN
    IF actor_role_name = 'Diretor' THEN
      RETURN public.has_department_permission(actor_id, 'people.create_leadership');
    ELSIF actor_role_name = 'Membro' THEN
      IF requested_role_name IS NOT NULL AND requested_role_name <> 'Membro' THEN
        RETURN false;
      END IF;
      IF requested_dept_code IN ('RH', 'Administração') THEN
        RETURN false;
      END IF;
      RETURN public.has_department_permission(actor_id, 'people.create_member');
    END IF;
    RETURN false;
  END IF;

  -- Edição / Desativação
  IF target_id IS NOT NULL THEN
    SELECT r.name, d.code INTO target_role_name, target_dept_code
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    LEFT JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = target_id;

    IF actor_id = target_id AND requested_role_name IS NOT NULL AND requested_role_name <> actor_role_name THEN
      RETURN false;
    END IF;

    IF actor_role_name = 'Diretor' THEN
      IF action_name = 'deactivate' THEN
        RETURN public.has_department_permission(actor_id, 'people.deactivate');
      END IF;
      RETURN public.has_department_permission(actor_id, 'people.edit_all');
    END IF;

    IF actor_role_name = 'Membro' THEN
      IF action_name = 'deactivate' THEN
        RETURN false;
      END IF;
      IF target_role_name <> 'Membro' OR target_dept_code = 'RH' OR target_dept_code = 'Administração' THEN
        RETURN false;
      END IF;
      IF requested_role_name IS NOT NULL AND requested_role_name <> target_role_name THEN
        RETURN false;
      END IF;
      IF requested_dept_code IN ('RH', 'Administração') THEN
        RETURN false;
      END IF;
      RETURN public.has_department_permission(actor_id, 'people.edit_members_other_depts');
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RPC hr_responders_stats (SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.hr_responders_stats(int);

CREATE OR REPLACE FUNCTION public.hr_responders_stats(period_days int DEFAULT 30)
RETURNS TABLE (
  profile_id uuid,
  name text,
  email text,
  department_name text,
  role_name text,
  assigned_count bigint,
  comments_count bigint,
  resolved_count bigint,
  last_activity_at timestamptz,
  responded_in_period boolean
) AS $$
DECLARE
  v_start timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND current_setting('role', true) <> 'service_role' THEN
    IF NOT public.has_department_permission(auth.uid(), 'people.view_activity') THEN
      RAISE EXCEPTION 'Acesso negado: Você não possui a permissão people.view_activity.';
    END IF;
  END IF;

  v_start := now() - (coalesce(period_days, 30) || ' days')::interval;

  RETURN QUERY
  WITH active_users AS (
    SELECT 
      p.id, 
      p.name, 
      p.email,
      coalesce(d.name, 'Geral')::text as dept_name, 
      r.name::text as r_name
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    LEFT JOIN public.departments d ON p.department_id = d.id
    WHERE p.is_active = true AND r.name <> 'Cliente'
  ),
  user_counts AS (
    SELECT
      u.id as u_id,
      u.name as u_name,
      u.email as u_email,
      u.dept_name,
      u.r_name,
      (SELECT count(*) FROM public.tickets t WHERE t.assignee_id = u.id AND t.created_at >= v_start)::bigint as total_assigned,
      (SELECT count(*) FROM public.ticket_comments tc WHERE tc.author_id = u.id AND tc.created_at >= v_start)::bigint as total_comments,
      (SELECT count(*) FROM public.tickets t WHERE t.assignee_id = u.id AND t.status = 'Resolvido' AND t.resolved_at >= v_start)::bigint as total_resolved,
      (
        SELECT max(act_date)
        FROM (
          SELECT tc.created_at as act_date FROM public.ticket_comments tc WHERE tc.author_id = u.id
          UNION ALL
          SELECT t.resolved_at as act_date FROM public.tickets t WHERE t.assignee_id = u.id AND t.resolved_at IS NOT NULL
        ) acts
      ) as max_act
    FROM active_users u
  )
  SELECT
    uc.u_id as profile_id,
    uc.u_name as name,
    uc.u_email as email,
    uc.dept_name as department_name,
    uc.r_name as role_name,
    uc.total_assigned as assigned_count,
    uc.total_comments as comments_count,
    uc.total_resolved as resolved_count,
    uc.max_act as last_activity_at,
    (uc.total_comments > 0 OR uc.total_resolved > 0) as responded_in_period
  FROM user_counts uc
  ORDER BY uc.u_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Tabelas do Módulo Financeiro
CREATE TABLE IF NOT EXISTS public.finance_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMPTZ,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_months ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id UUID NOT NULL REFERENCES public.finance_months(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('gain', 'expense')),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Projetos', 'Ferramentas', 'Marketing', 'Eventos', 'Impostos e taxas', 'Outros')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.finance_month_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id UUID NOT NULL REFERENCES public.finance_months(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  billed_amount_cents BIGINT DEFAULT 0,
  delivery_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_month_projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.finance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_project_id UUID NOT NULL REFERENCES public.finance_month_projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes <= 1048576),
  description VARCHAR(200),
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS Financeiro
DROP POLICY IF EXISTS "finance_months_select" ON public.finance_months;
CREATE POLICY "finance_months_select" ON public.finance_months FOR SELECT TO authenticated
  USING (public.has_department_permission(auth.uid(), 'finance.view'));

DROP POLICY IF EXISTS "finance_months_manage" ON public.finance_months;
CREATE POLICY "finance_months_manage" ON public.finance_months FOR ALL TO authenticated
  USING (public.has_department_permission(auth.uid(), 'finance.manage') OR public.has_department_permission(auth.uid(), 'finance.close_month'))
  WITH CHECK (public.has_department_permission(auth.uid(), 'finance.manage') OR public.has_department_permission(auth.uid(), 'finance.close_month'));

DROP POLICY IF EXISTS "finance_entries_select" ON public.finance_entries;
CREATE POLICY "finance_entries_select" ON public.finance_entries FOR SELECT TO authenticated
  USING (public.has_department_permission(auth.uid(), 'finance.view'));

DROP POLICY IF EXISTS "finance_entries_manage" ON public.finance_entries;
CREATE POLICY "finance_entries_manage" ON public.finance_entries FOR ALL TO authenticated
  USING (public.has_department_permission(auth.uid(), 'finance.manage'))
  WITH CHECK (public.has_department_permission(auth.uid(), 'finance.manage'));

DROP POLICY IF EXISTS "finance_month_projects_select" ON public.finance_month_projects;
CREATE POLICY "finance_month_projects_select" ON public.finance_month_projects FOR SELECT TO authenticated
  USING (public.has_department_permission(auth.uid(), 'finance.view'));

DROP POLICY IF EXISTS "finance_month_projects_manage" ON public.finance_month_projects;
CREATE POLICY "finance_month_projects_manage" ON public.finance_month_projects FOR ALL TO authenticated
  USING (public.has_department_permission(auth.uid(), 'finance.manage'))
  WITH CHECK (public.has_department_permission(auth.uid(), 'finance.manage'));

DROP POLICY IF EXISTS "finance_attachments_select" ON public.finance_attachments;
CREATE POLICY "finance_attachments_select" ON public.finance_attachments FOR SELECT TO authenticated
  USING (public.has_department_permission(auth.uid(), 'finance.view'));

DROP POLICY IF EXISTS "finance_attachments_manage" ON public.finance_attachments;
CREATE POLICY "finance_attachments_manage" ON public.finance_attachments FOR ALL TO authenticated
  USING (public.has_department_permission(auth.uid(), 'finance.manage'))
  WITH CHECK (public.has_department_permission(auth.uid(), 'finance.manage'));

-- 9. Bucket finance-files no Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'finance-files',
  'finance-files',
  false,
  1048576,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 1048576;

DROP POLICY IF EXISTS "finance_files_select" ON storage.objects;
CREATE POLICY "finance_files_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'finance-files' AND public.has_department_permission(auth.uid(), 'finance.view'));

DROP POLICY IF EXISTS "finance_files_insert" ON storage.objects;
CREATE POLICY "finance_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'finance-files' AND public.has_department_permission(auth.uid(), 'finance.manage'));

DROP POLICY IF EXISTS "finance_files_delete" ON storage.objects;
CREATE POLICY "finance_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'finance-files' AND public.has_department_permission(auth.uid(), 'finance.manage'));

-- 10. Atualização de RLS em tickets e audit_logs
DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;
DROP POLICY IF EXISTS "Visualização de chamados por departamento ou irrestrita" ON public.tickets;
CREATE POLICY "tickets_select_policy" ON public.tickets FOR SELECT TO authenticated
  USING (
    public.is_executive(auth.uid())
    OR (department_id IN (SELECT department_id FROM public.user_department_ids(auth.uid())))
    OR (assigned_department_id IN (SELECT department_id FROM public.user_department_ids(auth.uid())))
    OR (requester_id = auth.uid())
    OR (assignee_id = auth.uid())
  );

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_executive(auth.uid())
    OR (
      has_permission('audit.view')
      AND department_id IN (SELECT department_id FROM public.user_department_ids(auth.uid()))
    )
  );

-- View para agregação mensal financeira (protegida com security_invoker para respeitar RLS)
CREATE OR REPLACE VIEW public.vw_finance_monthly_summary
WITH (security_invoker = true) AS
SELECT
  fm.id as month_id,
  fm.year_month,
  fm.status,
  coalesce(sum(case when fe.type = 'gain' then fe.amount_cents else 0 end), 0) as total_gain_cents,
  coalesce(sum(case when fe.type = 'expense' then fe.amount_cents else 0 end), 0) as total_expense_cents,
  coalesce(sum(case when fe.type = 'gain' then fe.amount_cents else -fe.amount_cents end), 0) as net_balance_cents
FROM public.finance_months fm
LEFT JOIN public.finance_entries fe ON fe.month_id = fm.id
GROUP BY fm.id, fm.year_month, fm.status;
