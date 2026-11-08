import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Star, X, CheckCircle2, Info, AlertTriangle, Sparkles, Minus, Plus } from 'lucide-react';
import { cx } from '../lib/format';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';

/* ------------------------------------------------------------------ Button */
type Variant = 'primary' | 'secondary' | 'ghost' | 'ai' | 'dark' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-[0_8px_20px_-8px_rgba(242,113,28,.7)]',
  secondary: 'bg-ink-100 text-ink-900 hover:bg-ink-200',
  ghost: 'text-ink-700 hover:bg-ink-100',
  ai: 'bg-ai text-white hover:brightness-105 shadow-[0_10px_24px_-10px_rgba(224,57,123,.7)]',
  dark: 'bg-ink-950 text-white hover:bg-ink-800',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  outline: 'border border-ink-200 bg-white text-ink-900 hover:border-ink-300 hover:bg-ink-50',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-[15px] gap-2 rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', className, children, icon, iconRight, full, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode; iconRight?: ReactNode; full?: boolean }) {
  return (
    <button
      className={cx('inline-flex select-none items-center justify-center font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50', VARIANTS[variant], SIZES[size], full && 'w-full', className)}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export function IconButton({ className, children, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cx('grid h-10 w-10 place-items-center rounded-full transition active:scale-95', className ?? 'bg-white text-ink-800 shadow-card hover:bg-ink-50')} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Chips & badges */
export function Chip({ active, children, onClick, icon, className, count }: { active?: boolean; children: ReactNode; onClick?: () => void; icon?: ReactNode; className?: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition',
        active ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300',
        className,
      )}
    >
      {icon}
      {children}
      {count !== undefined && <span className={cx('rounded-full px-1.5 text-[11px]', active ? 'bg-white/20' : 'bg-ink-100')}>{count}</span>}
    </button>
  );
}

export function Badge({ children, tone = 'neutral', className, icon }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'green' | 'amber' | 'red' | 'blue' | 'dark' | 'glass' | 'ai'; className?: string; icon?: ReactNode }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700',
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-leaf-50 text-leaf-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-sky2-50 text-sky2-600',
    dark: 'bg-ink-950 text-white',
    glass: 'bg-white/90 text-ink-900 backdrop-blur',
    ai: 'bg-ai text-white',
  } as const;
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold', tones[tone], className)}>{icon}{children}</span>;
}

/** AI match badge: pill or ring */
export function MatchBadge({ score, variant = 'pill', className }: { score: number; variant?: 'pill' | 'ring' | 'glass'; className?: string }) {
  if (variant === 'ring') {
    const r = 30;
    const c = 2 * Math.PI * r;
    return (
      <div className={cx('relative grid h-[76px] w-[76px] shrink-0 place-items-center', className)} aria-label={`${score}% match`}>
        <svg viewBox="0 0 76 76" className="absolute inset-0 -rotate-90">
          <defs>
            <linearGradient id="mring" x1="0" x2="1">
              <stop offset="0" stopColor="#F2711C" />
              <stop offset="1" stopColor="#E0397B" />
            </linearGradient>
          </defs>
          <circle cx="38" cy="38" r={r} stroke="#EEF0F7" strokeWidth="7" fill="none" />
          <circle cx="38" cy="38" r={r} stroke="url(#mring)" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} />
        </svg>
        <div className="text-center leading-none">
          <div className="font-display text-[20px] font-bold text-ink-950 tnum">{score}%</div>
          <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-ink-500">match</div>
        </div>
      </div>
    );
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold tnum', variant === 'glass' ? 'bg-white/95 text-ink-950 shadow-sm backdrop-blur' : 'bg-ai text-white', className)}>
      <Sparkles size={12} className={variant === 'glass' ? 'text-brand-500' : ''} />
      {score}% Match
    </span>
  );
}

export function Rating({ value, count, size = 'sm', className }: { value: number; count?: number; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 font-semibold text-ink-900', size === 'md' ? 'text-[15px]' : 'text-[13px]', className)}>
      <Star size={size === 'md' ? 16 : 13} className="fill-amber-400 text-amber-400" />
      <span className="tnum">{value.toFixed(1)}</span>
      {count !== undefined && <span className="font-medium text-ink-500">({count.toLocaleString('en-IN')})</span>}
    </span>
  );
}

