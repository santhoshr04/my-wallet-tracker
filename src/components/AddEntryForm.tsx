import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TransactionForm from '@/components/TransactionForm';
import DebtForm from '@/components/DebtForm';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useCreateDebt } from '@/hooks/useDebts';
import { toast } from 'sonner';
import { normalizeTimeForDb } from '@/lib/transactionDatetime';

export default function AddEntryForm({
  onDone,
}: {
  onDone?: () => void;
}) {
  const createTx = useCreateTransaction();
  const createDebt = useCreateDebt();

  return (
    <Tabs defaultValue="expense" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="expense">Expense</TabsTrigger>
        <TabsTrigger value="income">Income</TabsTrigger>
        <TabsTrigger value="savings">Savings</TabsTrigger>
        <TabsTrigger value="debt">Debt</TabsTrigger>
      </TabsList>

      <TabsContent value="expense">
        <TransactionForm
          fixedType="expense"
          title="Add Transaction"
          loading={createTx.isPending}
          onSubmit={(data) => {
            createTx.mutate(data, {
              onSuccess: () => {
                toast.success('Transaction added!');
                onDone?.();
              },
              onError: (e) => toast.error(e.message),
            });
          }}
        />
      </TabsContent>

      <TabsContent value="income">
        <TransactionForm
          fixedType="income"
          title="Add Transaction"
          loading={createTx.isPending}
          onSubmit={(data) => {
            createTx.mutate(data, {
              onSuccess: () => {
                toast.success('Transaction added!');
                onDone?.();
              },
              onError: (e) => toast.error(e.message),
            });
          }}
        />
      </TabsContent>

      <TabsContent value="savings">
        <TransactionForm
          fixedType="savings"
          title="Add Transaction"
          loading={createTx.isPending}
          onSubmit={(data) => {
            createTx.mutate(data, {
              onSuccess: () => {
                toast.success('Transaction added!');
                onDone?.();
              },
              onError: (e) => toast.error(e.message),
            });
          }}
        />
      </TabsContent>

      <TabsContent value="debt">
        <DebtForm
          loading={createDebt.isPending}
          title="Debt"
          onSubmit={(draft) => {
            createDebt.mutate(
              {
                direction: draft.direction,
                amount: draft.amount,
                remaining_amount: draft.amount,
                person_name: draft.person_name,
                description: draft.description || null,
                status: 'active',
                transaction_date: draft.tx_date,
                transaction_time: normalizeTimeForDb(draft.tx_time),
              },
              {
                onSuccess: (debt) => {
                  const txType = draft.direction === 'borrowed' ? 'income' : 'expense';
                  const txCategory = draft.direction === 'borrowed' ? 'Debt Borrowed' : 'Debt Lent';
                  const person = draft.person_name.trim();
                  const txDescription = [person, draft.description?.trim()].filter(Boolean).join(' · ') || person;

                  createTx.mutate(
                    {
                      type: txType,
                      amount: draft.amount,
                      category: txCategory,
                      date: draft.tx_date,
                      transaction_time: normalizeTimeForDb(draft.tx_time),
                      debt_id: (debt as any).id,
                      description: txDescription,
                    },
                    {
                      onSuccess: () => {
                        toast.success('Debt added!');
                        onDone?.();
                      },
                      onError: (e) => {
                        toast.error(`Debt saved, but transaction failed: ${e.message}`);
                        onDone?.();
                      },
                    },
                  );
                },
                onError: (e) => toast.error(e.message),
              },
            );
          }}
        />
      </TabsContent>
    </Tabs>
  );
}

