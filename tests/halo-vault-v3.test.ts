import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

// Contract references
const vaultV3 = "halo-vault-v3";
const mockToken = "halo-mock-token";
const mockSbtc = "halo-mock-sbtc";

// Error codes
const ERR_NOT_AUTHORIZED = 700;
const ERR_INVALID_AMOUNT = 701;
const ERR_INSUFFICIENT_BALANCE = 702;
const ERR_INSUFFICIENT_CAPACITY = 703;
const ERR_NO_DEPOSIT = 704;
const ERR_TRANSFER_FAILED = 705;
const ERR_INVALID_PARAMS = 706;
const ERR_TOKEN_NOT_SUPPORTED = 707;
const ERR_COMMITMENT_NOT_FOUND = 708;
const ERR_ZERO_PRICE = 709;
const ERR_ALREADY_AUTHORIZED = 710;
const ERR_ASSET_NOT_CONFIGURED = 715;
const ERR_ASSET_INACTIVE = 716;
const ERR_VAULT_PAUSED = 713;
const ERR_MAX_ASSETS_REACHED = 717;

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

/** Configure all 4 initial assets */
function setupAssets() {
  // Asset 0: USDCx (halo-mock-token), 90% LTV, $1.00, 6 decimals
  simnet.callPublicFn(
    vaultV3,
    "configure-asset",
    [
      Cl.uint(0),
      Cl.some(Cl.contractPrincipal(deployer, mockToken)),
      Cl.uint(9000),
      Cl.uint(1_000_000),
      Cl.uint(6),
      Cl.stringAscii("Stable Yield"),
    ],
    deployer,
  );
  // Asset 1: sBTC (halo-mock-sbtc), 60% LTV, $60,000, 8 decimals
  simnet.callPublicFn(
    vaultV3,
    "configure-asset",
    [
      Cl.uint(1),
      Cl.some(Cl.contractPrincipal(deployer, mockSbtc)),
      Cl.uint(6000),
      Cl.uint(60_000_000_000),
      Cl.uint(8),
      Cl.stringAscii("BTC Earn"),
    ],
    deployer,
  );
  // Asset 2: STX (native), 40% LTV, $0.50, 6 decimals
  simnet.callPublicFn(
    vaultV3,
    "configure-asset",
    [
      Cl.uint(2),
      Cl.none(),
      Cl.uint(4000),
      Cl.uint(500_000),
      Cl.uint(6),
      Cl.stringAscii("STX Stack"),
    ],
    deployer,
  );
  // Asset 3: hUSD (halo-mock-token), 80% LTV, $1.00, 6 decimals
  simnet.callPublicFn(
    vaultV3,
    "configure-asset",
    [
      Cl.uint(3),
      Cl.some(Cl.contractPrincipal(deployer, mockToken)),
      Cl.uint(8000),
      Cl.uint(1_000_000),
      Cl.uint(6),
      Cl.stringAscii("Stable Savings"),
    ],
    deployer,
  );
}

function depositToken(
  user: string,
  assetType: number,
  amount: number,
  tokenContract: string = mockToken,
) {
  return simnet.callPublicFn(
    vaultV3,
    "deposit-token",
    [
      Cl.contractPrincipal(deployer, tokenContract),
      Cl.uint(assetType),
      Cl.uint(amount),
    ],
    user,
  );
}

function withdrawToken(
  user: string,
  assetType: number,
  amount: number,
  tokenContract: string = mockToken,
) {
  return simnet.callPublicFn(
    vaultV3,
    "withdraw-token",
    [
      Cl.contractPrincipal(deployer, tokenContract),
      Cl.uint(assetType),
      Cl.uint(amount),
    ],
    user,
  );
}

function depositStx(user: string, amount: number) {
  return simnet.callPublicFn(
    vaultV3,
    "deposit-stx",
    [Cl.uint(amount)],
    user,
  );
}

function withdrawStx(user: string, amount: number) {
  return simnet.callPublicFn(
    vaultV3,
    "withdraw-stx",
    [Cl.uint(amount)],
    user,
  );
}

function authorizeContract(contract: string) {
  return simnet.callPublicFn(
    vaultV3,
    "authorize-contract",
    [Cl.principal(contract)],
    deployer,
  );
}

function lockCollateral(
  caller: string,
  user: string,
  circleId: number,
  commitmentUsd: number,
) {
  return simnet.callPublicFn(
    vaultV3,
    "lock-collateral",
    [Cl.principal(user), Cl.uint(circleId), Cl.uint(commitmentUsd)],
    caller,
  );
}

function releaseCollateral(caller: string, user: string, circleId: number) {
  return simnet.callPublicFn(
    vaultV3,
    "release-collateral",
    [Cl.principal(user), Cl.uint(circleId)],
    caller,
  );
}

function slashCollateral(
  caller: string,
  user: string,
  circleId: number,
  slashUsd: number,
) {
  return simnet.callPublicFn(
    vaultV3,
    "slash-collateral",
    [Cl.principal(user), Cl.uint(circleId), Cl.uint(slashUsd)],
    caller,
  );
}

function getUserDeposit(user: string, assetType: number) {
  return simnet.callReadOnlyFn(
    vaultV3,
    "get-user-deposit",
    [Cl.principal(user), Cl.uint(assetType)],
    deployer,
  );
}

function getAssetConfig(assetType: number) {
  return simnet.callReadOnlyFn(
    vaultV3,
    "get-asset-config",
    [Cl.uint(assetType)],
    deployer,
  );
}

function getTotalCapacity(user: string) {
  return simnet.callReadOnlyFn(
    vaultV3,
    "get-total-capacity",
    [Cl.principal(user)],
    deployer,
  );
}

function getAvailableCapacity(user: string) {
  return simnet.callReadOnlyFn(
    vaultV3,
    "get-available-capacity",
    [Cl.principal(user)],
    deployer,
  );
}

function getVaultSummary(user: string) {
  return simnet.callReadOnlyFn(
    vaultV3,
    "get-vault-summary",
    [Cl.principal(user)],
    deployer,
  );
}

function getPendingYield(user: string, assetType: number) {
  return simnet.callReadOnlyFn(
    vaultV3,
    "get-pending-yield",
    [Cl.principal(user), Cl.uint(assetType)],
    deployer,
  );
}

// ============================================
// TESTS
// ============================================

