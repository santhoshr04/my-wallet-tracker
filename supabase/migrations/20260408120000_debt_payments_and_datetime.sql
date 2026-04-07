-- Debt: remove due-date requirement in app model, add transaction datetime, and add payment CRUD support

-- 1) Debts: make due_date nullable (legacy), add transaction datetime
ALTER TABLE public.debts
  ALTER COLUMN due_date DROP NOT NULL;

ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS transaction_time TIME NOT NULL DEFAULT CURRENT_TIME;

-- Backfill for existing rows
UPDATE public.debts
SET
  transaction_date = COALESCE(transaction_date, created_at::date),
  transaction_time = COALESCE(transaction_time, created_at::time)
WHERE transaction_date IS NULL OR transaction_time IS NULL;

-- 2) Debt payments table for proper CRUD
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES public.debts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  occurred_date DATE NOT NULL,
  occurred_time TIME NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debt payments" ON public.debt_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debt payments" ON public.debt_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own debt payments" ON public.debt_payments
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all debt payments" ON public.debt_payments
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_user_id ON public.debt_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_occurred ON public.debt_payments(occurred_date, occurred_time);

-- 3) Link transactions to debts/payments so deletes can be consistent
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS debt_payment_id UUID REFERENCES public.debt_payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_debt_id ON public.transactions(debt_id);
CREATE INDEX IF NOT EXISTS idx_transactions_debt_payment_id ON public.transactions(debt_payment_id);

