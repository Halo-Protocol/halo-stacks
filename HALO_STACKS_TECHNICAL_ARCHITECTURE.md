# Halo Protocol: Technical Architecture for Stacks L2

**Version:** 2.0.0
**Date:** February 2026
**Author:** XXIX Labs (29Projects)
**Classification:** Technical Specification
**Target Chain:** Stacks (Bitcoin L2)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Identity Layer Architecture](#3-identity-layer-architecture)
4. [Smart Contract Architecture (Clarity)](#4-smart-contract-architecture-clarity)
5. [Credit Scoring Algorithm](#5-credit-scoring-algorithm)
6. [SDK Architecture](#6-sdk-architecture)
7. [Backend Services](#7-backend-services)
8. [Database Schema](#8-database-schema)
9. [API Specifications](#9-api-specifications)
10. [Security Architecture](#10-security-architecture)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Stacks-Specific Considerations](#12-stacks-specific-considerations)

---

## 1. Executive Summary

Halo Protocol is a decentralized infrastructure layer for group-based credit, starting with on-chain lending circles (ROSCAs - Rotating Savings and Credit Associations). Built natively on Stacks, Halo transforms informal social trust into programmable, verifiable credit infrastructure secured by Bitcoin.

### Why Stacks?

- **Bitcoin Security**: Transactions settle to Bitcoin, providing ultimate finality
- **Clarity Smart Contracts**: Decidable, safe smart contract language
- **sBTC Integration**: Native Bitcoin representation on Stacks (future)
- **Active Developer Ecosystem**: Strong tooling with Clarinet, stacks.js
- **Low Transaction Costs**: Affordable for frequent small payments

### Core Value Propositions

- **Sybil-Resistant Identity**: One human = One identity = One wallet binding (social auth based)
- **Programmable Trust**: Smart contracts enforce group financial agreements
- **Portable Credit**: On-chain credit scores usable across Stacks protocols
- **Bitcoin Secured**: All state changes anchored to Bitcoin

### Technology Stack Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| Blockchain | Stacks (Clarity) | Smart contracts, settlements |
| Identity | Social OAuth + Unique ID | User verification (no KYC) |
| Backend | Node.js/TypeScript | API services, orchestration |
| Database | PostgreSQL + Redis | State management, caching |
| Frontend | Next.js + React | Web application |
| Wallet | Leather/Xverse | User wallet connections |

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   Web App       │   Partner SDK   │   Credit Query  │   Admin Dashboard     │
│   (Next.js)     │   (TypeScript)  │   Portal        │   (Future)            │
└────────┬────────┴────────┬────────┴────────┬────────┴───────────┬───────────┘
         │                 │                 │                    │
         ▼                 ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                         (Rate Limiting, Auth, Routing)                       │
└────────┬────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES                                   │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   Identity      │   Circle        │   Credit        │   Notification        │
│   Service       │   Service       │   Service       │   Service             │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────┤
│   Auth          │   Contribution  │   Analytics     │   Scheduler           │
│   Service       │   Processor     │   Service       │   Service             │
└────────┬────────┴────────┬────────┴────────┬────────┴───────────┬───────────┘
         │                 │                 │                    │
         ▼                 ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────────────────────┬───────────────────────────────────────────┤
│         PostgreSQL              │              Redis                         │
│    (Primary Database)           │         (Cache & Sessions)                 │
└─────────────────────────────────┴───────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          STACKS BLOCKCHAIN LAYER (8 contracts)              │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│  Identity    │  Circle      │  Credit      │  Vault       │  sBTC Staking   │
│  Contract    │  (multi-tok) │  (6 scores)  │  (collateral)│  (rewards)      │
├──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┤
│  SIP-010 Trait  │  Mock hUSD (6 dec)  │  Mock sBTC (8 dec)                  │
└─────────────────┴─────────────────────┴─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BITCOIN LAYER (Settlement)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Architecture

```
User Registration Flow (No KYC):
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Social  │───▶│ Generate │───▶│  Connect │───▶│  Bind    │
│  Login   │    │ UniqueID │    │  Wallet  │    │  On-Chain│
└──────────┘    └──────────┘    └──────────┘    └──────────┘

Circle Lifecycle Flow:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Create  │───▶│  Invite  │───▶│  Active  │───▶│ Payouts  │───▶│ Complete │
│  Circle  │    │ Members  │    │  Phase   │    │  Phase   │    │  & Score │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## 3. Identity Layer Architecture

### 3.1 Identity System Overview (No KYC)

The identity system ensures one-account-per-social-identity through social OAuth binding. For MVP, we skip KYC and use social auth as the primary verification layer.

```
┌─────────────────────────────────────────────────────────────────┐
│                     IDENTITY STACK (MVP)                         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Wallet Binding (Permanent, On-chain)                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Stacks Address ←→ Unique ID (Immutable Mapping)        │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Unique ID Generation (Deterministic Hash)             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Hash(Social_Provider + Social_ID + Email + Timestamp)  │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Social Authentication (Initial Entry)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Google / Apple / GitHub / Email Magic Link             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 User Registration Flow

```typescript
interface RegistrationFlow {
  // Step 1: Social Login
  socialAuth: {
    providers: ['google', 'apple', 'github', 'email'];
    data: {
      email: string;
      name: string;
      profileImage?: string;
      socialProvider: string;
      socialId: string;
    };
  };

  // Step 2: Unique ID Generation (Backend)
  uniqueIdGeneration: {
    algorithm: 'SHA256(PROVIDER + SOCIAL_ID + EMAIL + TIMESTAMP + SALT)';
    uniqueId: string; // 32-byte hex string
    createdAt: timestamp;
  };

  // Step 3: Wallet Connection
  walletConnection: {
    supportedWallets: ['leather', 'xverse'];
    stacksAddress: string;
  };

  // Step 4: Wallet Binding (On-chain)
  walletBinding: {
    stacksAddress: string;
    uniqueId: string;
    bindingTxId: string;
    permanent: true;
  };
}
```

### 3.3 Unique ID Generation Algorithm

```typescript
// Backend Service: Identity Generation
import { createHash } from 'crypto';

interface SocialAuthData {
  provider: string;      // 'google', 'apple', 'github', 'email'
  socialId: string;      // Provider-specific user ID
  email: string;         // Verified email
  timestamp: number;     // Registration timestamp
}

export function generateUniqueId(data: SocialAuthData): string {
  const salt = process.env.HALO_ID_SALT; // Secret server-side salt
  
  // Create deterministic input
  const input = [
    data.provider,
    data.socialId,
    data.email.toLowerCase(),
    data.timestamp.toString(),
    salt
  ].join('|');
  
  // Generate SHA-256 hash
  const hash = createHash('sha256')
    .update(input)
    .digest('hex');
  
  // Format as 0x-prefixed 32-byte hex
  return `0x${hash}`;
}

// Duplicate Detection
export async function checkDuplicate(email: string): Promise<boolean> {
  // Check if email already registered
  const existing = await db.users.findByEmail(email.toLowerCase());
  return existing !== null;
}
```

### 3.4 Wallet Binding Flow

```typescript
// Frontend: Wallet Connection
import { connect } from '@stacks/connect';

async function connectAndBindWallet(uniqueId: string) {
  // Connect wallet
  const userData = await connect({
    appDetails: {
      name: 'Halo Protocol',
      icon: 'https://usehalo.fun/logo.png',
    },
    onFinish: async (data) => {
      const stacksAddress = data.userData.profile.stxAddress.mainnet;
      
      // Call smart contract to bind
      await bindWalletOnChain(uniqueId, stacksAddress);
    },
  });
}

// Smart Contract Call
async function bindWalletOnChain(uniqueId: string, stacksAddress: string) {
  const txOptions = {
    contractAddress: 'SP...',
    contractName: 'halo-identity',
    functionName: 'bind-wallet',
    functionArgs: [
      bufferFromHex(uniqueId),
      standardPrincipalCV(stacksAddress),
    ],
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => {
      console.log('Binding TX:', data.txId);
    },
  };
  
  await openContractCall(txOptions);
}
```

---

## 4. Smart Contract Architecture (Clarity)

### 4.1 Contract Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     HALO SMART CONTRACT SYSTEM (Clarity 3)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    ┌───────────────────┐                                     │
│                    │  halo-identity    │                                     │
│                    │  (wallet binding) │                                     │
│                    └────────┬──────────┘                                     │
│           ┌─────────────────┼─────────────────┐                             │
│           │                 │                  │                             │
│    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐                     │
│    │ halo-circle │──▶│ halo-credit │◀──│ halo-sbtc-  │                     │
│    │ (multi-tok) │   │ (6 scoring  │   │  staking    │                     │
│    │ (collateral)│   │  components)│   │ (rewards)   │                     │
│    └──┬──────┬───┘   └─────────────┘   └──────┬──────┘                     │
│       │      │                                 │                             │
│    ┌──▼──┐ ┌─▼──────────┐              ┌──────▼──────┐                     │
│    │ STX │ │ halo-vault  │              │ halo-mock-  │                     │
│    │     │ │ (collateral)│              │ sbtc        │                     │
│    └─────┘ │ (oracle)    │              └─────────────┘                     │
│            │ (yield)     │                                                   │
│            └──────┬──────┘                                                   │
│            ┌──────▼──────┐                                                   │
│            │ halo-mock-  │   ┌──────────────────┐                           │
│            │ token (hUSD)│   │ halo-sip010-trait │                          │
│            └─────────────┘   └──────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Note:** The inline Clarity code in sections 4.2-4.4 below represents the original Phase 1 design. The actual deployed contracts include Phase 2.5 features: multi-token circles, collateral vault integration, sBTC staking, and 6-component credit scoring. See `contracts/` for current source and `docs/CONTRACT_REFERENCE.md` for the API reference.

### 4.2 Identity Contract (Clarity)

```clarity
;; halo-identity.clar
;; Manages user identity and wallet bindings

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_ALREADY_BOUND (err u101))
(define-constant ERR_WALLET_ALREADY_USED (err u102))
(define-constant ERR_NOT_FOUND (err u103))
(define-constant ERR_INVALID_ID (err u104))

;; Data Variables
(define-data-var admin principal CONTRACT_OWNER)
(define-data-var total-users uint u0)

;; Data Maps
;; Unique ID -> Wallet Principal (one-way binding)
(define-map id-to-wallet (buff 32) principal)

;; Wallet Principal -> Unique ID (reverse lookup)
(define-map wallet-to-id principal (buff 32))

;; User metadata (off-chain reference)
(define-map user-metadata (buff 32) {
  registered-at: uint,
  is-active: bool
})

;; Read-only Functions

;; Get wallet for unique ID
(define-read-only (get-wallet-by-id (unique-id (buff 32)))
  (map-get? id-to-wallet unique-id)
)

;; Get unique ID for wallet
(define-read-only (get-id-by-wallet (wallet principal))
  (map-get? wallet-to-id wallet)
)

;; Check if unique ID has wallet bound
(define-read-only (is-id-bound (unique-id (buff 32)))
  (is-some (map-get? id-to-wallet unique-id))
)

;; Check if wallet is bound to any ID
(define-read-only (is-wallet-bound (wallet principal))
  (is-some (map-get? wallet-to-id wallet))
)

;; Get user metadata
(define-read-only (get-user-metadata (unique-id (buff 32)))
  (map-get? user-metadata unique-id)
)

;; Get total registered users
(define-read-only (get-total-users)
  (var-get total-users)
)

;; Public Functions

;; Bind wallet to unique ID (ONE TIME ONLY)
;; Called by user with their wallet
(define-public (bind-wallet (unique-id (buff 32)))
  (let (
    (caller tx-sender)
  )
    ;; Validate unique ID length
    (asserts! (is-eq (len unique-id) u32) ERR_INVALID_ID)
    
    ;; Check if unique ID already has wallet bound
    (asserts! (is-none (map-get? id-to-wallet unique-id)) ERR_ALREADY_BOUND)
    
    ;; Check if wallet is already bound to another ID
    (asserts! (is-none (map-get? wallet-to-id caller)) ERR_WALLET_ALREADY_USED)
    
    ;; Store bidirectional mapping
    (map-set id-to-wallet unique-id caller)
    (map-set wallet-to-id caller unique-id)
    
    ;; Store metadata
    (map-set user-metadata unique-id {
      registered-at: block-height,
      is-active: true
    })
    
    ;; Increment user count
    (var-set total-users (+ (var-get total-users) u1))
    
    ;; Emit event via print
    (print {
      event: "wallet-bound",
      unique-id: unique-id,
      wallet: caller,
      block: block-height
    })
    
    (ok true)
  )
)

;; Admin function to deactivate user (does not unbind)
(define-public (deactivate-user (unique-id (buff 32)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-some (map-get? user-metadata unique-id)) ERR_NOT_FOUND)
    
    (map-set user-metadata unique-id 
      (merge (unwrap-panic (map-get? user-metadata unique-id))
        { is-active: false })
    )
    
    (print {
      event: "user-deactivated",
      unique-id: unique-id
    })
    
    (ok true)
  )
)

;; Transfer admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)
```

### 4.3 Circle Contract (Clarity)

```clarity
;; halo-circle.clar
;; Core lending circle logic

;; Use traits for token interaction
(use-trait ft-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u200))
(define-constant ERR_CIRCLE_NOT_FOUND (err u201))
(define-constant ERR_CIRCLE_NOT_FORMING (err u202))
(define-constant ERR_CIRCLE_NOT_ACTIVE (err u203))
(define-constant ERR_ALREADY_MEMBER (err u204))
(define-constant ERR_NOT_MEMBER (err u205))
(define-constant ERR_CIRCLE_FULL (err u206))
(define-constant ERR_INVALID_AMOUNT (err u207))
(define-constant ERR_ALREADY_CONTRIBUTED (err u208))
(define-constant ERR_INVALID_ROUND (err u209))
(define-constant ERR_NOT_VERIFIED (err u210))
(define-constant ERR_INSUFFICIENT_BALANCE (err u211))
(define-constant ERR_TRANSFER_FAILED (err u212))

;; Circle status enum
(define-constant STATUS_FORMING u0)
(define-constant STATUS_ACTIVE u1)
(define-constant STATUS_PAUSED u2)
(define-constant STATUS_COMPLETED u3)
(define-constant STATUS_DISSOLVED u4)

;; Data Variables
(define-data-var admin principal CONTRACT_OWNER)
(define-data-var circle-counter uint u0)
(define-data-var identity-contract principal CONTRACT_OWNER)
(define-data-var credit-contract principal CONTRACT_OWNER)
(define-data-var contribution-token principal CONTRACT_OWNER)

;; Data Maps

;; Circle ID -> Circle Data
(define-map circles uint {
  name: (string-ascii 30),
  creator: principal,
  contribution-amount: uint,
  total-members: uint,
  current-round: uint,
  status: uint,
  created-at: uint,
  start-block: uint,
  round-duration: uint,     ;; blocks per round
  grace-period: uint,       ;; blocks for late payment
  total-contributed: uint,
  total-paid-out: uint
})

;; (Circle ID, Member Principal) -> Member Data
(define-map circle-members { circle-id: uint, member: principal } {
  unique-id: (buff 32),
  joined-at: uint,
  payout-position: uint,
  total-contributed: uint,
  has-received-payout: bool
})

;; (Circle ID, Member Principal, Round) -> Contribution
(define-map contributions { circle-id: uint, member: principal, round: uint } {
  amount: uint,
  contributed-at: uint,
  on-time: bool
})

;; Circle ID -> List of member principals
(define-map circle-member-list uint (list 10 principal))

;; (Circle ID, Round) -> Payout info
(define-map payouts { circle-id: uint, round: uint } {
  recipient: principal,
  amount: uint,
  paid-at: uint
})

;; Read-only Functions

(define-read-only (get-circle (circle-id uint))
  (map-get? circles circle-id)
)

(define-read-only (get-member (circle-id uint) (member principal))
  (map-get? circle-members { circle-id: circle-id, member: member })
)

(define-read-only (get-contribution (circle-id uint) (member principal) (round uint))
  (map-get? contributions { circle-id: circle-id, member: member, round: round })
)

(define-read-only (get-circle-members (circle-id uint))
  (default-to (list) (map-get? circle-member-list circle-id))
)

(define-read-only (get-payout (circle-id uint) (round uint))
  (map-get? payouts { circle-id: circle-id, round: round })
)

(define-read-only (get-circle-count)
  (var-get circle-counter)
)

;; Check if user is verified (has bound wallet)
(define-read-only (is-verified (user principal))
  (is-some (contract-call? .halo-identity get-id-by-wallet user))
)

;; Public Functions

;; Create a new lending circle
(define-public (create-circle 
  (name (string-ascii 30))
  (contribution-amount uint)
  (total-members uint)
  (round-duration uint)
  (grace-period uint)
)
  (let (
    (caller tx-sender)
    (new-id (+ (var-get circle-counter) u1))
  )
    ;; Verify caller has bound wallet
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)
    
    ;; Validate parameters
    (asserts! (and (>= total-members u3) (<= total-members u10)) ERR_INVALID_AMOUNT)
    (asserts! (> contribution-amount u0) ERR_INVALID_AMOUNT)
    
    ;; Create circle
    (map-set circles new-id {
      name: name,
      creator: caller,
      contribution-amount: contribution-amount,
      total-members: total-members,
      current-round: u0,
      status: STATUS_FORMING,
      created-at: block-height,
      start-block: u0,
      round-duration: round-duration,
      grace-period: grace-period,
      total-contributed: u0,
      total-paid-out: u0
    })
    
    ;; Initialize member list
    (map-set circle-member-list new-id (list))
    
    ;; Update counter
    (var-set circle-counter new-id)
    
    ;; Add creator as first member
    (try! (internal-add-member new-id caller u1))
    
    (print {
      event: "circle-created",
      circle-id: new-id,
      creator: caller,
      name: name,
      contribution-amount: contribution-amount,
      total-members: total-members
    })
    
    (ok new-id)
  )
)

;; Join an existing circle
(define-public (join-circle (circle-id uint))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-members (get-circle-members circle-id))
    (member-count (len current-members))
  )
    ;; Verify caller has bound wallet
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)
    
    ;; Check circle is forming
    (asserts! (is-eq (get status circle) STATUS_FORMING) ERR_CIRCLE_NOT_FORMING)
    
    ;; Check not already member
    (asserts! (is-none (map-get? circle-members { circle-id: circle-id, member: caller })) 
              ERR_ALREADY_MEMBER)
    
    ;; Check not full
    (asserts! (< member-count (get total-members circle)) ERR_CIRCLE_FULL)
    
    ;; Add member
    (try! (internal-add-member circle-id caller (+ member-count u1)))
    
    ;; Check if circle is now full, auto-activate
    (if (is-eq (+ member-count u1) (get total-members circle))
      (try! (activate-circle circle-id))
      true
    )
    
    (print {
      event: "member-joined",
      circle-id: circle-id,
      member: caller,
      position: (+ member-count u1)
    })
    
    (ok (+ member-count u1))
  )
)

;; Make contribution for current round
(define-public (contribute (circle-id uint) (token <ft-trait>))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (member-data (unwrap! (map-get? circle-members { circle-id: circle-id, member: caller }) 
                          ERR_NOT_MEMBER))
    (current-round (get current-round circle))
    (contribution-amount (get contribution-amount circle))
    (round-start (+ (get start-block circle) (* current-round (get round-duration circle))))
    (on-time (<= block-height (+ round-start (get grace-period circle))))
  )
    ;; Check circle is active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
    
    ;; Check not already contributed this round
    (asserts! (is-none (map-get? contributions 
                                  { circle-id: circle-id, member: caller, round: current-round })) 
              ERR_ALREADY_CONTRIBUTED)
    
    ;; Transfer tokens from caller to contract
    (try! (contract-call? token transfer 
           contribution-amount 
           caller 
           (as-contract tx-sender) 
           none))
    
    ;; Record contribution
    (map-set contributions { circle-id: circle-id, member: caller, round: current-round } {
      amount: contribution-amount,
      contributed-at: block-height,
      on-time: on-time
    })
    
    ;; Update member totals
    (map-set circle-members { circle-id: circle-id, member: caller }
      (merge member-data { 
        total-contributed: (+ (get total-contributed member-data) contribution-amount) 
      })
    )
    
    ;; Update circle totals
    (map-set circles circle-id
      (merge circle { 
        total-contributed: (+ (get total-contributed circle) contribution-amount) 
      })
    )
    
    ;; Record payment in credit contract
    (let (
      (unique-id (unwrap! (contract-call? .halo-identity get-id-by-wallet caller) ERR_NOT_VERIFIED))
    )
      (try! (contract-call? .halo-credit record-payment 
             unique-id 
             circle-id 
             current-round 
             contribution-amount 
             on-time))
    )
    
    (print {
      event: "contribution-made",
      circle-id: circle-id,
      member: caller,
      round: current-round,
      amount: contribution-amount,
      on-time: on-time
    })
    
    (ok true)
  )
)

;; Process payout for completed round
(define-public (process-payout (circle-id uint) (token <ft-trait>))
  (let (
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (members (get-circle-members circle-id))
    (total-members (get total-members circle))
    (contribution-amount (get contribution-amount circle))
    (payout-amount (* contribution-amount total-members))
  )
    ;; Check circle is active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
    
    ;; Find recipient for this round (1-indexed position)
    (let (
      (recipient-position (+ current-round u1))
      (recipient (unwrap! (element-at members (- recipient-position u1)) ERR_NOT_FOUND))
    )
      ;; Transfer payout to recipient
      (try! (as-contract (contract-call? token transfer 
             payout-amount 
             tx-sender 
             recipient 
             none)))
      
      ;; Record payout
      (map-set payouts { circle-id: circle-id, round: current-round } {
        recipient: recipient,
        amount: payout-amount,
        paid-at: block-height
      })
      
      ;; Update member payout status
      (let (
        (member-data (unwrap! (map-get? circle-members { circle-id: circle-id, member: recipient }) 
                              ERR_NOT_MEMBER))
      )
        (map-set circle-members { circle-id: circle-id, member: recipient }
          (merge member-data { has-received-payout: true })
        )
      )
      
      ;; Update circle state
      (map-set circles circle-id
        (merge circle { 
          total-paid-out: (+ (get total-paid-out circle) payout-amount),
          current-round: (+ current-round u1)
        })
      )
      
      ;; Check if circle is complete
      (if (>= (+ current-round u1) total-members)
        (try! (complete-circle circle-id))
        true
      )
      
      (print {
        event: "payout-processed",
        circle-id: circle-id,
        round: current-round,
        recipient: recipient,
        amount: payout-amount
      })
      
      (ok payout-amount)
    )
  )
)

;; Internal Functions

(define-private (internal-add-member (circle-id uint) (member principal) (position uint))
  (let (
    (unique-id (unwrap! (contract-call? .halo-identity get-id-by-wallet member) ERR_NOT_VERIFIED))
    (current-members (get-circle-members circle-id))
  )
    ;; Add to member data
    (map-set circle-members { circle-id: circle-id, member: member } {
      unique-id: unique-id,
      joined-at: block-height,
      payout-position: position,
      total-contributed: u0,
      has-received-payout: false
    })
    
    ;; Add to member list
    (map-set circle-member-list circle-id 
      (unwrap! (as-max-len? (append current-members member) u10) ERR_CIRCLE_FULL))
    
    (ok true)
  )
)

(define-private (activate-circle (circle-id uint))
  (let (
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
  )
    (map-set circles circle-id
      (merge circle { 
        status: STATUS_ACTIVE,
        start-block: block-height
      })
    )
    
    (print {
      event: "circle-activated",
      circle-id: circle-id,
      start-block: block-height
    })
    
    (ok true)
  )
)

(define-private (complete-circle (circle-id uint))
  (let (
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (members (get-circle-members circle-id))
  )
    ;; Update status
    (map-set circles circle-id
      (merge circle { status: STATUS_COMPLETED })
    )
    
    ;; Record completion for all members in credit contract
    (map record-member-completion members)
    
    (print {
      event: "circle-completed",
      circle-id: circle-id
    })
    
    (ok true)
  )
)

(define-private (record-member-completion (member principal))
  (let (
    (unique-id-opt (contract-call? .halo-identity get-id-by-wallet member))
  )
    (match unique-id-opt
      unique-id (contract-call? .halo-credit record-circle-completion unique-id true)
      (ok u0)
    )
  )
)

;; Admin Functions

(define-public (set-contracts 
  (new-identity-contract principal)
  (new-credit-contract principal)
  (new-token principal)
)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set identity-contract new-identity-contract)
    (var-set credit-contract new-credit-contract)
    (var-set contribution-token new-token)
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)
```

### 4.4 Credit Contract (Clarity)

```clarity
;; halo-credit.clar
;; Credit scoring and history tracking

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u300))
(define-constant ERR_NOT_FOUND (err u301))
(define-constant ERR_INVALID_SCORE (err u302))

;; Score bounds
(define-constant MIN_SCORE u300)
(define-constant MAX_SCORE u850)
(define-constant INITIAL_SCORE u300)

;; Score component weights (out of 100)
(define-constant PAYMENT_HISTORY_WEIGHT u40)
(define-constant CIRCLE_COMPLETION_WEIGHT u25)
(define-constant VOLUME_WEIGHT u15)
(define-constant TENURE_WEIGHT u10)
(define-constant CONSISTENCY_WEIGHT u10)

;; Point values
(define-constant POINTS_ON_TIME_PAYMENT u10)
(define-constant POINTS_LATE_PAYMENT i-5)       ;; Negative points for late
(define-constant POINTS_CIRCLE_COMPLETE u50)
(define-constant POINTS_CIRCLE_DEFAULT i-100)   ;; Severe penalty for default

;; Data Variables
(define-data-var admin principal CONTRACT_OWNER)
(define-data-var authorized-contracts (list 10 principal) (list))

;; Data Maps

;; Unique ID -> Credit Score Data
(define-map credit-scores (buff 32) {
  score: uint,
  total-payments: uint,
  on-time-payments: uint,
  late-payments: uint,
  circles-completed: uint,
  circles-defaulted: uint,
  total-volume: uint,
  first-activity: uint,
  last-updated: uint
})

;; Unique ID -> Payment History (last N payments)
(define-map payment-history (buff 32) (list 100 {
  circle-id: uint,
  round: uint,
  amount: uint,
  on-time: bool,
  block: uint
}))

;; Read-only Functions

(define-read-only (get-credit-score (unique-id (buff 32)))
  (match (map-get? credit-scores unique-id)
    score-data (ok (get score score-data))
    (ok INITIAL_SCORE)
  )
)

(define-read-only (get-credit-data (unique-id (buff 32)))
  (map-get? credit-scores unique-id)
)

(define-read-only (get-payment-history (unique-id (buff 32)))
  (default-to (list) (map-get? payment-history unique-id))
)

;; Get score by wallet (convenience function)
(define-read-only (get-score-by-wallet (wallet principal))
  (match (contract-call? .halo-identity get-id-by-wallet wallet)
    unique-id (get-credit-score unique-id)
    (ok INITIAL_SCORE)
  )
)

;; Check if caller is authorized
(define-read-only (is-authorized (caller principal))
  (is-some (index-of (var-get authorized-contracts) caller))
)

;; Public Functions

;; Record a payment (called by circle contract)
(define-public (record-payment 
  (unique-id (buff 32))
  (circle-id uint)
  (round uint)
  (amount uint)
  (on-time bool)
)
  (let (
    (caller contract-caller)
    (current-data (default-to {
      score: INITIAL_SCORE,
      total-payments: u0,
      on-time-payments: u0,
      late-payments: u0,
      circles-completed: u0,
      circles-defaulted: u0,
      total-volume: u0,
      first-activity: block-height,
      last-updated: block-height
    } (map-get? credit-scores unique-id)))
  )
    ;; Verify caller is authorized (circle contract)
    (asserts! (is-authorized caller) ERR_NOT_AUTHORIZED)
    
    ;; Update payment stats
    (let (
      (new-on-time (if on-time 
                      (+ (get on-time-payments current-data) u1) 
                      (get on-time-payments current-data)))
      (new-late (if on-time 
                   (get late-payments current-data) 
                   (+ (get late-payments current-data) u1)))
      (new-total (+ (get total-payments current-data) u1))
      (new-volume (+ (get total-volume current-data) amount))
    )
      ;; Calculate new score
      (let (
        (new-score (calculate-score 
                     new-on-time 
                     new-late 
                     new-total 
                     (get circles-completed current-data)
                     (get circles-defaulted current-data)
                     new-volume
                     (get first-activity current-data)))
      )
        ;; Update credit data
        (map-set credit-scores unique-id {
          score: new-score,
          total-payments: new-total,
          on-time-payments: new-on-time,
          late-payments: new-late,
          circles-completed: (get circles-completed current-data),
          circles-defaulted: (get circles-defaulted current-data),
          total-volume: new-volume,
          first-activity: (get first-activity current-data),
          last-updated: block-height
        })
        
        ;; Add to payment history
        (let (
          (history (get-payment-history unique-id))
          (new-record { 
            circle-id: circle-id, 
            round: round, 
            amount: amount, 
            on-time: on-time, 
            block: block-height 
          })
        )
          (map-set payment-history unique-id 
            (unwrap! (as-max-len? (append history new-record) u100) ERR_INVALID_SCORE))
        )
        
        (print {
          event: "payment-recorded",
          unique-id: unique-id,
          circle-id: circle-id,
          on-time: on-time,
          new-score: new-score
        })
        
        (ok new-score)
      )
    )
  )
)

;; Record circle completion
(define-public (record-circle-completion (unique-id (buff 32)) (completed-successfully bool))
  (let (
    (caller contract-caller)
    (current-data (unwrap! (map-get? credit-scores unique-id) ERR_NOT_FOUND))
  )
    ;; Verify caller is authorized
    (asserts! (is-authorized caller) ERR_NOT_AUTHORIZED)
    
    (let (
      (new-completed (if completed-successfully
                        (+ (get circles-completed current-data) u1)
                        (get circles-completed current-data)))
      (new-defaulted (if completed-successfully
                        (get circles-defaulted current-data)
                        (+ (get circles-defaulted current-data) u1)))
    )
      ;; Calculate new score
      (let (
        (new-score (calculate-score 
                     (get on-time-payments current-data)
                     (get late-payments current-data)
                     (get total-payments current-data)
                     new-completed
                     new-defaulted
                     (get total-volume current-data)
                     (get first-activity current-data)))
      )
        (map-set credit-scores unique-id
          (merge current-data {
            score: new-score,
            circles-completed: new-completed,
            circles-defaulted: new-defaulted,
            last-updated: block-height
          })
        )
        
        (print {
          event: "circle-completion-recorded",
          unique-id: unique-id,
          success: completed-successfully,
          new-score: new-score
        })
        
        (ok new-score)
      )
    )
  )
)

;; Private Functions

;; Calculate credit score based on all factors
(define-private (calculate-score 
  (on-time uint) 
  (late uint) 
  (total-payments uint)
  (completed uint)
  (defaulted uint)
  (volume uint)
  (first-activity uint)
)
  (let (
    ;; Payment history component (40% weight)
    (payment-ratio (if (> total-payments u0)
                      (/ (* on-time u100) total-payments)
                      u100))
    (payment-score (/ (* payment-ratio PAYMENT_HISTORY_WEIGHT u550) u10000))
    
    ;; Circle completion component (25% weight)
    (total-circles (+ completed defaulted))
    (completion-ratio (if (> total-circles u0)
                         (/ (* completed u100) total-circles)
                         u100))
    (completion-score (/ (* completion-ratio CIRCLE_COMPLETION_WEIGHT u550) u10000))
    
    ;; Volume component (15% weight) - log scale
    (volume-tier (if (> volume u100000000) u100    ;; $1000+
                    (if (> volume u10000000) u75   ;; $100+
                    (if (> volume u1000000) u50    ;; $10+
                    u25))))
    (volume-score (/ (* volume-tier VOLUME_WEIGHT u550) u10000))
    
    ;; Tenure component (10% weight)
    (blocks-active (- block-height first-activity))
    (tenure-months (/ blocks-active u4320))        ;; ~4320 blocks per month
    (tenure-tier (if (> tenure-months u12) u100
                    (if (> tenure-months u6) u75
                    (if (> tenure-months u3) u50
                    u25))))
    (tenure-score (/ (* tenure-tier TENURE_WEIGHT u550) u10000))
    
    ;; Consistency component (10% weight)
    (consistency-score (/ (* (if (is-eq late u0) u100 
                               (if (< late u3) u50 u25)) 
                            CONSISTENCY_WEIGHT u550) u10000))
  )
    ;; Total score: base 300 + earned points (max 550)
    (+ MIN_SCORE (+ payment-score (+ completion-score (+ volume-score (+ tenure-score consistency-score)))))
  )
)

;; Admin Functions

(define-public (authorize-contract (contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set authorized-contracts 
      (unwrap! (as-max-len? (append (var-get authorized-contracts) contract) u10) ERR_NOT_AUTHORIZED))
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)
```

---

## 5. Credit Scoring Algorithm

### 5.1 Score Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    HALO CREDIT SCORE (300-850)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Base Score: 300 points                                         │
│  Maximum Earned: 550 points                                     │
│  Total Range: 300-850                                           │
│                                                                  │
│  COMPONENTS (6 total, updated Phase 2.5):                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Payment History (35%)                max +192 points    │   │
│  │ - On-time payment ratio                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Circle Completion (20%)              max +110 points    │   │
│  │ - Circles completed successfully vs. defaulted           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Volume (15%)                         max +82 points     │   │
│  │ - Total value transacted (tiered)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Tenure (10%)                         max +55 points     │   │
│  │ - Account age in blocks (~4320/month)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Consistency (10%)                    max +55 points     │   │
│  │ - No late payments = full, <3 = partial                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Staking Activity (10%)              max +55 points      │   │
│  │ - sBTC staking amount tier × duration modifier           │   │
│  │ - Amount: >1 BTC=100, >0.1=80, >0.01=60, >0.001=40    │   │
│  │ - Duration: >12mo=100, >6mo=80, >3mo=60, >1mo=40       │   │
│  │ - Combined: (amount × duration) / 100                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Score Calculation Formula

```typescript
// Backend reference implementation
interface CreditFactors {
  totalPayments: number;
  onTimePayments: number;
  latePayments: number;
  circlesCompleted: number;
  circlesDefaulted: number;
  totalVolume: number;        // in micro-units
  firstActivityBlock: number;
  currentBlock: number;
}

function calculateCreditScore(factors: CreditFactors): number {
  const BASE_SCORE = 300;
  const MAX_EARNED = 550;
  
  // 1. Payment History (40% weight)
  const paymentRatio = factors.totalPayments > 0 
    ? factors.onTimePayments / factors.totalPayments 
    : 1;
  const paymentScore = paymentRatio * 0.40 * MAX_EARNED;
  
  // 2. Circle Completion (25% weight)
  const totalCircles = factors.circlesCompleted + factors.circlesDefaulted;
  const completionRatio = totalCircles > 0 
    ? factors.circlesCompleted / totalCircles 
    : 1;
  const completionScore = completionRatio * 0.25 * MAX_EARNED;
  
  // 3. Volume (15% weight) - log scale
  const volumeTier = getVolumeTier(factors.totalVolume);
  const volumeScore = volumeTier * 0.15 * MAX_EARNED;
  
  // 4. Tenure (10% weight)
  const blocksActive = factors.currentBlock - factors.firstActivityBlock;
  const monthsActive = blocksActive / 4320; // ~4320 blocks/month
  const tenureTier = getTenureTier(monthsActive);
  const tenureScore = tenureTier * 0.10 * MAX_EARNED;
  
  // 5. Consistency (10% weight)
  const consistencyTier = factors.latePayments === 0 ? 1.0 
    : factors.latePayments < 3 ? 0.5 
    : 0.25;
  const consistencyScore = consistencyTier * 0.10 * MAX_EARNED;
  
  return Math.round(BASE_SCORE + paymentScore + completionScore + 
                    volumeScore + tenureScore + consistencyScore);
}

function getVolumeTier(volumeMicro: number): number {
  if (volumeMicro > 100_000_000) return 1.0;    // $100+
  if (volumeMicro > 10_000_000) return 0.75;    // $10+
  if (volumeMicro > 1_000_000) return 0.5;      // $1+
  return 0.25;
}

function getTenureTier(months: number): number {
  if (months > 12) return 1.0;
  if (months > 6) return 0.75;
  if (months > 3) return 0.5;
  return 0.25;
}
```

### 5.3 Score Events

| Event | Score Impact |
|-------|--------------|
| On-time payment | +2-10 points (based on payment ratio) |
| Late payment | -5 points + ratio impact |
| Circle completed | +50 points bonus |
| Circle defaulted | -100 points penalty |
| First activity | Starts tenure clock |
| Volume milestone | Tier upgrade bonus |

---

## 6. SDK Architecture

### 6.1 TypeScript SDK

```typescript
// @halo-protocol/sdk

import { 
  StacksNetwork, 
  makeContractCall, 
  callReadOnlyFunction,
  cvToJSON,
  bufferCV 
} from '@stacks/transactions';

export interface HaloSDKConfig {
  network: StacksNetwork;
  contractAddress: string;
  identityContractName: string;
  creditContractName: string;
  circleContractName: string;
}

export class HaloSDK {
  private config: HaloSDKConfig;
  
  constructor(config: HaloSDKConfig) {
    this.config = config;
  }
  
  // ============ Credit Score Queries ============
  
  /**
   * Get credit score by wallet address
   */
  async getCreditScoreByWallet(wallet: string): Promise<number> {
    const result = await callReadOnlyFunction({
      network: this.config.network,
      contractAddress: this.config.contractAddress,
      contractName: this.config.creditContractName,
      functionName: 'get-score-by-wallet',
      functionArgs: [standardPrincipalCV(wallet)],
      senderAddress: wallet,
    });
    
    const json = cvToJSON(result);
    return json.value || 300;
  }
  
  /**
   * Get full credit data by unique ID
   */
  async getCreditData(uniqueId: string): Promise<CreditData | null> {
    const result = await callReadOnlyFunction({
      network: this.config.network,
      contractAddress: this.config.contractAddress,
      contractName: this.config.creditContractName,
      functionName: 'get-credit-data',
      functionArgs: [bufferCV(Buffer.from(uniqueId.slice(2), 'hex'))],
      senderAddress: this.config.contractAddress,
    });
    
    const json = cvToJSON(result);
    if (!json.value) return null;
    
    return {
      score: json.value.score.value,
      totalPayments: json.value['total-payments'].value,
      onTimePayments: json.value['on-time-payments'].value,
      latePayments: json.value['late-payments'].value,
      circlesCompleted: json.value['circles-completed'].value,
      circlesDefaulted: json.value['circles-defaulted'].value,
      totalVolume: json.value['total-volume'].value,
      firstActivity: json.value['first-activity'].value,
      lastUpdated: json.value['last-updated'].value,
    };
  }
  
  /**
   * Get payment history
   */
  async getPaymentHistory(uniqueId: string): Promise<PaymentRecord[]> {
    const result = await callReadOnlyFunction({
      network: this.config.network,
      contractAddress: this.config.contractAddress,
      contractName: this.config.creditContractName,
      functionName: 'get-payment-history',
      functionArgs: [bufferCV(Buffer.from(uniqueId.slice(2), 'hex'))],
      senderAddress: this.config.contractAddress,
    });
    
    const json = cvToJSON(result);
    return (json.value || []).map((record: any) => ({
      circleId: record['circle-id'].value,
      round: record.round.value,
      amount: record.amount.value,
      onTime: record['on-time'].value,
      block: record.block.value,
    }));
  }
  
  // ============ Identity Queries ============
  
  /**
   * Check if wallet is verified (has bound identity)
   */
  async isWalletVerified(wallet: string): Promise<boolean> {
    const result = await callReadOnlyFunction({
      network: this.config.network,
      contractAddress: this.config.contractAddress,
      contractName: this.config.identityContractName,
      functionName: 'is-wallet-bound',
      functionArgs: [standardPrincipalCV(wallet)],
      senderAddress: wallet,
    });
    
    const json = cvToJSON(result);
    return json.value === true;
  }
  
  /**
   * Get unique ID for wallet
   */
  async getUniqueIdByWallet(wallet: string): Promise<string | null> {
    const result = await callReadOnlyFunction({
      network: this.config.network,
      contractAddress: this.config.contractAddress,
      contractName: this.config.identityContractName,
      functionName: 'get-id-by-wallet',
      functionArgs: [standardPrincipalCV(wallet)],
      senderAddress: wallet,
    });
    
    const json = cvToJSON(result);
    return json.value ? `0x${json.value}` : null;
  }
  
  // ============ Circle Queries ============
  
  /**
   * Get circle details
   */
  async getCircle(circleId: number): Promise<CircleData | null> {
    const result = await callReadOnlyFunction({
      network: this.config.network,
      contractAddress: this.config.contractAddress,
      contractName: this.config.circleContractName,
      functionName: 'get-circle',
      functionArgs: [uintCV(circleId)],
      senderAddress: this.config.contractAddress,
    });
    
    const json = cvToJSON(result);
    if (!json.value) return null;
    
    return this.parseCircleData(json.value);
  }
}

// Types
export interface CreditData {
  score: number;
  totalPayments: number;
  onTimePayments: number;
  latePayments: number;
  circlesCompleted: number;
  circlesDefaulted: number;
  totalVolume: number;
  firstActivity: number;
  lastUpdated: number;
}

export interface PaymentRecord {
  circleId: number;
  round: number;
  amount: number;
  onTime: boolean;
  block: number;
}

export interface CircleData {
  name: string;
  creator: string;
  contributionAmount: number;
  totalMembers: number;
  currentRound: number;
  status: CircleStatus;
  createdAt: number;
  startBlock: number;
  roundDuration: number;
  gracePeriod: number;
  totalContributed: number;
  totalPaidOut: number;
}

export enum CircleStatus {
  FORMING = 0,
  ACTIVE = 1,
  PAUSED = 2,
  COMPLETED = 3,
  DISSOLVED = 4,
}
```

---

## 7. Backend Services

### 7.1 Service Architecture

```typescript
// services/identity/src/index.ts

import { createHash, randomBytes } from 'crypto';
import { db } from '@halo/database';
import { StacksService } from '@halo/stacks';

export class IdentityService {
  private stacks: StacksService;
  
  constructor(stacksService: StacksService) {
    this.stacks = stacksService;
  }
  
  /**
   * Register new user via social auth
   */
  async registerUser(socialAuthData: SocialAuthData): Promise<RegistrationResult> {
    // Check for existing user
    const existingUser = await db.users.findByEmail(socialAuthData.email.toLowerCase());
    if (existingUser) {
      throw new Error('Email already registered');
    }
    
    // Generate unique ID
    const uniqueId = this.generateUniqueId(socialAuthData);
    
    // Check for duplicate unique ID (shouldn't happen but safety check)
    const existingId = await db.users.findByUniqueId(uniqueId);
    if (existingId) {
      throw new Error('Identity collision detected');
    }
    
    // Create user record
    const user = await db.users.create({
      email: socialAuthData.email.toLowerCase(),
      name: socialAuthData.name,
      socialProvider: socialAuthData.provider,
      socialId: socialAuthData.socialId,
      uniqueId: uniqueId,
      status: 'pending_wallet',
      createdAt: new Date(),
    });
    
    return {
      userId: user.id,
      uniqueId: uniqueId,
      status: 'pending_wallet',
    };
  }
  
  /**
   * Generate deterministic unique ID from social auth
   */
  private generateUniqueId(data: SocialAuthData): string {
    const salt = process.env.HALO_ID_SALT!;
    const timestamp = Date.now();
    
    const input = [
      data.provider,
      data.socialId,
      data.email.toLowerCase(),
      timestamp.toString(),
      salt,
    ].join('|');
    
    const hash = createHash('sha256').update(input).digest('hex');
    return `0x${hash}`;
  }
  
  /**
   * Process wallet binding (after on-chain confirmation)
   */
  async processWalletBinding(
    userId: string, 
    walletAddress: string, 
    txId: string
  ): Promise<void> {
    // Verify transaction on chain
    const txStatus = await this.stacks.getTransactionStatus(txId);
    if (txStatus !== 'success') {
      throw new Error('Binding transaction not confirmed');
    }
    
    // Update user record
    await db.users.update(userId, {
      walletAddress: walletAddress,
      bindingTxId: txId,
      status: 'active',
      walletBoundAt: new Date(),
    });
    
    // Emit event
    await eventBus.emit('wallet.bound', { userId, walletAddress, txId });
  }
}

// Types
interface SocialAuthData {
  provider: 'google' | 'apple' | 'github' | 'email';
  socialId: string;
  email: string;
  name: string;
}

interface RegistrationResult {
  userId: string;
  uniqueId: string;
  status: 'pending_wallet';
}
```

### 7.2 Circle Service

```typescript
// services/circle/src/index.ts

import { db } from '@halo/database';
import { StacksService } from '@halo/stacks';
import { NotificationService } from '@halo/notifications';

export class CircleService {
  private stacks: StacksService;
  private notifications: NotificationService;
  
  constructor(stacks: StacksService, notifications: NotificationService) {
    this.stacks = stacks;
    this.notifications = notifications;
  }
  
  /**
   * Create circle via API (frontend interaction)
   */
  async createCircle(
    creatorId: string,
    params: CreateCircleParams
  ): Promise<CircleCreationResult> {
    // Get user's wallet
    const user = await db.users.findById(creatorId);
    if (!user?.walletAddress) {
      throw new Error('Wallet not bound');
    }
    
    // Generate invite code
    const inviteCode = this.generateInviteCode();
    
    // Store pending circle (before on-chain)
    const pendingCircle = await db.circles.create({
      creatorId: creatorId,
      name: params.name,
      contributionAmount: params.contributionAmount,
      totalMembers: params.totalMembers,
      roundDuration: params.roundDurationDays * 4320, // blocks
      gracePeriod: params.gracePeriodDays * 4320,
      inviteCode: inviteCode,
      status: 'pending_creation',
      createdAt: new Date(),
    });
    
    return {
      pendingCircleId: pendingCircle.id,
      inviteCode: inviteCode,
      inviteLink: `https://usehalo.fun/join/${inviteCode}`,
      // Frontend will submit on-chain transaction
    };
  }
  
  /**
   * Process on-chain circle creation (after TX confirmed)
   */
  async processCircleCreation(
    pendingCircleId: string,
    onChainCircleId: number,
    txId: string
  ): Promise<void> {
    await db.circles.update(pendingCircleId, {
      onChainId: onChainCircleId,
      creationTxId: txId,
      status: 'forming',
    });
    
    await eventBus.emit('circle.created', { 
      circleId: pendingCircleId, 
      onChainId: onChainCircleId 
    });
  }
  
  /**
   * Join circle via invite link
   */
  async joinCircle(
    userId: string,
    inviteCode: string
  ): Promise<JoinResult> {
    const circle = await db.circles.findByInviteCode(inviteCode);
    if (!circle) {
      throw new Error('Circle not found');
    }
    
    if (circle.status !== 'forming') {
      throw new Error('Circle is not accepting members');
    }
    
    const user = await db.users.findById(userId);
    if (!user?.walletAddress) {
      throw new Error('Wallet not bound');
    }
    
    // Check if already member
    const existingMember = await db.circleMembers.find(circle.id, userId);
    if (existingMember) {
      throw new Error('Already a member');
    }
    
    // Store pending membership (before on-chain)
    const pendingMembership = await db.circleMembers.create({
      circleId: circle.id,
      userId: userId,
      status: 'pending_join',
    });
    
    return {
      pendingMembershipId: pendingMembership.id,
      circleId: circle.id,
      onChainCircleId: circle.onChainId,
      // Frontend will submit on-chain transaction
    };
  }
  
  /**
   * Generate unique invite code
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
```

---

## 8. Database Schema

### 8.1 PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  social_provider VARCHAR(50) NOT NULL,
  social_id VARCHAR(255) NOT NULL,
  unique_id VARCHAR(66) UNIQUE NOT NULL, -- 0x + 64 hex chars
  wallet_address VARCHAR(100) UNIQUE,
  binding_tx_id VARCHAR(66),
  status VARCHAR(50) NOT NULL DEFAULT 'pending_wallet',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  wallet_bound_at TIMESTAMP,
  
  CONSTRAINT unique_social UNIQUE (social_provider, social_id)
);

-- Index for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_unique_id ON users(unique_id);

-- Circles table
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  on_chain_id INTEGER UNIQUE,
  creator_id UUID REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  contribution_amount BIGINT NOT NULL, -- in micro-units
  total_members INTEGER NOT NULL,
  round_duration INTEGER NOT NULL, -- in blocks
  grace_period INTEGER NOT NULL, -- in blocks
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_creation',
  creation_tx_id VARCHAR(66),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_circles_invite ON circles(invite_code);
CREATE INDEX idx_circles_status ON circles(status);

-- Circle members table
CREATE TABLE circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id),
  user_id UUID REFERENCES users(id),
  payout_position INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_join',
  join_tx_id VARCHAR(66),
  joined_at TIMESTAMP,
  
  CONSTRAINT unique_member UNIQUE (circle_id, user_id)
);

-- Contributions table
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id),
  user_id UUID REFERENCES users(id),
  round INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  on_time BOOLEAN NOT NULL,
  tx_id VARCHAR(66) NOT NULL,
  contributed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_contribution UNIQUE (circle_id, user_id, round)
);

-- Payouts table
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id),
  recipient_id UUID REFERENCES users(id),
  round INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  tx_id VARCHAR(66) NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_payout UNIQUE (circle_id, round)
);

-- Credit scores cache (mirror of on-chain)
CREATE TABLE credit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  unique_id VARCHAR(66) UNIQUE NOT NULL,
  score INTEGER NOT NULL DEFAULT 300,
  total_payments INTEGER NOT NULL DEFAULT 0,
  on_time_payments INTEGER NOT NULL DEFAULT 0,
  late_payments INTEGER NOT NULL DEFAULT 0,
  circles_completed INTEGER NOT NULL DEFAULT 0,
  circles_defaulted INTEGER NOT NULL DEFAULT 0,
  total_volume BIGINT NOT NULL DEFAULT 0,
  last_synced_block INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_scores_score ON credit_scores(score);
```

---

## 9. API Specifications

### 9.1 REST API Endpoints

```yaml
# OpenAPI 3.0 Specification (abbreviated)

paths:
  /auth/social:
    post:
      summary: Authenticate via social provider
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                provider:
                  type: string
                  enum: [google, apple, github, email]
                token:
                  type: string
      responses:
        200:
          description: Authentication successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  userId: string
                  uniqueId: string
                  status: string
                  jwt: string

  /identity/bind-wallet:
    post:
      summary: Initiate wallet binding
      security:
        - BearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                walletAddress: string
      responses:
        200:
          description: Binding parameters returned
          
  /identity/confirm-binding:
    post:
      summary: Confirm wallet binding after on-chain TX
      security:
        - BearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                txId: string
      responses:
        200:
          description: Binding confirmed

  /circles:
    post:
      summary: Create new circle
      security:
        - BearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateCircleRequest'
      responses:
        200:
          description: Circle creation initiated

  /circles/{circleId}/join:
    post:
      summary: Join circle
      security:
        - BearerAuth: []
        
  /circles/{circleId}/contribute:
    post:
      summary: Make contribution
      security:
        - BearerAuth: []

  /credit/score:
    get:
      summary: Get current user's credit score
      security:
        - BearerAuth: []
      responses:
        200:
          description: Credit score data

  /credit/score/{wallet}:
    get:
      summary: Get credit score by wallet (public SDK endpoint)
      responses:
        200:
          description: Credit score for wallet
```

---

## 10. Security Architecture

### 10.1 Security Measures

| Layer | Security Measure |
|-------|------------------|
| Identity | Social OAuth + unique ID hash with server-side salt |
| Wallet | One-time binding, on-chain enforcement |
| API | JWT authentication, rate limiting |
| Smart Contracts | Clarity's decidability, no reentrancy issues |
| Data | PostgreSQL RLS, encrypted at rest |

### 10.2 Clarity Security Benefits

Clarity smart contracts provide inherent security advantages:

1. **Decidable**: All Clarity programs are guaranteed to terminate
2. **No Reentrancy**: Post-conditions prevent reentrancy attacks
3. **Readable**: Clear visibility into contract behavior
4. **Type-Safe**: Strong typing prevents common bugs

---

## 11. Infrastructure & Deployment

### 11.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION STACK                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Vercel (Frontend)                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Next.js App     │  Static Assets     │  Edge Functions              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Railway / Render (Backend)                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Node.js API     │  Background Workers │  Cron Jobs                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Supabase (Database)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL      │  Redis (via Upstash) │  Auth                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Stacks Blockchain                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Testnet         │  Mainnet (Production)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Clarinet Deployment

```bash
# Initialize project
clarinet new halo-protocol
cd halo-protocol

# Add contracts
clarinet contract new halo-identity
clarinet contract new halo-circle
clarinet contract new halo-credit

# Test
clarinet test

# Check coverage
clarinet test --coverage

# Deploy to testnet
clarinet deployments apply -p deployments/testnet.yaml

# Deploy to mainnet
clarinet deployments apply -p deployments/mainnet.yaml
```

---

## 12. Stacks-Specific Considerations

### 12.1 Block Times & Confirmation

- Stacks block time: ~10-15 minutes (anchored to Bitcoin)
- Design UI for async confirmation
- Use webhooks for transaction status updates

### 12.2 Token Considerations

Halo supports multi-token circles via SIP-010 trait:
- **STX**: Native Stacks token (via `create-circle` + `contribute-stx`)
- **SIP-010 tokens**: Any compliant token (via `create-token-circle` + `contribute-token`)
- **sBTC**: Bitcoin on Stacks (staking for rewards + credit boosts)
- **Collateral**: Stablecoin deposits in vault (80% LTV for circle participation)

### 12.3 Wallet Integration

Supported wallets:
- **Leather** (formerly Hiro Wallet): Most popular
- **Xverse**: Good mobile support

```typescript
import { showConnect, openContractCall } from '@stacks/connect';
```

### 12.4 Stacks API & Indexing

Use Hiro's APIs for chain data:
- **Stacks API**: https://api.hiro.so
- **Stacks.js**: Client library

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| ROSCA | Rotating Savings and Credit Association |
| Unique ID | Deterministic identifier from social auth |
| Circle | A group of users participating in a lending circle |
| Contribution | Regular payment made by circle members |
| Payout | Distribution of pooled funds to a member |
| Credit Score | 300-850 scale rating based on payment history |
| Clarity | Stacks smart contract language |
| SIP-010 | Stacks token standard (like ERC-20) |

---

## Appendix B: References

1. Stacks Documentation: https://docs.stacks.co
2. Clarity Language Reference: https://book.clarity-lang.org
3. Stacks.js Library: https://github.com/hirosystems/stacks.js
4. Clarinet Tooling: https://github.com/hirosystems/clarinet
5. Leather Wallet: https://leather.io/

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Feb 2026 | XXIX Labs | Initial Stacks adaptation |
| 2.0.0 | Feb 2026 | XXIX Labs | Phase 2.5: vault, staking, multi-token, 8 contracts |
