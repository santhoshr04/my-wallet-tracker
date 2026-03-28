import { useTransactions } from '@/hooks/useTransactions';
import StatCard from '@/components/StatCard';
import TransactionList from '@/components/TransactionList';
import CategoryChart from '@/components/CategoryChart';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function DashboardPage() {
  const { data: transactions = [], isLoading } = useTransactions();

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Income" value={`$${totalIncome.toFixed(2)}`} icon={TrendingUp} variant="income" />
        <StatCard title="Total Expense" value={`$${totalExpense.toFixed(2)}`} icon={TrendingDown} variant="expense" />
        <StatCard title="Balance" value={`$${balance.toFixed(2)}`} icon={DollarSign} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryChart transactions={transactions} type="expense" />
        <CategoryChart transactions={transactions} type="income" />
      </div>
      <TransactionList transactions={transactions.slice(0, 10)} title="Recent Transactions" />
    </div>
  );
}
