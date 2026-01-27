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
const wallet3 = accounts.get("wallet_3")!;

const mockToken = "halo-mock-token";

// Setup vault for STX circles
function setupVault() {
  simnet.callPublicFn(
    "halo-vault",
    "set-vault-token",
    [Cl.principal(`${deployer}.${mockToken}`)],
    deployer,
  );
  simnet.callPublicFn(
    "halo-vault",
    "set-token-price",
    [Cl.principal(deployer), Cl.uint(500000), Cl.uint(6)],
    deployer,
  );
  simnet.callPublicFn(
    "halo-vault",
    "authorize-contract",
    [Cl.principal(`${deployer}.halo-circle`)],
    deployer,
  );
}

// Deposit collateral for a wallet (mint hUSD + deposit to vault)
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

describe("cross-contract integration", () => {
  describe("full ROSCA lifecycle", () => {
    it("completes a full circle: identity -> create -> join -> contribute -> payout -> complete", () => {
      // 1. Bind identities for all participants
      expect(
        simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1).result,
      ).toBeOk(Cl.bool(true));
      expect(
        simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(2)], wallet2).result,
      ).toBeOk(Cl.bool(true));
      expect(
        simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(3)], wallet3).result,
      ).toBeOk(Cl.bool(true));

      // 2. Authorize circle contract in credit contract
      expect(
        simnet.callPublicFn(
          "halo-credit",
          "authorize-contract",
          [Cl.principal(`${deployer}.halo-circle`)],
          deployer,
        ).result,
      ).toBeOk(Cl.bool(true));

      // 2b. Setup vault and deposit collateral
      setupVault();
      depositCollateral(wallet1, 50_000000);
      depositCollateral(wallet2, 50_000000);
      depositCollateral(wallet3, 50_000000);

      // 3. Create circle (wallet1 is creator and member #1)
      const createResult = simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [
          Cl.stringAscii("Integration Test"),
          Cl.uint(10000000), // 10 STX
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );
      expect(createResult.result).toBeOk(Cl.uint(1));

      // 4. Members join (circle auto-activates on 3rd member)
      expect(
        simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2).result,
      ).toBeOk(Cl.uint(2));
      expect(
        simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3).result,
      ).toBeOk(Cl.uint(3));

      // Verify circle is now active
      const circleData = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect((circleData.result as any).value.value.status).toBeUint(1); // STATUS_ACTIVE

      // ========================
      // ROUND 0 - wallet1 receives payout
      // ========================

      // 5. All members contribute for round 0
      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1).result,
      ).toBeOk(Cl.bool(true));
      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet2).result,
      ).toBeOk(Cl.bool(true));
      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet3).result,
      ).toBeOk(Cl.bool(true));

      // 6. Process payout for round 0 (wallet1 = position 0 in list)
      const payout0 = simnet.callPublicFn(
        "halo-circle",
        "process-payout",
        [Cl.uint(1)],
        deployer,
      );
      expect(payout0.result).toHaveClarityType(ClarityType.ResponseOk);

      // Verify round advanced
      const afterRound0 = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect((afterRound0.result as any).value.value["current-round"]).toBeUint(1);

      // ========================
      // ROUND 1 - wallet2 receives payout
      // ========================

      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1).result,
      ).toBeOk(Cl.bool(true));
      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet2).result,
      ).toBeOk(Cl.bool(true));
      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet3).result,
      ).toBeOk(Cl.bool(true));

      const payout1 = simnet.callPublicFn(
        "halo-circle",
        "process-payout",
        [Cl.uint(1)],
        deployer,
      );
      expect(payout1.result).toHaveClarityType(ClarityType.ResponseOk);

      // ========================
      // ROUND 2 (final) - wallet3 receives payout, circle completes
      // ========================

      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1).result,
      ).toBeOk(Cl.bool(true));
      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet2).result,
      ).toBeOk(Cl.bool(true));
      expect(
        simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet3).result,
      ).toBeOk(Cl.bool(true));

      const payout2 = simnet.callPublicFn(
        "halo-circle",
        "process-payout",
        [Cl.uint(1)],
        deployer,
      );
      expect(payout2.result).toHaveClarityType(ClarityType.ResponseOk);

      // 7. Verify circle is COMPLETED
      const finalCircle = simnet.callReadOnlyFn(
        "halo-circle",
        "get-circle",
        [Cl.uint(1)],
        deployer,
      );
      expect((finalCircle.result as any).value.value.status).toBeUint(3); // STATUS_COMPLETED
    });
  });

  describe("credit scoring integration", () => {
    it("credit scores update through circle contributions", () => {
      // Setup
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(2)], wallet2);
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(3)], wallet3);
      simnet.callPublicFn(
        "halo-credit",
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle`)],
        deployer,
      );
      setupVault();
      depositCollateral(wallet1, 50_000000);
      depositCollateral(wallet2, 50_000000);
      depositCollateral(wallet3, 50_000000);

      // Check initial score
      const initialScore = simnet.callReadOnlyFn(
        "halo-credit",
        "get-score-by-wallet",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(initialScore.result).toBeOk(Cl.uint(300));

      // Create and fill circle
      simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [
          Cl.stringAscii("Credit Test"),
          Cl.uint(10000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "join-circle", [Cl.uint(1)], wallet3);

      // Contribute and process round 0
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet1);
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet2);
      simnet.callPublicFn("halo-circle", "contribute-stx", [Cl.uint(1)], wallet3);
      simnet.callPublicFn("halo-circle", "process-payout", [Cl.uint(1)], deployer);

      // Check that credit score has been updated (should be > 300 after on-time payment)
      const updatedScore = simnet.callReadOnlyFn(
        "halo-credit",
        "get-score-by-wallet",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(updatedScore.result).toHaveClarityType(ClarityType.ResponseOk);
      const scoreValue = Number((updatedScore.result as any).value.value);
      expect(scoreValue).toBeGreaterThan(300);

      // Check payment history exists
      const history = simnet.callReadOnlyFn(
        "halo-credit",
        "get-payment-history",
        [uniqueId(1)],
        deployer,
      );
      const historyList = (history.result as any).value;
      expect(historyList.length).toBeGreaterThan(0);
    });
  });

  describe("identity-credit cross-reference", () => {
    it("get-credit-data-by-wallet works through identity lookup", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);

      // Record a payment for the user
      simnet.callPublicFn(
        "halo-credit",
        "record-payment",
        [uniqueId(1), Cl.uint(1), Cl.uint(0), Cl.uint(5000000), Cl.bool(true)],
        deployer,
      );

      // Query by wallet (crosses identity -> credit)
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-credit-data-by-wallet",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const data = (result as any).value.value;
      expect(data["total-payments"]).toBeUint(1);
    });

    it("get-credit-data-by-wallet returns none for unbound wallet", () => {
      const { result } = simnet.callReadOnlyFn(
        "halo-credit",
        "get-credit-data-by-wallet",
        [Cl.principal(wallet2)],
        deployer,
      );
      expect(result).toBeNone();
    });
  });

  describe("circle requires identity verification", () => {
    it("circle operations fail without identity binding", () => {
      // Try to create circle without identity
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [
          Cl.stringAscii("No Identity"),
          Cl.uint(10000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(210)); // ERR_NOT_VERIFIED
    });

    it("only verified users can participate in circles", () => {
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(1)], wallet1);
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(2)], wallet2);
      simnet.callPublicFn("halo-identity", "bind-wallet", [uniqueId(3)], wallet3);
      simnet.callPublicFn(
        "halo-credit",
        "authorize-contract",
        [Cl.principal(`${deployer}.halo-circle`)],
        deployer,
      );
      setupVault();
      depositCollateral(wallet1, 50_000000);

      // wallet1 creates circle
      simnet.callPublicFn(
        "halo-circle",
        "create-circle",
        [
          Cl.stringAscii("Verified Only"),
          Cl.uint(10000000),
          Cl.uint(3),
          Cl.uint(144),
          Cl.uint(72),
        ],
        wallet1,
      );

      // Unverified wallet4 cannot join
      const wallet4 = accounts.get("wallet_4")!;
      const { result } = simnet.callPublicFn(
        "halo-circle",
        "join-circle",
        [Cl.uint(1)],
        wallet4,
      );
      expect(result).toBeErr(Cl.uint(210)); // ERR_NOT_VERIFIED
    });
  });
});
