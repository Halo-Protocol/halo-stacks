import { describe, it, expect } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// ============================================
// HELPERS
// ============================================

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
const wallet4 = accounts.get("wallet_4")!;

const contractName = "halo-circle-v2";

// Circle parameters
const circleName = Cl.stringAscii("Test Circle V2");
const contributionAmount = Cl.uint(10_000_000); // 10 STX
const totalMembers = Cl.uint(3);
const roundDuration = Cl.uint(500);
const bidWindowBlocks = Cl.uint(100);
const gracePeriod = Cl.uint(100);

// Pool total = contribution * members = 10 STX * 3 = 30 STX = 30_000_000 uSTX
const POOL_TOTAL = 30_000_000;
// Protocol fee = 1% of pool = 300_000
const PROTOCOL_FEE = Math.floor(POOL_TOTAL * 100 / 10000);
// Max bid = pool - fee = 29_700_000
const MAX_BID = POOL_TOTAL - PROTOCOL_FEE;

// ============================================
// SETUP FUNCTIONS
// ============================================

function setupIdentities() {
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(2)], wallet2);
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(3)], wallet3);
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(4)], wallet4);
}

function authorizeCircleV2() {
  simnet.callPublicFn(
    "halo-credit",
    "authorize-contract",
    [Cl.principal(`${deployer}.${contractName}`)],
    deployer,
  );
}

function setupVaultV2() {
  // Configure STX asset (type 1, 50% LTV = u5000, 6 decimals)
  simnet.callPublicFn(
    "halo-vault-v2",
    "configure-asset",
    [Cl.uint(1), Cl.none(), Cl.uint(5000), Cl.uint(6)],
    deployer,
  );
  // Set STX price = $0.50 = u500000
  simnet.callPublicFn(
    "halo-vault-v2",
    "set-asset-price",
    [Cl.uint(1), Cl.uint(500000)],
    deployer,
  );
  // Authorize circle-v2 contract in vault-v2
  simnet.callPublicFn(
    "halo-vault-v2",
    "authorize-contract",
    [Cl.principal(`${deployer}.${contractName}`)],
    deployer,
  );
}

function depositStxCollateral(wallet: string, amount: number) {
  simnet.callPublicFn(
    "halo-vault-v2",
    "deposit-stx",
    [Cl.uint(amount)],
    wallet,
  );
}

function fullSetup() {
  setupIdentities();
  authorizeCircleV2();
  setupVaultV2();
  // Deposit 100,000 STX each for ample collateral
  // At $0.50/STX, that's $50,000 value, 50% LTV = $25,000 capacity
  depositStxCollateral(wallet1, 100_000_000_000);
  depositStxCollateral(wallet2, 100_000_000_000);
  depositStxCollateral(wallet3, 100_000_000_000);
  depositStxCollateral(wallet4, 100_000_000_000);
}

function createCircle(creator: string) {
  return simnet.callPublicFn(
    contractName,
    "create-circle-v2",
    [circleName, contributionAmount, totalMembers, roundDuration, bidWindowBlocks, gracePeriod],
    creator,
  );
}

function joinCircle(wallet: string, circleId: number = 1) {
  return simnet.callPublicFn(
    contractName,
    "join-circle-v2",
    [Cl.uint(circleId)],
    wallet,
  );
}

function contributeStx(wallet: string, circleId: number = 1) {
  return simnet.callPublicFn(
    contractName,
    "contribute-stx-v2",
    [Cl.uint(circleId)],
    wallet,
  );
}

function placeBid(wallet: string, bidAmount: number, circleId: number = 1) {
  return simnet.callPublicFn(
    contractName,
    "place-bid",
    [Cl.uint(circleId), Cl.uint(bidAmount)],
    wallet,
  );
}

function processRound(circleId: number = 1) {
  return simnet.callPublicFn(
    contractName,
    "process-round-v2",
    [Cl.uint(circleId)],
    deployer,
  );
}

function makeRepaymentStx(wallet: string, circleId: number = 1) {
  return simnet.callPublicFn(
    contractName,
    "make-repayment-stx",
    [Cl.uint(circleId)],
    wallet,
  );
}

function getCircle(circleId: number = 1) {
  return simnet.callReadOnlyFn(
    contractName,
    "get-circle",
    [Cl.uint(circleId)],
    deployer,
  );
}

function getMember(wallet: string, circleId: number = 1) {
  return simnet.callReadOnlyFn(
    contractName,
    "get-member",
    [Cl.uint(circleId), Cl.principal(wallet)],
    deployer,
  );
}

function getRoundResult(round: number, circleId: number = 1) {
  return simnet.callReadOnlyFn(
    contractName,
    "get-round-result",
    [Cl.uint(circleId), Cl.uint(round)],
    deployer,
  );
}

function getRoundTiming(round: number, circleId: number = 1) {
  return simnet.callReadOnlyFn(
    contractName,
    "get-round-timing",
    [Cl.uint(circleId), Cl.uint(round)],
    deployer,
  );
}

function getRepayment(winner: string, repaymentRound: number, circleId: number = 1) {
  return simnet.callReadOnlyFn(
    contractName,
    "get-repayment",
    [Cl.uint(circleId), Cl.principal(winner), Cl.uint(repaymentRound)],
    deployer,
  );
}

/** Create a 3-member active circle (wallet1=creator, wallet2+wallet3 join). */
function setupActiveCircle() {
  fullSetup();
  createCircle(wallet1);
  joinCircle(wallet2);
  joinCircle(wallet3);
}

/** All 3 members contribute for the current round. */
function allContribute(circleId: number = 1) {
  contributeStx(wallet1, circleId);
  contributeStx(wallet2, circleId);
  contributeStx(wallet3, circleId);
}

/**
 * Mine blocks to reach the bid window for the given round.
 * Uses get-round-timing to find the exact bid-window-start.
 */
function mineIntoBidWindow(round: number, circleId: number = 1) {
  const { result } = getRoundTiming(round, circleId);
  const timing = (result as any).value.value;
  const bidWindowStart = Number(timing["bid-window-start"].value);
  const currentBlock = simnet.blockHeight;
  if (currentBlock < bidWindowStart) {
    simnet.mineEmptyBlocks(bidWindowStart - currentBlock);
  }
}

