import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, CloudRain } from 'lucide-react';
import { ProviderLayout } from '../../components/Layouts';
import { AvailabilityCalendar } from '../../components/AvailabilityCalendar';
import { useApp } from '../../store/AppStore';
import { PROVIDER_EXP_IDS, TODAY, addDays, isoDate, dayLabel } from '../../data/provider';
import { byId } from '../../data/experiences';
import { Chip } from '../../components/ui';

export default function Availability() {
  const { availability } = useApp();
  const [expId, setExpId] = useState(PROVIDER_EXP_IDS[0]);
  const [week, setWeek] = useState(0);
  const days = Array.from({ length: 7 }, (_, i) => isoDate(addDays(TODAY, week * 7 + i)));
  const slots = days.flatMap((d) => availability[expId]?.[d] ?? []);
  const open = slots.filter((s) => s.enabled);
  const booked = open.reduce((s, x) => s + x.booked, 0);
  const cap = open.reduce((s, x) => s + x.capacity, 0);

  return (
    <ProviderLayout title="Availability">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {PROVIDER_EXP_IDS.map((id) => (
            <Chip key={id} active={expId === id} onClick={() => setExpId(id)}>
              {byId(id).title}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Previous week" disabled={week === 0} onClick={() => setWeek(week - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40">
            <ChevronLeft size={17} />
          </button>
          <span className="min-w-[150px] text-center text-[14px] font-bold text-ink-900">
            {dayLabel(days[0], { day: 'numeric', month: 'short' })} – {dayLabel(days[6], { day: 'numeric', month: 'short' })}
          </span>
          <button aria-label="Next week" disabled={week === 1} onClick={() => setWeek(week + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Open slots', String(open.length)],
          ['Seats booked', String(booked)],
          ['Capacity', String(cap)],
          ['Occupancy', `${cap ? Math.round((booked / cap) * 100) : 0}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="text-[12px] font-semibold text-ink-500">{k}</div>
            <div className="font-display text-[24px] font-bold text-ink-950 tnum">{v}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-2 rounded-3xl bg-ai-soft p-4 text-[13.5px] text-ink-800 sm:flex-row sm:items-center">
        <Sparkles size={17} className="shrink-0 text-rani-500" />
        <span className="flex-1">
          Saturday 5:30 PM is almost full and 11 travelers searched for it. <b>Add a 6:30 PM slot?</b>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-600">
          <CloudRain size={14} /> Rain today 5–7 PM may lower outdoor turnout
        </span>
      </div>

      <AvailabilityCalendar expId={expId} weekOffset={week} />

      <div className="mt-6 flex flex-wrap gap-4 text-[12px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-leaf-500" /> Plenty of seats
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-brand-500" /> Half full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-rani-500" /> Almost full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border-2 border-dashed border-ink-300" /> Closed
        </span>
      </div>
    </ProviderLayout>
  );
}
