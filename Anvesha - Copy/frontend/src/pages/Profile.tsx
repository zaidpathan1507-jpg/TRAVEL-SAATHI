import { useState } from 'react';
import { MapPin, Settings, Star, Heart, CalendarRange, Ticket, MessageSquareText, SlidersHorizontal, ChevronRight, Store, Palette, LogOut, User } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useAuth } from '../store/AuthContext';
import { useRouter } from '../router';
import { CATEGORY_META, byId } from '../data/experiences';
import { Badge, Button, Empty, Rating } from '../components/ui';
import { ExperienceCard } from '../components/ExperienceCard';
import { SceneArt } from '../components/SceneArt';
import { buildPlan, groupLabel } from '../lib/engine';
import { clock, cx, dur, inr } from '../lib/format';
import { dayLabel } from '../data/provider';

type Tab = 'trips' | 'bookings' | 'saved' | 'reviews' | 'prefs';

export default function Profile() {
  const { trip, saved, travelerBookings, planIds } = useApp();
  const { user, logout } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('trips');
  const plan = buildPlan(planIds, trip);

  const TABS: { v: Tab; label: string; icon: typeof Heart; count?: number }[] = [
    { v: 'trips', label: 'My Trips', icon: CalendarRange },
    { v: 'bookings', label: 'Bookings', icon: Ticket, count: travelerBookings.length },
    { v: 'saved', label: 'Saved', icon: Heart, count: saved.length },
    { v: 'reviews', label: 'Reviews', icon: MessageSquareText, count: 2 },
    { v: 'prefs', label: 'Preferences', icon: SlidersHorizontal },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <div className="card overflow-hidden">
          <div className="h-20 bg-ai" />
          <div className="-mt-10 px-5 pb-5">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border-4 border-white bg-gradient-to-br from-brand-300 to-rani-400 font-display text-2xl font-bold text-white">
              {user?.avatar || 'AS'}
            </div>
            <h1 className="mt-3 text-[22px] font-bold">{user?.name || 'Ananya Sharma'}</h1>
            <div className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-500">
              <MapPin size={13} /> From Bengaluru · exploring {trip.city}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['6', 'trips'],
                ['23', 'experiences'],
                ['9', 'reviews'],
              ].map(([a, b]) => (
                <div key={b} className="rounded-2xl bg-ink-50 py-2.5">
                  <div className="font-display text-[18px] font-bold text-ink-950">{a}</div>
                  <div className="text-[11.5px] text-ink-500">{b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="eyebrow mb-2">Interests</div>
          <div className="flex flex-wrap gap-1.5">
            {trip.interests.map((i) => (
              <Badge key={i} tone="brand">
                {CATEGORY_META[i].emoji} {CATEGORY_META[i].label}
              </Badge>
            ))}
          </div>
          <dl className="mt-4 space-y-2.5 text-[13.5px]">
            {[
              ['Budget', `${inr(trip.budget)} ${trip.budgetMode === 'person' ? 'per person' : 'total'}`],
              ['Traveler type', groupLabel(trip)],
              ['Walking', trip.lowWalking ? 'Minimal' : 'Some walking is fine'],
              ['Accessibility', trip.wheelchair ? 'Wheelchair access' : 'No requirements'],
              ['Food', trip.vegetarian ? 'Vegetarian' : 'No preference'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-500">{k}</dt>
                <dd className="text-right font-semibold text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
          <Button variant="outline" size="sm" full className="mt-4" icon={<Settings size={15} />} onClick={() => navigate('/onboarding')}>
            Edit preferences
          </Button>
        </div>
        <div className="card divide-y divide-ink-100">
          <button onClick={() => navigate('/provider')} className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[14px] font-semibold text-ink-800 hover:bg-ink-50">
            <Store size={17} /> Switch to provider view <ChevronRight size={16} className="ml-auto text-ink-400" />
          </button>
          <button onClick={() => navigate('/login')} className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[14px] font-semibold text-ink-800 hover:bg-ink-50">
            <User size={17} /> Switch account / Login <ChevronRight size={16} className="ml-auto text-ink-400" />
          </button>
          <button onClick={logout} className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[14px] font-semibold text-red-600 hover:bg-red-50">
            <LogOut size={17} /> Log out <ChevronRight size={16} className="ml-auto text-red-300" />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button key={t.v} onClick={() => setTab(t.v)} className={cx('inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold', tab === t.v ? 'bg-ink-950 text-white' : 'bg-white text-ink-700 shadow-sm')}>
              <t.icon size={15} />
              {t.label}
              {!!t.count && <span className={cx('rounded-full px-1.5 text-[11px]', tab === t.v ? 'bg-white/20' : 'bg-ink-100')}>{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === 'trips' && (
          <div className="space-y-4">
            <button onClick={() => navigate(planIds.length ? '/itinerary' : '/results')} className="card flex w-full flex-col overflow-hidden text-left sm:flex-row">
              <div className="h-40 sm:h-auto sm:w-56">
                <SceneArt image="/images/experiences/pune-city.jpg" alt="Pune heritage landmark Shaniwar Wada" />
              </div>
              <div className="flex-1 p-5">
                <Badge tone="green">Now · in progress</Badge>
                <div className="mt-2 text-[20px] font-bold text-ink-950">Pune, family evening</div>
                <div className="text-[13.5px] text-ink-500">
                  Today · {planIds.length ? `${planIds.length} experiences · ${dur(plan.totalMin)} · back by ${clock(plan.endMin)}` : 'No experiences planned yet'}
                </div>
                <div className="mt-3 text-[13px] font-bold text-brand-700">{planIds.length ? 'Open itinerary →' : 'Plan with AI →'}</div>
              </div>
            </button>
            {[
              { city: 'Jaipur', when: 'Mar 2026', n: 7, art: 'palace' as const, note: 'Block printing, Amer at sunrise, Lassiwala', image: '/images/experiences/jaipur.jpg' },
              { city: 'Kochi', when: 'Dec 2025', n: 5, art: 'weave' as const, note: 'Kathakali, spice market, Fort Kochi café trail', image: '/images/experiences/kochi.jpg' },
            ].map((t) => (
              <div key={t.city} className="card flex overflow-hidden">
                <div className="w-28 shrink-0 sm:w-40">
                  <SceneArt image={t.image} alt={`${t.city} trip`} />
                </div>
                <div className="p-4">
                  <div className="text-[16px] font-bold text-ink-950">{t.city}</div>
                  <div className="text-[12.5px] text-ink-500">
                    {t.when} · {t.n} experiences
                  </div>
                  <div className="mt-1 text-[13px] text-ink-700">{t.note}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bookings' &&
          (travelerBookings.length ? (
            <div className="space-y-3">
              {travelerBookings.map((b) => (
                <div key={b.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-bold text-ink-950">{b.id}</span>
                    <Badge tone="green">Confirmed</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {b.expIds.map((id, i) => (
                      <div key={id} className="flex justify-between text-[13.5px]">
                        <span className="font-semibold text-ink-900">{byId(id).title}</span>
                        <span className="text-ink-500 tnum">{clock(b.times[i])}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-[13px]">
                    <span className="text-ink-500">
                      {dayLabel(b.date)} · {b.adults + b.children} guests
                    </span>
                    <span className="font-bold text-ink-950 tnum">{inr(b.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={<Ticket />} title="No bookings yet" body="Book an experience or your whole itinerary in one go." action={<Button onClick={() => navigate('/results')}>Find experiences</Button>} />
          ))}

        {tab === 'saved' &&
          (saved.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {saved.map((id) => (
                <ExperienceCard key={id} exp={byId(id)} compactChecks />
              ))}
            </div>
          ) : (
            <Empty icon={<Heart />} title="Nothing saved" body="Tap the heart on any experience to keep it here." />
          ))}

        {tab === 'reviews' && (
          <div className="space-y-3">
            {[
              { id: 'warli-workshop', text: 'Meditative and beautiful. The artist’s stories were the best part.', r: 5, when: 'Mar 2026' },
              { id: 'irani-cafe-trail', text: 'Bun maska heaven. Farhad knows every café owner by name.', r: 5, when: 'Nov 2025' },
            ].map((r) => (
              <div key={r.id} className="card flex gap-4 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                  <SceneArt image={byId(r.id)?.image} alt={byId(r.id)?.title} />
                </div>
                <div>
                  <div className="text-[14.5px] font-bold text-ink-950">{byId(r.id).title}</div>
                  <div className="flex items-center gap-2 text-[12px] text-ink-500">
                    <Rating value={r.r} /> {r.when}
                  </div>
                  <p className="mt-1 text-[13.5px] text-ink-700">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'prefs' && (
          <div className="card divide-y divide-ink-100">
            {[
              ['Interests & budget', 'Food, culture · ₹2,000 per person', '/onboarding'],
              ['Walking & accessibility', 'Some walking · no requirements', '/onboarding'],
              ['Notifications', 'Weather alerts, slot changes, host messages', ''],
              ['Payment methods', 'UPI · ananya@okhdfcbank', ''],
              ['Language', 'English · Hindi', ''],
            ].map(([t, s, to]) => (
              <button key={t} onClick={() => to && navigate(to)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-ink-50">
                <div className="flex-1">
                  <div className="text-[14.5px] font-semibold text-ink-950">{t}</div>
                  <div className="text-[12.5px] text-ink-500">{s}</div>
                </div>
                <ChevronRight size={17} className="text-ink-400" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-6 flex items-center gap-2 text-[12px] text-ink-400">
          <Star size={12} /> Travel Saathi prototype · demo data only
        </div>
      </div>
    </div>
  );
}
