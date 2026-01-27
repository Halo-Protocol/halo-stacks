import { describe, it, expect } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

function uniqueId(n: number): ReturnType<typeof Cl.buffer> {
  const bytes = new Uint8Array(32);
  bytes[31] = n;
  return Cl.buffer(bytes);
}

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

// Bind a wallet to an identity (required for credit operations by wallet)
function bindWallet(id: number, wallet: string) {
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(id)], wallet);
}

describe("halo-credit", () => {
  describe("initial state", () => {
    it("get-credit-score returns initial score (300) for unknown user", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-credit-score",
        [uniqueId(99)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(300));
    });

    it("get-credit-data returns none for unknown user", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-credit-data",
        [uniqueId(99)],
        deployer,
      );
      expect(result).toBeNone();
    });

    it("get-payment-history returns empty list for unknown user", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-payment-history",
        [uniqueId(99)],
        deployer,
      );
      expect(result).toBeList([]);
    });

    it("get-admin returns deployer", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-admin",
        [],
        deployer,
      );
      expect(result).toBePrincipal(deployer);
    });

    it("get-authorized-contracts returns empty list", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-authorized-contracts",
        [],
        deployer,
      );
      expect(result).toBeList([]);
    });
  });

  describe("authorize-contract", () => {
    it("admin can authorize a contract", () => {
      const contractPrincipal = `${deployer}.halo-circle`;
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "authorize-contract",
        [Cl.principal(contractPrincipal)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("non-admin cannot authorize", () => {
      const contractPrincipal = `${deployer}.halo-circle`;
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "authorize-contract",
        [Cl.principal(contractPrincipal)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(300)); // ERR_NOT_AUTHORIZED
    });

    it("cannot authorize same contract twice", () => {
      const contractPrincipal = `${deployer}.halo-circle`;
      simnet.callPublicFn(
        "halo-credit",
        "authorize-contract",
        [Cl.principal(contractPrincipal)],
        deployer,
      );
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "authorize-contract",
        [Cl.principal(contractPrincipal)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(302)); // ERR_INVALID_SCORE (used for already authorized)
    });

    it("authorized contracts appear in list", () => {
      const contractPrincipal = `${deployer}.halo-circle`;
      simnet.callPublicFn(
        "halo-credit",
        "authorize-contract",
        [Cl.principal(contractPrincipal)],
        deployer,
      );
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-authorized-contracts",
        [],
        deployer,
      );
      expect(result).toBeList([Cl.principal(contractPrincipal)]);
    });
  });

  describe("record-payment", () => {
    it("admin can record a payment directly", () => {
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(0), Cl.uint(1000000), Cl.bool(true)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("non-authorized caller cannot record payment", () => {
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(0), Cl.uint(1000000), Cl.bool(true)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(300)); // ERR_NOT_AUTHORIZED
    });

    it("on-time payment increases score above initial", () => {
      // Record multiple on-time payments to build score
      simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(0), Cl.uint(10000000), Cl.bool(true)],
        deployer,
      );
      simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(1), Cl.uint(10000000), Cl.bool(true)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-credit-score",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
      // Score should be above initial 300
      const score = (result as any).value;
      expect(Number(score.value)).toBeGreaterThan(300);
    });

    it("payment history is recorded", () => {
      simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(0), Cl.uint(5000000), Cl.bool(true)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-payment-history",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.List);
      const list = (result as any).value;
      expect(list.length).toBe(1);
    });

    it("credit data is updated correctly", () => {
      simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(0), Cl.uint(5000000), Cl.bool(true)],
        deployer,
      );
      simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(1), Cl.uint(5000000), Cl.bool(false)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-credit-data",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (result as any).value.value;
      expect(data["total-payments"]).toBeUint(2);
      expect(data["on-time-payments"]).toBeUint(1);
      expect(data["late-payments"]).toBeUint(1);
      expect(data["total-volume"]).toBeUint(10000000);
    });
  });

  describe("record-circle-completion", () => {
    it("admin can record successful completion", () => {
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "record-circle-completion",
        [uniqueId(1), Cl.bool(true)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("admin can record failed completion (default)", () => {
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "record-circle-completion",
        [uniqueId(1), Cl.bool(false)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("non-authorized caller cannot record completion", () => {
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "record-circle-completion",
        [uniqueId(1), Cl.bool(true)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(300)); // ERR_NOT_AUTHORIZED
    });

    it("completion updates credit data", () => {
      simnet.callPublicFn(
        "halo-credit",
        "record-circle-completion",
        [uniqueId(1), Cl.bool(true)],
        deployer,
      );
      simnet.callPublicFn(
        "halo-credit",
        "record-circle-completion",
        [uniqueId(1), Cl.bool(true)],
        deployer,
      );
      simnet.callPublicFn(
        "halo-credit",
        "record-circle-completion",
        [uniqueId(1), Cl.bool(false)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-credit-data",
        [uniqueId(1)],
        deployer,
      );
      const data = (result as any).value.value;
      expect(data["circles-completed"]).toBeUint(2);
      expect(data["circles-defaulted"]).toBeUint(1);
    });
  });

  describe("get-score-by-wallet", () => {
    it("returns initial score for unbound wallet", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-score-by-wallet",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(300));
    });

    it("returns correct score for bound wallet with activity", () => {
      bindWallet(1, wallet1);
      // Record a payment for this user's unique ID
      simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(0), Cl.uint(10000000), Cl.bool(true)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-score-by-wallet",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
      const score = (result as any).value;
      expect(Number(score.value)).toBeGreaterThan(300);
    });
  });

  describe("score tiers", () => {
    it("returns 'Poor' for initial score", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-score-tier",
        [Cl.uint(300)],
        deployer,
      );
      expect(result).toBeAscii("Poor");
    });

    it("returns 'Fair' for score 550", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-score-tier",
        [Cl.uint(550)],
        deployer,
      );
      expect(result).toBeAscii("Fair");
    });

    it("returns 'Good' for score 650", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-score-tier",
        [Cl.uint(650)],
        deployer,
      );
      expect(result).toBeAscii("Good");
    });

    it("returns 'Excellent' for score 750", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-score-tier",
        [Cl.uint(750)],
        deployer,
      );
      expect(result).toBeAscii("Excellent");
    });
  });

  describe("admin functions", () => {
    it("set-admin succeeds for current admin", () => {
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "set-admin",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("set-admin fails for non-admin", () => {
      const { result } = simnet.callPublicFn(
        "halo-credit",
        "set-admin",
        [Cl.principal(wallet2)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(300)); // ERR_NOT_AUTHORIZED
    });

    it("new admin can authorize contracts", () => {
      simnet.callPublicFn("halo-credit", "set-admin", [Cl.principal(wallet1)], deployer);

      const { result } = simnet.callPublicFn(
        "halo-credit",
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle`)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });
});
