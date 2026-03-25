---
sidebar_position: 3
title: Glossary
description: Key terms and definitions used throughout Halo Protocol.
---

# Glossary

---

### Basis Points (bp)
A unit equal to 1/100th of a percentage point. 100 bp = 1%. Used for fees and LTV ratios. The protocol fee of 100 bp equals 1%.

### Bidding Circle
A V2 circle where members bid for early access to the pool each round. The lowest bidder wins and must repay their bid over remaining rounds. Also called a "chit fund."

### Bind / Binding
The one-time, irreversible process of linking a Stacks wallet address to a social identity hash via the `halo-identity` contract.

### Block Height
The sequential number of a block on the Stacks blockchain. Approximately 144 blocks are produced per day.

### Clarity
The smart contract language used on Stacks. Clarity is decidable (not Turing-complete), meaning program behavior can be fully analyzed before deployment.

### Classic ROSCA
A V1 circle with fixed payout order based on join position. The traditional rotating savings model.

### Collateral
Assets deposited in the vault to back circle commitments. If a member defaults, their collateral is slashed.

### Commitment
The USD-denominated amount locked in the vault when a user joins a circle. Equals `contribution × (total_members - 1) × token_price`.

### Contribution
The fixed amount each circle member pays each round. Set at circle creation and cannot be changed.

### Credit Score
An on-chain score (300–850) calculated from verifiable behavior: payments, circle completions, volume, tenure, consistency, and staking. Stored in `halo-credit`.

### Default
When a circle member fails to contribute their required amount for a round. Results in collateral slashing and credit score reduction.

### Deployer
The wallet address that deployed the Halo contracts. Holds admin privileges and is used for faucet token minting.

### Dividend
In V2 circles, the surplus from each round (pool - fee - winning bid) divided equally among all members.

### Epoch
A Stacks blockchain configuration version. Halo uses Epoch 3.0, which enables Clarity 3.

### Grace Period
The number of blocks after a round starts during which contributions are considered "on-time." Affects credit score.

### hUSD
Halo Test USD — a mock SIP-010 stablecoin with 6 decimals, used on testnet.

### Identity
A user's verified on-chain identity, consisting of a wallet address bound to a SHA-256 hash of their social provider and account ID.

### Invite Code
A unique code generated when a circle is created. Shared as a link for others to join.

### LTV (Loan-to-Value)
The ratio of borrowing capacity to collateral value. 80% LTV means $100 collateral provides $80 capacity.

### Lock Period
The minimum time sBTC must remain staked before it can be withdrawn. Default: 4,320 blocks (~30 days).

### Nonce
A sequential number attached to each transaction from a wallet, ensuring transaction ordering. Managed by the nonce manager for deployer transactions.

### Payout
The distribution of the round's pool to a single member. In V1, determined by position. In V2, determined by bidding.

### Pool
The total contributions collected in a single round. For a 5-member circle with 100 STX contribution, the pool is 500 STX.

### Post-Condition
A Stacks transaction feature that limits token transfers. Users can set post-conditions to ensure a transaction cannot transfer more than expected.

### Protocol Fee
A percentage deducted from each payout. Default: 1% (100 basis points). Range: 0–10%.

### ROSCA
**Rotating Savings and Credit Association** — a traditional group savings mechanism used globally. Members pool money and take turns receiving the pot.

### Round
One cycle of a lending circle. Each round, all members contribute and one member receives the payout.

### Round Duration
The length of each round in blocks, set at circle creation. Minimum: 144 blocks (~1 day).

### sBTC
Wrapped Bitcoin on Stacks. Can be staked in Halo for yield and credit score boosts.

### SIP-010
The Stacks Improvement Proposal defining the standard interface for fungible tokens (similar to ERC-20 on Ethereum).

### Slashing
The process of reducing a defaulting member's vault deposit to cover their missed contribution.

### Stacks
A Bitcoin layer that enables smart contracts and decentralized applications, with transactions settling on Bitcoin.

### Synthetix-style Rewards
A continuous reward distribution mechanism where rewards accrue proportionally to deposited/staked amounts over time. Used in both the vault and staking modules.

### Unique ID
A 32-byte SHA-256 hash derived from a user's social provider and account ID. Serves as the on-chain identifier linked to a wallet.

### Vault
The collateral management contract (`halo-vault`). Holds deposited assets, enforces LTV ratios, and handles collateral locking/releasing/slashing.

### Yield
Rewards earned by vault depositors or sBTC stakers, distributed continuously from admin-funded reward pools.
