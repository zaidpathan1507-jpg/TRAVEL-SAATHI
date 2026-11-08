import { useEffect, useMemo, useState } from 'react';
import { Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, Sun, Wind, type LucideIcon } from 'lucide-react';
import { api, type StopForecast } from '../api/client';
import type { TimelineItem } from './types';
import { byId } from '../data/experiences';
import { getExperienceCoords } from './geo';

/** Condition type from the backend -> icon */
export function weatherIcon(type: string, day: boolean): LucideIcon {
  const t = type.toUpperCase();
  if (t.includes('THUNDER')) return CloudLightning;
  if (/SNOW|HAIL|SLEET|FLURR|BLIZZARD/.test(t)) return CloudSnow;
  if (/RAIN|SHOWER|DRIZZLE/.test(t)) return CloudRain;
  if (/FOG|HAZE|MIST|SMOKE/.test(t)) return CloudFog;
  if (t.includes('WIND')) return Wind;
  if (t.includes('PARTLY')) return day ? CloudSun : CloudMoon;
  if (t.includes('CLOUD')) return Cloud;
  return day ? Sun : Moon;
}

export const isWet = (w: StopForecast) => (w.rainChance ?? 0) >= 50 || (w.rainMm ?? 0) > 0;

export type StopWeatherState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; stops: StopForecast[]; asOf: Date };

const REFRESH_MS = 10 * 60 * 1000;

/** Live weather (OpenWeather via the backend) at each itinerary stop's own location, right now */
export function useStopWeather(items: TimelineItem[]): StopWeatherState {
  const stops = useMemo(
    () =>
      items
        .filter((i) => i.kind === 'activity' && i.expId)
        .map((i) => {
          const exp = byId(i.expId!);
          const c = getExperienceCoords(exp);
          return { id: exp.id, name: exp.title, lat: c.lat, lng: c.lng };
        }),
    [items],
  );
  const key = JSON.stringify(stops);
  const [state, setState] = useState<StopWeatherState>({ status: 'loading' });

  useEffect(() => {
    if (!stops.length) return;
    let live = true;
    const load = (first: boolean) => {
      if (first) setState({ status: 'loading' });
      api
        .weather(stops)
        .then((r) => live && setState({ status: 'ok', stops: r.stops, asOf: new Date(r.asOf) }))
        // keep the last good data if a refresh fails
        .catch((e: Error) => live && setState((prev) => (prev.status === 'ok' ? prev : { status: 'error', message: e.message || 'Could not reach the backend' })));
    };
    load(true);
    const timer = setInterval(() => load(false), REFRESH_MS); // arrival is "now", so keep it current
    return () => {
      live = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
