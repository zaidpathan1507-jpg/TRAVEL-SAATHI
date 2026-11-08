export type Category =
  | 'food'
  | 'culture'
  | 'adventure'
  | 'art'
  | 'music'
  | 'shopping'
  | 'nature'
  | 'nightlife'
  | 'history'
  | 'family';

export interface Slot {
  /** minutes from midnight */
  time: number;
  left: number;
  capacity: number;
}

export interface Review {
  name: string;
  from: string;
  rating: number;
  text: string;
  when: string;
  type: 'Family' | 'Couple' | 'Solo' | 'Friends';
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
  whatsapp?: string;
}

export interface Provider {
  id: string;
  name: string;
  host: string;
  verified: boolean;
  responseMin: number;
  since: number;
  social?: SocialLinks;
}

export interface Experience {
  id: string;
  /** Real GPS position. Set for live places (Google Places); catalog experiences use the map grid x/y. */
  geo?: { lat: number; lng: number };
  title: string;
  tagline: string;
  category: Category;
  tags: Category[];
  /** Optional real photo URL. When absent, a placeholder image is rendered. */
  image?: string;
  area: string;
  address: string;
  /** Position on the stylised city map (0–100 grid, 1 unit ≈ 100 m) */
  x: number;
  y: number;
  durationMin: number;
  price: number;
  childPrice?: number;
  rating: number;
  reviews: number;
  slots: Slot[];
  indoor: boolean;
  familyFriendly: boolean;
  wheelchair: boolean;
  vegetarian?: boolean;
  walking: 'low' | 'medium' | 'high';
  languages: string[];
  provider: Provider;
  about: string;
  included: string[];
  highlights: string[];
  accessibility: string[];
  reviewsList: Review[];
  badge?: 'Hidden gem' | 'Local favourite' | 'Trending' | 'New' | 'Seasonal';
  social?: SocialLinks;
}

export type GroupType = 'family' | 'couple' | 'solo' | 'friends';

export interface Trip {
  city: string;
  /** available time in minutes */
  minutes: number;
  budget: number;
  budgetMode: 'person' | 'group';
  adults: number;
  children: number;
  groupType: GroupType;
  interests: Category[];
  maxKm: number;
  wheelchair: boolean;
  lowWalking: boolean;
  indoorOnly: boolean;
  vegetarian: boolean;
  /** plan start in minutes from midnight */
  startMin: number;
  weather: 'clear' | 'rain';
}

export interface Reason {
  ok: boolean;
  text: string;
  kind: 'distance' | 'time' | 'budget' | 'group' | 'interest' | 'availability' | 'weather' | 'access' | 'rating';
}

export interface MatchResult {
  score: number;
  reasons: Reason[];
  breakdown: { key: string; label: string; value: number; weight: number }[];
  distance: number;
  travel: number;
  nextSlot?: Slot;
}

export interface TimelineItem {
  kind: 'travel' | 'activity' | 'return';
  start: number;
  end: number;
  label: string;
  sub?: string;
  expId?: string;
  distance?: number;
  mode?: 'walk' | 'auto';
}

export interface Plan {
  items: TimelineItem[];
  totalMin: number;
  travelKm: number;
  groupCost: number;
  perPerson: number;
  endMin: number;
}

export type BookingStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';

export interface ProviderBooking {
  id: string;
  customer: string;
  from: string;
  expId: string;
  date: string;
  time: number;
  adults: number;
  children: number;
  amount: number;
  payment: 'UPI' | 'Card' | 'Pay later' | 'Razorpay';
  status: BookingStatus;
  travelerType: 'Family' | 'Couple' | 'Solo' | 'Friends';
  isNew?: boolean;
  note?: string;
}

export interface TravelerBooking {
  id: string;
  expIds: string[];
  date: string;
  times: number[];
  adults: number;
  children: number;
  total: number;
  payment: string;
  /** Razorpay payment id, when paid online */
  paymentId?: string;
  createdAt: number;
}
