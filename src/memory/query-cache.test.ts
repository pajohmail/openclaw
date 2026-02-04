import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemorySearchResult } from "./types.js";
import { QueryCache } from "./query-cache.js";

const fakeResult = (id: string): MemorySearchResult => ({
  path: `test/${id}.md`,
  snippet: `Snippet for ${id}`,
  score: 0.9,
  source: "memory",
});

describe("QueryCache", () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache({ enabled: true, maxEntries: 3, ttlMs: 5000 });
  });

  it("returns null for cache miss", () => {
    expect(cache.get("unknown query", 5)).toBeNull();
  });

  it("returns cached results on hit", () => {
    const results = [fakeResult("a")];
    cache.set("test query", 5, results);
    expect(cache.get("test query", 5)).toEqual(results);
  });

  it("distinguishes by maxResults", () => {
    cache.set("query", 5, [fakeResult("a")]);
    cache.set("query", 10, [fakeResult("b")]);
    expect(cache.get("query", 5)?.[0]?.path).toContain("a");
    expect(cache.get("query", 10)?.[0]?.path).toContain("b");
  });

  it("expires entries after TTL", () => {
    vi.useFakeTimers();
    cache.set("q", 5, [fakeResult("a")]);
    expect(cache.get("q", 5)).not.toBeNull();
    vi.advanceTimersByTime(6000);
    expect(cache.get("q", 5)).toBeNull();
    vi.useRealTimers();
  });

  it("evicts oldest when at capacity", () => {
    cache.set("q1", 5, [fakeResult("1")]);
    cache.set("q2", 5, [fakeResult("2")]);
    cache.set("q3", 5, [fakeResult("3")]);
    // At capacity, adding q4 should evict q1 (oldest).
    cache.set("q4", 5, [fakeResult("4")]);
    expect(cache.get("q1", 5)).toBeNull();
    expect(cache.get("q4", 5)).not.toBeNull();
  });

  it("invalidate clears all entries", () => {
    cache.set("q1", 5, [fakeResult("1")]);
    cache.set("q2", 5, [fakeResult("2")]);
    cache.invalidate();
    expect(cache.size).toBe(0);
    expect(cache.get("q1", 5)).toBeNull();
  });

  it("does nothing when disabled", () => {
    const disabled = new QueryCache({ enabled: false });
    disabled.set("q", 5, [fakeResult("a")]);
    expect(disabled.get("q", 5)).toBeNull();
    expect(disabled.size).toBe(0);
  });
});
