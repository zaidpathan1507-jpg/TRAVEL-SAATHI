import { Sparkles, Clock, IndianRupee, Route, AlertTriangle, ArrowRight, Star } from 'lucide-react';
import type { TripPlan } from '../api/client';
import { getCategoryMeta } from '../data/experiences';
import { Badge, Button } from './ui';
import { clock, dur, inr, km } from '../lib/format';

interface Props {
  plans: TripPlan[];
  /** shortlist place id -> experience id used by the details page and the itinerary */
  expIdFor: Record<string, string>;
  /** experience ids that exist in the Anvesha catalog (these can be added to the itinerary) */
  bookable: Set<string>;
  onOpen: (expId: string) => void;
  onUse: (plan: TripPlan) => void;
}

export function PlanCards({ plans, expIdFor, bookable, onOpen, onUse }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {plans.map((plan, i) => {
        const usable = plan.stops.filter((s) => bookable.has(expIdFor[s.placeId])).length;
        return (
          <article key={plan.id} className="card flex flex-col overflow-hidden animate-fade-up">
            <div className="p-4 pb-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="eyebrow">Plan {i + 1}</span>
                <Badge tone={plan.source === 'gemini' ? 'ai' : 'neutral'} icon={<Sparkles size={12} />}>
                  {plan.source === 'gemini' ? 'AI plan' : 'Local plan'}
                </Badge>
              </div>
              <h3 className="text-[19px] font-extrabold leading-tight text-ink-950">{plan.title}</h3>
              {plan.tagline && <p className="mt-0.5 text-[13.5px] text-ink-600">{plan.tagline}</p>}
            </div>

            <ol className="space-y-2 px-4">
              {plan.stops.map((s, k) => {
                const cat = getCategoryMeta(s.category ?? undefined);
                const expId = expIdFor[s.placeId];
                return (
                  <li key={s.placeId} className="grid grid-cols-[58px_1fr] gap-2">
                    <div className="pt-0.5 text-right">
                      <div className="text-[13px] font-bold text-ink-950 tnum">{clock(s.start)}</div>
                      <div className="text-[11.5px] text-ink-500 tnum">{dur(s.durationMin)}</div>
                    </div>
                    <div className="rounded-2xl border border-ink-100 bg-white p-2.5">
                      <button
                        className="text-left text-[14px] font-bold text-ink-950 hover:underline disabled:no-underline"
                        disabled={!expId}
                        onClick={() => expId && onOpen(expId)}
                      >
                        {k + 1}. {s.name}
                      </button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-600">
                        <span>
                          <span aria-hidden>{cat.emoji}</span> {cat.label}
                        </span>
                        {s.rating != null && (
                          <span className="inline-flex items-center gap-0.5">
                            <Star size={11} className="fill-amber-400 text-amber-400" /> {s.rating.toFixed(1)}
                          </span>
                        )}
                        <span>{s.costPerPerson == null ? 'Price varies' : s.costPerPerson === 0 ? 'Free' : `${s.costEstimated ? '~' : ''}${inr(s.costPerPerson)}/person`}</span>
                        {s.travelMin > 0 && <span className="text-ink-500">{s.travelMin} min travel</span>}
                      </div>
                      {s.note && <p className="mt-1 text-[12.5px] italic text-ink-600">{s.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 px-4 py-3 text-[12.5px] font-semibold text-ink-800">
              <span className="inline-flex items-center gap-1">
                <Clock size={13} className="text-ink-400" /> {dur(plan.totalMin)} · ends {clock(plan.endMin)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Route size={13} className="text-ink-400" /> {km(plan.travelKm)}
              </span>
              <span className="inline-flex items-center gap-1">
                <IndianRupee size={13} className="text-ink-400" /> {inr(plan.perPerson)}/person · {inr(plan.groupCost)} group
              </span>
              <Badge tone={plan.withinBudget ? 'green' : 'amber'}>{plan.withinBudget ? 'Within budget' : 'Over budget'}</Badge>
            </div>

            {plan.why && <p className="px-4 pb-3 text-[13px] leading-relaxed text-ink-700">{plan.why}</p>}
            {plan.warnings.length > 0 && (
              <p className="flex items-start gap-1.5 px-4 pb-3 text-[12px] text-amber-700">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {plan.warnings.join(' · ')}
              </p>
            )}

            <div className="mt-auto p-4 pt-0">
              <Button size="sm" variant="dark" full iconRight={<ArrowRight size={15} />} onClick={() => onUse(plan)}>
                Use this plan
              </Button>
              {usable < plan.stops.length && (
                <p className="mt-1.5 text-center text-[11.5px] text-ink-500">
                  {usable === 0 ? 'Live places: view the route and weather here, booking is not available yet' : `${usable} of ${plan.stops.length} stops can be booked on Anvesha`}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
