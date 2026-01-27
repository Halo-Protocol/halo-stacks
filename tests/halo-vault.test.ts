import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

// Contract references
const vaultContract = "halo-vault";
const mockToken = "halo-mock-token";
const mockSbtc = "halo-mock-sbtc";

// Helper: deployer principal for STX price sentinel
const STX_SENTINEL = deployer;

// Helper: mint hUSD to a wallet
function mintHusd(recipient: string, amount: number) {
  return simnet.callPublicFn(
    mockToken,
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer,
  );
}

// Helper: set up vault token to halo-mock-token
function setupVaultToken() {
  simnet.callPublicFn(
    vaultContract,
    "set-vault-token",
    [Cl.principal(`${deployer}.${mockToken}`)],
    deployer,
  );
}

// Helper: set up vault with token and mint hUSD to wallet
function setupVaultAndMint(wallet: string, amount: number) {
  setupVaultToken();
  mintHusd(wallet, amount);
}

// Helper: deposit into vault
function depositToVault(wallet: string, amount: number) {
  return simnet.callPublicFn(
    vaultContract,
    "deposit",
    [Cl.contractPrincipal(deployer, mockToken), Cl.uint(amount)],
    wallet,
  );
}

// Helper: set token price
function setTokenPrice(tokenPrincipal: string, priceUsd: number, decimals: number) {
  return simnet.callPublicFn(
    vaultContract,
    "set-token-price",
    [Cl.principal(tokenPrincipal), Cl.uint(priceUsd), Cl.uint(decimals)],
    deployer,
  );
}

