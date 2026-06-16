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

export interface Ritual {
  id: string;
  name: string;
  category: 'Warm-up' | 'Calibrate' | 'Relief' | 'Resonance' | 'Hydration';
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  instructionSteps: string[];
  primaryFocus: string;
  benefits: string[];
}

