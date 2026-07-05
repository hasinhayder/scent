export interface SearchResult {
  name: string;
  brand: string;
  url: string;
  gender: string;
  year: string | null;
}

export interface Accord {
  name: string;
  intensity: number;
}

export interface NotesPyramid {
  top: string[];
  middle: string[];
  base: string[];
}

export interface PerfumeResult {
  name: string;
  brand: string;
  year: string | null;
  gender: string;
  rating: number | null;
  votes: number | null;
  accords: Accord[];
  notes: NotesPyramid;
  description: string;
  perfumers: string[];
  url: string;
}

export interface CacheEntry {
  query: string;
  results: SearchResult[];
  timestamp: number;
}