describe("halo-vault", () => {
  describe("admin setup", () => {
    it("deployer can set vault token", () => {
      const { result } = simnet.callPublicFn(
        vaultContract,
        "set-vault-token",
        [Cl.principal(`${deployer}.${mockToken}`)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("non-admin cannot set vault token", () => {
      const { result } = simnet.callPublicFn(
        vaultContract,
        "set-vault-token",
        [Cl.principal(`${deployer}.${mockToken}`)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(400)); // ERR_NOT_AUTHORIZED
    });

    it("deployer can set token price", () => {
      const { result } = setTokenPrice(STX_SENTINEL, 500_000, 6); // STX at $0.50
      expect(result).toBeOk(Cl.bool(true));
    });

    it("cannot set zero price", () => {
      const { result } = simnet.callPublicFn(
        vaultContract,
        "set-token-price",
        [Cl.principal(STX_SENTINEL), Cl.uint(0), Cl.uint(6)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(409)); // ERR_ZERO_PRICE
    });

    it("deployer can set LTV ratio", () => {
      const { result } = simnet.callPublicFn(
        vaultContract,
        "set-ltv-ratio",
        [Cl.uint(7000)], // 70%
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("LTV ratio must be within bounds", () => {
      // Too low (below 50%)
      const low = simnet.callPublicFn(
        vaultContract,
        "set-ltv-ratio",
        [Cl.uint(4000)],
        deployer,
      );
      expect(low.result).toBeErr(Cl.uint(406)); // ERR_INVALID_PARAMS

      // Too high (above 90%)
      const high = simnet.callPublicFn(
        vaultContract,
        "set-ltv-ratio",
        [Cl.uint(9500)],
        deployer,
      );
      expect(high.result).toBeErr(Cl.uint(406));
    });

    it("deployer can authorize a contract", () => {
      const { result } = simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle`)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("cannot authorize same contract twice", () => {
      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle`)],
        deployer,
      );
      const { result } = simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle`)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(410)); // ERR_ALREADY_AUTHORIZED
    });

    it("deployer can transfer admin", () => {
      simnet.callPublicFn(
        vaultContract,
        "set-admin",
        [Cl.principal(wallet1)],
        deployer,
      );
      // New admin can set vault token
      const { result } = simnet.callPublicFn(
        vaultContract,
        "set-vault-token",
        [Cl.principal(`${deployer}.${mockToken}`)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe("deposit", () => {
    it("user can deposit stablecoins", () => {
      setupVaultAndMint(wallet1, 1000_000000); // 1000 hUSD
      const { result } = depositToVault(wallet1, 500_000000); // 500 hUSD
      expect(result).toBeOk(Cl.bool(true));
    });

    it("deposit updates user balance", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 500_000000);

      const deposit = simnet.callReadOnlyFn(
        vaultContract,
        "get-vault-deposit",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(deposit.result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(500_000000);
      expect(data.committed).toBeUint(0);
    });

    it("deposit updates total deposited", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 500_000000);

      const config = simnet.callReadOnlyFn(
        vaultContract,
        "get-vault-config",
        [],
        deployer,
      );
      const data = (config.result as any).value;
      expect(data["total-deposited"]).toBeUint(500_000000);
    });

    it("cannot deposit zero", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      const { result } = depositToVault(wallet1, 0);
      expect(result).toBeErr(Cl.uint(401)); // ERR_INVALID_AMOUNT
    });

    it("cannot deposit wrong token", () => {
      setupVaultToken();
      mintHusd(wallet1, 1000_000000);
      // Try depositing mock-sbtc instead of hUSD
      simnet.callPublicFn(
        mockSbtc,
        "mint",
        [Cl.uint(100_00000000), Cl.principal(wallet1)],
        deployer,
      );
      const { result } = simnet.callPublicFn(
        vaultContract,
        "deposit",
        [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(100_00000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(407)); // ERR_TOKEN_MISMATCH
    });

    it("cannot deposit without vault token set", () => {
      // Don't call setupVaultToken
      mintHusd(wallet1, 1000_000000);
      const { result } = simnet.callPublicFn(
        vaultContract,
        "deposit",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(500_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(411)); // ERR_VAULT_TOKEN_NOT_SET
    });

    it("multiple deposits accumulate", () => {
      setupVaultAndMint(wallet1, 2000_000000);
      depositToVault(wallet1, 500_000000);
      depositToVault(wallet1, 300_000000);

      const deposit = simnet.callReadOnlyFn(
        vaultContract,
        "get-vault-deposit",
        [Cl.principal(wallet1)],
        deployer,
      );
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(800_000000);
    });
  });

  describe("withdraw", () => {
    it("user can withdraw uncommitted funds", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 500_000000);

      const { result } = simnet.callPublicFn(
        vaultContract,
        "withdraw",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(200_000000)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("withdraw updates balances correctly", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 500_000000);
      simnet.callPublicFn(
        vaultContract,
        "withdraw",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(200_000000)],
        wallet1,
      );

      const deposit = simnet.callReadOnlyFn(
        vaultContract,
        "get-vault-deposit",
        [Cl.principal(wallet1)],
        deployer,
      );
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(300_000000);
    });

    it("cannot withdraw more than deposited", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 500_000000);

      const { result } = simnet.callPublicFn(
        vaultContract,
        "withdraw",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(600_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(402)); // ERR_INSUFFICIENT_BALANCE
    });

    it("cannot withdraw without deposit", () => {
      setupVaultToken();
      const { result } = simnet.callPublicFn(
        vaultContract,
        "withdraw",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(100_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(404)); // ERR_NO_DEPOSIT
    });

    it("cannot withdraw zero", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 500_000000);

      const { result } = simnet.callPublicFn(
        vaultContract,
        "withdraw",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(401)); // ERR_INVALID_AMOUNT
    });
  });

  describe("LTV and capacity", () => {
    it("available capacity = deposited * 80%", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000); // 1000 hUSD

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(800_000000)); // 80% of 1000
    });

    it("capacity reflects custom LTV ratio", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      // Change LTV to 60%
      simnet.callPublicFn(
        vaultContract,
        "set-ltv-ratio",
        [Cl.uint(6000)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(600_000000)); // 60% of 1000
    });

    it("can-commit returns true when capacity is sufficient", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "can-commit",
        [Cl.principal(wallet1), Cl.uint(800_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("can-commit returns false when capacity insufficient", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "can-commit",
        [Cl.principal(wallet1), Cl.uint(900_000000)], // > 80%
        deployer,
      );
      expect(result).toBeOk(Cl.bool(false));
    });

    it("no capacity for user without deposit", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(0));
    });
  });

  describe("price oracle", () => {
    it("returns price after setting", () => {
      setTokenPrice(STX_SENTINEL, 500_000, 6); // $0.50

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-token-price",
        [Cl.principal(STX_SENTINEL)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (result as any).value.value;
      expect(data["price-usd"]).toBeUint(500_000);
      expect(data.decimals).toBeUint(6);
    });

    it("returns none for unset token", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-token-price",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeNone();
    });

    it("calculates commitment USD correctly for STX", () => {
      // STX at $0.50, 6 decimals
      setTokenPrice(STX_SENTINEL, 500_000, 6);

      // 10 STX contribution, 3 members
      // total = 10_000_000 * 3 = 30_000_000
      // usd = 30_000_000 * 500_000 / 10^6 = 15_000_000 ($15.00)
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "calculate-commitment-usd",
        [Cl.uint(10_000000), Cl.uint(3), Cl.principal(STX_SENTINEL)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(15_000000));
    });

    it("calculates commitment USD correctly for stablecoin", () => {
      // hUSD at $1.00, 6 decimals
      setTokenPrice(`${deployer}.${mockToken}`, 1_000000, 6);

      // 100 hUSD contribution, 5 members
      // total = 100_000_000 * 5 = 500_000_000
      // usd = 500_000_000 * 1_000_000 / 10^6 = 500_000_000 ($500.00)
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "calculate-commitment-usd",
        [Cl.uint(100_000000), Cl.uint(5), Cl.principal(`${deployer}.${mockToken}`)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(500_000000));
    });

    it("returns error for token without price", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "calculate-commitment-usd",
        [Cl.uint(100_000000), Cl.uint(3), Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(412)); // ERR_PRICE_NOT_SET
    });
  });

  describe("lock-collateral (authorized only)", () => {
    it("authorized contract can lock collateral", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      // Authorize deployer as a "contract" for testing
      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)], // $400
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("locking reduces available capacity", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000); // 1000 hUSD -> 800 capacity

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(400_000000)); // 800 - 400
    });

    it("cannot lock more than capacity", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000); // 800 capacity

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(900_000000)], // > 800
        deployer,
      );
      expect(result).toBeErr(Cl.uint(403)); // ERR_INSUFFICIENT_CAPACITY
    });

    it("multiple locks accumulate", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000); // 800 capacity

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );

      // Lock $300 for circle 1
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(300_000000)],
        deployer,
      );
      // Lock $200 for circle 2
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(2), Cl.uint(200_000000)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(300_000000)); // 800 - 300 - 200
    });

    it("unauthorized caller cannot lock", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      // wallet2 is not authorized
      const { result } = simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(100_000000)],
        wallet2,
      );
      expect(result).toBeErr(Cl.uint(400)); // ERR_NOT_AUTHORIZED
    });

    it("cannot lock for user without deposit", () => {
      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(100_000000)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(404)); // ERR_NO_DEPOSIT
    });
  });

  describe("release-collateral", () => {
    it("authorized contract can release collateral", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultContract,
        "release-collateral",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("release restores capacity", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "release-collateral",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(800_000000)); // back to full 80%
    });

    it("cannot release non-existent commitment", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultContract,
        "release-collateral",
        [Cl.principal(wallet1), Cl.uint(99)], // no such commitment
        deployer,
      );
      expect(result).toBeErr(Cl.uint(408)); // ERR_COMMITMENT_NOT_FOUND
    });
  });

  describe("slash-collateral", () => {
    it("authorized contract can slash collateral", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultContract,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(200_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(200_000000)); // slashed amount
    });

    it("slash reduces deposit and releases commitment", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(200_000000)],
        deployer,
      );

      const deposit = simnet.callReadOnlyFn(
        vaultContract,
        "get-vault-deposit",
        [Cl.principal(wallet1)],
        deployer,
      );
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(800_000000); // 1000 - 200
      expect(data.committed).toBeUint(0); // commitment released
    });

    it("slash is capped at deposit amount", () => {
      setupVaultAndMint(wallet1, 500_000000);
      depositToVault(wallet1, 500_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      // Try slashing 1000, but only 500 deposited
      const { result } = simnet.callPublicFn(
        vaultContract,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(1000_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(500_000000)); // capped at deposit
    });
  });

  describe("withdraw with committed collateral", () => {
    it("cannot withdraw below minimum for committed amount", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      // Lock $400 - need min $500 deposit (400 * 10000 / 8000 = 500)
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      // Can withdraw up to 500 (1000 - 500 min)
      const { result: good } = simnet.callPublicFn(
        vaultContract,
        "withdraw",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(500_000000)],
        wallet1,
      );
      expect(good).toBeOk(Cl.bool(true));
    });

    it("rejects withdrawal that would violate LTV", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      // Lock $400 - need min $500 deposit
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      // Try withdrawing 600 (would leave 400, but need 500)
      const { result } = simnet.callPublicFn(
        vaultContract,
        "withdraw",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(600_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(402)); // ERR_INSUFFICIENT_BALANCE
    });
  });

  describe("yield accumulator", () => {
    it("admin can fund yield pool", () => {
      setupVaultAndMint(deployer, 10000_000000); // mint to deployer for rewards
      mintHusd(wallet1, 1000_000000);

      const { result } = simnet.callPublicFn(
        vaultContract,
        "fund-yield-pool",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000), // 1000 hUSD reward
          Cl.uint(100), // over 100 blocks
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("yield config updates after funding", () => {
      setupVaultAndMint(deployer, 10000_000000);

      simnet.callPublicFn(
        vaultContract,
        "fund-yield-pool",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000),
          Cl.uint(100),
        ],
        deployer,
      );

      const config = simnet.callReadOnlyFn(
        vaultContract,
        "get-vault-config",
        [],
        deployer,
      );
      const data = (config.result as any).value;
      expect(data["reward-rate"]).toBeUint(10_000000); // 1000 / 100 = 10 per block
    });

    it("pending yield accrues over blocks", () => {
      setupVaultAndMint(deployer, 10000_000000);
      mintHusd(wallet1, 1000_000000);

      // User deposits first
      depositToVault(wallet1, 1000_000000);

      // Fund yield pool: 1000 hUSD over 1000 blocks = 1 hUSD/block
      simnet.callPublicFn(
        vaultContract,
        "fund-yield-pool",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000),
          Cl.uint(1000),
        ],
        deployer,
      );

      // Mine some blocks
      simnet.mineEmptyBlocks(10);

      const pending = simnet.callReadOnlyFn(
        vaultContract,
        "get-pending-yield",
        [Cl.principal(wallet1)],
        deployer,
      );
      // With 1 depositor and 1_000000 per block rate, after 10 blocks = ~10_000000
      const yieldAmount = Number((pending.result as any).value);
      expect(yieldAmount).toBeGreaterThan(0);
    });

    it("user can claim yield", () => {
      setupVaultAndMint(deployer, 10000_000000);
      mintHusd(wallet1, 1000_000000);

      depositToVault(wallet1, 1000_000000);

      // Fund yield pool
      simnet.callPublicFn(
        vaultContract,
        "fund-yield-pool",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000),
          Cl.uint(1000),
        ],
        deployer,
      );

      simnet.mineEmptyBlocks(10);

      const { result } = simnet.callPublicFn(
        vaultContract,
        "claim-yield",
        [Cl.contractPrincipal(deployer, mockToken)],
        wallet1,
      );
      // Should return (ok uint) with the claimed amount
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("claim-yield fails with no rewards", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);
      // No yield funded

      const { result } = simnet.callPublicFn(
        vaultContract,
        "claim-yield",
        [Cl.contractPrincipal(deployer, mockToken)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(401)); // ERR_INVALID_AMOUNT (zero reward)
    });

    it("non-admin cannot fund yield pool", () => {
      setupVaultAndMint(wallet1, 1000_000000);

      const { result } = simnet.callPublicFn(
        vaultContract,
        "fund-yield-pool",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(100_000000),
          Cl.uint(100),
        ],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(400)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("read-only queries", () => {
    it("get-vault-config returns defaults", () => {
      const config = simnet.callReadOnlyFn(
        vaultContract,
        "get-vault-config",
        [],
        deployer,
      );
      const data = (config.result as any).value;
      expect(data["ltv-ratio"]).toBeUint(8000);
      expect(data["total-deposited"]).toBeUint(0);
      expect(data["reward-rate"]).toBeUint(0);
    });

    it("get-ltv-ratio returns current LTV", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-ltv-ratio",
        [],
        deployer,
      );
      expect(result).toBeUint(8000);
    });

    it("get-admin returns deployer", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-admin",
        [],
        deployer,
      );
      expect(result).toBePrincipal(deployer);
    });

    it("is-authorized returns false for random user", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "is-authorized",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(false);
    });

    it("is-authorized returns true for admin", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "is-authorized",
        [Cl.principal(deployer)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("get-circle-commitment returns none when none exists", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result).toBeNone();
    });

    it("get-circle-commitment returns data after lock", () => {
      setupVaultAndMint(wallet1, 1000_000000);
      depositToVault(wallet1, 1000_000000);

      simnet.callPublicFn(
        vaultContract,
        "authorize-contract",
        [Cl.principal(deployer)],
        deployer,
      );
      simnet.callPublicFn(
        vaultContract,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        vaultContract,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (result as any).value.value;
      expect(data["commitment-usd"]).toBeUint(400_000000);
    });
  });
});
