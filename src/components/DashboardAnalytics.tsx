import { Transaction } from '@/hooks/useTransactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  avgDailyExpense,
  buildMonthlyTrend,
  DashboardPeriod,
  DASHBOARD_PERIOD_LABEL,
  savingsRatePercent,
  topExpenseCategories,
} from '@/lib/dashboardUtils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Landmark, LucideIcon, PiggyBank, Receipt } from 'lucide-react';

const COLOR_INCOME = 'hsl(153 60% 33%)';
const COLOR_EXPENSE = 'hsl(0 72% 51%)';
const COLOR_NET = 'hsl(199 89% 48%)';

type Props = {
  filteredTransactions: Transaction[];
  allTransactions: Transaction[];
  period: DashboardPeriod;
};

function Insight({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex gap-4 p-4">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-lg font-heading font-bold truncate">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardAnalytics({ filteredTransactions, allTransactions, period }: Props) {
  const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const compareData = [{ name: 'Total', income, expense }];
  const trend = buildMonthlyTrend(allTransactions, 6);
  const topCats = topExpenseCategories(filteredTransactions, 5);
  const savings = savingsRatePercent(income, expense);
  const avgDaily = avgDailyExpense(filteredTransactions, period);
  const txCount = filteredTransactions.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Insight
          icon={PiggyBank}
          label="Savings rate"
          value={savings == null ? '—' : `${savings}%`}
          hint={
            savings == null
              ? 'Add income in this period to see savings rate'
              : 'Share of income left after expenses'
          }
        />
        <Insight
          icon={Receipt}
          label="Avg. daily spending"
          value={avgDaily == null ? '—' : `$${avgDaily.toFixed(2)}`}
          hint="Expenses ÷ days in period"
        />
        <Insight icon={Landmark} label="Transactions" value={String(txCount)} hint={`In ${DASHBOARD_PERIOD_LABEL[period].toLowerCase()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">Income vs expense</CardTitle>
            <CardDescription>Total for {DASHBOARD_PERIOD_LABEL[period].toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 min-w-0">
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <BarChart data={compareData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} width={56} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="income" name="Income" fill={COLOR_INCOME} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill={COLOR_EXPENSE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">6-month cash flow</CardTitle>
            <CardDescription>Income, spending, and net per month (all activity)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 min-w-0">
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <LineChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} width={56} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Income" stroke={COLOR_INCOME} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke={COLOR_EXPENSE} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" name="Net" stroke={COLOR_NET} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {topCats.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">Top expense categories</CardTitle>
            <CardDescription>{DASHBOARD_PERIOD_LABEL[period]} · by amount</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className=" divide-y">
              {topCats.map((row, i) => {
                const pct = expense > 0 ? Math.round((row.amount / expense) * 100) : 0;
                return (
                  <li key={row.category} className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0">
                    <span className="text-muted-foreground w-6 shrink-0 font-medium">{i + 1}</span>
                    <span className="flex-1 font-medium truncate">{row.category}</span>
                    <span className="text-muted-foreground shrink-0">{pct}%</span>
                    <span className="font-heading font-semibold tabular-nums shrink-0">${row.amount.toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
