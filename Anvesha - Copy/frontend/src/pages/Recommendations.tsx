import { useEffect, useMemo, useState } from 'react';
import { Sparkles, SlidersHorizontal, MapPin, Wallet, Timer, Star, Accessibility, Zap, CloudRain, X, ArrowRight, Search as SearchIcon, Loader2 } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { RecommendationCard } from '../components/ExperienceCard';
import { TripChips } from '../components/TripPanel';
import { Chip, Empty, Button, Segmented, SectionHeader } from '../components/ui';
import { MapView } from '../components/MapView';
import { CATEGORY_META } from '../data/experiences';
import type { Category, Experience, MatchResult, Trip } from '../lib/types';
import { clock, dur, inr } from '../lib/format';
import { api, type RecommendApiResponse, type TripPlan, type TripPlansResponse, type PlanStop } from '../api/client';
import { recommendationToExperience, experienceIdFor } from '../lib/recommendationAdapter';
import { PlanCards } from '../components/PlanCards';
import { NOW, buildPlan, recommend } from '../lib/engine';
import { EXPERIENCES, registerLiveExperiences } from '../data/experiences';

type Sort = 'match' | 'near' | 'price' | 'rating';
const DIST = [null, 2, 5] as const;
const BUDGET = [null, 500, 1000] as const;
const DURATION = [null, 60, 120] as const;

function buildLocalTripPlans(trip: Trip, exps: Experience[]): TripPlan[] {
  if (exps.length === 0) return [];
  const plans: TripPlan[] = [];

  const picks1 = exps.slice(0, Math.min(3, exps.length));
  if (picks1.length > 0) {
    const rawPlan1 = buildPlan(picks1.map((e) => e.id), trip);
    let curTime = trip.startMin;
    const stops: PlanStop[] = picks1.map((e) => {
      const start = curTime;
      const end = curTime + e.durationMin;
      const stop: PlanStop = {
        placeId: e.id,
        name: e.title,
        category: e.category,
        start,
        end,
        durationMin: e.durationMin,
        travelMin: 15,
        travelKm: 1.5,
        costPerPerson: e.price,
        costEstimated: false,
        rating: e.rating,
        note: e.tagline,
      };
      curTime = end + 20;
      return stop;
    });

    plans.push({
      id: 'local-plan-1',
      source: 'local',
      title: `${trip.city} Curated Highlights`,
      tagline: `Best matched ${trip.interests.join(' & ')} experiences for your group`,
      why: `Curated for your group in ${trip.city}`,
      startMin: trip.startMin,
      totalMin: rawPlan1.totalMin,
      travelKm: rawPlan1.travelKm,
      groupCost: rawPlan1.groupCost,
      perPerson: rawPlan1.perPerson,
      endMin: rawPlan1.endMin,
      withinBudget: rawPlan1.groupCost <= trip.budget * (trip.budgetMode === 'person' ? (trip.adults + trip.children) : 1),
      warnings: [],
      stops,
    });
  }

  if (exps.length >= 4) {
    const picks2 = exps.slice(2, 4);
    const rawPlan2 = buildPlan(picks2.map((e) => e.id), trip);
    let curTime = trip.startMin;
    const stops: PlanStop[] = picks2.map((e) => {
      const start = curTime;
      const end = curTime + e.durationMin;
      const stop: PlanStop = {
        placeId: e.id,
        name: e.title,
        category: e.category,
        start,
        end,
        durationMin: e.durationMin,
        travelMin: 15,
        travelKm: 2,
        costPerPerson: e.price,
        costEstimated: false,
        rating: e.rating,
        note: e.tagline,
      };
      curTime = end + 25;
      return stop;
    });

    plans.push({
      id: 'local-plan-2',
      source: 'local',
      title: `${trip.city} Discovery Loop`,
      tagline: 'Alternative relaxing path tailored to your budget and time',
      why: 'Alternative local discoveries matching your interests',
      startMin: trip.startMin,
      totalMin: rawPlan2.totalMin,
      travelKm: rawPlan2.travelKm,
      groupCost: rawPlan2.groupCost,
      perPerson: rawPlan2.perPerson,
      endMin: rawPlan2.endMin,
      withinBudget: rawPlan2.groupCost <= trip.budget * (trip.budgetMode === 'person' ? (trip.adults + trip.children) : 1),
      warnings: [],
      stops,
    });
  }

  return plans;
}

