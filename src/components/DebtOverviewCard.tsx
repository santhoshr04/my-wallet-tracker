import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatInr } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { useAddDebtPayment, useDebts, useMarkDebtPaid, useDebtPayments, useDeleteDebtPayment, type Debt } from '@/hooks/useDebts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  defaultLocalDatetimeLocal,
  normalizeTimeForDb,
  splitDateTimeLocal,
} from '@/lib/transactionDatetime';

export default function DebtOverviewCard() {
  const { data: debts = [], isLoading } = useDebts();
  const markPaid = useMarkDebtPaid();
  const addPayment = useAddDebtPayment();
  const deletePayment = useDeleteDebtPayment();
  const createTx = useCreateTransaction();

  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentOccurredAt, setPaymentOccurredAt] = useState(defaultLocalDatetimeLocal);

  const [closingDebt, setClosingDebt] = useState<Debt | null>(null);
  const [closeOccurredAt, setCloseOccurredAt] = useState(defaultLocalDatetimeLocal);

  const active = useMemo(() => debts.filter(d => d.status === 'active'), [debts]);
  const totals = useMemo(() => {
    const borrowed = active.filter(d => d.direction === 'borrowed').reduce((s, d) => s + Number(d.remaining_amount), 0);
    const lent = active.filter(d => d.direction === 'lent').reduce((s, d) => s + Number(d.remaining_amount), 0);
    return { borrowed, lent };
  }, [active]);

  const list = useMemo(() => {
    return [...active]
      .sort((a, b) => {
        const byD = (b.transaction_date || '').localeCompare(a.transaction_date || '');
        if (byD !== 0) return byD;
        return (b.transaction_time || '').localeCompare(a.transaction_time || '');
      })
      .slice(0, 6);
  }, [active]);

  const payingDebt = useMemo(() => debts.find(d => d.id === payingDebtId) || null, [debts, payingDebtId]);
  const { data: payments = [] } = useDebtPayments(payingDebtId);

  const canPay = Number.isFinite(parseFloat(paymentAmount)) && parseFloat(paymentAmount) > 0;

  useEffect(() => {
    if (payingDebtId) setPaymentOccurredAt(defaultLocalDatetimeLocal());
  }, [payingDebtId]);

  useEffect(() => {
    if (closingDebt) setCloseOccurredAt(defaultLocalDatetimeLocal());
  }, [closingDebt?.id]);

  const postTxThen = (
    debt: Debt,
    amount: number,
    occurredAt: string,
    category: string,
    description: string,
    debtPaymentId: string | null,
    onDone: () => void,
  ) => {
    const { date, time } = splitDateTimeLocal(occurredAt);
    createTx.mutate(
      {
        type: debt.direction === 'borrowed' ? 'expense' : 'income',
        amount,
        category,
        date,
        transaction_time: normalizeTimeForDb(time),
        debt_id: debt.id,
        debt_payment_id: debtPaymentId,
        description,
      },
      {
        onSuccess: onDone,
        onError: e => toast.error(`Transaction failed: ${e.message}`),
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base">Debt Overview</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base">Debt Overview</CardTitle>
          <CardDescription>Debt actions create titled transactions with date &amp; time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground font-medium">Total Borrowed (You owe)</p>
              <p className="text-lg font-heading font-bold text-expense tabular-nums">{formatInr(totals.borrowed)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground font-medium">Total Lent (You will receive)</p>
              <p className="text-lg font-heading font-bold text-income tabular-nums">{formatInr(totals.lent)}</p>
            </div>
          </div>

          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active debts.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {list.map(d => (
                <div key={d.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'text-[11px] rounded-full px-2 py-0.5 font-medium shrink-0',
                          d.direction === 'borrowed' ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income',
                        )}
                      >
                        {d.direction === 'borrowed' ? 'Borrowed' : 'Lent'}
                      </span>
                      <p className="text-sm font-medium truncate">{d.person_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.transaction_date
                        ? `Opened ${format(new Date(d.transaction_date), 'MMM d, yyyy')}`
                        : null}
                      {Number(d.remaining_amount) <= 0 && d.status === 'active' ? ' · Balance settled — close to finish' : ''}
                      {d.description ? ` · ${d.description}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="font-heading font-semibold tabular-nums">{formatInr(Number(d.remaining_amount))}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="touch-manipulation"
                      disabled={Number(d.remaining_amount) <= 0}
                      onClick={() => {
                        setPayingDebtId(d.id);
                        setPaymentAmount('');
                      }}
                    >
                      Add Payment
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="touch-manipulation"
                      onClick={() => setClosingDebt(d)}
                      disabled={markPaid.isPending || createTx.isPending}
                    >
                      {d.direction === 'borrowed' ? 'Mark as Paid' : 'Mark as Received'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partial payment */}
      <Dialog open={!!payingDebtId} onOpenChange={open => !open && setPayingDebtId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{payingDebt?.direction === 'lent' ? 'Record Money Received' : 'Record Payment Made'}</DialogTitle>
          </DialogHeader>

          {payingDebt ? (
            <div className="space-y-3">
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-sm font-medium">{payingDebt.person_name}</p>
                <p className="text-xs text-muted-foreground">
                  Remaining: <span className="font-medium">{formatInr(Number(payingDebt.remaining_amount))}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-amt">
                  {payingDebt.direction === 'lent' ? 'Amount received (₹)' : 'Amount you paid (₹)'}
                </Label>
                <Input
                  id="pay-amt"
                  type="number"
                  inputMode="decimal"
                  placeholder={payingDebt.direction === 'lent' ? 'Amount received (₹)' : 'Amount you paid (₹)'}
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-when">Date &amp; time</Label>
                <Input
                  id="pay-when"
                  type="datetime-local"
                  required
                  value={paymentOccurredAt}
                  onChange={e => setPaymentOccurredAt(e.target.value)}
                />
              </div>

              <Button
                className="w-full touch-manipulation"
                disabled={!canPay || addPayment.isPending}
                onClick={() => {
                  if (!payingDebt) return;
                  const amt = parseFloat(paymentAmount);
                  if (!Number.isFinite(amt) || amt <= 0) return;
                  const { date, time } = splitDateTimeLocal(paymentOccurredAt);
                  addPayment.mutate(
                    { id: payingDebt.id, paymentAmount: amt, occurred_date: date, occurred_time: normalizeTimeForDb(time) },
                    {
                      onSuccess: ({ applied, debt, payment_id }) => {
                        const cat = payingDebt.direction === 'borrowed' ? 'Debt Payment' : 'Debt Received';
                        const desc = `${payingDebt.person_name.trim()} · Partial`;
                        postTxThen(
                          payingDebt,
                          applied,
                          paymentOccurredAt,
                          cat,
                          desc,
                          payment_id,
                          () => {
                            toast.success(
                              Number(debt.remaining_amount) <= 0
                                ? 'Payment recorded · use Mark as Paid/Received to close'
                                : 'Payment added',
                            );
                            setPayingDebtId(null);
                          },
                        );
                      },
                      onError: e => toast.error(e.message),
                    },
                  );
                }}
              >
                {addPayment.isPending ? 'Saving…' : payingDebt.direction === 'lent' ? 'Add Received' : 'Add Paid'}
              </Button>

              {payments.length > 0 ? (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Payments</p>
                  <div className="divide-y rounded-lg border">
                    {payments.slice(0, 8).map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 p-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium tabular-nums">{formatInr(Number(p.amount))}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.occurred_date} · {p.occurred_time.slice(0, 5)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={deletePayment.isPending}
                          onClick={() => {
                            deletePayment.mutate(
                              { paymentId: p.id },
                              {
                                onSuccess: () => toast.success('Payment deleted'),
                                onError: (e) => toast.error(e.message),
                              },
                            );
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Close debt (Mark as Paid / Mark as Received) */}
      <Dialog open={!!closingDebt} onOpenChange={open => !open && setClosingDebt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {closingDebt?.direction === 'borrowed' ? 'Mark debt as paid' : 'Mark money as received'}
            </DialogTitle>
          </DialogHeader>

          {closingDebt ? (
            <div className="space-y-3">
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-sm font-medium">{closingDebt.person_name}</p>
                <p className="text-xs text-muted-foreground">
                  Remaining to settle:{' '}
                  <span className="font-medium">{formatInr(Number(closingDebt.remaining_amount))}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="close-when">Date &amp; time</Label>
                <Input
                  id="close-when"
                  type="datetime-local"
                  required
                  value={closeOccurredAt}
                  onChange={e => setCloseOccurredAt(e.target.value)}
                />
              </div>

              <Button
                className="w-full touch-manipulation"
                disabled={markPaid.isPending || createTx.isPending}
                onClick={() => {
                  const d = closingDebt;
                  const payAmount = Number(d.remaining_amount);
                  if (!Number.isFinite(payAmount) || payAmount < 0) return;

                  const finishClose = () =>
                    markPaid.mutate(d.id, {
                      onSuccess: () => {
                        toast.success(
                          d.direction === 'borrowed' ? 'Marked as paid · debt closed' : 'Marked as received · debt closed',
                        );
                        setClosingDebt(null);
                      },
                      onError: e => toast.error(e.message),
                    });

                  if (payAmount <= 0) {
                    finishClose();
                    return;
                  }

                  const cat = d.direction === 'borrowed' ? 'Debt Payment' : 'Debt Received';
                  const desc = `${d.person_name.trim()} · Closed`;
                  postTxThen(d, payAmount, closeOccurredAt, cat, desc, null, finishClose);
                }}
              >
                {closingDebt.direction === 'borrowed' ? 'Confirm · Mark as Paid' : 'Confirm · Mark as Received'}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
