import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type DebtDirection = 'borrowed' | 'lent';
export type DebtStatus = 'active' | 'completed';

export interface Debt {
  id: string;
  user_id: string;
  direction: DebtDirection;
  amount: number;
  remaining_amount: number;
  person_name: string;
  // No longer required by app; may be null for legacy rows.
  due_date: string | null;
  transaction_date: string; // YYYY-MM-DD
  transaction_time: string; // HH:mm:ss
  description: string | null;
  status: DebtStatus;
  created_at: string;
  updated_at: string;
}

export type DebtInsert = Omit<Debt, 'id' | 'created_at' | 'updated_at'>;

export interface DebtPayment {
  id: string;
  debt_id: string;
  user_id: string;
  amount: number;
  occurred_date: string;
  occurred_time: string;
  note: string | null;
  created_at: string;
}

export function useDebts(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['debts', targetUserId],
    queryFn: async () => {
      let query = supabase
        .from('debts')
        .select('*')
        .order('status', { ascending: true })
        .order('transaction_date', { ascending: false })
        .order('transaction_time', { ascending: false });
      if (targetUserId) query = query.eq('user_id', targetUserId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Debt[];
    },
    enabled: !!targetUserId,
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (debt: Omit<DebtInsert, 'user_id'>) => {
      const payload: Omit<DebtInsert, 'user_id'> & { user_id: string } = { ...debt, user_id: user!.id };
      const { data, error } = await supabase.from('debts').insert(payload).select().single();
      if (error) throw error;
      return data as Debt;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useMarkDebtPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('debts')
        .update({ remaining_amount: 0, status: 'completed' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Debt;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useAddDebtPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      paymentAmount,
      occurred_date,
      occurred_time,
    }: {
      id: string;
      paymentAmount: number;
      occurred_date: string;
      occurred_time: string;
    }) => {
      const { data: current, error: readErr } = await supabase
        .from('debts')
        .select('remaining_amount, status')
        .eq('id', id)
        .single();
      if (readErr) throw readErr;
      if (current.status === 'completed') throw new Error('Debt is already closed');

      const remaining = Number(current.remaining_amount);
      const applied = Math.min(Math.max(0, paymentAmount), remaining);
      if (applied <= 0) throw new Error('No balance left to apply; use Mark as Paid / Mark as Received to close');

      const nextRemaining = Math.round((remaining - applied) * 100) / 100;
      const { data: payment, error: payErr } = await supabase
        .from('debt_payments')
        .insert({
          debt_id: id,
          user_id: user!.id,
          amount: applied,
          occurred_date,
          occurred_time,
        })
        .select()
        .single();
      if (payErr) throw payErr;

      // Partial payments only reduce balance; closing is explicit via Mark as Paid / Mark as Received.
      const { data, error } = await supabase
        .from('debts')
        .update({ remaining_amount: nextRemaining, status: 'active' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { debt: data as Debt, applied, payment_id: (payment as any).id as string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useDebtPayments(debtId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['debt_payments', debtId, user?.id],
    queryFn: async () => {
      if (!debtId) return [];
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('occurred_date', { ascending: false })
        .order('occurred_time', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        debt_id: string;
        user_id: string;
        amount: number;
        occurred_date: string;
        occurred_time: string;
        note: string | null;
        created_at: string;
      }>;
    },
    enabled: !!debtId && !!user?.id,
  });
}

export function useDeleteDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId }: { paymentId: string }) => {
      // read payment + debt id
      const { data: p, error: pErr } = await supabase
        .from('debt_payments')
        .select('id, debt_id, amount')
        .eq('id', paymentId)
        .single();
      if (pErr) throw pErr;

      const { data: d, error: dErr } = await supabase
        .from('debts')
        .select('id, remaining_amount, status')
        .eq('id', (p as any).debt_id)
        .single();
      if (dErr) throw dErr;

      // delete linked transaction first (if any)
      await supabase.from('transactions').delete().eq('debt_payment_id', paymentId);

      const { error: delErr } = await supabase.from('debt_payments').delete().eq('id', paymentId);
      if (delErr) throw delErr;

      const nextRemaining = Math.round((Number((d as any).remaining_amount) + Number((p as any).amount)) * 100) / 100;
      const { error: upErr } = await supabase
        .from('debts')
        .update({ remaining_amount: nextRemaining, status: 'active' })
        .eq('id', (p as any).debt_id);
      if (upErr) throw upErr;

      return { debt_id: (p as any).debt_id as string };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['debt_payments', r.debt_id] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

