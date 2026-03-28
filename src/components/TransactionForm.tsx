import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORIES, Transaction } from '@/hooks/useTransactions';

interface TransactionFormProps {
  onSubmit: (data: { type: string; amount: number; category: string; date: string; description: string }) => void;
  initial?: Transaction;
  loading?: boolean;
  title?: string;
}

export default function TransactionForm({ onSubmit, initial, loading, title = 'Add Transaction' }: TransactionFormProps) {
  const [type, setType] = useState(initial?.type || 'expense');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(initial?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ type, amount: parseFloat(amount), category, date, description });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              className={type === 'income' ? 'bg-income hover:bg-income/90' : ''}
              onClick={() => setType('income')}
            >
              Income
            </Button>
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              className={type === 'expense' ? 'bg-expense hover:bg-expense/90' : ''}
              onClick={() => setType('expense')}
            >
              Expense
            </Button>
          </div>
          <Input
            type="number"
            placeholder="Amount"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={loading || !category}>
            {loading ? 'Saving...' : initial ? 'Update' : 'Add Transaction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
