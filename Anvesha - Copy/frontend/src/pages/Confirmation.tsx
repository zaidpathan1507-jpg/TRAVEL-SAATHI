import { useEffect, useState, type ReactElement } from 'react';
import { Check, CalendarPlus, Navigation, Store, Loader2, CheckCircle2, Share2 } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { byId } from '../data/experiences';
import { SceneArt } from '../components/SceneArt';
import { Button, Empty } from '../components/ui';
import { clock, inr } from '../lib/format';
import { dayLabel } from '../data/provider';

function QR({ seed }: { seed: string }) {
  const n = 25;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100) / 100;
  };
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    for (const [ox, oy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ]) {
      if (inBox(ox, oy)) {
        const dx = x - ox;
        const dy = y - oy;
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
      }
    }
    return -1;
  };
  const cells: ReactElement[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      const on = f === -1 ? rnd() > 0.52 : f === 1;
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0B1433" />);
    }
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="h-36 w-36" role="img" aria-label="Booking QR code">
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill="#fff" />
      {cells}
    </svg>
  );
}

export default function Confirmation() {
  const { travelerBookings, toast } = useApp();
  const { navigate } = useRouter();
  const b = travelerBookings[0];
  const [notified, setNotified] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setNotified(true), 1600);
    return () => clearTimeout(t);
  }, []);

  if (!b) return <Empty icon={<Check />} title="No booking yet" body="Complete a booking to see your confirmation." action={<Button onClick={() => navigate('/itinerary')}>Go to itinerary</Button>} />;
  const hosts = Array.from(new Set(b.expIds.map((id) => byId(id).provider.host)));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-[32px] bg-ink-950 px-6 pb-8 pt-10 text-center text-white">
        {Array.from({ length: 26 }, (_, i) => (
          <span key={i} className="absolute h-2 w-2 rounded-sm animate-fade-up" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 70}%`, background: ['#F2711C', '#E0397B', '#FFD166', '#12A383'][i % 4], transform: `rotate(${i * 30}deg)`, animationDelay: `${(i % 8) * 60}ms`, opacity: 0.8 }} />
        ))}
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-500 animate-pop">
          <Check size={40} strokeWidth={3} />
        </div>
        <h1 className="relative mt-5 text-[30px] font-extrabold text-white sm:text-[36px]">You’re all set, Ananya!</h1>
        <p className="relative mt-2 text-[15px] text-white/70">
          Booking {b.id} · {dayLabel(b.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {b.adults + b.children} guests
        </p>
      </div>

      <div className="-mt-5 grid gap-5 px-2 sm:grid-cols-[1fr_200px] sm:px-6">
        <div className="card relative p-5">
          <div className="eyebrow mb-3">Your plan</div>
          <div className="space-y-3">
            {b.expIds.map((id, i) => {
              const e = byId(id);
              return (
                <div key={id} className="flex items-center gap-3">
                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl">
                    <SceneArt image={e.image} alt={e.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-bold text-ink-950">{e.title}</div>
                    <div className="text-[12.5px] text-ink-500">
                      {clock(b.times[i])} · {e.area}
                    </div>
                  </div>
                  <CheckCircle2 size={18} className="text-leaf-500" />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-ink-100 pt-4">
            <span className="text-[13.5px] text-ink-600">
              {b.payment === 'razorpay' ? 'Paid online with Razorpay' : `Paid via ${b.payment === 'upi' ? 'UPI' : b.payment === 'card' ? 'card' : 'pay later'}`}
              {b.paymentId && <span className="block text-[11.5px] text-ink-500">Payment id {b.paymentId}</span>}
            </span>
            <span className="font-display text-[22px] font-bold text-ink-950 tnum">{inr(b.total)}</span>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
            {notified ? <CheckCircle2 size={20} className="shrink-0 text-leaf-500" /> : <Loader2 size={20} className="shrink-0 animate-spin text-brand-500" />}
            <div className="text-[13px] text-ink-700">{notified ? <><b>{hosts.join(' & ')}</b> confirmed your seats and will meet you at the start point.</> : <>Notifying {hosts.join(' & ')}…</>}</div>
          </div>
        </div>
        <div className="card flex flex-col items-center justify-center p-5 text-center">
          <QR seed={b.id} />
          <div className="mt-2 text-[12px] font-semibold text-ink-500">Show at check-in</div>
          <div className="font-mono text-[13px] font-bold text-ink-950">{b.id}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2 px-2">
        <Button size="lg" icon={<Navigation size={17} />} onClick={() => navigate('/live')}>
          Start live trip
        </Button>
        <Button size="lg" variant="outline" icon={<CalendarPlus size={17} />} onClick={() => toast({ title: 'Added to calendar', body: `${b.expIds.length} events with reminders 30 min before`, tone: 'success' })}>
          Add to calendar
        </Button>
        <Button size="lg" variant="outline" icon={<Share2 size={17} />} onClick={() => toast({ title: 'Plan shared', body: 'Your family can see the live itinerary', tone: 'success' })}>
          Share plan
        </Button>
      </div>
      <button onClick={() => navigate('/provider')} className="mx-auto mt-6 flex items-center gap-2 rounded-full bg-ai-soft px-4 py-2.5 text-[13.5px] font-bold text-rani-600">
        <Store size={16} /> Demo: see this booking on the provider dashboard →
      </button>
    </div>
  );
}
