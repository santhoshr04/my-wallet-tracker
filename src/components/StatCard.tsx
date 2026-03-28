import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'income' | 'expense' | 'balance';
  subtitle?: string;
  valueClassName?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className={cn(variant === 'balance' && 'border-primary/20')}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          variant === 'income' && 'bg-income/10',
          variant === 'expense' && 'bg-expense/10',
          (variant === 'default' || variant === 'balance') && 'bg-primary/10',
        )}>
          <Icon className={cn(
            'w-5 h-5',
            variant === 'income' && 'text-income',
            variant === 'expense' && 'text-expense',
            (variant === 'default' || variant === 'balance') && 'text-primary',
          )} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn('text-lg sm:text-xl font-heading font-bold tabular-nums break-words', valueClassName)}>{value}</p>
          {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