export default function Recommendations() {
  const { trip, setTripEditorOpen, planIds, setPlanIds, lastQuery, toast } = useApp();
  const { navigate } = useRouter();
  const [dist, setDist] = useState(0);
  const [budget, setBudget] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rating, setRating] = useState(false);
  const [access, setAccess] = useState(false);
  const [now, setNow] = useState(false);
  const [indoor, setIndoor] = useState(false);
  const [cat, setCat] = useState<Category | null>(null);
  const [sort, setSort] = useState<Sort>('match');
  const [hover, setHover] = useState<string | null>(null);

  const [liveRecs, setLiveRecs] = useState<{ exp: Experience; match: MatchResult }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<RecommendApiResponse['engine_meta'] | null>(null);
  const [plans, setPlans] = useState<TripPlan[]>([]);
  const [planMeta, setPlanMeta] = useState<TripPlansResponse['plan_meta'] | null>(null);
  const [expIdFor, setExpIdFor] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const queryStr = lastQuery || `Places to visit in ${trip.city} for ${trip.interests.join(' and ')}`;
    
    const applyLocalFallback = () => {
      const localMatches = recommend(trip);
      registerLiveExperiences(localMatches.map((m) => m.exp));
      setLiveRecs(localMatches);
      const idMap: Record<string, string> = {};
      localMatches.forEach((m) => {
        idMap[m.exp.id] = m.exp.id;
      });
      setExpIdFor(idMap);
      const localPlans = buildLocalTripPlans(trip, localMatches.map((m) => m.exp));
      setPlans(localPlans);
      setPlanMeta({
        generator: 'local',
        model: null,
        warnings: ['Showing curated local experiences for your plan.'],
      });
      setMeta({
        source: 'curated_catalog',
        city: trip.city,
        total_candidates: localMatches.length,
        returned: localMatches.length,
      } as any);
      setError(null);
    };

    api.tripPlans(queryStr, 'auto', trip, 20)
      .then((data) => {
        if (!mounted) return;
        const recs = data.shortlist?.recommendations ?? [];
        if (recs.length > 0) {
          setMeta(data.shortlist.engine_meta);
          const mapped = recs.map((r) => recommendationToExperience(r, trip));
          registerLiveExperiences(mapped.map((m) => m.exp));
          setLiveRecs(mapped);
          setExpIdFor(Object.fromEntries(recs.map((r) => [r.place_id, experienceIdFor(r)])));
          setPlans(data.plans ?? []);
          setPlanMeta(data.plan_meta);
        } else {
          applyLocalFallback();
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn('Backend unavailable, falling back to local recommendation engine:', err);
        applyLocalFallback();
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [trip, lastQuery]);

  const list = useMemo(() => {
    let l = liveRecs.filter(({ exp, match }) => {
      if (DIST[dist] && match.distance > DIST[dist]!) return false;
      if (BUDGET[budget] && exp.price > BUDGET[budget]!) return false;
      if (DURATION[duration] && exp.durationMin > DURATION[duration]!) return false;
      if (rating && exp.rating < 4.7) return false;
      if (access && !exp.wheelchair) return false;
      if (now && !(match.nextSlot && match.nextSlot.time - NOW <= 45)) return false;
      if (indoor && !exp.indoor) return false;
      if (cat && !exp.tags.includes(cat)) return false;
      return true;
    });
    if (sort === 'near') l = [...l].sort((a, b) => a.match.distance - b.match.distance);
    if (sort === 'price') l = [...l].sort((a, b) => a.exp.price - b.exp.price);
    if (sort === 'rating') l = [...l].sort((a, b) => b.exp.rating - a.exp.rating);
    return l;
  }, [liveRecs, dist, budget, duration, rating, access, now, indoor, cat, sort]);

  const activeFilters = [dist, budget, duration].filter(Boolean).length + [rating, access, now, indoor, !!cat].filter(Boolean).length;
  const clearAll = () => {
    setDist(0);
    setBudget(0);
    setDuration(0);
    setRating(false);
    setAccess(false);
    setNow(false);
    setIndoor(false);
    setCat(null);
  };
  const plan = buildPlan(planIds, trip);

  // Any shortlisted place can go into the itinerary; only catalog experiences can be booked
  const bookable = useMemo(() => new Set(EXPERIENCES.map((e) => e.id)), []);
  const usePlan = (p: TripPlan) => {
    const ids = [...new Set(p.stops.map((s) => expIdFor[s.placeId]).filter((id): id is string => !!id))];
    if (!ids.length) return;
    setPlanIds(ids);
    toast({ title: 'Plan added to your itinerary', body: `${p.title} · ${ids.length} stops`, tone: 'ai', action: { label: 'View plan', to: '/itinerary' } });
    navigate('/itinerary');
  };

  return (
    <div>
      <div className="mb-5">
        {lastQuery && (
          <button onClick={() => navigate('/search')} className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] text-ink-600 shadow-sm">
            <SearchIcon size={13} className="shrink-0" />
            <span className="truncate">“{lastQuery}”</span>
          </button>
        )}
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-[38px]">Recommendations</h1>
        <TripChips trip={trip} showInterests className="mt-3" onEdit={() => setTripEditorOpen(true)} />
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-3xl bg-ai-soft p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ai text-white">
          <Sparkles size={17} />
        </span>
        <div className="text-[13.5px] leading-relaxed text-ink-800">
          {loading ? (
            <div className="flex items-center gap-2 font-semibold">
              <Loader2 size={16} className="animate-spin text-ai" />
              Shortlisting places and building your plans... this can take a few seconds
            </div>
          ) : meta ? (
            <p>
              Scanned <b>{meta.candidates_considered} candidates</b> using <b>{meta.data_source === 'google_places_api' ? 'Google Places API (Live)' : 'the local dataset & SQLite catalog'}</b>.
              Returned <b>{liveRecs.length} ranked places</b> matching your criteria.
            </p>
          ) : (
            <p>Processed recommendations for your request.</p>
          )}
        </div>
      </div>

      {!loading && !error && plans.length > 0 && (
        <section className="mb-8">
          <SectionHeader eyebrow={planMeta?.generator === 'local' ? 'Built from your shortlist' : 'AI-built from your shortlist'} title="Plans for you" className="mb-3" />
          {planMeta && planMeta.warnings.length > 0 && <p className="mb-3 text-[12.5px] text-ink-500">{planMeta.warnings.join(' ')}</p>}
          <PlanCards plans={plans} expIdFor={expIdFor} bookable={bookable} onOpen={(id) => navigate(`/exp/${id}`)} onUse={usePlan} />
          <SectionHeader eyebrow="All shortlisted places" title="Compare places one by one" className="mt-8" />
        </section>
      )}

      {/* Filters */}
      <div className="sticky z-30 -mx-4 mb-5 border-b border-ink-100 bg-ink-50/95 px-4 py-3 backdrop-blur" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="mr-1 inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-ink-700">
            <SlidersHorizontal size={15} /> Filters
          </span>
          <Chip active={!!dist} onClick={() => setDist((d) => (d + 1) % DIST.length)} icon={<MapPin size={14} />}>
            {DIST[dist] ? `≤ ${DIST[dist]} km` : 'Distance'}
          </Chip>
          <Chip active={!!budget} onClick={() => setBudget((d) => (d + 1) % BUDGET.length)} icon={<Wallet size={14} />}>
            {BUDGET[budget] ? `≤ ${inr(BUDGET[budget]!)}` : 'Budget'}
          </Chip>
          <Chip active={!!duration} onClick={() => setDuration((d) => (d + 1) % DURATION.length)} icon={<Timer size={14} />}>
            {DURATION[duration] ? `< ${dur(DURATION[duration]!)}` : 'Duration'}
          </Chip>
          <Chip active={rating} onClick={() => setRating(!rating)} icon={<Star size={14} />}>
            Rating 4.7+
          </Chip>
          <Chip active={access} onClick={() => setAccess(!access)} icon={<Accessibility size={14} />}>
            Accessible
          </Chip>
          <Chip active={now} onClick={() => setNow(!now)} icon={<Zap size={14} />}>
            Available now
          </Chip>
          <Chip active={indoor} onClick={() => setIndoor(!indoor)} icon={<CloudRain size={14} />}>
            Indoor
          </Chip>
          {activeFilters > 0 && (
            <button onClick={clearAll} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-bold text-brand-700 hover:bg-brand-50">
              <X size={14} /> Clear ({activeFilters})
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="mr-1 shrink-0 text-[12px] font-semibold text-ink-500">Category</span>
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)} className="!h-8 !px-3 !text-[12.5px]" icon={<span>{CATEGORY_META[c].emoji}</span>}>
              {CATEGORY_META[c].label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] font-semibold text-ink-700">
              {list.length} {list.length === 1 ? 'experience' : 'experiences'}
            </span>
            <Segmented<Sort>
              value={sort}
              onChange={setSort}
              options={[
                { value: 'match', label: 'Best match' },
                { value: 'near', label: 'Nearest' },
                { value: 'price', label: 'Price' },
                { value: 'rating', label: 'Rating' },
              ]}
            />
          </div>
          <div className="space-y-5">
            {loading ? (
              <div className="card flex h-48 flex-col items-center justify-center p-6 text-center">
                <Loader2 size={32} className="animate-spin text-ai mb-3" />
                <p className="text-[15px] font-bold text-ink-800">Searching places...</p>
                <p className="text-[13px] text-ink-500 mt-1">Ranking places by how well they match your plan</p>
              </div>
            ) : error ? (
              <Empty icon={<SlidersHorizontal />} title="Recommendation Backend Error" body={error} action={<Button onClick={() => window.location.reload()}>Retry Search</Button>} />
            ) : list.length === 0 ? (
              <Empty icon={<SlidersHorizontal />} title="No places found" body="No places match this request. Try another city, different interests, or clear the filters." action={<Button onClick={clearAll}>Clear filters</Button>} />
            ) : (
              list.map(({ exp, match }, i) => (
                <div key={exp.id} onMouseEnter={() => setHover(exp.id)} onMouseLeave={() => setHover(null)}>
                  <RecommendationCard exp={exp} match={match} rank={sort === 'match' && activeFilters === 0 ? i : undefined} />
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky space-y-4" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 170px)' }}>
            <div className="card overflow-hidden">
              <MapView experiences={list.map((l) => l.exp)} selectedId={hover} onSelect={(id) => navigate(`/exp/${id}`)} className="h-[300px]" initialZoom={2} controls={false} focus={{ x: 42, y: 52 }} />
              <button onClick={() => navigate('/map')} className="flex w-full items-center justify-between px-4 py-3 text-[13.5px] font-bold text-ink-900 hover:bg-ink-50">
                Open map view <ArrowRight size={16} />
              </button>
            </div>
            <div className="card p-4">
              <div className="eyebrow mb-2">Your itinerary</div>
              {planIds.length ? (
                <>
                  <div className="text-[15px] font-bold text-ink-950">
                    {planIds.length} stops · {dur(plan.totalMin)}
                  </div>
                  <div className="text-[13px] text-ink-500">
                    Back at the hotel by {clock(plan.endMin)} · {inr(plan.perPerson)}/person
                  </div>
                  <Button size="sm" variant="dark" className="mt-3" full onClick={() => navigate('/itinerary')}>
                    View itinerary
                  </Button>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-ink-600">Tap “Add to itinerary” on any experience and Travel Saathi AI will build a timed plan around it.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
