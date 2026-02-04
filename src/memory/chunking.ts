/**
 * Document chunking strategies for the memory index.
 *
 * Splits document text into overlapping chunks suitable for embedding.
 * Different strategies are available for different content types:
 *   - markdown: splits on heading boundaries (existing logic from internal.ts)
 *   - code: splits on blank-line boundaries (function/class gaps)
 *   - text: splits on paragraph boundaries (double newline)
 */

import { hashText, type MemoryChunk } from "./internal.js";

export type ChunkingStrategy = "markdown" | "code" | "text" | "auto";

export type ChunkingConfig = {
  tokens: number;
  overlap: number;
  strategy?: ChunkingStrategy;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Chunk a document's content using the specified (or auto-detected) strategy.
 */
export function chunkDocument(
  content: string,
  config: ChunkingConfig,
  metadata?: { extension?: string },
): MemoryChunk[] {
  const strategy = config.strategy ?? resolveStrategy(metadata?.extension);
  switch (strategy) {
    case "code":
      return chunkCode(content, config);
    case "text":
      return chunkText(content, config);
    case "markdown":
    default:
      return chunkByLines(content, config);
  }
}

/**
 * Auto-detect the best chunking strategy based on file extension.
 */
export function resolveStrategy(ext?: string): ChunkingStrategy {
  if (!ext) return "markdown";
  const lower = ext.toLowerCase();
  if ([".md", ".mdx"].includes(lower)) return "markdown";
  if (
    [".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h"].includes(
      lower,
    )
  )
    return "code";
  if ([".txt", ".log"].includes(lower)) return "text";
  if ([".html", ".htm"].includes(lower)) return "text";
  return "markdown";
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type LineEntry = { line: string; lineNo: number };

function maxCharsFromTokens(tokens: number): number {
  return Math.max(32, tokens * 4);
}

function overlapCharsFromTokens(overlap: number): number {
  return Math.max(0, overlap * 4);
}

function flushChunk(entries: LineEntry[]): MemoryChunk | null {
  if (entries.length === 0) return null;
  const first = entries[0]!;
  const last = entries[entries.length - 1]!;
  const text = entries.map((e) => e.line).join("\n");
  return {
    startLine: first.lineNo,
    endLine: last.lineNo,
    text,
    hash: hashText(text),
  };
}

function computeOverlap(entries: LineEntry[], overlapChars: number): LineEntry[] {
  if (overlapChars <= 0 || entries.length === 0) return [];
  let acc = 0;
  const kept: LineEntry[] = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    acc += entry.line.length + 1;
    kept.unshift(entry);
    if (acc >= overlapChars) break;
  }
  return kept;
}

// ---------------------------------------------------------------------------
// Markdown / generic line-based chunking (mirrors existing chunkMarkdown)
// ---------------------------------------------------------------------------

function chunkByLines(
  content: string,
  config: ChunkingConfig,
): MemoryChunk[] {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const maxChars = maxCharsFromTokens(config.tokens);
  const overlapChars = overlapCharsFromTokens(config.overlap);
  const chunks: MemoryChunk[] = [];
  let current: LineEntry[] = [];
  let currentChars = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    // Long lines get split into segments.
    const segments: string[] =
      line.length === 0 ? [""] : splitIntoSegments(line, maxChars);

    for (const segment of segments) {
      const size = segment.length + 1;
      if (currentChars + size > maxChars && current.length > 0) {
        const chunk = flushChunk(current);
        if (chunk) chunks.push(chunk);
        current = computeOverlap(current, overlapChars);
        currentChars = current.reduce((s, e) => s + e.line.length + 1, 0);
      }
      current.push({ line: segment, lineNo });
      currentChars += size;
    }
  }
  const last = flushChunk(current);
  if (last) chunks.push(last);
  return chunks;
}

function splitIntoSegments(line: string, maxChars: number): string[] {
  const segs: string[] = [];
  for (let start = 0; start < line.length; start += maxChars) {
    segs.push(line.slice(start, start + maxChars));
  }
  return segs;
}

// ---------------------------------------------------------------------------
// Code chunking: prefer splits at blank-line boundaries
// ---------------------------------------------------------------------------

function chunkCode(content: string, config: ChunkingConfig): MemoryChunk[] {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const maxChars = maxCharsFromTokens(config.tokens);
  const overlapChars = overlapCharsFromTokens(config.overlap);
  const chunks: MemoryChunk[] = [];
  let current: LineEntry[] = [];
  let currentChars = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    const size = line.length + 1;
    const isBlank = line.trim().length === 0;

    // At a blank line and the buffer is >=50% full, flush.
    if (isBlank && currentChars >= maxChars * 0.5 && current.length > 0) {
      current.push({ line, lineNo });
      currentChars += size;
      const chunk = flushChunk(current);
      if (chunk) chunks.push(chunk);
      current = computeOverlap(current, overlapChars);
      currentChars = current.reduce((s, e) => s + e.line.length + 1, 0);
      continue;
    }

    if (currentChars + size > maxChars && current.length > 0) {
      const chunk = flushChunk(current);
      if (chunk) chunks.push(chunk);
      current = computeOverlap(current, overlapChars);
      currentChars = current.reduce((s, e) => s + e.line.length + 1, 0);
    }

    current.push({ line, lineNo });
    currentChars += size;
  }

  const last = flushChunk(current);
  if (last) chunks.push(last);
  return chunks;
}

// ---------------------------------------------------------------------------
// Text chunking: split on paragraph boundaries (double newline)
// ---------------------------------------------------------------------------

function chunkText(content: string, config: ChunkingConfig): MemoryChunk[] {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const maxChars = maxCharsFromTokens(config.tokens);
  const overlapChars = overlapCharsFromTokens(config.overlap);
  const chunks: MemoryChunk[] = [];
  let current: LineEntry[] = [];
  let currentChars = 0;
  let prevBlank = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    const size = line.length + 1;
    const isBlank = line.trim().length === 0;

    // Double blank line = paragraph break; flush if we have content.
    if (isBlank && prevBlank && current.length > 0) {
      const chunk = flushChunk(current);
      if (chunk) chunks.push(chunk);
      current = computeOverlap(current, overlapChars);
      currentChars = current.reduce((s, e) => s + e.line.length + 1, 0);
      prevBlank = false;
      continue;
    }
    prevBlank = isBlank;

    if (currentChars + size > maxChars && current.length > 0) {
      const chunk = flushChunk(current);
      if (chunk) chunks.push(chunk);
      current = computeOverlap(current, overlapChars);
      currentChars = current.reduce((s, e) => s + e.line.length + 1, 0);
    }

    current.push({ line, lineNo });
    currentChars += size;
  }

  const last = flushChunk(current);
  if (last) chunks.push(last);
  return chunks;
}
