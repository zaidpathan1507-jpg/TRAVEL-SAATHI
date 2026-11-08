import { useState } from 'react';
import { cx } from '../lib/format';

const niceMax = (v: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10) * p;
};

interface SeriesProps {
  data: number[];
  labels: string[];
  format?: (v: number) => string;
  color?: string;
  height?: number;
  unit?: string;
}

const W = 640;
const PAD = { l: 52, r: 30, t: 16, b: 30 };

function Tooltip({ x, label, value }: { x: number; label: string; value: string }) {
  return (
    <div className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-ink-950 px-3 py-2 text-white shadow-lift" style={{ left: `${x}%` }}>
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="text-[13px] font-bold tnum">{value}</div>
    </div>
  );
}

export function AreaChart({ data, labels, format = (v) => String(v), color = '#F2711C', height = 220 }: SeriesProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data) * 1.08);
  const iw = W - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / (data.length - 1)) * iw;
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  const area = `${line} L${x(data.length - 1)} ${PAD.t + ih} L${x(0)} ${PAD.t + ih}Z`;
  const gid = `ag${color.replace('#', '')}`;
  const last = data.length - 1;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} stroke="#EEF0F7" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(max * f) + 4} textAnchor="end" fontSize="14" fill="#747CA0" className="tnum">
              {format(max * f)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % 2 === 1 || i === last ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="14" fill="#747CA0">
              {l}
            </text>
          ) : null,
        )}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="#9BA2C0" strokeDasharray="3 3" />}
        <circle cx={x(hover ?? last)} cy={y(data[hover ?? last])} r="5" fill={color} stroke="#fff" strokeWidth="2" />
        {data.map((_, i) => (
          <rect key={i} x={x(i) - iw / data.length / 2} y={PAD.t} width={iw / data.length} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && <Tooltip x={(x(hover) / W) * 100} label={labels[hover]} value={format(data[hover])} />}
    </div>
  );
}

export function BarChart({ data, labels, format = (v) => String(v), color = '#0F9D8A', height = 220 }: SeriesProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data) * 1.08);
  const iw = W - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const bw = iw / data.length;
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} stroke="#EEF0F7" />
            <text x={PAD.l - 8} y={y(max * f) + 4} textAnchor="end" fontSize="14" fill="#747CA0">
              {format(max * f)}
            </text>
          </g>
        ))}
        {data.map((v, i) => {
          const bx = PAD.l + i * bw + 2;
          const w = bw - 4;
          const top = y(v);
          const h = PAD.t + ih - top;
          const r = Math.min(4, w / 2, h);
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={PAD.l + i * bw} y={PAD.t} width={bw} height={ih} fill="transparent" />
              <path d={`M${bx} ${top + h} V${top + r} Q${bx} ${top} ${bx + r} ${top} H${bx + w - r} Q${bx + w} ${top} ${bx + w} ${top + r} V${top + h}Z`} fill={color} opacity={hover === null || hover === i ? 1 : 0.4} />
              {(i % 2 === 1 || i === data.length - 1) && (
                <text x={bx + w / 2} y={height - 6} textAnchor="middle" fontSize="14" fill="#747CA0">
                  {labels[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && <Tooltip x={((PAD.l + hover * bw + bw / 2) / W) * 100} label={labels[hover]} value={format(data[hover])} />}
    </div>
  );
}

export function Donut({ items, size = 168, centerLabel }: { items: { label: string; value: number; color: string }[]; size?: number; centerLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = 62;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          {items.map((it, i) => {
            const len = (it.value / total) * c;
            const el = (
              <circle
                key={it.label}
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth={hover === i ? 22 : 18}
                strokeDasharray={`${Math.max(0, len - 3)} ${c}`}
                strokeDashoffset={-acc}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="transition-all"
              />
            );
            acc += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-2xl font-bold text-ink-950 tnum">{(hover === null ? items[0] : items[hover]).value}%</div>
            <div className="text-[11px] font-semibold text-ink-500">{(hover === null ? items[0] : items[hover]).label}</div>
          </div>
        </div>
      </div>
      <ul className="min-w-[140px] flex-1 space-y-2">
        {items.map((it, i) => (
          <li key={it.label} className={cx('flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-[13px]', hover === i && 'bg-ink-50')} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="flex items-center gap-2 font-medium text-ink-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
              {it.label}
            </span>
            <span className="font-bold text-ink-950 tnum">{it.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const RAMP = ['#FFF5EC', '#FFE7D1', '#FFCBA0', '#FFA866', '#FB8A3C', '#F2711C', '#D95B0A', '#B4470B'];

export function Heatmap({ rows, cols, grid }: { rows: string[]; cols: string[]; grid: number[][] }) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const max = Math.max(...grid.flat());
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `44px repeat(${cols.length}, minmax(0,1fr))` }}>
          <span />
          {cols.map((c) => (
            <span key={c} className="pb-1 text-center text-[11px] font-semibold text-ink-500">
              {c}
            </span>
          ))}
          {rows.map((r, ri) => (
            <div key={r} className="contents">
              <span className="flex items-center text-[12px] font-semibold text-ink-600">{r}</span>
              {cols.map((c, ci) => {
                const v = grid[ri][ci];
                const idx = Math.round((v / max) * (RAMP.length - 1));
                const on = hover && hover[0] === ri && hover[1] === ci;
                return (
                  <span
                    key={c}
                    onMouseEnter={() => setHover([ri, ci])}
                    onMouseLeave={() => setHover(null)}
                    className={cx('relative grid h-9 place-items-center rounded-lg text-[11px] font-bold tnum transition', on && 'ring-2 ring-ink-950')}
                    style={{ background: RAMP[idx], color: idx >= 5 ? '#fff' : '#39436B' }}
                    title={`${r} ${c}: ${v} bookings`}
                  >
                    {on ? v : ''}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-ink-500">
          Fewer
          {RAMP.map((c) => (
            <span key={c} className="h-2.5 w-5 rounded-sm" style={{ background: c }} />
          ))}
          More bookings
        </div>
      </div>
    </div>
  );
}

export function Sparkline({ data, color = '#F2711C', className }: { data: number[]; color?: string; className?: string }) {
  const w = 100;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cx('h-8 w-24', className)} preserveAspectRatio="none">
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={color} opacity=".12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

export function HBars({ items, format = (v) => String(v), color = '#F2711C' }: { items: { label: string; value: number; sub?: string }[]; format?: (v: number) => string; color?: string }) {
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-3.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-semibold text-ink-900">{it.label}</span>
            <span className="shrink-0 font-bold text-ink-950 tnum">
              {format(it.value)} {it.sub && <span className="font-medium text-ink-500">{it.sub}</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-ink-100">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
