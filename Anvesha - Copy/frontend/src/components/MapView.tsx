import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Plus, Minus, LocateFixed, Layers, MapPin, CloudRain, AlertCircle, Compass } from 'lucide-react';
import type { Experience } from '../lib/types';
import { HOTEL, distKm, travelMin, type Pt, HOTEL_COORDS, getExperienceCoords, ptToLatLng, latLngToPt } from '../lib/geo';
import { getCategoryMeta, byId } from '../data/experiences';
import { cx } from '../lib/format';
import {
  loadGoogleMapsScript,
  createHotelMarkerIcon,
  createExperienceMarkerIcon,
  createTravelerMarkerIcon,
  createLegBadgeIcon,
  renderInfoWindowContent,
  createHighlightedPlaceMarkerIcon,
  renderPlaceInfoWindowContent,
  flyCameraTo,
} from '../lib/googleMaps';

const ENV_MAPS_KEY = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const API_BASE = ((import.meta.env?.VITE_API_URL as string | undefined) ?? 'http://localhost:8000').replace(/\/$/, '');

/** Maps key: frontend .env first, otherwise ask the backend (/api/ai/maps-key). */
let mapsKeyRequest: Promise<string> | null = null;
function resolveMapsKey(): Promise<string> {
  if (ENV_MAPS_KEY) return Promise.resolve(ENV_MAPS_KEY);
  if (!mapsKeyRequest) {
    mapsKeyRequest = fetch(`${API_BASE}/api/ai/maps-key`)
      .then((res) => (res.ok ? (res.json() as Promise<{ key?: string }>) : { key: '' }))
      .then((data) => data.key || '')
      .catch(() => ''); // backend offline -> stylized SVG map
  }
  return mapsKeyRequest;
}

interface Props {
  experiences: Experience[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  route?: string[];
  current?: Pt;
  className?: string;
  initialZoom?: number;
  focus?: Pt;
  controls?: boolean;
  dimOthers?: boolean;
  rain?: boolean;
  targetLocation?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    name: string;
    city?: string;
    state?: string;
    category?: string;
    description?: string;
    zoom?: number;
    tilt?: number;
  } | null;
}

const ROADS: { d: string; w: number; major?: boolean }[] = [
  { d: 'M36 38 L40 56', w: 0.9 },
  { d: 'M41 41 L42 56', w: 0.9 },
  { d: 'M8 64 C18 62 28 60 38 58', w: 1.3, major: true },
  { d: 'M38 58 L52 58', w: 1 },
  { d: 'M44 45 L44 64', w: 0.8 },
  { d: 'M38 51 L58 51', w: 1.2, major: true },
  { d: 'M44 62 C42 74 40 86 38 104', w: 1.2, major: true },
  { d: 'M56 51 C66 56 80 62 104 70', w: 1.3, major: true },
  { d: 'M58 38 C70 36 84 31 104 27', w: 1.3, major: true },
  { d: 'M60 42 L82 44', w: 0.9 },
  { d: 'M50 58 C52 72 54 88 56 104', w: 1.3, major: true },
  { d: 'M37 38 C34 26 31 12 28 -4', w: 1.3, major: true },
  { d: 'M-4 34 C10 36 24 37 37 38 L58 38', w: 1.1 },
  { d: 'M24 58 L26 70', w: 0.7 },
  { d: 'M58 38 L66 62', w: 0.8 },
  { d: 'M66 62 L76 64', w: 0.7 },
  { d: 'M30 46 L36 51', w: 0.6 },
];

const LABELS: [string, number, number][] = [
  ['DECCAN', 33, 56],
  ['SHIVAJINAGAR', 37, 34],
  ['KOTHRUD', 16, 58],
  ['KASBA PETH', 52, 46.5],
  ['SADASHIV PETH', 41, 61],
  ['CAMP', 70, 67],
  ['KOREGAON PARK', 72, 48],
  ['KALYANI NAGAR', 84, 26],
  ['SWARGATE', 53, 70],
  ['AUNDH', 26, 10],
  ['VETAL HILL', 26, 38],
];

