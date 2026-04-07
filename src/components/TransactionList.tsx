import { useState } from 'react';
import { Transaction, useDeleteTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TransactionForm from './TransactionForm';
import { Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatTransactionWhen } from '@/lib/transactionDatetime';
import { transactionSubtitleForUi, transactionTitleForUi } from '@/lib/transactionDisplay';
import { formatInr } from '@/lib/formatCurrency';

interface Props {
  transactions: Transaction[];
  title?: string;
  showActions?: boolean;
}

export default function TransactionList({ transactions, title = 'Recent Transactions', showActions = true }: Props) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const deleteMut = useDeleteTransaction();
  const updateMut = useUpdateTransaction();

  const handleDelete = (id: string) => {
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Deleted'),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleUpdate = (data: any) => {
    if (!editing) return;
    updateMut.mutate({ id: editing.id, ...data }, {
      onSuccess: () => { toast.success('Updated'); setEditing(null); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No transactions yet</p>
          ) : (
            <div className="divide-y">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between gap-2 px-3 py-3 sm:px-5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {tx.type === 'income' ? (
                      <ArrowUpCircle className="w-5 h-5 text-income shrink-0" />
                    ) : tx.type === 'savings' ? (
                      <PiggyBank className="w-5 h-5 text-savings shrink-0" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 text-expense shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{transactionTitleForUi(tx)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {transactionSubtitleForUi(tx, formatTransactionWhen(tx.date, tx.transaction_time))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'font-heading font-bold text-sm',
                      tx.type === 'income' ? 'text-income' : tx.type === 'savings' ? 'text-savings' : 'text-expense',
                    )}>
                      {tx.type === 'income' ? '+' : '−'}{formatInr(Number(tx.amount))}
                    </span>
                    {showActions && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(tx)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(tx.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editing && (
            <TransactionForm
              key={editing.id}
              initial={editing}
              onSubmit={handleUpdate}
              loading={updateMut.isPending}
              title="Edit Transaction"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
