# Halo Protocol: POC Implementation Plan (Stacks L2)

**Version:** 1.0.0  
**Date:** February 2026  
**Target:** Stacks Mainnet  
**Timeline:** 10 Weeks

---

## Executive Summary

### Objective
Deploy a production-ready Proof of Concept of Halo Protocol on Stacks Mainnet demonstrating on-chain lending circles with social identity verification (no KYC) and credit scoring.

### Timeline Overview

| Phase | Weeks | Focus |
|-------|-------|-------|
| Foundation | 1-2 | Clarinet setup, infrastructure, auth |
| Identity | 3-4 | Social auth, unique ID, wallet binding |
| Smart Contracts | 5-6 | Circle & credit contracts (Clarity) |
| Backend | 7-8 | API services, indexer |
| Frontend | 9-10 | Web application, testing, deployment |

### Budget Estimate: ~$45,000 USD

| Category | Amount |
|----------|--------|
| Development (10 weeks × 2 devs) | $30,000 |
| Infrastructure (3 months) | $1,500 |
| Security Review | $5,000 |
| Contingency | $5,000 |
| Stacks gas/testing | $2,500 |

---

## POC Scope

### In Scope (MVP)

**Identity System (No KYC)**
- Social login (Google, GitHub, Email)
- Unique ID generation (deterministic hash)
- Permanent wallet binding (Leather/Xverse)
- Sybil prevention via social auth

**Lending Circles**
- Create circle (3-10 members)
- Join with identity verification
- STX or xUSD contributions ($10-$500)
- Rotation-based payouts
- Late payment tracking

**Credit Scoring**
- Payment history tracking
- Basic score calculation (300-850)
- On-chain storage (Clarity)
- SDK query API

**Web Application**
- Registration flow
- Dashboard
- Circle management
- Credit score display

### Out of Scope (Phase 2+)
- KYC integration (Fractal, etc.)
- Auction/need-based payouts
- Collateral system
- Mobile app
- Fiat on/off ramps
- sBTC integration

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Stacks (Clarity) |
| Smart Contracts | Clarity |
| Backend | Node.js + TypeScript |
| Database | PostgreSQL (Supabase) |
| Cache | Redis (Upstash) |
| Frontend | Next.js 14 + React |
| Auth | NextAuth.js |
| Hosting | Vercel + Railway |
| Wallet | Leather / Xverse |

### Smart Contracts

**1. halo-identity.clar**
- Wallet binding (one-time, permanent)
- Bidirectional mapping (ID ↔ Wallet)
- Registration verification

**2. halo-circle.clar**
- Circle creation & configuration
- Member management
- Contribution tracking
- Payout execution

**3. halo-credit.clar**
- Score storage & calculation
- Payment recording
- SDK query interface

### Credit Score Algorithm

```
Base Score: 300
Maximum: 850

Components:
├─ Payment History (40%) - max 220 pts
├─ Circle Completion (25%) - max 137 pts
├─ Volume (15%) - max 83 pts
├─ Tenure (10%) - max 55 pts
└─ Consistency (10%) - max 55 pts
```

---

## Phase Details

### Phase 1: Foundation (Week 1-2)

**Week 1: Project Setup**

```bash
# Initialize Clarinet project
clarinet new halo-protocol
cd halo-protocol

# Create contracts
clarinet contract new halo-identity
clarinet contract new halo-circle
clarinet contract new halo-credit

# Initialize Next.js frontend
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install @stacks/connect @stacks/transactions
```

Tasks:
- [ ] Clarinet project structure
- [ ] Deployment configurations (testnet, mainnet)
- [ ] Next.js frontend scaffold
- [ ] Supabase database setup
- [ ] CI/CD pipeline (GitHub Actions)

**Week 2: Core Libraries & Auth**

Tasks:
- [ ] Stacks.js integration library
- [ ] Database schema & migrations
- [ ] NextAuth.js setup (Google, GitHub, Email)
- [ ] JWT token management
- [ ] API route structure

```typescript
// lib/auth.ts - NextAuth configuration
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import EmailProvider from 'next-auth/providers/email';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.socialProvider = account.provider;
        token.socialId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.socialProvider = token.socialProvider;
      session.user.socialId = token.socialId;
      return session;
    },
  },
};
```

### Phase 2: Identity (Week 3-4)

**Week 3: Social Auth & Unique ID**

Tasks:
- [ ] Google OAuth integration
- [ ] GitHub OAuth integration
- [ ] Email magic link auth
- [ ] Unique ID generation service
- [ ] Duplicate detection

