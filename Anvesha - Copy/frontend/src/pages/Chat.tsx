import { AIChat } from '../components/AIChat';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { buildPlan } from '../lib/engine';
import { TripChips } from '../components/TripPanel';
import { clock, dur, inr } from '../lib/format';
import { Sparkles, Zap, Wallet, Footprints, ShoppingBag, CloudRain, Timer } from 'lucide-react';

export default function Chat() {
  const { trip, planIds, setTripEditorOpen } = useApp();
  const { navigate } = useRouter();
  const plan = buildPlan(planIds, trip);
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="hidden space-y-4 lg:block">
        <div className="card p-5">
          <div className="eyebrow mb-2">Trip context</div>
          <TripChips trip={trip} className="!gap-1.5" onEdit={() => setTripEditorOpen(true)} />
        </div>
        <div className="card p-5">
          <div className="eyebrow mb-2">Current plan</div>
          {planIds.length ? (
            <>
              <div className="text-[15px] font-bold text-ink-950">
                {planIds.length} stops · {dur(plan.totalMin)} · {inr(plan.perPerson)}/person
              </div>
              <ul className="mt-2 space-y-1 text-[13px] text-ink-700">
                {plan.items
                  .filter((i) => i.kind === 'activity')
                  .map((i) => (
                    <li key={i.expId} className="flex gap-2">
                      <span className="w-16 shrink-0 text-ink-500 tnum">{clock(i.start)}</span>
                      <span className="truncate">{i.label}</span>
                    </li>
                  ))}
              </ul>
              <button onClick={() => navigate('/itinerary')} className="mt-3 text-[13px] font-bold text-brand-700">
                Open itinerary →
              </button>
            </>
          ) : (
            <p className="text-[13px] text-ink-600">No plan yet. Ask the assistant or add any experience.</p>
          )}
        </div>
        <div className="card p-5">
          <div className="eyebrow mb-3">Things you can say</div>
          <ul className="space-y-2.5 text-[13px] text-ink-700">
            {[
              [Wallet, 'Make it cheaper'],
              [Footprints, 'Remove walking'],
              [ShoppingBag, 'Add shopping'],
              [Timer, 'I have 30 minutes less'],
              [CloudRain, 'Find something indoors'],
              [Zap, 'Book this'],
            ].map(([I, t]) => {
              const Icon = I as typeof Wallet;
              return (
                <li key={t as string} className="flex items-center gap-2">
                  <Icon size={15} className="text-brand-500" /> {t as string}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-ai-soft p-3 text-[12.5px] text-ink-700">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-rani-500" /> Changes you make here update your itinerary and map instantly.
          </div>
        </div>
      </aside>
      <div className="-mx-4 -mt-4 h-[calc(100dvh-64px-68px)] sm:mx-0 sm:mt-0 lg:h-[calc(100vh-64px-64px)]">
        <AIChat variant="page" />
      </div>
    </div>
  );
}
