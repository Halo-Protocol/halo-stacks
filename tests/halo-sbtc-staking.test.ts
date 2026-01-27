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

const stakingContract = "halo-sbtc-staking";
const mockSbtc = "halo-mock-sbtc";

// Helper: setup staking token
function setupStakingToken() {
  simnet.callPublicFn(
    stakingContract,
    "set-staking-token",
    [Cl.principal(`${deployer}.${mockSbtc}`)],
    deployer,
  );
}

// Helper: bind identity for a wallet
function bindIdentity(id: number, wallet: string) {
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(id)], wallet);
}

// Helper: mint mock-sBTC to wallet
function mintSbtc(recipient: string, amount: number) {
  simnet.callPublicFn(
    mockSbtc,
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer,
  );
}

// Helper: authorize staking contract in credit
function authorizeCreditStaking() {
  simnet.callPublicFn(
    "halo-credit",
    "authorize-contract",
    [Cl.principal(`${deployer}.${stakingContract}`)],
    deployer,
  );
}

// Helper: full setup
function fullSetup(wallet: string, id: number, sbtcAmount: number) {
  setupStakingToken();
  bindIdentity(id, wallet);
  authorizeCreditStaking();
  mintSbtc(wallet, sbtcAmount);
}

// Helper: stake sBTC
function stakeSbtc(wallet: string, amount: number) {
  return simnet.callPublicFn(
    stakingContract,
    "stake-sbtc",
    [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(amount)],
    wallet,
  );
}

