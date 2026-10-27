/**
 * scripts/reset-dev-users.ts
 *
 * Recria/corrige TODOS os usuários de demonstração no Supabase LOCAL:
 *  1. Auth: createUser / updateUserById com email_confirm: true e senha de SEED_DEFAULT_PASSWORD;
 *  2. profiles: linha com o MESMO id do Auth, cargo (role_id) e departamento principal;
 *  3. department_memberships: vínculos corretos (remove vínculos obsoletos desses usuários);
 *  4. Testa signInWithPassword + leitura do próprio perfil (mesma consulta do front) e imprime uma tabela.
 *
 * Uso: npm run dev:reset-users
 * Só roda em desenvolvimento: exige NODE_ENV != production e VITE_SUPABASE_URL apontando para localhost.
 */
import { createClient, type User } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/* ----------------------------- Guardas de ambiente ----------------------------- */

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL ausente ou inválida.'),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'VITE_SUPABASE_ANON_KEY ausente.'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY ausente.'),
  SEED_DEFAULT_PASSWORD: z
    .string({ error: 'SEED_DEFAULT_PASSWORD ausente no .env.' })
    .min(8, 'SEED_DEFAULT_PASSWORD deve ter no mínimo 8 caracteres.')
    .regex(/[A-Za-z]/, 'SEED_DEFAULT_PASSWORD deve conter letras.')
    .regex(/\d/, 'SEED_DEFAULT_PASSWORD deve conter números.'),
});

function fail(msg: string): never {
  console.error(`\n[reset-dev-users] ${msg}\n`);
  process.exit(1);
}

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  fail(parsed.error.issues.map((i) => `- ${i.message}`).join('\n'));
}
const env = parsed.data;

