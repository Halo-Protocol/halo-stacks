import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

// Contract references
const vaultV2 = "halo-vault-v2";
const mockToken = "halo-mock-token";
const mockSbtc = "halo-mock-sbtc";

// ============================================
// HELPER FUNCTIONS
// ============================================

function mintHusd(recipient: string, amount: number) {
  return simnet.callPublicFn(
    mockToken,
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer,
  );
}

function mintSbtc(recipient: string, amount: number) {
  return simnet.callPublicFn(
    mockSbtc,
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer,
  );
}

function setupAllAssets() {
  // Configure hUSD (asset 0, 80% LTV, 6 decimals)
  simnet.callPublicFn(
    vaultV2,
    "configure-asset",
    [
      Cl.uint(0),
      Cl.some(Cl.contractPrincipal(deployer, mockToken)),
      Cl.uint(8000),
      Cl.uint(6),
    ],
    deployer,
  );
  // Configure STX (asset 1, 50% LTV, 6 decimals, no token principal)
  simnet.callPublicFn(
    vaultV2,
    "configure-asset",
    [Cl.uint(1), Cl.none(), Cl.uint(5000), Cl.uint(6)],
    deployer,
  );
  // Configure sBTC (asset 2, 50% LTV, 8 decimals)
  simnet.callPublicFn(
    vaultV2,
    "configure-asset",
    [
      Cl.uint(2),
      Cl.some(Cl.contractPrincipal(deployer, mockSbtc)),
      Cl.uint(5000),
      Cl.uint(8),
    ],
    deployer,
  );
  // Set prices
  simnet.callPublicFn(
    vaultV2,
    "set-asset-price",
    [Cl.uint(0), Cl.uint(1_000000)],
    deployer,
  ); // hUSD = $1.00
  simnet.callPublicFn(
    vaultV2,
    "set-asset-price",
    [Cl.uint(1), Cl.uint(500000)],
    deployer,
  ); // STX = $0.50
  simnet.callPublicFn(
    vaultV2,
    "set-asset-price",
    [Cl.uint(2), Cl.uint(6_500000_000000)],
    deployer,
  ); // sBTC = $65,000 (6 decimal precision)
}

function depositHusd(wallet: string, amount: number) {
  return simnet.callPublicFn(
    vaultV2,
    "deposit-husd",
    [Cl.contractPrincipal(deployer, mockToken), Cl.uint(amount)],
    wallet,
  );
}

function depositStx(wallet: string, amount: number) {
  return simnet.callPublicFn(
    vaultV2,
    "deposit-stx",
    [Cl.uint(amount)],
    wallet,
  );
}

function depositSbtc(wallet: string, amount: number) {
  return simnet.callPublicFn(
    vaultV2,
    "deposit-sbtc",
    [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(amount)],
    wallet,
  );
}

function authorizeDeployer() {
  simnet.callPublicFn(
    vaultV2,
    "authorize-contract",
    [Cl.principal(deployer)],
    deployer,
  );
}

// ============================================
// TESTS
// ============================================

