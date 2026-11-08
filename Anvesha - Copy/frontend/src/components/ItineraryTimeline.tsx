import { ArrowDown, ArrowUp, Car, Footprints, Hotel, Trash2, CloudRain, Sparkles } from 'lucide-react';
import type { TimelineItem } from '../lib/types';
import { byId } from '../data/experiences';
import { SceneArt } from './SceneArt';
import { Badge } from './ui';
import { clock, cx, dur, inr } from '../lib/format';
import { useRouter } from '../router';

interface Props {
  items: TimelineItem[];
  editable?: boolean;
  onMove?: (id: string, dir: -1 | 1) => void;
  onRemove?: (id: string) => void;
  highlight?: Record<string, 'new' | 'affected' | 'removed'>;
  compact?: boolean;
}

export function ItineraryTimeline({ items, editable, onMove, onRemove, highlight = {}, compact }: Props) {
  const { navigate } = useRouter();
  const activityIds = items.filter((i) => i.kind === 'activity').map((i) => i.expId!);
  return (
    <ol className="relative">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        if (it.kind !== 'activity') {
          const Icon = it.kind === 'return' ? Hotel : it.mode === 'walk' ? Footprints : Car;
          return (
            <li key={i} className="relative grid grid-cols-[64px_28px_1fr] items-center gap-2 sm:grid-cols-[76px_32px_1fr]">
              <span className="text-right text-[12px] font-semibold text-ink-500 tnum">{clock(it.start)}</span>
              <span className="relative flex h-full min-h-[46px] justify-center">
                <span className={cx('absolute top-0 w-px border-l-2 border-dashed border-ink-200', last ? 'h-1/2' : 'h-full')} />
                <span className="relative z-10 mt-auto mb-auto grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white text-ink-500">
                  <Icon size={14} />
                </span>
              </span>
              <div className="flex items-center gap-2 py-2 text-[13px] text-ink-600">
                <span className="font-semibold text-ink-800">{it.label}</span>
                <span className="text-ink-400">·</span>
                <span className="tnum">{it.kind === 'return' ? it.sub?.split(' · ').slice(1).join(' · ') : it.sub}</span>
              </div>
            </li>
          );
        }
        const e = byId(it.expId!);
        const hl = highlight[e.id];
        const idx = activityIds.indexOf(e.id);
        return (
          <li key={i} className="relative grid grid-cols-[64px_28px_1fr] gap-2 sm:grid-cols-[76px_32px_1fr]">
            <div className="pt-4 text-right">
              <div className="text-[13.5px] font-bold text-ink-950 tnum">{clock(it.start)}</div>
              <div className="text-[11.5px] text-ink-500 tnum">{dur(it.end - it.start)}</div>
            </div>
            <span className="relative flex justify-center">
              <span className="absolute top-0 h-full w-0.5 bg-ink-200" />
              <span className={cx('relative z-10 mt-4 grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold text-white ring-4 ring-ink-50', hl === 'affected' ? 'bg-amber-500' : hl === 'removed' ? 'bg-ink-400' : 'bg-ai')}>{idx + 1}</span>
            </span>
            <div className="py-2">
              <div
                className={cx(
                  'flex gap-3 rounded-2xl border bg-white p-2.5 shadow-card transition',
                  hl === 'new' && 'border-leaf-400 ring-4 ring-leaf-100',
                  hl === 'affected' && 'border-amber-300 ring-4 ring-amber-100',
                  hl === 'removed' && 'opacity-50 grayscale',
                  !hl && 'border-transparent',
                )}
              >
                <button onClick={() => navigate(`/exp/${e.id}`)} className={cx('shrink-0 overflow-hidden rounded-xl', compact ? 'h-16 w-16' : 'h-20 w-20 sm:h-24 sm:w-28')} aria-label={`Open ${e.title}`}>
                  <SceneArt image={e.image} alt={e.title} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hl === 'new' && (
                      <Badge tone="green" icon={<Sparkles size={11} />}>
                        New
                      </Badge>
                    )}
                    {hl === 'affected' && (
                      <Badge tone="amber" icon={<CloudRain size={11} />}>
                        Rain at 5 PM
                      </Badge>
                    )}
                    <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">{e.area}</span>
                  </div>
                  <div className={cx('mt-0.5 font-bold leading-snug text-ink-950', compact ? 'text-[14px]' : 'text-[15px]', hl === 'removed' && 'line-through')}>{e.title}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[12.5px] text-ink-600">
                    <span className="tnum">
                      {clock(it.start)} – {clock(it.end)}
                    </span>
                    <span className="font-semibold text-ink-800">{e.price === 0 ? 'Free' : `${inr(e.price)}/person`}</span>
                    {e.indoor ? <span>Indoor</span> : <span>Outdoor</span>}
                  </div>
                </div>
                {editable && (
                  <div className="flex shrink-0 flex-col items-center justify-center gap-1">
                    <button aria-label="Move earlier" disabled={idx === 0} onClick={() => onMove?.(e.id, -1)} className="grid h-7 w-7 place-items-center rounded-lg text-ink-600 hover:bg-ink-100 disabled:opacity-30">
                      <ArrowUp size={15} />
                    </button>
                    <button aria-label="Remove" onClick={() => onRemove?.(e.id)} className="grid h-7 w-7 place-items-center rounded-lg text-red-600 hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
                    <button aria-label="Move later" disabled={idx === activityIds.length - 1} onClick={() => onMove?.(e.id, 1)} className="grid h-7 w-7 place-items-center rounded-lg text-ink-600 hover:bg-ink-100 disabled:opacity-30">
                      <ArrowDown size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
