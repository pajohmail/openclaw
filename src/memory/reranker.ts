/**
 * Post-retrieval re-ranking for memory search results.
 *
 * Applied after the hybrid vector+keyword merge to refine scoring based on
 * lightweight heuristics (term match boost, short snippet penalty, source
 * weight). This step is inexpensive and runs entirely in-process.
 */

import type { MemorySearchResult } from "./types.js";

export type RerankerConfig = {
  enabled: boolean;
  /** Extra score boost when query terms appear in the snippet. */
  termMatchBoost: number;
  /** Penalize snippets shorter than this many characters. */
  minSnippetChars: number;
  /** Multiplier per source (e.g. memory: 1.0, sessions: 0.9). */
  sourceWeights: Record<string, number>;
};

export const DEFAULT_RERANKER_CONFIG: RerankerConfig = {
  enabled: true,
  termMatchBoost: 0.15,
  minSnippetChars: 50,
  sourceWeights: { memory: 1.0, sessions: 0.9 },
};

/**
 * Re-rank search results using lightweight heuristics.
 * Returns a new sorted array; does not mutate the input.
 */
export function rerankResults(
  results: MemorySearchResult[],
  query: string,
  config: Partial<RerankerConfig> = {},
): MemorySearchResult[] {
  const cfg: RerankerConfig = { ...DEFAULT_RERANKER_CONFIG, ...config };
  if (!cfg.enabled || results.length === 0) return results;

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const scored = results.map((result) => {
    let adjustedScore = result.score;

    // Term match boost: if query terms appear in the snippet.
    if (queryTerms.length > 0) {
      const snippetLower = result.snippet.toLowerCase();
      const matchCount = queryTerms.filter((t) => snippetLower.includes(t)).length;
      const ratio = matchCount / queryTerms.length;
      adjustedScore += ratio * cfg.termMatchBoost;
    }

    // Short snippet penalty.
    if (result.snippet.length < cfg.minSnippetChars) {
      adjustedScore *= 0.8;
    }

    // Source weight.
    const sourceWeight = cfg.sourceWeights[result.source] ?? 1.0;
    adjustedScore *= sourceWeight;

    return { ...result, score: adjustedScore };
  });

  return scored.toSorted((a, b) => b.score - a.score);
}