```typescript
// services/identity.ts
import { createHash } from 'crypto';

export function generateUniqueId(
  provider: string,
  socialId: string,
  email: string
): string {
  const salt = process.env.HALO_ID_SALT!;
  const timestamp = Date.now();
  
  const input = [
    provider,
    socialId,
    email.toLowerCase(),
    timestamp.toString(),
    salt,
  ].join('|');
  
  const hash = createHash('sha256').update(input).digest('hex');
  return `0x${hash}`;
}
```

**Week 4: Wallet Binding**

Tasks:
- [ ] halo-identity.clar smart contract
- [ ] Clarinet unit tests for identity
- [ ] Wallet connection UI (Leather/Xverse)
- [ ] Binding transaction flow
- [ ] Backend binding confirmation

```clarity
;; Test: Identity contract binding
(define-test (test-bind-wallet)
  (let (
    (unique-id 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef)
    (wallet tx-sender)
  )
    ;; Bind wallet
    (unwrap! (contract-call? .halo-identity bind-wallet unique-id) (err "Failed to bind"))
    
    ;; Verify mapping
    (asserts! (is-eq (some wallet) (contract-call? .halo-identity get-wallet-by-id unique-id)) 
              (err "Wallet mapping failed"))
    
    ;; Verify reverse mapping
    (asserts! (is-eq (some unique-id) (contract-call? .halo-identity get-id-by-wallet wallet)) 
              (err "ID mapping failed"))
    
    ;; Verify duplicate prevention
    (asserts! (is-err (contract-call? .halo-identity bind-wallet unique-id)) 
              (err "Duplicate binding should fail"))
    
    (ok true)
  )
)
```

### Phase 3: Smart Contracts (Week 5-6)

**Week 5: Circle Contract**

Tasks:
- [ ] halo-circle.clar implementation
- [ ] Circle creation logic
- [ ] Member join flow
- [ ] Contribution handling
- [ ] Comprehensive Clarinet tests

```clarity
;; tests/halo-circle_test.ts
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: "Can create and join circle",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // First bind wallets
    let block = chain.mineBlock([
      Tx.contractCall('halo-identity', 'bind-wallet', [
        types.buff(Buffer.from('1234...', 'hex'))
      ], wallet1.address),
      Tx.contractCall('halo-identity', 'bind-wallet', [
        types.buff(Buffer.from('5678...', 'hex'))
      ], wallet2.address),
    ]);
    
    // Create circle
    block = chain.mineBlock([
      Tx.contractCall('halo-circle', 'create-circle', [
        types.ascii("Test Circle"),
        types.uint(100_000_000), // 100 STX
        types.uint(3),           // 3 members
        types.uint(4320),        // ~30 days
        types.uint(144),         // ~1 day grace
      ], wallet1.address),
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1);
    
    // Join circle
    block = chain.mineBlock([
      Tx.contractCall('halo-circle', 'join-circle', [
        types.uint(1),
      ], wallet2.address),
    ]);
    
    block.receipts[0].result.expectOk();
  },
});
```

**Week 6: Credit Contract**

Tasks:
- [ ] halo-credit.clar implementation
- [ ] Score calculation logic
- [ ] Payment recording
- [ ] Cross-contract integration
- [ ] SDK read-only functions
- [ ] Full test coverage

```clarity
;; tests/halo-credit_test.ts
Clarinet.test({
  name: "Credit score updates correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // Setup: bind wallet and authorize circle contract
    // ...
    
    // Record on-time payment
    let block = chain.mineBlock([
      Tx.contractCall('halo-credit', 'record-payment', [
        types.buff(uniqueId),
        types.uint(1),           // circle-id
        types.uint(0),           // round
        types.uint(100_000_000), // amount
        types.bool(true),        // on-time
      ], circleContract),
    ]);
    
    // Check score increased
    const scoreResult = chain.callReadOnlyFn(
      'halo-credit',
      'get-credit-score',
      [types.buff(uniqueId)],
      deployer.address
    );
    
    scoreResult.result.expectOk().expectSome();
    // Score should be > 300 (base)
  },
});
```

### Phase 4: Backend (Week 7-8)

**Week 7: API Services**

Tasks:
- [ ] Identity service endpoints
- [ ] Circle service endpoints
- [ ] Credit service endpoints
- [ ] Notification service (Resend emails)
- [ ] API documentation (OpenAPI)

```typescript
// app/api/circles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await req.json();
  const { name, contributionAmount, totalMembers, roundDurationDays } = body;
  
  // Validate
  if (totalMembers < 3 || totalMembers > 10) {
    return NextResponse.json(
      { error: 'Members must be between 3 and 10' }, 
      { status: 400 }
    );
  }
  
  // Generate invite code
  const inviteCode = generateInviteCode();
  
  // Create pending circle
  const circle = await db.circle.create({
    data: {
      creatorId: session.user.id,
      name,
      contributionAmount,
      totalMembers,
      roundDuration: roundDurationDays * 4320,
      inviteCode,
      status: 'pending_creation',
    },
  });
  
  return NextResponse.json({
    circleId: circle.id,
    inviteCode,
    inviteLink: `${process.env.NEXT_PUBLIC_URL}/join/${inviteCode}`,
  });
}
```

