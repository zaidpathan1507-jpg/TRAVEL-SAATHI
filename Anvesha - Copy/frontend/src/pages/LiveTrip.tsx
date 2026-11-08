import { useEffect, useMemo, useState } from 'react';
import { Navigation, MessageCircle, Clock, MapPin, Timer, Umbrella, Phone, AlarmClock, Check, Sparkles, CloudSun, CloudRain } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { buildPlan, composePlan } from '../lib/engine';
import { byId } from '../data/experiences';
import { MapView } from '../components/MapView';
import { Button, Badge } from '../components/ui';
import { distKm, travelMin, type Pt } from '../lib/geo';
import { clock, cx, dur, km } from '../lib/format';
import { SceneArt } from '../components/SceneArt';

const CURRENT: Pt = { x: 41, y: 55 };

export default function LiveTrip() {
  const { planIds, trip, setChatOpen, toast } = useApp();
  const { navigate } = useRouter();
  const ids = useMemo(() => (planIds.length ? planIds : composePlan('pune-food-walk', trip)), [planIds, trip]);
  const plan = buildPlan(ids, trip);
  const next = byId(ids[0]);
  const d = distKm(CURRENT, next);
  const [secs, setSecs] = useState(18 * 60);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  const leaveIn = Math.max(0, mm - travelMin(d));

  const stops = [{ label: 'Hotel', done: true, time: trip.startMin }, ...plan.items.filter((i) => i.kind === 'activity').map((i, k) => ({ label: byId(i.expId!).title, done: false, time: i.start, next: k === 0 })), { label: 'Back to hotel', done: false, time: plan.endMin }];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Badge tone="green" icon={<span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />}>
            Live trip
          </Badge>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight sm:text-[32px]">On your way, Ananya</h1>
        </div>
        <div className="text-right">
          <div className="font-display text-[22px] font-bold text-ink-950 tnum">{dur(Math.max(0, plan.endMin - trip.startMin - 7))}</div>
          <div className="text-[12px] text-ink-500">left in your plan</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="relative h-[46vh] min-h-[320px] overflow-hidden rounded-[28px] shadow-card lg:h-[560px]">
          <MapView experiences={ids.map(byId)} route={ids} current={CURRENT} className="h-full" initialZoom={3} focus={{ x: 43, y: 52 }} rain={trip.weather === 'rain'} />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-[12.5px] font-semibold text-ink-800 shadow-card">
            {trip.weather === 'rain' ? <CloudRain size={16} className="text-sky2-500" /> : <CloudSun size={16} className="text-brand-500" />}
            {trip.weather === 'rain' ? 'Rain from 5 PM — carry an umbrella' : '29° · clear for the next hour'}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="relative h-28">
              <SceneArt image={next.image} alt={next.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-white/75">Next</div>
                <div className="text-[18px] font-bold leading-tight">{next.title}</div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-brand-50 py-3">
                  <div className="font-display text-[22px] font-bold text-brand-700 tnum">
                    {mm}:{ss}
                  </div>
                  <div className="text-[11.5px] font-semibold text-brand-700/80">starts in</div>
                </div>
                <div className="rounded-2xl bg-ink-50 py-3">
                  <div className="font-display text-[22px] font-bold text-ink-950 tnum">{km(d)}</div>
                  <div className="text-[11.5px] font-semibold text-ink-500">away</div>
                </div>
                <div className="rounded-2xl bg-ink-50 py-3">
                  <div className="font-display text-[22px] font-bold text-ink-950 tnum">{travelMin(d)}m</div>
                  <div className="text-[11.5px] font-semibold text-ink-500">by auto</div>
                </div>
              </div>
              <div className={cx('mt-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-semibold', leaveIn <= 2 ? 'bg-amber-50 text-amber-800' : 'bg-leaf-50 text-leaf-700')}>
                <AlarmClock size={16} /> {leaveIn <= 0 ? 'Leave now to arrive on time' : `Leave in ${leaveIn} min to arrive on time`}
              </div>
              <div className="mt-3 text-[13px] text-ink-600">
                <MapPin size={14} className="mr-1 inline text-ink-400" />
                Meet {next.provider.host} at {next.address}. Look for the orange Travel Saathi umbrella.
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(next.address + ', Pune')}&travelmode=driving`} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-500 text-[14px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(242,113,28,.7)]">
                  <Navigation size={17} /> Get Directions
                </a>
                <Button size="lg" variant="ai" icon={<MessageCircle size={17} />} onClick={() => setChatOpen(true)}>
                  Ask AI
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" icon={<Clock size={15} />} onClick={() => toast({ title: `${next.provider.host} notified`, body: 'You’re running ~10 min late. Your slot is held.', tone: 'success' })}>
                  Running late
                </Button>
                <Button size="sm" variant="secondary" icon={<Phone size={15} />} onClick={() => toast({ title: 'Host number', body: '+91 98220 41xxx (masked for privacy)', tone: 'info' })}>
                  Call host
                </Button>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">Today’s route</span>
              <button onClick={() => navigate('/itinerary')} className="text-[12.5px] font-bold text-brand-700">
                Full plan
              </button>
            </div>
            <ol className="relative space-y-3">
              {stops.map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold', s.done ? 'bg-leaf-500 text-white' : 'next' in s && s.next ? 'bg-ai text-white ring-4 ring-brand-100' : 'bg-ink-100 text-ink-500')}>{s.done ? <Check size={14} strokeWidth={3} /> : i}</span>
                  <span className={cx('flex-1 truncate text-[13.5px]', 'next' in s && s.next ? 'font-bold text-ink-950' : s.done ? 'text-ink-400 line-through' : 'font-medium text-ink-700')}>{s.label}</span>
                  <span className="text-[12px] text-ink-500 tnum">{clock(s.time)}</span>
                </li>
              ))}
            </ol>
          </div>

          <button onClick={() => setChatOpen(true)} className="flex w-full items-start gap-3 rounded-3xl bg-ai-soft p-4 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ai text-white">
              <Sparkles size={16} />
            </span>
            <span className="text-[13.5px] leading-snug text-ink-800">
              <b>Tip from Travel Saathi AI:</b> {trip.weather === 'rain' ? 'Rain starts at 5. I’ve kept your later stop indoors.' : 'Leave a little room: the food walk’s mastani stop is the biggest serving of the evening.'}{' '}
              <Umbrella size={13} className="inline text-rani-500" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
