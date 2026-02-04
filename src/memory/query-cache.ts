/**
 * In-memory query result cache for the memory search engine.
 *
 * Caches search results keyed by query string + maxResults, with TTL-based
 * expiry and LRU-style eviction when the entry limit is reached.
 */

import type { MemorySearchResult } from "./types.js";

export type QueryCacheConfig = {
  enabled: boolean;
  /** Maximum number of cached entries. */
  maxEntries: number;
  /** Time-to-live in milliseconds. */
  ttlMs: number;
};

export const DEFAULT_QUERY_CACHE_CONFIG: QueryCacheConfig = {
  enabled: true,
  maxEntries: 100,
  ttlMs: 60_000,
};

type CacheEntry = {
  results: MemorySearchResult[];
  timestamp: number;
};

function cacheKey(query: string, maxResults: number): string {
  return `${maxResults}:${query}`;
}

export class QueryCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly config: QueryCacheConfig;

  constructor(config: Partial<QueryCacheConfig> = {}) {
    this.config = { ...DEFAULT_QUERY_CACHE_CONFIG, ...config };
  }

  get(query: string, maxResults: number): MemorySearchResult[] | null {
    if (!this.config.enabled) return null;
    const key = cacheKey(query, maxResults);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.results;
  }

  set(query: string, maxResults: number, results: MemorySearchResult[]): void {
    if (!this.config.enabled) return;
    const key = cacheKey(query, maxResults);
    // Evict oldest if at capacity.
    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.evictOldest();
    }
    this.cache.set(key, { results, timestamp: Date.now() });
  }

  /** Clear all cached entries (e.g. after index sync). */
  invalidate(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
