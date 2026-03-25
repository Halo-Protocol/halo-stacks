---
sidebar_position: 1
title: Admin & Governance
description: Admin roles, privileged operations, and the path to decentralization.
---

# Admin & Governance

Halo Protocol is currently admin-managed with a clear path toward decentralization. This page documents all admin powers, how they're used, and the plan for reducing centralization.

---

## Admin Role

Each contract has its own admin (the deployer by default). The admin can:

| Contract | Admin Powers |
|---|---|
| **halo-identity** | Deactivate/reactivate users, transfer admin |
| **halo-credit** | Authorize contracts to record scores, transfer admin |
| **halo-vault** | Set token prices, LTV ratio, fund yield pool, authorize contracts |
| **halo-circle** | Pause/resume circles, set protocol fee, transfer admin |
| **halo-sbtc-staking** | Set staking token, min lock, fund rewards, transfer admin |

---

## What Admin CAN Do

- **Pause circles** — Emergency stop for active circles (no contributions or payouts)
- **Resume circles** — Restart paused circles
- **Set protocol fee** — Adjust fee from 0–10%
- **Set token prices** — Update price oracle values
- **Adjust LTV ratio** — Change collateral requirements (50–90%)
- **Fund yield/reward pools** — Add tokens to reward distribution
- **Authorize contracts** — Grant contracts permission to record payments/lock collateral
- **Deactivate users** — Mark users as inactive (for violations)
- **Transfer admin** — Hand off admin role to a new address

---

## What Admin CANNOT Do

- **Move user funds** — Deposited/staked funds can only be moved by the owner
- **Change circle terms** — Contribution, members, and duration are set at creation
- **Unbind wallets** — Identity binding is permanent and irreversible
- **Modify credit scores** — Scores are computed deterministically from recorded data
- **Override payouts** — Payouts follow contract logic (position-based or auction-based)
- **Access private keys** — Users retain full custody of their wallets

---

## Admin Transfer

Any admin role can be transferred:

```clarity
(contract-call? .halo-identity set-admin new-admin-principal)
(contract-call? .halo-credit set-admin new-admin-principal)
(contract-call? .halo-vault set-admin new-admin-principal)  ;; via authorize pattern
(contract-call? .halo-circle set-admin new-admin-principal)
(contract-call? .halo-sbtc-staking set-admin new-admin-principal)
```

This is a one-step transfer (no two-step confirmation), so it must be used carefully.

---

## Backend Admin

The backend has admin-protected endpoints:

| Endpoint | Auth Method | Purpose |
|---|---|---|
| `POST /api/admin/sync` | Bearer token | Batch sync circles from chain |
| `GET /api/admin/stats` | Session (admin role) | Protocol statistics |
| `GET /api/admin/vault` | Session (admin role) | Vault admin data |

Bearer token authentication uses `crypto.timingSafeEqual` for timing-safe comparison.

---

## Decentralization Roadmap

### Phase 1: Managed (Current)
- Single admin controls all contracts
- Price oracle is admin-set
- Protocol fee is admin-set
- Yield pools are admin-funded

### Phase 2: Multi-Sig
- Transfer admin to a multi-signature wallet
- Multiple key holders required for admin actions
- Time-locked operations for sensitive changes

### Phase 3: Community Governance
- Introduce governance mechanism for parameter changes
- Community votes on fee rates, LTV ratios, and token support
- Potential governance token if community demands it

### Phase 4: Full Decentralization
- Integrate decentralized price oracles
- Automated yield sourcing from DeFi integrations
- Admin role minimized to emergency pause only

---

## Transparency Commitments

1. **All admin actions are on-chain** — Every parameter change is a public transaction
2. **No hidden admin powers** — All admin functions are documented in contract source
3. **Open source** — Full contract and application code is publicly available
4. **Audit trail** — Admin transactions can be verified on the Stacks Explorer
