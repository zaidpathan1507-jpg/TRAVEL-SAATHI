export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export const dur = (m: number) => {
  m = Math.round(m);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

export const clock = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  const mm = Math.round(m % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
};

export const km = (k: number) => (k < 1 ? `${Math.max(100, Math.round(k * 10) * 100)} m` : `${k.toFixed(1)} km`);

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
