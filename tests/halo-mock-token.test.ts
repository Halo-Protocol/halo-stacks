import { describe, it, expect } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("halo-mock-token (hUSD)", () => {
  describe("metadata", () => {
    it("returns correct name", () => {
      const { result } = simnet.callReadOnlyFn("halo-mock-token", "get-name", [], deployer);
      expect(result).toBeOk(Cl.stringAscii("Halo Test USD"));
    });

    it("returns correct symbol", () => {
      const { result } = simnet.callReadOnlyFn("halo-mock-token", "get-symbol", [], deployer);
      expect(result).toBeOk(Cl.stringAscii("hUSD"));
    });

    it("returns 6 decimals", () => {
      const { result } = simnet.callReadOnlyFn("halo-mock-token", "get-decimals", [], deployer);
      expect(result).toBeOk(Cl.uint(6));
    });

    it("returns none for token-uri", () => {
      const { result } = simnet.callReadOnlyFn("halo-mock-token", "get-token-uri", [], deployer);
      expect(result).toBeOk(Cl.none());
    });

    it("initial total supply is zero", () => {
      const { result } = simnet.callReadOnlyFn("halo-mock-token", "get-total-supply", [], deployer);
      expect(result).toBeOk(Cl.uint(0));
    });
  });

  describe("mint", () => {
    it("deployer can mint tokens", () => {
      const { result } = simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("minted tokens appear in balance", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );
      const { result } = simnet.callReadOnlyFn(
        "halo-mock-token",
        "get-balance",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(1000_000000));
    });

    it("minted tokens increase total supply", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(500_000000), Cl.principal(wallet1)],
        deployer,
      );
      const { result } = simnet.callReadOnlyFn("halo-mock-token", "get-total-supply", [], deployer);
      expect(result).toBeOk(Cl.uint(500_000000));
    });

    it("non-deployer cannot mint", () => {
      const { result } = simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(500)); // ERR_NOT_AUTHORIZED
    });

    it("cannot mint zero tokens", () => {
      const { result } = simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(0), Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(502)); // ERR_INVALID_AMOUNT
    });
  });

  describe("transfer", () => {
    it("can transfer tokens to another address", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        "halo-mock-token",
        "transfer",
        [Cl.uint(300_000000), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("balances update correctly after transfer", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );
      simnet.callPublicFn(
        "halo-mock-token",
        "transfer",
        [Cl.uint(300_000000), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
        wallet1,
      );

      const bal1 = simnet.callReadOnlyFn(
        "halo-mock-token",
        "get-balance",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(bal1.result).toBeOk(Cl.uint(700_000000));

      const bal2 = simnet.callReadOnlyFn(
        "halo-mock-token",
        "get-balance",
        [Cl.principal(wallet2)],
        deployer,
      );
      expect(bal2.result).toBeOk(Cl.uint(300_000000));
    });

    it("cannot transfer more than balance", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(100_000000), Cl.principal(wallet1)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        "halo-mock-token",
        "transfer",
        [Cl.uint(200_000000), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
        wallet1,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseErr);
    });

    it("cannot transfer on behalf of another user", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        "halo-mock-token",
        "transfer",
        [Cl.uint(100_000000), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
        wallet2, // wallet2 trying to send wallet1's tokens
      );
      expect(result).toBeErr(Cl.uint(500)); // ERR_NOT_AUTHORIZED
    });

    it("cannot transfer zero tokens", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        "halo-mock-token",
        "transfer",
        [Cl.uint(0), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(502)); // ERR_INVALID_AMOUNT
    });
  });

  describe("burn", () => {
    it("user can burn own tokens", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        "halo-mock-token",
        "burn",
        [Cl.uint(500_000000)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("burn reduces balance and supply", () => {
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );
      simnet.callPublicFn("halo-mock-token", "burn", [Cl.uint(400_000000)], wallet1);

      const bal = simnet.callReadOnlyFn(
        "halo-mock-token",
        "get-balance",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(bal.result).toBeOk(Cl.uint(600_000000));

      const supply = simnet.callReadOnlyFn("halo-mock-token", "get-total-supply", [], deployer);
      expect(supply.result).toBeOk(Cl.uint(600_000000));
    });
  });
});

describe("halo-mock-sbtc", () => {
  it("returns correct name and symbol", () => {
    const name = simnet.callReadOnlyFn("halo-mock-sbtc", "get-name", [], deployer);
    expect(name.result).toBeOk(Cl.stringAscii("Mock sBTC"));

    const symbol = simnet.callReadOnlyFn("halo-mock-sbtc", "get-symbol", [], deployer);
    expect(symbol.result).toBeOk(Cl.stringAscii("sBTC"));
  });

  it("returns 8 decimals", () => {
    const { result } = simnet.callReadOnlyFn("halo-mock-sbtc", "get-decimals", [], deployer);
    expect(result).toBeOk(Cl.uint(8));
  });

  it("deployer can mint and transfer works", () => {
    simnet.callPublicFn(
      "halo-mock-sbtc",
      "mint",
      [Cl.uint(100_000000), Cl.principal(wallet1)], // 1 sBTC
      deployer,
    );

    const bal = simnet.callReadOnlyFn(
      "halo-mock-sbtc",
      "get-balance",
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(bal.result).toBeOk(Cl.uint(100_000000));

    const { result } = simnet.callPublicFn(
      "halo-mock-sbtc",
      "transfer",
      [Cl.uint(50_000000), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
      wallet1,
    );
    expect(result).toBeOk(Cl.bool(true));
  });
});
