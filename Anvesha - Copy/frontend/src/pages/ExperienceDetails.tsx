import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Share2, MapPin, Clock, IndianRupee, Users, Check, ShieldCheck, MessageSquare, Navigation, Languages, Sparkles, CalendarPlus, Accessibility as AccessIcon, Quote, Info } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { byId, CATEGORY_META, getCategoryMeta, EXPERIENCES } from '../data/experiences';
import { scoreExperience, groupCostFor, NOW } from '../lib/engine';
import { SceneArt } from '../components/SceneArt';
import { SaveButton, InstagramLink } from '../components/ExperienceCard';
import { getInstagramUrl } from '../lib/social';
import { Badge, Button, Check as CheckRow, Empty, MatchBadge, Rating, Availability } from '../components/ui';
import type { Experience } from '../lib/types';
import { MapView } from '../components/MapView';
import { HOTEL } from '../lib/geo';
import { clock, cx, dur, inr, km } from '../lib/format';

export default function ExperienceDetails({ id }: { id: string }) {
  const exp = byId(id);
  const { navigate } = useRouter();
  if (!exp) {
    return <Empty icon={<Info />} title="Experience not found" body="This experience is no longer available." action={<Button onClick={() => navigate('/results')}>Back to recommendations</Button>} />;
  }
  return <ExperienceView exp={exp} />;
}

