export function formatIdr(amount: number): string {
  const formatted = new Intl.NumberFormat('id-ID').format(amount);
  return `Rp ${formatted}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
