export type AttractionType = 'sight' | 'hotel' | 'food' | 'cafe' | 'drink';

export interface Attraction {
  id: string;
  name: string;
  type: AttractionType;
  x: number; // percentage coordinate on our stylized map
  y: number; // percentage coordinate on our stylized map
  description: string;
  rating: number;
  imageUrl: string;
}

export interface MonthlyData {
  month: string;
  value: number; // For crowd density or seasonal prices
  isActive?: boolean;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  imageUrl: string;
  thumbnails: string[];
  basePriceMin: number;
  basePriceMax: number;
  weatherTemp: number;
  weatherStatus: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  activeMonth: string;
  monthlyBusy: MonthlyData[];
  monthlyPrices: number[];
  attractions: Attraction[];
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isCustomCard?: boolean;
  cardData?: {
    title: string;
    description: string;
    type: 'hotel' | 'route' | 'attraction';
    details?: string;
    price?: string;
  };
}

export interface TodoItem {
  id: string;
  title: string;
  category: string;
  completed: boolean;
}

export interface RitualMedia {
  type: 'image' | 'video';
  url: string;
}

export interface Ritual {
  id: string;
  name: string;
  category: 'Ground' | 'Breathe' | 'Warm Up' | 'Release' | 'Resonate' | 'Build';
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  instructionSteps: string[];
  primaryFocus: string;
  benefits: string[];
  // Optional — edited in Sanity. Shown in the ritual overview hero (browsing the library) and in
  // the active-practice player, respectively. Undefined/null for rituals with no media uploaded,
  // which keep the existing procedural animation/icon visuals as-is.
  overviewMedia?: RitualMedia | null;
  playerMedia?: RitualMedia | null;
}

