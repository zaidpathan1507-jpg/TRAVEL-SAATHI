import type { ReactNode } from 'react';
import { Home, Map, Sparkles, CalendarRange, User, Compass, MessageCircle, Store, PlayCircle, LayoutDashboard, PlusSquare, CalendarDays, ClipboardList, BarChart3, Bell, ArrowLeftRight, RotateCcw, ChevronRight, CloudSun, CloudRain, Navigation, LogOut } from 'lucide-react';
import { Link, useRouter } from '../router';
import { useApp } from '../store/AppStore';
import { useAuth } from '../store/AuthContext';
import { Logo, LogoMark } from './Logo';
import { AIChat } from './AIChat';
import { Drawer, Toasts } from './ui';
import { TripEditor } from './TripPanel';
import { SOSButton } from './sos';
import { cx } from '../lib/format';

const NAV = [
  { to: '/', label: 'Discover', icon: Home },
  { to: '/search', label: 'Ask AI', icon: Sparkles },
  { to: '/results', label: 'Explore', icon: Compass },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/itinerary', label: 'My Plan', icon: CalendarRange },
  { to: '/live', label: 'Live trip', icon: Navigation },
];

export function TravelerLayout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { planIds, chatOpen, setChatOpen, setDemoOpen, trip } = useApp();
  const { user, isAuthenticated } = useAuth();
  const active = (to: string) => (to === '/' ? path === '/' : path.startsWith(to));
  const hideFab = path.startsWith('/chat');
  const compactFab = /^\/(exp|booking|map)/.test(path);
  return (
    <div className="min-h-screen">
      <header className="sticky z-40 border-b border-ink-100/80 bg-white/85 backdrop-blur-xl" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" aria-label="TRAVEL SAATHI home">
            <Logo />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={cx('relative whitespace-nowrap rounded-xl px-3 py-2 text-[14px] font-semibold transition', active(n.to) ? 'bg-ink-100 text-ink-950' : 'text-ink-600 hover:text-ink-950')}>
                {n.label}
                {n.to === '/itinerary' && planIds.length > 0 && <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10.5px] font-bold text-white">{planIds.length}</span>}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SOSButton />
            <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-ink-100 px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 sm:inline-flex lg:hidden xl:inline-flex">
              {trip.weather === 'rain' ? <CloudRain size={15} className="text-sky2-500" /> : <CloudSun size={15} className="text-brand-500" />}
              {trip.weather === 'rain' ? '24° Rain 5 PM' : '29° Pune'}
            </span>
            <Link to="/provider" className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-200 px-3 text-[12.5px] font-bold text-ink-800 hover:bg-ink-50 md:inline-flex">
              <Store size={15} /> For providers
            </Link>
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/profile')}
                aria-label="Your profile"
                title={`Signed in as ${user?.name || 'User'} (${user?.role})`}
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-300 to-rani-400 text-[13px] font-bold text-white shadow-xs"
              >
                {user?.avatar || 'AS'}
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink-950 px-3.5 text-[12.5px] font-bold text-white hover:bg-ink-800 transition inline-flex"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-4 sm:pt-6 lg:pb-16">{children}</main>

      {/* emergency floating SOS trigger for mobile */}
      {!hideFab && <SOSButton variant="floating" />}

      {/* floating assistant */}
      {!hideFab && (
        <button
          onClick={() => setChatOpen(true)}
          className={cx('fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-ink-950 text-white shadow-lift transition hover:scale-[1.02] lg:bottom-6 lg:right-6', compactFab ? cx(path.startsWith('/map') ? 'bottom-[290px]' : 'bottom-40', 'px-2 lg:bottom-6') : 'bottom-24 px-2 lg:pr-5')}
          aria-label="Ask Travel Saathi AI"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ai">
            <MessageCircle size={19} />
          </span>
          <span className={cx('hidden text-[14px] font-bold', !compactFab && 'lg:inline')}>Ask Travel Saathi AI</span>
        </button>
      )}

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto grid h-[68px] max-w-md grid-cols-5 items-center px-2">
          {[
            { to: '/', label: 'Home', icon: Home },
            { to: '/map', label: 'Map', icon: Map },
            { to: '/search', label: 'Ask AI', icon: Sparkles, center: true },
            { to: '/itinerary', label: 'Plan', icon: CalendarRange },
            { to: '/profile', label: 'Profile', icon: User },
          ].map((n) =>
            n.center ? (
              <Link key={n.to} to={n.to} className="flex flex-col items-center" aria-label="Ask AI">
                <span className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-ai text-white shadow-float">
                  <n.icon size={24} />
                </span>
                <span className="mt-1 text-[11px] font-bold text-ink-900">{n.label}</span>
              </Link>
            ) : (
              <Link key={n.to} to={n.to} className={cx('relative flex flex-col items-center gap-1 text-[11px] font-semibold', active(n.to) ? 'text-ink-950' : 'text-ink-400')}>
                <n.icon size={22} strokeWidth={active(n.to) ? 2.4 : 2} />
                {n.label}
                {n.to === '/itinerary' && planIds.length > 0 && <span className="absolute -top-1 right-3 h-4 min-w-4 rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-4 text-white">{planIds.length}</span>}
              </Link>
            ),
          )}
        </div>
      </nav>

      <Drawer open={chatOpen} onClose={() => setChatOpen(false)} title="Travel Saathi AI" width="sm:max-w-[440px]" header={<span />}>
        <AIChat variant="drawer" onClose={() => setChatOpen(false)} />
      </Drawer>
      <TripEditor />
      <Toasts />
    </div>
  );
}

