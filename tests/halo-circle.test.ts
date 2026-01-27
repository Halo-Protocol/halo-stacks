import { describe, it, expect } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";
import { tx } from "@stacks/clarinet-sdk";

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

const mockToken = "halo-mock-token";
const mockSbtc = "halo-mock-sbtc";

// Bind wallets to identities (required for circle operations)
function setupIdentities() {
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(2)], wallet2);
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(3)], wallet3);
  simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(4)], wallet4);
}

// Authorize the circle contract in the credit contract
function authorizeCircle() {
  simnet.callPublicFn(
    "halo-credit",
    "authorize-contract",
    [Cl.principal(`${deployer}.halo-circle`)],
    deployer,
  );
}

// Setup vault for STX circles: vault token, STX price, authorize circle contract
function setupVault() {
  // Set vault token (hUSD for collateral deposits)
  simnet.callPublicFn(
    "halo-vault",
    "set-vault-token",
    [Cl.principal(`${deployer}.${mockToken}`)],
    deployer,
  );
  // Set STX price ($0.50 = u500000, 6 decimals for microSTX)
  simnet.callPublicFn(
    "halo-vault",
    "set-token-price",
    [Cl.principal(deployer), Cl.uint(500000), Cl.uint(6)],
    deployer,
  );
  // Authorize circle contract in vault
  simnet.callPublicFn(
    "halo-vault",
    "authorize-contract",
    [Cl.principal(`${deployer}.halo-circle`)],
    deployer,
  );
}

// Deposit collateral into vault for a wallet
function depositCollateral(wallet: string, amount: number) {
  simnet.callPublicFn(
    mockToken,
    "mint",
    [Cl.uint(amount), Cl.principal(wallet)],
    deployer,
  );
  simnet.callPublicFn(
    "halo-vault",
    "deposit",
    [Cl.contractPrincipal(deployer, mockToken), Cl.uint(amount)],
    wallet,
  );
}

// Full circle setup: identities + credit auth + vault + collateral for all wallets
function fullCircleSetup() {
  setupIdentities();
  authorizeCircle();
  setupVault();
  // 50 hUSD each: at 80% LTV = 40 hUSD capacity, commitment for 10 STX × 3 = $15
  depositCollateral(wallet1, 50_000000);
  depositCollateral(wallet2, 50_000000);
  depositCollateral(wallet3, 50_000000);
  depositCollateral(wallet4, 50_000000);
}

// Default circle parameters
const circleName = Cl.stringAscii("Test Circle");
const contributionAmount = Cl.uint(10000000); // 10 STX
const totalMembers = Cl.uint(3);
const roundDuration = Cl.uint(144); // ~1 day
const gracePeriod = Cl.uint(72); // ~12 hours

function createCircle(creator: string) {
  return simnet.callPublicFn(
    "halo-circle",
    "create-circle",
    [circleName, contributionAmount, totalMembers, roundDuration, gracePeriod],
    creator,
  );
}

