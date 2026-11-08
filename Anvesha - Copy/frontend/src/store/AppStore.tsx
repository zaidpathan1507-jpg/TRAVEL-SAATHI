import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ProviderBooking, Trip, TravelerBooking, Experience } from '../lib/types';
import { EXPERIENCES, byId } from '../data/experiences';
import { PROVIDER_EXP_IDS, SEED_BOOKINGS, TODAY, TODAY_ISO, addDays, isoDate } from '../data/provider';
import { buildPlan, composePlan, groupCostFor, parseQuery, type ParsedField } from '../lib/engine';
import { api } from '../api/client';

export type ApiStatus = { state: 'checking' | 'online' | 'offline'; /** database engine reported by GET /api/health, e.g. 'sqlite' */ database?: string };
const PROVIDER_ID = 'heritage';

export const DEFAULT_TRIP: Trip = {
  city: 'Pune',
  minutes: 180,
  budget: 2000,
  budgetMode: 'person',
  adults: 2,
  children: 2,
  groupType: 'family',
  interests: ['food', 'culture'],
  maxKm: 5,
  wheelchair: false,
  lowWalking: false,
  indoorOnly: false,
  vegetarian: false,
  startMin: 16 * 60,
  weather: 'clear',
};

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'success' | 'info' | 'warn' | 'ai';
  action?: { label: string; to: string };
}

export interface ChatMsg {
  id: number;
  role: 'user' | 'ai';
  text: string;
  cards?: string[];
  chips?: string[];
  actions?: { label: string; cmd: string; primary?: boolean }[];
  plan?: boolean;
}

export interface PSlot {
  time: number;
  capacity: number;
  booked: number;
  enabled: boolean;
}

export interface Checkout {
  expIds: string[];
  times: number[];
  date: string;
  adults: number;
  children: number;
}

export interface AdaptEvent {
  kind: 'rain' | 'time' | 'chat';
  text: string;
}

const seedAvailability = () => {
  const out: Record<string, Record<string, PSlot[]>> = {};
  PROVIDER_EXP_IDS.forEach((id, ei) => {
    const e = byId(id);
    out[id] = {};
    for (let d = 0; d < 14; d++) {
      const iso = isoDate(addDays(TODAY, d));
      out[id][iso] = e.slots.map((s, si) => {
        const pseudo = (ei * 7 + d * 3 + si * 5) % 10;
        const booked = d === 0 ? s.capacity - s.left : Math.max(0, Math.min(s.capacity, Math.round((s.capacity * (10 - d * 0.6 - pseudo * 0.5)) / 10)));
        const weekend = [0, 6].includes(addDays(TODAY, d).getDay());
        return { time: s.time, capacity: s.capacity, booked: weekend ? Math.min(s.capacity, booked + 3) : booked, enabled: !(d === 5 && si === 0) };
      });
    }
  });
  return out;
};

const WELCOME: ChatMsg[] = [
  { id: 1, role: 'user', text: 'I have only 2 hours before dinner.' },
  {
    id: 2,
    role: 'ai',
    text: 'Got it! I found 3 experiences within 20 minutes of your current location. What are you in the mood for?',
    chips: ['🍛 Food', '🎭 Culture', '🛍 Shopping'],
  },
];

