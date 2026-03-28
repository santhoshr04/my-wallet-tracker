import { useNavigate } from 'react-router-dom';
import { useCreateTransaction } from '@/hooks/useTransactions';
import TransactionForm from '@/components/TransactionForm';
import { toast } from 'sonner';

export default function AddTransactionPage() {
  const createMut = useCreateTransaction();
  const navigate = useNavigate();

  const handleSubmit = (data: any) => {
    createMut.mutate(data, {
      onSuccess: () => { toast.success('Transaction added!'); navigate('/'); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-heading font-bold mb-6">Add Transaction</h1>
      <TransactionForm onSubmit={handleSubmit} loading={createMut.isPending} />
    </div>
  );
}
