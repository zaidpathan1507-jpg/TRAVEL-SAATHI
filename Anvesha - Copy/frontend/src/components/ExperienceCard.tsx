import { useMemo, useState, type ReactNode } from 'react';
import { Heart, MapPin, Clock, IndianRupee, ChevronDown, Plus, ArrowRight, Users, CloudRain, Accessibility, Instagram } from 'lucide-react';
import type { Experience, MatchResult } from '../lib/types';
import { SceneArt } from './SceneArt';
import { Availability, Badge, Button, Check, MatchBadge, Rating } from './ui';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { scoreExperience } from '../lib/engine';
import { clock, cx, dur, inr, km } from '../lib/format';
import { CATEGORY_META, getCategoryMeta } from '../data/experiences';
import { getInstagramUrl, isValidSocialUrl, extractInstagramHandle } from '../lib/social';

export function InstagramLink({
  url,
  variant = 'icon',
  size = 'md',
  className,
}: {
  url?: string;
  variant?: 'icon' | 'pill' | 'badge';
  size?: 'sm' | 'md';
  className?: string;
}) {
  if (!isValidSocialUrl(url)) return null;
  const handle = extractInstagramHandle(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={handle ? `Visit ${handle} on Instagram (opens in new tab)` : 'Visit Instagram profile (opens in new tab)'}
      title={handle ? `Instagram: ${handle} (opens in new tab)` : 'Instagram profile (opens in new tab)'}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-semibold transition active:scale-95 select-none',
        variant === 'icon' && size === 'md' &&
          'h-9 w-9 rounded-xl border border-rani-200/80 bg-rani-50/70 text-rani-600 hover:border-rani-300 hover:bg-rani-100 hover:text-rani-700 shadow-xs',
        variant === 'icon' && size === 'sm' &&
          'h-7 w-7 rounded-lg border border-rani-200/70 bg-rani-50/70 text-rani-600 hover:border-rani-300 hover:bg-rani-100 hover:text-rani-700',
        variant === 'pill' &&
          'h-9 gap-1.5 rounded-xl border border-rani-200/80 bg-rani-50/70 px-3 text-[12.5px] font-semibold text-rani-700 hover:border-rani-300 hover:bg-rani-100 shadow-xs',
        variant === 'badge' &&
          'gap-1 rounded-md border border-rani-200/70 bg-rani-50 px-2 py-0.5 text-[11.5px] font-medium text-rani-600 hover:bg-rani-100',
        className,
      )}
    >
      <Instagram size={size === 'sm' ? 13 : 15} className="shrink-0 text-rani-600" />
      {variant === 'pill' && <span>{handle || 'Instagram'}</span>}
    </a>
  );
}

export const useMatch = (exp: Experience) => {
  const { trip } = useApp();
  return useMemo(() => scoreExperience(exp, trip), [exp, trip]);
};

export function SaveButton({ id, className }: { id: string; className?: string }) {
  const { saved, toggleSave } = useApp();
  const on = saved.includes(id);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleSave(id);
      }}
      aria-label={on ? 'Remove from saved' : 'Save experience'}
      aria-pressed={on}
      className={cx('grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm backdrop-blur transition active:scale-90', className)}
    >
      <Heart size={17} className={on ? 'fill-rani-500 text-rani-500' : 'text-ink-800'} />
    </button>
  );
}

