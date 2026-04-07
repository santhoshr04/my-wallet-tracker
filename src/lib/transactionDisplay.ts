import type { Transaction } from '@/hooks/useTransactions';

/** Short category values stored in DB and used by charts */
export const DEBT_INCOME_CATEGORIES = ['Debt Borrowed', 'Debt Received'] as const;
export const DEBT_EXPENSE_CATEGORIES = ['Debt Lent', 'Debt Payment'] as const;
export const DEBT_CHART_CATEGORIES = [...DEBT_INCOME_CATEGORIES, ...DEBT_EXPENSE_CATEGORIES] as const;

function debtPersonFromDescription(description: string | null | undefined): string {
  if (!description?.trim()) return '';
  return description.split(' · ')[0]?.trim() ?? '';
}

/** Rich label for list / headers (pie chart still uses `category`). */
export function transactionTitleForUi(tx: Pick<Transaction, 'category' | 'description'>): string {
  const person = debtPersonFromDescription(tx.description);
  switch (tx.category) {
    case 'Debt Borrowed':
      return person ? `Debt Borrowed from ${person}` : 'Debt Borrowed';
    case 'Debt Lent':
      return person ? `Debt Lent to ${person}` : 'Debt Lent';
    case 'Debt Payment':
      return person ? `Debt Payment from ${person}` : 'Debt Payment';
    case 'Debt Received':
      return person ? `Debt Received from ${person}` : 'Debt Received';
    default:
      return tx.category;
  }
}

/** Secondary line: notes + datetime (person is in title for debt types). */
export function transactionSubtitleForUi(
  tx: Pick<Transaction, 'category' | 'description'>,
  datetimeLabel: string,
): string {
  const full = tx.description?.trim() || '';
  const isDebt = (DEBT_CHART_CATEGORIES as readonly string[]).includes(tx.category);
  if (isDebt && full) {
    const parts = full.split(' · ');
    const note = parts.length > 1 ? parts.slice(1).join(' · ').trim() : '';
    return note ? `${note} · ${datetimeLabel}` : datetimeLabel;
  }
  if (!full) return datetimeLabel;
  return `${full} · ${datetimeLabel}`;
}
