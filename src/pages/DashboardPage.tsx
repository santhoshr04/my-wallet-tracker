import { useMemo, useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import StatCard from '@/components/StatCard';
import TransactionList from '@/components/TransactionList';
import CategoryChart from '@/components/CategoryChart';
import DashboardAnalytics from '@/components/DashboardAnalytics';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import {
  DASHBOARD_PERIOD_LABEL,
  DashboardPeriod,
  filterTransactionsByPeriod,
} from '@/lib/dashboardUtils';
import { cn } from '@/lib/utils';

const PERIODS: DashboardPeriod[] = ['month', '30d', 'all'];

export default function DashboardPage() {
  const { data: transactions = [], isLoading } = useTransactions();
  const [period, setPeriod] = useState<DashboardPeriod>('month');

  const filtered = useMemo(() => filterTransactionsByPeriod(transactions, period), [transactions, period]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const recent = useMemo(() => {
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [filtered]);

  if (isLoading) return <div className="flex min-h-[40dvh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <div className="inline-flex rounded-lg border bg-muted/50 p-1 w-full sm:w-auto">
          {PERIODS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'touch-manipulation flex-1 sm:flex-none rounded-md px-2 py-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                period === p
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {DASHBOARD_PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Income"
          value={`$${totalIncome.toFixed(2)}`}
          icon={TrendingUp}
          variant="income"
          subtitle={DASHBOARD_PERIOD_LABEL[period]}
        />
        <StatCard
          title="Expenses"
          value={`$${totalExpense.toFixed(2)}`}
          icon={TrendingDown}
          variant="expense"
          subtitle={DASHBOARD_PERIOD_LABEL[period]}
        />
        <StatCard
          title="Balance"
          value={`${balance < 0 ? '−' : ''}$${Math.abs(balance).toFixed(2)}`}
          icon={DollarSign}
          variant="balance"
          subtitle={balance >= 0 ? 'Income minus expenses' : 'Spending above income'}
          valueClassName={balance >= 0 ? 'text-income' : 'text-expense'}
        />
      </div>

      <DashboardAnalytics filteredTransactions={filtered} allTransactions={transactions} period={period} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryChart transactions={filtered} type="expense" />
        <CategoryChart transactions={filtered} type="income" />
      </div>

      <TransactionList
        transactions={recent}
        title={`Recent · ${DASHBOARD_PERIOD_LABEL[period]}`}
      />
    </div>
  );
}