export function MetaRow({ exp, match, className }: { exp: Experience; match: MatchResult; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium text-ink-600', className)}>
      <span className="inline-flex items-center gap-1">
        <MapPin size={13} className="text-ink-400" />
        {km(match.distance)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock size={13} className="text-ink-400" />
        {dur(exp.durationMin)}
      </span>
      <span className="inline-flex items-center gap-0.5 font-semibold text-ink-900">
        <IndianRupee size={12.5} className="text-ink-400" />
        {exp.price === 0 ? 'Free' : `${exp.price.toLocaleString('en-IN')}/person`}
      </span>
    </div>
  );
}

function CardImage({ exp, match, className, big }: { exp: Experience; match: MatchResult; className?: string; big?: boolean }) {
  const cat = getCategoryMeta(exp.category);
  return (
    <div className={cx('relative overflow-hidden', className)}>
      <SceneArt image={exp.image} alt={exp.title} className="transition duration-500 group-hover:scale-[1.04]" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <MatchBadge score={match.score} variant="glass" />
        <SaveButton id={exp.id} />
      </div>
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
        <Badge tone="glass">
          <span aria-hidden>{cat.emoji}</span> {cat.label}
        </Badge>
        {exp.badge && <Badge tone="dark">{exp.badge}</Badge>}
        {big && exp.indoor && (
          <Badge tone="glass" icon={<CloudRain size={12} />}>
            Indoor
          </Badge>
        )}
      </div>
    </div>
  );
}

/** Grid card used on Home "Curated for you" */
export function ExperienceCard({ exp, compactChecks = false }: { exp: Experience; compactChecks?: boolean }) {
  const match = useMatch(exp);
  const { navigate } = useRouter();
  const top = match.reasons.filter((r) => r.ok).slice(0, 5);
  return (
    <article className="group card flex cursor-pointer flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift" onClick={() => navigate(`/exp/${exp.id}`)}>
      <CardImage exp={exp} match={match} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[17px] font-bold leading-snug">{exp.title}</h3>
          <Rating value={exp.rating} className="mt-0.5 shrink-0" />
        </div>
        <MetaRow exp={exp} match={match} className="mt-1.5" />
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-dashed border-ink-200/80 pt-2 text-[12px]">
          <span className="truncate font-medium text-ink-600">by {exp.provider.host}</span>
          <InstagramLink url={getInstagramUrl(exp)} variant="pill" />
        </div>
        {!compactChecks && (
          <div className="mt-3 space-y-1.5 border-t border-dashed border-ink-200 pt-3">
            {[
              match.reasons.find((r) => r.kind === 'time' && r.ok) && 'Fits your schedule',
              match.reasons.find((r) => r.kind === 'budget' && r.ok) && 'Within budget',
              exp.familyFriendly && 'Family friendly',
              `${km(match.distance)} away`,
              match.nextSlot && (match.nextSlot.time - 960 <= 45 ? 'Available now' : `Available at ${clock(match.nextSlot.time)}`),
            ]
              .filter(Boolean)
              .slice(0, 5)
              .map((t) => (
                <Check key={t as string}>{t}</Check>
              ))}
          </div>
        )}
        {compactChecks && (
          <div className="mt-3 space-y-1">
            {top.slice(0, 2).map((r) => (
              <Check key={r.text}>{r.text}</Check>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          {match.nextSlot ? <Availability left={match.nextSlot.left} /> : <Availability left={0} />}
          <div className="flex items-center gap-1.5">
            {getInstagramUrl(exp) && <InstagramLink url={getInstagramUrl(exp)} variant="icon" />}
            <Button
              size="sm"
              variant="dark"
              iconRight={<ArrowRight size={15} />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/exp/${exp.id}`);
              }}
            >
              View Experience
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Rich recommendation row with the "Why this matches" explanation */
export function RecommendationCard({ exp, rank, match: given }: { exp: Experience; rank?: number; match?: MatchResult }) {
  const computed = useMatch(exp);
  const match = given ?? computed;
  const { navigate } = useRouter();
  const { addToPlan, planIds, saved, toggleSave } = useApp();
  const [open, setOpen] = useState(false);
  const shown = open ? match.reasons : match.reasons.slice(0, 4);
  const inPlan = planIds.includes(exp.id);
  return (
    <article className="group card overflow-hidden animate-fade-up">
      <div className="grid md:grid-cols-[300px_1fr]">
        <button className="block text-left" onClick={() => navigate(`/exp/${exp.id}`)} aria-label={`View ${exp.title}`}>
          <CardImage exp={exp} match={match} className="aspect-[16/10] h-full md:aspect-auto md:min-h-[260px]" big />
        </button>
        <div className="flex flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {rank === 0 && <div className="mb-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ai">Best fit for your plan</div>}
              <h3 className="text-lg font-bold leading-snug sm:text-xl">{exp.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Rating value={exp.rating} count={exp.reviews} />
                <span className="text-[12.5px] text-ink-500">{exp.area}</span>
              </div>
            </div>
            <div className="hidden sm:block">
              <MatchBadge score={match.score} variant="ring" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl bg-ink-50 p-2.5 text-center">
            {[
              { k: 'Distance', v: km(match.distance) },
              { k: 'Duration', v: dur(exp.durationMin) },
              { k: 'Price', v: exp.price === 0 ? 'Free' : inr(exp.price) },
              { k: 'Next slot', v: match.nextSlot ? clock(match.nextSlot.time).replace(':00', '') : '—' },
            ].map((m) => (
              <div key={m.k}>
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">{m.k}</div>
                <div className="mt-0.5 text-[14px] font-bold text-ink-950 tnum">{m.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink-950">Why this matches</span>
              {match.nextSlot && <Availability left={match.nextSlot.left} />}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {shown.map((r) => (
                <Check key={r.text} ok={r.ok}>
                  {r.text}
                </Check>
              ))}
            </div>
            {match.reasons.length > 4 && (
              <button onClick={() => setOpen((o) => !o)} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-600 hover:text-ink-900">
                {open ? 'Show less' : `+${match.reasons.length - 4} more reasons`}
                <ChevronDown size={14} className={cx('transition', open && 'rotate-180')} />
              </button>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <Button size="sm" variant="dark" onClick={() => navigate(`/exp/${exp.id}`)}>
              View
            </Button>
            <Button size="sm" variant="outline" icon={<Heart size={15} className={saved.includes(exp.id) ? 'fill-rani-500 text-rani-500' : ''} />} onClick={() => toggleSave(exp.id)}>
              {saved.includes(exp.id) ? 'Saved' : 'Save'}
            </Button>
            {getInstagramUrl(exp) && <InstagramLink url={getInstagramUrl(exp)} variant="pill" />}
            <Button size="sm" variant={inPlan ? 'secondary' : 'ai'} icon={<Plus size={15} />} onClick={() => (inPlan ? navigate('/itinerary') : addToPlan(exp.id))} className="ml-auto">
              {inPlan ? 'In your plan' : 'Add to itinerary'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Horizontal compact card for map sheets, chat, alternatives */
export function CompactExperience({ exp, onClick, action, active, matchOverride }: { exp: Experience; onClick?: () => void; action?: ReactNode; active?: boolean; matchOverride?: MatchResult }) {
  const m = useMatch(exp);
  const match = matchOverride ?? m;
  return (
    <div
      onClick={onClick}
      className={cx('flex cursor-pointer gap-3 rounded-2xl border bg-white p-2.5 transition hover:border-ink-300', active ? 'border-brand-400 ring-4 ring-brand-100' : 'border-ink-100')}
    >
      <div className="relative h-[84px] w-[92px] shrink-0 overflow-hidden rounded-xl">
        <SceneArt image={exp.image} alt={exp.title} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 text-[14px] font-bold leading-snug text-ink-950">{exp.title}</h4>
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] font-bold text-brand-700 tnum">{match.score}%</span>
        </div>
        <MetaRow exp={exp} match={match} className="mt-1 !text-[12px]" />
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="flex items-center gap-2 text-[12px] text-ink-500">
            <Rating value={exp.rating} />
            {exp.indoor && (
              <span className="inline-flex items-center gap-0.5">
                <CloudRain size={12} /> Indoor
              </span>
            )}
            {exp.familyFriendly && (
              <span className="hidden items-center gap-0.5 sm:inline-flex">
                <Users size={12} /> Family
              </span>
            )}
            {exp.wheelchair && <Accessibility size={12} className="hidden sm:block" />}
          </span>
          <div className="flex items-center gap-1.5">
            {getInstagramUrl(exp) && <InstagramLink url={getInstagramUrl(exp)} variant="icon" size="sm" />}
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
