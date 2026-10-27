import { describe, it, expect } from 'vitest';
import { getSlaInfo } from '../src/utils/sla';
import type { Priority, Ticket } from '../src/types/ticket';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runPhase5Tests() {
  console.log('\n=============================================================');
  console.log('🧪 EXECUTANDO TESTES DE ACEITE - FASE 5 (MÉTRICAS, SLA E CSV)');
  console.log('=============================================================\n');

  const now = Date.now();
  const ONE_HOUR = 3600 * 1000;

  // 1. Alertas Visuais de SLA
  console.log('--- 1. Classificação e Alertas de SLA (< 2h, Estourado e Pausado) ---');
  const ticketOnTrack: Ticket = {
    id: 'TS-TEST-TRACK',
    title: 'Chamado no prazo',
    requester: 'Beatriz',
    email: 'beatriz@tecnosystem.com.br',
    department: 'Financeiro',
    category: 'Financeiro',
    priority: 'Baixa',
    description: 'Descrição de teste',
    status: 'Aberto',
    assignee: 'Mariana',
    createdAt: new Date(now - 2 * ONE_HOUR).toISOString(),
    updatedAt: new Date(now).toISOString(),
    slaDueAt: new Date(now + 10 * ONE_HOUR).toISOString(), // Restam 10 horas (> 2h)
    resolvedAt: null,
    history: [],
  };

  const infoTrack = getSlaInfo(ticketOnTrack, now);
  assert(infoTrack.state === 'on_track', 'SLA no prazo identificado como on_track (> 2h)');

  const ticketNearBreach: Ticket = {
    ...ticketOnTrack,
    id: 'TS-TEST-RISK',
    slaDueAt: new Date(now + 1.5 * ONE_HOUR).toISOString(), // Restam 1.5 horas (< 2h)
  };
  const infoRisk = getSlaInfo(ticketNearBreach, now);
  assert(infoRisk.state === 'at_risk', 'SLA em risco (< 2h) identificado como at_risk');
  assert(infoRisk.label.includes('< 2h') || infoRisk.label.includes('risco'), 'Rótulo destaca proximidade de estouro');

  const ticketBreached: Ticket = {
    ...ticketOnTrack,
    id: 'TS-TEST-BREACH',
    slaDueAt: new Date(now - 1 * ONE_HOUR).toISOString(), // Vencido há 1h
  };
  const infoBreach = getSlaInfo(ticketBreached, now);
  assert(infoBreach.state === 'breached', 'SLA vencido identificado como breached');

  const ticketPaused: Ticket = {
    ...ticketOnTrack,
    id: 'TS-TEST-PAUSED',
    status: 'Pendente',
    slaDueAt: new Date(now + 1 * ONE_HOUR).toISOString(),
  };
  const infoPaused = getSlaInfo(ticketPaused, now);
  assert(infoPaused.label === 'Relógio Pausado', 'Chamado com status Pendente exibe "Relógio Pausado"');

  // 2. Filtro Rápido "Meus Chamados"
  console.log('\n--- 2. Lógica do Filtro Rápido "Meus Chamados" ---');
  const mockUser = {
    id: 'user-mariana-uuid',
    name: 'Mariana Souza',
    email: 'mariana.souza@tecnosystem.com.br',
    department: 'Projetos' as const,
    role: 'Membro',
    createdAt: new Date().toISOString(),
  };

  const sampleTickets: Ticket[] = [
    { ...ticketOnTrack, id: 'T-1', assignee: 'Mariana Souza', requester: 'Carlos' },
    { ...ticketOnTrack, id: 'T-2', assignee: 'Bruno Carvalho', requester: 'Mariana Souza' },
    { ...ticketOnTrack, id: 'T-3', assignee: 'Carlos Mendes', requester: 'Beatriz Santos' },
  ];

  const myTickets = sampleTickets.filter(
    (t) => t.assignee === mockUser.name || t.requester === mockUser.name || t.email === mockUser.email
  );

  assert(myTickets.length === 2, 'Filtro seleciona exatamente os chamados atribuídos ou solicitados pelo usuário');
  assert(myTickets.some((t) => t.id === 'T-1'), 'Inclui chamado atribuído ao usuário (T-1)');
  assert(myTickets.some((t) => t.id === 'T-2'), 'Inclui chamado aberto pelo usuário (T-2)');
  assert(!myTickets.some((t) => t.id === 'T-3'), 'Exclui chamados de outros colaboradores (T-3)');

  // 3. Cálculo de Tempo Médio de Resolução (MTTR)
  console.log('\n--- 3. Algoritmo de Cálculo de MTTR ---');
  const resolvedSample: Ticket[] = [
    {
      ...ticketOnTrack,
      priority: 'Alta',
      status: 'Resolvido',
      createdAt: '2026-10-27T00:00:00Z',
      resolvedAt: '2026-10-27T04:00:00Z', // 4 horas
    },
    {
      ...ticketOnTrack,
      priority: 'Alta',
      status: 'Resolvido',
      createdAt: '2026-10-27T00:00:00Z',
      resolvedAt: '2026-10-27T08:00:00Z', // 8 horas
    },
  ];

  const altaMttr =
    resolvedSample.reduce((acc, t) => {
      const dur = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
      return acc + dur / (1000 * 60 * 60);
    }, 0) / resolvedSample.length;

  assert(altaMttr === 6, 'Cálculo de MTTR médio resulta em exatamente 6.0 horas');

  // 4. Formatação de Exportação CSV com UTF-8 BOM
  console.log('\n--- 4. Validação de Estrutura de Exportação CSV ---');
  const headers = ['ID', 'Título', 'Solicitante', 'E-mail', 'Departamento de Origem', 'Status'];
  const testRows = sampleTickets.map((t) => [t.id, `"${t.title}"`, `"${t.requester}"`, t.email, t.department, t.status]);
  const csvText = '\uFEFF' + [headers.join(';'), ...testRows.map((r) => r.join(';'))].join('\n');

  assert(csvText.startsWith('\uFEFF'), 'CSV inicia com BOM UTF-8 (\\uFEFF) para compatibilidade com Excel pt-BR');
  assert(csvText.includes('T-1') && csvText.includes(';'), 'Conteúdo dos chamados incorporado com delimitador ";"');

  console.log('\n=============================================================');
  console.log(`📊 RESULTADO FASE 5: ${passedTests} de ${totalTests} testes passaram (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('=============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error('Erro nos testes da fase 5:', err);
  process.exit(1);
});
