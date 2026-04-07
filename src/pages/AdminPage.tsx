import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAllTransactions, Transaction } from '@/hooks/useTransactions';
import type { Debt, DebtPayment } from '@/hooks/useDebts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TransactionList from '@/components/TransactionList';
import StatCard from '@/components/StatCard';
import CategoryChart from '@/components/CategoryChart';
import { Users, IndianRupee, PiggyBank, TrendingUp, TrendingDown, Download, Eye, Upload } from 'lucide-react';
import { formatInr } from '@/lib/formatCurrency';
import { Navigate } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

type ExportBundleV2 = {
  exported_at: string;
  schema_version: 2;
  users: Array<{
    profile: Profile;
    transactions: Transaction[];
    debts: Debt[];
    debt_payments: DebtPayment[];
  }>;
};

export default function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const { data: allDebts = [] } = useQuery({
    queryKey: ['admin-debts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('debts').select('*');
      if (error) throw error;
      return data as Debt[];
    },
    enabled: isAdmin,
  });

  const { data: allDebtPayments = [] } = useQuery({
    queryKey: ['admin-debt-payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('debt_payments').select('*');
      if (error) throw error;
      return data as DebtPayment[];
    },
    enabled: isAdmin,
  });

  if (loading) return <PageLoader />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const totalSavings = allTransactions.filter(t => t.type === 'savings').reduce((s, t) => s + Number(t.amount), 0);

  const userTransactions = viewingUser
    ? allTransactions.filter(t => t.user_id === viewingUser.user_id)
    : [];

  const selectedProfiles = useMemo(() => {
    if (selectedUserIds.size === 0) return [];
    return profiles.filter(p => selectedUserIds.has(p.user_id));
  }, [profiles, selectedUserIds]);

  const exportUsers = (ps: Profile[], filename: string) => {
    const bundle: ExportBundleV2 = {
      exported_at: new Date().toISOString(),
      schema_version: 2,
      users: ps.map(p => {
        const debts = allDebts.filter(d => d.user_id === p.user_id);
        const debtIds = new Set(debts.map(d => d.id));
        return {
          profile: p,
          transactions: allTransactions.filter(t => t.user_id === p.user_id),
          debts,
          debt_payments: allDebtPayments.filter(
            dp => dp.user_id === p.user_id && debtIds.has(dp.debt_id),
          ),
        };
      }),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportUserData = (p: Profile) => {
    exportUsers([p], `${p.email || p.user_id}-data.json`);
  };

  const exportAll = () => {
    exportUsers(profiles, 'all-users-data.json');
  };

  const exportSelected = () => {
    if (selectedProfiles.length === 0) {
      toast.error('Select at least one user to export');
      return;
    }
    exportUsers(selectedProfiles, 'selected-users-data.json');
  };

  const toggleUserSelected = (userId: string, next: boolean) => {
    setSelectedUserIds(prev => {
      const n = new Set(prev);
      if (next) n.add(userId);
      else n.delete(userId);
      return n;
    });
  };

  const toggleSelectAll = (next: boolean) => {
    setSelectedUserIds(() => {
      if (!next) return new Set();
      return new Set(profiles.map(p => p.user_id));
    });
  };

  const normalizeImport = (raw: any): ExportBundleV2 => {
    if (raw?.schema_version === 2 && Array.isArray(raw?.users)) return structuredClone(raw) as ExportBundleV2;

    if (raw?.schema_version === 1 && Array.isArray(raw?.users)) {
      const u = raw.users as Array<{ profile: Profile; transactions: Transaction[]; debts: Debt[] }>;
      return {
        exported_at: raw.exported_at ?? new Date().toISOString(),
        schema_version: 2,
        users: u.map(row => ({
          profile: row.profile,
          transactions: row.transactions ?? [],
          debts: row.debts ?? [],
          debt_payments: [],
        })),
      };
    }

    // Legacy: { user, transactions } (single user export)
    if (raw && Array.isArray(raw.transactions)) {
      return {
        exported_at: new Date().toISOString(),
        schema_version: 2,
        users: [{
          profile: { user_id: String(raw.user ?? 'unknown'), email: raw.user ?? null, display_name: null, created_at: new Date().toISOString() },
          transactions: raw.transactions as Transaction[],
          debts: Array.isArray(raw.debts) ? (raw.debts as Debt[]) : [],
          debt_payments: Array.isArray(raw.debt_payments) ? (raw.debt_payments as DebtPayment[]) : [],
        }],
      };
    }

    throw new Error('Unsupported import file format');
  };

  const onPickImportFile = () => fileInputRef.current?.click();

  const onImportFile = async (file: File) => {
    try {
      if (!user?.id) {
        toast.error('Not signed in');
        return;
      }
      const text = await file.text();
      const raw = JSON.parse(text);
      const bundle = normalizeImport(raw);

      toast.message('Import started', { description: 'Matching users by email and importing their data…' });

      const { data, error } = await supabase.functions.invoke('import-bundle', { body: bundle });
      if (error) throw error;
      const report = (data as any)?.report;
      toast.success('Import complete', {
        description: report
          ? `Users: +${report.created_users} created, ${report.matched_users} matched · Tx: ${report.imported_transactions} · Debts: ${report.imported_debts} · Debt payments: ${report.imported_debt_payments ?? 0}`
          : 'Done',
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to import file');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-heading font-bold">Admin Panel</h1>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void onImportFile(f);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full touch-manipulation sm:w-auto shrink-0"
            onClick={exportAll}
          >
            <Download className="w-4 h-4 mr-2 shrink-0" />
            Export All Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full touch-manipulation sm:w-auto shrink-0"
            onClick={exportSelected}
            disabled={selectedProfiles.length === 0}
          >
            <Download className="w-4 h-4 mr-2 shrink-0" />
            Export Selected ({selectedProfiles.length})
          </Button>
          <Button
            variant="default"
            size="sm"
            className="w-full touch-manipulation sm:w-auto shrink-0"
            onClick={onPickImportFile}
          >
            <Upload className="w-4 h-4 mr-2 shrink-0" />
            Import JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Users" value={profiles.length.toString()} icon={Users} />
        <StatCard title="Total Income" value={formatInr(totalIncome)} icon={TrendingUp} variant="income" />
        <StatCard title="Total Expenses" value={formatInr(totalExpense)} icon={TrendingDown} variant="expense" />
        <StatCard title="Total Savings" value={formatInr(totalSavings)} icon={PiggyBank} variant="savings" />
        <StatCard
          title="Net Balance"
          value={formatInr(totalIncome - totalExpense - totalSavings)}
          icon={IndianRupee}
          subtitle="Income − expenses − savings"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <CategoryChart transactions={allTransactions} type="expense" />
        <CategoryChart transactions={allTransactions} type="income" />
        <CategoryChart transactions={allTransactions} type="savings" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={profiles.length > 0 && selectedUserIds.size === profiles.length}
                  onCheckedChange={(v) => toggleSelectAll(!!v)}
                />
                <span className="text-sm font-medium">Select all</span>
                <span className="text-xs text-muted-foreground">
                  ({selectedUserIds.size} selected)
                </span>
              </div>
            </div>
            {profiles.map(p => {
              const userTxCount = allTransactions.filter(t => t.user_id === p.user_id).length;
              return (
                <div key={p.user_id} className="flex flex-col gap-3 px-3 py-3 hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-start gap-3 min-w-0">
                    <Checkbox
                      checked={selectedUserIds.has(p.user_id)}
                      onCheckedChange={(v) => toggleUserSelected(p.user_id, !!v)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                    <p className="font-medium text-sm">{p.display_name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email} · {userTxCount} transactions</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" size="sm" className="touch-manipulation flex-1 sm:flex-initial" onClick={() => setViewingUser(p)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="touch-manipulation" onClick={() => exportUserData(p)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingUser?.display_name || viewingUser?.email}'s Transactions</DialogTitle>
          </DialogHeader>
          <TransactionList transactions={userTransactions} showActions={false} title={`${userTransactions.length} Transactions`} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
