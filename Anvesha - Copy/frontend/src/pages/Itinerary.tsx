import { useMemo, useState } from 'react';
import { Sparkles, Wallet, Timer, Route, CloudRain, Hourglass, Plus, Pencil, Check, CalendarRange, Map as MapIcon, ArrowRight, History } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { buildPlan, planChecks, recommend, groupSize, RAIN_AT, rainAffected } from '../lib/engine';
import { ItineraryTimeline } from '../components/ItineraryTimeline';
import { useStopWeather, weatherIcon, isWet } from '../lib/weather';
import { MapView } from '../components/MapView';
import { Button, Check as CheckRow, Empty, Badge } from '../components/ui';
import { clock, dur, inr, km } from '../lib/format';
import { EXPERIENCES, byId } from '../data/experiences';
import { TODAY_ISO, dayLabel } from '../data/provider';

export const hoursTitle = (m: number) => (m % 60 === 0 ? `${m / 60}-Hour` : m < 60 ? `${m}-Minute` : `${dur(m)}`);

export default function Itinerary() {
  const { trip, planIds, removeFromPlan, movePlan, addToPlan, startCheckout, adaptLog, setTrip } = useApp();
  const { navigate } = useRouter();
  const [editing, setEditing] = useState(false);
  const plan = useMemo(() => buildPlan(planIds, trip), [planIds, trip]);
  const checks = planChecks(plan, planIds, trip);
  const affected = trip.weather === 'rain' ? rainAffected(planIds, trip) : [];
  const highlight = Object.fromEntries(affected.map((a) => [a, 'affected' as const]));
  const weather = useStopWeather(plan.items);
  // Live places (Google Places) can be planned and mapped, but only catalog experiences can be booked
  const bookableIds = planIds.filter((id) => EXPERIENCES.some((e) => e.id === id));
  const book = () => {
    startCheckout(bookableIds);
    navigate('/booking');
  };
  const bookLabel = bookableIds.length === planIds.length ? 'Book All' : bookableIds.length ? `Book ${bookableIds.length} bookable` : 'Booking not available';

  if (!planIds.length) {
    const top = recommend(trip)[0];
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <Empty
          icon={<CalendarRange />}
          title="No plan yet"
          body={`Pick one experience you love and Travel Saathi AI will build a timed ${dur(trip.minutes)} plan around it, with travel, budget and slots checked.`}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="ai" icon={<Sparkles size={16} />} onClick={() => addToPlan(top.exp.id)}>
                Plan around {top.exp.title.split(' ').slice(0, 3).join(' ')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/results')}>
                Browse experiences
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge tone="ai" icon={<Sparkles size={12} />}>
            AI-generated itinerary
          </Badge>
          <h1 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">
            <span className="text-ai">✨</span> Your {hoursTitle(trip.minutes)} Local Experience
          </h1>
          <p className="mt-1 text-[14.5px] text-ink-600">
            {dayLabel(TODAY_ISO, { weekday: 'long', day: 'numeric', month: 'long' })} · {clock(trip.startMin)} – {clock(plan.endMin)} · from your hotel in Deccan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={editing ? 'dark' : 'outline'} icon={editing ? <Check size={16} /> : <Pencil size={15} />} onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit Plan'}
          </Button>
          <Button disabled={!bookableIds.length} onClick={book}>
            {bookLabel}
          </Button>
        </div>
      </div>

      {affected.length > 0 && (
        <button onClick={() => navigate('/adapt')} className="mb-5 flex w-full items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-left">
          <CloudRain className="shrink-0 text-amber-600" />
          <div className="flex-1 text-[14px] text-amber-900">
            <b>Rain expected at {clock(RAIN_AT)}.</b> One outdoor stop is affected. See AI alternatives.
          </div>
          <ArrowRight size={18} className="text-amber-700" />
        </button>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card p-3 sm:p-5">
          <ItineraryTimeline items={plan.items} editable={editing} onMove={movePlan} onRemove={removeFromPlan} highlight={highlight} />
          {editing && (
            <button onClick={() => navigate('/results')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 py-4 text-[14px] font-bold text-ink-600 hover:border-brand-300 hover:text-brand-700">
              <Plus size={17} /> Add another experience
            </button>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-ink-100 border-b border-ink-100">
              {[
                { icon: Wallet, v: inr(plan.perPerson), k: 'per person' },
                { icon: Timer, v: dur(plan.totalMin), k: 'total time' },
                { icon: Route, v: km(plan.travelKm), k: 'travel' },
              ].map((s) => (
                <div key={s.k} className="px-3 py-4 text-center">
                  <s.icon size={17} className="mx-auto text-brand-500" />
                  <div className="mt-1.5 font-display text-[19px] font-bold text-ink-950 tnum">{s.v}</div>
                  <div className="text-[11.5px] text-ink-500">{s.k}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2 p-5">
              {checks.map((c) => (
                <CheckRow key={c.text} ok={c.ok}>
                  {c.text}
                  {c.text === 'Within budget' && <span className="text-ink-500"> · {inr(plan.groupCost)} for {groupSize(trip)}</span>}
                  {c.text === 'Within available time' && <span className="text-ink-500"> · {dur(Math.max(0, trip.minutes - plan.totalMin))} spare</span>}
                </CheckRow>
              ))}
              <CheckRow ok={bookableIds.length === planIds.length}>
                {bookableIds.length === planIds.length ? `All ${planIds.length} slots available right now` : `${bookableIds.length} of ${planIds.length} stops can be booked on Travel Saathi`}
              </CheckRow>
            </div>
            <div className="flex gap-2 border-t border-ink-100 p-4">
              <Button full disabled={!bookableIds.length} onClick={book}>
                {bookLabel}
                {bookableIds.length === planIds.length ? ` · ${inr(plan.groupCost)}` : ''}
              </Button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <MapView experiences={planIds.map((id) => byId(id)).filter(Boolean)} route={planIds} className="h-[220px]" controls={false} initialZoom={3} focus={{ x: 43, y: 52 }} />
            <button onClick={() => navigate('/map')} className="flex w-full items-center justify-between px-4 py-3 text-[13.5px] font-bold text-ink-900 hover:bg-ink-50">
              <span className="inline-flex items-center gap-2">
                <MapIcon size={16} /> View route on map
              </span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="card p-5">
            <div className="eyebrow mb-3">Plans change. Travel Saathi adapts.</div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setTrip({ weather: 'rain' });
                  navigate('/adapt');
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-ink-50 p-3 text-left hover:bg-sky2-50"
              >
                {weather.status === 'ok' ? (
                  <>
                    {(() => {
                      const Icon = weatherIcon(weather.stops.find(isWet)?.type ?? weather.stops[0].type, weather.stops.find(isWet)?.isDaytime ?? weather.stops[0].isDaytime);
                      return (
                        <span className={`grid h-10 w-10 shrink-0 place-items-center self-start rounded-xl ${weather.stops.some(isWet) ? 'bg-amber-100 text-amber-700' : 'bg-sky2-100 text-sky2-600'}`}>
                          <Icon size={19} />
                        </span>
                      );
                    })()}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold text-ink-950">Weather at your stops</span>
                      <span className="block text-[11.5px] text-ink-500">Right now · updated {weather.asOf.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                      <span className="mt-1.5 block space-y-1">
                        {weather.stops.map((w) => (
                          <span key={w.id} className={`flex items-baseline justify-between gap-2 text-[12.5px] ${isWet(w) ? 'font-semibold text-amber-800' : 'text-ink-700'}`}>
                            <span className="truncate">{w.name}</span>
                            <span className="shrink-0 tnum">
                              {w.tempC != null ? `${Math.round(w.tempC)}°` : '–'} · {w.condition}
                              {w.rainChance != null ? ` · ${Math.round(w.rainChance)}% rain` : ''}
                            </span>
                          </span>
                        ))}
                      </span>
                      <span className="mt-1.5 block text-[11.5px] text-ink-400">Tap to simulate rain at 5 PM</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky2-100 text-sky2-600">
                      <CloudRain size={19} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[14px] font-bold text-ink-950">Simulate: rain at 5 PM</span>
                      <span className="block text-[12px] text-ink-500">{weather.status === 'loading' ? 'Loading live weather…' : 'Live weather unavailable · weather feed update'}</span>
                    </span>
                  </>
                )}
                <ArrowRight size={16} className="text-ink-400" />
              </button>
              <button onClick={() => navigate('/adapt?time')} className="flex w-full items-center gap-3 rounded-2xl bg-ink-50 p-3 text-left hover:bg-brand-50">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-600">
                  <Hourglass size={19} />
                </span>
                <span className="flex-1">
                  <span className="block text-[14px] font-bold text-ink-950">Simulate: only 90 minutes left</span>
                  <span className="block text-[12px] text-ink-500">Schedule change</span>
                </span>
                <ArrowRight size={16} className="text-ink-400" />
              </button>
            </div>
            {adaptLog.length > 0 && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-ink-500">
                  <History size={13} /> Plan history
                </div>
                <ul className="space-y-1.5">
                  {adaptLog.slice(0, 4).map((l, i) => (
                    <li key={i} className="text-[12.5px] text-ink-700">
                      • {l.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </aside>
      </div>
    </div>
  );
}
