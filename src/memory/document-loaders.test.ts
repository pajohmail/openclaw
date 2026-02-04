import { describe, expect, it } from "vitest";
import {
  codeLoader,
  getSupportedExtensions,
  htmlLoader,
  markdownLoader,
  plainTextLoader,
  resolveLoader,
  resolveLoaders,
} from "./document-loaders.js";

describe("resolveLoader", () => {
  it("returns markdownLoader for .md files", () => {
    expect(resolveLoader("README.md")).toBe(markdownLoader);
  });

  it("returns markdownLoader for .mdx files", () => {
    expect(resolveLoader("docs/page.mdx")).toBe(markdownLoader);
  });

  it("returns plainTextLoader for .txt files", () => {
    expect(resolveLoader("notes.txt")).toBe(plainTextLoader);
  });

  it("returns codeLoader for .ts files", () => {
    expect(resolveLoader("index.ts")).toBe(codeLoader);
  });

  it("returns codeLoader for .py files", () => {
    expect(resolveLoader("script.py")).toBe(codeLoader);
  });

  it("returns htmlLoader for .html files", () => {
    expect(resolveLoader("page.html")).toBe(htmlLoader);
  });

  it("returns null for unknown extensions", () => {
    expect(resolveLoader("data.csv")).toBeNull();
  });

  it("is case-insensitive for extensions", () => {
    expect(resolveLoader("README.MD")).toBe(markdownLoader);
  });

  it("respects the provided loader list", () => {
    expect(resolveLoader("test.py", [markdownLoader])).toBeNull();
    expect(resolveLoader("test.py", [codeLoader])).toBe(codeLoader);
  });
});

describe("resolveLoaders", () => {
  it("always includes markdown", () => {
    const loaders = resolveLoaders();
    expect(loaders).toContain(markdownLoader);
  });

  it("includes text loader when enabled", () => {
    const loaders = resolveLoaders({ text: true });
    expect(loaders).toContain(plainTextLoader);
  });

  it("includes code loader when enabled", () => {
    const loaders = resolveLoaders({ code: true });
    expect(loaders).toContain(codeLoader);
  });

  it("includes html loader when enabled", () => {
    const loaders = resolveLoaders({ html: true });
    expect(loaders).toContain(htmlLoader);
  });

  it("only includes markdown by default", () => {
    const loaders = resolveLoaders();
    expect(loaders).toHaveLength(1);
    expect(loaders[0]).toBe(markdownLoader);
  });
});

describe("getSupportedExtensions", () => {
  it("returns extensions from all provided loaders", () => {
    const exts = getSupportedExtensions([markdownLoader, codeLoader]);
    expect(exts).toContain(".md");
    expect(exts).toContain(".ts");
    expect(exts).toContain(".py");
    expect(exts).not.toContain(".txt");
  });
});
