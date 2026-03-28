import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'income' | 'expense';
}

export default function StatCard({ title, value, icon: Icon, variant = 'default' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          variant === 'income' && 'bg-income/10',
          variant === 'expense' && 'bg-expense/10',
          variant === 'default' && 'bg-primary/10'
        )}>
          <Icon className={cn(
            'w-5 h-5',
            variant === 'income' && 'text-income',
            variant === 'expense' && 'text-expense',
            variant === 'default' && 'text-primary'
          )} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-heading font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
