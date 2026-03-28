import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type TransactionType = 'income' | 'expense' | 'savings';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  description: string | null;
  created_at: string;
}

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>;

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Bills & Utilities',
  'EMI Payments',
  'Loan Repayment',
  'Debt Payment',
  'Taxes',
  'Loan',
  'Food & Dining',
  'Transportation',
  'Household Items',
  'Health & Medical',
  'Family Expenses',
  'Shopping',
  'Clothing',
  'Education',
  'Entertainment',
  'Gifts & Donations',
  'Office Expenses',
  'Other Expenses'
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Packet money',
  'Freelance',
  'Investment',
  'Other Income',
];

export const SAVINGS_CATEGORIES = [
  'Gold Savings Plan',
  'Chit Fund',
  'Other Savings',
];

export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...SAVINGS_CATEGORIES];

export function categoriesForType(t: TransactionType): readonly string[] {
  if (t === 'income') return INCOME_CATEGORIES;
  if (t === 'savings') return SAVINGS_CATEGORIES;
  return EXPENSE_CATEGORIES;
}

export function useTransactions(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['transactions', targetUserId],
    queryFn: async () => {
      let query = supabase.from('transactions').select('*').order('date', { ascending: false });
      if (targetUserId) query = query.eq('user_id', targetUserId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!targetUserId,
  });
}

export function useAllTransactions() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: isAdmin,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tx: Omit<TransactionInsert, 'user_id'>) => {
      const { data, error } = await supabase.from('transactions').insert({ ...tx, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TransactionInsert>) => {
      const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