**Week 8: Infrastructure & Indexer**

Tasks:
- [ ] Stacks event indexer
- [ ] Background job processing
- [ ] API rate limiting
- [ ] Monitoring setup (Sentry)
- [ ] Health check endpoints

```typescript
// services/indexer.ts
import { connectWebSocketClient } from '@stacks/blockchain-api-client';

export class StacksIndexer {
  private wsClient: any;
  
  async start() {
    this.wsClient = await connectWebSocketClient(
      process.env.STACKS_WS_URL!
    );
    
    // Subscribe to Halo contract events
    this.wsClient.subscribeAddressTransactions(
      process.env.CONTRACT_ADDRESS!,
      async (event: any) => {
        await this.processEvent(event);
      }
    );
  }
  
  private async processEvent(event: any) {
    // Parse contract call events
    if (event.tx.contract_call) {
      const { function_name, function_args } = event.tx.contract_call;
      
      switch (function_name) {
        case 'bind-wallet':
          await this.handleWalletBound(event);
          break;
        case 'create-circle':
          await this.handleCircleCreated(event);
          break;
        case 'contribute':
          await this.handleContribution(event);
          break;
        // ... more handlers
      }
    }
  }
}
```

### Phase 5: Frontend & Launch (Week 9-10)

**Week 9: Core Features**

Tasks:
- [ ] Landing page
- [ ] Authentication flow
- [ ] Wallet connection modal
- [ ] Dashboard UI
- [ ] Circle creation wizard
- [ ] Circle detail view
- [ ] Contribution flow

```tsx
// components/WalletConnect.tsx
'use client';

import { useConnect } from '@stacks/connect-react';
import { useState } from 'react';

export function WalletConnect({ uniqueId }: { uniqueId: string }) {
  const { doConnect } = useConnect();
  const [isConnecting, setIsConnecting] = useState(false);
  
  const handleConnect = async () => {
    setIsConnecting(true);
    
    doConnect({
      userSession: userSession,
      onFinish: async (data) => {
        const address = data.userData.profile.stxAddress.mainnet;
        
        // Submit binding transaction
        await submitBindingTx(uniqueId, address);
        
        setIsConnecting(false);
      },
      onCancel: () => {
        setIsConnecting(false);
      },
    });
  };
  
  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="btn-primary"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
```

**Week 10: Polish & Deployment**

Tasks:
- [ ] Mobile responsiveness
- [ ] Error handling & loading states
- [ ] Integration testing (Playwright)
- [ ] Testnet deployment
- [ ] Mainnet deployment
- [ ] DNS & SSL configuration
- [ ] Launch monitoring

---

## Testing Strategy

### Unit Tests (Clarity)

```bash
# Run all Clarity tests
clarinet test

# Run with coverage
clarinet test --coverage

# Generate coverage report
clarinet test --coverage-report
```

Target: **>90% coverage**

### Integration Tests (TypeScript)

```typescript
// tests/integration/circle-flow.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { testClient } from './helpers';

describe('Circle Flow', () => {
  let creatorToken: string;
  let memberToken: string;
  let circleId: string;
  
  beforeAll(async () => {
    // Setup test users
    creatorToken = await testClient.createTestUser('creator@test.com');
    memberToken = await testClient.createTestUser('member@test.com');
  });
  
  it('should create circle', async () => {
    const res = await testClient.post('/api/circles', {
      name: 'Test Circle',
      contributionAmount: 100_000_000,
      totalMembers: 3,
      roundDurationDays: 30,
    }, creatorToken);
    
    expect(res.status).toBe(200);
    expect(res.body.inviteCode).toBeDefined();
    circleId = res.body.circleId;
  });
  
  it('should join circle', async () => {
    const circle = await testClient.get(`/api/circles/${circleId}`, creatorToken);
    
    const res = await testClient.post(
      `/api/circles/${circleId}/join`,
      {},
      memberToken
    );
    
    expect(res.status).toBe(200);
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test('complete onboarding flow', async ({ page }) => {
  // Go to landing
  await page.goto('/');
  await expect(page.getByText('Join the Future of Credit')).toBeVisible();
  
  // Click sign up
  await page.click('text=Get Started');
  
  // OAuth mock or test credentials
  await page.click('text=Continue with Google');
  
  // Should see wallet connect
  await expect(page.getByText('Connect Your Wallet')).toBeVisible();
  
  // Mock wallet connection
  // ...
  
  // Should reach dashboard
  await expect(page.url()).toContain('/dashboard');
});
```