/* ------------------------------------------------------------------ Demo guide */
const DEMO_STEPS: { n: number; title: string; to: string; hint: string; group: 'Traveler' | 'Provider' }[] = [
  { n: 1, title: 'Traveler opens Anvesha', to: '/', hint: 'Home with trip context and curated picks', group: 'Traveler' },
  { n: 2, title: 'Types a natural-language request', to: '/search', hint: '“3 hours in Pune with my family…”', group: 'Traveler' },
  { n: 3, title: 'AI extracts the constraints', to: '/search', hint: 'Location, time, budget, group, interests, distance', group: 'Traveler' },
  { n: 4, title: 'Matching experiences', to: '/results', hint: 'Ranked by constraint fit', group: 'Traveler' },
  { n: 5, title: 'Select an experience', to: '/exp/pune-food-walk', hint: 'Traditional Pune Food Walk', group: 'Traveler' },
  { n: 6, title: 'Why it’s a 92% match', to: '/exp/pune-food-walk', hint: 'Score breakdown on the detail page', group: 'Traveler' },
  { n: 7, title: 'Add to AI itinerary', to: '/itinerary', hint: 'AI adds a cultural stop that fits', group: 'Traveler' },
  { n: 8, title: 'Map shows the route', to: '/map', hint: 'Numbered stops, travel times', group: 'Traveler' },
  { n: 9, title: 'Simulate weather change', to: '/adapt', hint: 'Rain expected at 5:00 PM', group: 'Traveler' },
  { n: 10, title: 'AI proposes alternatives', to: '/adapt', hint: '3 indoor options', group: 'Traveler' },
  { n: 11, title: 'Accept an alternative', to: '/adapt', hint: 'Replace Experience', group: 'Traveler' },
  { n: 12, title: 'Book the final itinerary', to: '/booking', hint: 'UPI, card or pay later', group: 'Traveler' },
  { n: 13, title: 'Confirmation', to: '/confirmation', hint: 'Hosts are notified instantly', group: 'Traveler' },
  { n: 14, title: 'Provider sees the booking', to: '/provider', hint: 'Live on Raj’s dashboard', group: 'Provider' },
  { n: 15, title: 'Traveler demand insights', to: '/provider/analytics', hint: 'What travelers search for right now', group: 'Provider' },
  { n: 16, title: 'Manage availability', to: '/provider/availability', hint: 'Open/close slots, seats', group: 'Provider' },
];

