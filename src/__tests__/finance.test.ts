import { beforeEach, describe, expect, it } from 'vitest';
import { seedDemoData } from '../data/seed';
import { clearStorage } from '../data/storage';
import { signIn } from '../services/authService';
import {
  createFinanceEntry,
  deleteFinanceEntry,
  fetchMonthDetails,
  formatCentsToBRL,
  parseBRLToCents,
  toggleMonthClosure,
} from '../services/financeService';

describe('Módulo Financeiro (Flow 2)', () => {
  beforeEach(() => {
    clearStorage();
    seedDemoData(true);
  });

  it('deve realizar parsing e formatação correta de moeda BRL em centavos inteiros', () => {
    // Parsing
    expect(parseBRLToCents('1.500,50')).toBe(150050);
    expect(parseBRLToCents('R$ 2.345,67')).toBe(234567);
    expect(parseBRLToCents('100')).toBe(10000);
    expect(parseBRLToCents('0,99')).toBe(99);
    expect(parseBRLToCents(50.25)).toBe(5025);

    // Formatação (substitui espaços não-quebráveis por espaço simples)
    expect(formatCentsToBRL(150050).replace(/\u00A0/g, ' ')).toBe('R$ 1.500,50');
    expect(formatCentsToBRL(234567).replace(/\u00A0/g, ' ')).toBe('R$ 2.345,67');
    expect(formatCentsToBRL(0).replace(/\u00A0/g, ' ')).toBe('R$ 0,00');
  });

  it('deve calcular corretamente receitas, despesas e saldo líquido na competência', async () => {
    await signIn('presidente@gmail.com', 'presidente123');

    // Buscar detalhes de 2026-10
    const detailsBefore = await fetchMonthDetails('2026-10');
    expect(detailsBefore.month).not.toBeNull();
    const initialRev = detailsBefore.month!.totalRevenueCents;
    const initialExp = detailsBefore.month!.totalExpenseCents;
    const initialBal = detailsBefore.month!.balanceCents;
    expect(initialBal).toBe(initialRev - initialExp);

    // Adicionar uma receita de R$ 5.000,00 (500000 centavos)
    const gainRes = await createFinanceEntry({
      monthId: detailsBefore.month!.id,
      type: 'gain',
      category: 'Projetos',
      amountCents: 500000,
      description: 'Consultoria Especial de TI',
    });
    expect(gainRes.success).toBe(true);

    // Adicionar uma despesa de R$ 1.200,50 (120050 centavos)
    const expRes = await createFinanceEntry({
      monthId: detailsBefore.month!.id,
      type: 'expense',
      category: 'Operacional & Nuvem',
      amountCents: 120050,
      description: 'Hospedagem em Nuvem',
    });
    expect(expRes.success).toBe(true);

    // Recarregar detalhes e verificar recálculo imediato
    const detailsAfter = await fetchMonthDetails('2026-10');
    expect(detailsAfter.month!.totalRevenueCents).toBe(initialRev + 500000);
    expect(detailsAfter.month!.totalExpenseCents).toBe(initialExp + 120050);
    expect(detailsAfter.month!.balanceCents).toBe(
      detailsAfter.month!.totalRevenueCents - detailsAfter.month!.totalExpenseCents
    );
  });

  it('deve rejeitar criação e exclusão de lançamentos em competência contábil fechada', async () => {
    await signIn('presidente@gmail.com', 'presidente123');

    // 2026-05 está fechada pelo seed
    const details = await fetchMonthDetails('2026-05');
    expect(details.month?.isClosed).toBe(true);

    // Tentar criar lançamento no mês fechado
    const createRes = await createFinanceEntry({
      monthId: details.month!.id,
      type: 'expense',
      category: 'Material de Escritório',
      amountCents: 15000,
      description: 'Compra indevida em mês fechado',
    });
    expect(createRes.success).toBe(false);
    expect(createRes.message).toMatch(/fechada/i);

    // Tentar excluir um lançamento existente de mês fechado
    if (details.entries.length > 0) {
      const deleteRes = await deleteFinanceEntry(details.entries[0].id);
      expect(deleteRes.success).toBe(false);
      expect(deleteRes.message).toMatch(/fechada/i);
    }
  });

  it('deve permitir fechar e reabrir competência contábil pelo Presidente', async () => {
    await signIn('presidente@gmail.com', 'presidente123');

    // Fechar mês 2026-10
    const closeRes = await toggleMonthClosure('2026-10', true);
    expect(closeRes.success).toBe(true);

    let details = await fetchMonthDetails('2026-10');
    expect(details.month?.isClosed).toBe(true);

    // Reabrir mês 2026-10
    const reopenRes = await toggleMonthClosure('2026-10', false);
    expect(reopenRes.success).toBe(true);

    details = await fetchMonthDetails('2026-10');
    expect(details.month?.isClosed).toBe(false);
  });
});
