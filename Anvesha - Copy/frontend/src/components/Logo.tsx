import { cx } from '../lib/format';

/** Anvesha mark: a location pin whose centre is a four-point "discovery" spark. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lgm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F79A3E" />
          <stop offset=".55" stopColor="#EE5A3C" />
          <stop offset="1" stopColor="#E0397B" />
        </linearGradient>
      </defs>
      <path d="M20 2.5c-8.2 0-14.5 6.2-14.5 14.2 0 9.6 11.2 19.1 13.3 20.8a1.9 1.9 0 0 0 2.4 0c2.1-1.7 13.3-11.2 13.3-20.8C34.5 8.7 28.2 2.5 20 2.5Z" fill="url(#lgm)" />
      <path d="M20 8.6c.6 4.3 2.3 6 6.6 6.6-4.3.6-6 2.3-6.6 6.6-.6-4.3-2.3-6-6.6-6.6 4.3-.6 6-2.3 6.6-6.6Z" fill="#fff" />
      <circle cx="27.2" cy="9.6" r="1.6" fill="#fff" opacity=".85" />
    </svg>
  );
}

export function Logo({ className, light, tag }: { className?: string; light?: boolean; tag?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className={cx('font-display text-[20px] font-bold tracking-[-0.02em] whitespace-nowrap', light ? 'text-white' : 'text-ink-950')}>TRAVEL SAATHI</span>
      {tag && <span className="rounded-md bg-ink-950 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{tag}</span>}
    </span>
  );
}