type MapMode = 'roadmap' | 'satellite' | 'stylized';

export function MapView({
  experiences,
  selectedId,
  onSelect,
  route = [],
  current = HOTEL,
  className,
  initialZoom = 1.6,
  focus,
  controls = true,
  dimOthers,
  rain,
  targetLocation,
}: Props) {
  const [mapMode, setMapMode] = useState<MapMode>('roadmap');
  const [isGmapsLoaded, setIsGmapsLoaded] = useState(false);
  const [gmapsError, setGmapsError] = useState(false);
  const [activePlace, setActivePlace] = useState<{
    lat: number;
    lng: number;
    name: string;
    city?: string;
    state?: string;
    category?: string;
    description?: string;
  } | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const highlightedMarkerRef = useRef<any>(null);
  const polylinesRef = useRef<any[]>([]);
  const legBadgesRef = useRef<any[]>([]);
  const hotelMarkerRef = useRef<any>(null);
  const travelerMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  // Approximate Google Maps zoom level from initialZoom
  const targetZoom = useMemo(() => Math.min(18, Math.max(11, Math.round(11 + (initialZoom || 1.6) * 1.5))), [initialZoom]);

  // Load Google Maps API Script
  useEffect(() => {
    let active = true;
    resolveMapsKey()
      .then((key) => (key ? loadGoogleMapsScript(key) : null))
      .then((maps) => {
        if (!active) return;
        if (maps) setIsGmapsLoaded(true);
        else setGmapsError(true);
      })
      .catch(() => {
        if (active) setGmapsError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Listen for custom select events from Google Maps InfoWindow buttons
  useEffect(() => {
    const handleSelect = (evt: Event) => {
      const custom = evt as CustomEvent<string>;
      if (custom.detail && onSelect) {
        onSelect(custom.detail);
      }
    };
    window.addEventListener('anvesha:select-exp', handleSelect);
    return () => {
      window.removeEventListener('anvesha:select-exp', handleSelect);
    };
  }, [onSelect]);

  // Execute 3D Camera Flight to any searched Indian place
  const executeFlyTo = (target: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    name: string;
    city?: string;
    state?: string;
    category?: string;
    description?: string;
    zoom?: number;
    tilt?: number;
  }) => {
    const lat = target.lat ?? target.latitude;
    const lng = target.lng ?? target.longitude;
    if (!lat || !lng) return;

    setActivePlace({ ...target, lat, lng });
    setIsFlying(true);

    if (isGmapsLoaded && mapInstanceRef.current && window.google?.maps) {
      // Switch to Satellite/Hybrid 3D view for real Earth perspective
      if (mapMode === 'stylized') {
        setMapMode('satellite');
      }
      mapInstanceRef.current.setMapTypeId('hybrid');

      flyCameraTo(
        mapInstanceRef.current,
        {
          lat,
          lng,
          zoom: target.zoom ?? 16.5,
          tilt: target.tilt ?? 45,
          heading: 10,
        },
        () => {
          setIsFlying(false);

          if (!highlightedMarkerRef.current) {
            highlightedMarkerRef.current = new window.google.maps.Marker({
              position: { lat, lng },
              map: mapInstanceRef.current,
              title: target.name,
              icon: createHighlightedPlaceMarkerIcon(target.name, target.category),
              zIndex: 999,
              animation: window.google.maps.Animation.DROP,
            });
          } else {
            highlightedMarkerRef.current.setPosition({ lat, lng });
            highlightedMarkerRef.current.setIcon(createHighlightedPlaceMarkerIcon(target.name, target.category));
            highlightedMarkerRef.current.setMap(mapInstanceRef.current);
          }

          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(renderPlaceInfoWindowContent(target));
            infoWindowRef.current.open(mapInstanceRef.current, highlightedMarkerRef.current);
          }
        }
      );
    } else {
      setIsFlying(false);
      // Fallback centering for stylized map if inside Pune canvas bounds
      if (lat >= 18.4 && lat <= 18.65 && lng >= 73.75 && lng <= 73.95) {
        const pt = latLngToPt({ lat, lng });
        setSvgCenter(pt);
        setSvgZoom(2.8);
      }
    }
  };

  useEffect(() => {
    const handleFlyEvent = (evt: Event) => {
      const custom = evt as CustomEvent<any>;
      if (custom.detail) {
        executeFlyTo(custom.detail);
      }
    };
    window.addEventListener('anvesha:fly-to', handleFlyEvent);
    return () => {
      window.removeEventListener('anvesha:fly-to', handleFlyEvent);
    };
  }, [isGmapsLoaded, mapMode]);

  useEffect(() => {
    if (targetLocation) {
      executeFlyTo(targetLocation);
    }
  }, [targetLocation]);

  // Initialize Google Maps instance with 3D capability
  useEffect(() => {
    if (!isGmapsLoaded || !mapContainerRef.current || mapMode === 'stylized') return;

    if (!mapInstanceRef.current && window.google?.maps) {
      const centerCoord = focus ? ptToLatLng(focus) : HOTEL_COORDS;
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: centerCoord,
        zoom: targetZoom,
        mapTypeId: mapMode === 'satellite' ? 'hybrid' : 'roadmap',
        tilt: 45,
        heading: 0,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      mapInstanceRef.current = map;
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(mapMode === 'satellite' ? 'satellite' : 'roadmap');
    }
  }, [isGmapsLoaded, mapMode, targetZoom, focus]);

  // Sync Google Maps elements (Markers, Routes, InfoWindow)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps || mapMode === 'stylized') return;

    // 1. Hotel Marker
    if (!hotelMarkerRef.current) {
      hotelMarkerRef.current = new window.google.maps.Marker({
        position: HOTEL_COORDS,
        map,
        title: 'The Deccan Courtyard (Hotel)',
        icon: createHotelMarkerIcon(),
        zIndex: 100,
      });
      hotelMarkerRef.current.addListener('click', () => {
        infoWindowRef.current?.setContent(`
          <div style="font-family: 'Plus Jakarta Sans', system-ui; padding: 4px; color: #0b1433;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Your Hotel</div>
            <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">The Deccan Courtyard</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Deccan Gymkhana, Pune</div>
          </div>
        `);
        infoWindowRef.current?.open(map, hotelMarkerRef.current);
      });
    }

    // 2. Traveler Marker
    const travelerPos = ptToLatLng(current);
    if (!travelerMarkerRef.current) {
      travelerMarkerRef.current = new window.google.maps.Marker({
        position: travelerPos,
        map,
        title: 'Your Location',
        icon: createTravelerMarkerIcon(),
        zIndex: 200,
      });
    } else {
      travelerMarkerRef.current.setPosition(travelerPos);
    }

    // 3. Experience Markers
    const currentExpIds = new Set(experiences.map((e) => e.id));
    // Remove markers that are no longer present
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentExpIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });

    experiences.forEach((exp) => {
      const pos = getExperienceCoords(exp);
      const isSel = exp.id === selectedId;
      const inRoute = route.includes(exp.id);
      const routeIdx = inRoute ? route.indexOf(exp.id) : undefined;
      const isDimmed = Boolean(dimOthers && route.length > 0 && !inRoute && !isSel);

      const icon = createExperienceMarkerIcon({
        category: exp.category,
        indexInRoute: routeIdx,
        isSelected: isSel,
        isDimmed,
      });

      if (!markersRef.current[exp.id]) {
        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: exp.title,
          icon,
          zIndex: isSel ? 500 : inRoute ? 300 : 150,
        });

        marker.addListener('click', () => {
          onSelect?.(exp.id);
          infoWindowRef.current?.setContent(renderInfoWindowContent(exp, exp.id));
          infoWindowRef.current?.open(map, marker);
        });

        markersRef.current[exp.id] = marker;
      } else {
        const marker = markersRef.current[exp.id];
        marker.setPosition(pos);
        marker.setIcon(icon);
        marker.setZIndex(isSel ? 500 : inRoute ? 300 : 150);
      }

      // If selected, open info window automatically
      if (isSel && markersRef.current[exp.id]) {
        infoWindowRef.current?.setContent(renderInfoWindowContent(exp, exp.id));
        infoWindowRef.current?.open(map, markersRef.current[exp.id]);
      }
    });

    // 4. Polylines for Itinerary Route
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    legBadgesRef.current.forEach((b) => b.setMap(null));
    legBadgesRef.current = [];

    if (route.length > 0) {
      const routeExps = route.map(byId).filter(Boolean);
      const routeCoordinates = [
        HOTEL_COORDS,
        ...routeExps.map((e) => getExperienceCoords(e)),
        HOTEL_COORDS,
      ];

      // Outer outline
      const casing = new window.google.maps.Polyline({
        path: routeCoordinates,
        geodesic: true,
        strokeColor: '#FFFFFF',
        strokeOpacity: 0.9,
        strokeWeight: 7,
        zIndex: 50,
        map,
      });

      // Inner color polyline
      const line = new window.google.maps.Polyline({
        path: routeCoordinates,
        geodesic: true,
        strokeColor: '#F2711C',
        strokeOpacity: 0.95,
        strokeWeight: 4,
        zIndex: 51,
        map,
      });

      polylinesRef.current = [casing, line];

      // Travel time badges on midpoint of legs
      for (let i = 0; i < routeCoordinates.length - 1; i++) {
        const a = routeCoordinates[i];
        const b = routeCoordinates[i + 1];
        const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
        const dKm = distKm({ x: a.lng * 100, y: a.lat * 100 }, { x: b.lng * 100, y: b.lat * 100 });
        const minutes = travelMin(dKm);

        if (minutes > 0) {
          const badge = new window.google.maps.Marker({
            position: mid,
            map,
            icon: createLegBadgeIcon(`${minutes} min`),
            zIndex: 60,
          });
          legBadgesRef.current.push(badge);
        }
      }
    }

    // 5. Fit bounds or Center
    if (focus) {
      map.panTo(ptToLatLng(focus));
    } else if (selectedId && markersRef.current[selectedId]) {
      map.panTo(markersRef.current[selectedId].getPosition());
    } else if (experiences.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(HOTEL_COORDS);
      experiences.forEach((e) => bounds.extend(getExperienceCoords(e)));
      bounds.extend(travelerPos);
      map.fitBounds(bounds, { top: 40, right: 60, bottom: 40, left: 40 });
    }
  }, [experiences, selectedId, route, current, focus, dimOthers, onSelect, mapMode]);

  // Stylized SVG Map State (fallback / alternate view)
  const [svgZoom, setSvgZoom] = useState(initialZoom);
  const [svgCenter, setSvgCenter] = useState<Pt>(focus ?? { x: 44, y: 52 });
  const w = 100 / svgZoom;
  const h = 100 / svgZoom;
  const vb = `${svgCenter.x - w / 2} ${svgCenter.y - h / 2} ${w} ${h}`;

  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 600, h: 400 });
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width || 600, h: e.contentRect.height || 400 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const u = 100 / (Math.max(box.w, box.h) * svgZoom);
  const s = (34 * u) / 8.2;

  const routePts = useMemo(() => (route.length ? [HOTEL, ...route.map(byId), HOTEL] : []), [route]);
  const legs = routePts.slice(1).map((p, i) => {
    const a = routePts[i];
    const d = distKm(a, p);
    return { a, b: p, mid: { x: (a.x + p.x) / 2, y: (a.y + p.y) / 2 }, min: travelMin(d) };
  });

  const handleZoomIn = () => {
    if (mapMode !== 'stylized' && mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || targetZoom) + 1);
    } else {
      setSvgZoom((z) => Math.min(4, z * 1.35));
    }
  };

  const handleZoomOut = () => {
    if (mapMode !== 'stylized' && mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || targetZoom) - 1);
    } else {
      setSvgZoom((z) => Math.max(1, z / 1.35));
    }
  };

  const handleCenterOnMe = () => {
    if (mapMode !== 'stylized' && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(ptToLatLng(current));
      mapInstanceRef.current.setZoom(15);
    } else {
      setSvgCenter({ x: current.x, y: current.y - 4 });
      setSvgZoom(2.2);
    }
  };

  const handleShowAll = () => {
    if (mapMode !== 'stylized' && mapInstanceRef.current && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(HOTEL_COORDS);
      experiences.forEach((e) => bounds.extend(getExperienceCoords(e)));
      bounds.extend(ptToLatLng(current));
      mapInstanceRef.current.fitBounds(bounds, { top: 40, right: 60, bottom: 40, left: 40 });
    } else {
      setSvgCenter({ x: 50, y: 50 });
      setSvgZoom(1);
    }
  };

  const handleToggleLayer = () => {
    setMapMode((prev) => {
      if (prev === 'roadmap') return 'satellite';
      if (prev === 'satellite') return 'stylized';
      return isGmapsLoaded ? 'roadmap' : 'stylized';
    });
  };

  const showGmaps = isGmapsLoaded && mapMode !== 'stylized';

  return (
    <div ref={wrap} className={cx('relative overflow-hidden bg-[#EFEDE6]', className)}>
      {/* Google Maps Container */}
      <div
        ref={mapContainerRef}
        className={cx('h-full w-full transition-opacity duration-300', showGmaps ? 'opacity-100' : 'hidden opacity-0 pointer-events-none')}
      />

      {/* Fallback / Stylized Vector Map */}
      {(!showGmaps || gmapsError) && (
        <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" className="h-full w-full transition-all duration-500" role="img" aria-label="Map of Pune with experiences">
          <defs>
            <pattern id="mapgrid" width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M4 0H0V4" fill="none" stroke="#E4E1D8" strokeWidth=".15" />
            </pattern>
            <linearGradient id="routeg" x1="0" x2="1">
              <stop offset="0" stopColor="#F2711C" />
              <stop offset="1" stopColor="#E0397B" />
            </linearGradient>
          </defs>
          <rect x="-50" y="-50" width="200" height="200" fill="#EFEDE6" />
          <rect x="-50" y="-50" width="200" height="200" fill="url(#mapgrid)" />
          {/* parks & hills */}
          <path d="M18 34 C22 28 32 30 36 36 C38 42 34 48 28 47 C22 47 16 42 18 34Z" fill="#D3E6CB" />
          <path d="M41 72 C43 69 48 70 49 74 C49 78 45 80 42 78Z" fill="#D3E6CB" />
          <circle cx="46" cy="65" r="1.8" fill="#D3E6CB" />
          <path d="M68 70 C71 67 76 68 77 72 C76 75 71 76 68 74Z" fill="#D3E6CB" />
          <path d="M76 28 C79 26 83 28 82 31 C80 33 77 32 76 30Z" fill="#D3E6CB" />
          <path d="M0 90 C10 84 22 86 30 92 L30 110 L0 110Z" fill="#DCE9D2" />
          {/* river */}
          <path d="M-10 46 C6 42 18 36 30 39 S44 45 55 42 S70 35 80 34 S96 30 110 27" stroke="#BCD7EC" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M-10 46 C6 42 18 36 30 39 S44 45 55 42 S70 35 80 34 S96 30 110 27" stroke="#A9CBE5" strokeWidth=".5" fill="none" strokeDasharray="1.5 2" />
          {/* roads */}
          {ROADS.map((r, i) => (
            <g key={i}>
              <path d={r.d} stroke="#DDD7CB" strokeWidth={r.w + 0.5} fill="none" strokeLinecap="round" />
              <path d={r.d} stroke={r.major ? '#FFE7BD' : '#FFFFFF'} strokeWidth={r.w} fill="none" strokeLinecap="round" />
            </g>
          ))}
          {LABELS.map(([t, lx, ly]) => (
            <text key={t} x={lx} y={ly} fontSize={10 * u} fontWeight={700} letterSpacing={1.5 * u} fill="#A39C8C" textAnchor="middle" style={{ fontFamily: 'Plus Jakarta Sans, system-ui' }}>
              {t}
            </text>
          ))}
          <text x="68" y="31" fontSize={10 * u} fill="#7FA8C9" fontStyle="italic" style={{ fontFamily: 'Plus Jakarta Sans, system-ui' }}>
            Mula-Mutha river
          </text>

          {/* route */}
          {routePts.length > 1 && (
            <>
              <polyline points={routePts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#fff" strokeWidth={8 * u} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={routePts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="url(#routeg)" strokeWidth={4 * u} strokeDasharray={`${9 * u} ${6 * u}`} strokeLinejoin="round" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to={-15 * u} dur=".8s" repeatCount="indefinite" />
              </polyline>
              {legs.map((l, i) =>
                l.min > 0 && distKm(l.a, l.b) > 0.15 ? (
                  <g key={i} transform={`translate(${l.mid.x} ${l.mid.y}) scale(${(46 * u) / 7.2})`}>
                    <rect x="-3.6" y="-1.6" width="7.2" height="3.2" rx="1.6" fill="#0B1433" />
                    <text y=".55" fontSize="1.55" fontWeight={700} fill="#fff" textAnchor="middle" style={{ fontFamily: 'Plus Jakarta Sans, system-ui' }}>
                      {l.min} min
                    </text>
                  </g>
                ) : null,
              )}
            </>
          )}

          {/* hotel */}
          <g transform={`translate(${HOTEL.x} ${HOTEL.y}) scale(${(24 * u) / 4.4})`}>
            <rect x="-2.2" y="-6.2" width="4.4" height="4.4" rx="1.2" fill="#0B1433" />
            <path d="M-0.8 -1.8 L0 -.6 L.8 -1.8Z" fill="#0B1433" />
            <text y="-3.2" fontSize="2.4" fill="#fff" textAnchor="middle" fontWeight={800} style={{ fontFamily: 'Plus Jakarta Sans, system-ui' }}>
              H
            </text>
          </g>

          {/* experiences */}
          {experiences.map((e) => {
            const sel = e.id === selectedId;
            const inRoute = route.includes(e.id);
            const idx = route.indexOf(e.id);
            const c = getCategoryMeta(e.category).tone;
            const faded = dimOthers && route.length > 0 && !inRoute && !sel;
            return (
              <g
                key={e.id}
                transform={`translate(${e.x} ${e.y}) scale(${(sel ? 1.35 : 1) * s})`}
                className="cursor-pointer transition-transform"
                onClick={() => onSelect?.(e.id)}
                opacity={faded ? 0.35 : 1}
                role="button"
                aria-label={e.title}
              >
                <path d="M0 0 C-1 -1.6 -3 -3 -3 -5.2 A3 3 0 0 1 3 -5.2 C3 -3 1 -1.6 0 0Z" fill={sel ? '#0B1433' : c} stroke="#fff" strokeWidth=".45" />
                {inRoute ? (
                  <text y="-4.3" fontSize="2.6" fill="#fff" textAnchor="middle" fontWeight={800} style={{ fontFamily: 'Plus Jakarta Sans, system-ui' }}>
                    {idx + 1}
                  </text>
                ) : (
                  <text y="-4.3" fontSize="2.3" textAnchor="middle">
                    {getCategoryMeta(e.category).emoji}
                  </text>
                )}
                {sel && (
                  <g transform="translate(0 -10.5)">
                    <rect x={-e.title.length * 0.52} y="-1.9" width={e.title.length * 1.04} height="3.4" rx="1.2" fill="#fff" stroke="#E6E3DA" strokeWidth=".15" />
                    <text y=".55" fontSize="1.65" fontWeight={700} fill="#0B1433" textAnchor="middle" style={{ fontFamily: 'Plus Jakarta Sans, system-ui' }}>
                      {e.title}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* traveler */}
          <g transform={`translate(${current.x} ${current.y})`}>
            <circle r={14 * u} fill="#3B82F6" opacity=".25" className="origin-center animate-pulse-ring" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
            <circle r={7 * u} fill="#3B82F6" stroke="#fff" strokeWidth={3 * u} />
          </g>
        </svg>
      )}

      {/* Rain Effect */}
      {rain && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-blue-900/10 backdrop-blur-[0.5px]">
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-blue-950/80 px-3 py-1 text-[11px] font-semibold text-blue-200 shadow-sm backdrop-blur-md">
            <CloudRain size={13} className="text-blue-300" />
            <span>Rain forecast: indoor alternatives highlighted</span>
          </div>
        </div>
      )}

      {/* Active Searched Indian Place Overlay Banner */}
      {activePlace && (
        <div className="absolute top-20 left-4 z-30 flex items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-2.5 shadow-lift border border-ink-100 backdrop-blur-md animate-fade-up max-w-[90%] sm:max-w-md">
          <span className="text-xl">📍</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[14px] font-bold text-ink-950">{activePlace.name}</span>
              {activePlace.category && (
                <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 uppercase">
                  {activePlace.category}
                </span>
              )}
            </div>
            <div className="truncate text-[12px] font-medium text-ink-500">
              {[activePlace.city, activePlace.state].filter(Boolean).join(', ')} · 3D Earth Camera
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActivePlace(null);
              if (highlightedMarkerRef.current) highlightedMarkerRef.current.setMap(null);
              if (infoWindowRef.current) infoWindowRef.current.close();
            }}
            aria-label="Dismiss place card"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mode / API Status Badge */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-ink-800 shadow-sm backdrop-blur-md">
        {showGmaps ? (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Google 3D Maps ({mapMode === 'satellite' ? '3D Satellite Earth' : 'Roadmap'})
              {isFlying ? ' · Flying Camera…' : ''}
            </span>
          </>
        ) : gmapsError ? (
          <>
            <AlertCircle size={12} className="text-amber-600" />
            <span>Stylized Map (Offline / SVG Mode)</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-spin" />
            <span>Loading Google Maps...</span>
          </>
        )}
      </div>

      {/* Map Controls */}
      {controls && (
        <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
          <MapBtn label="Zoom in" onClick={handleZoomIn}>
            <Plus size={18} />
          </MapBtn>
          <MapBtn label="Zoom out" onClick={handleZoomOut}>
            <Minus size={18} />
          </MapBtn>
          <MapBtn label="Centre on me" onClick={handleCenterOnMe}>
            <LocateFixed size={18} />
          </MapBtn>
          <MapBtn label="Show all" onClick={handleShowAll}>
            <MapPin size={17} />
          </MapBtn>
          <MapBtn
            label="Toggle 3D Satellite Earth"
            onClick={() => {
              setMapMode('satellite');
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setMapTypeId('hybrid');
                mapInstanceRef.current.setTilt(45);
              }
            }}
          >
            <span className="font-extrabold text-[12px] tracking-tight">3D</span>
          </MapBtn>
          <MapBtn
            label={mapMode === 'roadmap' ? 'Switch to Satellite' : mapMode === 'satellite' ? 'Switch to Stylized Map' : 'Switch to Google Maps'}
            onClick={handleToggleLayer}
          >
            <Layers size={17} />
          </MapBtn>
        </div>
      )}
    </div>
  );
}

function MapBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-xl bg-white text-ink-800 shadow-card transition-transform hover:bg-ink-50 active:scale-95"
    >
      {children}
    </button>
  );
}