if (process.env.NODE_ENV === 'production') {
  fail('Bloqueado: NODE_ENV=production. Este script só pode rodar em desenvolvimento.');
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal']);
const supabaseHost = new URL(env.VITE_SUPABASE_URL).hostname;
if (!LOCAL_HOSTS.has(supabaseHost)) {
  fail(`Bloqueado: VITE_SUPABASE_URL aponta para "${supabaseHost}". O reset só é permitido no Supabase local.`);
}

/* ----------------------------- Definição dos usuários ----------------------------- */

type RoleName = 'Presidente' | 'Vice-presidente' | 'Diretor' | 'Membro';
type DeptCode = 'Administração' | 'Financeiro' | 'RH' | 'Marketing' | 'Projetos';

interface DemoUser {
  name: string;
  email: string;
  role: RoleName;
  primaryDepartment: DeptCode;
  memberships: { department: DeptCode; isDirector: boolean }[];
}

const DEMO_USERS: DemoUser[] = [
  {
    name: 'Presidente (Admin)',
    email: 'presidente@gmail.com',
    role: 'Presidente',
    primaryDepartment: 'Administração',
    memberships: [{ department: 'Administração', isDirector: true }],
  },
  {
    name: 'Vice-presidente',
    email: 'vicepresidente@tecnosystem.com',
    role: 'Vice-presidente',
    primaryDepartment: 'Administração',
    memberships: [
      { department: 'Administração', isDirector: false },
      { department: 'Projetos', isDirector: true },
    ],
  },
  { name: 'Helena Rocha', email: 'rh@tecnosystem.com', role: 'Diretor', primaryDepartment: 'RH', memberships: [{ department: 'RH', isDirector: true }] },
  { name: 'Camila Ribeiro', email: 'camila.ribeiro@tecnosystem.com.br', role: 'Membro', primaryDepartment: 'RH', memberships: [{ department: 'RH', isDirector: false }] },
  { name: 'Bruno Carvalho', email: 'financeiro@tecnosystem.com', role: 'Diretor', primaryDepartment: 'Financeiro', memberships: [{ department: 'Financeiro', isDirector: true }] },
  { name: 'Beatriz Santos', email: 'beatriz.santos@tecnosystem.com.br', role: 'Membro', primaryDepartment: 'Financeiro', memberships: [{ department: 'Financeiro', isDirector: false }] },
  { name: 'Eduardo Ferreira', email: 'marketing@tecnosystem.com', role: 'Diretor', primaryDepartment: 'Marketing', memberships: [{ department: 'Marketing', isDirector: true }] },
  { name: 'Diego Nascimento', email: 'diego.nascimento@tecnosystem.com.br', role: 'Membro', primaryDepartment: 'Marketing', memberships: [{ department: 'Marketing', isDirector: false }] },
  { name: 'Carlos Mendes', email: 'projetos@tecnosystem.com', role: 'Diretor', primaryDepartment: 'Projetos', memberships: [{ department: 'Projetos', isDirector: true }] },
  { name: 'Mariana Souza', email: 'mariana.souza@tecnosystem.com.br', role: 'Membro', primaryDepartment: 'Projetos', memberships: [{ department: 'Projetos', isDirector: false }] },
];

/* ----------------------------- Clientes ----------------------------- */

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = env.SEED_DEFAULT_PASSWORD;

/** Lista todos os usuários do Auth (paginado) */
async function listAllAuthUsers(): Promise<User[]> {
  const all: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Falha ao listar usuários do Auth: [${error.status ?? '-'}] ${error.message}`);
    all.push(...data.users);
    if (data.users.length < 200) break;
  }
  return all;
}

interface ResultRow {
  email: string;
  senha: string;
  cargo: string;
  departamentos: string;
  resultado: string;
}

async function main(): Promise<void> {
  console.log('=== Reset de usuários de demonstração (Supabase local) ===');
  console.log(`Supabase: ${env.VITE_SUPABASE_URL}\n`);

  // Mapas de cargos e departamentos
  const { data: roles, error: rolesErr } = await admin.from('roles').select('id, name');
  if (rolesErr || !roles) fail(`Falha ao ler roles: ${rolesErr?.message}`);
  const { data: depts, error: deptsErr } = await admin.from('departments').select('id, code, name');
  if (deptsErr || !depts) fail(`Falha ao ler departments: ${deptsErr?.message}`);

  const roleId = new Map<string, string>(roles.map((r: { id: string; name: string }) => [r.name, r.id]));
  const deptId = new Map<string, string>();
  depts.forEach((d: { id: string; code: string; name: string }) => {
    deptId.set(d.code, d.id);
    deptId.set(d.name, d.id);
  });

  const existing = await listAllAuthUsers();
  const byEmail = new Map(existing.map((u) => [u.email?.toLowerCase() ?? '', u]));

  const rows: ResultRow[] = [];

  for (const def of DEMO_USERS) {
    const row: ResultRow = {
      email: def.email,
      senha: password,
      cargo: def.role,
      departamentos: def.memberships.map((m) => `${m.department}${m.isDirector ? ' (dir.)' : ''}`).join(' + '),
      resultado: '',
    };

    try {
      const rId = roleId.get(def.role);
      const dId = deptId.get(def.primaryDepartment);
      if (!rId) throw new Error(`cargo "${def.role}" não existe em roles`);
      if (!dId) throw new Error(`departamento "${def.primaryDepartment}" não existe em departments`);

      const metadata = { name: def.name, role: def.role, department: def.primaryDepartment };

      // 1. Auth
      let user = byEmail.get(def.email.toLowerCase());
      if (!user) {
        const { data, error } = await admin.auth.admin.createUser({
          email: def.email,
          password,
          email_confirm: true,
          user_metadata: metadata,
        });
        if (error || !data.user) throw new Error(`createUser: [${error?.status ?? '-'}] ${error?.message}`);
        user = data.user;
      } else {
        const { data, error } = await admin.auth.admin.updateUserById(user.id, {
          password,
          email_confirm: true,
          user_metadata: metadata,
          ban_duration: 'none',
        });
        if (error || !data.user) throw new Error(`updateUserById: [${error?.status ?? '-'}] ${error?.message}`);
        user = data.user;
      }

      // 2. profiles (mesmo id do Auth)
      const { error: profErr } = await admin.from('profiles').upsert(
        {
          id: user.id,
          name: def.name,
          email: def.email,
          role_id: rId,
          department_id: dId,
          is_active: true,
          must_change_password: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (profErr) throw new Error(`profiles.upsert: [${profErr.code}] ${profErr.message}`);

      // 3. department_memberships: remove vínculos obsoletos e grava os corretos
      const wantedDeptIds = def.memberships.map((m) => {
        const id = deptId.get(m.department);
        if (!id) throw new Error(`departamento "${m.department}" não existe`);
        return id;
      });
      const { error: delErr } = await admin
        .from('department_memberships')
        .delete()
        .eq('user_id', user.id)
        .not('department_id', 'in', `(${wantedDeptIds.join(',')})`);
      if (delErr) throw new Error(`memberships.delete: [${delErr.code}] ${delErr.message}`);

      const { error: memErr } = await admin.from('department_memberships').upsert(
        def.memberships.map((m, i) => ({ user_id: user.id, department_id: wantedDeptIds[i], is_director: m.isDirector })),
        { onConflict: 'user_id,department_id' },
      );
      if (memErr) throw new Error(`memberships.upsert: [${memErr.code}] ${memErr.message}`);

      // 4. Teste real de login com a chave anon + leitura do próprio perfil (mesma consulta do front)
      const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({ email: def.email, password });
      if (signErr || !signIn.user) throw new Error(`signIn: [${signErr?.status ?? '-'} ${signErr?.code ?? ''}] ${signErr?.message}`);

      const { data: prof, error: selErr } = await anon
        .from('profiles')
        .select('id, is_active, departments!profiles_department_id_fkey ( code ), roles ( name )')
        .eq('id', signIn.user.id)
        .single();
      if (selErr || !prof) throw new Error(`perfil: [${selErr?.code ?? '-'}] ${selErr?.message ?? 'vazio'}`);
      await anon.auth.signOut();

      row.resultado = 'OK';
    } catch (err) {
      row.resultado = `FALHA – ${(err as Error).message}`;
    }

    rows.push(row);
  }

  console.table(rows);

  const failures = rows.filter((r) => r.resultado !== 'OK').length;
  console.log(failures === 0 ? `\n✅ ${rows.length}/${rows.length} usuários com login OK.` : `\n❌ ${failures} usuário(s) com falha.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => fail(`Erro inesperado: ${(err as Error).message}`));
