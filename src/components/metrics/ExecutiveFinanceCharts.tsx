import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  DollarSign,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchExecutiveFinancialChartData } from '../../services/financeService';

export function ExecutiveFinanceCharts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchExecutiveFinancialChartData().then((res) => {
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 text-center">
        <p className="text-xs text-slate-400">Carregando indicadores financeiros consolidados...</p>
      </div>
    );
  }

  if (!data) return null;

  const { monthlyComparison, accumulatedBalance, revenueByProject, expensesByCategory } = data;

  const totalAnnualRevenue = monthlyComparison.reduce((sum: number, m: any) => sum + m.revenue, 0);
  const totalAnnualExpense = monthlyComparison.reduce((sum: number, m: any) => sum + m.expense, 0);
  const annualMargin = Math.round(((totalAnnualRevenue - totalAnnualExpense) / totalAnnualRevenue) * 100);

  return (
    <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Demonstrativo Financeiro Executivo (Últimos 12 Meses)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Visão consolidada de receitas de projetos, controle orçamentário e margem líquida da Tecno System.
        </p>
      </div>

      {/* KPI Cards Financeiros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Faturamento Anual Bruto
          </p>
          <h4 className="mt-1 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
            R$ {totalAnnualRevenue.toLocaleString('pt-BR')},00
          </h4>
          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Faturamento acumulado em 12 competências</span>
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200/90 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
            Despesas Anuais Consolidadas
          </p>
          <h4 className="mt-1 text-2xl font-bold text-rose-950 dark:text-rose-100">
            R$ {totalAnnualExpense.toLocaleString('pt-BR')},00
          </h4>
          <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
            Custos de servidores, ferramentas e capacitação
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200/90 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
            Margem Líquida da Empresa Júnior
          </p>
          <h4 className="mt-1 text-2xl font-bold text-blue-950 dark:text-blue-100">
            {annualMargin}%
          </h4>
          <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">
            Saldo acumulado: R$ {(totalAnnualRevenue - totalAnnualExpense).toLocaleString('pt-BR')},00
          </p>
        </div>
      </div>

      {/* Grade com os 4 Gráficos Recharts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Barras comparativas de Receita x Despesa dos últimos 12 meses */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Receita x Despesa (Últimos 12 Meses)
            </h4>
            <p className="text-xs text-slate-400">Comparação mensal em reais (R$)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')},00`, '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="revenue" fill="#10b981" name="Receita" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#f43f5e" name="Despesa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Linha de Saldo Acumulado mês a mês */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Evolução do Saldo Acumulado (Caixa)
            </h4>
            <p className="text-xs text-slate-400">Crescimento patrimonial líquido mês a mês</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accumulatedBalance} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')},00`, 'Saldo Acumulado']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="saldoAcumulado"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  name="Saldo Acumulado"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Barras horizontais de Receita por Projeto (Top projetos do ano) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Receita por Projeto (Top Contratos do Ano)
            </h4>
            <p className="text-xs text-slate-400">Faturamento nominal por contrato da empresa júnior</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueByProject}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} />
                <YAxis dataKey="project" type="category" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')},00`, 'Faturamento']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} name="Faturamento (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Donut de Distribuição de Despesas por Categoria */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              4. Distribuição de Despesas por Categoria
            </h4>
            <p className="text-xs text-slate-400">Centros de custo da empresa júnior</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {expensesByCategory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')},00`, 'Despesa']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
