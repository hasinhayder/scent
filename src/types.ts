/** Type definitions for perfume search results, accords, notes, and caching. */
export interface SearchResult {
  name: string;
  brand: string;
  url: string;
  gender: string;
  year: string | null;
}

/** A perfume accord with its intensity percentage. */
export interface Accord {
  name: string;
  intensity: number;
}

/** Three-tier pyramid of fragrance notes. */
export interface NotesPyramid {
  top: string[];
  middle: string[];
  base: string[];
}

/** Full scraped profile for a single perfume. */
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

/** A cached search result set with timestamp. */
export interface CacheEntry {
  query: string;
  results: SearchResult[];
  timestamp: number;
}