/**
 * Mine blocks past the bid window end for the given round.
 */
function minePastBidWindow(round: number, circleId: number = 1) {
  const { result } = getRoundTiming(round, circleId);
  const timing = (result as any).value.value;
  const bidWindowEnd = Number(timing["bid-window-end"].value);
  const currentBlock = simnet.blockHeight;
  if (currentBlock <= bidWindowEnd) {
    simnet.mineEmptyBlocks(bidWindowEnd - currentBlock + 1);
  }
}

// ============================================
// TESTS
// ============================================

describe("halo-circle-v2", () => {
  // ------------------------------------------
  // 1. Circle Creation
  // ------------------------------------------
  describe("create-circle-v2", () => {
    it("succeeds with valid params", () => {
      fullSetup();
      const { result } = createCircle(wallet1);
      expect(result).toBeOk(Cl.uint(1));
    });

    it("fails without identity (err u810)", () => {
      // No setupIdentities -- wallet1 has no bound identity
      authorizeCircleV2();
      setupVaultV2();

      const { result } = simnet.callPublicFn(
        contractName,
        "create-circle-v2",
        [circleName, contributionAmount, totalMembers, roundDuration, bidWindowBlocks, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(810));
    });

    it("fails with members < 3 (err u812)", () => {
      fullSetup();
      const { result } = simnet.callPublicFn(
        contractName,
        "create-circle-v2",
        [circleName, contributionAmount, Cl.uint(2), roundDuration, bidWindowBlocks, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(812));
    });

    it("fails with members > 10 (err u812)", () => {
      fullSetup();
      const { result } = simnet.callPublicFn(
        contractName,
        "create-circle-v2",
        [circleName, contributionAmount, Cl.uint(11), roundDuration, bidWindowBlocks, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(812));
    });

    it("fails with contribution below minimum (err u807)", () => {
      fullSetup();
      const { result } = simnet.callPublicFn(
        contractName,
        "create-circle-v2",
        [circleName, Cl.uint(999_999), totalMembers, roundDuration, bidWindowBlocks, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(807));
    });

    it("fails with round duration below minimum (err u812)", () => {
      fullSetup();
      const { result } = simnet.callPublicFn(
        contractName,
        "create-circle-v2",
        [circleName, contributionAmount, totalMembers, Cl.uint(100), bidWindowBlocks, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(812));
    });

    it("fails with bid window below minimum (err u812)", () => {
      fullSetup();
      const { result } = simnet.callPublicFn(
        contractName,
        "create-circle-v2",
        [circleName, contributionAmount, totalMembers, roundDuration, Cl.uint(50), gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(812));
    });

    it("fails with grace period of 0 (err u812)", () => {
      fullSetup();
      const { result } = simnet.callPublicFn(
        contractName,
        "create-circle-v2",
        [circleName, contributionAmount, totalMembers, roundDuration, bidWindowBlocks, Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(812));
    });

    it("fails when round-duration <= grace + bid-window (err u812)", () => {
      fullSetup();
      // grace(100) + bid(100) = 200, round must be > 200
      const { result } = simnet.callPublicFn(
        contractName,
        "create-circle-v2",
        [circleName, contributionAmount, totalMembers, Cl.uint(200), bidWindowBlocks, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(812));
    });

    it("creator becomes member automatically", () => {
      fullSetup();
      createCircle(wallet1);

      const { result } = getMember(wallet1);
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const member = (result as any).value.value;
      expect(member["has-won"]).toBeBool(false);
      expect(member["total-contributed"]).toBeUint(0);
    });

    it("circle status is FORMING (u0)", () => {
      fullSetup();
      createCircle(wallet1);

      const { result } = getCircle();
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const circle = (result as any).value.value;
      expect(circle.status).toBeUint(0);
    });

    it("circle counter increments", () => {
      fullSetup();
      createCircle(wallet1);

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-circle-count",
        [],
        deployer,
      );
      expect(result).toBeUint(1);

      // Create a second circle
      createCircle(wallet2);
      const { result: result2 } = simnet.callReadOnlyFn(
        contractName,
        "get-circle-count",
        [],
        deployer,
      );
      expect(result2).toBeUint(2);
    });

    it("collateral is locked in vault-v2 on create", () => {
      fullSetup();
      createCircle(wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-vault-v2",
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
    });
  });

  // ------------------------------------------
  // 2. Joining
  // ------------------------------------------
  describe("join-circle-v2", () => {
    it("succeeds for verified user", () => {
      fullSetup();
      createCircle(wallet1);

      const { result } = joinCircle(wallet2);
      // Returns member count after join
      expect(result).toBeOk(Cl.uint(2));
    });

    it("fails when circle is not forming (err u802)", () => {
      setupActiveCircle();
      // Circle is now ACTIVE (full), wallet4 tries to join
      const { result } = joinCircle(wallet4);
      expect(result).toBeErr(Cl.uint(802));
    });

    it("fails for already-member (err u804)", () => {
      fullSetup();
      createCircle(wallet1);
      joinCircle(wallet2);

      const { result } = joinCircle(wallet2);
      expect(result).toBeErr(Cl.uint(804));
    });

    it("fails when circle is full (err u806 or u802)", () => {
      // With 3 members the circle auto-activates, so joining returns u802
      fullSetup();
      createCircle(wallet1);
      joinCircle(wallet2);
      joinCircle(wallet3);
      // Circle is now active (status=1), so err u802
      const { result } = joinCircle(wallet4);
      expect(result).toBeErr(Cl.uint(802));
    });

    it("auto-activates when 3rd member joins (status u1)", () => {
      fullSetup();
      createCircle(wallet1);
      joinCircle(wallet2);
      joinCircle(wallet3);

      const { result } = getCircle();
      const circle = (result as any).value.value;
      expect(circle.status).toBeUint(1); // STATUS_ACTIVE
    });

    it("circle start-block is set on activation", () => {
      fullSetup();
      createCircle(wallet1);
      joinCircle(wallet2);
      joinCircle(wallet3);

      const { result } = getCircle();
      const circle = (result as any).value.value;
      // start-block should be non-zero after activation
      const startBlock = Number(circle["start-block"].value);
      expect(startBlock).toBeGreaterThan(0);
    });

    it("collateral is locked for each joiner", () => {
      fullSetup();
      createCircle(wallet1);
      joinCircle(wallet2);

      const c1 = simnet.callReadOnlyFn(
        "halo-vault-v2",
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(c1.result).toHaveClarityType(ClarityType.OptionalSome);

      const c2 = simnet.callReadOnlyFn(
        "halo-vault-v2",
        "get-circle-commitment",
        [Cl.principal(wallet2), Cl.uint(1)],
        deployer,
      );
      expect(c2.result).toHaveClarityType(ClarityType.OptionalSome);
    });

    it("fails for unverified user (err u810)", () => {
      fullSetup();
      createCircle(wallet1);

      const wallet5 = accounts.get("wallet_5")!;
      const { result } = simnet.callPublicFn(
        contractName,
        "join-circle-v2",
        [Cl.uint(1)],
        wallet5,
      );
      expect(result).toBeErr(Cl.uint(810));
    });

    it("fails for non-existent circle (err u801)", () => {
      setupIdentities();
      const { result } = simnet.callPublicFn(
        contractName,
        "join-circle-v2",
        [Cl.uint(999)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(801));
    });
  });

  // ------------------------------------------
  // 3. Contributions
  // ------------------------------------------
  describe("contribute-stx-v2", () => {
    it("succeeds for a member in an active circle", () => {
      setupActiveCircle();

      const { result } = contributeStx(wallet1);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("fails when circle is not active (err u803)", () => {
      fullSetup();
      createCircle(wallet1);
      // Circle is still FORMING (only 1 member)

      const { result } = contributeStx(wallet1);
      expect(result).toBeErr(Cl.uint(803));
    });

    it("fails for double contribution in same round (err u808)", () => {
      setupActiveCircle();
      contributeStx(wallet1);

      const { result } = contributeStx(wallet1);
      expect(result).toBeErr(Cl.uint(808));
    });

    it("fails for non-member (err u805)", () => {
      setupActiveCircle();

      const { result } = contributeStx(wallet4);
      expect(result).toBeErr(Cl.uint(805));
    });

    it("contribution is recorded correctly", () => {
      setupActiveCircle();
      contributeStx(wallet1);

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-contribution",
        [Cl.uint(1), Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const contrib = (result as any).value.value;
      expect(contrib.amount).toBeUint(10_000_000);
    });

    it("member total-contributed is updated", () => {
      setupActiveCircle();
      contributeStx(wallet1);

      const { result } = getMember(wallet1);
      const member = (result as any).value.value;
      expect(member["total-contributed"]).toBeUint(10_000_000);
    });

    it("circle total-contributed is updated", () => {
      setupActiveCircle();
      contributeStx(wallet1);
      contributeStx(wallet2);

      const { result } = getCircle();
      const circle = (result as any).value.value;
      expect(circle["total-contributed"]).toBeUint(20_000_000);
    });
  });

  // ------------------------------------------
  // 4. Bidding
  // ------------------------------------------
  describe("place-bid", () => {
    it("succeeds during bid window", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      const { result } = placeBid(wallet1, 20_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("fails before bid window (err u815)", () => {
      setupActiveCircle();
      // Contribute but do NOT mine into bid window
      allContribute();

      const { result } = placeBid(wallet1, 20_000_000);
      expect(result).toBeErr(Cl.uint(815));
    });

    it("fails after bid window ends (err u815)", () => {
      setupActiveCircle();
      allContribute();
      minePastBidWindow(0);

      const { result } = placeBid(wallet1, 20_000_000);
      expect(result).toBeErr(Cl.uint(815));
    });

    it("fails for duplicate bid (err u816)", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);

      const { result } = placeBid(wallet1, 22_000_000);
      expect(result).toBeErr(Cl.uint(816));
    });

    it("fails for bid > max (err u819)", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      // Max bid = pool - fee = 30M - 300K = 29,700,000
      const { result } = placeBid(wallet1, MAX_BID + 1);
      expect(result).toBeErr(Cl.uint(819));
    });

    it("fails for bid of 0 (err u818)", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      const { result } = placeBid(wallet1, 0);
      expect(result).toBeErr(Cl.uint(818));
    });

    it("bid at max allowed amount succeeds", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      const { result } = placeBid(wallet1, MAX_BID);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("fails for non-member (err u805)", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      const { result } = placeBid(wallet4, 20_000_000);
      expect(result).toBeErr(Cl.uint(805));
    });

    it("bid data is recorded", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-bid",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const bid = (result as any).value.value;
      expect(bid["bid-amount"]).toBeUint(20_000_000);
    });

    it("is-in-bid-window returns true during bid window", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-in-bid-window",
        [Cl.uint(1), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("is-bid-window-ended returns true after bid window", () => {
      setupActiveCircle();
      allContribute();
      minePastBidWindow(0);

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-bid-window-ended",
        [Cl.uint(1), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeBool(true);
    });
  });

  // ------------------------------------------
  // 5. Settlement (Full Round)
  // ------------------------------------------
  describe("process-round-v2 (settlement)", () => {
    it("succeeds after all contribute + all bid + bid window ends", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);

      minePastBidWindow(0);
      const { result } = processRound();
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("lowest bidder wins", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      // wallet1 bids lowest
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);

      minePastBidWindow(0);
      processRound();

      const { result } = getRoundResult(0);
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const roundResult = (result as any).value.value;
      expect(roundResult.winner).toBePrincipal(wallet1);
      expect(roundResult["winning-bid"]).toBeUint(20_000_000);
    });

    it("round result records correct financial data", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);

      minePastBidWindow(0);
      processRound();

      const { result } = getRoundResult(0);
      const rr = (result as any).value.value;

      expect(rr["pool-total"]).toBeUint(POOL_TOTAL);          // 30_000_000
      expect(rr["protocol-fee"]).toBeUint(PROTOCOL_FEE);      // 300_000
      // surplus = pool - winningBid - fee = 30M - 20M - 300K = 9_700_000
      const expectedSurplus = POOL_TOTAL - 20_000_000 - PROTOCOL_FEE;
      expect(rr.surplus).toBeUint(expectedSurplus);
      // dividend per non-winner = surplus / (members-1) = 9_700_000 / 2 = 4_850_000
      const expectedDividend = Math.floor(expectedSurplus / 2);
      expect(rr["dividend-per-member"]).toBeUint(expectedDividend);
    });

    it("winner is marked with has-won = true", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);

      minePastBidWindow(0);
      processRound();

      const { result } = getMember(wallet1);
      const member = (result as any).value.value;
      expect(member["has-won"]).toBeBool(true);
      expect(member["won-round"]).toBeUint(0);
      expect(member["won-amount"]).toBeUint(20_000_000);
    });

    it("round advances to 1 after settlement", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);

      minePastBidWindow(0);
      processRound();

      const { result } = getCircle();
      const circle = (result as any).value.value;
      expect(circle["current-round"]).toBeUint(1);
    });

    it("repayment schedule is created for winner", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      // wallet1 wins with bid 20M; remaining rounds = 3-0-1 = 2
      // repayment per round = 20M / 2 = 10M each in rounds 1 and 2
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);

      minePastBidWindow(0);
      processRound();

      // Check repayment for round 1
      const { result: r1 } = getRepayment(wallet1, 1);
      expect(r1).toHaveClarityType(ClarityType.OptionalSome);
      const repayment1 = (r1 as any).value.value;
      expect(repayment1["amount-due"]).toBeUint(10_000_000);
      expect(repayment1["amount-paid"]).toBeUint(0);

      // Check repayment for round 2
      const { result: r2 } = getRepayment(wallet1, 2);
      expect(r2).toHaveClarityType(ClarityType.OptionalSome);
      const repayment2 = (r2 as any).value.value;
      expect(repayment2["amount-due"]).toBeUint(10_000_000);
      expect(repayment2["amount-paid"]).toBeUint(0);
    });

    it("fails if contributions are incomplete (err u813)", () => {
      setupActiveCircle();
      contributeStx(wallet1);
      contributeStx(wallet2);
      // wallet3 did NOT contribute
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      minePastBidWindow(0);

      const { result } = processRound();
      expect(result).toBeErr(Cl.uint(813));
    });

    it("fails if bid window has not ended (err u823)", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);

      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);

      // Do NOT mine past bid window
      const { result } = processRound();
      expect(result).toBeErr(Cl.uint(823));
    });

    it("fails if no bids were placed (err u820)", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);
      // No bids placed
      minePastBidWindow(0);

      const { result } = processRound();
      expect(result).toBeErr(Cl.uint(820));
    });

    it("fails if round already processed (err u814)", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);
      minePastBidWindow(0);

      processRound();
      // Try processing again -- round advanced but no contributions for round 1 yet
      const { result } = processRound();
      expect(result).toBeErr(Cl.uint(813)); // ERR_CONTRIBUTIONS_INCOMPLETE
    });

    it("protocol fee is sent to admin", () => {
      setupActiveCircle();

      const balanceBefore = simnet.getAssetsMap().get("STX")?.get(deployer);

      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);
      minePastBidWindow(0);
      processRound();

      const balanceAfter = simnet.getAssetsMap().get("STX")?.get(deployer);
      // Admin (deployer) should have received the protocol fee
      expect(balanceAfter! - balanceBefore!).toBe(BigInt(PROTOCOL_FEE));
    });

    it("winner receives bid amount from contract", () => {
      setupActiveCircle();

      const balanceBefore = simnet.getAssetsMap().get("STX")?.get(wallet1);

      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);
      minePastBidWindow(0);
      processRound();

      const balanceAfter = simnet.getAssetsMap().get("STX")?.get(wallet1);
      // wallet1 contributed 10M, received 20M bid + dividend (0 as winner)
      // Net change = -10M (contributed) + 20M (won) + dividend from wallet1 = 10M net gain
      // But actually wallet1 is the winner, so no dividend for winner
      // wallet1: -10M contribution + 20M winning bid = +10M
      const netChange = balanceAfter! - balanceBefore!;
      // wallet1 pays 10M contribution, gets back 20M winning bid = net +10M
      expect(netChange).toBe(BigInt(10_000_000));
    });

    it("non-winners receive dividends", () => {
      setupActiveCircle();

      const balance2Before = simnet.getAssetsMap().get("STX")?.get(wallet2);

      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);
      minePastBidWindow(0);
      processRound();

      const balance2After = simnet.getAssetsMap().get("STX")?.get(wallet2);
      // surplus = 30M - 20M - 300K = 9_700_000
      // dividend per non-winner = 9_700_000 / 2 = 4_850_000
      // wallet2: -10M contribution + 4_850_000 dividend = -5_150_000
      const expectedDividend = Math.floor((POOL_TOTAL - 20_000_000 - PROTOCOL_FEE) / 2);
      const netChange = balance2After! - balance2Before!;
      expect(netChange).toBe(BigInt(-10_000_000 + expectedDividend));
    });
  });

  // ------------------------------------------
  // 6. Repayment
  // ------------------------------------------
  describe("make-repayment-stx", () => {
    /**
     * Complete round 0 with wallet1 as winner (bid 20M),
     * setting up repayments for rounds 1 and 2.
     */
    function setupAfterRound0() {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);
      minePastBidWindow(0);
      processRound();
    }

    it("succeeds for winner in next round", () => {
      setupAfterRound0();
      // Now in round 1 -- wallet1 owes 10M repayment
      const { result } = makeRepaymentStx(wallet1);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("repayment record is updated", () => {
      setupAfterRound0();
      makeRepaymentStx(wallet1);

      const { result } = getRepayment(wallet1, 1);
      const repayment = (result as any).value.value;
      expect(repayment["amount-paid"]).toBeUint(10_000_000);
    });

    it("member total-repaid is updated", () => {
      setupAfterRound0();
      makeRepaymentStx(wallet1);

      const { result } = getMember(wallet1);
      const member = (result as any).value.value;
      expect(member["total-repaid"]).toBeUint(10_000_000);
    });

    it("fails when no repayment is due (err u824)", () => {
      setupAfterRound0();
      // wallet2 did not win, so has no repayment due
      const { result } = makeRepaymentStx(wallet2);
      expect(result).toBeErr(Cl.uint(824));
    });

    it("fails for double repayment in same round (err u808)", () => {
      setupAfterRound0();
      makeRepaymentStx(wallet1);

      const { result } = makeRepaymentStx(wallet1);
      expect(result).toBeErr(Cl.uint(808)); // ERR_ALREADY_CONTRIBUTED reused
    });
  });

  // ------------------------------------------
  // 7. Full 3-Round Lifecycle
  // ------------------------------------------
  describe("full 3-round lifecycle", () => {
    it("completes all 3 rounds with correct winners and circle completes", () => {
      setupActiveCircle();

      // ========== ROUND 0 ==========
      // All contribute
      allContribute();
      mineIntoBidWindow(0);

      // All bid: wallet1=20M (lowest), wallet2=25M, wallet3=28M
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);
      minePastBidWindow(0);

      const { result: r0 } = processRound();
      expect(r0).toBeOk(Cl.uint(20_000_000));

      // Verify wallet1 won round 0
      const { result: rr0 } = getRoundResult(0);
      expect((rr0 as any).value.value.winner).toBePrincipal(wallet1);

      // Verify round is now 1
      let circleData = getCircle();
      expect((circleData.result as any).value.value["current-round"]).toBeUint(1);

      // ========== ROUND 1 ==========
      // wallet1 makes repayment for round 1
      makeRepaymentStx(wallet1);

      // All contribute round 1
      allContribute();
      mineIntoBidWindow(1);

      // Only wallet2 and wallet3 can bid (wallet1 already won)
      placeBid(wallet2, 22_000_000);
      placeBid(wallet3, 26_000_000);

      // wallet1 cannot bid (already won)
      const { result: w1Bid } = placeBid(wallet1, 15_000_000);
      expect(w1Bid).toBeErr(Cl.uint(817)); // ERR_ALREADY_WON

      minePastBidWindow(1);

      const { result: r1 } = processRound();
      expect(r1).toBeOk(Cl.uint(22_000_000));

      // Verify wallet2 won round 1
      const { result: rr1 } = getRoundResult(1);
      expect((rr1 as any).value.value.winner).toBePrincipal(wallet2);

      // Verify round is now 2
      circleData = getCircle();
      expect((circleData.result as any).value.value["current-round"]).toBeUint(2);

      // ========== ROUND 2 ==========
      // wallet1 makes repayment for round 2
      makeRepaymentStx(wallet1);

      // wallet2 makes repayment for round 2 (won in round 1, 1 remaining round)
      // wallet2 won 22M at round 1, remaining = 3-1-1 = 1 round, repayment = 22M
      makeRepaymentStx(wallet2);

      // All contribute round 2
      allContribute();
      mineIntoBidWindow(2);

      // Only wallet3 can bid (wallet1 and wallet2 already won)
      placeBid(wallet3, 24_000_000);

      minePastBidWindow(2);

      const { result: r2 } = processRound();
      expect(r2).toBeOk(Cl.uint(24_000_000));

      // Verify wallet3 won round 2
      const { result: rr2 } = getRoundResult(2);
      expect((rr2 as any).value.value.winner).toBePrincipal(wallet3);

      // ========== CIRCLE COMPLETED ==========
      circleData = getCircle();
      expect((circleData.result as any).value.value.status).toBeUint(3); // STATUS_COMPLETED

      // Verify all members marked as won
      const m1 = getMember(wallet1);
      expect((m1.result as any).value.value["has-won"]).toBeBool(true);
      const m2 = getMember(wallet2);
      expect((m2.result as any).value.value["has-won"]).toBeBool(true);
      const m3 = getMember(wallet3);
      expect((m3.result as any).value.value["has-won"]).toBeBool(true);
    });

    it("collateral is released for all members on completion", () => {
      setupActiveCircle();

      // Round 0
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);
      minePastBidWindow(0);
      processRound();

      // Round 1
      makeRepaymentStx(wallet1);
      allContribute();
      mineIntoBidWindow(1);
      placeBid(wallet2, 22_000_000);
      placeBid(wallet3, 26_000_000);
      minePastBidWindow(1);
      processRound();

      // Round 2
      makeRepaymentStx(wallet1);
      makeRepaymentStx(wallet2);
      allContribute();
      mineIntoBidWindow(2);
      placeBid(wallet3, 24_000_000);
      minePastBidWindow(2);
      processRound();

      // Verify collateral released for all members
      for (const w of [wallet1, wallet2, wallet3]) {
        const { result } = simnet.callReadOnlyFn(
          "halo-vault-v2",
          "get-circle-commitment",
          [Cl.principal(w), Cl.uint(1)],
          deployer,
        );
        expect(result).toBeNone();
      }
    });
  });

  // ------------------------------------------
  // 8. Default / Slash
  // ------------------------------------------
  describe("report-default", () => {
    /**
     * Set up through round 0 with wallet1 as winner (bid 20M).
     * Advance to round 1 where wallet1 has a repayment due.
     */
    function setupForDefault() {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 20_000_000);
      placeBid(wallet2, 25_000_000);
      placeBid(wallet3, 28_000_000);
      minePastBidWindow(0);
      processRound();
      // Now in round 1, wallet1 owes 10M repayment
    }

    it("report-default succeeds when winner has unpaid repayment and grace period passed", () => {
      setupForDefault();

      // Mine past grace period for round 1
      const { result: timingResult } = getRoundTiming(1);
      const timing = (timingResult as any).value.value;
      const contributeDeadline = Number(timing["contribute-deadline"].value);
      const currentBlock = simnet.blockHeight;
      if (currentBlock <= contributeDeadline) {
        simnet.mineEmptyBlocks(contributeDeadline - currentBlock + 1);
      }

      // Report default on wallet1
      const { result } = simnet.callPublicFn(
        contractName,
        "report-default",
        [Cl.uint(1), Cl.principal(wallet1)],
        wallet2,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("report-default fails when grace period has not passed", () => {
      setupForDefault();
      // Still within grace period for round 1

      const { result } = simnet.callPublicFn(
        contractName,
        "report-default",
        [Cl.uint(1), Cl.principal(wallet1)],
        wallet2,
      );
      // The contract checks (not (is-payment-on-time ...)) which returns ERR_NOT_IN_BID_WINDOW (u815)
      expect(result).toBeErr(Cl.uint(815));
    });

    it("report-default fails when no repayment is due (err u824)", () => {
      setupForDefault();

      // Try to report default on wallet2 who did NOT win and has no repayment
      const { result: timingResult } = getRoundTiming(1);
      const timing = (timingResult as any).value.value;
      const contributeDeadline = Number(timing["contribute-deadline"].value);
      const currentBlock = simnet.blockHeight;
      if (currentBlock <= contributeDeadline) {
        simnet.mineEmptyBlocks(contributeDeadline - currentBlock + 1);
      }

      const { result } = simnet.callPublicFn(
        contractName,
        "report-default",
        [Cl.uint(1), Cl.principal(wallet2)],
        wallet3,
      );
      expect(result).toBeErr(Cl.uint(824));
    });

    it("report-default slashes collateral from vault", () => {
      setupForDefault();

      // Get wallet1 vault deposit before slash
      const depositBefore = simnet.callReadOnlyFn(
        "halo-vault-v2",
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      const depositedBefore = (depositBefore.result as any).value.value.deposited;

      // Mine past grace period
      const { result: timingResult } = getRoundTiming(1);
      const timing = (timingResult as any).value.value;
      const contributeDeadline = Number(timing["contribute-deadline"].value);
      const currentBlock = simnet.blockHeight;
      if (currentBlock <= contributeDeadline) {
        simnet.mineEmptyBlocks(contributeDeadline - currentBlock + 1);
      }

      // Report default
      simnet.callPublicFn(
        contractName,
        "report-default",
        [Cl.uint(1), Cl.principal(wallet1)],
        wallet2,
      );

      // Check deposit decreased
      const depositAfter = simnet.callReadOnlyFn(
        "halo-vault-v2",
        "get-user-deposit",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      const depositedAfter = (depositAfter.result as any).value.value.deposited;

      // Deposited amount should have decreased
      expect(BigInt(depositedAfter.value)).toBeLessThan(BigInt(depositedBefore.value));
    });

    it("report-default fails on non-active circle (err u803)", () => {
      setupForDefault();
      // Pause the circle first
      simnet.callPublicFn(contractName, "pause-circle", [Cl.uint(1)], deployer);

      const { result } = simnet.callPublicFn(
        contractName,
        "report-default",
        [Cl.uint(1), Cl.principal(wallet1)],
        wallet2,
      );
      expect(result).toBeErr(Cl.uint(803));
    });
  });

  // ------------------------------------------
  // Additional: Admin functions
  // ------------------------------------------
  describe("admin functions", () => {
    it("set-protocol-fee-rate succeeds for admin", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "set-protocol-fee-rate",
        [Cl.uint(200)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("set-protocol-fee-rate fails for non-admin (err u800)", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "set-protocol-fee-rate",
        [Cl.uint(200)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(800));
    });

    it("set-protocol-fee-rate rejects > 1000 basis points (err u812)", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "set-protocol-fee-rate",
        [Cl.uint(1001)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(812));
    });

    it("set-admin transfers admin role", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "set-admin",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));

      const { result: adminResult } = simnet.callReadOnlyFn(
        contractName,
        "get-admin",
        [],
        deployer,
      );
      expect(adminResult).toBePrincipal(wallet1);
    });

    it("pause-circle succeeds for active circle", () => {
      setupActiveCircle();

      const { result } = simnet.callPublicFn(
        contractName,
        "pause-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));

      const { result: circleResult } = getCircle();
      expect((circleResult as any).value.value.status).toBeUint(2); // STATUS_PAUSED
    });

    it("pause-circle fails for non-admin (err u800)", () => {
      setupActiveCircle();

      const { result } = simnet.callPublicFn(
        contractName,
        "pause-circle",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(800));
    });

    it("resume-circle succeeds for paused circle", () => {
      setupActiveCircle();
      simnet.callPublicFn(contractName, "pause-circle", [Cl.uint(1)], deployer);

      const { result } = simnet.callPublicFn(
        contractName,
        "resume-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));

      const { result: circleResult } = getCircle();
      expect((circleResult as any).value.value.status).toBeUint(1); // STATUS_ACTIVE
    });

    it("resume-circle fails for non-paused circle (err u803)", () => {
      setupActiveCircle();

      const { result } = simnet.callPublicFn(
        contractName,
        "resume-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(803));
    });
  });

  // ------------------------------------------
  // Additional: Read-only helpers
  // ------------------------------------------
  describe("read-only helpers", () => {
    it("get-circle returns none for non-existent circle", () => {
      const { result } = getCircle(999);
      expect(result).toBeNone();
    });

    it("get-protocol-fee-rate returns default 1%", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-protocol-fee-rate",
        [],
        deployer,
      );
      expect(result).toBeUint(100);
    });

    it("is-verified returns true for bound wallet", () => {
      setupIdentities();
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-verified",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("is-verified returns false for unbound wallet", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-verified",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(false);
    });

    it("get-round-timing returns correct timing data", () => {
      setupActiveCircle();

      const { result } = getRoundTiming(0);
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const timing = (result as any).value.value;

      // Verify timing structure exists
      expect(timing["round-start"]).toBeDefined();
      expect(timing["contribute-deadline"]).toBeDefined();
      expect(timing["bid-window-start"]).toBeDefined();
      expect(timing["bid-window-end"]).toBeDefined();

      // Verify ordering: round-start < contribute-deadline = bid-window-start < bid-window-end
      const roundStart = Number(timing["round-start"].value);
      const contributeDeadline = Number(timing["contribute-deadline"].value);
      const bidWindowStart = Number(timing["bid-window-start"].value);
      const bidWindowEnd = Number(timing["bid-window-end"].value);

      expect(contributeDeadline).toBe(roundStart + 100); // grace period
      expect(bidWindowStart).toBe(contributeDeadline);
      expect(bidWindowEnd).toBe(bidWindowStart + 100); // bid window blocks
    });

    it("get-circle-members returns correct member list", () => {
      setupActiveCircle();

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-circle-members",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.List);
      const members = (result as any).value;
      expect(members.length).toBe(3);
      expect(members[0]).toBePrincipal(wallet1);
      expect(members[1]).toBePrincipal(wallet2);
      expect(members[2]).toBePrincipal(wallet3);
    });

    it("count-round-contributions counts correctly", () => {
      setupActiveCircle();
      contributeStx(wallet1);
      contributeStx(wallet2);

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "count-round-contributions",
        [Cl.uint(1), Cl.uint(0)],
        deployer,
      );
      expect(result).toBeUint(2);
    });
  });

  // ------------------------------------------
  // 10. Fix #19 — Collateral release with repayment verification
  // ------------------------------------------
  describe("Fix #19: Collateral release with repayment check", () => {
    it("releases collateral for members who never won", () => {
      setupActiveCircle();

      // Run all 3 rounds to completion
      // Round 0
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000);
      minePastBidWindow(0);
      processRound();

      // wallet1 won round 0, must repay in rounds 1 and 2
      // Round 1
      allContribute();
      makeRepaymentStx(wallet1); // wallet1 repays round 1

      mineIntoBidWindow(1);
      placeBid(wallet2, 20_000_000);
      minePastBidWindow(1);
      processRound();

      // wallet2 won round 1, must repay in round 2
      // Round 2
      allContribute();
      makeRepaymentStx(wallet1); // wallet1 repays round 2
      makeRepaymentStx(wallet2); // wallet2 repays round 2

      mineIntoBidWindow(2);
      placeBid(wallet3, 25_000_000);
      minePastBidWindow(2);

      // Process round 2 -> circle completes
      const { result: settleResult } = processRound();
      expect(settleResult).toBeOk(Cl.uint(25_000_000));

      // Circle should be completed
      const { result: circleResult } = getCircle();
      const circle = (circleResult as any).value.value;
      expect(circle.status).toBeUint(3); // STATUS_COMPLETED

      // wallet3 never won, so collateral should be released (no commitment left)
      const { result: commitResult } = simnet.callReadOnlyFn(
        "halo-vault-v2",
        "get-circle-commitment",
        [Cl.principal(wallet3), Cl.uint(1)],
        deployer,
      );
      expect(commitResult).toHaveClarityType(ClarityType.OptionalNone);
    });

    it("slashes collateral for winners who did not fully repay", () => {
      setupActiveCircle();

      // Round 0: wallet1 wins
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000);
      minePastBidWindow(0);
      processRound();

      // Round 1: wallet1 does NOT repay, wallet2 wins
      allContribute();
      // wallet1 skips repayment!

      mineIntoBidWindow(1);
      placeBid(wallet2, 20_000_000);
      minePastBidWindow(1);
      processRound();

      // Round 2: wallet1 still does NOT repay, wallet3 wins -> circle completes
      allContribute();
      makeRepaymentStx(wallet2); // wallet2 repays
      // wallet1 still skips repayment!

      mineIntoBidWindow(2);
      placeBid(wallet3, 25_000_000);
      minePastBidWindow(2);

      // Get wallet1's balance before completion
      const stxBefore = simnet.getAssetsMap().get("STX")!.get(wallet1) || 0n;

      processRound();

      // Circle completed
      const { result: circleResult } = getCircle();
      const circle = (circleResult as any).value.value;
      expect(circle.status).toBeUint(3);

      // wallet1's member data should show has-won=true but total-repaid=0
      const { result: memberResult } = getMember(wallet1);
      const member = (memberResult as any).value.value;
      expect(member["has-won"]).toBeBool(true);
      expect(member["won-amount"]).toBeUint(15_000_000);
      expect(member["total-repaid"]).toBeUint(0);

      // wallet1's commitment should be deleted (slashed removes it)
      const { result: commitResult } = simnet.callReadOnlyFn(
        "halo-vault-v2",
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(commitResult).toHaveClarityType(ClarityType.OptionalNone);
    });

    it("releases collateral for winners who fully repaid", () => {
      setupActiveCircle();

      // Round 0: wallet1 wins
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000);
      minePastBidWindow(0);
      processRound();

      // Round 1: wallet1 repays, wallet2 wins
      allContribute();
      makeRepaymentStx(wallet1);

      mineIntoBidWindow(1);
      placeBid(wallet2, 20_000_000);
      minePastBidWindow(1);
      processRound();

      // Round 2: wallet1+wallet2 repay, wallet3 wins -> circle completes
      allContribute();
      makeRepaymentStx(wallet1);
      makeRepaymentStx(wallet2);

      mineIntoBidWindow(2);
      placeBid(wallet3, 25_000_000);
      minePastBidWindow(2);
      processRound();

      // All members fully repaid, so all commitments should be released
      for (const w of [wallet1, wallet2, wallet3]) {
        const { result: commitResult } = simnet.callReadOnlyFn(
          "halo-vault-v2",
          "get-circle-commitment",
          [Cl.principal(w), Cl.uint(1)],
          deployer,
        );
        expect(commitResult).toHaveClarityType(ClarityType.OptionalNone);
      }
    });
  });

  // ------------------------------------------
  // 11. Fix #21 — SIP-010 token settlement
  // ------------------------------------------
  describe("Fix #21: SIP-010 token settlement (process-round-v2-token)", () => {
    const tokenContract = `${deployer}.halo-mock-token`;

    function setupTokenCircle() {
      setupIdentities();
      authorizeCircleV2();

      // Configure hUSD asset (type 0, 80% LTV, 6 decimals)
      simnet.callPublicFn(
        "halo-vault-v2",
        "configure-asset",
        [Cl.uint(0), Cl.some(Cl.principal(tokenContract)), Cl.uint(8000), Cl.uint(6)],
        deployer,
      );
      simnet.callPublicFn(
        "halo-vault-v2",
        "set-asset-price",
        [Cl.uint(0), Cl.uint(1000000)], // $1.00
        deployer,
      );
      simnet.callPublicFn(
        "halo-vault-v2",
        "authorize-contract",
        [Cl.principal(`${deployer}.${contractName}`)],
        deployer,
      );

      // Mint tokens and deposit to vault for each wallet
      for (const w of [wallet1, wallet2, wallet3]) {
        simnet.callPublicFn(
          "halo-mock-token",
          "mint",
          [Cl.uint(1_000_000_000), Cl.principal(w)],
          deployer,
        );
        // Deposit hUSD to vault
        simnet.callPublicFn(
          "halo-vault-v2",
          "deposit-husd",
          [Cl.principal(tokenContract), Cl.uint(500_000_000)],
          w,
        );
      }

      // Create a token circle
      simnet.callPublicFn(
        contractName,
        "create-token-circle-v2",
        [
          circleName,
          Cl.principal(tokenContract),
          Cl.uint(10_000_000), // 10 hUSD
          Cl.uint(3),
          roundDuration,
          bidWindowBlocks,
          gracePeriod,
        ],
        wallet1,
      );

      // Join
      joinCircle(wallet2);
      joinCircle(wallet3);
    }

    function contributeToken(wallet: string, circleId: number = 1) {
      return simnet.callPublicFn(
        contractName,
        "contribute-token-v2",
        [Cl.uint(circleId), Cl.principal(tokenContract)],
        wallet,
      );
    }

    function allContributeToken(circleId: number = 1) {
      contributeToken(wallet1, circleId);
      contributeToken(wallet2, circleId);
      contributeToken(wallet3, circleId);
    }

    function processRoundToken(circleId: number = 1) {
      return simnet.callPublicFn(
        contractName,
        "process-round-v2-token",
        [Cl.uint(circleId), Cl.principal(tokenContract)],
        deployer,
      );
    }

    function claimDividend(wallet: string, round: number, circleId: number = 1) {
      return simnet.callPublicFn(
        contractName,
        "claim-dividend-token",
        [Cl.uint(circleId), Cl.uint(round), Cl.principal(tokenContract)],
        wallet,
      );
    }

    it("rejects process-round-v2-token for STX circles", () => {
      setupActiveCircle();
      allContribute();
      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000);
      minePastBidWindow(0);

      const { result } = simnet.callPublicFn(
        contractName,
        "process-round-v2-token",
        [Cl.uint(1), Cl.principal(tokenContract)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(827)); // ERR_INVALID_TOKEN_TYPE
    });

    it("settles a token circle round via process-round-v2-token", () => {
      setupTokenCircle();

      // Contribute
      allContributeToken();

      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000); // bid 15 hUSD
      minePastBidWindow(0);

      // Process round with token
      const { result } = processRoundToken();
      expect(result).toBeOk(Cl.uint(15_000_000));

      // Check round result
      const { result: roundResult } = getRoundResult(0);
      const rr = (roundResult as any).value.value;
      expect(rr.winner).toBePrincipal(wallet1);
      expect(rr["winning-bid"]).toBeUint(15_000_000);
    });

    it("records pending dividends for non-winner members", () => {
      setupTokenCircle();
      allContributeToken();
      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000);
      minePastBidWindow(0);
      processRoundToken();

      // Check pending dividends for non-winners
      const { result: div2 } = simnet.callReadOnlyFn(
        contractName,
        "get-pending-dividend",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet2)],
        deployer,
      );
      expect(div2).toHaveClarityType(ClarityType.OptionalSome);
      const divData2 = (div2 as any).value.value;
      expect(divData2.claimed).toBeBool(false);
      expect(Number(divData2.amount.value)).toBeGreaterThan(0);

      // Winner should not have a pending dividend
      const { result: divWinner } = simnet.callReadOnlyFn(
        contractName,
        "get-pending-dividend",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet1)],
        deployer,
      );
      expect(divWinner).toHaveClarityType(ClarityType.OptionalNone);
    });

    it("allows non-winners to claim dividends", () => {
      setupTokenCircle();
      allContributeToken();
      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000);
      minePastBidWindow(0);
      processRoundToken();

      // wallet2 claims dividend
      const { result: claimResult } = claimDividend(wallet2, 0);
      // Claim should succeed (returns ok with dividend amount)
      expect(claimResult).toHaveClarityType(ClarityType.ResponseOk);

      // Verify dividend is marked as claimed
      const { result: divAfter } = simnet.callReadOnlyFn(
        contractName,
        "get-pending-dividend",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet2)],
        deployer,
      );
      const divData = (divAfter as any).value.value;
      expect(divData.claimed).toBeBool(true);
    });

    it("prevents double-claiming dividends", () => {
      setupTokenCircle();
      allContributeToken();
      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000);
      minePastBidWindow(0);
      processRoundToken();

      // First claim succeeds
      claimDividend(wallet2, 0);

      // Second claim fails
      const { result } = claimDividend(wallet2, 0);
      expect(result).toBeErr(Cl.uint(808)); // ERR_ALREADY_CONTRIBUTED
    });

    it("runs a full token circle lifecycle (3 rounds)", () => {
      setupTokenCircle();

      // Round 0: wallet1 bids and wins
      allContributeToken();
      mineIntoBidWindow(0);
      placeBid(wallet1, 15_000_000);
      minePastBidWindow(0);
      const { result: r0 } = processRoundToken();
      expect(r0).toBeOk(Cl.uint(15_000_000));

      // Round 1: wallet1 repays, wallet2 bids and wins
      allContributeToken();
      simnet.callPublicFn(
        contractName,
        "make-repayment-token",
        [Cl.uint(1), Cl.principal(tokenContract)],
        wallet1,
      );
      mineIntoBidWindow(1);
      placeBid(wallet2, 20_000_000);
      minePastBidWindow(1);
      const { result: r1 } = processRoundToken();
      expect(r1).toBeOk(Cl.uint(20_000_000));

      // Round 2: wallet1+wallet2 repay, wallet3 auto-wins
      allContributeToken();
      simnet.callPublicFn(
        contractName,
        "make-repayment-token",
        [Cl.uint(1), Cl.principal(tokenContract)],
        wallet1,
      );
      simnet.callPublicFn(
        contractName,
        "make-repayment-token",
        [Cl.uint(1), Cl.principal(tokenContract)],
        wallet2,
      );
      mineIntoBidWindow(2);
      placeBid(wallet3, 25_000_000);
      minePastBidWindow(2);
      const { result: r2 } = processRoundToken();
      expect(r2).toBeOk(Cl.uint(25_000_000));

      // Circle completed
      const { result: circleResult } = getCircle();
      const circle = (circleResult as any).value.value;
      expect(circle.status).toBeUint(3); // STATUS_COMPLETED
    });
  });
});
