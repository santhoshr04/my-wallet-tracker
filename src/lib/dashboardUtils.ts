import { Transaction } from '@/hooks/useTransactions';
import {
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';

export type DashboardPeriod = 'all' | 'month' | '30d';

export const DASHBOARD_PERIOD_LABEL: Record<DashboardPeriod, string> = {
  all: 'All time',
  month: 'This month',
  '30d': 'Last 30 days',
};

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: DashboardPeriod,
): Transaction[] {
  if (period === 'all') return transactions;
  const now = new Date();
  if (period === '30d') {
    const start = startOfDay(subDays(now, 29));
    const end = endOfDay(now);
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end });
    });
  }
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return transactions.filter(t => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start, end });
  });
}

export function buildMonthlyTrend(transactions: Transaction[], monthsBack = 6) {
  const now = new Date();
  const rangeStart = startOfMonth(subMonths(now, monthsBack - 1));
  const months = eachMonthOfInterval({ start: rangeStart, end: now });
  return months.map(monthStart => {
    const monthEnd = endOfMonth(monthStart);
    const inMonth = transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });
    const income = inMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = inMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const savings = inMonth.filter(t => t.type === 'savings').reduce((s, t) => s + Number(t.amount), 0);
    const incomeR = Math.round(income * 100) / 100;
    const expenseR = Math.round(expense * 100) / 100;
    const savingsR = Math.round(savings * 100) / 100;
    return {
      label: format(monthStart, 'MMM'),
      income: incomeR,
      expense: expenseR,
      savings: savingsR,
      net: Math.round((incomeR - expenseR - savingsR) * 100) / 100,
    };
  });
}

export function topExpenseCategories(transactions: Transaction[], limit = 5) {
  const byCat: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
    });
  return Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, amount]) => ({ category, amount }));
}

/** % of income remaining after expenses and savings allocations (same idea as cash left). */
export function leftoverIncomePercent(income: number, expense: number, savingsOutflow: number): number | null {
  if (income <= 0) return null;
  const net = income - expense - savingsOutflow;
  return Math.round((net / income) * 1000) / 10;
}

export function topSavingsCategories(transactions: Transaction[], limit = 5) {
  const byCat: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'savings')
    .forEach(t => {
      byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
    });
  return Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, amount]) => ({ category, amount }));
}

export function avgDailyExpense(transactions: Transaction[], period: DashboardPeriod): number | null {
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) return null;
  const total = expenses.reduce((s, t) => s + Number(t.amount), 0);
  if (period === 'all') {
    const dates = expenses.map(t => parseISO(t.date).getTime());
    if (dates.length === 0) return null;
    const span = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
    const days = Math.max(1, Math.ceil(span) || 1);
    return Math.round((total / days) * 100) / 100;
  }
  if (period === '30d') return Math.round((total / 30) * 100) / 100;
  const now = new Date();
  const start = startOfMonth(now);
  const dayCount = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  return Math.round((total / dayCount) * 100) / 100;
}
