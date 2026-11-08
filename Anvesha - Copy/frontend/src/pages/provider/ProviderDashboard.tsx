import { CalendarCheck, IndianRupee, Eye, TrendingUp, Sparkles, ArrowRight, ArrowUpRight, Users, BellRing, PlusSquare, Clock } from 'lucide-react';
import { ProviderLayout } from '../../components/Layouts';
import { useApp } from '../../store/AppStore';
import { useRouter } from '../../router';
import { byId } from '../../data/experiences';
import { SERIES, DEMAND_SIGNALS, TODAY_ISO, dayLabel, PROVIDER_EXP_IDS } from '../../data/provider';
import { Sparkline } from '../../components/Charts';
import { Badge, Button } from '../../components/ui';
import { SceneArt } from '../../components/SceneArt';
import { clock, cx, inr } from '../../lib/format';
import type { BookingStatus } from '../../lib/types';

export const STATUS_TONE: Record<BookingStatus, 'green' | 'amber' | 'blue' | 'red'> = { Confirmed: 'green', Pending: 'amber', Completed: 'blue', Cancelled: 'red' };

export default function ProviderDashboard() {
  const { providerBookings, availability, updateBookingStatus, toast } = useApp();
  const { navigate } = useRouter();
  const fresh = providerBookings.filter((b) => b.isNew);
  const today = providerBookings.filter((b) => b.date === TODAY_ISO && b.status !== 'Cancelled').sort((a, b) => a.time - b.time);
  const upcoming = providerBookings.filter((b) => b.date >= TODAY_ISO && b.status !== 'Cancelled' && b.status !== 'Completed').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 6);
  const extraRevenue = fresh.reduce((s, b) => s + b.amount, 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const metrics = [
    { k: 'Bookings', v: String(SERIES.bookings.slice(-7).reduce((a, b) => a + b, 0) + fresh.length), d: '+18%', icon: CalendarCheck, data: SERIES.bookings, color: '#0F9D8A' },
    { k: 'Revenue', v: inr(SERIES.revenue.slice(-7).reduce((a, b) => a + b, 0) + extraRevenue), d: '+24%', icon: IndianRupee, data: SERIES.revenue, color: '#F2711C' },
    { k: 'Views', v: SERIES.views.slice(-7).reduce((a, b) => a + b, 0).toLocaleString('en-IN'), d: '+11%', icon: Eye, data: SERIES.views, color: '#4E6BD6' },
    { k: 'Conversion', v: '3.4%', d: '+0.6 pt', icon: TrendingUp, data: SERIES.bookings.map((b, i) => b / SERIES.views[i]), color: '#C22463' },
  ];

  const seatsToday = PROVIDER_EXP_IDS.flatMap((id) => (availability[id]?.[TODAY_ISO] ?? []).map((s) => ({ id, ...s }))).sort((a, b) => a.time - b.time);

  return (
    <ProviderLayout
      title="Dashboard"
      actions={
        <Button size="sm" icon={<PlusSquare size={15} />} onClick={() => navigate('/provider/create')} className="hidden sm:inline-flex">
          New experience
        </Button>
      }
    >
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">{greeting}, Raj 👋</h2>
        <p className="text-[14.5px] text-ink-600">
          Pune Heritage Walks · {dayLabel(TODAY_ISO, { weekday: 'long', day: 'numeric', month: 'long' })} · {today.length} groups today
        </p>
      </div>

      {fresh.length > 0 && (
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-leaf-200 bg-leaf-50 p-4 animate-fade-up sm:flex-row sm:items-center">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-leaf-500 text-white">
            <BellRing size={22} />
            <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-leaf-50 bg-rani-500" />
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-ink-950">
              New booking from {fresh[0].customer} · {fresh[0].adults + fresh[0].children} guests
            </div>
            <div className="text-[13px] text-ink-700">
              {fresh.map((b) => `${byId(b.expId).title} at ${clock(b.time)}`).join(' + ')} · booked via a Anvesha AI itinerary · {inr(extraRevenue)}
            </div>
          </div>
          <div className="flex gap-2">
            {fresh.some((b) => b.status === 'Pending') && (
              <Button
                size="sm"
                variant="dark"
                onClick={() => {
                  fresh.forEach((b) => updateBookingStatus(b.id, 'Confirmed'));
                  toast({ title: 'Booking confirmed', body: 'Traveler notified by SMS & app', tone: 'success' });
                }}
              >
                Confirm
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate('/provider/bookings')}>
              View booking
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.k} className="rounded-3xl bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-600">
                <m.icon size={16} style={{ color: m.color }} />
                {m.k}
              </span>
              <span className="hidden text-[11px] text-ink-400 sm:inline">7 days</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <div className="font-display text-[24px] font-bold text-ink-950 tnum sm:text-[28px]">{m.v}</div>
                <div className="inline-flex items-center gap-0.5 text-[12px] font-bold text-leaf-600">
                  <ArrowUpRight size={13} /> {m.d}
                </div>
              </div>
              <Sparkline data={m.data} color={m.color} className="hidden sm:block" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="text-[17px] font-bold">Upcoming bookings</h3>
              <button onClick={() => navigate('/provider/bookings')} className="inline-flex items-center gap-1 text-[13px] font-bold text-brand-700">
                All bookings <ArrowRight size={14} />
              </button>
            </div>
            <ul className="divide-y divide-ink-100">
              {upcoming.map((b) => (
                <li key={b.id} className={cx('flex items-center gap-3 px-5 py-3.5', b.isNew && 'bg-leaf-50/60')}>
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl">
                    <SceneArt image={byId(b.expId)?.image} alt={byId(b.expId)?.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-bold text-ink-950">{b.customer}</span>
                      {b.isNew && <Badge tone="green">New</Badge>}
                    </div>
                    <div className="truncate text-[12.5px] text-ink-500">
                      {byId(b.expId).title} · {b.adults + b.children} guests · {b.travelerType}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-[13.5px] font-bold text-ink-950 tnum">{clock(b.time)}</div>
                    <div className="text-[12px] text-ink-500">{b.date === TODAY_ISO ? 'Today' : dayLabel(b.date)}</div>
                  </div>
                  <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-bold">Today’s slots</h3>
              <button onClick={() => navigate('/provider/availability')} className="text-[13px] font-bold text-brand-700">
                Manage availability →
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {seatsToday.map((s) => {
                const pct = s.booked / s.capacity;
                return (
                  <div key={s.id + s.time} className={cx('rounded-2xl border p-3.5', s.enabled ? 'border-ink-100' : 'border-dashed border-ink-200 opacity-60')}>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[16px] font-bold tnum">{clock(s.time)}</span>
                      <span className={cx('text-[12px] font-bold tnum', pct >= 0.85 ? 'text-rani-600' : 'text-ink-600')}>
                        {s.booked}/{s.capacity} booked
                      </span>
                    </div>
                    <div className="truncate text-[12.5px] text-ink-500">{byId(s.id).title}</div>
                    <div className="mt-2 h-2 rounded-full bg-ink-100">
                      <div className={cx('h-full rounded-full', pct >= 0.85 ? 'bg-rani-500' : 'bg-leaf-500')} style={{ width: `${pct * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-3xl bg-ink-950 text-white shadow-card">
            <div className="flex items-center gap-2 px-5 pt-5 text-[12px] font-bold uppercase tracking-wider text-brand-300">
              <Sparkles size={14} /> AI Insights
            </div>
            <div className="space-y-3 p-5">
              <div className="rounded-2xl bg-white/5 p-4">
                <Users size={18} className="text-brand-300" />
                <p className="mt-2 text-[14.5px] leading-snug">Travelers are currently searching for family-friendly cultural experiences.</p>
                <div className="mt-1 text-[12px] text-white/50">38% of searches near Kasba Peth today</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <TrendingUp size={18} className="text-leaf-400" />
                <p className="mt-2 text-[14.5px] leading-snug">Demand for experiences under ₹1,000 is increasing.</p>
                <div className="mt-1 text-[12px] text-white/50">+31% week over week</div>
              </div>
              <div className="rounded-2xl bg-ai p-4">
                <div className="text-[11.5px] font-bold uppercase tracking-wider text-white/80">Suggested action</div>
                <p className="mt-1 text-[16px] font-bold leading-snug">Create a 2-hour family package.</p>
                <p className="mt-1 text-[12.5px] text-white/85">Heritage story + food tasting, ~₹900/adult, kids ₹500. Est. +14 bookings/week.</p>
                <button onClick={() => navigate('/provider/create?template=family')} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-bold text-ink-950">
                  Create package <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-card">
            <h3 className="text-[16px] font-bold">Live traveler demand · Pune</h3>
            <p className="text-[12.5px] text-ink-500">What travelers near you asked Anvesha AI in the last 24h</p>
            <ul className="mt-4 space-y-3">
              {DEMAND_SIGNALS.map((d) => (
                <li key={d.label}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="font-semibold text-ink-800">{d.label}</span>
                    <span className="font-bold text-ink-950 tnum">
                      {d.share}% <span className="text-leaf-600">↑{d.trend}%</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${d.share * 2.2}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-ink-50 px-3 py-2.5 text-[12.5px] text-ink-700">
              <Clock size={14} /> Rain from 5 PM: indoor searches up 64%
            </div>
          </section>
        </aside>
      </div>
    </ProviderLayout>
  );
}
