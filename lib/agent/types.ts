// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the personalized shopping agent (data model mirrors
// supabase-agent-schema.sql). Kept dependency-free so both server routes and
// background jobs can import them.
// ─────────────────────────────────────────────────────────────────────────────

export type InteractionType =
  | 'viewed'
  | 'saved'
  | 'dismissed'
  | 'clicked_through'
  | 'purchased';

export type MatchFeedback = 'liked' | 'dismissed';

/** A user's learned taste profile (one row per user). */
export interface TasteProfile {
  user_id: string;
  preferred_brands: string[];
  preferred_categories: string[];
  /** e.g. { tops: "M", denim: "29x30", shoes: "8.5" } */
  size_profile: Record<string, string>;
  price_ceiling: number | null;
  style_tags: string[];
  era_preference: string[];
  onboarded?: boolean;
  onboarded_at?: string | null;
  updated_at?: string;
}

/** Structured filters extracted from a saved search's natural-language text. */
export interface ParsedFilters {
  marketplaceQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  categories?: string[];
  colors?: string[];
  sizes?: string[];
  era?: string;
  vibe?: string[];
}

export interface SavedSearch {
  id: number;
  user_id: string;
  query_text: string;
  parsed_filters: ParsedFilters;
  is_active: boolean;
}

/**
 * A candidate listing being scored. Superset of the scraper's Product shape:
 * scrapers give us { title, price, image, url, source, ... }; brand/item_type/
 * size are derived at scoring time from the title when absent.
 */
export interface AgentListing {
  title: string;
  price: number;
  originalPrice?: number | null;
  image?: string;
  url: string;
  source?: string;
  brand?: string | null;
  item_type?: string | null;
  size?: string | null;
  description?: string | null;
}

export interface ScoreComponent {
  key: 'brand' | 'category' | 'price' | 'style' | 'saved_search';
  /** 0..1 raw component score. */
  value: number;
  /** effective weight after renormalizing over applicable components. */
  weight: number;
  /** value * weight — contribution to the final score. */
  contribution: number;
  /** short human phrase for the match reason, if this component is a highlight. */
  phrase?: string;
}

export interface ScoreResult {
  score: number;
  reason: string;
  components: ScoreComponent[];
  /** true when a hard filter (size) zeroed the score. */
  gated: boolean;
}
