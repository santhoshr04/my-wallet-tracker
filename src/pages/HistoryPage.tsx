import { useMemo, useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { transactionTitleForUi } from '@/lib/transactionDisplay';
import { timeFromDbToHHMM } from '@/lib/transactionDatetime';
import TransactionList from '@/components/TransactionList';
import CategoryChart from '@/components/CategoryChart';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Search } from 'lucide-react';

export default function HistoryPage() {
  const { data: transactions = [], isLoading } = useTransactions();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (!q) return true;
      const title = transactionTitleForUi(t).toLowerCase();
      return (
        title.includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [transactions, search, typeFilter, dateFrom, dateTo]);

  const sortedForList = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      const ta = a.transaction_time ? timeFromDbToHHMM(a.transaction_time) : '00:00';
      const tb = b.transaction_time ? timeFromDbToHHMM(b.transaction_time) : '00:00';
      const byTime = tb.localeCompare(ta);
      if (byTime !== 0) return byTime;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [filtered]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(sortedForList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-transactions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-heading font-bold">Transaction History</h1>
        <Button variant="outline" size="sm" className="w-full touch-manipulation sm:w-auto shrink-0" onClick={exportJSON}>
          <Download className="w-4 h-4 mr-2 shrink-0" />
          Export JSON
        </Button>
      </div>

      {typeFilter === 'all' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CategoryChart transactions={filtered} type="expense" />
          <CategoryChart transactions={filtered} type="income" />
          <CategoryChart transactions={filtered} type="savings" />
        </div>
      ) : (
        <CategoryChart
          transactions={filtered}
          type={typeFilter as 'expense' | 'income' | 'savings'}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, category, notes…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" aria-label="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input type="date" aria-label="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      <TransactionList transactions={sortedForList} title={`${sortedForList.length} Transactions`} />
    </div>
  );
}
