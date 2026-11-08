import { useEffect, useRef, useState } from 'react';
import { Send, Mic, X, Sparkles, CalendarClock, Plus, ArrowRight, Maximize2 } from 'lucide-react';
import { useApp, type ChatMsg } from '../store/AppStore';
import { useRouter } from '../router';
import { byId, CATEGORY_META } from '../data/experiences';
import { buildPlan, compressPlan, groupLabel, parseQuery, recommend } from '../lib/engine';
import type { Category, Experience, Trip } from '../lib/types';
import { CompactExperience } from './ExperienceCard';
import { LogoMark } from './Logo';
import { clock, cx, dur, inr } from '../lib/format';

const SUGGESTIONS = ['Make it cheaper', 'Remove walking', 'Add shopping', 'I have 30 minutes less', 'Find something indoors', 'Book this'];

const CAT_WORDS: [Category, RegExp][] = [
  ['food', /food|eat|🍛/i],
  ['culture', /culture|cultural|🎭/i],
  ['shopping', /shop|market|🛍/i],
  ['art', /art|pottery|craft/i],
  ['history', /history|heritage/i],
  ['music', /music/i],
  ['nature', /nature|hill|park/i],
];

export function AIChat({ variant = 'drawer', onClose }: { variant?: 'drawer' | 'page'; onClose?: () => void }) {
  const app = useApp();
  const { messages, setMessages, trip, setTrip, planIds, setPlanIds, startCheckout, logAdapt, toast } = app;
  const { navigate } = useRouter();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [ctxMinutes, setCtxMinutes] = useState(120);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const lastCards = [...messages].reverse().find((m) => m.cards?.length)?.cards ?? [];
  const nextId = () => Date.now() + Math.random();

  const ctxTrip = (extra: Partial<Trip> = {}): Trip => ({ ...trip, minutes: ctxMinutes, ...extra });
  const nearby = (t: Trip, filter: (e: Experience) => boolean = () => true) =>
    recommend(t)
      .filter((r) => r.match.travel <= 20 && r.match.nextSlot && r.exp.durationMin + r.match.travel * 2 <= t.minutes && filter(r.exp))
      .slice(0, 3)
      .map((r) => r.exp.id);

  function reply(text: string): ChatMsg {
    const q = text.toLowerCase();
    const cat = CAT_WORDS.find(([, re]) => re.test(q) && q.length < 22)?.[0];

    if (/book/.test(q)) {
      const ids = planIds.length && !lastCards.length ? planIds : lastCards.slice(0, 1);
      if (!ids.length) return { id: nextId(), role: 'ai', text: 'Pick an experience first and I’ll hold the seats for you.', chips: ['🍛 Food', '🎭 Culture'] };
      setTimeout(() => {
        startCheckout(ids);
        navigate('/booking');
        onClose?.();
      }, 900);
      return { id: nextId(), role: 'ai', text: `Holding seats for ${ids.map((i) => byId(i).title).join(' + ')}. Opening checkout…` };
    }

    if (/cheap|budget|less money|lower price/.test(q)) {
      const ref = lastCards.length ? Math.min(...lastCards.map((i) => byId(i).price)) : 700;
      const ids = nearby(ctxTrip(), (e) => e.price < ref).length ? nearby(ctxTrip(), (e) => e.price < ref) : nearby(ctxTrip()).sort((a, b) => byId(a).price - byId(b).price);
      const save = ref - Math.min(...ids.map((i) => byId(i).price));
      return { id: nextId(), role: 'ai', text: `Here are cheaper picks nearby — up to ${inr(Math.max(0, save))} less per person, still family friendly.`, cards: ids };
    }

    if (/walk/.test(q)) {
      setTrip({ lowWalking: true });
      const ids = nearby(ctxTrip({ lowWalking: true }), (e) => e.walking === 'low');
      const heavy = planIds.filter((i) => byId(i).walking !== 'low');
      return {
        id: nextId(),
        role: 'ai',
        text: `Done. I’ll only suggest seated or step-free experiences.${heavy.length ? ` Heads up: ${byId(heavy[0]).title} in your plan involves ${byId(heavy[0]).walking === 'high' ? 'a lot of' : 'some'} walking.` : ''}`,
        cards: ids,
        actions: heavy.length ? [{ label: `Swap ${byId(heavy[0]).title.split(' ').slice(0, 3).join(' ')}`, cmd: `swap:${heavy[0]}:${ids[0]}`, primary: true }] : undefined,
      };
    }

    if (/shopping|shop|market/.test(q) && /add/.test(q)) {
      const shop = recommend({ ...trip, interests: ['shopping'] }).find((r) => r.exp.category === 'shopping' && !planIds.includes(r.exp.id));
      if (!shop) return { id: nextId(), role: 'ai', text: 'I couldn’t find a shopping stop that fits right now.' };
      const next = [...planIds, shop.exp.id];
      const p = buildPlan(next, trip);
      if (planIds.length && p.totalMin <= trip.minutes + 30) {
        setPlanIds(next);
        logAdapt({ kind: 'chat', text: `Added ${shop.exp.title} via Anvesha AI` });
        return { id: nextId(), role: 'ai', text: `Added ${shop.exp.title} at the end of your plan. You’ll be back at the hotel by ${clock(p.endMin)}.`, cards: [shop.exp.id], plan: true };
      }
      return { id: nextId(), role: 'ai', text: `${shop.exp.title} is the best shopping stop near you (${dur(shop.exp.durationMin)}). Want me to add it?`, cards: [shop.exp.id] };
    }

    if (/(\d+)\s*(min|minutes).*less|less time|shorter/.test(q)) {
      const cut = parseInt(q.match(/(\d+)/)?.[1] ?? '30');
      if (!planIds.length) {
        setCtxMinutes((m) => Math.max(30, m - cut));
        const ids = nearby(ctxTrip({ minutes: Math.max(30, ctxMinutes - cut) }));
        return { id: nextId(), role: 'ai', text: `No problem — you now have ${dur(Math.max(30, ctxMinutes - cut))}. These still fit comfortably:`, cards: ids };
      }
      const newMin = Math.max(45, trip.minutes - cut);
      const res = compressPlan(planIds, trip, newMin);
      setTrip({ minutes: newMin });
      setPlanIds(res.ids);
      logAdapt({ kind: 'time', text: `Plan shortened to ${dur(newMin)} via chat` });
      const parts = [res.removed.length && `removed ${res.removed.map((i) => byId(i).title).join(', ')}`, res.added.length && `added ${res.added.map((i) => byId(i).title).join(', ')}`].filter(Boolean);
      return {
        id: nextId(),
        role: 'ai',
        text: parts.length ? `Updated your plan for ${dur(newMin)}: ${parts.join(' and ')}. ${res.saved} minutes saved.` : `Your plan already fits in ${dur(newMin)}. Nothing to change.`,
        plan: true,
        actions: [{ label: 'View plan', cmd: 'nav:/itinerary' }],
      };
    }

    if (/indoor|rain/.test(q)) {
      const ids = nearby(ctxTrip({ weather: 'rain' }), (e) => e.indoor);
      return { id: nextId(), role: 'ai', text: 'All of these are fully covered, so rain won’t matter:', cards: ids };
    }

    if (/plan|itinerary/.test(q)) {
      return { id: nextId(), role: 'ai', text: planIds.length ? 'Here’s your current plan.' : 'You don’t have a plan yet. Add any experience and I’ll build one around it.', plan: planIds.length > 0, actions: [{ label: 'Open itinerary', cmd: 'nav:/itinerary' }] };
    }

    if (cat) {
      const ids = nearby(ctxTrip({ interests: [cat] }), (e) => e.tags.includes(cat));
      return { id: nextId(), role: 'ai', text: `${CATEGORY_META[cat].emoji} ${ids.length} ${CATEGORY_META[cat].label.toLowerCase()} experiences you can reach in under 20 minutes and finish before dinner:`, cards: ids };
    }

    // free text: extract constraints
    const { patch, fields } = parseQuery(text, trip);
    if (patch.minutes && patch.minutes !== trip.minutes) setCtxMinutes(patch.minutes);
    const t2 = { ...ctxTrip(), ...patch };
    const understood = fields.filter((f) => !f.assumed).map((f) => `${f.label}: ${f.value}`);
    const ids = nearby(t2);
    return {
      id: nextId(),
      role: 'ai',
      text: understood.length ? `Got it — ${understood.join(' · ')}. Here’s what fits:` : `Here’s what fits your ${dur(t2.minutes)} for ${groupLabel(t2).toLowerCase()}:`,
      cards: ids,
    };
  }

  function send(text: string) {
    if (!text.trim() || typing) return;
    setMessages((m) => [...m, { id: nextId(), role: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const r = reply(text);
      setMessages((m) => [...m, r]);
      setTyping(false);
    }, 750);
  }

  function runCmd(cmd: string) {
    if (cmd.startsWith('nav:')) {
      navigate(cmd.slice(4));
      onClose?.();
    } else if (cmd.startsWith('swap:')) {
      const [, from, to] = cmd.split(':');
      if (to) {
        setPlanIds(planIds.map((x) => (x === from ? to : x)));
        toast({ title: 'Plan updated', body: `${byId(to).title} replaces ${byId(from).title}`, tone: 'ai' });
        setMessages((m) => [...m, { id: nextId(), role: 'ai', text: `Swapped in ${byId(to).title}. Less walking, same vibe.`, plan: true }]);
      }
    } else if (cmd.startsWith('add:')) {
      app.addToPlan(cmd.slice(4));
    }
  }

  const plan = buildPlan(planIds, trip);

  return (
    <div className={cx('flex h-full flex-col bg-ink-50', variant === 'page' && 'overflow-hidden rounded-[28px] border border-ink-100 shadow-card')}>
      {/* header */}
      <div className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-3">
        <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-ink-950">
          <LogoMark size={26} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-leaf-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-bold text-ink-950">Travel Saathi AI</div>
          <div className="truncate text-[12px] text-ink-500">
            Knows your plan · {trip.city} · {groupLabel(trip)} · near {'Deccan'}
          </div>
        </div>
        {variant === 'drawer' && (
          <>
            <button
              aria-label="Open full screen"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
              onClick={() => {
                onClose?.();
                navigate('/chat');
              }}
            >
              <Maximize2 size={16} />
            </button>
            <button aria-label="Close assistant" className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200" onClick={onClose}>
              <X size={18} />
            </button>
          </>
        )}
      </div>

      {/* live context */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-ink-100 bg-white/70 px-4 py-2 no-scrollbar">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-700">
          <CalendarClock size={12} /> {planIds.length ? `${planIds.length} stops · back by ${clock(plan.endMin)}` : 'No plan yet'}
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-ink-100 px-2.5 py-1 text-[11.5px] font-semibold text-ink-700">{trip.weather === 'rain' ? '🌧 Rain from 5 PM' : '⛅ 29°C, clear till 5 PM'}</span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-ink-100 px-2.5 py-1 text-[11.5px] font-semibold text-ink-700">It’s 4:00 PM</span>
      </div>

      {/* messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((m) => (
          <div key={m.id} className={cx('flex animate-fade-up', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] rounded-[20px] rounded-br-md bg-ink-950 px-4 py-2.5 text-[14px] text-white">{m.text}</div>
            ) : (
              <div className="flex max-w-[92%] gap-2">
                <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ai text-white">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0 space-y-2.5">
                  <div className="rounded-[20px] rounded-tl-md bg-white px-4 py-2.5 text-[14px] leading-relaxed text-ink-900 shadow-sm">{m.text}</div>
                  {m.chips && (
                    <div className="flex flex-wrap gap-2">
                      {m.chips.map((c) => (
                        <button key={c} onClick={() => send(c)} className="h-9 rounded-full border border-ink-200 bg-white px-3.5 text-[13px] font-semibold text-ink-800 hover:border-brand-400 hover:bg-brand-50">
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.cards && m.cards.length > 0 && (
                    <div className="space-y-2">
                      {m.cards.map((id) => {
                        const inPlan = planIds.includes(id);
                        return (
                          <CompactExperience
                            key={id}
                            exp={byId(id)}
                            onClick={() => {
                              navigate(`/exp/${id}`);
                              onClose?.();
                            }}
                            action={
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  inPlan ? runCmd('nav:/itinerary') : runCmd('add:' + id);
                                }}
                                className={cx('inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold', inPlan ? 'bg-leaf-50 text-leaf-700' : 'bg-ink-950 text-white')}
                              >
                                {inPlan ? 'In plan' : (
                                  <>
                                    <Plus size={12} /> Add
                                  </>
                                )}
                              </button>
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                  {m.plan && planIds.length > 0 && (
                    <button onClick={() => runCmd('nav:/itinerary')} className="block w-full rounded-2xl border border-ink-100 bg-white p-3 text-left hover:border-ink-300">
                      <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-ink-500">
                        <span>YOUR PLAN · {dur(plan.totalMin)}</span>
                        <span className="text-ink-900 tnum">{inr(plan.perPerson)}/person</span>
                      </div>
                      {plan.items
                        .filter((i) => i.kind === 'activity')
                        .map((i) => (
                          <div key={i.expId} className="flex items-center gap-2 py-0.5 text-[13px]">
                            <span className="w-16 text-ink-500 tnum">{clock(i.start)}</span>
                            <span className="truncate font-semibold text-ink-900">{i.label}</span>
                          </div>
                        ))}
                    </button>
                  )}
                  {m.actions && (
                    <div className="flex flex-wrap gap-2">
                      {m.actions.map((a) => (
                        <button key={a.cmd} onClick={() => runCmd(a.cmd)} className={cx('inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-[13px] font-bold', a.primary ? 'bg-ai text-white' : 'bg-ink-950 text-white')}>
                          {a.label} <ArrowRight size={14} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-ai text-white">
              <Sparkles size={14} />
            </div>
            <div className="flex gap-1 rounded-full bg-white px-4 py-3 shadow-sm">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-ink-300 animate-bob" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* suggestions + input */}
      <div className="border-t border-ink-100 bg-white pb-safe">
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 no-scrollbar">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="h-8 shrink-0 rounded-full bg-brand-50 px-3 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-100">
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className={cx('flex h-12 flex-1 items-center rounded-2xl border bg-ink-50 pl-4 pr-1.5 transition', listening ? 'border-rani-400 ring-4 ring-rani-100' : 'border-ink-200 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100')}>
            <input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask anything about your trip'} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-400" />
            <button
              type="button"
              aria-label="Voice input"
              onClick={() => {
                setListening(true);
                setTimeout(() => {
                  setListening(false);
                  setInput('Find something indoors near me');
                }, 1400);
              }}
              className={cx('grid h-9 w-9 place-items-center rounded-xl', listening ? 'bg-rani-500 text-white' : 'text-ink-500 hover:bg-ink-100')}
            >
              <Mic size={17} />
            </button>
          </div>
          <button type="submit" aria-label="Send" className="grid h-12 w-12 place-items-center rounded-2xl bg-ai text-white shadow-float disabled:opacity-50" disabled={!input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
