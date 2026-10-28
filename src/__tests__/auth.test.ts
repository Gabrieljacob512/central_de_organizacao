import { beforeEach, describe, expect, it } from 'vitest';
import { seedDemoData } from '../data/seed';
import { clearStorage } from '../data/storage';
import { getCurrentUser, signIn, signOut } from '../services/authService';
import { togglePersonStatus } from '../services/peopleService';

describe('Módulo de Autenticação (Simulado)', () => {
  beforeEach(() => {
    clearStorage();
    seedDemoData(true);
  });

  it('deve realizar login com sucesso nas 4 contas de demonstração', async () => {
    const demoAccounts = [
      { email: 'presidente@gmail.com', pass: 'presidente123', role: 'Presidente', dept: 'Administração' },
      { email: 'vicepresidente@gmail.com', pass: 'vicepresidente123', role: 'Vice-presidente', dept: 'Administração' },
      { email: 'diretor@gmail.com', pass: 'diretor123', role: 'Diretor', dept: 'Financeiro' },
      { email: 'membro@gmail.com', pass: 'membro123', role: 'Membro', dept: 'RH' },
    ];

    for (const acc of demoAccounts) {
      const res = await signIn(acc.email, acc.pass);
      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.email).toBe(acc.email);
      expect(res.user?.role).toBe(acc.role);
      expect(res.user?.department).toBe(acc.dept);

      const current = getCurrentUser();
      expect(current?.email).toBe(acc.email);
    }
  });

  it('deve rejeitar login com senha incorreta', async () => {
    const res = await signIn('presidente@gmail.com', 'senhaErrada123');
    expect(res.success).toBe(false);
    expect(res.message || res.error).toMatch(/senha incorretos/i);
  });

  it('deve rejeitar login para e-mail inexistente', async () => {
    const res = await signIn('inexistente@empresa.com', '123456');
    expect(res.success).toBe(false);
    expect(res.message || res.error).toMatch(/não encontrado/i);
  });

  it('deve bloquear login de usuário inativado', async () => {
    // Fazer login inicial como presidente para poder inativar
    await signIn('presidente@gmail.com', 'presidente123');

    // Inativar usuário do RH (ID: user-mem-rh-004)
    const toggleRes = await togglePersonStatus('user-mem-rh-004', false);
    expect(toggleRes.success).toBe(true);

    // Tentar login com o usuário inativo
    const res = await signIn('membro@gmail.com', 'membro123');
    expect(res.success).toBe(false);
    expect(res.message || res.error).toMatch(/desativada/i);
  });

  it('deve realizar logout e limpar sessão ativa', async () => {
    await signIn('presidente@gmail.com', 'presidente123');
    expect(getCurrentUser()).not.toBeNull();

    await signOut();
    expect(getCurrentUser()).toBeNull();
  });
});
