import { describe, expect, it } from "vitest";
import type { MemorySearchResult } from "./types.js";
import { rerankResults } from "./reranker.js";

function result(overrides: Partial<MemorySearchResult>): MemorySearchResult {
  return {
    path: "test.md",
    snippet: "Some content here with enough characters to be meaningful for testing purposes",
    score: 0.5,
    source: "memory",
    ...overrides,
  };
}

describe("rerankResults", () => {
  it("returns empty array for empty input", () => {
    expect(rerankResults([], "query")).toEqual([]);
  });

  it("passes through when disabled", () => {
    const results = [result({ score: 0.3 }), result({ score: 0.8 })];
    const reranked = rerankResults(results, "test", { enabled: false });
    expect(reranked).toEqual(results);
  });

  it("boosts results where query terms appear in snippet", () => {
    const a = result({ snippet: "something unrelated content padding to reach minimum length threshold chars" });
    const b = result({ snippet: "the answer to query about testing is here with plenty of characters to pass minimum" });
    const reranked = rerankResults([a, b], "testing answer");
    // b should be boosted because "testing" and "answer" appear in its snippet
    expect(reranked[0]!.snippet).toContain("testing");
  });

  it("penalizes short snippets", () => {
    const short = result({ snippet: "short", score: 0.9 });
    const long = result({ snippet: "This is a longer snippet with sufficient content to avoid the penalty threshold", score: 0.85 });
    const reranked = rerankResults([short, long], "test");
    // Long snippet should rank higher despite lower base score
    expect(reranked[0]!.snippet).toContain("longer");
  });

  it("applies source weights", () => {
    const mem = result({ source: "memory", score: 0.5 });
    const sess = result({ source: "sessions", score: 0.55 });
    const reranked = rerankResults([mem, sess], "query", {
      sourceWeights: { memory: 1.0, sessions: 0.7 },
    });
    // Memory source (1.0 * 0.5 = 0.5) should beat sessions (0.7 * 0.55 = 0.385)
    expect(reranked[0]!.source).toBe("memory");
  });

  it("does not mutate the original array", () => {
    const results = [result({ score: 0.3 }), result({ score: 0.8 })];
    const copy = [...results];
    rerankResults(results, "test");
    expect(results).toEqual(copy);
  });

  it("sorts by adjusted score descending", () => {
    const results = [
      result({ score: 0.3 }),
      result({ score: 0.9 }),
      result({ score: 0.6 }),
    ];
    const reranked = rerankResults(results, "query");
    for (let i = 1; i < reranked.length; i++) {
      expect(reranked[i - 1]!.score).toBeGreaterThanOrEqual(reranked[i]!.score);
    }
  });
});
