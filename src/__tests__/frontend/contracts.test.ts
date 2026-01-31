import { describe, it, expect } from "vitest";
import { formatSTX, formatAddress, BLOCKS_PER_DAY, CONTRACTS } from "../../lib/contracts";

describe("formatSTX", () => {
  it("converts microSTX string to STX", () => {
    expect(formatSTX("1000000")).toBe("1");
  });

  it("converts microSTX number to STX", () => {
    expect(formatSTX(5000000)).toBe("5");
  });

  it("converts microSTX bigint to STX", () => {
    expect(formatSTX(BigInt(2500000))).toBe("2.5");
  });

  it("handles zero", () => {
    expect(formatSTX("0")).toBe("0");
  });

  it("handles large amounts", () => {
    const result = formatSTX("100000000000");
    expect(result).toContain("100");
  });

  it("handles fractional microSTX", () => {
    expect(formatSTX("100")).toBe("0.0001");
  });
});

describe("formatAddress", () => {
  it("truncates long addresses", () => {
    const addr = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    const result = formatAddress(addr);
    expect(result).toBe("ST1PQH...GZGM");
  });

  it("returns short addresses unchanged", () => {
    expect(formatAddress("ST1PQH")).toBe("ST1PQH");
  });

  it("returns empty string for empty input", () => {
    expect(formatAddress("")).toBe("");
  });

  it("handles exactly 10-char addresses", () => {
    expect(formatAddress("0123456789")).toBe("0123456789");
  });

  it("truncates 11-char addresses", () => {
    expect(formatAddress("01234567890")).toBe("012345...7890");
  });
});

describe("BLOCKS_PER_DAY", () => {
  it("equals 144", () => {
    expect(BLOCKS_PER_DAY).toBe(144);
  });
});

describe("CONTRACTS", () => {
  it("has all expected contracts", () => {
    expect(CONTRACTS).toHaveProperty("identity");
    expect(CONTRACTS).toHaveProperty("credit");
    expect(CONTRACTS).toHaveProperty("circle");
    expect(CONTRACTS).toHaveProperty("vault");
    expect(CONTRACTS).toHaveProperty("mockToken");
  });

  it("uses correct contract names", () => {
    expect(CONTRACTS.identity.name).toBe("halo-identity");
    expect(CONTRACTS.credit.name).toBe("halo-credit");
    expect(CONTRACTS.circle.name).toBe("halo-circle");
    expect(CONTRACTS.vault.name).toBe("halo-vault");
    expect(CONTRACTS.mockToken.name).toBe("halo-mock-token");
  });
});
