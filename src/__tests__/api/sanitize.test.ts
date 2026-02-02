import { describe, it, expect } from "vitest";
import { stripHtml, sanitizeString, isValidTxId } from "../../lib/sanitize";

describe("stripHtml", () => {
  it("removes simple HTML tags", () => {
    expect(stripHtml("<b>bold</b>")).toBe("bold");
  });

  it("removes nested tags", () => {
    expect(stripHtml("<div><p>hello</p></div>")).toBe("hello");
  });

  it("removes script tags", () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it("removes self-closing tags", () => {
    expect(stripHtml("before<br/>after")).toBe("beforeafter");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtml("Hello World")).toBe("Hello World");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("removes tags with attributes", () => {
    expect(stripHtml('<a href="https://evil.com">click</a>')).toBe("click");
  });
});

describe("sanitizeString", () => {
  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("removes null bytes", () => {
    expect(sanitizeString("hello\0world")).toBe("helloworld");
  });

  it("truncates to maxLength", () => {
    expect(sanitizeString("abcdefghij", 5)).toBe("abcde");
  });

  it("uses default maxLength of 1000", () => {
    const long = "x".repeat(2000);
    expect(sanitizeString(long)).toHaveLength(1000);
  });

  it("handles empty string", () => {
    expect(sanitizeString("")).toBe("");
  });

  it("handles string within maxLength", () => {
    expect(sanitizeString("short", 100)).toBe("short");
  });
});

describe("isValidTxId", () => {
  it("accepts valid 0x-prefixed 64 hex char transaction ID", () => {
    const txId = "0x" + "a".repeat(64);
    expect(isValidTxId(txId)).toBe(true);
  });

  it("accepts mixed case hex", () => {
    const txId = "0x" + "aAbBcCdDeEfF001122334455667788990011223344556677889900aabbccddee";
    expect(isValidTxId(txId)).toBe(true);
  });

  it("rejects without 0x prefix", () => {
    expect(isValidTxId("a".repeat(64))).toBe(false);
  });

  it("rejects too short hex", () => {
    expect(isValidTxId("0x" + "a".repeat(63))).toBe(false);
  });

  it("rejects too long hex", () => {
    expect(isValidTxId("0x" + "a".repeat(65))).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidTxId("0x" + "g".repeat(64))).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidTxId("")).toBe(false);
  });

  it("rejects just prefix", () => {
    expect(isValidTxId("0x")).toBe(false);
  });
});
