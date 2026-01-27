import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// Helper to create a 32-byte unique ID buffer from a number
function uniqueId(n: number): ReturnType<typeof Cl.buffer> {
  const bytes = new Uint8Array(32);
  bytes[31] = n;
  return Cl.buffer(bytes);
}

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("halo-identity", () => {
  describe("bind-wallet", () => {
    it("should bind a wallet to a unique ID", () => {
      const { result } = simnet.callPublicFn(
        "halo-identity",
        "bind-wallet",
        [uniqueId(1)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should store correct wallet mapping", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "get-wallet-by-id",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toBeSome(Cl.principal(wallet1));
    });

    it("should store correct ID mapping", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "get-id-by-wallet",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeSome(uniqueId(1));
    });

    it("should fail when unique ID is already bound", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callPublicFn(
        "halo-identity",
        "bind-wallet",
        [uniqueId(1)],
        wallet2,
      );
      expect(result).toBeErr(Cl.uint(101)); // ERR_ALREADY_BOUND
    });

    it("should fail when wallet is already bound", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callPublicFn(
        "halo-identity",
        "bind-wallet",
        [uniqueId(2)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(102)); // ERR_WALLET_BOUND
    });

    it("should increment total users counter", () => {
      const before = simnet.callReadOnlyFn(
        "halo-identity",
        "get-total-users",
        [],
        deployer,
      );
      expect(before.result).toBeUint(0);

      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const after = simnet.callReadOnlyFn(
        "halo-identity",
        "get-total-users",
        [],
        deployer,
      );
      expect(after.result).toBeUint(1);
    });

    it("should track multiple users", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(2)], wallet2);
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(3)], wallet3);

      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "get-total-users",
        [],
        deployer,
      );
      expect(result).toBeUint(3);
    });
  });

  describe("read-only queries", () => {
    it("is-id-bound returns true for bound ID", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "is-id-bound",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("is-id-bound returns false for unbound ID", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "is-id-bound",
        [uniqueId(99)],
        deployer,
      );
      expect(result).toBeBool(false);
    });

    it("is-wallet-bound returns true for bound wallet", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "is-wallet-bound",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("is-wallet-bound returns false for unbound wallet", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "is-wallet-bound",
        [Cl.principal(wallet3)],
        deployer,
      );
      expect(result).toBeBool(false);
    });

    it("get-wallet-by-id returns none for unbound ID", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "get-wallet-by-id",
        [uniqueId(99)],
        deployer,
      );
      expect(result).toBeNone();
    });

    it("get-id-by-wallet returns none for unbound wallet", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "get-id-by-wallet",
        [Cl.principal(wallet3)],
        deployer,
      );
      expect(result).toBeNone();
    });

    it("get-user-metadata returns correct data", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "get-user-metadata",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
    });

    it("get-user-metadata returns none for unbound ID", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "get-user-metadata",
        [uniqueId(99)],
        deployer,
      );
      expect(result).toBeNone();
    });
  });

  describe("admin functions", () => {
    it("deactivate-user succeeds for admin", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callPublicFn(
        "halo-identity",
        "deactivate-user",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("deactivate-user fails for non-admin", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      const { result } = simnet.callPublicFn(
        "halo-identity",
        "deactivate-user",
        [uniqueId(1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("deactivated user metadata shows inactive", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);
      simnet.callPublicFn("halo-identity", "deactivate-user", [uniqueId(1)], deployer);

      const { result } = simnet.callReadOnlyFn(
        "halo-identity",
        "get-user-metadata",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      // Check the is-active field is false (kebab-case key requires bracket notation)
      const tupleData = (result as any).value.value;
      expect(tupleData["is-active"]).toBeBool(false);
    });

    it("reactivate-user succeeds for admin", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);
      simnet.callPublicFn("halo-identity", "deactivate-user", [uniqueId(1)], deployer);

      const { result } = simnet.callPublicFn(
        "halo-identity",
        "reactivate-user",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("reactivate-user fails for non-admin", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);
      simnet.callPublicFn("halo-identity", "deactivate-user", [uniqueId(1)], deployer);

      const { result } = simnet.callPublicFn(
        "halo-identity",
        "reactivate-user",
        [uniqueId(1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("set-admin succeeds for current admin", () => {
      const { result } = simnet.callPublicFn(
        "halo-identity",
        "set-admin",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("set-admin fails for non-admin", () => {
      const { result } = simnet.callPublicFn(
        "halo-identity",
        "set-admin",
        [Cl.principal(wallet2)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("new admin can perform admin actions", () => {
      simnet.callPublicFn("halo-identity", "set-admin", [Cl.principal(wallet1)], deployer);
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet2);

      const { result } = simnet.callPublicFn(
        "halo-identity",
        "deactivate-user",
        [uniqueId(1)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("old admin cannot perform admin actions after transfer", () => {
      simnet.callPublicFn("halo-identity", "set-admin", [Cl.principal(wallet1)], deployer);
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet2);

      const { result } = simnet.callPublicFn(
        "halo-identity",
        "deactivate-user",
        [uniqueId(1)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });
  });
});