---

## Deployment Commands

### Testnet Deployment

```bash
# Deploy contracts to testnet
clarinet deployments generate --testnet
clarinet deployments apply -p deployments/testnet.halo-protocol-testnet.yaml

# Verify deployment
clarinet console
>> (contract-call? .halo-identity get-total-users)
```

### Mainnet Deployment

```bash
# Generate mainnet deployment plan
clarinet deployments generate --mainnet

# Review and apply (requires STX for fees)
clarinet deployments apply -p deployments/mainnet.halo-protocol-mainnet.yaml --network mainnet

# Contract addresses will be:
# SP[DEPLOYER].halo-identity
# SP[DEPLOYER].halo-circle
# SP[DEPLOYER].halo-credit
```

### Frontend Deployment

```bash
# Deploy to Vercel
vercel --prod

# Environment variables needed:
# - NEXT_PUBLIC_CONTRACT_ADDRESS
# - NEXT_PUBLIC_STACKS_NETWORK (mainnet/testnet)
# - NEXTAUTH_SECRET
# - GOOGLE_CLIENT_ID / SECRET
# - GITHUB_CLIENT_ID / SECRET
# - DATABASE_URL
# - HALO_ID_SALT
```

---

## Security Checklist

### Pre-Launch Requirements

**Smart Contracts**
- [ ] All Clarinet tests passing
- [ ] 90%+ test coverage
- [ ] Fuzz tests with Rendezvous
- [ ] Manual code review
- [ ] Admin functions protected
- [ ] No hardcoded values

**Backend**
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized)
- [ ] XSS protection
- [ ] CORS properly configured
- [ ] Secrets in environment variables

**Frontend**
- [ ] No secrets in client code
- [ ] CSP headers configured
- [ ] Transaction simulation before signing
- [ ] Error messages don't leak info

---

## Success Metrics

### Launch (30 Days)

| Metric | Target |
|--------|--------|
| Registered users | 200 |
| Wallets bound | 150 |
| Circles created | 15 |
| Active circles | 10 |
| TVL | $10,000 |
| Transaction success | >99% |

### Growth (90 Days)

| Metric | Target |
|--------|--------|
| Monthly active users | 500 |
| Circles completed | 5 |
| Default rate | <2% |
| SDK integrations | 2 |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Smart contract bug | High | Extensive testing, phased rollout |
| Stacks network congestion | Medium | Transaction retry logic, queue system |
| Social auth provider outage | Medium | Multiple provider support |
| Sybil attacks | Medium | Email uniqueness, rate limiting |
| Low adoption | Medium | Community building, incentives |

---

## Launch Checklist

### Pre-Launch
- [ ] All tests passing (unit, integration, e2e)
- [ ] Security review complete
- [ ] Documentation ready
- [ ] Support channels active (Discord)
- [ ] Monitoring configured

### Launch Day
- [ ] Testnet deployment verified
- [ ] Mainnet contracts deployed
- [ ] Frontend deployed to Vercel
- [ ] DNS configured
- [ ] SSL valid
- [ ] Health checks passing
- [ ] Team on standby

### Post-Launch
- [ ] Monitor error rates
- [ ] Track registrations
- [ ] Gather user feedback
- [ ] Fix critical bugs <24h
- [ ] Daily standups first week

---

## Project Structure

```
halo-protocol/
├── contracts/
│   ├── halo-identity.clar
│   ├── halo-circle.clar
│   └── halo-credit.clar
├── tests/
│   ├── halo-identity_test.ts
│   ├── halo-circle_test.ts
│   └── halo-credit_test.ts
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── circles/
│   │   │   └── credit/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── circles/
│   │   │   └── credit/
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   │   ├── stacks.ts
│   │   ├── db.ts
│   │   └── auth.ts
│   └── package.json
├── deployments/
│   ├── testnet.yaml
│   └── mainnet.yaml
├── Clarinet.toml
└── README.md
```

---

## Resources

### Stacks Documentation
- [Clarity Book](https://book.clarity-lang.org/)
- [Stacks.js](https://github.com/hirosystems/stacks.js)
- [Clarinet](https://github.com/hirosystems/clarinet)
- [Hiro API](https://docs.hiro.so/)

### Best Practices
- [Clarity Best Practices](https://book.clarity-lang.org/ch13-01-best-practices.html)
- [Contract Upgradability](https://book.clarity-lang.org/ch13-02-upgradability.html)
- [Rendezvous Fuzz Testing](https://stacks-network.github.io/rendezvous/)

---

**Document Control**

| Version | Date | Author |
|---------|------|--------|
| 1.0.0 | Feb 2026 | XXIX Labs |
