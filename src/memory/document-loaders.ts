/**
 * Document loaders for the memory index.
 *
 * Each loader converts a file on disk into plain text suitable for embedding
 * and search. The default (and only historically supported) format is Markdown;
 * additional loaders can be enabled via config to index code, plain text, and
 * HTML files.
 */

import fs from "node:fs/promises";
import path from "node:path";

export type DocumentContent = {
  text: string;
  metadata?: Record<string, string>;
};

export type DocumentLoader = {
  /** File extensions this loader handles (including leading dot). */
  extensions: string[];
  load(absPath: string): Promise<DocumentContent>;
};

// ---------------------------------------------------------------------------
// Built-in loaders
// ---------------------------------------------------------------------------

export const markdownLoader: DocumentLoader = {
  extensions: [".md", ".mdx"],
  async load(absPath) {
    const text = await fs.readFile(absPath, "utf-8");
    return { text };
  },
};

export const plainTextLoader: DocumentLoader = {
  extensions: [".txt", ".log"],
  async load(absPath) {
    const text = await fs.readFile(absPath, "utf-8");
    return { text };
  },
};

export const codeLoader: DocumentLoader = {
  extensions: [".ts", ".js", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".tsx", ".jsx"],
  async load(absPath) {
    const text = await fs.readFile(absPath, "utf-8");
    const ext = path.extname(absPath).slice(1);
    return {
      text: `\`\`\`${ext}\n${text}\n\`\`\``,
      metadata: { language: ext },
    };
  },
};

export const htmlLoader: DocumentLoader = {
  extensions: [".html", ".htm"],
  async load(absPath) {
    const raw = await fs.readFile(absPath, "utf-8");
    const text = stripHtmlToText(raw);
    return { text };
  },
};

/** Strip HTML tags and collapse whitespace, keeping readable text. */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Loader configuration
// ---------------------------------------------------------------------------

export type LoadersConfig = {
  /** Enable plain text file indexing (.txt, .log). Default: false. */
  text?: boolean;
  /** Enable code file indexing (.ts, .js, .py, etc.). Default: false. */
  code?: boolean;
  /** Enable HTML file indexing (.html, .htm). Default: false. */
  html?: boolean;
};

const ALL_LOADERS: DocumentLoader[] = [markdownLoader, plainTextLoader, codeLoader, htmlLoader];

/**
 * Return the active loaders based on config. Markdown is always included.
 */
export function resolveLoaders(config?: LoadersConfig): DocumentLoader[] {
  const loaders: DocumentLoader[] = [markdownLoader];
  if (config?.text) loaders.push(plainTextLoader);
  if (config?.code) loaders.push(codeLoader);
  if (config?.html) loaders.push(htmlLoader);
  return loaders;
}

/**
 * Find the appropriate loader for a given file path based on its extension.
 */
export function resolveLoader(
  filePath: string,
  loaders: DocumentLoader[] = ALL_LOADERS,
): DocumentLoader | null {
  const ext = path.extname(filePath).toLowerCase();
  return loaders.find((loader) => loader.extensions.includes(ext)) ?? null;
}

/**
 * Return the union of file extensions supported by the given loaders.
 */
export function getSupportedExtensions(loaders: DocumentLoader[]): Set<string> {
  return new Set(loaders.flatMap((l) => l.extensions));
}