function useAppState() {
  const [trip, setTripState] = useState<Trip>(DEFAULT_TRIP);
  const [lastQuery, setLastQuery] = useState('');
  const [saved, setSaved] = useState<string[]>(['warli-workshop', 'dhol-tasha']);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [adaptLog, setAdaptLog] = useState<AdaptEvent[]>([]);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [travelerBookings, setTravelerBookings] = useState<TravelerBooking[]>([]);
  const [providerBookings, setProviderBookings] = useState<ProviderBooking[]>(SEED_BOOKINGS);
  const [availability, setAvailability] = useState(seedAvailability);
  const [customExps, setCustomExps] = useState<Experience[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>(WELCOME);
  const [demoOpen, setDemoOpen] = useState(false);
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ state: 'checking' });
  const [catalogVersion, setCatalogVersion] = useState(0);
  const online = apiStatus.state === 'online';

  /** Pull catalog, bookings and calendar from the backend. Falls back to bundled demo data if it's not running. */
  const syncFromApi = useCallback(async () => {
    try {
      const h = await api.health();
      const [exps, bookings, avail] = await Promise.all([api.experiences(), api.providerBookings(PROVIDER_ID), api.availability(PROVIDER_ID, TODAY_ISO, 14)]);
      EXPERIENCES.splice(0, EXPERIENCES.length, ...exps); // engine + components read this shared array
      setProviderBookings(bookings);
      setAvailability(avail);
      setApiStatus({ state: 'online', database: h.database });
      setCatalogVersion((v) => v + 1);
    } catch {
      setApiStatus({ state: 'offline' });
    }
  }, []);
  useEffect(() => {
    syncFromApi();
  }, [syncFromApi]);

  /** Natural-language request → constraints. Uses the backend AI endpoint when online, the same engine locally otherwise. */
  const parseRequest = useCallback(
    async (text: string): Promise<{ patch: Partial<Trip>; fields: ParsedField[] }> => {
      if (online) {
        try {
          const r = await api.parse(text, trip);
          return { patch: r.patch, fields: r.fields };
        } catch {
          /* fall through to local */
        }
      }
      return parseQuery(text, trip);
    },
    [online, trip],
  );

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((s) => s.filter((x) => x.id !== id)), []);

  const setTrip = useCallback((patch: Partial<Trip>) => setTripState((t) => ({ ...t, ...patch })), []);

  const toggleSave = useCallback(
    (id: string) => {
      const on = !saved.includes(id);
      setSaved(on ? [...saved, id] : saved.filter((x) => x !== id));
      toast({ title: on ? 'Saved to your list' : 'Removed from saved', body: byId(id).title, tone: on ? 'success' : 'info' });
    },
    [toast, saved],
  );

  /** Adds an experience; if the plan is empty the AI composes a complementary plan around it. */
  const addToPlan = useCallback(
    (id: string) => {
      if (planIds.includes(id)) {
        toast({ title: 'Already in your plan', body: byId(id).title, tone: 'info', action: { label: 'View plan', to: '/itinerary' } });
        return;
      }
      const composed = planIds.length === 0;
      setPlanIds(composed ? composePlan(id, trip) : [...planIds, id]);
      toast({
        title: composed ? 'AI built your itinerary' : 'Added to your plan',
        body: composed ? `Planned around ${byId(id).title}` : byId(id).title,
        tone: 'ai',
        action: { label: 'View plan', to: '/itinerary' },
      });
    },
    [trip, toast, planIds],
  );

  const removeFromPlan = useCallback((id: string) => setPlanIds((ids) => ids.filter((x) => x !== id)), []);
  const movePlan = useCallback(
    (id: string, dir: -1 | 1) =>
      setPlanIds((ids) => {
        const i = ids.indexOf(id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ids.length) return ids;
        const n = [...ids];
        [n[i], n[j]] = [n[j], n[i]];
        return n;
      }),
    [],
  );

  const logAdapt = useCallback((e: AdaptEvent) => setAdaptLog((l) => [e, ...l]), []);

  const startCheckout = useCallback(
    (ids: string[], times?: number[]) => {
      const plan = buildPlan(ids, trip);
      const t = times ?? plan.items.filter((i) => i.kind === 'activity').map((i) => i.start);
      setCheckout({ expIds: ids, times: t, date: TODAY_ISO, adults: trip.adults, children: trip.children });
    },
    [trip],
  );

  const confirmBooking = useCallback(
    (payment: string, total: number, paid?: { checkoutId: string; paymentId?: string }) => {
      if (!checkout) return null;
      const id = 'ANV-' + (24812 + travelerBookings.length);
      const tb: TravelerBooking = { id, expIds: checkout.expIds, date: checkout.date, times: checkout.times, adults: checkout.adults, children: checkout.children, total, payment, ...(paid?.paymentId ? { paymentId: paid.paymentId } : {}), createdAt: Date.now() };
      setTravelerBookings((b) => [tb, ...b]);
      const t = { ...trip, adults: checkout.adults, children: checkout.children };
      const newProviderRows: ProviderBooking[] = checkout.expIds
        .map((eid, i) => ({ eid, i }))
        .filter(({ eid }) => byId(eid).provider.id === 'heritage')
        .map(({ eid, i }) => ({
          id: `${id}-${i + 1}`,
          customer: 'Ananya Sharma',
          from: 'Bengaluru',
          expId: eid,
          date: checkout.date,
          time: checkout.times[i],
          adults: checkout.adults,
          children: checkout.children,
          amount: groupCostFor(byId(eid), t),
          payment: payment === 'razorpay' ? 'Razorpay' : payment === 'upi' ? 'UPI' : payment === 'card' ? 'Card' : 'Pay later',
          status: payment === 'later' ? 'Pending' : 'Confirmed',
          travelerType: 'Family',
          isNew: true,
          note: 'Booked via Travel Saathi AI itinerary',
        }));
      setProviderBookings((b) => [...newProviderRows, ...b]);
      if (paid) {
        // Already booked on the server by the verified Razorpay payment: only refresh what the server holds
        setTravelerBookings((list) => list.map((x) => (x.id === id ? { ...x, id: paid.checkoutId } : x)));
        Promise.all([api.providerBookings(PROVIDER_ID), api.availability(PROVIDER_ID, TODAY_ISO, 14)])
          .then(([bk, av]) => {
            setProviderBookings(bk);
            setAvailability(av);
          })
          .catch(() => {});
      } else if (online) {
        api
          .checkout({
            items: checkout.expIds.map((expId, i) => ({ expId, time: checkout.times[i] })),
            date: checkout.date,
            adults: checkout.adults,
            children: checkout.children,
            payment: payment as 'upi' | 'card' | 'later',
            customer: 'Ananya Sharma',
            from: 'Bengaluru',
            travelerType: checkout.children ? 'Family' : undefined,
          })
          .then(async (r) => {
            setTravelerBookings((list) => list.map((x) => (x.id === id ? { ...x, id: r.checkoutId, total: x.total } : x)));
            const [bk, av] = await Promise.all([api.providerBookings(PROVIDER_ID), api.availability(PROVIDER_ID, TODAY_ISO, 14)]);
            setProviderBookings(bk);
            setAvailability(av);
          })
          .catch(() => toast({ title: 'Saved offline', body: 'The booking server is unreachable; kept on this device', tone: 'warn' }));
      }
      // reflect seats in provider availability
      setAvailability((av) => {
        const n = structuredClone(av);
        checkout.expIds.forEach((eid, i) => {
          const day = n[eid]?.[checkout.date];
          const slot = day?.find((s) => Math.abs(s.time - checkout.times[i]) <= 30) ?? day?.[0];
          if (slot) slot.booked = Math.min(slot.capacity, slot.booked + checkout.adults + checkout.children);
        });
        return n;
      });
      return tb;
    },
    [checkout, travelerBookings.length, trip, online, toast],
  );

  const updateBookingStatus = useCallback((id: string, status: ProviderBooking['status']) => {
    setProviderBookings((b) => b.map((x) => (x.id === id ? { ...x, status, isNew: false } : x)));
    if (online) api.updateBooking(id, status).catch(() => {});
  }, [online]);

  const toggleSlot = useCallback((expId: string, date: string, time: number) => {
    setAvailability((av) => {
      const n = structuredClone(av);
      const s = n[expId][date].find((x) => x.time === time);
      if (s) {
        s.enabled = !s.enabled;
        if (online) api.updateSlot({ experienceId: expId, date, time, enabled: s.enabled }).catch(() => {});
      }
      return n;
    });
  }, [online]);

  const setCapacity = useCallback((expId: string, date: string, time: number, capacity: number) => {
    setAvailability((av) => {
      const n = structuredClone(av);
      const s = n[expId][date].find((x) => x.time === time);
      if (s) {
        s.capacity = Math.max(s.booked, Math.max(1, capacity));
        if (online) api.updateSlot({ experienceId: expId, date, time, capacity: s.capacity }).catch(() => {});
      }
      return n;
    });
  }, [online]);

  const addSlot = useCallback((expId: string, date: string, time: number, capacity: number) => {
    setAvailability((av) => {
      const n = structuredClone(av);
      const day = n[expId][date] ?? [];
      if (!day.some((s) => s.time === time)) day.push({ time, capacity, booked: 0, enabled: true });
      day.sort((a, b) => a.time - b.time);
      n[expId][date] = day;
      return n;
    });
    if (online) api.updateSlot({ experienceId: expId, date, time, capacity, enabled: true }).catch(() => {});
  }, [online]);

  const publishExperience = useCallback(
    (e: Experience) => {
      setCustomExps((l) => [e, ...l]);
      if (online) api.publish(PROVIDER_ID, e).catch(() => {});
    },
    [online],
  );

  const resetDemo = useCallback(() => {
    setTripState(DEFAULT_TRIP);
    setPlanIds([]);
    setAdaptLog([]);
    setCheckout(null);
    setTravelerBookings([]);
    setProviderBookings(SEED_BOOKINGS);
    setAvailability(seedAvailability());
    setMessages(WELCOME);
    setLastQuery('');
    if (online) api.reset().then(syncFromApi).catch(() => {});
  }, [online, syncFromApi]);

  return {
    trip,
    setTrip,
    lastQuery,
    setLastQuery,
    saved,
    toggleSave,
    planIds,
    setPlanIds,
    addToPlan,
    removeFromPlan,
    movePlan,
    adaptLog,
    logAdapt,
    checkout,
    setCheckout,
    startCheckout,
    confirmBooking,
    travelerBookings,
    providerBookings,
    updateBookingStatus,
    availability,
    toggleSlot,
    setCapacity,
    addSlot,
    customExps,
    publishExperience,
    toasts,
    toast,
    dismissToast,
    chatOpen,
    setChatOpen,
    messages,
    setMessages,
    demoOpen,
    setDemoOpen,
    tripEditorOpen,
    setTripEditorOpen,
    onboarded,
    setOnboarded,
    resetDemo,
    apiStatus,
    catalogVersion,
    parseRequest,
    allExperiences: EXPERIENCES,
  };
}

export type AppState = ReturnType<typeof useAppState>;
const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  const value = useMemo(() => state, [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
};