describe("halo-circle", () => {
  describe("create-circle", () => {
    it("verified user can create a circle", () => {
      fullCircleSetup();

      const { result } = createCircle(wallet1);
      expect(result).toBeOk(Cl.uint(1));
    });

    it("unverified user cannot create a circle", () => {
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [circleName, contributionAmount, totalMembers, roundDuration, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(210)); // ERR_NOT_VERIFIED
    });

    it("rejects fewer than 3 members", () => {
      setupIdentities();
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [circleName, contributionAmount, Cl.uint(2), roundDuration, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(212)); // ERR_INVALID_PARAMS
    });

    it("rejects more than 10 members", () => {
      setupIdentities();
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [circleName, contributionAmount, Cl.uint(11), roundDuration, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(212)); // ERR_INVALID_PARAMS
    });

    it("rejects contribution below minimum (1 STX)", () => {
      setupIdentities();
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [circleName, Cl.uint(999999), totalMembers, roundDuration, gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(207)); // ERR_INVALID_AMOUNT
    });

    it("rejects round duration below minimum", () => {
      setupIdentities();
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [circleName, contributionAmount, totalMembers, Cl.uint(100), gracePeriod],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(212)); // ERR_INVALID_PARAMS
    });

    it("creator is added as member #1", () => {
      fullCircleSetup();
      createCircle(wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-member",
        [Cl.uint(1), Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const member = (result as any).value.value;
      expect(member["payout-position"]).toBeUint(1);
    });

    it("circle status is FORMING", () => {
      fullCircleSetup();
      createCircle(wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const circle = (result as any).value.value;
      expect(circle.status).toBeUint(0); // STATUS_FORMING
    });

    it("circle counter increments", () => {
      fullCircleSetup();
      createCircle(wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle-count",
        [],
        deployer,
      );
      expect(result).toBeUint(1);
    });

    it("circle has token-type STX", () => {
      fullCircleSetup();
      createCircle(wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      const circle = (result as any).value.value;
      expect(circle["token-type"]).toBeUint(0); // TOKEN_TYPE_STX
      expect(circle["token-contract"]).toBeNone();
    });

    it("collateral is locked on create", () => {
      fullCircleSetup();
      createCircle(wallet1);

      // Check vault commitment exists
      const { result } = simnet.callReadOnlyFn(
        "halo-vault",
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
    });

    it("fails without sufficient collateral", () => {
      setupIdentities();
      authorizeCircle();
      setupVault();
      // Don't deposit collateral for wallet1

      const { result } = createCircle(wallet1);
      expect(result).toHaveClarityType(ClarityType.ResponseErr);
    });
  });

  describe("join-circle", () => {
    it("verified user can join a forming circle", () => {
      fullCircleSetup();
      createCircle(wallet1);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "join-circle",
        [Cl.uint(1)],
        wallet2,
      );
      expect(result).toBeOk(Cl.uint(2)); // position 2
    });

    it("unverified user cannot join", () => {
      fullCircleSetup();
      createCircle(wallet1);

      // wallet5 is not bound
      const wallet5 = accounts.get("wallet_5")!;
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "join-circle",
        [Cl.uint(1)],
        wallet5,
      );
      expect(result).toBeErr(Cl.uint(210)); // ERR_NOT_VERIFIED
    });

    it("cannot join same circle twice", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "join-circle",
        [Cl.uint(1)],
        wallet2,
      );
      expect(result).toBeErr(Cl.uint(204)); // ERR_ALREADY_MEMBER
    });

    it("cannot join non-existent circle", () => {
      setupIdentities();

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "join-circle",
        [Cl.uint(999)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(201)); // ERR_CIRCLE_NOT_FOUND
    });

    it("auto-activates when circle is full", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      const circle = (result as any).value.value;
      expect(circle.status).toBeUint(1); // STATUS_ACTIVE
    });

    it("cannot join an active (full) circle", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "join-circle",
        [Cl.uint(1)],
        wallet4,
      );
      expect(result).toBeErr(Cl.uint(202)); // ERR_CIRCLE_NOT_FORMING
    });

    it("collateral is locked for each joiner", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);

      // Both wallet1 and wallet2 should have commitments
      const c1 = simnet.callReadOnlyFn(
        "halo-vault",
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(c1.result).toHaveClarityType(ClarityType.OptionalSome);

      const c2 = simnet.callReadOnlyFn(
        "halo-vault",
        "get-circle-commitment",
        [Cl.principal(wallet2), Cl.uint(1)],
        deployer,
      );
      expect(c2.result).toHaveClarityType(ClarityType.OptionalSome);
    });
  });

  describe("contribute-stx", () => {
    function setupActiveCircle() {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);
    }

    it("member can contribute STX", () => {
      setupActiveCircle();

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "contribute-stx",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("non-member cannot contribute", () => {
      setupActiveCircle();

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "contribute-stx",
        [Cl.uint(1)],
        wallet4,
      );
      expect(result).toBeErr(Cl.uint(205)); // ERR_NOT_MEMBER
    });

    it("cannot contribute twice in same round", () => {
      setupActiveCircle();
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "contribute-stx",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(208)); // ERR_ALREADY_CONTRIBUTED
    });

    it("contribution is recorded", () => {
      setupActiveCircle();
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-contribution",
        [Cl.uint(1), Cl.principal(wallet1), Cl.uint(0)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const contrib = (result as any).value.value;
      expect(contrib.amount).toBeUint(10000000);
    });
  });

  describe("process-payout", () => {
    function setupAndContributeAll() {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);
      // All 3 members contribute
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1);
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet3);
    }

    it("payout succeeds when all members contribute", () => {
      setupAndContributeAll();

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "process-payout",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("payout fails if not all members contributed", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);
      // Only 2 of 3 contribute
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1);
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet2);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "process-payout",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(213)); // ERR_CONTRIBUTIONS_INCOMPLETE
    });

    it("second payout attempt fails (round advanced, no contributions yet)", () => {
      setupAndContributeAll();
      simnet.callPublicFn("halo-circle", "process-payout", [Cl.uint(1)], wallet1);

      // Round has advanced to 1, no one has contributed yet for round 1
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "process-payout",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(213)); // ERR_CONTRIBUTIONS_INCOMPLETE
    });

    it("payout record is stored", () => {
      setupAndContributeAll();
      simnet.callPublicFn("halo-circle", "process-payout", [Cl.uint(1)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-payout",
        [Cl.uint(1), Cl.uint(0)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const payout = (result as any).value.value;
      expect(payout.recipient).toBePrincipal(wallet1); // position 0 = wallet1 (creator)
    });

    it("round advances after payout", () => {
      setupAndContributeAll();
      simnet.callPublicFn("halo-circle", "process-payout", [Cl.uint(1)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      const circle = (result as any).value.value;
      expect(circle["current-round"]).toBeUint(1); // advanced from 0 to 1
    });
  });

  describe("admin functions", () => {
    it("set-protocol-fee-rate succeeds for admin", () => {
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "set-protocol-fee-rate",
        [Cl.uint(200)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("set-protocol-fee-rate fails for non-admin", () => {
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "set-protocol-fee-rate",
        [Cl.uint(200)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(200)); // ERR_NOT_AUTHORIZED
    });

    it("set-protocol-fee-rate rejects > 10% (1000 basis points)", () => {
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "set-protocol-fee-rate",
        [Cl.uint(1001)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(212)); // ERR_INVALID_PARAMS
    });

    it("pause-circle succeeds for active circle", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "pause-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("pause-circle fails for non-admin", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "pause-circle",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(200)); // ERR_NOT_AUTHORIZED
    });

    it("resume-circle succeeds for paused circle", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);
      simnet.callPublicFn("halo-circle", "pause-circle", [Cl.uint(1)], deployer);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "resume-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("resume-circle fails for non-paused circle", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "resume-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(215)); // ERR_NOT_PAUSED
    });

    it("set-admin transfers admin role", () => {
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "set-admin",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeOk(Cl.bool(true));

      const { result: adminResult } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-admin",
        [],
        deployer,
      );
      expect(adminResult).toBePrincipal(wallet1);
    });
  });

  describe("read-only helpers", () => {
    it("get-circle returns none for non-existent circle", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(999)],
        deployer,
      );
      expect(result).toBeNone();
    });

    it("get-protocol-fee-rate returns default 1%", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-protocol-fee-rate",
        [],
        deployer,
      );
      expect(result).toBeUint(100); // 100 basis points = 1%
    });

    it("is-verified returns true for bound wallet", () => {
      setupIdentities();
      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "is-verified",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(true);
    });

    it("is-verified returns false for unbound wallet", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "is-verified",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toBeBool(false);
    });
  });

  describe("multi-token circles", () => {
    function setupForTokenCircle() {
      fullCircleSetup();
      // Set hUSD price in oracle ($1.00 = u1000000, 6 decimals)
      simnet.callPublicFn(
        "halo-vault",
        "set-token-price",
        [Cl.principal(`${deployer}.${mockToken}`), Cl.uint(1_000000), Cl.uint(6)],
        deployer,
      );
      // Mint hUSD for circle contributions (separate from collateral deposits)
      simnet.callPublicFn(mockToken, "mint", [Cl.uint(100_000000), Cl.principal(wallet1)], deployer);
      simnet.callPublicFn(mockToken, "mint", [Cl.uint(100_000000), Cl.principal(wallet2)], deployer);
      simnet.callPublicFn(mockToken, "mint", [Cl.uint(100_000000), Cl.principal(wallet3)], deployer);
    }

    it("can create a token circle", () => {
      setupForTokenCircle();

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "create-token-circle",
        [
          Cl.stringAscii("hUSD Circle"),
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(10_000000), // 10 hUSD
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it("token circle stores correct type and contract", () => {
      setupForTokenCircle();

      simnet.callPublicFn(
        "halo-circle",
        "create-token-circle",
        [
          Cl.stringAscii("hUSD Circle"),
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(10_000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );

      const { result } = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      const circle = (result as any).value.value;
      expect(circle["token-type"]).toBeUint(1); // TOKEN_TYPE_SIP010
      expect(circle["token-contract"]).toBeSome(
        Cl.principal(`${deployer}.${mockToken}`),
      );
    });

    it("can join and contribute tokens to a token circle", () => {
      setupForTokenCircle();

      // Create token circle
      simnet.callPublicFn(
        "halo-circle",
        "create-token-circle",
        [
          Cl.stringAscii("hUSD Circle"),
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(10_000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );

      // Join
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      // Contribute tokens
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "contribute-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockToken)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("cannot use contribute-stx on token circle", () => {
      setupForTokenCircle();

      simnet.callPublicFn(
        "halo-circle",
        "create-token-circle",
        [
          Cl.stringAscii("hUSD Circle"),
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(10_000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      const { result } = simnet.callPublicFn(
        "halo-circle",
        "contribute-stx",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(218)); // ERR_TOKEN_MISMATCH
    });

    it("cannot use wrong token for contribute-token", () => {
      setupForTokenCircle();

      simnet.callPublicFn(
        "halo-circle",
        "create-token-circle",
        [
          Cl.stringAscii("hUSD Circle"),
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(10_000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      // Try contributing with wrong token (mock-sbtc instead of mock-token)
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "contribute-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockSbtc)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(218)); // ERR_TOKEN_MISMATCH
    });

    it("full token circle lifecycle with payout", () => {
      setupForTokenCircle();

      // Create hUSD circle (10 hUSD per round, 3 members)
      simnet.callPublicFn(
        "halo-circle",
        "create-token-circle",
        [
          Cl.stringAscii("hUSD Circle"),
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(10_000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );

      // Join
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      // All contribute round 0
      simnet.callPublicFn(
        "halo-circle",
        "contribute-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockToken)],
        wallet1,
      );
      simnet.callPublicFn(
        "halo-circle",
        "contribute-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockToken)],
        wallet2,
      );
      simnet.callPublicFn(
        "halo-circle",
        "contribute-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockToken)],
        wallet3,
      );

      // Process payout for round 0
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "process-payout-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockToken)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.ResponseOk);

      // Verify round advanced
      const circleData = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect((circleData.result as any).value.value["current-round"]).toBeUint(1);
    });

    it("cannot use process-payout (STX) on token circle", () => {
      setupForTokenCircle();

      simnet.callPublicFn(
        "halo-circle",
        "create-token-circle",
        [
          Cl.stringAscii("hUSD Circle"),
          Cl.contractPrincipal(deployer, mockToken),
          Cl.uint(10_000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      simnet.callPublicFn(
        "halo-circle",
        "contribute-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockToken)],
        wallet1,
      );
      simnet.callPublicFn(
        "halo-circle",
        "contribute-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockToken)],
        wallet2,
      );
      simnet.callPublicFn(
        "halo-circle",
        "contribute-token",
        [Cl.uint(1), Cl.contractPrincipal(deployer, mockToken)],
        wallet3,
      );

      // Try STX payout on token circle
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "process-payout",
        [Cl.uint(1)],
        deployer,
      );
      expect(result).toBeErr(Cl.uint(218)); // ERR_TOKEN_MISMATCH
    });
  });

  describe("collateral release on completion", () => {
    it("collateral is released when circle completes", () => {
      fullCircleSetup();
      createCircle(wallet1);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      // Complete all 3 rounds
      for (let round = 0; round < 3; round++) {
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1);
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet2);
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet3);
        simnet.callPublicFn("halo-circle", "process-payout", [Cl.uint(1)], deployer);
      }

      // Verify circle is completed
      const circleData = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect((circleData.result as any).value.value.status).toBeUint(3); // STATUS_COMPLETED

      // Verify collateral commitments are released (map deleted)
      const c1 = simnet.callReadOnlyFn(
        "halo-vault",
        "get-circle-commitment",
        [Cl.principal(wallet1), Cl.uint(1)],
        deployer,
      );
      expect(c1.result).toBeNone();

      const c2 = simnet.callReadOnlyFn(
        "halo-vault",
        "get-circle-commitment",
        [Cl.principal(wallet2), Cl.uint(1)],
        deployer,
      );
      expect(c2.result).toBeNone();
    });
  });
});