export function DemoGuide() {
  const { demoOpen, setDemoOpen, resetDemo, planIds, addToPlan, startCheckout, checkout, toast, apiStatus } = useApp();
  const { navigate, path } = useRouter();
  const go = (s: (typeof DEMO_STEPS)[number]) => {
    if (s.n === 7 && planIds.length === 0) addToPlan('pune-food-walk');
    if (s.n === 12 && planIds.length) startCheckout(planIds);
    if (s.n === 13 && !checkout) {
      toast({ title: 'Book first', body: 'Complete step 12 to see a confirmation', tone: 'info' });
      return;
    }
    navigate(s.to + (s.n === 2 ? '?demo' : ''));
    setDemoOpen(false);
  };
  return (
    <Drawer open={demoOpen} onClose={() => setDemoOpen(false)} title="Hackathon demo flow" width="sm:max-w-[420px]">
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-[13.5px] text-ink-600">Jump to any step of the judge demo. Everything is interactive, so you can also just click through the app.</p>
          {(['Traveler', 'Provider'] as const).map((g) => (
            <div key={g} className="mb-5">
              <div className="eyebrow mb-2">{g} journey</div>
              <ol className="space-y-1">
                {DEMO_STEPS.filter((s) => s.group === g).map((s) => {
                  const here = path.split('?')[0] === s.to;
                  return (
                    <li key={s.n}>
                      <button onClick={() => go(s)} className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-ink-50', here && 'bg-brand-50')}>
                        <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold tnum', here ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-700')}>{s.n}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-ink-950">{s.title}</span>
                          <span className="block truncate text-[12px] text-ink-500">{s.hint}</span>
                        </span>
                        <ChevronRight size={16} className="text-ink-400" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
        <div className="border-t border-ink-100 p-4 pb-safe">
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2 text-[12.5px] text-ink-700">
            <span className={cx('h-2 w-2 shrink-0 rounded-full', apiStatus.state === 'online' ? 'bg-leaf-500' : apiStatus.state === 'checking' ? 'bg-amber-400' : 'bg-ink-300')} />
            {apiStatus.state === 'online'
              ? `Backend connected · ${apiStatus.database === 'sqlite' ? 'SQLite' : (apiStatus.database ?? 'unknown')} database`
              : apiStatus.state === 'checking'
                ? 'Connecting to backend…'
                : 'Offline demo mode · using bundled sample data'}
          </div>
          <button
            onClick={() => {
              resetDemo();
              navigate('/');
              setDemoOpen(false);
              toast({ title: 'Demo reset', body: 'Fresh trip, empty plan, seeded provider data', tone: 'info' });
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink-100 text-[14px] font-bold text-ink-800 hover:bg-ink-200"
          >
            <RotateCcw size={16} /> Reset demo
          </button>
        </div>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ Provider layout */
const PNAV = [
  { to: '/provider', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/provider/create', label: 'Create experience', icon: PlusSquare },
  { to: '/provider/availability', label: 'Availability', icon: CalendarDays },
  { to: '/provider/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/provider/analytics', label: 'Analytics', icon: BarChart3 },
];

export function ProviderLayout({ children, title, actions }: { children: ReactNode; title: string; actions?: ReactNode }) {
  const { path, navigate } = useRouter();
  const { providerBookings } = useApp();
  const { user, logout } = useAuth();
  const fresh = providerBookings.filter((b) => b.isNew).length;
  const pending = providerBookings.filter((b) => b.status === 'Pending').length;
  const isActive = (to: string) => (to === '/provider' ? path === '/provider' : path.startsWith(to));
  return (
    <div className="min-h-screen bg-[#F4F5F9] lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink-100 bg-white px-4 py-5 lg:flex">
        <Link to="/provider" className="px-2">
          <Logo tag="Business" />
        </Link>
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 font-display text-[15px] font-bold text-white">{user?.avatar || 'RD'}</div>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-ink-950">{user?.businessName || user?.name || 'Pune Heritage Walks'}</div>
            <div className="text-[12px] text-ink-500">Verified host · 4.8 ★</div>
          </div>
        </div>
        <nav className="mt-6 space-y-1">
          {PNAV.map((n) => (
            <Link key={n.to} to={n.to} className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition', isActive(n.to) ? 'bg-ink-950 text-white' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-950')}>
              <n.icon size={18} />
              {n.label}
              {n.to === '/provider/bookings' && (fresh || pending) > 0 && <span className={cx('ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold', isActive(n.to) ? 'bg-white/20' : 'bg-brand-500 text-white')}>{fresh || pending}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          <div className="rounded-2xl bg-ai-soft p-4">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-rani-600">
              <Sparkles size={14} /> Travel Saathi AI for hosts
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-700">You appear in 38% of family searches in Deccan & the Peths this week.</p>
          </div>
          <Link to="/" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-ink-600 hover:bg-ink-50">
            <ArrowLeftRight size={16} /> Switch to traveler app
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
            <Link to="/provider" className="lg:hidden">
              <LogoMark size={30} />
            </Link>
            <h1 className="truncate text-lg font-bold lg:text-xl">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
              {actions}
              <button onClick={() => navigate('/provider/bookings')} aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100">
                <Bell size={19} />
                {fresh > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rani-500" />}
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?role=provider')}
                title={`Signed in as ${user?.name || 'Partner'}`}
                className="grid h-9 w-9 place-items-center rounded-full bg-ink-950 text-[13px] font-bold text-white hover:ring-2 hover:ring-brand-400 transition"
              >
                {user?.avatar || 'RD'}
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 no-scrollbar lg:hidden">
            {PNAV.map((n) => (
              <Link key={n.to} to={n.to} className={cx('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold', isActive(n.to) ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-700')}>
                <n.icon size={15} />
                {n.label}
              </Link>
            ))}
            <Link to="/" className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700">
              <ArrowLeftRight size={15} /> Traveler app
            </Link>
          </nav>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
      <Toasts />
    </div>
  );
}
