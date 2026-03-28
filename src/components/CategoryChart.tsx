import { Transaction } from '@/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = [
  'hsl(153, 60%, 33%)', 'hsl(199, 89%, 48%)', 'hsl(45, 93%, 47%)',
  'hsl(280, 65%, 60%)', 'hsl(24, 80%, 50%)', 'hsl(340, 65%, 50%)',
  'hsl(180, 50%, 40%)', 'hsl(60, 70%, 45%)', 'hsl(210, 60%, 50%)',
  'hsl(120, 40%, 45%)', 'hsl(0, 60%, 50%)', 'hsl(300, 40%, 50%)',
];

interface Props {
  transactions: Transaction[];
  type?: 'expense' | 'income';
}

export default function CategoryChart({ transactions, type = 'expense' }: Props) {
  const filtered = transactions.filter(t => t.type === type);
  const byCategory: Record<string, number> = {};
  filtered.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  });
  const data = Object.entries(byCategory).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="font-heading">{type === 'expense' ? 'Expenses' : 'Income'} by Category</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm text-center py-8">No data yet</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="font-heading">{type === 'expense' ? 'Expenses' : 'Income'} by Category</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
