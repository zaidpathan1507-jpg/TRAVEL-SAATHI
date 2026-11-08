import type { ProviderBooking } from '../lib/types';

export const TODAY = new Date(2026, 8, 25); // Fri, 25 Sep 2026 (demo date)

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', opts);
};
export const TODAY_ISO = isoDate(TODAY);

/** The signed-in provider for the demo */
export const ME = {
  id: 'heritage',
  owner: 'Raj',
  business: 'Pune Heritage Walks',
  city: 'Pune',
  rating: 4.8,
  social: {
    instagram: 'https://instagram.com/heritage_demo',
  },
};

export const PROVIDER_EXP_IDS = ['pune-food-walk', 'shaniwar-wada-story', 'tulshibaug-market', 'kasba-ganpati'];

export const SEED_BOOKINGS: ProviderBooking[] = [
  { id: 'ANV-24811', customer: 'Priya Nair', from: 'Bengaluru', expId: 'pune-food-walk', date: TODAY_ISO, time: 990, adults: 2, children: 1, amount: 1950, payment: 'UPI', status: 'Confirmed', travelerType: 'Family' },
  { id: 'ANV-24808', customer: 'Daniel Keller', from: 'Berlin', expId: 'shaniwar-wada-story', date: TODAY_ISO, time: 1020, adults: 1, children: 0, amount: 300, payment: 'Card', status: 'Confirmed', travelerType: 'Solo' },
  { id: 'ANV-24805', customer: 'Neha & Arjun Rao', from: 'Mumbai', expId: 'pune-food-walk', date: TODAY_ISO, time: 1050, adults: 2, children: 0, amount: 1500, payment: 'UPI', status: 'Pending', travelerType: 'Couple', note: 'Asked for a Jain menu' },
  { id: 'ANV-24799', customer: 'Kiran Mehta', from: 'Hyderabad', expId: 'tulshibaug-market', date: TODAY_ISO, time: 1050, adults: 3, children: 2, amount: 750, payment: 'Pay later', status: 'Pending', travelerType: 'Family' },
  { id: 'ANV-24790', customer: 'Sara Lindqvist', from: 'Stockholm', expId: 'pune-food-walk', date: '2026-09-26', time: 990, adults: 2, children: 0, amount: 1500, payment: 'Card', status: 'Confirmed', travelerType: 'Couple' },
  { id: 'ANV-24786', customer: 'The Iyer family', from: 'Chennai', expId: 'shaniwar-wada-story', date: '2026-09-26', time: 975, adults: 2, children: 2, amount: 900, payment: 'UPI', status: 'Confirmed', travelerType: 'Family' },
  { id: 'ANV-24770', customer: 'Aditya Kulkarni', from: 'Nagpur', expId: 'pune-food-walk', date: '2026-09-24', time: 1140, adults: 4, children: 0, amount: 3000, payment: 'UPI', status: 'Completed', travelerType: 'Friends' },
  { id: 'ANV-24768', customer: 'Helen Brooks', from: 'Toronto', expId: 'shaniwar-wada-story', date: '2026-09-24', time: 1020, adults: 2, children: 0, amount: 600, payment: 'Card', status: 'Completed', travelerType: 'Couple' },
  { id: 'ANV-24751', customer: 'Rohit Sharma', from: 'Delhi', expId: 'tulshibaug-market', date: '2026-09-23', time: 960, adults: 1, children: 0, amount: 250, payment: 'UPI', status: 'Cancelled', travelerType: 'Solo', note: 'Flight rescheduled' },
  { id: 'ANV-24744', customer: 'Fatima Sheikh', from: 'Kochi', expId: 'pune-food-walk', date: '2026-09-23', time: 990, adults: 2, children: 2, amount: 2400, payment: 'Card', status: 'Completed', travelerType: 'Family' },
];

/** 14 days of analytics, oldest first, ending today */
export const SERIES = {
  days: Array.from({ length: 14 }, (_, i) => isoDate(addDays(TODAY, i - 13))),
  views: [412, 438, 401, 466, 520, 610, 655, 498, 515, 560, 602, 688, 742, 796],
  bookings: [9, 11, 8, 12, 14, 19, 21, 12, 13, 15, 17, 22, 24, 27],
  revenue: [9800, 11200, 8600, 12900, 15400, 21800, 23900, 13100, 14200, 16700, 18900, 24800, 27100, 30400],
};

export const POPULAR = [
  { id: 'pune-food-walk', bookings: 142, revenue: 118400 },
  { id: 'shaniwar-wada-story', bookings: 96, revenue: 27600 },
  { id: 'tulshibaug-market', bookings: 41, revenue: 9100 },
  { id: 'kasba-ganpati', bookings: 23, revenue: 1900 },
];

export const TRAVELER_MIX = [
  { label: 'Families', value: 44, color: '#F2711C' },
  { label: 'Couples', value: 24, color: '#0F9D8A' },
  { label: 'Solo', value: 19, color: '#4E6BD6' },
  { label: 'Friends', value: 13, color: '#C22463' },
];

/** Bookings by day-of-week × time band (0 = Mon) */
export const PEAK = {
  bands: ['8–11 AM', '11–2 PM', '2–5 PM', '5–8 PM', '8–11 PM'],
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  grid: [
    [1, 2, 4, 6, 2],
    [1, 1, 3, 5, 2],
    [0, 2, 4, 6, 3],
    [1, 2, 5, 7, 3],
    [2, 3, 6, 11, 5],
    [5, 7, 9, 14, 8],
    [6, 8, 8, 12, 4],
  ],
};

export const DEMAND_SIGNALS = [
  { label: 'Family + culture', share: 38, trend: +22 },
  { label: 'Food under ₹1,000', share: 27, trend: +31 },
  { label: 'Indoor / rain-proof', share: 18, trend: +64 },
  { label: 'Short (< 2 hours)', share: 17, trend: +12 },
];