describe("halo-vault-v2", () => {
  // ============================================
  // 1. Admin Setup Tests
  // ============================================
  describe("admin setup", () => {
    it("configure-asset succeeds for admin", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(8000),
          Cl.uint(6),
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("configure-asset fails for non-admin (err u700)", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(8000),
          Cl.uint(6),
        ],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(700));
    });

    it("set-asset-price succeeds", () => {
      // Must configure asset first
      simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(8000),
          Cl.uint(6),
        ],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultV2,
        "set-asset-price",
        [Cl.uint(0), Cl.uint(1_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("set-asset-price fails for zero price (err u709)", () => {
      simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(8000),
          Cl.uint(6),
        ],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultV2,
        "set-asset-price",
        [Cl.uint(0), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(709));
    });

    it("authorize-contract succeeds", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle-v2`)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("authorize-contract fails for duplicate (err u710)", () => {
      simnet.callPublicFn(
        vaultV2,
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle-v2`)],
        deployer,
      );
      const { result } = simnet.callPublicFn(
        vaultV2,
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle-v2`)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(710));
    });

    it("authorize-contract fails for non-admin", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle-v2`)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(700));
    });

    it("set-asset-price fails for non-admin", () => {
      setupAllAssets();
      const { result } = simnet.callPublicFn(
        vaultV2,
        "set-asset-price",
        [Cl.uint(0), Cl.uint(2_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(700));
    });
  });

  // ============================================
  // 2. Deposit Tests
  // ============================================
  describe("deposits", () => {
    it("deposit-husd succeeds and updates balance", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);

      const { result } = depositHusd(wallet1, 500_000000);
      expect(result).toBeOk(Cl.bool(true));

      // Verify deposit recorded
      const deposit = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      expect(deposit.result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(500_000000);
    });

    it("deposit-stx succeeds and updates balance", () => {
      setupAllAssets();

      const { result } = depositStx(wallet1, 100_000000); // 100 STX
      expect(result).toBeOk(Cl.bool(true));

      const deposit = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(deposit.result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(100_000000);
    });

    it("deposit-sbtc succeeds and updates balance", () => {
      setupAllAssets();
      mintSbtc(wallet1, 1_00000000); // 1 sBTC (8 decimals)

      const { result } = depositSbtc(wallet1, 50000000); // 0.5 sBTC
      expect(result).toBeOk(Cl.bool(true));

      const deposit = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(2)],
        deployer,
      );
      expect(deposit.result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(50000000);
    });

    it("deposit fails with zero amount (err u701)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);

      const { result } = depositHusd(wallet1, 0);
      expect(result).toBeErr(Cl.uint(701));
    });

    it("deposit-stx fails with zero amount (err u701)", () => {
      setupAllAssets();

      const { result } = depositStx(wallet1, 0);
      expect(result).toBeErr(Cl.uint(701));
    });

    it("deposit fails when asset not configured (err u711)", () => {
      // Do NOT call setupAllAssets -- assets not configured
      mintHusd(wallet1, 1000_000000);

      const { result } = depositHusd(wallet1, 500_000000);
      expect(result).toBeErr(Cl.uint(711));
    });

    it("deposit-stx fails when asset not configured (err u711)", () => {
      // Only configure hUSD, not STX
      simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(8000),
          Cl.uint(6),
        ],
        deployer,
      );

      const { result } = depositStx(wallet1, 100_000000);
      expect(result).toBeErr(Cl.uint(711));
    });

    it("multiple deposits accumulate", () => {
      setupAllAssets();
      mintHusd(wallet1, 2000_000000);

      depositHusd(wallet1, 500_000000);
      depositHusd(wallet1, 300_000000);

      const deposit = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(800_000000);
    });
  });

  // ============================================
  // 3. Capacity Calculation Tests
  // ============================================
  describe("capacity calculations", () => {
    it("get-total-capacity returns 0 for new user", () => {
      setupAllAssets();

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-total-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(0));
    });

    it("get-total-capacity correctly calculates: $1000 hUSD * 80% = $800", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000); // 1000 hUSD

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-total-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      // 1000 hUSD * $1.00 * 80% = $800
      expect(result).toBeOk(Cl.uint(800_000000));
    });

    it("get-total-capacity correctly calculates STX: 1M microSTX at $0.50 * 50%", () => {
      setupAllAssets();
      // 1,000,000 microSTX = 1 STX = $0.50, capacity = $0.50 * 50% = $0.25
      depositStx(wallet1, 1_000000);

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-total-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      // 1_000000 * 500000 / 10^6 = 500000 USD value ($0.50)
      // 500000 * 5000 / 10000 = 250000 capacity ($0.25)
      expect(result).toBeOk(Cl.uint(250000));
    });

    it("get-total-capacity correctly calculates larger STX: $500 worth", () => {
      setupAllAssets();
      // $500 worth of STX at $0.50 each = 1000 STX = 1000_000000 microSTX
      depositStx(wallet1, 1000_000000);

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-total-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      // 1000_000000 * 500000 / 10^6 = 500_000000 USD ($500)
      // 500_000000 * 5000 / 10000 = 250_000000 capacity ($250)
      expect(result).toBeOk(Cl.uint(250_000000));
    });

    it("get-total-capacity aggregates across multiple assets", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000); // $1000 hUSD -> $800 capacity
      depositStx(wallet1, 1000_000000); // 1000 STX = $500 -> $250 capacity

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-total-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      // $800 + $250 = $1050
      expect(result).toBeOk(Cl.uint(1050_000000));
    });

    it("get-available-capacity reflects locked commitments", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000); // $800 capacity

      authorizeDeployer();
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(300_000000)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      // $800 - $300 = $500
      expect(result).toBeOk(Cl.uint(500_000000));
    });

    it("can-commit returns true when capacity is sufficient", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "can-commit",
        [Cl.principal(wallet1), Cl.uint(800_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("can-commit returns false when capacity is insufficient", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "can-commit",
        [Cl.principal(wallet1), Cl.uint(900_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(false));
    });

    it("calculate-commitment-usd computes correctly for hUSD", () => {
      setupAllAssets();

      // 100 hUSD contribution, 5 members
      // total = 100_000000 * 5 = 500_000000
      // usd = 500_000000 * 1_000000 / 10^6 = 500_000000
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "calculate-commitment-usd",
        [Cl.uint(100_000000), Cl.uint(5), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(500_000000));
    });

    it("calculate-commitment-usd computes correctly for STX", () => {
      setupAllAssets();

      // 10 STX contribution, 3 members
      // total = 10_000000 * 3 = 30_000000
      // usd = 30_000000 * 500000 / 10^6 = 15_000000 ($15)
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "calculate-commitment-usd",
        [Cl.uint(10_000000), Cl.uint(3), Cl.uint(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(15_000000));
    });

    it("calculate-commitment-usd returns error for unconfigured asset", () => {
      // Do NOT setup assets
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "calculate-commitment-usd",
        [Cl.uint(100_000000), Cl.uint(3), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(711));
    });
  });

  // ============================================
  // 4. Withdrawal Tests
  // ============================================
  describe("withdrawals", () => {
    it("withdraw-husd succeeds for free balance", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 500_000000);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "withdraw-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(200_000000)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify balance updated
      const deposit = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      const data = (deposit.result as any).value.value;
      expect(data.deposited).toBeUint(300_000000);
    });

    it("withdraw-stx succeeds for free balance", () => {
      setupAllAssets();
      depositStx(wallet1, 100_000000);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "withdraw-stx",
        [Cl.uint(50_000000)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("withdraw fails if would undercollateralize (err u703)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000); // $800 capacity

      authorizeDeployer();
      // Lock $700 commitment
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(700_000000)],
        deployer,
      );

      // Try to withdraw 200 hUSD, leaving 800 hUSD
      // New capacity: 800 * 1 * 8000 / 10000 = $640 < $700 committed
      const { result } = simnet.callPublicFn(
        vaultV2,
        "withdraw-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(200_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(703));
    });

    it("withdraw fails for insufficient balance (err u702)", () => {
      setupAllAssets();
      mintHusd(wallet1, 500_000000);
      depositHusd(wallet1, 500_000000);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "withdraw-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(600_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(702));
    });

    it("withdraw fails with no deposit (err u704)", () => {
      setupAllAssets();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "withdraw-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(100_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(704));
    });

    it("withdraw-husd fails with zero amount (err u701)", () => {
      setupAllAssets();
      mintHusd(wallet1, 500_000000);
      depositHusd(wallet1, 500_000000);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "withdraw-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(701));
    });

    it("withdrawal allowed up to collateral limit", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000); // $800 capacity

      authorizeDeployer();
      // Lock $400 commitment -- need min 400 * 10000/8000 = 500 hUSD deposit
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      // Withdraw up to 500 hUSD (leaving 500 -> $400 capacity = $400 committed)
      const { result } = simnet.callPublicFn(
        vaultV2,
        "withdraw-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(500_000000)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ============================================
  // 5. Collateral Lock/Release Tests
  // ============================================
  describe("collateral lock/release", () => {
    it("lock-collateral succeeds from authorized contract", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      authorizeDeployer();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("lock-collateral fails from unauthorized caller (err u700)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      // wallet2 is not authorized
      const { result } = simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(100_000000)],
        wallet2,
      );
      expect(result).toBeErr(Cl.uint(700));
    });

    it("lock-collateral fails if insufficient capacity (err u703)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000); // $800 capacity

      authorizeDeployer();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(900_000000)], // > $800
        deployer,
      );
      expect(result).toBeErr(Cl.uint(703));
    });

    it("lock-collateral fails with zero amount (err u701)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      authorizeDeployer();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(701));
    });

    it("release-collateral restores capacity", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      authorizeDeployer();
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      // Verify reduced capacity
      const before = simnet.callReadOnlyFn(
        vaultV2,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(before.result).toBeOk(Cl.uint(400_000000));

      // Release
      const { result } = simnet.callPublicFn(
        vaultV2,
        "release-collateral",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify restored capacity
      const after = simnet.callReadOnlyFn(
        vaultV2,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(after.result).toBeOk(Cl.uint(800_000000));
    });

    it("release-collateral fails for non-existent commitment (err u708)", () => {
      setupAllAssets();
      authorizeDeployer();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "release-collateral",
        [Cl.principal(wallet1), Cl.uint(99)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(708));
    });

    it("release-collateral fails from unauthorized caller (err u700)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      authorizeDeployer();
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      // wallet2 is not authorized
      const { result } = simnet.callPublicFn(
        vaultV2,
        "release-collateral",
        [Cl.principal(wallet1), Cl.uint(1)],
        wallet2,
      );
      expect(result).toBeErr(Cl.uint(700));
    });

    it("multiple circle commitments track independently", () => {
      setupAllAssets();
      mintHusd(wallet1, 2000_000000);
      depositHusd(wallet1, 2000_000000); // $1600 capacity

      authorizeDeployer();

      // Lock $300 for circle 1
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(300_000000)],
        deployer,
      );
      // Lock $200 for circle 2
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(2), Cl.uint(200_000000)],
        deployer,
      );

      // Available = 1600 - 500 = 1100
      const available = simnet.callReadOnlyFn(
        vaultV2,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(available.result).toBeOk(Cl.uint(1100_000000));

      // Verify individual commitments
      const c1 = simnet.callReadOnlyFn(
        vaultV2,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(c1.result).toHaveClarityType(ClarityType.OptionalSome);
      expect((c1.result as any).value.value["commitment-usd"]).toBeUint(300_000000);

      const c2 = simnet.callReadOnlyFn(
        vaultV2,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(2)],
        deployer,
      );
      expect(c2.result).toHaveClarityType(ClarityType.OptionalSome);
      expect((c2.result as any).value.value["commitment-usd"]).toBeUint(200_000000);

      // Release circle 1
      simnet.callPublicFn(
        vaultV2,
        "release-collateral",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );

      // Available = 1600 - 200 = 1400
      const afterRelease = simnet.callReadOnlyFn(
        vaultV2,
        "get-available-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(afterRelease.result).toBeOk(Cl.uint(1400_000000));

      // Circle 1 commitment deleted
      const c1After = simnet.callReadOnlyFn(
        vaultV2,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(c1After.result).toBeNone();
    });
  });

  // ============================================
  // 6. Slash Tests
  // ============================================
  describe("slash collateral", () => {
    it("slash-collateral reduces deposit", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      authorizeDeployer();
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultV2,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(200_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(200_000000));

      // Verify deposit reduced
      const deposit = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      const data = (deposit.result as any).value.value;
      // 1000 hUSD - 200 hUSD slashed = 800 hUSD
      // (slash_usd $200 / price $1.00 = 200 hUSD tokens = 200_000000 micro)
      expect(data.deposited).toBeUint(800_000000);
    });

    it("slash-collateral releases commitment", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      authorizeDeployer();
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      simnet.callPublicFn(
        vaultV2,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(200_000000)],
        deployer,
      );

      // Commitment for circle 1 should be deleted
      const commitment = simnet.callReadOnlyFn(
        vaultV2,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(commitment.result).toBeNone();

      // User committed total should be 0
      const committed = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-committed",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect((committed.result as any).value["total-committed-usd"]).toBeUint(0);
    });

    it("slash priority: hUSD first, then STX", () => {
      setupAllAssets();
      mintHusd(wallet1, 500_000000); // 500 hUSD = $500
      depositHusd(wallet1, 500_000000);
      depositStx(wallet1, 1000_000000); // 1000 STX = $500

      // Total capacity = $500 * 80% + $500 * 50% = $400 + $250 = $650
      authorizeDeployer();
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(600_000000)],
        deployer,
      );

      // Slash $600 -- hUSD has $500, so $500 from hUSD, $100 from STX
      const { result } = simnet.callPublicFn(
        vaultV2,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(600_000000)],
        deployer,
      );
      expect(result).toBeOk(Cl.uint(600_000000));

      // hUSD should be fully depleted
      const husdDep = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      const husdData = (husdDep.result as any).value.value;
      expect(husdData.deposited).toBeUint(0);

      // STX should have $100 slashed: $100 / $0.50 = 200 STX = 200_000000 micro
      const stxDep = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      const stxData = (stxDep.result as any).value.value;
      // 1000_000000 - 200_000000 = 800_000000
      expect(stxData.deposited).toBeUint(800_000000);
    });

    it("slash-collateral fails from unauthorized caller (err u700)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      authorizeDeployer();
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultV2,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(200_000000)],
        wallet2,
      );
      expect(result).toBeErr(Cl.uint(700));
    });

    it("slash-collateral fails with zero amount (err u701)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      authorizeDeployer();
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      const { result } = simnet.callPublicFn(
        vaultV2,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(701));
    });

    it("slash-collateral fails without commitment (err u708)", () => {
      setupAllAssets();
      authorizeDeployer();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(99), Cl.uint(100_000000)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(708));
    });

    it("slash is capped at total deposit value", () => {
      setupAllAssets();
      mintHusd(wallet1, 500_000000);
      depositHusd(wallet1, 500_000000); // $500 hUSD

      authorizeDeployer();
      // Lock only what capacity allows: $500 * 80% = $400
      simnet.callPublicFn(
        vaultV2,
        "lock-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(400_000000)],
        deployer,
      );

      // Slash more than the deposit value
      const { result } = simnet.callPublicFn(
        vaultV2,
        "slash-collateral",
        [Cl.principal(wallet1), Cl.uint(1), Cl.uint(1000_000000)],
        deployer,
      );
      // Slashed amount capped at $500 (all hUSD)
      expect(result).toBeOk(Cl.uint(500_000000));
    });
  });

  // ============================================
  // 7. Yield Tests
  // ============================================
  describe("yield", () => {
    it("fund-yield-husd sets reward rate", () => {
      setupAllAssets();
      mintHusd(deployer, 10000_000000); // mint to deployer for rewards

      const { result } = simnet.callPublicFn(
        vaultV2,
        "fund-yield-husd",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000), // 1000 hUSD
          Cl.uint(200), // 200 blocks (>= MIN_YIELD_DURATION 144)
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify rate: 1000_000000 / 200 = 5_000000 per block
      const config = simnet.callReadOnlyFn(
        vaultV2,
        "get-asset-config",
        [Cl.uint(0)],
        deployer,
      );
      expect(config.result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (config.result as any).value.value;
      expect(data["reward-rate"]).toBeUint(5_000000);
    });

    it("fund-yield-stx sets reward rate", () => {
      setupAllAssets();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "fund-yield-stx",
        [
          Cl.uint(500_000000), // 500 STX
          Cl.uint(200), // 200 blocks (>= MIN_YIELD_DURATION 144)
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify rate: 500_000000 / 200 = 2_500000 per block
      const config = simnet.callReadOnlyFn(
        vaultV2,
        "get-asset-config",
        [Cl.uint(1)],
        deployer,
      );
      const data = (config.result as any).value.value;
      expect(data["reward-rate"]).toBeUint(2_500000);
    });

    it("fund-yield-husd fails for non-admin (err u700)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "fund-yield-husd",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(100_000000),
          Cl.uint(200),
        ],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(700));
    });

    it("pending yield increases over blocks", () => {
      setupAllAssets();
      mintHusd(deployer, 10000_000000);
      mintHusd(wallet1, 1000_000000);

      // User deposits first
      depositHusd(wallet1, 1000_000000);

      // Fund yield pool: 1000 hUSD over 1000 blocks = 1_000000 per block
      simnet.callPublicFn(
        vaultV2,
        "fund-yield-husd",
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
        vaultV2,
        "get-pending-yield",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      const yieldAmount = Number((pending.result as any).value);
      expect(yieldAmount).toBeGreaterThan(0);
    });

    it("claim-yield-husd transfers rewards", () => {
      setupAllAssets();
      mintHusd(deployer, 10000_000000);
      mintHusd(wallet1, 1000_000000);

      depositHusd(wallet1, 1000_000000);

      // Fund yield: 1000 hUSD over 1000 blocks
      simnet.callPublicFn(
        vaultV2,
        "fund-yield-husd",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000),
          Cl.uint(1000),
        ],
        deployer,
      );

      simnet.mineEmptyBlocks(10);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "claim-yield-husd",
        [Cl.contractPrincipal(deployer, mockToken)],
        wallet1,
      );
      // Should return (ok uint) with claimed amount > 0
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
      const claimed = Number((result as any).value.value);
      expect(claimed).toBeGreaterThan(0);
    });

    it("claim-yield-stx transfers STX rewards", () => {
      setupAllAssets();

      // User deposits STX first
      depositStx(wallet1, 100_000000); // 100 STX

      // Fund STX yield: 500 STX over 500 blocks = 1 STX/block
      simnet.callPublicFn(
        vaultV2,
        "fund-yield-stx",
        [Cl.uint(500_000000), Cl.uint(500)],
        deployer,
      );

      simnet.mineEmptyBlocks(10);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "claim-yield-stx",
        [],
        wallet1,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
      const claimed = Number((result as any).value.value);
      expect(claimed).toBeGreaterThan(0);
    });

    it("claim-yield-husd fails with no rewards (err u701)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);
      // No yield funded

      const { result } = simnet.callPublicFn(
        vaultV2,
        "claim-yield-husd",
        [Cl.contractPrincipal(deployer, mockToken)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(701));
    });

    it("claim-yield-husd fails with no deposit (err u704)", () => {
      setupAllAssets();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "claim-yield-husd",
        [Cl.contractPrincipal(deployer, mockToken)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(704));
    });

    it("yield accumulates proportionally for multiple depositors", () => {
      setupAllAssets();
      mintHusd(deployer, 10000_000000);
      mintHusd(wallet1, 1000_000000);
      mintHusd(wallet2, 1000_000000);

      // Both deposit equal amounts
      depositHusd(wallet1, 1000_000000);
      depositHusd(wallet2, 1000_000000);

      // Fund yield
      simnet.callPublicFn(
        vaultV2,
        "fund-yield-husd",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000),
          Cl.uint(1000),
        ],
        deployer,
      );

      simnet.mineEmptyBlocks(10);

      const pending1 = simnet.callReadOnlyFn(
        vaultV2,
        "get-pending-yield",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      const pending2 = simnet.callReadOnlyFn(
        vaultV2,
        "get-pending-yield",
        [Cl.principal(wallet2), Cl.uint(0)],
        deployer,
      );

      const yield1 = Number((pending1.result as any).value);
      const yield2 = Number((pending2.result as any).value);

      // Both should have equal yield (equal deposits)
      expect(yield1).toBeGreaterThan(0);
      expect(yield1).toEqual(yield2);
    });
  });

  // ============================================
  // 8. Multi-Asset Capacity Test
  // ============================================
  describe("multi-asset capacity", () => {
    it("user deposits $1000 hUSD + $1000 STX worth: capacity = $800 + $500 = $1300", () => {
      setupAllAssets();

      // $1000 hUSD (6 decimals) = 1000_000000 micro-hUSD
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      // $1000 worth of STX at $0.50 each = 2000 STX = 2000_000000 microSTX
      depositStx(wallet1, 2000_000000);

      const { result: totalCap } = simnet.callReadOnlyFn(
        vaultV2,
        "get-total-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );
      // hUSD: 1000_000000 * 1_000000 / 10^6 = 1000_000000 USD -> * 8000 / 10000 = 800_000000
      // STX: 2000_000000 * 500000 / 10^6 = 1000_000000 USD -> * 5000 / 10000 = 500_000000
      // Total: 800_000000 + 500_000000 = 1300_000000
      expect(totalCap).toBeOk(Cl.uint(1300_000000));

      // Can commit up to $1300
      const { result: canYes } = simnet.callReadOnlyFn(
        vaultV2,
        "can-commit",
        [Cl.principal(wallet1), Cl.uint(1300_000000)],
        deployer,
      );
      expect(canYes).toBeOk(Cl.bool(true));

      // Cannot commit $1301
      const { result: canNo } = simnet.callReadOnlyFn(
        vaultV2,
        "can-commit",
        [Cl.principal(wallet1), Cl.uint(1301_000000)],
        deployer,
      );
      expect(canNo).toBeOk(Cl.bool(false));
    });

    it("three-asset deposit capacity (hUSD + STX + sBTC)", () => {
      setupAllAssets();

      // 1000 hUSD
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 1000_000000);

      // 100 STX ($50 worth)
      depositStx(wallet1, 100_000000);

      // 0.01 sBTC ($650 worth) = 1_000000 satoshis (8 decimals)
      mintSbtc(wallet1, 1_000000);
      depositSbtc(wallet1, 1_000000);

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-total-capacity",
        [Cl.principal(wallet1)],
        deployer,
      );

      // hUSD: 1000_000000 * 1_000000 / 10^6 = 1_000_000000 USD * 8000/10000 = 800_000000
      // STX: 100_000000 * 500000 / 10^6 = 50_000000 USD * 5000/10000 = 25_000000
      // sBTC: 1_000000 * 6_500000_000000 / 10^8 = 65_000_000000 USD ($65,000) * 5000/10000 = 32_500_000000
      // Total = 800_000000 + 25_000000 + 32_500_000000 = 33_325_000000
      expect(result).toBeOk(Cl.uint(33_325_000000));
    });
  });

  // ============================================
  // 9. Vault Summary & Read-Only Tests
  // ============================================
  describe("read-only queries", () => {
    it("get-admin returns deployer", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-admin",
        [],
        deployer,
      );
      expect(result).toBePrincipal(deployer);
    });

    it("is-authorized returns true for admin", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "is-authorized",
        [Cl.principal(deployer)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("is-authorized returns false for random user", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "is-authorized",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(false);
    });

    it("is-authorized returns true for authorized contract", () => {
      authorizeDeployer(); // authorize deployer as a contract
      // Authorize wallet1 as a contract
      simnet.callPublicFn(
        vaultV2,
        "authorize-contract",
        [Cl.principal(wallet1)],
        deployer,
      );

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "is-authorized",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("get-user-deposit returns none for no deposit", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeNone();
    });

    it("get-circle-commitment returns none when none exists", () => {
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result).toBeNone();
    });

    it("get-vault-summary returns correct data", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);
      depositHusd(wallet1, 500_000000);
      depositStx(wallet1, 200_000000);

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-vault-summary",
        [Cl.principal(wallet1)],
        deployer,
      );

      const data = (result as any).value;
      expect(data["husd-deposited"]).toBeUint(500_000000);
      expect(data["stx-deposited"]).toBeUint(200_000000);
      expect(data["sbtc-deposited"]).toBeUint(0);
      expect(data["total-committed-usd"]).toBeUint(0);

      // hUSD capacity: 500 * 1.00 * 80% = $400
      // STX capacity: 200 microSTX * 0.50 = $100 * 50% = $50 -> wait, 200_000000 microSTX = 200 STX
      // 200 STX * $0.50 = $100 * 50% = $50
      // total = $400 + $50 = $450
      expect(data["total-capacity-usd"]).toBeUint(450_000000);
      expect(data["available-capacity-usd"]).toBeUint(450_000000);
    });

    it("get-asset-config returns configuration", () => {
      setupAllAssets();

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-asset-config",
        [Cl.uint(0)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (result as any).value.value;
      expect(data["ltv-ratio"]).toBeUint(8000);
      expect(data["price-usd"]).toBeUint(1_000000);
      expect(data.decimals).toBeUint(6);
      expect(data["is-active"]).toBeBool(true);
    });

    it("get-asset-config returns none for unconfigured asset", () => {
      // No setupAllAssets called
      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-asset-config",
        [Cl.uint(0)],
        deployer,
      );
      expect(result).toBeNone();
    });
  });

  // ============================================
  // 10. Edge Cases
  // ============================================
  describe("edge cases", () => {
    it("configure-asset rejects invalid asset type > 2", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [Cl.uint(3), Cl.none(), Cl.uint(5000), Cl.uint(6)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(706)); // ERR_INVALID_PARAMS
    });

    it("configure-asset rejects LTV below 10%", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(500), // 5% -- below min 1000 (10%)
          Cl.uint(6),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(706));
    });

    it("configure-asset rejects LTV above 90%", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(9500), // 95% -- above max 9000 (90%)
          Cl.uint(6),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(706));
    });

    it("set-admin transfers admin role", () => {
      simnet.callPublicFn(
        vaultV2,
        "set-admin",
        [Cl.principal(wallet1)],
        deployer,
      );

      // New admin can configure assets
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [Cl.uint(0), Cl.some(Cl.contractPrincipal(deployer, mockToken)), Cl.uint(8000), Cl.uint(6)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));

      // Old admin cannot
      const { result: oldAdmin } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [Cl.uint(1), Cl.none(), Cl.uint(5000), Cl.uint(6)],
        deployer,
      );
      expect(oldAdmin).toBeErr(Cl.uint(700));
    });

    it("deposit wrong token type for hUSD fails (err u707)", () => {
      setupAllAssets();
      mintSbtc(wallet1, 1_00000000);

      // Try to deposit sBTC through deposit-husd
      const { result } = simnet.callPublicFn(
        vaultV2,
        "deposit-husd",
        [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(50000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(707));
    });

    it("deposit wrong token type for sBTC fails (err u707)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);

      // Try to deposit hUSD through deposit-sbtc
      const { result } = simnet.callPublicFn(
        vaultV2,
        "deposit-sbtc",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(500_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(707));
    });

    it("get-pending-yield returns 0 for user with no deposit", () => {
      setupAllAssets();

      const { result } = simnet.callReadOnlyFn(
        vaultV2,
        "get-pending-yield",
        [Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      // Returns uint directly (not wrapped in ok)
      expect(result).toBeUint(0);
    });
  });

  // ============================================
  // 8. Security Fix Tests
  // ============================================
  describe("security fixes", () => {
    // #20: Emergency pause
    it("pause-vault blocks deposits (err u713)", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);

      simnet.callPublicFn(vaultV2, "pause-vault", [], deployer);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "deposit-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(100_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(713));
    });

    it("pause-vault blocks STX deposits (err u713)", () => {
      setupAllAssets();

      simnet.callPublicFn(vaultV2, "pause-vault", [], deployer);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "deposit-stx",
        [Cl.uint(100_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(713));
    });

    it("pause-vault blocks withdrawals (err u713)", () => {
      setupAllAssets();
      depositStx(wallet1, 100_000000);

      simnet.callPublicFn(vaultV2, "pause-vault", [], deployer);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "withdraw-stx",
        [Cl.uint(50_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(713));
    });

    it("unpause-vault re-enables deposits", () => {
      setupAllAssets();
      mintHusd(wallet1, 1000_000000);

      simnet.callPublicFn(vaultV2, "pause-vault", [], deployer);
      simnet.callPublicFn(vaultV2, "unpause-vault", [], deployer);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "deposit-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(100_000000)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("pause-vault fails for non-admin (err u700)", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "pause-vault",
        [],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(700));
    });

    it("is-vault-paused returns correct state", () => {
      const before = simnet.callReadOnlyFn(
        vaultV2,
        "is-vault-paused",
        [],
        deployer,
      );
      expect(before.result).toBeBool(false);

      simnet.callPublicFn(vaultV2, "pause-vault", [], deployer);

      const after = simnet.callReadOnlyFn(
        vaultV2,
        "is-vault-paused",
        [],
        deployer,
      );
      expect(after.result).toBeBool(true);
    });

    // #3: Zero-price blocks deposits
    it("deposit fails when asset price is zero (err u709)", () => {
      // Configure asset without setting price (defaults to 0)
      simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [Cl.uint(0), Cl.some(Cl.contractPrincipal(deployer, mockToken)), Cl.uint(8000), Cl.uint(6)],
        deployer,
      );
      // Don't set price -- it's 0

      mintHusd(wallet1, 1000_000000);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "deposit-husd",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(100_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(709));
    });

    // #5: Decimals capped at 18
    it("configure-asset rejects decimals > 18 (err u706)", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [Cl.uint(0), Cl.some(Cl.contractPrincipal(deployer, mockToken)), Cl.uint(8000), Cl.uint(19)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(706));
    });

    // #6: Max LTV capped at 80%
    it("configure-asset rejects LTV > 80% (err u706)", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [Cl.uint(0), Cl.some(Cl.contractPrincipal(deployer, mockToken)), Cl.uint(8100), Cl.uint(6)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(706));
    });

    it("configure-asset accepts LTV at exactly 80%", () => {
      const { result } = simnet.callPublicFn(
        vaultV2,
        "configure-asset",
        [Cl.uint(0), Cl.some(Cl.contractPrincipal(deployer, mockToken)), Cl.uint(8000), Cl.uint(6)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    // #7: Minimum yield duration
    it("fund-yield-husd rejects duration < 144 blocks (err u706)", () => {
      setupAllAssets();
      mintHusd(deployer, 10000_000000);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "fund-yield-husd",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000),
          Cl.uint(100), // Below MIN_YIELD_DURATION
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(706));
    });

    it("fund-yield-stx rejects duration < 144 blocks (err u706)", () => {
      setupAllAssets();

      const { result } = simnet.callPublicFn(
        vaultV2,
        "fund-yield-stx",
        [
          Cl.uint(500_000000),
          Cl.uint(50), // Below MIN_YIELD_DURATION
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(706));
    });

    it("fund-yield-husd accepts duration >= 144 blocks", () => {
      setupAllAssets();
      mintHusd(deployer, 10000_000000);

      const { result } = simnet.callPublicFn(
        vaultV2,
        "fund-yield-husd",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(1000_000000),
          Cl.uint(144), // Exactly MIN_YIELD_DURATION
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });
});
