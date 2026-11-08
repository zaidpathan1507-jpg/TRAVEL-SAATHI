import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Sparkles, MapPin, Timer, Wallet, Users, Heart, Route, CheckCircle2, Loader2, ArrowRight, Pencil, Home as HomeIcon, Accessibility, Footprints, Leaf } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { DEMO_QUERY, recommend, type ParsedField } from '../lib/engine';
import { Button, Segmented, Badge } from '../components/ui';
import { cx, inr } from '../lib/format';

const ICONS: Record<string, typeof MapPin> = { location: MapPin, time: Timer, budget: Wallet, group: Users, interests: Heart, distance: Route, indoor: HomeIcon, access: Accessibility, walking: Footprints, veg: Leaf };

const STEPS = ['Reading your request', 'Extracting constraints', 'Scanning 152 experiences in Pune', 'Checking live availability & weather'];

const EXAMPLES = [
  'I have 3 hours in Pune with my family. We want local food and something cultural under ₹2000 and within 5 km.',
  'Solo, 2 hours, something artsy and indoor under ₹1000',
  'Evening with my wife, live music and dinner, walking distance',
  'Grandparents with us, no walking, heritage and sweets',
];

export default function Search() {
  const { trip, setTrip, setLastQuery, setTripEditorOpen, lastQuery, parseRequest } = useApp();
  const { path, navigate } = useRouter();
  const params = new URLSearchParams(path.split('?')[1] ?? '');
  const initial = params.get('q') ?? (lastQuery || DEMO_QUERY);
  const [text, setText] = useState(params.has('demo') || params.has('voice') ? '' : initial);
  const [stage, setStage] = useState<'idle' | 'listening' | 'thinking' | 'done'>(params.has('voice') ? 'listening' : 'idle');
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<ParsedField[]>([]);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clear, []);

  const run = (value: string) => {
    if (!value.trim()) return;
    clear();
    setStage('thinking');
    setStep(0);
    STEPS.forEach((_, i) => timers.current.push(window.setTimeout(() => setStep(i + 1), 380 * (i + 1))));
    timers.current.push(
      window.setTimeout(async () => {
        const { patch, fields } = await parseRequest(value);
        setTrip(patch);
        setLastQuery(value);
        setFields(fields);
        setStage('done');
      }, 380 * STEPS.length + 250),
    );
  };

  // typewriter for demo / simulated voice input
  useEffect(() => {
    if (!(params.has('demo') || params.has('voice'))) {
      if (params.has('q')) run(initial);
      return;
    }
    const full = DEMO_QUERY;
    let i = 0;
    const start = params.has('voice') ? 900 : 200;
    const tick = () => {
      i += 3;
      setText(full.slice(0, i));
      if (i < full.length) timers.current.push(window.setTimeout(tick, 18));
      else timers.current.push(window.setTimeout(() => run(full), 400));
    };
    timers.current.push(
      window.setTimeout(() => {
        setStage('idle');
        tick();
      }, start),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => recommend(trip), [trip]);
  const good = results.filter((r) => r.match.score >= 80);

  // keep displayed budget line in sync if user flips per-person / total
  const shown = fields.map((f) => (f.key === 'budget' ? { ...f, value: `${inr(trip.budget)} ${trip.budgetMode === 'person' ? 'per person' : 'total for group'}` } : f));

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <div>
          <Badge tone="ai" icon={<Sparkles size={12} />}>
            AI natural-language search
          </Badge>
          <h1 className="mt-3 text-[32px] font-extrabold leading-tight tracking-tight sm:text-[40px]">Tell us your plan in your own words.</h1>
          <p className="mt-2 text-[15px] text-ink-600">Time, budget, who’s with you, what you love. Travel Saathi turns it into a plan that actually fits.</p>
        </div>

        <form
          className={cx('rounded-[28px] bg-white p-4 shadow-lift transition sm:p-5', stage === 'listening' ? 'ring-4 ring-rani-100' : 'border-ai')}
          onSubmit={(e) => {
            e.preventDefault();
            run(text);
          }}
        >
          <label htmlFor="ai-query" className="sr-only">
            Describe what you want to experience
          </label>
          <textarea
            id="ai-query"
            rows={4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (stage === 'done') setStage('idle');
            }}
            placeholder={stage === 'listening' ? 'Listening…' : 'I have 3 hours in Pune with my family…'}
            className="w-full resize-none bg-transparent font-display text-[20px] font-medium leading-snug text-ink-950 outline-none placeholder:text-ink-300 sm:text-[24px]"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              aria-label="Voice input"
              onClick={() => {
                setStage('listening');
                setText('');
                timers.current.push(
                  window.setTimeout(() => {
                    setText(DEMO_QUERY);
                    setStage('idle');
                  }, 1600),
                );
              }}
              className={cx('flex h-11 items-center gap-2 rounded-2xl px-3.5 text-[13px] font-semibold transition', stage === 'listening' ? 'bg-rani-500 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}
            >
              <Mic size={18} />
              {stage === 'listening' ? (
                <span className="flex items-end gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="w-0.5 animate-bob rounded bg-white" style={{ height: 6 + (i % 3) * 4, animationDelay: `${i * 0.1}s`, animationDuration: '.6s' }} />
                  ))}
                </span>
              ) : (
                <span className="hidden sm:inline">Speak</span>
              )}
            </button>
            <span className="ml-auto hidden text-[12px] text-ink-400 sm:block">Hindi, Marathi & English understood</span>
            <Button type="submit" variant="ai" icon={<Sparkles size={16} />} disabled={!text.trim() || stage === 'thinking'}>
              {stage === 'done' ? 'Re-analyse' : 'Understand'}
            </Button>
          </div>
        </form>

        {stage === 'thinking' && (
          <div className="card space-y-3 p-5 animate-fade-up">
            {STEPS.map((s, i) => (
              <div key={s} className={cx('flex items-center gap-3 text-[14px] transition', i < step ? 'text-ink-900' : i === step ? 'text-ink-700' : 'text-ink-300')}>
                {i < step ? <CheckCircle2 size={18} className="text-leaf-500" /> : i === step ? <Loader2 size={18} className="animate-spin text-brand-500" /> : <span className="h-[18px] w-[18px] rounded-full border-2 border-ink-200" />}
                {s}
              </div>
            ))}
          </div>
        )}

        {stage === 'done' && (
          <div className="card overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between gap-3 bg-ai-soft px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-ai text-white">
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <div className="font-display text-[18px] font-bold text-ink-950">AI understood your request</div>
                  <div className="text-[12.5px] text-ink-600">{shown.filter((f) => !f.assumed).length} constraints extracted · tap edit to adjust</div>
                </div>
              </div>
              <button onClick={() => setTripEditorOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-bold text-ink-800 shadow-sm">
                <Pencil size={13} /> Edit
              </button>
            </div>
            <div className="grid gap-px bg-ink-100 sm:grid-cols-2">
              {shown.map((f, i) => {
                const Icon = ICONS[f.key] ?? Sparkles;
                return (
                  <div key={f.key} className="flex items-start gap-3 bg-white px-5 py-4 animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                    <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', f.assumed ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-600')}>
                      <Icon size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                        {f.label}
                        {f.assumed && <span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-bold normal-case tracking-normal text-amber-700">assumed</span>}
                      </div>
                      <div className="mt-0.5 text-[16px] font-bold text-ink-950">{f.value}</div>
                      {f.key === 'budget' && (
                        <Segmented
                          className="mt-2"
                          value={trip.budgetMode}
                          onChange={(v) => setTrip({ budgetMode: v })}
                          options={[
                            { value: 'person', label: 'Per person' },
                            { value: 'group', label: 'Total' },
                          ]}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 border-t border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[13.5px] text-ink-600">
                <span className="font-bold text-ink-950">{good.length} experiences</span> fit all your constraints. Best: <span className="font-semibold text-ink-900">{results[0]?.exp.title}</span> ({results[0]?.match.score}%)
              </div>
              <Button size="lg" iconRight={<ArrowRight size={18} />} onClick={() => navigate('/results')}>
                Find Experiences
              </Button>
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <div className="eyebrow mb-3">Try asking</div>
          <div className="space-y-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setText(e);
                  run(e);
                }}
                className="block w-full rounded-2xl bg-ink-50 px-3.5 py-3 text-left text-[13.5px] font-medium leading-snug text-ink-800 hover:bg-brand-50"
              >
                “{e}”
              </button>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="eyebrow mb-3">What Travel Saathi checks</div>
          <ul className="space-y-2 text-[13.5px] text-ink-700">
            {['Travel time from where you are', 'Opening hours & live slots', 'Per-person and group budget', 'Kid, elderly & wheelchair fit', 'Weather in the next 3 hours', 'What’s already in your plan'].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-leaf-500" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
