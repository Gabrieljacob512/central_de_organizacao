import { beforeEach, describe, expect, it } from 'vitest';
import { saveFile, validateMagicBytes } from '../data/indexedDb';
import { seedDemoData } from '../data/seed';
import { clearStorage } from '../data/storage';
import { signIn } from '../services/authService';
import { createTicket, fetchTickets } from '../services/ticketService';
import { validateTicketForm } from '../utils/validation';

describe('Módulo de Chamados (Flow 1)', () => {
  beforeEach(() => {
    clearStorage();
    seedDemoData(true);
  });

  it('deve validar formulário com departamento de origem "Administração"', () => {
    const validData = {
      title: 'Solicitação da Presidência para TI/Projetos',
      description: 'Ajuste prioritário de cronograma de implantação.',
      department: 'Administração' as const,
      assignedDepartment: 'Projetos' as const,
      category: 'Planejamento',
      priority: 'Alta' as const,
      requester: 'Presidente (Admin)',
      email: 'presidente@gmail.com',
    };

    const errors = validateTicketForm(validData);
    expect(errors.department).toBeUndefined();
    expect(errors.assignedDepartment).toBeUndefined();
    expect(errors.category).toBeUndefined();
    expect(errors.title).toBeUndefined();
    expect(Object.keys(errors).length).toBe(0);
  });

  it('deve permitir abertura de chamado por usuário de "Administração"', async () => {
    await signIn('presidente@gmail.com', 'presidente123');

    const res = await createTicket({
      title: 'Chamado Aberto pela Presidência',
      description: 'Demanda institucional com alta prioridade.',
      category: 'Planejamento',
      priority: 'Alta',
      department: 'Administração',
      assignedDepartment: 'Projetos',
      requester: 'Presidente (Admin)',
      email: 'presidente@gmail.com',
    });

    expect(res.success).toBe(true);
    expect(res.ticket).toBeDefined();
    const ticketId = res.ticket!.id;
    expect(typeof ticketId).toBe('string');

    // Buscar lista de chamados e verificar se foi salvo
    const tickets = await fetchTickets();
    const created = tickets.find((t) => t.id === ticketId);
    expect(created).toBeDefined();
    expect(created?.department).toBe('Administração');
    expect(created?.assignedDepartment).toBe('Projetos');
    expect(created?.title).toBe('Chamado Aberto pela Presidência');
  });

  it('deve validar e salvar anexos binários no IndexedDB com verificação de tamanho', async () => {
    // 1. Arquivo PNG válido (com magic bytes 89 50 4E 47)
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const validFile = new File([pngBytes], 'screenshot.png', { type: 'image/png' });

    const checkValid = await validateMagicBytes(validFile);
    expect(checkValid.valid).toBe(true);

    const saved = await saveFile('test-att-1', validFile, 'screenshot.png');
    expect(saved.id).toBe('test-att-1');
    expect(saved.name).toBe('screenshot.png');

    // 2. Arquivo executável bloqueado (magic bytes MZ: 4D 5A)
    const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const exeFile = new File([exeBytes], 'malware.exe', { type: 'application/x-msdownload' });
    const checkExe = await validateMagicBytes(exeFile);
    expect(checkExe.valid).toBe(false);
    expect(checkExe.error).toMatch(/executáveis/i);

    // 3. Arquivo excedendo limite de 1 MB
    const largeBlob = new Blob([new Uint8Array(1048576 + 100)], { type: 'image/png' });
    const checkLarge = await validateMagicBytes(largeBlob);
    expect(checkLarge.valid).toBe(false);
    expect(checkLarge.error).toMatch(/excede o limite/i);
  });

  it('deve respeitar as regras de visibilidade de chamados por perfil', async () => {
    // 1. Presidente logado: vê chamados de todos os departamentos
    await signIn('presidente@gmail.com', 'presidente123');
    const allTicketsForPresident = await fetchTickets();
    expect(allTicketsForPresident.length).toBeGreaterThanOrEqual(12);

    // 2. Membro do RH logado: vê chamados do RH e os criados por ele
    await signIn('membro@gmail.com', 'membro123');
    const rhTickets = await fetchTickets();
    const allVisibleToRh = rhTickets.every(
      (t) =>
        t.assignedDepartment === 'RH' ||
        t.department === 'RH' ||
        t.email.toLowerCase() === 'membro@gmail.com'
    );
    expect(allVisibleToRh).toBe(true);

    // 3. Diretor Financeiro logado: vê chamados do Financeiro e os criados por ele
    await signIn('diretor@gmail.com', 'diretor123');
    const finTickets = await fetchTickets();
    const allVisibleToFin = finTickets.every(
      (t) =>
        t.assignedDepartment === 'Financeiro' ||
        t.department === 'Financeiro' ||
        t.email.toLowerCase() === 'diretor@gmail.com'
    );
    expect(allVisibleToFin).toBe(true);
  });
});
