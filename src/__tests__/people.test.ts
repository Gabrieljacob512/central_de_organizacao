import { beforeEach, describe, expect, it } from 'vitest';
import { seedDemoData } from '../data/seed';
import { clearStorage } from '../data/storage';
import { signIn } from '../services/authService';
import {
  createPerson,
  generateTemporaryPassword,
  togglePersonStatus,
} from '../services/peopleService';

describe('Módulo de Pessoas (Flow 3)', () => {
  beforeEach(() => {
    clearStorage();
    seedDemoData(true);
  });

  it('deve gerar senha temporária segura com exatamente 10 caracteres alfanuméricos', () => {
    const password = generateTemporaryPassword();
    expect(typeof password).toBe('string');
    expect(password.length).toBe(10);

    // Gerar múltiplas senhas e assegurar unicidade
    const p2 = generateTemporaryPassword();
    expect(password).not.toBe(p2);
  });

  it('deve permitir ao Presidente cadastrar qualquer cargo em qualquer departamento', async () => {
    await signIn('presidente@gmail.com', 'presidente123');

    // 1. Cadastrar um Diretor de Marketing
    const res = await createPerson({
      name: 'Novo Diretor Mkt',
      email: 'mkt.diretor@tecnosystem.com',
      department: 'Marketing',
      role: 'Diretor',
    });

    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.mustChangePassword).toBe(true);
    expect(res.temporaryPassword).toBeDefined();
    expect(res.temporaryPassword?.length).toBe(10);

    // 2. Cadastrar um novo Vice-presidente com diretoria operacional vinculada
    const resVP = await createPerson({
      name: 'Segundo Vice-Presidente',
      email: 'segundo.vp@tecnosystem.com',
      department: 'Administração',
      secondaryDepartment: 'Financeiro',
      role: 'Vice-presidente',
    });
    expect(resVP.success).toBe(true);
    expect(resVP.user?.secondaryDepartment).toBe('Financeiro');
  });

  it('deve permitir ao Vice-presidente cadastrar Diretor ou Membro apenas no departamento que dirige', async () => {
    // vicepresidente@gmail.com dirige o departamento de "Projetos"
    await signIn('vicepresidente@gmail.com', 'vicepresidente123');

    // 1. Criar Membro em Projetos -> Permitido
    const resValid = await createPerson({
      name: 'Desenvolvedor Projetos',
      email: 'dev.proj@tecnosystem.com',
      department: 'Projetos',
      role: 'Membro',
    });
    expect(resValid.success).toBe(true);
    expect(resValid.user?.mustChangePassword).toBe(true);

    // 2. Criar Membro no Financeiro -> Bloqueado
    const resBlockedDept = await createPerson({
      name: 'Analista Financeiro Invalido',
      email: 'analista.fin@tecnosystem.com',
      department: 'Financeiro',
      role: 'Membro',
    });
    expect(resBlockedDept.success).toBe(false);
    expect(resBlockedDept.message).toMatch(/Acesso negado/i);

    // 3. Criar outro Vice-presidente -> Bloqueado (apenas Presidente pode criar executivos)
    const resBlockedRole = await createPerson({
      name: 'Tentativa Novo VP',
      email: 'novo.vp@tecnosystem.com',
      department: 'Projetos',
      role: 'Vice-presidente',
    });
    expect(resBlockedRole.success).toBe(false);
    expect(resBlockedRole.message).toMatch(/cargos executivos/i);
  });

  it('deve permitir ao Diretor de RH cadastrar Membros apenas no departamento de RH', async () => {
    // 1. Presidente cadastra uma Diretora de RH
    await signIn('presidente@gmail.com', 'presidente123');
    await createPerson({
      name: 'Diretora de RH',
      email: 'diretora.rh@tecnosystem.com',
      department: 'RH',
      role: 'Diretor',
      password: 'diretorarh123',
    });

    // 2. Login com a Diretora de RH
    await signIn('diretora.rh@tecnosystem.com', 'diretorarh123');

    // 3. Criar Membro no RH -> Permitido
    const resValid = await createPerson({
      name: 'Analista de Gente e Gestão',
      email: 'analista.rh@tecnosystem.com',
      department: 'RH',
      role: 'Membro',
    });
    expect(resValid.success).toBe(true);
    expect(resValid.user?.department).toBe('RH');
    expect(resValid.user?.mustChangePassword).toBe(true);
    expect(resValid.temporaryPassword?.length).toBe(10);

    // 4. Criar Diretor no RH -> Bloqueado (Diretor de RH só cria Membros)
    const resBlockedRole = await createPerson({
      name: 'Outro Diretor RH',
      email: 'outro.diretor@tecnosystem.com',
      department: 'RH',
      role: 'Diretor',
    });
    expect(resBlockedRole.success).toBe(false);
    expect(resBlockedRole.message).toMatch(/só pode cadastrar membros/i);

    // 5. Criar Membro em Marketing -> Bloqueado (fora do departamento de RH)
    const resBlockedDept = await createPerson({
      name: 'Designer Marketing',
      email: 'designer.mkt@tecnosystem.com',
      department: 'Marketing',
      role: 'Membro',
    });
    expect(resBlockedDept.success).toBe(false);
    expect(resBlockedDept.message).toMatch(/departamento de RH/i);
  });

  it('deve bloquear inativação da conta raiz do Presidente', async () => {
    await signIn('presidente@gmail.com', 'presidente123');
    const res = await togglePersonStatus('user-pres-001', false);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/não pode ser inativada/i);
  });
});
