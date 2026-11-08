import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CloudRain, Sun, Cloud, Hourglass, Sparkles, CheckCircle2, ArrowRight, Radio, Car, CalendarCheck, MapPin, Clock, IndianRupee, Timer } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { buildPlan, composePlan, compressPlan, rainAffected, rainAlternatives, RAIN_AT } from '../lib/engine';
import { byId } from '../data/experiences';
import { ItineraryTimeline } from '../components/ItineraryTimeline';
import { SceneArt } from '../components/SceneArt';
import { Button, Check, MatchBadge, Segmented, Badge } from '../components/ui';
import { distKm } from '../lib/geo';
import { clock, cx, dur, inr, km } from '../lib/format';

export default function Adapt() {
  const { path, navigate } = useRouter();
  const { trip, setTrip, planIds, setPlanIds, logAdapt, toast, startCheckout } = useApp();
  const [tab, setTab] = useState<'rain' | 'time'>(path.includes('?time') ? 'time' : 'rain');
  const [replaced, setReplaced] = useState<{ from: string; to: string } | null>(null);
  const [applied, setApplied] = useState<null | { saved: number; removed: string[]; added: string[] }>(null);

  // make the demo robust: ensure a plan exists and rain is on for the weather scenario
  useEffect(() => {
    if (!planIds.length) setPlanIds(composePlan('pune-food-walk', trip));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (tab === 'rain' && trip.weather !== 'rain') setTrip({ weather: 'rain' });
  }, [tab, trip.weather, setTrip]);

  const rainTrip = { ...trip, weather: 'rain' as const };
  const affected = useMemo(() => rainAffected(planIds, rainTrip), [planIds, trip]); // eslint-disable-line react-hooks/exhaustive-deps
  const affectedId = affected[0];
  const alternatives = useMemo(() => (affectedId ? rainAlternatives(affectedId, planIds, rainTrip) : []), [affectedId, planIds, trip]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = buildPlan(planIds, trip);

  const prevStopOf = (id: string) => {
    const i = planIds.indexOf(id);
    return i > 0 ? byId(planIds[i - 1]) : null;
  };

  const replace = (to: string) => {
    if (!affectedId) return;
    setPlanIds(planIds.map((x) => (x === affectedId ? to : x)));
    setReplaced({ from: affectedId, to });
    logAdapt({ kind: 'rain', text: `Rain at 5 PM: ${byId(affectedId).title} → ${byId(to).title}` });
    toast({ title: 'Plan updated for rain', body: `${byId(to).title} replaces ${byId(affectedId).title}`, tone: 'ai', action: { label: 'View plan', to: '/itinerary' } });
  };

  const compress = useMemo(() => compressPlan(planIds, trip, 90), [planIds, trip]);

  const applyTime = () => {
    setPlanIds(compress.ids);
    setTrip({ minutes: 90 });
    setApplied({ saved: compress.saved, removed: compress.removed, added: compress.added });
    logAdapt({ kind: 'time', text: `Only 90 min left: ${compress.removed.map((r) => byId(r).title).join(', ')} swapped out` });
    toast({ title: `${compress.saved} minutes saved`, body: 'Your plan now fits in 90 minutes', tone: 'ai' });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge tone="dark" icon={<Radio size={12} />}>
            Real-time adaptation
          </Badge>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight sm:text-[34px]">Travel Saathi keeps your plan working</h1>
        </div>
        <Segmented
          value={tab}
          onChange={(v) => setTab(v)}
          options={[
            { value: 'rain', label: '🌧 Weather change' },
            { value: 'time', label: '⏳ Less time' },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          {tab === 'rain' && (
            <>
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#26345F] to-[#3E5A9A] p-5 text-white shadow-lift sm:p-6">
                <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-ink-950">
                    <AlertTriangle size={21} />
                  </span>
                  <div>
                    <div className="font-display text-[22px] font-bold leading-tight text-white">⚠️ Your plan has changed</div>
                    <p className="mt-1 text-[15px] text-white/85">Rain is expected at {clock(RAIN_AT)}. {affectedId || replaced ? 'Your outdoor experience may be affected.' : 'Your current plan is fully indoor.'}</p>
                  </div>
                </div>
                <div className="relative mt-5 grid grid-cols-4 gap-2">
                  {[
                    { t: '4 PM', icon: Sun, v: '29°', p: '5%' },
                    { t: '5 PM', icon: CloudRain, v: '25°', p: '80%', hot: true },
                    { t: '6 PM', icon: CloudRain, v: '24°', p: '70%', hot: true },
                    { t: '7 PM', icon: Cloud, v: '24°', p: '20%' },
                  ].map((h) => (
                    <div key={h.t} className={cx('rounded-2xl px-2 py-3 text-center', h.hot ? 'bg-white/20 ring-1 ring-white/30' : 'bg-white/10')}>
                      <div className="text-[12px] font-semibold text-white/70">{h.t}</div>
                      <h.icon size={20} className="mx-auto my-1.5" />
                      <div className="text-[14px] font-bold">{h.v}</div>
                      <div className="text-[11px] text-white/70">{h.p} rain</div>
                    </div>
                  ))}
                </div>
              </div>

              {replaced ? (
                <div className="card overflow-hidden animate-fade-up">
                  <div className="flex items-center gap-3 bg-leaf-50 px-5 py-4">
                    <CheckCircle2 className="text-leaf-600" />
                    <div>
                      <div className="text-[16px] font-bold text-ink-950">Plan updated — you’ll stay dry</div>
                      <div className="text-[13px] text-ink-600">
                        {byId(replaced.to).title} replaces {byId(replaced.from).title}. Seats held for 10 minutes.
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <ItineraryTimeline items={plan.items} highlight={{ [replaced.to]: 'new' }} compact />
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-ink-100 p-4">
                    <Button
                      onClick={() => {
                        startCheckout(planIds);
                        navigate('/booking');
                      }}
                      iconRight={<ArrowRight size={16} />}
                    >
                      Book updated plan · {inr(plan.groupCost)}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/itinerary')}>
                      View itinerary
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/map')}>
                      See new route
                    </Button>
                  </div>
                </div>
              ) : affectedId ? (
                <>
                  <div className="card flex items-center gap-4 p-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl">
                      <SceneArt image={byId(affectedId).image} alt={byId(affectedId).title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge tone="amber" icon={<CloudRain size={12} />}>
                        Affected · outdoor during rain
                      </Badge>
                      <div className="mt-1.5 text-[16px] font-bold text-ink-950">{byId(affectedId).title}</div>
                      <div className="text-[13px] text-ink-500">
                        {(() => {
                          const it = plan.items.find((i) => i.expId === affectedId)!;
                          return `${clock(it.start)} – ${clock(it.end)} · ${byId(affectedId).area}`;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-ai text-white">
                        <Sparkles size={16} />
                      </span>
                      <h2 className="text-[20px] font-bold">AI found {alternatives.length} alternatives</h2>
                    </div>
                    <div className="space-y-3">
                      {alternatives.map(({ exp, match }, i) => {
                        const prev = prevStopOf(affectedId);
                        const d = prev ? distKm(prev, exp) : match.distance;
                        return (
                          <div key={exp.id} className={cx('card overflow-hidden animate-fade-up', i === 0 && 'ring-2 ring-brand-300')} style={{ animationDelay: `${i * 90}ms` }}>
                            <div className="grid sm:grid-cols-[200px_1fr]">
                              <div className="relative h-40 sm:h-full">
                                <SceneArt image={exp.image} alt={exp.title} />
                                {i === 0 && <span className="absolute left-3 top-3 rounded-full bg-ink-950 px-2.5 py-1 text-[11px] font-bold text-white">Top pick</span>}
                              </div>
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-[17px] font-bold leading-snug">{exp.title}</h3>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] font-medium text-ink-600">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock size={13} /> {dur(exp.durationMin)}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <IndianRupee size={12} /> {exp.price.toLocaleString('en-IN')}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin size={13} /> {km(d)} {prev ? `from ${prev.title.split(' ').slice(0, 2).join(' ')}` : 'away'}
                                      </span>
                                    </div>
                                  </div>
                                  <MatchBadge score={match.score} />
                                </div>
                                <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
                                  <Check>Indoor</Check>
                                  {exp.familyFriendly && <Check>Family friendly</Check>}
                                  <Check>Fits your schedule</Check>
                                </div>
                                <div className="mt-4 flex gap-2">
                                  <Button size="sm" variant={i === 0 ? 'primary' : 'dark'} onClick={() => replace(exp.id)}>
                                    Replace Experience
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => navigate(`/exp/${exp.id}`)}>
                                    Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="card flex items-center gap-3 p-5">
                  <CheckCircle2 className="text-leaf-500" />
                  <div className="text-[15px] font-semibold text-ink-900">Your plan is already rain-proof. Nothing to change.</div>
                </div>
              )}
            </>
          )}

          {tab === 'time' && (
            <>
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-500 to-rani-500 p-5 text-white shadow-lift sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20">
                    <Hourglass size={21} />
                  </span>
                  <div>
                    <div className="font-display text-[22px] font-bold leading-tight text-white">You now have only 90 minutes.</div>
                    <p className="mt-1 text-[15px] text-white/85">Dinner moved up to 5:45 PM. Your plan needed {dur(compress.before.totalMin)}.</p>
                  </div>
                </div>
              </div>

              {applied ? (
                <div className="card overflow-hidden animate-fade-up">
                  <div className="flex items-center gap-4 bg-leaf-50 px-5 py-4">
                    <div className="font-display text-[34px] font-bold text-leaf-700 tnum">{applied.saved}</div>
                    <div>
                      <div className="text-[16px] font-bold text-ink-950">minutes saved</div>
                      <div className="text-[13px] text-ink-600">Back at the hotel by {clock(plan.endMin)} — in time for dinner.</div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <ItineraryTimeline items={plan.items} highlight={Object.fromEntries(applied.added.map((a) => [a, 'new' as const]))} compact />
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-ink-100 p-4">
                    <Button onClick={() => navigate('/itinerary')} iconRight={<ArrowRight size={16} />}>
                      View itinerary
                    </Button>
                  </div>
                </div>
              ) : compress.saved > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="card p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="eyebrow">Before</span>
                        <span className="text-[12.5px] font-bold text-red-600 tnum">{dur(compress.before.totalMin)} · too long</span>
                      </div>
                      <ItineraryTimeline items={compress.before.items} highlight={Object.fromEntries(compress.removed.map((r) => [r, 'removed' as const]))} compact />
                    </div>
                    <div className="card p-4 ring-2 ring-leaf-300">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="eyebrow">AI suggestion</span>
                        <span className="text-[12.5px] font-bold text-leaf-700 tnum">{dur(compress.after.totalMin)} · fits</span>
                      </div>
                      <ItineraryTimeline items={compress.after.items} highlight={Object.fromEntries(compress.added.map((a) => [a, 'new' as const]))} compact />
                    </div>
                  </div>
                  <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-50 text-leaf-600">
                        <Timer size={22} />
                      </span>
                      <div>
                        <div className="font-display text-[26px] font-bold leading-none text-ink-950 tnum">{compress.saved} minutes saved</div>
                        <div className="mt-1 text-[13px] text-ink-600">
                          Removed {compress.removed.map((r) => byId(r).title).join(' & ')}
                          {compress.added.length > 0 && <>, added nearby {compress.added.map((a) => byId(a).title).join(' & ')}</>}.
                        </div>
                      </div>
                    </div>
                    <Button className="sm:ml-auto" variant="ai" icon={<Sparkles size={16} />} onClick={applyTime}>
                      Apply changes
                    </Button>
                  </div>
                </>
              ) : (
                <div className="card flex items-center gap-3 p-5">
                  <CheckCircle2 className="text-leaf-500" />
                  <div className="text-[15px] font-semibold text-ink-900">Your plan already fits in 90 minutes.</div>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <div className="eyebrow mb-3">Live signals Travel Saathi watches</div>
            <ul className="space-y-3">
              {[
                { icon: CloudRain, t: 'Weather', s: trip.weather === 'rain' ? 'Rain from 5 PM (80%)' : 'Clear', warn: trip.weather === 'rain' },
                { icon: Car, t: 'Traffic', s: 'Laxmi Road +6 min', warn: false },
                { icon: CalendarCheck, t: 'Provider slots', s: 'Synced 12s ago', warn: false },
                { icon: MapPin, t: 'Your location', s: 'Deccan Gymkhana', warn: false },
              ].map((s) => (
                <li key={s.t} className="flex items-center gap-3">
                  <span className={cx('grid h-9 w-9 place-items-center rounded-xl', s.warn ? 'bg-amber-50 text-amber-600' : 'bg-ink-50 text-ink-600')}>
                    <s.icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-ink-950">{s.t}</div>
                    <div className="text-[12px] text-ink-500">{s.s}</div>
                  </div>
                  <span className={cx('h-2 w-2 rounded-full', s.warn ? 'bg-amber-500' : 'bg-leaf-500')} />
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <div className="eyebrow mb-2">Current plan</div>
            <div className="text-[15px] font-bold text-ink-950">
              {planIds.length} stops · {dur(plan.totalMin)}
            </div>
            <div className="text-[13px] text-ink-500">
              {clock(trip.startMin)} – {clock(plan.endMin)} · {inr(plan.perPerson)}/person
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/itinerary')}>
              Open itinerary
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
