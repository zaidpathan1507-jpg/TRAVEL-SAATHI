import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, User, Heart, Users, Baby, Briefcase, Accessibility, Footprints, Leaf, PersonStanding, Sunrise, Sun, Sunset, Moon, Shuffle } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { Button, ProgressSteps, Slider, Toggle } from '../components/ui';
import { CATEGORY_META } from '../data/experiences';
import type { Category, GroupType } from '../lib/types';
import { cx, inr } from '../lib/format';

const STEPS = ['Interests', 'Trip style', 'Who & access'];
const WALK = ['Minimal', 'A little', 'Some', 'Lots'];

export default function Onboarding() {
  const { trip, setTrip, toast, setOnboarded } = useApp();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<Category[]>(trip.interests);
  const [budget, setBudget] = useState(trip.budget);
  const [timePref, setTimePref] = useState('evening');
  const [walk, setWalk] = useState(2);
  const [type, setType] = useState<GroupType | 'business'>(trip.groupType);
  const [acc, setAcc] = useState({ wheel: false, low: false, veg: false, kids: true, elderly: false });

  const toggle = (c: Category) => setInterests((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const finish = () => {
    setTrip({
      interests: interests.length ? interests : ['food'],
      budget,
      groupType: type === 'business' ? 'solo' : type,
      lowWalking: acc.low || walk === 0,
      wheelchair: acc.wheel,
      vegetarian: acc.veg,
      ...(type === 'family' ? { adults: 2, children: 2 } : type === 'couple' ? { adults: 2, children: 0 } : type === 'solo' || type === 'business' ? { adults: 1, children: 0 } : { adults: 4, children: 0 }),
    });
    setOnboarded(true);
    toast({ title: 'Anvesha is personalised', body: 'Your picks are re-ranked', tone: 'ai' });
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => (step ? setStep(step - 1) : navigate('/'))} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white shadow-card">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <ProgressSteps steps={STEPS} current={step} />
        </div>
        <button onClick={() => navigate('/')} className="text-[13px] font-semibold text-ink-500 hover:text-ink-900">
          Skip
        </button>
      </div>

      {step === 0 && (
        <section className="animate-fade-up">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">What kind of experiences do you love?</h1>
          <p className="mt-2 text-[15px] text-ink-600">Pick as many as you like. We’ll never show you a generic top-10 list.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
              const on = interests.includes(c);
              return (
                <button key={c} onClick={() => toggle(c)} aria-pressed={on} className={cx('relative flex flex-col items-center gap-2 rounded-3xl border-2 bg-white px-3 py-5 transition active:scale-[.97]', on ? 'border-brand-500 shadow-ring' : 'border-transparent shadow-card hover:border-ink-200')}>
                  <span className="text-[34px] leading-none" aria-hidden>
                    {CATEGORY_META[c].emoji}
                  </span>
                  <span className="text-[14px] font-bold text-ink-900">{CATEGORY_META[c].label}</span>
                  {on && <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">✓</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="animate-fade-up space-y-5">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">How do you like to travel?</h1>
          <div className="card p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[15px] font-bold">Budget per experience</span>
              <span className="font-display text-[20px] font-bold text-brand-600 tnum">{inr(budget)}</span>
            </div>
            <Slider id="ob-budget" value={budget} min={200} max={5000} step={100} onChange={setBudget} format={inr} marks={['₹200', 'Budget', 'Mid', 'Premium', '₹5k']} />
          </div>
          <div className="card p-5">
            <div className="mb-3 text-[15px] font-bold">When do you like to explore?</div>
            <div className="grid grid-cols-5 gap-2">
              {[
                ['morning', 'Morning', Sunrise],
                ['afternoon', 'Afternoon', Sun],
                ['evening', 'Evening', Sunset],
                ['night', 'Night', Moon],
                ['any', 'Flexible', Shuffle],
              ].map(([v, l, I]) => {
                const Icon = I as typeof Sun;
                return (
                  <button key={v as string} onClick={() => setTimePref(v as string)} className={cx('flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-[12px] font-bold', timePref === v ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-100 text-ink-700 hover:border-ink-300')}>
                    <Icon size={20} />
                    {l as string}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[15px] font-bold">How much walking is okay?</span>
              <span className="inline-flex items-center gap-1 text-[14px] font-bold text-brand-600">
                <Footprints size={16} /> {WALK[walk]}
              </span>
            </div>
            <Slider id="ob-walk" value={walk} min={0} max={3} onChange={setWalk} format={(v) => WALK[v]} marks={WALK} />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="animate-fade-up space-y-5">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">Who’s travelling?</h1>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['solo', 'Solo', User],
              ['couple', 'Couple', Heart],
              ['family', 'Family', Baby],
              ['friends', 'Friends', Users],
              ['business', 'Business', Briefcase],
            ].map(([v, l, I]) => {
              const Icon = I as typeof User;
              const on = type === v;
              return (
                <button key={v as string} onClick={() => setType(v as GroupType)} className={cx('flex flex-col items-center gap-2 rounded-3xl border-2 bg-white py-5 transition', on ? 'border-brand-500 shadow-ring' : 'border-transparent shadow-card hover:border-ink-200')}>
                  <span className={cx('grid h-12 w-12 place-items-center rounded-2xl', on ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-700')}>
                    <Icon size={22} />
                  </span>
                  <span className="text-[14px] font-bold">{l as string}</span>
                </button>
              );
            })}
          </div>
          <div className="card divide-y divide-ink-100 px-5">
            <div className="flex items-center gap-2 py-3 text-[15px] font-bold">
              <Accessibility size={18} className="text-sky2-500" /> Accessibility & needs
            </div>
            <Toggle id="ob-wheel" label="Wheelchair accessible" desc="Only show step-free experiences" checked={acc.wheel} onChange={(v) => setAcc({ ...acc, wheel: v })} />
            <Toggle id="ob-low" label="Minimal walking" desc="Prefer seated or short-walk options" checked={acc.low} onChange={(v) => setAcc({ ...acc, low: v })} />
            <Toggle id="ob-elderly" label="Elderly-friendly" desc="Benches, shade and restrooms nearby" checked={acc.elderly} onChange={(v) => setAcc({ ...acc, elderly: v })} />
            <Toggle id="ob-kids" label="Kid-friendly" desc="Ages 3–12 welcome" checked={acc.kids} onChange={(v) => setAcc({ ...acc, kids: v })} />
            <Toggle id="ob-veg" label="Vegetarian food only" desc="Jain options highlighted" checked={acc.veg} onChange={(v) => setAcc({ ...acc, veg: v })} />
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-leaf-50 px-4 py-3 text-[13px] text-leaf-700">
            <Leaf size={16} /> <PersonStanding size={16} /> We use this only to filter experiences. Hosts never see it.
          </div>
        </section>
      )}

      <div className="sticky bottom-[84px] mt-8 flex gap-3 lg:bottom-4">
        {step > 0 && (
          <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button size="lg" className="flex-1" iconRight={<ArrowRight size={18} />} onClick={() => setStep(step + 1)} disabled={step === 0 && interests.length === 0}>
            Continue{step === 0 && interests.length ? ` · ${interests.length} selected` : ''}
          </Button>
        ) : (
          <Button size="lg" variant="ai" className="flex-1" icon={<Sparkles size={18} />} onClick={finish}>
            Show my picks
          </Button>
        )}
      </div>
    </div>
  );
}