function ExperienceView({ exp }: { exp: Experience }) {
  const { trip, addToPlan, planIds, startCheckout, toast } = useApp();
  const { back, navigate } = useRouter();
  const match = useMemo(() => scoreExperience(exp, trip), [exp, trip]);
  const firstOpen = exp.slots.find((s) => s.left > 0 && s.time >= NOW - 5) ?? exp.slots.find((s) => s.left > 0);
  const [slot, setSlot] = useState<number | undefined>(firstOpen?.time);
  const [showCalc, setShowCalc] = useState(true);
  const inPlan = planIds.includes(exp.id);
  const cat = getCategoryMeta(exp.category);

  const canBook = EXPERIENCES.some((e) => e.id === exp.id); // live places (Google Places) can't be booked on Anvesha yet
  const book = () => {
    startCheckout([exp.id], [slot ?? exp.slots[0].time]);
    navigate('/booking');
  };

  const stars = [5, 4, 3, 2, 1].map((s) => ({ s, pct: s === 5 ? 78 : s === 4 ? 17 : s === 3 ? 4 : 1 }));

  return (
    <div className="pb-24 lg:pb-0">
      {/* hero */}
      <div className="relative -mx-4 -mt-4 h-[300px] overflow-hidden sm:mx-0 sm:mt-0 sm:h-[420px] sm:rounded-[32px]">
        <SceneArt image={exp.image} alt={exp.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-ink-950/20" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button onClick={back} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-sm">
            <ArrowLeft size={19} />
          </button>
          <div className="flex gap-2">
            <button
              aria-label="Share"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-sm"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(`${exp.title} on Travel Saathi`).catch(() => {});
                } catch {
                  /* noop */
                }
                toast({ title: 'Link copied', body: 'Share it with your group', tone: 'success' });
              }}
            >
              <Share2 size={17} />
            </button>
            <SaveButton id={exp.id} className="!h-10 !w-10" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
          <Badge tone="glass">
            {cat.emoji} {cat.label}
          </Badge>
          {exp.badge && <Badge tone="dark">{exp.badge}</Badge>}
          <Badge tone="glass">1 / 14 photos</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* main */}
        <div className="min-w-0 space-y-8">
          <div>
            <div className="text-[13px] font-semibold text-ink-500">
              {exp.area} · Hosted by {exp.provider.host}
            </div>
            <h1 className="mt-1 text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px]">{exp.title}</h1>
            <p className="mt-2 text-[16px] text-ink-600">{exp.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Rating value={exp.rating} count={exp.reviews} size="md" />
              <span className="text-[13px] text-ink-500">reviews</span>
              <span className="h-1 w-1 rounded-full bg-ink-300" />
              {match.nextSlot ? <Availability left={match.nextSlot.left} /> : <Availability left={0} />}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { icon: MapPin, k: 'Distance', v: km(match.distance), s: `${match.travel} min by ${match.distance <= 0.6 ? 'walk' : 'auto'}` },
                { icon: Clock, k: 'Duration', v: dur(exp.durationMin), s: `Next: ${match.nextSlot ? clock(match.nextSlot.time) : '—'}` },
                { icon: IndianRupee, k: 'Price', v: exp.price === 0 ? 'Free' : `${inr(exp.price)}/person`, s: exp.childPrice !== undefined && exp.childPrice !== exp.price ? `Kids ${exp.childPrice === 0 ? 'free' : inr(exp.childPrice)}` : 'All ages' },
                { icon: Users, k: 'Group fit', v: exp.familyFriendly ? 'Family friendly' : 'Adults only', s: `Up to ${exp.slots[0].capacity} guests` },
              ].map((m) => (
                <div key={m.k} className="rounded-2xl bg-white p-3.5 shadow-card">
                  <m.icon size={18} className="text-brand-500" />
                  <div className="mt-2 text-[15px] font-bold text-ink-950">{m.v}</div>
                  <div className="text-[12px] text-ink-500">{m.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* match explanation (mobile-first position) */}
          <MatchPanel match={match} showCalc={showCalc} setShowCalc={setShowCalc} className="lg:hidden" />

          <Section title="About">
            <p className="max-w-[65ch] text-[15px] leading-relaxed text-ink-700">{exp.about}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[12.5px] text-ink-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1">
                <Languages size={13} /> {exp.languages.join(', ')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1">{exp.indoor ? 'Indoor' : 'Outdoor'}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1">Walking: {exp.walking}</span>
            </div>
          </Section>

          <Section title="What’s included">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {exp.included.map((i) => (
                <li key={i} className="flex gap-2.5 text-[14px] text-ink-800">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-600">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {i}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Highlights">
            <div className="grid gap-3 sm:grid-cols-2">
              {exp.highlights.map((h, i) => (
                <div key={h} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 font-display text-[15px] font-bold text-brand-600">{i + 1}</span>
                  <span className="text-[14px] font-semibold text-ink-900">{h}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Available slots" id="slots">
            <div className="flex flex-wrap gap-2.5">
              {exp.slots.map((s) => {
                const past = s.time < NOW - 5;
                const disabled = s.left === 0 || past;
                return (
                  <button
                    key={s.time}
                    disabled={disabled}
                    onClick={() => setSlot(s.time)}
                    className={cx(
                      'min-w-[112px] rounded-2xl border-2 px-4 py-3 text-left transition',
                      slot === s.time ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-200 bg-white hover:border-ink-400',
                      disabled && 'cursor-not-allowed border-dashed opacity-45',
                    )}
                  >
                    <div className="font-display text-[17px] font-bold tnum">{clock(s.time)}</div>
                    <div className={cx('text-[12px] font-semibold', slot === s.time ? 'text-white/70' : s.left <= 4 ? 'text-amber-600' : 'text-leaf-600')}>{past ? 'Started' : s.left === 0 ? 'Sold out' : `${s.left} of ${s.capacity} left`}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-500">
              <Info size={13} /> Live from {exp.provider.name}’s calendar. Free cancellation up to 2 hours before.
            </p>
          </Section>

          <Section title="Location">
            <div className="overflow-hidden rounded-3xl bg-white shadow-card">
              <MapView experiences={[exp]} selectedId={exp.id} route={[exp.id]} className="h-[240px]" initialZoom={2.6} focus={{ x: (HOTEL.x + exp.x) / 2, y: (HOTEL.y + exp.y) / 2 }} />
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[14px] font-bold text-ink-950">{exp.address}</div>
                  <div className="text-[12.5px] text-ink-500">
                    {km(match.distance)} from {HOTEL.name} · {match.travel} min
                  </div>
                </div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(exp.address + ', Pune')}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink-100 px-4 text-[13px] font-bold text-ink-900 hover:bg-ink-200">
                  <Navigation size={15} /> Directions
                </a>
              </div>
            </div>
          </Section>

          <Section title="Reviews">
            <div className="rounded-3xl bg-ai-soft p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-rani-600">
                <Sparkles size={13} /> AI summary of {exp.reviews} reviews
              </div>
              <p className="text-[14px] leading-relaxed text-ink-800">
                Families praise how the host adapts to kids and spice levels. Most say it’s best at the earlier slot when lanes are quieter. A few mention it runs 10–15 minutes long.
              </p>
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-[180px_1fr]">
              <div>
                <div className="font-display text-5xl font-bold text-ink-950">{exp.rating.toFixed(1)}</div>
                <Rating value={exp.rating} count={exp.reviews} className="mt-1" />
                <div className="mt-3 space-y-1">
                  {stars.map((s) => (
                    <div key={s.s} className="flex items-center gap-2 text-[11.5px] text-ink-500">
                      <span className="w-2">{s.s}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-ink-100">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {exp.reviewsList.map((r) => (
                  <figure key={r.name} className="rounded-2xl bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-[13px] font-bold text-ink-700">{r.name[0]}</span>
                        <div>
                          <div className="text-[13.5px] font-bold text-ink-950">{r.name}</div>
                          <div className="text-[12px] text-ink-500">
                            {r.from} · {r.type} · {r.when}
                          </div>
                        </div>
                      </div>
                      <Rating value={r.rating} />
                    </div>
                    <blockquote className="mt-2.5 flex gap-2 text-[14px] leading-relaxed text-ink-700">
                      <Quote size={14} className="mt-1 shrink-0 text-ink-300" />
                      {r.text}
                    </blockquote>
                  </figure>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Accessibility">
            <ul className="space-y-2">
              {exp.accessibility.map((a) => (
                <li key={a} className="flex gap-2.5 text-[14px] text-ink-800">
                  <AccessIcon size={17} className="mt-0.5 shrink-0 text-sky2-500" />
                  {a}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Your host">
            <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-card sm:flex-row sm:items-center">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-rani-500 font-display text-xl font-bold text-white">{exp.provider.host.split(' ').map((w) => w[0]).join('')}</div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-[16px] font-bold text-ink-950">
                  {exp.provider.host} {exp.provider.verified && <ShieldCheck size={17} className="text-leaf-500" />}
                </div>
                <div className="text-[13px] text-ink-500">
                  {exp.provider.name} · Hosting since {exp.provider.since} · Replies in ~{exp.provider.responseMin} min
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getInstagramUrl(exp) && <InstagramLink url={getInstagramUrl(exp)} variant="pill" />}
                <Button variant="outline" size="sm" icon={<MessageSquare size={15} />} onClick={() => toast({ title: 'Message sent to host', body: `${exp.provider.host} usually replies in ${exp.provider.responseMin} min`, tone: 'success' })}>
                  Message host
                </Button>
              </div>
            </div>
          </Section>
        </div>

        {/* sticky booking column */}
        <aside className="hidden lg:block">
          <div className="sticky space-y-4" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 84px)' }}>
            <div className="card p-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-display text-[28px] font-bold text-ink-950">{exp.price === 0 ? 'Free' : inr(exp.price)}</span>
                  {exp.price > 0 && <span className="text-[14px] text-ink-500"> /person</span>}
                </div>
                <Rating value={exp.rating} count={exp.reviews} />
              </div>
              <div className="mt-1 text-[13px] text-ink-500">
                Your group ({trip.adults + trip.children}): <b className="text-ink-900">{inr(groupCostFor(exp, trip))}</b>
              </div>
              <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-ink-500">Today · pick a slot</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {exp.slots.map((s) => {
                  const disabled = s.left === 0 || s.time < NOW - 5;
                  return (
                    <button key={s.time} disabled={disabled} onClick={() => setSlot(s.time)} className={cx('rounded-xl border px-2 py-2 text-center text-[13px] font-bold tnum transition', slot === s.time ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-200 hover:border-ink-400', disabled && 'opacity-40')}>
                      {clock(s.time)}
                      <div className={cx('text-[10.5px] font-semibold', slot === s.time ? 'text-white/70' : 'text-ink-500')}>{s.left} left</div>
                    </button>
                  );
                })}
              </div>
              <Button size="lg" full className="mt-4" disabled={!canBook} onClick={book}>
                {canBook ? 'Book Experience' : 'Booking not available'}
              </Button>
              <Button size="md" full variant={inPlan ? 'secondary' : 'outline'} className="mt-2" icon={<CalendarPlus size={16} />} onClick={() => (inPlan ? navigate('/itinerary') : addToPlan(exp.id))}>
                {inPlan ? 'View in itinerary' : 'Add to AI itinerary'}
              </Button>
              <p className="mt-3 text-center text-[12px] text-ink-500">No charge until you confirm · Free cancellation</p>
            </div>
            <MatchPanel match={match} showCalc={showCalc} setShowCalc={setShowCalc} />
          </div>
        </aside>
      </div>

      {/* mobile sticky CTA */}
      <div className="fixed inset-x-0 z-30 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden" style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-ink-950">
              {exp.price === 0 ? 'Free' : inr(exp.price)}
              <span className="text-[12px] font-medium text-ink-500"> /person</span>
            </div>
            <div className="truncate text-[12px] text-ink-500">{slot ? `Today, ${clock(slot)}` : 'Pick a slot'}</div>
          </div>
          <button onClick={() => (inPlan ? navigate('/itinerary') : addToPlan(exp.id))} aria-label="Add to itinerary" className={cx('ml-auto grid h-12 w-12 shrink-0 place-items-center rounded-2xl', inPlan ? 'bg-leaf-50 text-leaf-700' : 'bg-ai-soft text-rani-600')}>
            <CalendarPlus size={20} />
          </button>
          <Button size="lg" className="shrink-0" disabled={!canBook} onClick={book}>
            {canBook ? 'Book Experience' : 'Booking not available'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id}>
      <h2 className="mb-3 text-[20px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function MatchPanel({ match, showCalc, setShowCalc, className }: { match: ReturnType<typeof scoreExperience>; showCalc: boolean; setShowCalc: (v: boolean) => void; className?: string }) {
  return (
    <div className={cx('card overflow-hidden', className)}>
      <div className="flex items-center gap-4 bg-ai-soft p-5">
        <MatchBadge score={match.score} variant="ring" />
        <div>
          <div className="text-[12px] font-bold uppercase tracking-wider text-rani-600">Why this is a {match.score}% match</div>
          <div className="mt-0.5 text-[14px] leading-snug text-ink-800">Scored against your time, budget, group, interests, distance, live slots and weather.</div>
        </div>
      </div>
      <div className="space-y-2 p-5">
        {match.reasons.map((r) => (
          <CheckRow key={r.text} ok={r.ok}>
            {r.text}
          </CheckRow>
        ))}
      </div>
      <div className="border-t border-ink-100 px-5 py-4">
        <button onClick={() => setShowCalc(!showCalc)} className="text-[13px] font-bold text-ink-800">
          {showCalc ? 'Hide' : 'Show'} how we calculated this
        </button>
        {showCalc && (
          <div className="mt-3 space-y-2.5">
            {match.breakdown.map((b) => (
              <div key={b.key} className="grid grid-cols-[92px_1fr_40px] items-center gap-2 text-[12.5px]">
                <span className="font-semibold text-ink-700">{b.label}</span>
                <div className="h-2 rounded-full bg-ink-100">
                  <div className={cx('h-full rounded-full', b.value >= 0.8 ? 'bg-leaf-500' : b.value >= 0.5 ? 'bg-amber-400' : 'bg-red-400')} style={{ width: `${Math.max(4, b.value * 100)}%` }} />
                </div>
                <span className="text-right font-semibold text-ink-500 tnum">×{Math.round(b.weight * 100)}</span>
              </div>
            ))}
            <p className="pt-1 text-[11.5px] leading-snug text-ink-500">Bars show how well each constraint is met; ×N is the factor’s weight in the score.</p>
          </div>
        )}
      </div>
    </div>
  );
}
