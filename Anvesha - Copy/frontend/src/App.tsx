import { RouterProvider, matchPath, useRouter } from './router';
import { AppProvider, useApp } from './store/AppStore';
import { TravelerLayout } from './components/Layouts';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Search from './pages/Search';
import Recommendations from './pages/Recommendations';
import ExperienceDetails from './pages/ExperienceDetails';
import Explore from './pages/Explore';
import Itinerary from './pages/Itinerary';
import Adapt from './pages/Adapt';
import Booking from './pages/Booking';
import Confirmation from './pages/Confirmation';
import LiveTrip from './pages/LiveTrip';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import DesignSystem from './pages/DesignSystem';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import CreateExperience from './pages/provider/CreateExperience';
import Availability from './pages/provider/Availability';
import ProviderBookings from './pages/provider/ProviderBookings';
import Analytics from './pages/provider/Analytics';

import Login from './pages/Login';
import { AuthProvider, useAuth } from './store/AuthContext';
import { SOSProvider, SOSModal } from './components/sos';

function Screens() {
  const { path } = useRouter();
  const { user, isAuthenticated } = useAuth();
  const p = path.split('?')[0];

  // First and foremost: If not logged in, or on /login, land on Login screen!
  if (!isAuthenticated || p === '/login') {
    return <Login />;
  }

  // Provider app (desktop-first, own layout)
  if (p.startsWith('/provider')) {
    if (!isAuthenticated) return <Login />;
    if (p === '/provider') return <ProviderDashboard />;
    if (p === '/provider/create') return <CreateExperience />;
    if (p === '/provider/availability') return <Availability />;
    if (p === '/provider/bookings') return <ProviderBookings />;
    if (p === '/provider/analytics') return <Analytics />;
    return <ProviderDashboard />;
  }

  // Traveler app (mobile-first)
  const exp = matchPath('/exp/:id', p);
  let page;
  if (exp) page = <ExperienceDetails id={exp.id} />;
  else if (p === '/onboarding') page = <Onboarding />;
  else if (p === '/search') page = <Search />;
  else if (p === '/results') page = <Recommendations />;
  else if (p === '/map') page = <Explore />;
  else if (p === '/itinerary') page = <Itinerary />;
  else if (p === '/adapt') page = <Adapt />;
  else if (p === '/booking') page = <Booking />;
  else if (p === '/confirmation') page = <Confirmation />;
  else if (p === '/live') page = <LiveTrip />;
  else if (p === '/chat') page = <Chat />;
  else if (p === '/profile') page = <Profile />;
  else if (p === '/design') page = <DesignSystem />;
  else page = <Home />;
  return <TravelerLayout>{page}</TravelerLayout>;
}

/** Remount screens once the live catalog arrives from the backend so every list re-ranks with server data. */
function Keyed() {
  const { catalogVersion } = useApp();
  return <Screens key={catalogVersion} />;
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppProvider>
          <SOSProvider>
            <Keyed />
            <SOSModal />
          </SOSProvider>
        </AppProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