describe("halo-vault-v3", () => {
  beforeEach(() => {
    simnet.mineEmptyBlock();
  });

  // ============================================
  // 1. ASSET CONFIGURATION
  // ============================================
  describe("Asset Configuration", () => {
    it("should configure the first asset successfully", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(9000),
          Cl.uint(1_000_000),
          Cl.uint(6),
          Cl.stringAscii("Stable Yield"),
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should configure all 4 initial assets", () => {
      setupAssets();
      const config0 = getAssetConfig(0);
      const config1 = getAssetConfig(1);
      const config2 = getAssetConfig(2);
      const config3 = getAssetConfig(3);
      expect(config0.result).toHaveClarityType(ClarityType.OptionalSome);
      expect(config1.result).toHaveClarityType(ClarityType.OptionalSome);
      expect(config2.result).toHaveClarityType(ClarityType.OptionalSome);
      expect(config3.result).toHaveClarityType(ClarityType.OptionalSome);
    });

    it("should increment asset-count for each new asset", () => {
      const countBefore = simnet.callReadOnlyFn(vaultV3, "get-asset-count", [], deployer);
      expect(countBefore.result).toBeUint(0);

      setupAssets();

      const countAfter = simnet.callReadOnlyFn(vaultV3, "get-asset-count", [], deployer);
      expect(countAfter.result).toBeUint(4);
    });

    it("should not increment asset-count on reconfigure", () => {
      setupAssets();
      const countBefore = simnet.callReadOnlyFn(vaultV3, "get-asset-count", [], deployer);
      expect(countBefore.result).toBeUint(4);

      // Reconfigure asset 0
      simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(8500),
          Cl.uint(1_000_000),
          Cl.uint(6),
          Cl.stringAscii("New Strategy"),
        ],
        deployer,
      );

      const countAfter = simnet.callReadOnlyFn(vaultV3, "get-asset-count", [], deployer);
      expect(countAfter.result).toBeUint(4);
    });

    it("should preserve existing price on reconfigure", () => {
      setupAssets();
      // Update price to $2.00
      simnet.callPublicFn(
        vaultV3,
        "set-asset-price",
        [Cl.uint(0), Cl.uint(2_000_000)],
        deployer,
      );
      // Reconfigure asset 0 with price=$5 in the call
      simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(9000),
          Cl.uint(5_000_000),
          Cl.uint(6),
          Cl.stringAscii("Stable Yield"),
        ],
        deployer,
      );
      const config = getAssetConfig(0);
      // Price should still be $2.00 (preserved), not $5
      const data = (config.result as any).value.value;
      expect(data["price-usd"]).toBeUint(2_000_000);
    });

    it("should reject non-admin configure-asset", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(9000),
          Cl.uint(1_000_000),
          Cl.uint(6),
          Cl.stringAscii("Stable Yield"),
        ],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject LTV below minimum (100)", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(99),
          Cl.uint(1_000_000),
          Cl.uint(6),
          Cl.stringAscii("Test"),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_INVALID_PARAMS));
    });

    it("should reject LTV above maximum (9500)", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(9501),
          Cl.uint(1_000_000),
          Cl.uint(6),
          Cl.stringAscii("Test"),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_INVALID_PARAMS));
    });

    it("should accept LTV at minimum boundary (100)", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(100),
          Cl.uint(1_000_000),
          Cl.uint(6),
          Cl.stringAscii("Test"),
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should accept LTV at maximum boundary (9500)", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(9500),
          Cl.uint(1_000_000),
          Cl.uint(6),
          Cl.stringAscii("Test"),
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject decimals greater than 18", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(5000),
          Cl.uint(1_000_000),
          Cl.uint(19),
          Cl.stringAscii("Test"),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_INVALID_PARAMS));
    });

    it("should reject zero price", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(0),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(5000),
          Cl.uint(0),
          Cl.uint(6),
          Cl.stringAscii("Test"),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_ZERO_PRICE));
    });

    it("should reject asset-type >= MAX_ASSETS (10)", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "configure-asset",
        [
          Cl.uint(10),
          Cl.some(Cl.contractPrincipal(deployer, mockToken)),
          Cl.uint(5000),
          Cl.uint(1_000_000),
          Cl.uint(6),
          Cl.stringAscii("Test"),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_INVALID_PARAMS));
    });

    it("should allow configuring up to 10 assets", () => {
      // Configure assets 0 through 9
      for (let i = 0; i < 10; i++) {
        const { result } = simnet.callPublicFn(
          vaultV3,
          "configure-asset",
          [
            Cl.uint(i),
            Cl.none(),
            Cl.uint(5000),
            Cl.uint(1_000_000),
            Cl.uint(6),
            Cl.stringAscii(`Asset ${i}`),
          ],
          deployer,
        );
        expect(result).toBeOk(Cl.bool(true));
      }
      const count = simnet.callReadOnlyFn(vaultV3, "get-asset-count", [], deployer);
      expect(count.result).toBeUint(10);
    });

    it("should set asset as active on configure", () => {
      setupAssets();
      const config = getAssetConfig(0);
      const data = (config.result as any).value.value;
      expect(data["is-active"]).toBeBool(true);
    });
  });

  // ============================================
  // 2. DEPOSITS
  // ============================================
  describe("Deposits - Token", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("should deposit hUSD (asset 0) successfully", () => {
      mintHusd(wallet1, 1_000_000_000);
      const { result } = depositToken(wallet1, 0, 500_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should deposit sBTC (asset 1) successfully", () => {
      mintSbtc(wallet1, 100_000_000);
      const { result } = depositToken(wallet1, 1, 50_000_000, mockSbtc);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should deposit hUSD to asset 3 successfully", () => {
      mintHusd(wallet1, 1_000_000_000);
      const { result } = depositToken(wallet1, 3, 500_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should update user deposit balance after deposit", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      const dep = getUserDeposit(wallet1, 0);
      const data = (dep.result as any).value.value;
      expect(data["deposited"]).toBeUint(500_000_000);
    });

    it("should update total-deposited in asset config after deposit", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      const config = getAssetConfig(0);
      const data = (config.result as any).value.value;
      expect(data["total-deposited"]).toBeUint(500_000_000);
    });

    it("should accumulate multiple deposits", () => {
      mintHusd(wallet1, 2_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      depositToken(wallet1, 0, 300_000_000);
      const dep = getUserDeposit(wallet1, 0);
      const data = (dep.result as any).value.value;
      expect(data["deposited"]).toBeUint(800_000_000);
    });

    it("should track deposits from multiple users independently", () => {
      mintHusd(wallet1, 1_000_000_000);
      mintHusd(wallet2, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      depositToken(wallet2, 0, 300_000_000);

      const dep1 = getUserDeposit(wallet1, 0);
      expect((dep1.result as any).value.value["deposited"]).toBeUint(500_000_000);

      const dep2 = getUserDeposit(wallet2, 0);
      expect((dep2.result as any).value.value["deposited"]).toBeUint(300_000_000);
    });

    it("should update total-deposited across multiple users", () => {
      mintHusd(wallet1, 1_000_000_000);
      mintHusd(wallet2, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      depositToken(wallet2, 0, 300_000_000);
      const config = getAssetConfig(0);
      const data = (config.result as any).value.value;
      expect(data["total-deposited"]).toBeUint(800_000_000);
    });

    it("should reject deposit of 0 amount", () => {
      mintHusd(wallet1, 1_000_000_000);
      const { result } = depositToken(wallet1, 0, 0);
      expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("should reject deposit to unconfigured asset", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "deposit-token",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(9),
          Cl.uint(100),
        ],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_ASSET_NOT_CONFIGURED));
    });

    it("should reject deposit when vault is paused", () => {
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      mintHusd(wallet1, 1_000_000_000);
      const { result } = depositToken(wallet1, 0, 100);
      expect(result).toBeErr(Cl.uint(ERR_VAULT_PAUSED));
    });

    it("should reject deposit to inactive asset", () => {
      simnet.callPublicFn(
        vaultV3,
        "deactivate-asset",
        [Cl.uint(0)],
        deployer,
      );
      mintHusd(wallet1, 1_000_000_000);
      const { result } = depositToken(wallet1, 0, 100);
      expect(result).toBeErr(Cl.uint(ERR_ASSET_INACTIVE));
    });

    it("should reject deposit with wrong token contract", () => {
      mintSbtc(wallet1, 100_000_000);
      // Try to deposit sBTC into asset 0 (which expects halo-mock-token)
      const { result } = depositToken(wallet1, 0, 100, mockSbtc);
      expect(result).toBeErr(Cl.uint(ERR_TOKEN_NOT_SUPPORTED));
    });

    it("should reject token deposit to STX asset type (no token-principal)", () => {
      mintHusd(wallet1, 1_000_000_000);
      // Asset 2 is STX with no token-principal
      const { result } = depositToken(wallet1, 2, 100);
      expect(result).toBeErr(Cl.uint(ERR_TOKEN_NOT_SUPPORTED));
    });

    it("should increase total capacity after deposit", () => {
      const capBefore = getTotalCapacity(wallet1);
      expect(capBefore.result).toBeOk(Cl.uint(0));

      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $1000 at 90% LTV = $900 capacity
      const capAfter = getTotalCapacity(wallet1);
      // 1_000_000_000 tokens * $1.00 / 10^6 = $1000 * 90% = $900 = 900_000_000
      expect(capAfter.result).toBeOk(Cl.uint(900_000_000));
    });
  });

  describe("Deposits - STX", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("should deposit STX successfully", () => {
      const { result } = depositStx(wallet1, 100_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should update user STX deposit balance", () => {
      depositStx(wallet1, 100_000_000);
      const dep = getUserDeposit(wallet1, 2);
      const data = (dep.result as any).value.value;
      expect(data["deposited"]).toBeUint(100_000_000);
    });

    it("should reject STX deposit of 0 amount", () => {
      const { result } = depositStx(wallet1, 0);
      expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("should reject STX deposit when paused", () => {
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      const { result } = depositStx(wallet1, 100_000_000);
      expect(result).toBeErr(Cl.uint(ERR_VAULT_PAUSED));
    });

    it("should calculate correct STX capacity", () => {
      // 100 STX at $0.50 = $50, 40% LTV = $20
      depositStx(wallet1, 100_000_000);
      const cap = getTotalCapacity(wallet1);
      expect(cap.result).toBeOk(Cl.uint(20_000_000));
    });

    it("should accumulate multiple STX deposits", () => {
      depositStx(wallet1, 50_000_000);
      depositStx(wallet1, 30_000_000);
      const dep = getUserDeposit(wallet1, 2);
      const data = (dep.result as any).value.value;
      expect(data["deposited"]).toBeUint(80_000_000);
    });
  });

  // ============================================
  // 3. WITHDRAWALS
  // ============================================
  describe("Withdrawals - Token", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("should withdraw token successfully", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      const { result } = withdrawToken(wallet1, 0, 200_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should update user balance after withdrawal", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      withdrawToken(wallet1, 0, 200_000_000);
      const dep = getUserDeposit(wallet1, 0);
      expect((dep.result as any).value.value["deposited"]).toBeUint(300_000_000);
    });

    it("should update total-deposited after withdrawal", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      withdrawToken(wallet1, 0, 200_000_000);
      const config = getAssetConfig(0);
      expect((config.result as any).value.value["total-deposited"]).toBeUint(300_000_000);
    });

    it("should allow full withdrawal when no commitments", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      const { result } = withdrawToken(wallet1, 0, 500_000_000);
      expect(result).toBeOk(Cl.bool(true));
      const dep = getUserDeposit(wallet1, 0);
      expect((dep.result as any).value.value["deposited"]).toBeUint(0);
    });

    it("should reject withdrawal exceeding deposited amount", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      const { result } = withdrawToken(wallet1, 0, 600_000_000);
      expect(result).toBeErr(Cl.uint(ERR_INSUFFICIENT_BALANCE));
    });

    it("should reject withdrawal of 0 amount", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      const { result } = withdrawToken(wallet1, 0, 0);
      expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("should reject withdrawal when vault is paused", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      const { result } = withdrawToken(wallet1, 0, 100_000_000);
      expect(result).toBeErr(Cl.uint(ERR_VAULT_PAUSED));
    });

    it("should reject withdrawal with wrong token", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      const { result } = withdrawToken(wallet1, 0, 100_000_000, mockSbtc);
      expect(result).toBeErr(Cl.uint(ERR_TOKEN_NOT_SUPPORTED));
    });

    it("should reject withdrawal when no deposit exists", () => {
      const { result } = withdrawToken(wallet1, 0, 100);
      expect(result).toBeErr(Cl.uint(ERR_NO_DEPOSIT));
    });

    it("should reject withdrawal that would break commitment", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $1000 at 90% = $900 capacity

      // Authorize deployer to lock collateral, then lock $800
      authorizeContract(deployer);
      lockCollateral(deployer, wallet1, 1, 800_000_000);

      // Try to withdraw all -- would reduce capacity below commitment
      const { result } = withdrawToken(wallet1, 0, 1_000_000_000);
      expect(result).toBeErr(Cl.uint(ERR_INSUFFICIENT_CAPACITY));
    });

    it("should allow partial withdrawal that maintains commitment", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $1000 at 90% = $900 capacity

      authorizeContract(deployer);
      lockCollateral(deployer, wallet1, 1, 100_000_000); // Lock $100

      // Withdraw some but keep enough for commitment
      // Need at least $100 / 0.9 = ~$111.12 worth = 111_112_000 tokens
      // Withdrawing 800M leaves 200M = $200 capacity = enough
      const { result } = withdrawToken(wallet1, 0, 800_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should withdraw sBTC successfully", () => {
      mintSbtc(wallet1, 100_000_000);
      depositToken(wallet1, 1, 50_000_000, mockSbtc);
      const { result } = withdrawToken(wallet1, 1, 25_000_000, mockSbtc);
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe("Withdrawals - STX", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("should withdraw STX successfully", () => {
      depositStx(wallet1, 100_000_000);
      const { result } = withdrawStx(wallet1, 50_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should update STX balance after withdrawal", () => {
      depositStx(wallet1, 100_000_000);
      withdrawStx(wallet1, 40_000_000);
      const dep = getUserDeposit(wallet1, 2);
      expect((dep.result as any).value.value["deposited"]).toBeUint(60_000_000);
    });

    it("should reject STX withdrawal exceeding balance", () => {
      depositStx(wallet1, 100_000_000);
      const { result } = withdrawStx(wallet1, 200_000_000);
      expect(result).toBeErr(Cl.uint(ERR_INSUFFICIENT_BALANCE));
    });

    it("should reject STX withdrawal of 0", () => {
      depositStx(wallet1, 100_000_000);
      const { result } = withdrawStx(wallet1, 0);
      expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("should reject STX withdrawal when paused", () => {
      depositStx(wallet1, 100_000_000);
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      const { result } = withdrawStx(wallet1, 50_000_000);
      expect(result).toBeErr(Cl.uint(ERR_VAULT_PAUSED));
    });

    it("should allow full STX withdrawal with no commitments", () => {
      depositStx(wallet1, 100_000_000);
      const { result } = withdrawStx(wallet1, 100_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject STX withdrawal that would break commitment", () => {
      depositStx(wallet1, 100_000_000); // $50 at 40% = $20 capacity
      authorizeContract(deployer);
      lockCollateral(deployer, wallet1, 1, 15_000_000); // Lock $15

      // Withdraw all would leave 0 capacity
      const { result } = withdrawStx(wallet1, 100_000_000);
      expect(result).toBeErr(Cl.uint(ERR_INSUFFICIENT_CAPACITY));
    });
  });

  // ============================================
  // 4. YIELD
  // ============================================
  describe("Yield - Fund & Claim", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("should fund yield for token asset", () => {
      mintHusd(deployer, 10_000_000_000);
      const { result } = simnet.callPublicFn(
        vaultV3,
        "fund-yield",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(0),
          Cl.uint(1_440_000),
          Cl.uint(144),
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should fund yield for STX", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "fund-yield-stx",
        [Cl.uint(1_440_000), Cl.uint(144)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject non-admin fund-yield", () => {
      mintHusd(wallet1, 10_000_000_000);
      const { result } = simnet.callPublicFn(
        vaultV3,
        "fund-yield",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(0),
          Cl.uint(1_440_000),
          Cl.uint(144),
        ],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject non-admin fund-yield-stx", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "fund-yield-stx",
        [Cl.uint(1_440_000), Cl.uint(144)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject fund-yield with duration below minimum (< 144)", () => {
      mintHusd(deployer, 10_000_000_000);
      const { result } = simnet.callPublicFn(
        vaultV3,
        "fund-yield",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(0),
          Cl.uint(1_440_000),
          Cl.uint(143),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_INVALID_PARAMS));
    });

    it("should reject fund-yield-stx with duration below minimum", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "fund-yield-stx",
        [Cl.uint(1_440_000), Cl.uint(100)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_INVALID_PARAMS));
    });

    it("should reject fund-yield with zero amount", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "fund-yield",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(0),
          Cl.uint(0),
          Cl.uint(144),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("should reject fund-yield with wrong token", () => {
      mintSbtc(deployer, 10_000_000_000);
      const { result } = simnet.callPublicFn(
        vaultV3,
        "fund-yield",
        [
          Cl.contractPrincipal(deployer, mockSbtc),
          Cl.uint(0),
          Cl.uint(1_440_000),
          Cl.uint(144),
        ],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_TOKEN_NOT_SUPPORTED));
    });

    it("should allow user to claim yield after blocks pass", () => {
      // Deposit first, then fund yield
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);

      // Fund yield: 1,440,000 tokens over 144 blocks = 10,000 per block
      mintHusd(deployer, 10_000_000_000);
      simnet.callPublicFn(
        vaultV3,
        "fund-yield",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(0),
          Cl.uint(1_440_000),
          Cl.uint(144),
        ],
        deployer,
      );

      // Mine 50 blocks
      simnet.mineEmptyBlocks(50);

      // Check pending yield
      const pending = getPendingYield(wallet1, 0);
      // Should have accumulated ~50 * 10000 = 500_000 tokens
      // Exact amount depends on precision but should be > 0
      expect(pending.result).toHaveClarityType(ClarityType.UInt);

      // Claim yield
      const { result } = simnet.callPublicFn(
        vaultV3,
        "claim-yield-token",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(0)],
        wallet1,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("should reject yield claim with no deposit", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "claim-yield-token",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NO_DEPOSIT));
    });

    it("should reject yield claim when no yield accumulated", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      // No yield funded, so no rewards
      const { result } = simnet.callPublicFn(
        vaultV3,
        "claim-yield-token",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("should reject yield claim when paused", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      const { result } = simnet.callPublicFn(
        vaultV3,
        "claim-yield-token",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_VAULT_PAUSED));
    });

    it("should reject yield claim when asset is inactive", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      simnet.callPublicFn(vaultV3, "deactivate-asset", [Cl.uint(0)], deployer);
      const { result } = simnet.callPublicFn(
        vaultV3,
        "claim-yield-token",
        [Cl.contractPrincipal(deployer, mockToken), Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_ASSET_INACTIVE));
    });

    it("should claim STX yield", () => {
      depositStx(wallet1, 100_000_000);

      // Fund STX yield
      simnet.callPublicFn(
        vaultV3,
        "fund-yield-stx",
        [Cl.uint(1_440_000), Cl.uint(144)],
        deployer,
      );

      simnet.mineEmptyBlocks(50);

      const { result } = simnet.callPublicFn(
        vaultV3,
        "claim-yield-stx",
        [],
        wallet1,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("should reject STX yield claim with no deposit", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "claim-yield-stx",
        [],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NO_DEPOSIT));
    });

    it("should distribute yield proportionally to two depositors", () => {
      mintHusd(wallet1, 2_000_000_000);
      mintHusd(wallet2, 2_000_000_000);

      // wallet1 deposits 1000 tokens, wallet2 deposits 1000 tokens (equal)
      depositToken(wallet1, 0, 1_000_000_000);
      depositToken(wallet2, 0, 1_000_000_000);

      mintHusd(deployer, 10_000_000_000);
      simnet.callPublicFn(
        vaultV3,
        "fund-yield",
        [
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(0),
          Cl.uint(2_880_000),
          Cl.uint(144),
        ],
        deployer,
      );

      simnet.mineEmptyBlocks(144);

      const pending1 = getPendingYield(wallet1, 0);
      const pending2 = getPendingYield(wallet2, 0);

      // Both should have equal yield (both deposited same amount)
      expect(pending1.result).toHaveClarityType(ClarityType.UInt);
      expect(pending2.result).toHaveClarityType(ClarityType.UInt);
      // The values should be equal since deposits are equal
      expect(pending1.result).toBeUint((pending2.result as any).value);
    });
  });

  // ============================================
  // 5. CAPACITY & COMMITMENTS
  // ============================================
  describe("Capacity & Commitments", () => {
    beforeEach(() => {
      setupAssets();
      authorizeContract(deployer);
    });

    it("should calculate total capacity from hUSD deposit", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $1000 * 90% = $900
      const cap = getTotalCapacity(wallet1);
      expect(cap.result).toBeOk(Cl.uint(900_000_000));
    });

    it("should calculate total capacity from sBTC deposit", () => {
      mintSbtc(wallet1, 100_000_000); // 1 BTC
      depositToken(wallet1, 1, 100_000_000, mockSbtc);
      // 1 BTC at $60,000 = $60,000, 60% LTV = $36,000
      const cap = getTotalCapacity(wallet1);
      expect(cap.result).toBeOk(Cl.uint(36_000_000_000));
    });

    it("should calculate total capacity from STX deposit", () => {
      depositStx(wallet1, 200_000_000); // 200 STX
      // 200 STX at $0.50 = $100, 40% LTV = $40
      const cap = getTotalCapacity(wallet1);
      expect(cap.result).toBeOk(Cl.uint(40_000_000));
    });

    it("should aggregate capacity across multiple assets", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $900 capacity
      depositStx(wallet1, 100_000_000); // $20 capacity
      const cap = getTotalCapacity(wallet1);
      expect(cap.result).toBeOk(Cl.uint(920_000_000));
    });

    it("should return 0 capacity for user with no deposits", () => {
      const cap = getTotalCapacity(wallet1);
      expect(cap.result).toBeOk(Cl.uint(0));
    });

    it("should calculate available capacity = total - committed", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $900 capacity

      lockCollateral(deployer, wallet1, 1, 300_000_000); // Lock $300

      const available = getAvailableCapacity(wallet1);
      expect(available.result).toBeOk(Cl.uint(600_000_000));
    });

    it("should lock collateral successfully", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);

      const { result } = lockCollateral(deployer, wallet1, 1, 500_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject lock exceeding available capacity", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $900 capacity

      const { result } = lockCollateral(deployer, wallet1, 1, 1_000_000_000);
      expect(result).toBeErr(Cl.uint(ERR_INSUFFICIENT_CAPACITY));
    });

    it("should reject lock of 0 amount", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);

      const { result } = lockCollateral(deployer, wallet1, 1, 0);
      expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("should reject lock when paused", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);

      const { result } = lockCollateral(deployer, wallet1, 1, 100_000_000);
      expect(result).toBeErr(Cl.uint(ERR_VAULT_PAUSED));
    });

    it("should release collateral and restore capacity", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $900 capacity
      lockCollateral(deployer, wallet1, 1, 500_000_000);

      const availBefore = getAvailableCapacity(wallet1);
      expect(availBefore.result).toBeOk(Cl.uint(400_000_000));

      releaseCollateral(deployer, wallet1, 1);

      const availAfter = getAvailableCapacity(wallet1);
      expect(availAfter.result).toBeOk(Cl.uint(900_000_000));
    });

    it("should reject release for non-existent commitment", () => {
      const { result } = releaseCollateral(deployer, wallet1, 999);
      expect(result).toBeErr(Cl.uint(ERR_COMMITMENT_NOT_FOUND));
    });

    it("should only allow authorized contracts to lock", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);

      const { result } = lockCollateral(wallet2, wallet1, 1, 100_000_000);
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should only allow authorized contracts to release", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      lockCollateral(deployer, wallet1, 1, 100_000_000);

      const { result } = releaseCollateral(wallet2, wallet1, 1);
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should handle multiple circle commitments", () => {
      mintHusd(wallet1, 2_000_000_000);
      depositToken(wallet1, 0, 2_000_000_000); // $1800 capacity

      lockCollateral(deployer, wallet1, 1, 500_000_000);
      lockCollateral(deployer, wallet1, 2, 300_000_000);

      const available = getAvailableCapacity(wallet1);
      expect(available.result).toBeOk(Cl.uint(1_000_000_000));
    });

    it("should release one commitment without affecting others", () => {
      mintHusd(wallet1, 2_000_000_000);
      depositToken(wallet1, 0, 2_000_000_000); // $1800 capacity

      lockCollateral(deployer, wallet1, 1, 500_000_000);
      lockCollateral(deployer, wallet1, 2, 300_000_000);

      releaseCollateral(deployer, wallet1, 1);

      const available = getAvailableCapacity(wallet1);
      // 1800 - 300 = 1500
      expect(available.result).toBeOk(Cl.uint(1_500_000_000));
    });
  });

  // ============================================
  // 6. SLASH COLLATERAL
  // ============================================
  describe("Slash Collateral", () => {
    beforeEach(() => {
      setupAssets();
      authorizeContract(deployer);
    });

    it("should slash user deposits", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      lockCollateral(deployer, wallet1, 1, 500_000_000);

      const { result } = slashCollateral(deployer, wallet1, 1, 200_000_000);
      expect(result).toHaveClarityType(ClarityType.ResponseOk);

      // User deposit should be reduced
      const dep = getUserDeposit(wallet1, 0);
      const deposited = (dep.result as any).value.value["deposited"];
      // Slashed $200 from asset 0 ($1 each) = 200_000_000 tokens
      expect(deposited).toBeUint(800_000_000);
    });

    it("should slash from USDCx (asset 0) first in priority order", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000); // $500 in USDCx
      depositStx(wallet1, 100_000_000); // $50 in STX

      // Lock and slash
      lockCollateral(deployer, wallet1, 1, 100_000_000);
      slashCollateral(deployer, wallet1, 1, 100_000_000);

      // USDCx (asset 0) should be slashed first
      const dep0 = getUserDeposit(wallet1, 0);
      expect((dep0.result as any).value.value["deposited"]).toBeUint(400_000_000);

      // STX should remain untouched
      const dep2 = getUserDeposit(wallet1, 2);
      expect((dep2.result as any).value.value["deposited"]).toBeUint(100_000_000);
    });

    it("should cascade slash to next asset if first is insufficient", () => {
      mintHusd(wallet1, 100_000_000);
      depositToken(wallet1, 0, 100_000_000); // $100 in USDCx
      depositStx(wallet1, 1_000_000_000); // $500 in STX

      lockCollateral(deployer, wallet1, 1, 200_000_000);
      slashCollateral(deployer, wallet1, 1, 200_000_000); // Slash $200

      // USDCx should be drained to 0
      const dep0 = getUserDeposit(wallet1, 0);
      expect((dep0.result as any).value.value["deposited"]).toBeUint(0);

      // STX should have remaining $100 slashed
      // $100 at $0.50/STX = 200_000_000 micro-STX slashed
      const dep2 = getUserDeposit(wallet1, 2);
      const stxRemaining = (dep2.result as any).value.value["deposited"];
      // 1_000_000_000 - 200_000_000 = 800_000_000
      expect(stxRemaining).toBeUint(800_000_000);
    });

    it("should only allow authorized contracts to slash", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      lockCollateral(deployer, wallet1, 1, 500_000_000);

      const { result } = slashCollateral(wallet2, wallet1, 1, 100_000_000);
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject slash of 0 amount", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      lockCollateral(deployer, wallet1, 1, 500_000_000);

      const { result } = slashCollateral(deployer, wallet1, 1, 0);
      expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("should reject slash for non-existent commitment", () => {
      const { result } = slashCollateral(deployer, wallet1, 999, 100_000_000);
      expect(result).toBeErr(Cl.uint(ERR_COMMITMENT_NOT_FOUND));
    });

    it("should release commitment after slashing", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      lockCollateral(deployer, wallet1, 1, 500_000_000);

      slashCollateral(deployer, wallet1, 1, 200_000_000);

      // Commitment should be deleted
      const commitment = simnet.callReadOnlyFn(
        vaultV3,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(commitment.result).toHaveClarityType(ClarityType.OptionalNone);
    });

    it("should reduce total-committed after slash", () => {
      mintHusd(wallet1, 2_000_000_000);
      depositToken(wallet1, 0, 2_000_000_000);
      lockCollateral(deployer, wallet1, 1, 500_000_000);
      lockCollateral(deployer, wallet1, 2, 300_000_000);

      slashCollateral(deployer, wallet1, 1, 200_000_000);

      // Only circle 2 commitment should remain ($300)
      const committed = simnet.callReadOnlyFn(
        vaultV3,
        "get-user-committed",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect((committed.result as any).value["total-committed-usd"]).toBeUint(300_000_000);
    });

    it("should handle slash larger than total deposits gracefully", () => {
      mintHusd(wallet1, 100_000_000);
      depositToken(wallet1, 0, 100_000_000); // Only $100

      lockCollateral(deployer, wallet1, 1, 50_000_000);
      // Try to slash $500 when user only has $100
      const { result } = slashCollateral(deployer, wallet1, 1, 500_000_000);
      // Should succeed but only slash what's available
      expect(result).toHaveClarityType(ClarityType.ResponseOk);

      const dep = getUserDeposit(wallet1, 0);
      expect((dep.result as any).value.value["deposited"]).toBeUint(0);
    });

    it("should slash from hUSD (asset 3) before STX (asset 2) per priority", () => {
      // SLASH_PRIORITY: u0, u3, u2, u1, ...
      // Deposit only to asset 3 (hUSD) and asset 2 (STX)
      mintHusd(wallet1, 500_000_000);
      depositToken(wallet1, 3, 500_000_000); // $500 in hUSD (asset 3)
      depositStx(wallet1, 1_000_000_000); // $500 in STX (asset 2)

      lockCollateral(deployer, wallet1, 1, 200_000_000);
      slashCollateral(deployer, wallet1, 1, 200_000_000);

      // hUSD (asset 3) is before STX (asset 2) in SLASH_PRIORITY
      // So hUSD should be slashed first
      const dep3 = getUserDeposit(wallet1, 3);
      expect((dep3.result as any).value.value["deposited"]).toBeUint(300_000_000);

      // STX should be untouched
      const dep2 = getUserDeposit(wallet1, 2);
      expect((dep2.result as any).value.value["deposited"]).toBeUint(1_000_000_000);
    });
  });

  // ============================================
  // 7. ADMIN FUNCTIONS
  // ============================================
  describe("Admin Functions", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("should pause vault", () => {
      const { result } = simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      expect(result).toBeOk(Cl.bool(true));
      const paused = simnet.callReadOnlyFn(vaultV3, "is-paused", [], deployer);
      expect(paused.result).toBeBool(true);
    });

    it("should unpause vault", () => {
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      const { result } = simnet.callPublicFn(vaultV3, "unpause-vault", [], deployer);
      expect(result).toBeOk(Cl.bool(true));
      const paused = simnet.callReadOnlyFn(vaultV3, "is-paused", [], deployer);
      expect(paused.result).toBeBool(false);
    });

    it("should reject non-admin pause", () => {
      const { result } = simnet.callPublicFn(vaultV3, "pause-vault", [], wallet1);
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject non-admin unpause", () => {
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      const { result } = simnet.callPublicFn(vaultV3, "unpause-vault", [], wallet1);
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should set admin", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "set-admin",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
      const admin = simnet.callReadOnlyFn(vaultV3, "get-admin", [], deployer);
      expect(admin.result).toBePrincipal(wallet1);
    });

    it("should reject non-admin set-admin", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "set-admin",
        [Cl.principal(wallet2)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should allow new admin to perform admin actions", () => {
      simnet.callPublicFn(vaultV3, "set-admin", [Cl.principal(wallet1)], deployer);
      const { result } = simnet.callPublicFn(vaultV3, "pause-vault", [], wallet1);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should prevent old admin from performing admin actions after transfer", () => {
      simnet.callPublicFn(vaultV3, "set-admin", [Cl.principal(wallet1)], deployer);
      const { result } = simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should authorize a contract", () => {
      const { result } = authorizeContract(wallet3);
      expect(result).toBeOk(Cl.bool(true));
      const isAuth = simnet.callReadOnlyFn(
        vaultV3,
        "is-authorized",
        [Cl.principal(wallet3)],
        deployer,
      );
      expect(isAuth.result).toBeBool(true);
    });

    it("should reject non-admin authorize-contract", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "authorize-contract",
        [Cl.principal(wallet3)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject duplicate authorize-contract", () => {
      authorizeContract(wallet3);
      const { result } = authorizeContract(wallet3);
      expect(result).toBeErr(Cl.uint(ERR_ALREADY_AUTHORIZED));
    });

    it("should deactivate an asset", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "deactivate-asset",
        [Cl.uint(0)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
      const config = getAssetConfig(0);
      expect((config.result as any).value.value["is-active"]).toBeBool(false);
    });

    it("should reactivate an asset", () => {
      simnet.callPublicFn(vaultV3, "deactivate-asset", [Cl.uint(0)], deployer);
      const { result } = simnet.callPublicFn(
        vaultV3,
        "reactivate-asset",
        [Cl.uint(0)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
      const config = getAssetConfig(0);
      expect((config.result as any).value.value["is-active"]).toBeBool(true);
    });

    it("should reject non-admin deactivate", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "deactivate-asset",
        [Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject non-admin reactivate", () => {
      simnet.callPublicFn(vaultV3, "deactivate-asset", [Cl.uint(0)], deployer);
      const { result } = simnet.callPublicFn(
        vaultV3,
        "reactivate-asset",
        [Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject deactivate on unconfigured asset", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "deactivate-asset",
        [Cl.uint(9)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_ASSET_NOT_CONFIGURED));
    });

    it("should reject reactivate on unconfigured asset", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "reactivate-asset",
        [Cl.uint(9)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_ASSET_NOT_CONFIGURED));
    });
  });

  // ============================================
  // 8. SET ASSET PRICE
  // ============================================
  describe("Set Asset Price", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("should update asset price", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "set-asset-price",
        [Cl.uint(0), Cl.uint(2_000_000)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
      const config = getAssetConfig(0);
      expect((config.result as any).value.value["price-usd"]).toBeUint(2_000_000);
    });

    it("should reject non-admin set-asset-price", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "set-asset-price",
        [Cl.uint(0), Cl.uint(2_000_000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject zero price", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "set-asset-price",
        [Cl.uint(0), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_ZERO_PRICE));
    });

    it("should reject set-asset-price for unconfigured asset", () => {
      const { result } = simnet.callPublicFn(
        vaultV3,
        "set-asset-price",
        [Cl.uint(9), Cl.uint(1_000_000)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(ERR_ASSET_NOT_CONFIGURED));
    });

    it("should affect capacity calculation after price change", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $1000 * 90% = $900

      // Double the price to $2
      simnet.callPublicFn(
        vaultV3,
        "set-asset-price",
        [Cl.uint(0), Cl.uint(2_000_000)],
        deployer,
      );

      const cap = getTotalCapacity(wallet1);
      // $2000 * 90% = $1800
      expect(cap.result).toBeOk(Cl.uint(1_800_000_000));
    });
  });

  // ============================================
  // 9. READ-ONLY FUNCTIONS
  // ============================================
  describe("Read-only Functions", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("get-asset-config returns correct LTV for asset 0", () => {
      const config = getAssetConfig(0);
      const data = (config.result as any).value.value;
      expect(data["ltv-ratio"]).toBeUint(9000);
    });

    it("get-asset-config returns correct price for asset 1", () => {
      const config = getAssetConfig(1);
      const data = (config.result as any).value.value;
      expect(data["price-usd"]).toBeUint(60_000_000_000);
    });

    it("get-asset-config returns correct decimals for asset 1", () => {
      const config = getAssetConfig(1);
      const data = (config.result as any).value.value;
      expect(data["decimals"]).toBeUint(8);
    });

    it("get-asset-config returns none for unconfigured asset", () => {
      const config = getAssetConfig(9);
      expect(config.result).toHaveClarityType(ClarityType.OptionalNone);
    });

    it("get-user-deposit returns none for user with no deposit", () => {
      const dep = getUserDeposit(wallet1, 0);
      expect(dep.result).toHaveClarityType(ClarityType.OptionalNone);
    });

    it("get-user-deposit returns correct data after deposit", () => {
      mintHusd(wallet1, 500_000_000);
      depositToken(wallet1, 0, 500_000_000);
      const dep = getUserDeposit(wallet1, 0);
      expect(dep.result).toHaveClarityType(ClarityType.OptionalSome);
      expect((dep.result as any).value.value["deposited"]).toBeUint(500_000_000);
    });

    it("get-vault-summary returns all asset deposits", () => {
      mintHusd(wallet1, 2_000_000_000);
      mintSbtc(wallet1, 50_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      depositToken(wallet1, 1, 50_000_000, mockSbtc);
      depositStx(wallet1, 200_000_000);
      depositToken(wallet1, 3, 500_000_000);

      const summary = getVaultSummary(wallet1);
      const data = (summary.result as any).value;
      expect(data["usdcx-deposited"]).toBeUint(1_000_000_000);
      expect(data["sbtc-deposited"]).toBeUint(50_000_000);
      expect(data["stx-deposited"]).toBeUint(200_000_000);
      expect(data["husd-deposited"]).toBeUint(500_000_000);
    });

    it("get-vault-summary returns correct total-capacity", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $900
      depositStx(wallet1, 100_000_000); // $20
      const summary = getVaultSummary(wallet1);
      expect((summary.result as any).value["total-capacity-usd"]).toBeUint(920_000_000);
    });

    it("get-vault-summary shows committed and available capacity", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      authorizeContract(deployer);
      lockCollateral(deployer, wallet1, 1, 300_000_000);

      const summary = getVaultSummary(wallet1);
      const data = (summary.result as any).value;
      expect(data["total-committed-usd"]).toBeUint(300_000_000);
      expect(data["available-capacity-usd"]).toBeUint(600_000_000);
    });

    it("is-paused returns false by default", () => {
      const paused = simnet.callReadOnlyFn(vaultV3, "is-paused", [], deployer);
      expect(paused.result).toBeBool(false);
    });

    it("get-asset-count returns correct count", () => {
      const count = simnet.callReadOnlyFn(vaultV3, "get-asset-count", [], deployer);
      expect(count.result).toBeUint(4);
    });

    it("get-pending-yield returns 0 for no deposit", () => {
      const pending = getPendingYield(wallet1, 0);
      expect(pending.result).toBeUint(0);
    });

    it("get-pending-yield returns 0 when no yield funded", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      const pending = getPendingYield(wallet1, 0);
      expect(pending.result).toBeUint(0);
    });

    it("get-admin returns deployer by default", () => {
      const admin = simnet.callReadOnlyFn(vaultV3, "get-admin", [], deployer);
      expect(admin.result).toBePrincipal(deployer);
    });

    it("is-authorized returns false for non-authorized principal", () => {
      const auth = simnet.callReadOnlyFn(
        vaultV3,
        "is-authorized",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(auth.result).toBeBool(false);
    });

    it("is-authorized returns true for admin", () => {
      const auth = simnet.callReadOnlyFn(
        vaultV3,
        "is-authorized",
        [Cl.principal(deployer)],
        deployer,
      );
      expect(auth.result).toBeBool(true);
    });

    it("can-commit returns true when capacity is sufficient", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $900 capacity
      const canCommit = simnet.callReadOnlyFn(
        vaultV3,
        "can-commit",
        [Cl.principal(wallet1), Cl.uint(500_000_000)],
        deployer,
      );
      expect(canCommit.result).toBeOk(Cl.bool(true));
    });

    it("can-commit returns false when capacity is insufficient", () => {
      mintHusd(wallet1, 100_000_000);
      depositToken(wallet1, 0, 100_000_000); // $90 capacity
      const canCommit = simnet.callReadOnlyFn(
        vaultV3,
        "can-commit",
        [Cl.principal(wallet1), Cl.uint(500_000_000)],
        deployer,
      );
      expect(canCommit.result).toBeOk(Cl.bool(false));
    });

    it("calculate-commitment-usd returns correct value", () => {
      const result = simnet.callReadOnlyFn(
        vaultV3,
        "calculate-commitment-usd",
        [Cl.uint(100_000_000), Cl.uint(5), Cl.uint(0)],
        deployer,
      );
      // 100_000_000 * 5 * 1_000_000 / 10^6 = 500_000_000
      expect(result.result).toBeOk(Cl.uint(500_000_000));
    });

    it("get-circle-commitment returns none when no commitment", () => {
      const result = simnet.callReadOnlyFn(
        vaultV3,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result.result).toHaveClarityType(ClarityType.OptionalNone);
    });

    it("get-circle-commitment returns data after lock", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000);
      authorizeContract(deployer);
      lockCollateral(deployer, wallet1, 1, 300_000_000);

      const result = simnet.callReadOnlyFn(
        vaultV3,
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result.result).toHaveClarityType(ClarityType.OptionalSome);
      expect((result.result as any).value.value["commitment-usd"]).toBeUint(300_000_000);
    });
  });

  // ============================================
  // 10. EDGE CASES & INTEGRATION
  // ============================================
  describe("Edge Cases & Integration", () => {
    beforeEach(() => {
      setupAssets();
    });

    it("should allow deposit after reactivating a deactivated asset", () => {
      simnet.callPublicFn(vaultV3, "deactivate-asset", [Cl.uint(0)], deployer);
      simnet.callPublicFn(vaultV3, "reactivate-asset", [Cl.uint(0)], deployer);
      mintHusd(wallet1, 1_000_000_000);
      const { result } = depositToken(wallet1, 0, 500_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should still allow withdrawal when asset is inactive", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 500_000_000);
      simnet.callPublicFn(vaultV3, "deactivate-asset", [Cl.uint(0)], deployer);
      // Withdrawal should still work (user can exit)
      const { result } = withdrawToken(wallet1, 0, 500_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should not contribute capacity from inactive assets", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $900 capacity
      depositStx(wallet1, 100_000_000); // $20 capacity

      const capBefore = getTotalCapacity(wallet1);
      expect(capBefore.result).toBeOk(Cl.uint(920_000_000));

      simnet.callPublicFn(vaultV3, "deactivate-asset", [Cl.uint(0)], deployer);

      const capAfter = getTotalCapacity(wallet1);
      // Only STX capacity remains
      expect(capAfter.result).toBeOk(Cl.uint(20_000_000));
    });

    it("should handle deposit and withdrawal across multiple asset types", () => {
      mintHusd(wallet1, 2_000_000_000);
      mintSbtc(wallet1, 100_000_000);

      depositToken(wallet1, 0, 1_000_000_000);
      depositToken(wallet1, 1, 50_000_000, mockSbtc);
      depositStx(wallet1, 200_000_000);
      depositToken(wallet1, 3, 500_000_000);

      withdrawToken(wallet1, 0, 300_000_000);
      withdrawStx(wallet1, 100_000_000);

      const summary = getVaultSummary(wallet1);
      const data = (summary.result as any).value;
      expect(data["usdcx-deposited"]).toBeUint(700_000_000);
      expect(data["sbtc-deposited"]).toBeUint(50_000_000);
      expect(data["stx-deposited"]).toBeUint(100_000_000);
      expect(data["husd-deposited"]).toBeUint(500_000_000);
    });

    it("should allow operations after unpause", () => {
      simnet.callPublicFn(vaultV3, "pause-vault", [], deployer);
      simnet.callPublicFn(vaultV3, "unpause-vault", [], deployer);

      mintHusd(wallet1, 1_000_000_000);
      const { result } = depositToken(wallet1, 0, 500_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should handle deposit from same token to different asset types (0 and 3)", () => {
      mintHusd(wallet1, 2_000_000_000);
      depositToken(wallet1, 0, 800_000_000);
      depositToken(wallet1, 3, 600_000_000);

      const dep0 = getUserDeposit(wallet1, 0);
      expect((dep0.result as any).value.value["deposited"]).toBeUint(800_000_000);
      const dep3 = getUserDeposit(wallet1, 3);
      expect((dep3.result as any).value.value["deposited"]).toBeUint(600_000_000);
    });

    it("should correctly compute capacity with different LTVs and prices", () => {
      // Asset 0: 1000 tokens at $1, 90% = $900
      // Asset 1: 0.5 BTC at $60k, 60% = $18000
      // Asset 2: 100 STX at $0.50, 40% = $20
      // Asset 3: 500 tokens at $1, 80% = $400
      // Total = $19320
      mintHusd(wallet1, 2_000_000_000);
      mintSbtc(wallet1, 100_000_000);

      depositToken(wallet1, 0, 1_000_000_000);
      depositToken(wallet1, 1, 50_000_000, mockSbtc);
      depositStx(wallet1, 100_000_000);
      depositToken(wallet1, 3, 500_000_000);

      const cap = getTotalCapacity(wallet1);
      expect(cap.result).toBeOk(Cl.uint(19_320_000_000));
    });

    it("should allow withdrawal when capacity still covers commitments from other assets", () => {
      mintHusd(wallet1, 1_000_000_000);
      depositToken(wallet1, 0, 1_000_000_000); // $900
      depositStx(wallet1, 1_000_000_000); // $200

      authorizeContract(deployer);
      lockCollateral(deployer, wallet1, 1, 200_000_000);

      // Withdraw all STX, hUSD capacity ($900) still covers $200 commitment
      const { result } = withdrawStx(wallet1, 1_000_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("get-vault-summary returns zeros for user with no deposits", () => {
      const summary = getVaultSummary(wallet3);
      const data = (summary.result as any).value;
      expect(data["usdcx-deposited"]).toBeUint(0);
      expect(data["sbtc-deposited"]).toBeUint(0);
      expect(data["stx-deposited"]).toBeUint(0);
      expect(data["husd-deposited"]).toBeUint(0);
      expect(data["total-committed-usd"]).toBeUint(0);
      expect(data["total-capacity-usd"]).toBeUint(0);
      expect(data["available-capacity-usd"]).toBeUint(0);
    });
  });
});
