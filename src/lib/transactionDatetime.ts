import { format } from 'date-fns';

/** Pad to HH:mm:ss for Postgres TIME */
export function normalizeTimeForDb(t: string): string {
  const s = t.trim();
  if (!s) return '00:00:00';
  const parts = s.split(':').map(p => p.padStart(2, '0'));
  if (parts.length === 1) return `${parts[0].slice(0, 2)}:00:00`;
  if (parts.length === 2) return `${parts[0].slice(0, 2)}:${parts[1].slice(0, 2)}:00`;
  return `${parts[0].slice(0, 2)}:${parts[1].slice(0, 2)}:${parts[2].slice(0, 2)}`;
}

/** Current local time as HH:mm for input[type=time] */
export function nowLocalTimeHHMM(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Parse Postgres TIME string (e.g. "14:05:00" or "14:05:00+00") to HH:mm for inputs */
export function timeFromDbToHHMM(db: string | null | undefined): string {
  if (!db) return '12:00';
  const m = db.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '12:00';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

export function splitDateTimeLocal(value: string): { date: string; time: string } {
  const [datePart, rest] = value.split('T');
  if (!rest) return { date: datePart, time: nowLocalTimeHHMM() };
  const timePart = rest.slice(0, 5);
  return { date: datePart, time: timePart };
}

/** Value for input[type="datetime-local"] in local timezone */
export function defaultLocalDatetimeLocal(): string {
  const v = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}T${pad(v.getHours())}:${pad(v.getMinutes())}`;
}

/** Display label for list rows */
export function formatTransactionWhen(date: string, transactionTime: string | null | undefined): string {
  const parts = date.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return date;
  if (transactionTime) {
    const tm = timeFromDbToHHMM(transactionTime);
    const [hh, mm] = tm.split(':').map(x => Number(x));
    return format(new Date(y, m - 1, d, hh, mm), 'MMM d, yyyy · h:mm a');
  }
  return format(new Date(y, m - 1, d), 'MMM d, yyyy');
}
