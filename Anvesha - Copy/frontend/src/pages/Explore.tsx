import { useMemo, useRef, useState, useEffect } from 'react';
import { Route, Footprints, Clock, ArrowRight, Navigation, Hotel } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { MapView } from '../components/MapView';
import { CompactExperience } from '../components/ExperienceCard';
import { IndiaSearchBar } from '../components/IndiaSearchBar';
import { recommend, buildPlan } from '../lib/engine';
import { cx, dur, km } from '../lib/format';
import type { Experience } from '../lib/types';
import { HOTEL } from '../lib/geo';

const CATS: { key: string; label: string; emoji: string; test: (e: Experience) => boolean }[] = [
  { key: 'all', label: 'All', emoji: '✦', test: () => true },
  { key: 'food', label: 'Food', emoji: '🍛', test: (e) => e.tags.includes('food') },
  { key: 'culture', label: 'Culture', emoji: '🎭', test: (e) => e.tags.includes('culture') || e.tags.includes('history') },
  { key: 'adventure', label: 'Adventure', emoji: '🏔', test: (e) => e.tags.includes('adventure') || e.tags.includes('nature') },
  { key: 'events', label: 'Events', emoji: '🎵', test: (e) => e.tags.includes('music') || e.tags.includes('nightlife') },
  { key: 'shopping', label: 'Shopping', emoji: '🛍', test: (e) => e.tags.includes('shopping') },
  { key: 'gems', label: 'Hidden Gems', emoji: '💎', test: (e) => e.badge === 'Hidden gem' },
];