describe("halo-sbtc-staking", () => {
  describe("admin setup", () => {
    it("deployer can set staking token", () => {
      const { result } = simnet.callPublicFn(
        stakingContract,
        "set-staking-token",
        [Cl.principal(`${deployer}.${mockSbtc}`)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("non-admin cannot set staking token", () => {
      const { result } = simnet.callPublicFn(
        stakingContract,
        "set-staking-token",
        [Cl.principal(`${deployer}.${mockSbtc}`)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(600)); // ERR_NOT_AUTHORIZED
    });

    it("deployer can set min lock blocks", () => {
      const { result } = simnet.callPublicFn(
        stakingContract,
        "set-min-lock-blocks",
        [Cl.uint(1000)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("deployer can transfer admin", () => {
      simnet.callPublicFn(
        stakingContract,
        "set-admin",
        [Cl.principal(wallet1)],
        deployer,
      );
      // New admin can set staking token
      const { result } = simnet.callPublicFn(
        stakingContract,
        "set-staking-token",
        [Cl.principal(`${deployer}.${mockSbtc}`)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe("stake-sbtc", () => {
    it("verified user can stake sBTC", () => {
      fullSetup(wallet1, 1, 1_00000000); // 1 sBTC
      const { result } = stakeSbtc(wallet1, 50000000); // 0.5 sBTC
      expect(result).toBeOk(Cl.bool(true));
    });

    it("staking updates user data", () => {
      fullSetup(wallet1, 1, 1_00000000);
      stakeSbtc(wallet1, 50000000);

      const { result } = simnet.callReadOnlyFn(
        stakingContract,
        "get-staker-data",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (result as any).value.value;
      expect(data.staked).toBeUint(50000000);
    });

    it("staking updates total staked", () => {
      fullSetup(wallet1, 1, 1_00000000);
      stakeSbtc(wallet1, 50000000);

      const { result } = simnet.callReadOnlyFn(
        stakingContract,
        "get-total-staked",
        [],
        deployer,
      );
      expect(result).toBeUint(50000000);
    });

    it("multiple stakes accumulate", () => {
      fullSetup(wallet1, 1, 2_00000000);
      stakeSbtc(wallet1, 50000000);
      stakeSbtc(wallet1, 30000000);

      const { result } = simnet.callReadOnlyFn(
        stakingContract,
        "get-staker-data",
        [Cl.principal(wallet1)],
        deployer,
      );
      const data = (result as any).value.value;
      expect(data.staked).toBeUint(80000000);
    });

    it("cannot stake without identity", () => {
      setupStakingToken();
      mintSbtc(wallet1, 1_00000000);
      // No identity bound
      const { result } = stakeSbtc(wallet1, 50000000);
      expect(result).toBeErr(Cl.uint(608)); // ERR_NOT_VERIFIED
    });

    it("cannot stake zero", () => {
      fullSetup(wallet1, 1, 1_00000000);
      const { result } = stakeSbtc(wallet1, 0);
      expect(result).toBeErr(Cl.uint(601)); // ERR_INVALID_AMOUNT
    });

    it("cannot stake wrong token", () => {
      fullSetup(wallet1, 1, 1_00000000);
      // Try staking mock-token instead of mock-sbtc
      simnet.callPublicFn(
        "halo-mock-token",
        "mint",
        [Cl.uint(1000_000000), Cl.principal(wallet1)],
        deployer,
      );
      const { result } = simnet.callPublicFn(
        stakingContract,
        "stake-sbtc",
        [Cl.contractPrincipal(deployer, "halo-mock-token"), Cl.uint(1000_000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(605)); // ERR_TOKEN_MISMATCH
    });
  });

  describe("unstake-sbtc", () => {
    it("can unstake after lock period", () => {
      fullSetup(wallet1, 1, 1_00000000);
      stakeSbtc(wallet1, 50000000);

      // Set min lock to 10 blocks for testing
      simnet.callPublicFn(
        stakingContract,
        "set-min-lock-blocks",
        [Cl.uint(10)],
        deployer,
      );

      // Mine enough blocks to pass lock
      simnet.mineEmptyBlocks(15);

      const { result } = simnet.callPublicFn(
        stakingContract,
        "unstake-sbtc",
        [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(30000000)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("unstake updates balances", () => {
      fullSetup(wallet1, 1, 1_00000000);
      stakeSbtc(wallet1, 50000000);

      simnet.callPublicFn(
        stakingContract,
        "set-min-lock-blocks",
        [Cl.uint(10)],
        deployer,
      );
      simnet.mineEmptyBlocks(15);

      simnet.callPublicFn(
        stakingContract,
        "unstake-sbtc",
        [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(20000000)],
        wallet1,
      );

      const { result } = simnet.callReadOnlyFn(
        stakingContract,
        "get-staker-data",
        [Cl.principal(wallet1)],
        deployer,
      );
      const data = (result as any).value.value;
      expect(data.staked).toBeUint(30000000); // 50M - 20M
    });

    it("cannot unstake before lock expires", () => {
      fullSetup(wallet1, 1, 1_00000000);
      stakeSbtc(wallet1, 50000000);
      // Default lock is 4320 blocks, don't mine enough

      const { result } = simnet.callPublicFn(
        stakingContract,
        "unstake-sbtc",
        [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(30000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(603)); // ERR_LOCK_NOT_EXPIRED
    });

    it("cannot unstake more than staked", () => {
      fullSetup(wallet1, 1, 1_00000000);
      stakeSbtc(wallet1, 50000000);

      simnet.callPublicFn(
        stakingContract,
        "set-min-lock-blocks",
        [Cl.uint(1)],
        deployer,
      );
      simnet.mineEmptyBlocks(5);

      const { result } = simnet.callPublicFn(
        stakingContract,
        "unstake-sbtc",
        [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(60000000)], // more than staked
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(604)); // ERR_INSUFFICIENT_STAKE
    });

    it("cannot unstake without stake", () => {
      setupStakingToken();
      const { result } = simnet.callPublicFn(
        stakingContract,
        "unstake-sbtc",
        [Cl.contractPrincipal(deployer, mockSbtc), Cl.uint(10000000)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(602)); // ERR_NO_STAKE
    });
  });

  describe("staking rewards", () => {
    it("admin can fund reward pool", () => {
      setupStakingToken();
      mintSbtc(deployer, 10_00000000); // 10 sBTC for rewards

      const { result } = simnet.callPublicFn(
        stakingContract,
        "fund-reward-pool",
        [
          Cl.contractPrincipal(deployer, mockSbtc),
          Cl.uint(1_00000000), // 1 sBTC reward
          Cl.uint(100), // over 100 blocks
        ],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("pending rewards accrue over time", () => {
      fullSetup(wallet1, 1, 2_00000000);
      mintSbtc(deployer, 10_00000000);

      // Stake first
      stakeSbtc(wallet1, 1_00000000);

      // Fund rewards
      simnet.callPublicFn(
        stakingContract,
        "fund-reward-pool",
        [
          Cl.contractPrincipal(deployer, mockSbtc),
          Cl.uint(1_00000000),
          Cl.uint(1000),
        ],
        deployer,
      );

      simnet.mineEmptyBlocks(10);

      const pending = simnet.callReadOnlyFn(
        stakingContract,
        "get-pending-rewards",
        [Cl.principal(wallet1)],
        deployer,
      );
      const amount = Number((pending.result as any).value);
      expect(amount).toBeGreaterThan(0);
    });

    it("user can claim rewards", () => {
      fullSetup(wallet1, 1, 2_00000000);
      mintSbtc(deployer, 10_00000000);

      stakeSbtc(wallet1, 1_00000000);

      simnet.callPublicFn(
        stakingContract,
        "fund-reward-pool",
        [
          Cl.contractPrincipal(deployer, mockSbtc),
          Cl.uint(1_00000000),
          Cl.uint(1000),
        ],
        deployer,
      );

      simnet.mineEmptyBlocks(10);

      const { result } = simnet.callPublicFn(
        stakingContract,
        "claim-rewards",
        [Cl.contractPrincipal(deployer, mockSbtc)],
        wallet1,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("claim fails with no rewards", () => {
      fullSetup(wallet1, 1, 1_00000000);
      stakeSbtc(wallet1, 50000000);
      // No reward pool funded

      const { result } = simnet.callPublicFn(
        stakingContract,
        "claim-rewards",
        [Cl.contractPrincipal(deployer, mockSbtc)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(609)); // ERR_NO_REWARDS
    });

    it("non-admin cannot fund reward pool", () => {
      setupStakingToken();
      mintSbtc(wallet1, 1_00000000);

      const { result } = simnet.callPublicFn(
        stakingContract,
        "fund-reward-pool",
        [
          Cl.contractPrincipal(deployer, mockSbtc),
          Cl.uint(50000000),
          Cl.uint(100),
        ],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(600)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("read-only queries", () => {
    it("get-staking-config returns defaults", () => {
      const config = simnet.callReadOnlyFn(
        stakingContract,
        "get-staking-config",
        [],
        deployer,
      );
      const data = (config.result as any).value;
      expect(data["min-lock-blocks"]).toBeUint(4320);
      expect(data["total-staked"]).toBeUint(0);
      expect(data["reward-rate"]).toBeUint(0);
    });

    it("is-lock-expired returns true for non-existent stake", () => {
      const { result } = simnet.callReadOnlyFn(
        stakingContract,
        "is-lock-expired",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("staking duration is tracked", () => {
      fullSetup(wallet1, 1, 1_00000000);
      stakeSbtc(wallet1, 50000000);

      simnet.mineEmptyBlocks(100);

      const { result } = simnet.callReadOnlyFn(
        stakingContract,
        "get-staking-duration",
        [Cl.principal(wallet1)],
        deployer,
      );
      // Should be approximately 100 blocks
      const duration = Number((result as any).value);
      expect(duration).toBeGreaterThanOrEqual(99);
    });

    it("get-admin returns deployer", () => {
      const { result } = simnet.callReadOnlyFn(
        stakingContract,
        "get-admin",
        [],
        deployer,
      );
      expect(result).toBePrincipal(deployer);
    });
  });
});
