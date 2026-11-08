import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import type { EmergencyContact, NearbyEmergencyFacility, SOSLocationCoords, SOSLocationStatus, SOSStage } from './types';
import { searchNearbyHelp } from './nearbyHelp';
import { useRouter } from '../../router';

const STORAGE_KEY = 'travel_saathi_sos_contacts';

const DEFAULT_CONTACTS: EmergencyContact[] = [
  {
    id: 'contact-1',
    name: 'Aditi Sharma',
    phone: '+91 98220 14829',
    relationship: 'Mother / Family',
    isPrimary: true,
  },
  {
    id: 'contact-2',
    name: 'Rohan Kulkarni',
    phone: '+91 94225 87310',
    relationship: 'Travel Partner',
    isPrimary: false,
  },
  {
    id: 'contact-3',
    name: 'National Tourist Helpline',
    phone: '1363',
    relationship: '24/7 Emergency Assistance',
    isPrimary: false,
  },
];

interface SOSContextType {
  sosStage: SOSStage;
  countdown: number;
  elapsedSeconds: number;
  coords: SOSLocationCoords | null;
  locationStatus: SOSLocationStatus;
  locationError: string | null;
  googleMapsUrl: string | null;
  contacts: EmergencyContact[];
  primaryContact: EmergencyContact | undefined;
  alertText: string;
  isOnline: boolean;
  nearbyFacilities: NearbyEmergencyFacility[];
  isSearchingNearby: boolean;
  nearbyError: string | null;
  isContactsModalOpen: boolean;
  isPanelMinimized: boolean;
  setIsContactsModalOpen: (open: boolean) => void;
  setIsPanelMinimized: (minimized: boolean) => void;
  triggerSOSPrompt: () => void;
  confirmSOSActivation: () => void;
  activateSOSImmediately: () => void;
  cancelSOS: () => void;
  resolveSOS: () => void; // "I'M SAFE"
  retryLocation: () => void;
  addContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  updateContact: (id: string, patch: Partial<EmergencyContact>) => void;
  deleteContact: (id: string) => void;
  setPrimaryContact: (id: string) => void;
  openMapWithLocation: () => void;
  refreshNearbyHelp: () => void;
}

const SOSContext = createContext<SOSContextType | null>(null);