export function Availability({ left, capacity, label }: { left: number; capacity?: number; label?: string }) {
  const tone = left === 0 ? 'bg-red-500' : left <= 4 ? 'bg-amber-500' : 'bg-leaf-500';
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700">
      <span className="relative flex h-2 w-2">
        {left > 0 && <span className={cx('absolute inline-flex h-full w-full rounded-full opacity-60 animate-pulse-ring', tone)} />}
        <span className={cx('relative inline-flex h-2 w-2 rounded-full', tone)} />
      </span>
      {label ?? (left === 0 ? 'Sold out' : left <= 4 ? `Only ${left} left` : `${left}${capacity ? `/${capacity}` : ''} spots open`)}
    </span>
  );
}

/* ------------------------------------------------------------------ Form controls */
export function Toggle({ checked, onChange, label, desc, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        {desc && <span className="block text-[12.5px] text-ink-500">{desc}</span>}
      </span>
      <span className="relative">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-7 w-12 rounded-full bg-ink-200 transition peer-checked:bg-leaf-500 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-200" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ options, value, onChange, className }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx('inline-flex rounded-2xl bg-ink-100 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold transition', value === o.value ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-800')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ id, value, min, max, step = 1, onChange, format, marks }: { id: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; marks?: string[] }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{ background: `linear-gradient(90deg, #F2711C ${pct}%, #DFE2EE ${pct}%)` }}
        aria-valuetext={format?.(value)}
      />
      {marks && (
        <div className="mt-2 flex justify-between text-[11.5px] font-medium text-ink-500">
          {marks.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 20, label, sub }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <div className="text-sm font-semibold text-ink-900">{label}</div>
        {sub && <div className="text-[12.5px] text-ink-500">{sub}</div>}
      </div>
      <div className="flex items-center gap-3">
        <IconButton label={`Fewer ${label}`} className="h-9 w-9 border border-ink-200 bg-white text-ink-800 disabled:opacity-40" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
          <Minus size={16} />
        </IconButton>
        <span className="w-5 text-center font-display text-lg font-bold tnum">{value}</span>
        <IconButton label={`More ${label}`} className="h-9 w-9 border border-ink-200 bg-white text-ink-800 disabled:opacity-40" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          <Plus size={16} />
        </IconButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Overlays */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px] animate-fade-up" onClick={onClose} />
      <div className={cx('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-lift animate-slide-up sm:rounded-[28px]', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <IconButton label="Close" className="h-9 w-9 bg-ink-100 text-ink-700 hover:bg-ink-200" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-ink-100 px-5 py-4 pb-safe">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, side = 'right', width = 'sm:max-w-md', header }: { open: boolean; onClose: () => void; title: string; children: ReactNode; side?: 'right' | 'bottom'; width?: string; header?: ReactNode }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('absolute flex flex-col bg-white shadow-lift', side === 'right' ? cx('inset-y-0 right-0 w-full animate-slide-in', width) : 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-[28px] animate-slide-up')}>
        {header ?? (
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h3 className="text-lg font-bold">{title}</h3>
            <IconButton label="Close" className="h-9 w-9 bg-ink-100 text-ink-700" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  const { navigate } = useRouter();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.tone === 'warn' ? AlertTriangle : t.tone === 'ai' ? Sparkles : t.tone === 'info' ? Info : CheckCircle2;
        return (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-ink-950 px-4 py-3 text-white shadow-lift animate-fade-up">
            <span className={cx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', t.tone === 'warn' ? 'bg-amber-400 text-ink-950' : t.tone === 'ai' ? 'bg-ai' : t.tone === 'info' ? 'bg-white/15' : 'bg-leaf-500')}>
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.body && <div className="truncate text-[12.5px] text-white/70">{t.body}</div>}
            </div>
            {t.action && (
              <button
                className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-bold text-brand-300 hover:bg-white/10"
                onClick={() => {
                  dismissToast(t.id);
                  navigate(t.action!.to);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Layout helpers */
export function SectionHeader({ title, eyebrow, action, className }: { title: ReactNode; eyebrow?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-4 flex items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="text-[22px] font-bold leading-tight sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function ProgressSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 flex-col gap-1.5">
          <div className={cx('h-1.5 rounded-full transition-colors', i <= current ? 'bg-brand-500' : 'bg-ink-200')} />
          <span className={cx('hidden text-[11.5px] font-semibold sm:block', i <= current ? 'text-ink-900' : 'text-ink-400')}>{s}</span>
        </div>
      ))}
    </div>
  );
}

export function Check({ ok = true, children, className }: { ok?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-start gap-2 text-[13.5px] leading-snug', ok ? 'text-ink-800' : 'text-ink-500', className)}>
      {ok ? <CheckCircle2 size={16} className="mt-[1px] shrink-0 text-leaf-500" /> : <AlertTriangle size={16} className="mt-[1px] shrink-0 text-amber-500" />}
      <span>{children}</span>
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
