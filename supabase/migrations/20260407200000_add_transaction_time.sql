-- Optional time-of-day for each transaction (date stays as calendar day)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transaction_time TIME;

COMMENT ON COLUMN public.transactions.transaction_time IS 'Local time when the transaction occurred (optional for legacy rows)';
