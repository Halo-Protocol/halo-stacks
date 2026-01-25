# Halo Protocol: MVP Product Requirements Document (Stacks L2)

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Author:** XXIX Labs  
**Target Launch:** 10 Weeks  
**Status:** Ready for Development

---

## Executive Summary

### What We're Building

A web app where users can:
1. Sign up with social auth (Google/GitHub/Email) - NO KYC
2. Get a unique identity (deterministic from social auth)
3. Connect and bind a Stacks wallet (permanent, one-time)
4. Create or join a savings circle with friends
5. Make monthly STX/xUSD contributions
6. Receive payouts on their turn
7. Build a credit score from payment history

### What We're NOT Building (Yet)

- KYC verification
- Mobile app
- Multiple payout methods (auction, bidding)
- Collateral/deposits
- Fiat on/off ramps
- sBTC integration
- Peer attestations
- Public circle discovery

### MVP Success Criteria

| Metric | Target |
|--------|--------|
| Completed signups (social + wallet) | 100 users |
| Circles created | 10 |
| At least one circle completes | 1 |
| Zero critical bugs | 0 |
| User can explain product in 1 sentence | Yes |

---

## Table of Contents

1. [Core User Flow](#1-core-user-flow)
2. [MVP Features](#2-mvp-features)
3. [Screen-by-Screen Specifications](#3-screen-by-screen-specifications)
4. [Data Models](#4-data-models)
5. [API Endpoints](#5-api-endpoints)
6. [Smart Contract Functions](#6-smart-contract-functions)
7. [Technical Constraints](#7-technical-constraints)
8. [Out of Scope](#8-out-of-scope)
9. [Launch Checklist](#9-launch-checklist)

---

## 1. Core User Flow

### 1.1 The Happy Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MVP USER JOURNEY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ONBOARDING (One-time, ~3 minutes)                                          │
│  ══════════════════════════════════                                         │
│                                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                  │
│  │ Landing │───▶│ Sign Up │───▶│ Connect │───▶│  Bind   │                  │
│  │ Page    │    │ (Social)│    │ Wallet  │    │ Wallet  │                  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘                  │
│       │              │              │              │                        │
│       ▼              ▼              ▼              ▼                        │
│   "Build your    "One click"    "Connect        "Sign message              │
│    credit"       Google/GitHub   Leather"        + On-chain TX"            │
│                                                     │                        │
│                                                     ▼                        │
│                                              ┌───────────┐                  │
│                                              │ Dashboard │                  │
│                                              │ (Empty)   │                  │
│                                              └───────────┘                  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  CIRCLE CREATION (Organizer)                                                │
│  ═══════════════════════════                                                │
│                                                                              │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐                           │
│  │ Click     │───▶│ Set       │───▶│ Get       │                           │
│  │ "Create"  │    │ Parameters│    │ Invite    │                           │
│  └───────────┘    └───────────┘    │ Link      │                           │
│                         │          └───────────┘                           │
│                         ▼                │                                  │
│                   Name: "Office Fund"    ▼                                  │
│                   Amount: 100 STX/month Share with                          │
│                   Members: 5            friends                             │
│                   Duration: 30 days                                         │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  JOINING (Member)                                                           │
│  ════════════════                                                           │
│                                                                              │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐                           │
│  │ Click     │───▶│ Review    │───▶│ Confirm   │                           │
│  │ Invite    │    │ Terms     │    │ Join      │                           │
│  │ Link      │    │           │    │           │                           │
│  └───────────┘    └───────────┘    └───────────┘                           │
│                         │                │                                  │
│                         ▼                ▼                                  │
│                   See: amount,      Added to                                │
│                   members,          circle,                                 │
│                   schedule          assigned                                │
│                                     position                                │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  MONTHLY CYCLE (All Members)                                                │
│  ═══════════════════════════                                                │
│                                                                              │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐         │
│  │ Get       │───▶│ Open App  │───▶│ Click     │───▶│ Approve   │         │
│  │ Reminder  │    │ See "Pay" │    │ "Pay Now" │    │ in Wallet │         │
│  │ (Email)   │    │           │    │           │    │           │         │
│  └───────────┘    └───────────┘    └───────────┘    └───────────┘         │
│                                                           │                 │
│                                                           ▼                 │
│                                                    ┌───────────┐           │
│                                                    │ Done!     │           │
│                                                    │ Score +10 │           │
│                                                    └───────────┘           │
│                                                                              │
│  When all pay ──▶ Payout sent to this month's recipient automatically      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Interactions (Simplified)

| Action | Clicks | Time |
|--------|--------|------|
| Sign up | 1 (Google OAuth) | 5 sec |
| Connect wallet | 2 | 30 sec |
| Bind wallet | 2 (confirm + TX) | 1-2 min |
| Create circle | 4 (form steps) | 2 min |
| Join circle | 2 | 30 sec + TX |
| Make payment | 2 | 20 sec + TX |

---

## 2. MVP Features

### 2.1 Feature Priority Matrix

| Feature | Must Have | Nice to Have | Not in MVP |
|---------|:---------:|:------------:|:----------:|
| Google sign-up | ✅ | | |
| GitHub sign-up | ✅ | | |
| Email sign-up | | ✅ | |
| Wallet connect (Leather) | ✅ | | |
| Wallet connect (Xverse) | | ✅ | |
| Permanent wallet binding | ✅ | | |
| Create circle | ✅ | | |
| Private invite link | ✅ | | |
| Public circle discovery | | | ❌ |
| Join circle | ✅ | | |
| View circle status | ✅ | | |
| Make contribution (STX) | ✅ | | |
| Make contribution (xUSD) | | ✅ | |
| Automatic payout | ✅ | | |
| Basic credit score | ✅ | | |
| Score breakdown UI | | ✅ | |
| Email reminders | ✅ | | |
| Push notifications | | | ❌ |
| KYC verification | | | ❌ |
| Mobile app | | | ❌ |

### 2.2 MVP Feature Specifications

---

#### FEATURE 1: User Onboarding (Social Auth + Wallet)

**Goal:** Get user from landing page to bound wallet in under 5 minutes.

**Flow:**
```
Landing → Social OAuth → Generate ID → Wallet Connect → Wallet Bind → Dashboard
```

**Requirements:**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| ONB-1 | Google OAuth login | User clicks "Continue with Google", OAuth completes, user logged in |
| ONB-2 | GitHub OAuth login | User clicks "Continue with GitHub", OAuth completes, user logged in |
| ONB-3 | Unique ID generation | System generates unique_id from social auth data, prevents duplicates |
| ONB-4 | Wallet connection | User connects Leather wallet with one click |
| ONB-5 | Wallet binding | User signs message + confirms on-chain TX, binding recorded |
| ONB-6 | Binding is permanent | System shows warning, user confirms, cannot change later |

**Error States:**
- Social auth fails → Show error, allow retry
- Email already registered → "This email is already registered. Please sign in."
- Wallet already bound → "This wallet is already linked to another account"
- Binding TX fails → Show error, allow retry with same wallet

---

#### FEATURE 2: Create Circle

**Goal:** Organizer creates a circle and gets an invite link in under 2 minutes.

**Flow:**
```
Dashboard → Create Circle → Set Parameters → Confirm TX → Get Link
```

**Circle Parameters (MVP):**

| Parameter | Type | Constraints | Required |
|-----------|------|-------------|----------|
| name | string | 3-30 characters | Yes |
| contribution_amount | number | 10-5000 STX | Yes |
| member_count | select | 3, 4, 5, 6, 7, 8, 9, 10 | Yes |
| round_duration | select | 7, 14, 30 days | Yes |

**Fixed Parameters (MVP):**
- Payout method: Rotation (fixed, organizer is position 1)
- Visibility: Private only (invite link required)
- Token: STX only (xUSD nice-to-have)
- Grace period: 1 day (fixed)

**Create Circle Screen Mockup:**
```
┌────────────────────────────────────────┐
│          Create a New Circle           │
├────────────────────────────────────────┤
│                                        │
│  Circle Name                           │
│  ┌──────────────────────────────────┐ │
│  │ Office Savings Fund               │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Contribution Amount (STX)             │
│  ┌──────────────────────────────────┐ │
│  │ 100                               │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Number of Members                     │
│  ┌──────────────────────────────────┐ │
│  │ 5 members              ▼         │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Round Duration                        │
│  ┌──────────────────────────────────┐ │
│  │ 30 days                ▼         │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ═══════════════════════════════════  │
│  Summary                               │
│  • Each member pays: 100 STX/round    │
│  • Total pot per round: 500 STX       │
│  • Circle duration: 5 months          │
│  ═══════════════════════════════════  │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │         Create Circle             │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

---

#### FEATURE 3: Join Circle

**Goal:** Member joins via invite link in under 1 minute.

**Flow:**
```
Invite Link → Sign Up (if new) → Review Circle → Confirm Join TX → Circle Dashboard
```

**Join Circle Screen:**
```
┌────────────────────────────────────────┐
│      You're Invited to Join            │
│         "Office Savings Fund"          │
├────────────────────────────────────────┤
│                                        │
│  Circle Details                        │
│  ─────────────────────────────────    │
│  Organizer: Alice S.                   │
│  Members: 3 of 5 joined                │
│  Contribution: 100 STX per round       │
│  Duration: 30 days per round           │
│  Total rounds: 5                       │
│                                        │
│  Current Members                       │
│  ─────────────────────────────────    │
│  1. Alice S. (Organizer)               │
│  2. Bob J.                             │
│  3. Carol M.                           │
│  4. [Open slot]                        │
│  5. [Open slot]                        │
│                                        │
│  ⚠️ Once you join, you commit to      │
│  making 5 monthly payments of 100 STX  │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │       Join This Circle            │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Already a member? View circle →       │
│                                        │
└────────────────────────────────────────┘
```

---

#### FEATURE 4: Circle Dashboard

**Goal:** Members see circle status, make payments, track progress.

**Circle Dashboard Screen:**
```
┌────────────────────────────────────────┐
│         Office Savings Fund            │
│         Round 2 of 5 • Active          │
├────────────────────────────────────────┤
│                                        │
│  This Round's Recipient                │
│  ┌──────────────────────────────────┐ │
│  │     🏆 Bob J. (Position #2)      │ │
│  │     Payout: 500 STX              │ │
│  │     When: After all contribute    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Your Payment Status                   │
│  ┌──────────────────────────────────┐ │
│  │  ⏳ Due in 5 days                │ │
│  │  Amount: 100 STX                 │ │
│  │                                   │ │
│  │  ┌────────────────────────────┐  │ │
│  │  │       Pay Now              │  │ │
│  │  └────────────────────────────┘  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Member Contributions                  │
│  ─────────────────────────────────    │
│  ✅ Alice S.     100 STX   On time    │
│  ✅ Bob J.       100 STX   On time    │
│  ⏳ Carol M.     -         Pending    │
│  ⏳ You          -         Pending    │
│  ⏳ David K.     -         Pending    │
│                                        │
│  3 of 5 contributions received         │
│  ▓▓▓▓▓▓▓░░░░░ 60%                     │
│                                        │
│  Payout Schedule                       │
│  ─────────────────────────────────    │
│  Round 1: Alice S. ✅ Received 500 STX │
│  Round 2: Bob J. ⏳ Current round      │
│  Round 3: Carol M. 🔜 Upcoming         │
│  Round 4: You 🔜 Upcoming              │
│  Round 5: David K. 🔜 Upcoming         │
│                                        │
└────────────────────────────────────────┘
```

---

#### FEATURE 5: Credit Score

**Goal:** Users see their credit score and what affects it.

**Credit Score Dashboard:**
```
┌────────────────────────────────────────┐
│           Your Credit Score            │
├────────────────────────────────────────┤
│                                        │
│           ┌─────────────┐              │
│           │             │              │
│           │     412     │              │
│           │   /850      │              │
│           │             │              │
│           └─────────────┘              │
│              FAIR                      │
│                                        │
│  Score Breakdown                       │
│  ─────────────────────────────────    │
│  Payment History     ▓▓▓▓▓▓░░░░  62%  │
│  Circle Completion   ▓▓▓▓▓░░░░░  50%  │
│  Volume             ▓▓▓░░░░░░░  25%  │
│  Tenure             ▓▓░░░░░░░░  20%  │
│  Consistency        ▓▓▓▓▓▓▓▓░░  80%  │
│                                        │
│  Activity Summary                      │
│  ─────────────────────────────────    │
│  Total payments: 8                     │
│  On-time: 7 (87.5%)                   │
│  Late: 1                               │
│  Circles completed: 1                  │
│  Active circles: 1                     │
│                                        │
│  Recent Activity                       │
│  ─────────────────────────────────    │
│  ✅ Feb 1 - Payment +10 pts           │
│  ✅ Jan 1 - Payment +10 pts           │
│  ⚠️ Dec 1 - Late payment -5 pts       │
│  ✅ Nov 1 - Payment +10 pts           │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │      How to Improve Score        │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

---

## 3. Screen-by-Screen Specifications

### 3.1 Landing Page

**URL:** `/`

**Elements:**
- Hero: "Build Credit Through Community"
- Subheadline: "Join savings circles, make payments, build your on-chain credit score"
- CTA: "Get Started" → `/register`
- How it works section (3 steps)
- Social proof (waitlist count)
- Footer with links

### 3.2 Registration Page

**URL:** `/register`

**Elements:**
- "Create Your Account"
- Google OAuth button
- GitHub OAuth button
- "Or continue with email" (nice-to-have)
- "Already have an account? Sign in"

### 3.3 Wallet Connection Page

**URL:** `/connect-wallet`

**Shown after:** Social auth complete

**Elements:**
- "Connect Your Wallet"
- Explanation: "Link your Stacks wallet to your Halo identity"
- Warning: "⚠️ This binding is permanent and cannot be changed"
- Leather wallet button
- Xverse wallet button (nice-to-have)
- Cancel button (returns to landing)

### 3.4 Wallet Binding Confirmation

**URL:** `/bind-wallet`

**Shown after:** Wallet connected

**Elements:**
- "Confirm Wallet Binding"
- Display wallet address
- Checkbox: "I understand this is permanent"
- "Bind Wallet" button → Opens wallet for TX signing
- Loading state during TX
- Success → Redirect to dashboard

### 3.5 Dashboard

**URL:** `/dashboard`

**Elements:**
- Navigation: Dashboard, Circles, Credit Score
- Credit score card (click for details)
- Active circles list
- "Create Circle" button
- Empty state if no circles

### 3.6 Create Circle

**URL:** `/circles/create`

**Multi-step form:**
1. Name and amount
2. Members and duration
3. Review and confirm
4. TX confirmation
5. Success + invite link

### 3.7 Join Circle

**URL:** `/join/[inviteCode]`

**Elements:**
- Circle preview (if logged in)
- "Sign up to join" (if not logged in)
- Join confirmation
- TX confirmation
- Success → Redirect to circle

### 3.8 Circle Detail

**URL:** `/circles/[id]`

**Elements:**
- Circle status header
- Current round info
- Payment CTA (if due)
- Member list with status
- Payout schedule
- Circle history (collapsed)

### 3.9 Credit Score

**URL:** `/credit`

**Elements:**
- Large score display
- Score category (Poor/Fair/Good/Excellent)
- Component breakdown
- Activity history
- Tips to improve

---

## 4. Data Models

### 4.1 Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  social_provider VARCHAR(50) NOT NULL,
  social_id VARCHAR(255) NOT NULL,
  unique_id VARCHAR(66) UNIQUE NOT NULL,
  wallet_address VARCHAR(100) UNIQUE,
  binding_tx_id VARCHAR(66),
  status VARCHAR(50) DEFAULT 'pending_wallet',
  created_at TIMESTAMP DEFAULT NOW(),
  wallet_bound_at TIMESTAMP
);

-- Circles
CREATE TABLE circles (
  id UUID PRIMARY KEY,
  on_chain_id INTEGER UNIQUE,
  creator_id UUID REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  contribution_amount BIGINT NOT NULL,
  total_members INTEGER NOT NULL,
  round_duration INTEGER NOT NULL,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Circle Members
CREATE TABLE circle_members (
  id UUID PRIMARY KEY,
  circle_id UUID REFERENCES circles(id),
  user_id UUID REFERENCES users(id),
  payout_position INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  joined_at TIMESTAMP
);

-- Contributions
CREATE TABLE contributions (
  id UUID PRIMARY KEY,
  circle_id UUID REFERENCES circles(id),
  user_id UUID REFERENCES users(id),
  round INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  on_time BOOLEAN NOT NULL,
  tx_id VARCHAR(66) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit Scores (cache)
CREATE TABLE credit_scores (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,
  score INTEGER DEFAULT 300,
  total_payments INTEGER DEFAULT 0,
  on_time_payments INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 API Response Types

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  walletAddress?: string;
  status: 'pending_wallet' | 'active';
  createdAt: string;
}

interface Circle {
  id: string;
  name: string;
  contributionAmount: number;
  totalMembers: number;
  currentRound: number;
  status: 'forming' | 'active' | 'completed';
  members: CircleMember[];
  inviteCode: string;
}

interface CircleMember {
  id: string;
  name: string;
  payoutPosition: number;
  hasContributedThisRound: boolean;
  hasReceivedPayout: boolean;
}

interface CreditScore {
  score: number;
  totalPayments: number;
  onTimePayments: number;
  circlesCompleted: number;
  lastUpdated: string;
}
```

---

## 5. API Endpoints

### 5.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/callback/google` | Google OAuth callback |
| POST | `/api/auth/callback/github` | GitHub OAuth callback |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/signout` | Sign out |

### 5.2 Identity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/identity/me` | Get current user |
| POST | `/api/identity/bind-wallet` | Initiate wallet binding |
| POST | `/api/identity/confirm-binding` | Confirm after TX |

### 5.3 Circles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/circles` | List user's circles |
| POST | `/api/circles` | Create new circle |
| GET | `/api/circles/:id` | Get circle details |
| POST | `/api/circles/:id/join` | Join circle |
| POST | `/api/circles/:id/contribute` | Record contribution |
| GET | `/api/circles/invite/:code` | Get circle by invite |

### 5.4 Credit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/credit/score` | Get current user's score |
| GET | `/api/credit/history` | Get payment history |

---

## 6. Smart Contract Functions

### 6.1 Identity Contract (halo-identity.clar)

```clarity
;; Bind wallet to unique ID (one-time)
(define-public (bind-wallet (unique-id (buff 32))))

;; Get wallet for unique ID
(define-read-only (get-wallet-by-id (unique-id (buff 32))))

;; Get unique ID for wallet
(define-read-only (get-id-by-wallet (wallet principal)))

;; Check if wallet is bound
(define-read-only (is-wallet-bound (wallet principal)))
```

### 6.2 Circle Contract (halo-circle.clar)

```clarity
;; Create new circle
(define-public (create-circle 
  (name (string-ascii 30))
  (contribution-amount uint)
  (total-members uint)
  (round-duration uint)
  (grace-period uint)))

;; Join circle
(define-public (join-circle (circle-id uint)))

;; Make contribution
(define-public (contribute (circle-id uint)))

;; Process payout (when all contributed)
(define-public (process-payout (circle-id uint)))

;; Get circle state
(define-read-only (get-circle (circle-id uint)))

;; Get member contribution status
(define-read-only (get-contribution (circle-id uint) (member principal) (round uint)))
```

### 6.3 Credit Contract (halo-credit.clar)

```clarity
;; Record payment (called by circle contract)
(define-public (record-payment 
  (unique-id (buff 32))
  (circle-id uint)
  (round uint)
  (amount uint)
  (on-time bool)))

;; Record circle completion
(define-public (record-circle-completion 
  (unique-id (buff 32)) 
  (completed-successfully bool)))

;; Get credit score
(define-read-only (get-credit-score (unique-id (buff 32))))

;; Get full credit data
(define-read-only (get-credit-data (unique-id (buff 32))))

;; Get score by wallet (convenience)
(define-read-only (get-score-by-wallet (wallet principal)))
```

---

## 7. Technical Constraints

### 7.1 MVP Limits

| Constraint | Limit | Reason |
|------------|-------|--------|
| Circles per user | 3 active | Reduce complexity |
| Members per circle | 3-10 | ROSCA standard range |
| Contribution amount | 10-5000 STX | Manageable risk |
| Round duration | 7, 14, or 30 days | Simplify scheduling |
| Token | STX only (MVP) | Single token |
| Payout method | Rotation only | Simplest to implement |

### 7.2 Technical Stack (MVP)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | TailwindCSS + shadcn/ui |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Supabase) |
| Blockchain | Stacks (Clarity) |
| Wallet | Leather |
| Auth | NextAuth.js |
| Email | Resend |
| Hosting | Vercel |

### 7.3 Performance Targets

| Metric | Target |
|--------|--------|
| Page load | < 2 seconds |
| API response | < 500ms |
| Transaction confirm | < 15 minutes (Stacks block time) |

### 7.4 Stacks-Specific Considerations

- **Block time**: ~10-15 minutes (Bitcoin-anchored)
- **Transaction fees**: ~0.001-0.01 STX typically
- **Wallet support**: Leather is primary, Xverse secondary
- **API endpoint**: Hiro API for chain data

---

## 8. Out of Scope

### 8.1 Explicitly NOT Building in MVP

| Feature | Why Not |
|---------|---------|
| KYC verification | Social auth sufficient for MVP trust |
| Mobile app | Web-first, faster to ship |
| Apple sign-in | Requires paid developer account |
| Multiple wallets | Leather has best Stacks support |
| Auction payouts | Adds complexity |
| Collateral | Trust-based for MVP |
| Fiat payments | Crypto-only for MVP |
| Multi-language | English only |
| Push notifications | Email sufficient |
| sBTC integration | Not yet mature |

### 8.2 Known Limitations

| Limitation | Workaround |
|------------|------------|
| No dispute resolution | Trust-based circles only |
| No member removal (after start) | Choose members carefully |
| No schedule changes | Fixed once started |
| No partial contributions | Must pay full amount |
| Long confirmation times | UI handles async well |

---

## 9. Launch Checklist

### 9.1 Development Complete

- [ ] User can sign up with Google
- [ ] User can sign up with GitHub
- [ ] User can connect Leather wallet
- [ ] User can bind wallet (on-chain)
- [ ] User can create circle
- [ ] User can share invite link
- [ ] User can join via invite link
- [ ] User can see circle status
- [ ] User can make contribution
- [ ] Payout is sent automatically
- [ ] Credit score updates
- [ ] Email reminders work

### 9.2 Testing Complete

- [ ] Happy path works end-to-end
- [ ] Error states handled gracefully
- [ ] Mobile responsive
- [ ] Works on Chrome, Safari, Firefox
- [ ] Clarity contracts 90%+ coverage
- [ ] Load tested (50 concurrent users)

### 9.3 Security

- [ ] Smart contracts reviewed
- [ ] No secrets in frontend
- [ ] Rate limiting enabled
- [ ] Input validation on all forms
- [ ] CORS properly configured

### 9.4 Operations

- [ ] Monitoring set up (Sentry)
- [ ] Database backups configured
- [ ] Domain configured
- [ ] SSL certificate valid

### 9.5 Launch

- [ ] Testnet deployment verified
- [ ] Mainnet contracts deployed
- [ ] Production environment ready
- [ ] Team on standby for issues

---

## Appendix: Example User Session

### New User Complete Flow

```
1. User clicks invite link from friend: halo.fun/join/ABC123
2. Sees circle preview: "Office Savings Fund - 100 STX/month, 5 members"
3. Clicks "Sign Up to Join"
4. Redirected to Google OAuth → logs in
5. Unique ID generated from social auth
6. Prompted to connect wallet
7. Clicks "Connect Leather" → approves in extension
8. Shown binding warning → checks "I understand"
9. Clicks "Bind Wallet" → confirms TX in Leather
10. Waits for TX confirmation (~10 min) → shows loading
11. TX confirmed → redirected to join page
12. Clicks "Join This Circle" → confirms TX
13. TX confirmed → member added
14. Sees circle dashboard: "Waiting for 1 more member..."

[When circle is full - auto-activates]

15. Receives email: "Office Savings Fund has started!"
16. Opens app, sees: "Pay 100 STX - due in 30 days"
17. Clicks "Pay Now" → confirms TX
18. TX confirmed: "Payment confirmed! +10 credit points"
19. Credit score: 310

[When all members pay]

20. Payout auto-processed to position 1 (Alice)
21. Receives email: "Alice S. received this round's payout!"
22. Circle advances to Round 2

[5 rounds later - user's turn]

23. Receives email: "You received 500 STX!"
24. Checks wallet: +500 STX
25. Circle completes
26. Credit score: 420 (+50 completion bonus)
```

---

**Document Control**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Feb 2026 | Initial Stacks MVP specification |