export default function Explore() {
  const { trip, planIds, allExperiences } = useApp();
  const { path, navigate } = useRouter();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [targetPlace, setTargetPlace] = useState<{
    lat: number;
    lng: number;
    name: string;
    city?: string;
    state?: string;
    category?: string;
    description?: string;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync from URL search params (e.g. #/map?name=Taj+Mahal&lat=27.1751&lng=78.0421)
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const queryIdx = hash.indexOf('?');
      if (queryIdx >= 0) {
        const params = new URLSearchParams(hash.slice(queryIdx + 1));
        const lat = parseFloat(params.get('lat') || '');
        const lng = parseFloat(params.get('lng') || '');
        const name = params.get('name') || params.get('q') || '';
        if (lat && lng && name) {
          setQ(name);
          setTargetPlace({
            lat,
            lng,
            name,
            city: params.get('city') || '',
            state: params.get('state') || '',
            category: params.get('category') || '',
          });
        }
      }
    } catch {
      // noop
    }
  }, [path]);

  const ranked = useMemo(() => recommend({ ...trip, groupType: 'solo' }), [trip]);
  const items = ranked.filter(({ exp }) => CATS.find((c) => c.key === cat)!.test(exp)).filter(({ exp }) => !q || (exp.title + exp.area + exp.tagline).toLowerCase().includes(q.toLowerCase()));
  const plan = buildPlan(planIds, trip);
  const travelMin = plan.items.filter((i) => i.kind !== 'activity').reduce((s, i) => s + (i.end - i.start), 0);
  const route = showRoute ? planIds : [];

  useEffect(() => {
    if (!sel) return;
    const el = listRef.current?.querySelector(`[data-id="${sel}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [sel]);

  return (
    <div className="relative -mx-4 -mt-4 sm:-mt-6 lg:mx-0 lg:mt-0 lg:grid lg:h-[calc(100vh-64px-64px)] lg:grid-cols-[1fr_400px] lg:gap-5">
      {/* map */}
      <div className="relative h-[calc(100dvh-64px-68px)] overflow-hidden lg:h-full lg:rounded-[32px] lg:shadow-card">
        <MapView
          experiences={items.map((i) => i.exp)}
          selectedId={sel}
          onSelect={setSel}
          route={route}
          className="h-full w-full"
          initialZoom={2.2}
          focus={{ x: 44, y: 51 }}
          dimOthers={false}
          rain={trip.weather === 'rain'}
          targetLocation={targetPlace}
        />

        {/* search + chips */}
        <div className="absolute inset-x-0 top-0 space-y-2.5 p-3 sm:p-4 z-30">
          <IndiaSearchBar
            id="map-search"
            value={q}
            onSearchChange={setQ}
            onSelectPlace={(place) => {
              setTargetPlace({
                lat: place.latitude,
                lng: place.longitude,
                name: place.name,
                city: place.city,
                state: place.state,
                category: place.category,
                description: place.description,
              });

              // Check if matches a catalog experience in Pune
              const matchExp = allExperiences.find(
                (e) =>
                  e.id === place.id ||
                  e.title.toLowerCase().includes(place.name.toLowerCase()) ||
                  place.name.toLowerCase().includes(e.title.toLowerCase())
              );
              if (matchExp) {
                setSel(matchExp.id);
              }
            }}
            placeholder="Search Indian destinations, landmarks, food (e.g. Pune, Taj Mahal, Goa)"
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATS.map((c) => (
              <button key={c.key} onClick={() => setCat(c.key)} className={cx('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold shadow-sm', cat === c.key ? 'bg-ink-950 text-white' : 'bg-white text-ink-800')}>
                <span>{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
          {planIds.length > 0 && (
            <button onClick={() => setShowRoute(!showRoute)} className={cx('inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-[12.5px] font-semibold shadow-sm', showRoute ? 'bg-ai text-white' : 'bg-white text-ink-800')}>
              <Route size={15} />
              {showRoute ? `Your route · ${planIds.length} stops · ${km(plan.travelKm)} · ${travelMin} min travel` : 'Show my route'}
            </button>
          )}
        </div>

        {/* legend */}
        <div className="absolute bottom-[196px] left-3 hidden flex-col gap-1 rounded-2xl bg-white/95 p-3 text-[11.5px] font-semibold text-ink-700 shadow-card sm:flex lg:bottom-4">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-white bg-[#3B82F6] shadow" /> You are here
          </span>
          <span className="flex items-center gap-2">
            <Hotel size={13} /> {HOTEL.name}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded bg-ai" /> Planned route
          </span>
        </div>

        {/* mobile bottom sheet */}
        <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white pb-3 pt-2 shadow-[0_-12px_32px_-12px_rgba(11,20,51,.25)] lg:hidden">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink-200" />
          <div className="flex items-center justify-between px-4 pb-2">
            <h2 className="text-[16px] font-bold">Nearby experiences for you</h2>
            <span className="text-[12px] font-semibold text-ink-500">{items.length} found</span>
          </div>
          <div ref={listRef} className="flex snap-x gap-3 overflow-x-auto px-4 no-scrollbar">
            {items.map(({ exp }) => (
              <div key={exp.id} data-id={exp.id} className="w-[300px] shrink-0 snap-center">
                <CompactExperience exp={exp} active={sel === exp.id} onClick={() => (sel === exp.id ? navigate(`/exp/${exp.id}`) : setSel(exp.id))} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* desktop side list */}
      <aside className="hidden min-h-0 flex-col overflow-hidden rounded-[32px] bg-white shadow-card lg:flex">
        <div className="border-b border-ink-100 p-5">
          <h2 className="text-[20px] font-bold">Nearby experiences for you</h2>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {items.length} within {trip.maxKm} km of {HOTEL.area} · sorted by fit
          </p>
        </div>
        {planIds.length > 0 && showRoute && (
          <div className="border-b border-ink-100 bg-ai-soft px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-rani-600">Your route</span>
              <button onClick={() => navigate('/itinerary')} className="text-[12.5px] font-bold text-ink-800">
                Itinerary →
              </button>
            </div>
            <ol className="mt-2 space-y-1.5">
              {plan.items.map((it, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px]">
                  {it.kind === 'activity' ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-ai text-[10.5px] font-bold text-white">{planIds.indexOf(it.expId!) + 1}</span>
                  ) : (
                    <Footprints size={14} className="mx-[3px] text-ink-400" />
                  )}
                  <span className={cx('truncate', it.kind === 'activity' ? 'font-semibold text-ink-950' : 'text-ink-500')}>{it.label}</span>
                  <span className="ml-auto shrink-0 text-ink-500 tnum">{dur(it.end - it.start)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex gap-3 text-[12px] font-semibold text-ink-700">
              <span className="inline-flex items-center gap-1">
                <Route size={13} /> {km(plan.travelKm)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> {travelMin} min travelling
              </span>
            </div>
          </div>
        )}
        <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
          {items.map(({ exp }) => (
            <div key={exp.id} data-id={exp.id} onMouseEnter={() => setSel(exp.id)}>
              <CompactExperience
                exp={exp}
                active={sel === exp.id}
                onClick={() => navigate(`/exp/${exp.id}`)}
                action={
                  sel === exp.id ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-700">
                      View <ArrowRight size={13} />
                    </span>
                  ) : undefined
                }
              />
            </div>
          ))}
        </div>
        <div className="border-t border-ink-100 p-4">
          <a href="https://www.google.com/maps/dir/?api=1&destination=Kasba+Ganpati+Pune" target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[14px] font-bold text-white">
            <Navigation size={16} /> Open turn-by-turn in Maps
          </a>
        </div>
      </aside>
    </div>
  );
}
