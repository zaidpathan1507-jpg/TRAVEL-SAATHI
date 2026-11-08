import { useMemo, useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, ArrowRight, Clock, Store, CloudSun, MapPin, Wand2 } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter, Link } from '../router';
import { recommend } from '../lib/engine';
import { ExperienceCard, CompactExperience } from '../components/ExperienceCard';
import { TripChips } from '../components/TripPanel';
import { SceneArt } from '../components/SceneArt';
import { MatchBadge, SectionHeader, Button } from '../components/ui';
import { MapView } from '../components/MapView';
import { CATEGORY_META, EXPERIENCES, byId } from '../data/experiences';
import { clock, cx } from '../lib/format';
import type { Category } from '../lib/types';
import {
  hybridSearchIndia,
  resolveGooglePlaceCoords,
  getPlaceTypeIcon,
  type IndiaPlace,
} from '../lib/indiaSearch';

const PROMPTS = ['3 hours with family, food + culture under ₹2000', 'Rainy evening, indoor and kid friendly', 'Hidden cafés within 3 km', 'Something musical tonight for 2'];

export default function Home() {
  const { trip, setTripEditorOpen, setTrip } = useApp();
  const { navigate } = useRouter();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<IndiaPlace[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (val: string) => {
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }
    setLoadingSuggestions(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const results = await hybridSearchIndia(val);
        setSuggestions(results);
        setIsDropdownOpen(true);
        setActiveSuggestionIdx(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 280);
  };

  const handleSelectPlace = async (place: IndiaPlace) => {
    setIsDropdownOpen(false);
    let resolved = place;
    if (!place.latitude || !place.longitude) {
      resolved = await resolveGooglePlaceCoords(place);
    }
    const params = new URLSearchParams({
      name: resolved.name,
      lat: String(resolved.latitude),
      lng: String(resolved.longitude),
      city: resolved.city || '',
      state: resolved.state || '',
      category: resolved.category || '',
    });
    navigate('/map?' + params.toString());
  };

  const recs = useMemo(() => recommend(trip), [trip]);
  const top = recs.slice(0, 3);
  const gems = EXPERIENCES.filter((e) => e.badge === 'Hidden gem').slice(0, 4);
  const tonight = ['dhol-tasha', 'natya-sangeet', 'pune-food-walk', 'kp-live-music'].map(byId);

  const submit = (text: string) => navigate('/search?q=' + encodeURIComponent(text || q || 'Local food near me for 2 hours'));

  return (
    <div className="space-y-12 sm:space-y-14">
      {/* HERO */}
      <section className="grid items-center gap-8 pt-2 lg:grid-cols-[1.1fr_.9fr] lg:gap-12 lg:pt-8">
        <div className="animate-fade-up">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 shadow-card">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-leaf-500" />
              <span className="relative h-2 w-2 rounded-full bg-leaf-500" />
            </span>
            152 local experiences open in Pune right now
          </div>
          <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[56px] lg:text-[64px]">
            Discover the place <span className="text-ai">like a local.</span>
          </h1>
          <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-600">Experiences that fit your time, budget and interests.</p>

          <form
            className="mt-7"
            onSubmit={(e) => {
              e.preventDefault();
              if (activeSuggestionIdx >= 0 && activeSuggestionIdx < suggestions.length) {
                handleSelectPlace(suggestions[activeSuggestionIdx]);
              } else {
                submit(q);
              }
            }}
          >
            <label htmlFor="home-search" className="mb-2 block text-[13px] font-bold text-ink-900">
              What do you want to experience?
            </label>
            <div ref={searchBoxRef} className="relative">
              <div className="border-ai flex items-center gap-2 rounded-[22px] p-2 shadow-lift bg-white">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ai-soft text-rani-500">
                  <Sparkles size={20} />
                </span>
                <input
                  id="home-search"
                  value={q}
                  autoComplete="off"
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => {
                    if (q.trim() && suggestions.length > 0) setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (!isDropdownOpen || suggestions.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveSuggestionIdx((i) => (i < suggestions.length - 1 ? i + 1 : 0));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveSuggestionIdx((i) => (i > 0 ? i - 1 : suggestions.length - 1));
                    } else if (e.key === 'Escape') {
                      setIsDropdownOpen(false);
                    }
                  }}
                  placeholder="Try: Taj Mahal, Goa, Pune Misal Pav, or 2 hours with family"
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-ink-400"
                />
                <button type="button" aria-label="Search by voice" onClick={() => navigate('/search?voice')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink-600 hover:bg-ink-100">
                  <Mic size={20} />
                </button>
                <button type="submit" className="hidden h-11 items-center gap-1.5 rounded-2xl bg-ink-950 px-5 text-sm font-bold text-white hover:bg-ink-800 sm:inline-flex">
                  Ask <ArrowRight size={16} />
                </button>
                <button type="submit" aria-label="Ask" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink-950 text-white sm:hidden">
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Suggestions dropdown */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[360px] overflow-y-auto rounded-2xl border border-ink-100/80 bg-white p-1.5 shadow-lift backdrop-blur-xl animate-fade-up">
                  {suggestions.length > 0 ? (
                    suggestions.map((p, idx) => {
                      const isSel = idx === activeSuggestionIdx;
                      const icon = getPlaceTypeIcon(p.type, p.category);
                      const sub = [p.city, p.state].filter(Boolean).join(', ');
                      return (
                        <div
                          key={p.id || `${p.name}-${idx}`}
                          onClick={() => handleSelectPlace(p)}
                          onMouseEnter={() => setActiveSuggestionIdx(idx)}
                          className={cx(
                            'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition',
                            isSel ? 'bg-ink-50 text-ink-950' : 'text-ink-800 hover:bg-ink-50'
                          )}
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100/70 text-[16px]">
                            {icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[14px] font-bold text-ink-950">{p.name}</span>
                              {p.category && (
                                <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-700">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            {sub && <div className="truncate text-[12px] font-medium text-ink-500">{sub}</div>}
                          </div>
                          <span className="text-[11px] font-semibold text-brand-600">
                            Fly in 3D →
                          </span>
                        </div>
                      );
                    })
                  ) : !loadingSuggestions && q.trim().length >= 2 ? (
                    <div className="p-4 text-center">
                      <div className="text-[13px] font-semibold text-ink-700">No places found</div>
                      <p className="mt-0.5 text-[11.5px] text-ink-400">Press 'Ask' to search with AI recommendations</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </form>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => submit(p)} className="h-8 shrink-0 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-700 shadow-sm ring-1 ring-ink-100 hover:ring-brand-300">
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* hero visual */}
        <div className="relative hidden h-[460px] lg:block">
          <div className="absolute right-0 top-0 h-[380px] w-[88%] overflow-hidden rounded-[36px] shadow-lift">
            <SceneArt image={byId('pune-food-walk')?.image} alt="Traditional Pune Food Walk with authentic Misal Pav" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-white/75">Kasba Peth · 4:30 PM</div>
              <div className="font-display text-2xl font-bold">Traditional Pune Food Walk</div>
            </div>
            <div className="absolute right-4 top-4">
              <MatchBadge score={recs.find((r) => r.exp.id === 'pune-food-walk')?.match.score ?? 92} variant="glass" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-[270px] animate-fade-up rounded-3xl bg-white p-4 shadow-lift" style={{ animationDelay: '.2s' }}>
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-rani-600">
              <Wand2 size={14} /> AI understood
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['📍 Pune', '⏱ 3 hours', '₹ 2,000', '👨‍👩‍👧 Family', '🍛 Food', '🎭 Culture'].map((c) => (
                <span key={c} className="rounded-full bg-ink-50 px-2.5 py-1 text-[12px] font-semibold text-ink-800">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="absolute bottom-10 right-6 h-[150px] w-[190px] overflow-hidden rounded-3xl border-4 border-white shadow-lift">
            <MapView experiences={EXPERIENCES.slice(0, 6)} route={['shaniwar-wada-story', 'pune-food-walk']} controls={false} initialZoom={3.2} focus={{ x: 43, y: 52 }} />
          </div>
        </div>
      </section>

      {/* TRIP */}
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow mb-2">Your Trip</div>
          <TripChips trip={trip} />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => setTripEditorOpen(true)}>
            Edit trip
          </Button>
          <Button variant="secondary" onClick={() => navigate('/onboarding')}>
            Personalise
          </Button>
        </div>
      </section>

      {/* CURATED */}
      <section>
        <SectionHeader
          eyebrow={`Ranked for ${trip.city} · it’s 4:00 PM`}
          title={
            <span>
              <span className="text-ai">✨</span> Curated for you
            </span>
          }
          action={
            <Link to="/results" className="hidden items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800 sm:inline-flex">
              See all {recs.length} <ArrowRight size={16} />
            </Link>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {top.map(({ exp }) => (
            <ExperienceCard key={exp.id} exp={exp} />
          ))}
        </div>
        <Button variant="outline" full className="mt-4 sm:hidden" onClick={() => navigate('/results')}>
          See all {recs.length} matches
        </Button>
      </section>

      {/* CATEGORIES */}
      <section>
        <SectionHeader title="Explore by mood" />
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => {
                setTrip({ interests: [c] });
                navigate('/results');
              }}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-[12px] font-semibold text-ink-700 shadow-card transition hover:-translate-y-0.5"
            >
              <span className="text-2xl" aria-hidden>
                {CATEGORY_META[c].emoji}
              </span>
              {CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </section>

      {/* TONIGHT */}
      <section>
        <SectionHeader
          eyebrow="Live availability"
          title="Happening around you this evening"
          action={
            <span className="hidden items-center gap-1.5 text-[13px] font-semibold text-ink-600 sm:inline-flex">
              <CloudSun size={16} className="text-brand-500" /> Clear till 5 PM, light rain later
            </span>
          }
        />
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 no-scrollbar">
          {tonight.map((e) => {
            const slot = e.slots.find((s) => s.time >= 16 * 60) ?? e.slots[0];
            return (
              <button key={e.id} onClick={() => navigate(`/exp/${e.id}`)} className="group relative h-[220px] w-[250px] shrink-0 snap-start overflow-hidden rounded-3xl text-left shadow-card">
                <SceneArt image={e.image} alt={e.title} className="transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/10 to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold text-ink-950">
                  <Clock size={12} /> {clock(slot.time)}
                </span>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="text-[15px] font-bold leading-snug">{e.title}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[12px] text-white/75">
                    <MapPin size={12} /> {e.area} · {slot.left} spots left
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* GEMS */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionHeader eyebrow="Rarely on tourist lists" title="Hidden gems locals love" />
          <div className="space-y-3">
            {gems.map((e) => (
              <CompactExperience key={e.id} exp={e} onClick={() => navigate(`/exp/${e.id}`)} />
            ))}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[32px] bg-ink-950 p-7 text-white">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ai opacity-30 blur-3xl" />
          <div className="relative">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
              <Store size={22} />
            </span>
            <h3 className="mt-5 text-[28px] font-bold leading-tight text-white">Run a food walk, workshop or studio?</h3>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/70">Travel Saathi puts you in front of travelers whose time, budget and interests actually fit what you offer, and tells you what they’re searching for today.</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                ['3.2×', 'better conversion'],
                ['0%', 'listing fee'],
                ['24h', 'payouts'],
              ].map(([a, b]) => (
                <div key={b} className="rounded-2xl bg-white/5 py-3">
                  <div className="font-display text-xl font-bold">{a}</div>
                  <div className="text-[11.5px] text-white/60">{b}</div>
                </div>
              ))}
            </div>
            <Button variant="primary" className="mt-6" iconRight={<ArrowRight size={16} />} onClick={() => navigate('/provider')}>
              Open provider dashboard
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