export function SOSProvider({ children }: { children: ReactNode }) {
  const { navigate } = useRouter();

  const [sosStage, setSosStage] = useState<SOSStage>('idle');
  const [countdown, setCountdown] = useState<number>(5);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [coords, setCoords] = useState<SOSLocationCoords | null>(null);
  const [locationStatus, setLocationStatus] = useState<SOSLocationStatus>('detecting');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Online / Offline tracking
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real nearby facilities from Google Places
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyEmergencyFacility[]>([]);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);

  // Load contacts from localStorage
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_CONTACTS;
  });

  // Sync contacts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    } catch {
      // ignore
    }
  }, [contacts]);

  const primaryContact = useMemo(() => {
    return contacts.find((c) => c.isPrimary) || contacts[0];
  }, [contacts]);

  // Geolocation watch ref & timers
  const watchIdRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<any>(null);
  const elapsedTimerRef = useRef<any>(null);

  // Stop location watch cleanly
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Request & watch geolocation during active SOS
  const startLocationTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      setLocationError('Geolocation is not supported by your device browser.');
      return;
    }

    setLocationStatus('detecting');
    setLocationError(null);

    // Initial immediate fetch
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
        });
        setLocationStatus('detected');
        setLocationError(null);
      },
      (err) => {
        let msg = 'Unable to access your location.';
        if (err.code === 1) {
          setLocationStatus('denied');
          msg = 'Location permission was denied in your browser settings.';
        } else if (err.code === 2) {
          setLocationStatus('unavailable');
          msg = 'GPS location is currently unavailable on your device.';
        } else if (err.code === 3) {
          setLocationStatus('unavailable');
          msg = 'Location request timed out.';
        }
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Live continuous watching
    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: pos.timestamp,
          });
          setLocationStatus('detected');
          setLocationError(null);
        },
        (err) => {
          if (err.code === 1) {
            setLocationStatus('denied');
            setLocationError('Location permission denied.');
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
        }
      );
      watchIdRef.current = id;
    } catch {
      // fallback
    }
  }, []);

  // Fetch genuine nearby emergency facilities
  const fetchNearbyFacilities = useCallback(async (lat: number, lng: number) => {
    setIsSearchingNearby(true);
    setNearbyError(null);
    try {
      const result = await searchNearbyHelp(lat, lng);
      setNearbyFacilities(result.facilities);
      if (result.error) setNearbyError(result.error);
    } catch (err: any) {
      setNearbyError(err?.message || 'Could not load nearby emergency facilities.');
    } finally {
      setIsSearchingNearby(false);
    }
  }, []);

  // When coords arrive in active SOS, query nearby facilities
  useEffect(() => {
    if (sosStage === 'active' && coords?.latitude && coords?.longitude) {
      fetchNearbyFacilities(coords.latitude, coords.longitude);
    }
  }, [sosStage, coords?.latitude, coords?.longitude, fetchNearbyFacilities]);

  // Trigger Confirmation Modal
  const triggerSOSPrompt = useCallback(() => {
    setSosStage('confirming');
    setIsPanelMinimized(false);
  }, []);

  // Cancel SOS (aborts countdown or returns to idle)
  const cancelSOS = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    stopLocationTracking();
    setSosStage('idle');
    setCountdown(5);
    setElapsedSeconds(0);
    setIsPanelMinimized(false);
    setNearbyFacilities([]);
  }, [stopLocationTracking]);

  // "I'M SAFE" - resolves active emergency
  const resolveSOS = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    stopLocationTracking();
    setSosStage('idle');
    setCountdown(5);
    setElapsedSeconds(0);
    setIsPanelMinimized(false);
    setNearbyFacilities([]);
  }, [stopLocationTracking]);

  // Activate SOS (starts 5s countdown)
  const confirmSOSActivation = useCallback(() => {
    setSosStage('countdown');
    setCountdown(5);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          setSosStage('active');
          setElapsedSeconds(0);
          startLocationTracking();
          try {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
          } catch {
            /* noop */
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startLocationTracking]);

  // Activate SOS Immediately (skips countdown)
  const activateSOSImmediately = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setSosStage('active');
    setCountdown(0);
    setElapsedSeconds(0);
    startLocationTracking();
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {
      /* noop */
    }
  }, [startLocationTracking]);

  // Elapsed timer when active
  useEffect(() => {
    if (sosStage === 'active') {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [sosStage]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      stopLocationTracking();
    };
  }, [stopLocationTracking]);

  const googleMapsUrl = useMemo(() => {
    if (!coords) return null;
    return `https://www.google.com/maps?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
  }, [coords]);

  const alertText = useMemo(() => {
    const timeStr = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const mapLink = googleMapsUrl || '[Location acquiring / GPS access required]';
    const coordsStr = coords
      ? `${coords.latitude.toFixed(5)}° N, ${coords.longitude.toFixed(5)}° E (accuracy ±${coords.accuracy ?? 15}m)`
      : 'Coordinates unavailable';

    return `SOS ALERT — Travel Saathi

I may need emergency assistance.

My current location:
${coordsStr}

Google Maps location:
${mapLink}

Time: ${timeStr}
Status: EMERGENCY ACTIVE`;
  }, [coords, googleMapsUrl]);

  // Contact CRUD
  const addContact = useCallback((c: Omit<EmergencyContact, 'id'>) => {
    const newContact: EmergencyContact = {
      ...c,
      id: `contact-${Date.now()}`,
    };
    setContacts((prev) => {
      if (c.isPrimary) {
        return [...prev.map((x) => ({ ...x, isPrimary: false })), newContact];
      }
      return [...prev, newContact];
    });
  }, []);

  const updateContact = useCallback((id: string, patch: Partial<EmergencyContact>) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, ...patch };
        }
        if (patch.isPrimary) {
          return { ...c, isPrimary: false };
        }
        return c;
      })
    );
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  }, []);

  const setPrimaryContact = useCallback((id: string) => {
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        isPrimary: c.id === id,
      }))
    );
  }, []);

  // View Current Location on Existing Map
  const openMapWithLocation = useCallback(() => {
    setIsPanelMinimized(true);
    if (coords) {
      const params = new URLSearchParams({
        name: 'My Emergency Location',
        lat: String(coords.latitude),
        lng: String(coords.longitude),
        city: 'Current Location',
        category: 'Emergency',
      });
      navigate('/map?' + params.toString());
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('anvesha:fly-to', {
            detail: {
              lat: coords.latitude,
              lng: coords.longitude,
              name: 'My Emergency Location',
              city: 'Current Location',
              category: 'Emergency',
              zoom: 17,
              tilt: 45,
            },
          })
        );
      }, 400);
    } else {
      navigate('/map');
    }
  }, [coords, navigate]);

  const refreshNearbyHelp = useCallback(() => {
    if (coords?.latitude && coords?.longitude) {
      fetchNearbyFacilities(coords.latitude, coords.longitude);
    }
  }, [coords, fetchNearbyFacilities]);

  return (
    <SOSContext.Provider
      value={{
        sosStage,
        countdown,
        elapsedSeconds,
        coords,
        locationStatus,
        locationError,
        googleMapsUrl,
        contacts,
        primaryContact,
        alertText,
        isOnline,
        nearbyFacilities,
        isSearchingNearby,
        nearbyError,
        isContactsModalOpen,
        isPanelMinimized,
        setIsContactsModalOpen,
        setIsPanelMinimized,
        triggerSOSPrompt,
        confirmSOSActivation,
        activateSOSImmediately,
        cancelSOS,
        resolveSOS,
        retryLocation: startLocationTracking,
        addContact,
        updateContact,
        deleteContact,
        setPrimaryContact,
        openMapWithLocation,
        refreshNearbyHelp,
      }}
    >
      {children}
    </SOSContext.Provider>
  );
}

export function useSOS() {
  const ctx = useContext(SOSContext);
  if (!ctx) throw new Error('useSOS must be used within an SOSProvider');
  return ctx;
}
