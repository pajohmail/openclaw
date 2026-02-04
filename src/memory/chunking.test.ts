import { describe, expect, it } from "vitest";
import { chunkDocument, resolveStrategy } from "./chunking.js";

describe("resolveStrategy", () => {
  it("returns markdown for .md", () => {
    expect(resolveStrategy(".md")).toBe("markdown");
  });

  it("returns code for .ts", () => {
    expect(resolveStrategy(".ts")).toBe("code");
  });

  it("returns code for .py", () => {
    expect(resolveStrategy(".py")).toBe("code");
  });

  it("returns text for .txt", () => {
    expect(resolveStrategy(".txt")).toBe("text");
  });

  it("returns text for .html", () => {
    expect(resolveStrategy(".html")).toBe("text");
  });

  it("returns markdown for unknown", () => {
    expect(resolveStrategy(".csv")).toBe("markdown");
  });

  it("returns markdown for undefined", () => {
    expect(resolveStrategy()).toBe("markdown");
  });
});

describe("chunkDocument", () => {
  const config = { tokens: 50, overlap: 10 };

  it("chunks short content into a single chunk", () => {
    const chunks = chunkDocument("Hello world", config);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe("Hello world");
    expect(chunks[0]!.startLine).toBe(1);
    expect(chunks[0]!.endLine).toBe(1);
  });

  it("generates non-empty hash for each chunk", () => {
    const chunks = chunkDocument("Hello\nworld", config);
    for (const chunk of chunks) {
      expect(chunk.hash).toBeTruthy();
      expect(chunk.hash.length).toBeGreaterThan(0);
    }
  });

  it("produces overlapping chunks for long content", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1} with some padding text`);
    const content = lines.join("\n");
    const chunks = chunkDocument(content, { tokens: 20, overlap: 5 });
    expect(chunks.length).toBeGreaterThan(1);
    // Check that consecutive chunks have some overlap in line numbers
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1]!;
      const curr = chunks[i]!;
      expect(curr.startLine).toBeLessThanOrEqual(prev.endLine + 1);
    }
  });

  it("respects explicit strategy override", () => {
    const content = "function foo() {}\n\nfunction bar() {}";
    const markdownChunks = chunkDocument(content, { ...config, strategy: "markdown" });
    const codeChunks = chunkDocument(content, { ...config, strategy: "code" });
    // Both should produce valid chunks
    expect(markdownChunks.length).toBeGreaterThan(0);
    expect(codeChunks.length).toBeGreaterThan(0);
  });

  it("auto-detects strategy from extension", () => {
    const content = "def hello():\n    pass\n\ndef world():\n    pass";
    const chunks = chunkDocument(content, config, { extension: ".py" });
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe("code chunking", () => {
  it("prefers splitting at blank lines", () => {
    const lines: string[] = [];
    // Two "functions" separated by a blank line
    for (let i = 0; i < 15; i++) lines.push(`  statement_${i};`);
    lines.push("");
    for (let i = 0; i < 15; i++) lines.push(`  statement_${i + 15};`);

    const chunks = chunkDocument(lines.join("\n"), { tokens: 25, overlap: 3, strategy: "code" });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});

describe("text chunking", () => {
  it("splits on paragraph boundaries", () => {
    const paragraphs = [
      "First paragraph with some text.",
      "",
      "",
      "Second paragraph with some text.",
      "",
      "",
      "Third paragraph with some text.",
    ];
    const chunks = chunkDocument(paragraphs.join("\n"), {
      tokens: 20,
      overlap: 3,
      strategy: "text",
    });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});
