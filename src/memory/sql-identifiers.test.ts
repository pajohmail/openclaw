import { describe, expect, it } from "vitest";
import { assertSafeIdentifier } from "./sql-identifiers.js";

describe("assertSafeIdentifier", () => {
  it("accepts valid identifiers", () => {
    expect(assertSafeIdentifier("chunks", "test")).toBe("chunks");
    expect(assertSafeIdentifier("chunks_vec", "test")).toBe("chunks_vec");
    expect(assertSafeIdentifier("embedding_cache", "test")).toBe("embedding_cache");
    expect(assertSafeIdentifier("_private", "test")).toBe("_private");
    expect(assertSafeIdentifier("A1", "test")).toBe("A1");
  });

  it("rejects empty strings", () => {
    expect(() => assertSafeIdentifier("", "test")).toThrow("Unsafe SQL identifier");
  });

  it("rejects identifiers starting with digits", () => {
    expect(() => assertSafeIdentifier("1table", "test")).toThrow("Unsafe SQL identifier");
  });

  it("rejects identifiers with spaces", () => {
    expect(() => assertSafeIdentifier("my table", "test")).toThrow("Unsafe SQL identifier");
  });

  it("rejects identifiers with semicolons", () => {
    expect(() => assertSafeIdentifier("table;DROP", "test")).toThrow("Unsafe SQL identifier");
  });

  it("rejects identifiers with quotes", () => {
    expect(() => assertSafeIdentifier('table"name', "test")).toThrow("Unsafe SQL identifier");
    expect(() => assertSafeIdentifier("table'name", "test")).toThrow("Unsafe SQL identifier");
  });

  it("rejects identifiers with parentheses", () => {
    expect(() => assertSafeIdentifier("table()", "test")).toThrow("Unsafe SQL identifier");
  });

  it("rejects identifiers with hyphens", () => {
    expect(() => assertSafeIdentifier("my-table", "test")).toThrow("Unsafe SQL identifier");
  });

  it("includes context in error message", () => {
    expect(() => assertSafeIdentifier("bad id", "embeddingCacheTable")).toThrow(
      "embeddingCacheTable",
    );
  });
});
