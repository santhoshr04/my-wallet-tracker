const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Full INR string, e.g. ₹12,345.67 */
export function formatInr(amount: number): string {
  return inr.format(amount);
}

/** Chart axis / compact numeric tick (same formatting, kept for clarity at call sites) */
export function formatInrTick(value: number): string {
  return inr.format(value);
}
