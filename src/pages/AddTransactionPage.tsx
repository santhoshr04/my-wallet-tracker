import { useNavigate } from 'react-router-dom';
import AddEntryForm from '@/components/AddEntryForm';

export default function AddTransactionPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-heading font-bold mb-6">Add Transaction</h1>
      <AddEntryForm onDone={() => navigate('/')} />
    </div>
  );
}
