import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from '../router';

export type UserRole = 'traveller' | 'provider';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar: string;
  city?: string;
  businessName?: string;
}

export const DEMO_TRAVELLER: AuthUser = {
  id: 'usr-traveller-01',
  name: 'Ananya Sharma',
  email: 'ananya@travelsaathi.com',
  phone: '+91 98220 14829',
  role: 'traveller',
  avatar: 'AS',
  city: 'Bengaluru / Pune',
};

export const DEMO_PROVIDER: AuthUser = {
  id: 'usr-provider-01',
  name: 'Rajesh Deshmukh',
  email: 'rajesh@puneheritagewalks.com',
  phone: '+91 94220 55123',
  role: 'provider',
  avatar: 'RD',
  city: 'Pune',
  businessName: 'Pune Heritage Walks & Tours',
};

const STORAGE_KEY = 'travel_saathi_auth_session';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (credentials: { role: UserRole; identifier: string; password: string; name?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { navigate } = useRouter();

  // Initially null: Any visitor lands directly on the Login screen first!
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role) return parsed;
      }
    } catch {
      // fallback
    }
    return null;
  });

  const role: UserRole = user ? user.role : 'traveller';
  const isAuthenticated = !!user;

  // Persist user changes to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const login = useCallback(
    async ({ role, identifier, password, name }: { role: UserRole; identifier: string; password: string; name?: string }) => {
      // Basic client-side validation
      const idTrimmed = identifier.trim();
      if (!idTrimmed) {
        return { success: false, error: 'Please enter your email or phone number.' };
      }
      if (!password || password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters.' };
      }

      // Simulate a fast authentication response (350ms)
      await new Promise((r) => setTimeout(r, 350));

      let authenticatedUser: AuthUser;

      if (role === 'provider') {
        authenticatedUser = {
          ...DEMO_PROVIDER,
          email: idTrimmed.includes('@') ? idTrimmed : DEMO_PROVIDER.email,
          name: name?.trim() || DEMO_PROVIDER.name,
          role: 'provider',
        };
      } else {
        authenticatedUser = {
          ...DEMO_TRAVELLER,
          email: idTrimmed.includes('@') ? idTrimmed : DEMO_TRAVELLER.email,
          phone: !idTrimmed.includes('@') ? idTrimmed : DEMO_TRAVELLER.phone,
          name: name?.trim() || DEMO_TRAVELLER.name,
          role: 'traveller',
        };
      }

      setUser(authenticatedUser);
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    navigate('/login');
  }, [navigate]);

  const switchRole = useCallback(
    (newRole: UserRole) => {
      if (newRole === 'provider') {
        setUser(DEMO_PROVIDER);
        navigate('/provider');
      } else {
        setUser(DEMO_TRAVELLER);
        navigate('/');
      }
    },
    [navigate]
  );

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthenticated,
      login,
      logout,
      switchRole,
    }),
    [user, role, isAuthenticated, login, logout, switchRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
