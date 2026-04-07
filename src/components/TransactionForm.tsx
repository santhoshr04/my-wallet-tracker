import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  categoriesForType,
  Transaction,
  TransactionType,
} from '@/hooks/useTransactions';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { normalizeTimeForDb, nowLocalTimeHHMM, timeFromDbToHHMM } from '@/lib/transactionDatetime';

interface TransactionFormProps {
  onSubmit: (data: {
    type: string;
    amount: number;
    category: string;
    date: string;
    transaction_time: string;
    description: string;
  }) => void;
  initial?: Transaction;
  loading?: boolean;
  title?: string;
  fixedType?: TransactionType;
}

export default function TransactionForm({ onSubmit, initial, loading, title = 'Add Transaction', fixedType }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(fixedType ?? initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [category, setCategory] = useState(() => (initial?.category ?? '').trim());
  const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() =>
    initial?.transaction_time ? timeFromDbToHHMM(initial.transaction_time) : nowLocalTimeHHMM(),
  );
  const [description, setDescription] = useState(initial?.description || '');

  const skipNextTypeClear = useRef(true);

  const categoryOptions = useMemo(() => {
    const base = [...categoriesForType(type)];
    const c = category.trim();
    if (c && !base.includes(c)) return [...base, c];
    return base;
  }, [type, category]);

  useEffect(() => {
    if (!initial?.id) return;
    setType(initial.type);
    setAmount(initial.amount != null ? String(initial.amount) : '');
    setCategory((initial.category ?? '').trim());
    setDate(initial.date || new Date().toISOString().split('T')[0]);
    setTime(initial.transaction_time ? timeFromDbToHHMM(initial.transaction_time) : nowLocalTimeHHMM());
    setDescription(initial.description ?? '');
    skipNextTypeClear.current = true;
  }, [initial?.id]);

  useEffect(() => {
    if (!fixedType) return;
    setType(fixedType);
  }, [fixedType]);

  useEffect(() => {
    if (skipNextTypeClear.current) {
      skipNextTypeClear.current = false;
      return;
    }
    const valid = categoriesForType(type);
    setCategory(prev => {
      const p = prev.trim();
      if (!p) return prev;
      return valid.includes(p) ? prev : '';
    });
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = category.trim();
    onSubmit({
      type,
      amount: parseFloat(amount),
      category: cat,
      date,
      transaction_time: normalizeTimeForDb(time),
      description: description.trim() || '',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixedType ? (
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                className={cn(type === 'income' ? 'bg-income hover:bg-income/90' : '', 'touch-manipulation text-xs sm:text-sm px-2')}
                onClick={() => setType('income')}
              >
                Income
              </Button>
              <Button
                type="button"
                variant={type === 'expense' ? 'default' : 'outline'}
                className={cn(type === 'expense' ? 'bg-expense hover:bg-expense/90' : '', 'touch-manipulation text-xs sm:text-sm px-2')}
                onClick={() => setType('expense')}
              >
                Expense
              </Button>
              <Button
                type="button"
                variant={type === 'savings' ? 'default' : 'outline'}
                className={cn(type === 'savings' ? 'bg-savings hover:bg-savings/90 text-white' : '', 'touch-manipulation text-xs sm:text-sm px-2')}
                onClick={() => setType('savings')}
              >
                Savings
              </Button>
            </div>
          ) : null}
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Amount (₹)"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <Select
            key={`${type}-${initial?.id ?? 'new'}`}
            value={category || undefined}
            onValueChange={setCategory}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-time">Time</Label>
              <Input
                id="tx-time"
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <Button type="submit" className="w-full touch-manipulation" disabled={loading || !category.trim()}>
            {loading ? 'Saving...' : initial ? 'Update' : 'Add Transaction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
