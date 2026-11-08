import { useState } from 'react';
import { Minus, Plus, CalendarPlus } from 'lucide-react';
import { useApp, type PSlot } from '../store/AppStore';
import { TODAY, addDays, isoDate, dayLabel, TODAY_ISO } from '../data/provider';
import { clock, cx } from '../lib/format';

const EXTRA_TIMES = [10 * 60, 12 * 60, 19 * 60 + 30, 8 * 60];

export function AvailabilityCalendar({ expId, weekOffset }: { expId: string; weekOffset: number }) {
  const { availability, toggleSlot, setCapacity, addSlot, toast } = useApp();
  const days = Array.from({ length: 7 }, (_, i) => isoDate(addDays(TODAY, weekOffset * 7 + i)));
  const [mobileDay, setMobileDay] = useState(days[0]);
  const activeMobile = days.includes(mobileDay) ? mobileDay : days[0];

  const add = (d: string) => {
    const existing = (availability[expId]?.[d] ?? []).map((s) => s.time);
    const t = EXTRA_TIMES.find((x) => !existing.includes(x));
    if (t === undefined) return;
    addSlot(expId, d, t, 12);
    toast({ title: 'Slot added', body: `${dayLabel(d)} at ${clock(t)} · live for travelers now`, tone: 'success' });
  };

  const DayColumn = ({ d }: { d: string }) => {
    const slots = availability[expId]?.[d] ?? [];
    const booked = slots.reduce((s, x) => s + x.booked, 0);
    const cap = slots.filter((s) => s.enabled).reduce((s, x) => s + x.capacity, 0);
    const isToday = d === TODAY_ISO;
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className={cx('rounded-2xl px-3 py-2.5 text-center', isToday ? 'bg-ink-950 text-white' : 'bg-white shadow-sm')}>
          <div className={cx('text-[11px] font-bold uppercase tracking-wider', isToday ? 'text-brand-300' : 'text-ink-500')}>{isToday ? 'Today' : dayLabel(d, { weekday: 'short' })}</div>
          <div className="font-display text-[18px] font-bold">{dayLabel(d, { day: 'numeric', month: 'short' })}</div>
          <div className={cx('text-[11px] tnum', isToday ? 'text-white/60' : 'text-ink-500')}>
            {booked}/{cap} seats
          </div>
        </div>
        {slots.map((s) => (
          <SlotCard key={s.time} s={s} onToggle={() => toggleSlot(expId, d, s.time)} onCap={(c) => setCapacity(expId, d, s.time, c)} />
        ))}
        <button onClick={() => add(d)} className="flex h-10 items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-200 text-[12.5px] font-bold text-ink-500 hover:border-brand-300 hover:text-brand-600">
          <Plus size={14} /> Add slot
        </button>
      </div>
    );
  };

  return (
    <>
      {/* desktop week grid */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-7">
        {days.map((d) => (
          <DayColumn key={d} d={d} />
        ))}
      </div>
      {/* mobile: day picker + list */}
      <div className="lg:hidden">
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {days.map((d) => {
            const slots = availability[expId]?.[d] ?? [];
            const full = slots.every((s) => s.booked >= s.capacity || !s.enabled);
            return (
              <button key={d} onClick={() => setMobileDay(d)} className={cx('w-16 shrink-0 rounded-2xl py-2.5 text-center', activeMobile === d ? 'bg-ink-950 text-white' : 'bg-white shadow-sm')}>
                <div className="text-[11px] font-bold uppercase">{d === TODAY_ISO ? 'Today' : dayLabel(d, { weekday: 'short' })}</div>
                <div className="font-display text-[18px] font-bold">{dayLabel(d, { day: 'numeric' })}</div>
                <span className={cx('mx-auto mt-1 block h-1.5 w-1.5 rounded-full', full ? 'bg-rani-500' : 'bg-leaf-500')} />
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(availability[expId]?.[activeMobile] ?? []).map((s) => (
            <SlotCard key={s.time} s={s} onToggle={() => toggleSlot(expId, activeMobile, s.time)} onCap={(c) => setCapacity(expId, activeMobile, s.time, c)} />
          ))}
          <button onClick={() => add(activeMobile)} className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 text-[13px] font-bold text-ink-500">
            <CalendarPlus size={16} /> Add slot on {dayLabel(activeMobile)}
          </button>
        </div>
      </div>
    </>
  );
}

function SlotCard({ s, onToggle, onCap }: { s: PSlot; onToggle: () => void; onCap: (c: number) => void }) {
  const left = s.capacity - s.booked;
  const pct = s.booked / s.capacity;
  return (
    <div className={cx('rounded-2xl p-3 transition', s.enabled ? 'bg-white shadow-card' : 'border-2 border-dashed border-ink-200 bg-transparent')}>
      <div className="flex items-center justify-between gap-2">
        <span className={cx('font-display text-[15px] font-bold tnum', !s.enabled && 'text-ink-400 line-through')}>{clock(s.time)}</span>
        <button role="switch" aria-checked={s.enabled} aria-label={s.enabled ? 'Close slot' : 'Open slot'} onClick={onToggle} className={cx('relative h-5 w-9 shrink-0 rounded-full transition', s.enabled ? 'bg-leaf-500' : 'bg-ink-200')}>
          <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition', s.enabled ? 'left-[18px]' : 'left-0.5')} />
        </button>
      </div>
      {s.enabled ? (
        <>
          <div className="mt-2 h-1.5 rounded-full bg-ink-100">
            <div className={cx('h-full rounded-full', pct >= 0.85 ? 'bg-rani-500' : pct >= 0.5 ? 'bg-brand-500' : 'bg-leaf-500')} style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
            <span className="font-semibold text-ink-700 tnum">
              {s.booked} booked
            </span>
            <span className={cx('font-semibold tnum', left <= 2 ? 'text-rani-600' : 'text-ink-500')}>{left === 0 ? 'Full' : `${left} left`}</span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-ink-50 px-1 py-1">
            <button aria-label="Decrease capacity" onClick={() => onCap(s.capacity - 1)} className="grid h-6 w-6 place-items-center rounded-lg text-ink-600 hover:bg-white">
              <Minus size={13} />
            </button>
            <span className="text-[11.5px] font-bold text-ink-700 tnum">cap {s.capacity}</span>
            <button aria-label="Increase capacity" onClick={() => onCap(s.capacity + 1)} className="grid h-6 w-6 place-items-center rounded-lg text-ink-600 hover:bg-white">
              <Plus size={13} />
            </button>
          </div>
        </>
      ) : (
        <div className="mt-1 text-[11.5px] font-semibold text-ink-400">Closed · hidden from travelers</div>
      )}
    </div>
  );
}
