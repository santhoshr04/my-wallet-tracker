import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAllTransactions, Transaction } from '@/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TransactionList from '@/components/TransactionList';
import StatCard from '@/components/StatCard';
import CategoryChart from '@/components/CategoryChart';
import { Users, DollarSign, TrendingUp, TrendingDown, Download, Eye } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Profile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  const { data: allTransactions = [] } = useAllTransactions();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const userTransactions = viewingUser
    ? allTransactions.filter(t => t.user_id === viewingUser.user_id)
    : [];

  const exportUserData = (userId: string, email: string | null) => {
    const data = allTransactions.filter(t => t.user_id === userId);
    const blob = new Blob([JSON.stringify({ user: email, transactions: data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${email || userId}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAll = () => {
    const grouped: Record<string, any> = {};
    profiles.forEach(p => {
      grouped[p.email || p.user_id] = {
        profile: p,
        transactions: allTransactions.filter(t => t.user_id === p.user_id),
      };
    });
    const blob = new Blob([JSON.stringify(grouped, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-users-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Admin Panel</h1>
        <Button variant="outline" size="sm" onClick={exportAll}>
          <Download className="w-4 h-4 mr-2" />
          Export All Data
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={profiles.length.toString()} icon={Users} />
        <StatCard title="Total Income" value={`$${totalIncome.toFixed(2)}`} icon={TrendingUp} variant="income" />
        <StatCard title="Total Expenses" value={`$${totalExpense.toFixed(2)}`} icon={TrendingDown} variant="expense" />
        <StatCard title="Net Balance" value={`$${(totalIncome - totalExpense).toFixed(2)}`} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryChart transactions={allTransactions} type="expense" />
        <CategoryChart transactions={allTransactions} type="income" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {profiles.map(p => {
              const userTxCount = allTransactions.filter(t => t.user_id === p.user_id).length;
              return (
                <div key={p.user_id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{p.display_name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground">{p.email} · {userTxCount} transactions</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewingUser(p)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportUserData(p.user_id, p.email)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewingUser} onOpenChange={open => !open && setViewingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingUser?.display_name || viewingUser?.email}'s Transactions</DialogTitle>
          </DialogHeader>
          <TransactionList transactions={userTransactions} showActions={false} title={`${userTransactions.length} Transactions`} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
