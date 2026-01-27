import { describe, it, expect } from "vitest";
import { CONTRACTS, getAuthorizationCalls, VERIFICATION_CHECKS } from "../scripts/lib/deployment-config";
import fs from "fs";
import path from "path";

describe("Deployment configuration", () => {
  describe("CONTRACTS list", () => {
    it("contains all 8 contracts", () => {
      expect(CONTRACTS).toHaveLength(8);
    });

    it("starts with trait contract", () => {
      expect(CONTRACTS[0]).toBe("halo-sip010-trait");
    });

    it("ends with circle contract", () => {
      expect(CONTRACTS[CONTRACTS.length - 1]).toBe("halo-circle");
    });

    it("has identity before credit (credit depends on identity)", () => {
      const identityIdx = CONTRACTS.indexOf("halo-identity");
      const creditIdx = CONTRACTS.indexOf("halo-credit");
      expect(identityIdx).toBeLessThan(creditIdx);
    });

    it("has credit before circle (circle depends on credit)", () => {
      const creditIdx = CONTRACTS.indexOf("halo-credit");
      const circleIdx = CONTRACTS.indexOf("halo-circle");
      expect(creditIdx).toBeLessThan(circleIdx);
    });

    it("has vault before circle (circle depends on vault)", () => {
      const vaultIdx = CONTRACTS.indexOf("halo-vault");
      const circleIdx = CONTRACTS.indexOf("halo-circle");
      expect(vaultIdx).toBeLessThan(circleIdx);
    });

    it("has mock tokens before contracts that reference them", () => {
      const mockTokenIdx = CONTRACTS.indexOf("halo-mock-token");
      const mockSbtcIdx = CONTRACTS.indexOf("halo-mock-sbtc");
      const vaultIdx = CONTRACTS.indexOf("halo-vault");
      const stakingIdx = CONTRACTS.indexOf("halo-sbtc-staking");
      expect(mockTokenIdx).toBeLessThan(vaultIdx);
      expect(mockSbtcIdx).toBeLessThan(stakingIdx);
    });

    it("matches contracts defined in Clarinet.toml", () => {
      const clarinetToml = fs.readFileSync(
        path.resolve(__dirname, "../Clarinet.toml"),
        "utf-8",
      );
      for (const contract of CONTRACTS) {
        expect(clarinetToml).toContain(`[contracts.${contract}]`);
      }
    });

    it("every contract has a .clar file", () => {
      for (const contract of CONTRACTS) {
        const filePath = path.resolve(__dirname, `../contracts/${contract}.clar`);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });

  describe("getAuthorizationCalls", () => {
    const deployer = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    const authCalls = getAuthorizationCalls(deployer);

    it("returns 6 authorization calls", () => {
      expect(authCalls).toHaveLength(6);
    });

    it("authorizes halo-circle in halo-credit", () => {
      const call = authCalls.find(
        (c) =>
          c.contractName === "halo-credit" &&
          c.description.includes("halo-circle"),
      );
      expect(call).toBeDefined();
      expect(call!.functionName).toBe("authorize-contract");
    });

    it("authorizes halo-sbtc-staking in halo-credit", () => {
      const call = authCalls.find(
        (c) =>
          c.contractName === "halo-credit" &&
          c.description.includes("halo-sbtc-staking"),
      );
      expect(call).toBeDefined();
      expect(call!.functionName).toBe("authorize-contract");
    });

    it("authorizes halo-circle in halo-vault", () => {
      const call = authCalls.find(
        (c) =>
          c.contractName === "halo-vault" &&
          c.functionName === "authorize-contract",
      );
      expect(call).toBeDefined();
    });

    it("sets vault token", () => {
      const call = authCalls.find(
        (c) => c.functionName === "set-vault-token",
      );
      expect(call).toBeDefined();
      expect(call!.contractName).toBe("halo-vault");
    });

    it("sets STX price", () => {
      const call = authCalls.find(
        (c) => c.functionName === "set-token-price",
      );
      expect(call).toBeDefined();
      expect(call!.contractName).toBe("halo-vault");
    });

    it("sets staking token", () => {
      const call = authCalls.find(
        (c) => c.functionName === "set-staking-token",
      );
      expect(call).toBeDefined();
      expect(call!.contractName).toBe("halo-sbtc-staking");
    });

    it("all auth calls reference contracts in CONTRACTS list", () => {
      for (const call of authCalls) {
        expect(CONTRACTS).toContain(call.contractName);
      }
    });

    it("buildArgs returns Clarity values", () => {
      for (const call of authCalls) {
        const args = call.buildArgs(deployer);
        expect(Array.isArray(args)).toBe(true);
        expect(args.length).toBeGreaterThan(0);
      }
    });
  });

  describe("VERIFICATION_CHECKS", () => {
    it("has 8 verification checks", () => {
      expect(VERIFICATION_CHECKS).toHaveLength(8);
    });

    it("checks admin for identity, credit, circle, and vault", () => {
      const adminChecks = VERIFICATION_CHECKS.filter(
        (c) => c.functionName === "get-admin",
      );
      expect(adminChecks).toHaveLength(4);
      const contractNames = adminChecks.map((c) => c.contractName).sort();
      expect(contractNames).toEqual([
        "halo-circle",
        "halo-credit",
        "halo-identity",
        "halo-vault",
      ]);
    });

    it("checks circle count", () => {
      const check = VERIFICATION_CHECKS.find(
        (c) => c.functionName === "get-circle-count",
      );
      expect(check).toBeDefined();
    });

    it("checks protocol fee rate", () => {
      const check = VERIFICATION_CHECKS.find(
        (c) => c.functionName === "get-protocol-fee-rate",
      );
      expect(check).toBeDefined();
    });

    it("checks LTV ratio", () => {
      const check = VERIFICATION_CHECKS.find(
        (c) => c.functionName === "get-ltv-ratio",
      );
      expect(check).toBeDefined();
    });

    it("all verification checks reference contracts in CONTRACTS list", () => {
      for (const check of VERIFICATION_CHECKS) {
        expect(CONTRACTS).toContain(check.contractName);
      }
    });
  });
});
