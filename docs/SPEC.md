# Hub Evidence Anchor — Solana Program Specification v0.1
**Version:** 0.1
**Date:** 2026-04-04
**Authors:** Hub x quadricep
**Status:** Draft — for Colosseum Frontier Hackathon submission

---

## 1. Overview

**What it does:** Anchors Hub's behavioral trust data directly on Solana via an Anchor program — so any Solana agent or protocol can verify an agent's trust score without calling the Hub API.

**Why it matters:** The agentic economy is stalling because agents can't verify each other's trustworthiness. Every transaction above a threshold requires a trust check. Hub's obligation state machine is the only system where counterparty verifies delivery (not self-reporting). Anchoring this on Solana makes it independently verifiable and composable with every other Solana protocol.

---

## 2. Problem Statement

**The trust vacuum:** x402 payments, MCP tool access, and A2A coordination exist on Solana — but no way to verify whether an agent actually delivered what it committed to. Dune Analytics shows x402 tx volume down 95%+ from peak. The agentic economy is stalling because trust infrastructure is missing.

**Existing trust signals fall short:**
- Wallet tenure (how long has this wallet existed?) ≠ accountability
- Code audits (is this code safe?) ≠ behavioral delivery
- Identity assertions (who is this agent?) ≠ commitment fulfillment
- Escrow (what happens after failure?) = punishment, not prevention

**The gap:** No system verifies whether an agent DID what it COMMITTED to doing. This requires a counterparty to confirm delivery — not the agent self-reporting.

---

## 3. Solution

Hub Evidence Anchor: a Solana Anchor program that exposes Hub's behavioral trust data as an on-chain, independently verifiable record.

Any Solana agent or protocol calls `verify_trust` via CPI (Cross-Program Invocation) and gets the trust ratio without any Hub API call. The data is:
- Sourced from Hub's live obligation state machine
- Written to a Solana PDA (Program Derived Address) via `anchor_evidence`
- Updated after each obligation state transition
- Verifiable by any party without requesting Hub's permission

---

## 4. Architecture

### 4.1 On-Chain Program (Solana, Anchor 0.32.1)

**Program ID:** TBD (deploy to devnet first)

**Account: `HubEvidence` (PDA)**
```rust
#[account]
pub struct HubEvidence {
    pub agent_id: String,           // e.g. "quadricep"
    pub hub_endpoint: String,      // e.g. "https://admin.slate.ceo/oc/brain/"
    pub obligation_count: u32,     // total obligations
    pub resolved_count: u32,      // successfully resolved
    pub failed_count: u32,        // failed or rejected
    pub evidence_hash: String,     // SHA-256 of latest evidence bundle
    pub resolution_rate: f64,      // resolved_count / obligation_count
    pub last_updated: i64,         // Unix timestamp
    pub authority: Pubkey,         // Hub's authority key (can update)
}
```

**PDA Derivation:** `["hub-evidence", agent_id.as_bytes()]`

### 4.2 Instructions

#### `anchor_evidence`
Writes or updates trust data for an agent. Called by Hub's backend after each obligation state transition.

**Accounts:**
- `hub_evidence` (PDA, writable): the evidence account
- `authority` (signer): Hub's authority key
- `system_program`: Solana system program

**Data:**
```json
{
  "agent_id": "quadricep",
  "obligation_count": 63,
  "resolved_count": 42,
  "failed_count": 16,
  "evidence_hash": "sha256:abc123...",
  "resolution_rate": 0.6667
}
```

#### `verify_trust`
Returns trust data to any caller. Callable by any Solana account via CPI.

**Accounts:**
- `hub_evidence` (PDA, readonly): the evidence account

**Returns:**
```json
{
  "agent_id": "quadricep",
  "resolution_rate": 0.6667,
  "obligation_count": 63,
  "evidence_hash": "sha256:abc123...",
  "last_updated": 1743810000
}
```

#### `update_resolution`
Updates resolution data after obligation state changes. Authority only.

#### `close_stale`
Archives an outdated evidence account. Authority only.

### 4.3 Data Flow

```
Hub Backend
    |
    | anchor_evidence(agent_id, obligation_count, resolved_count,
    |                 failed_count, evidence_hash, resolution_rate)
    v
Solana Program (HubEvidenceAnchor)
    |
    | writes to PDA: ["hub-evidence", agent_id]
    v
Solana Blockchain (on-chain, immutable, independently verifiable)
    ^
    |
Any Solana Agent / Protocol
    |
    | verify_trust(agent_id) via CPI
    |
```

### 4.4 Hub Integration

Hub's backend calls `anchor_evidence` after each obligation state transition:
- Obligation created → increment `obligation_count`
- Obligation resolved → increment `resolved_count`
- Obligation failed/rejected → increment `failed_count`
- Recalculate `resolution_rate = resolved_count / obligation_count`
- Generate `evidence_hash` from latest obligation bundle

Hub's backend needs:
1. A Solana keypair with authority to call `anchor_evidence`
2. An RPC endpoint (Helius for devnet + mainnet)
3. The deployed program ID

---

## 5. Hackathon Demo Scope (April 6 – May 11)

### MVP (April 20 checkpoint)
- [ ] Anchor program deployed to Solana devnet
- [ ] `anchor_evidence` instruction: write Hub trust data to PDA
- [ ] `verify_trust` instruction: return trust data to CPI callers
- [ ] Hub backend integration: call `anchor_evidence` on obligation state changes
- [ ] Demo page showing trust ratio for quadricep on Solana
- [ ] Two-agent demo: Agent A queries Agent B's trust ratio before delegating

### Full Scope (May 11)
- [ ] Mainnet deployment
- [ ] Threshold-gated routing (MEYRA-style API surface):
  - `resolution_rate >= 0.5`: micro-payments allowed
  - `resolution_rate >= 0.75`: escrow contracts
  - `resolution_rate >= 0.9`: high-value transactions
- [ ] MEYRA integration: on-chain ratings feed into trust decisions
- [ ] x402 integration: payment gated by trust threshold
- [ ] Multi-agent demo: 3+ agents demonstrating trust-gated delegation

---

## 6. Technical Stack

| Component | Technology |
|-----------|-----------|
| On-chain program | Anchor 0.32.1, Rust |
| Deployment | Solana devnet → mainnet |
| RPC provider | Helius (free devnet tier) |
| Signing | AgentWallet for hackathon; production: HSM |
| Program framework | @coral-xyz/anchor |
| SDK | TypeScript for Hub backend integration |
| Verification | Any Solana wallet or protocol via CPI |

---

## 7. Differentiation

| Approach | Mechanism | Limitation |
|----------|-----------|------------|
| BlockHelix | Financial escrow + bond slashing | Economic punishment AFTER failure |
| ClawVer | Execution verification (output schema) | Verifies output quality, not commitment |
| TOWEL | Relationship-graph trust (git repos) | Requires bilateral relationship |
| MEYRA | Token/contract safety verification | Is code safe? ≠ did agent deliver? |
| SATI/ERC-8004 | Wallet tenure reputation | Tenure ≠ accountability |
| **Hub Evidence Anchor** | **Multi-party obligation verification** | **Counterparty confirms delivery** |

---

## 8. Future Vision

**V1 (hackathon):** Live anchor program + two-agent demo proving behavioral trust is independently verifiable on Solana.

**V2:** Threshold-gated routing (micro-payments ≥0.5, escrow ≥0.75, high-value ≥0.9) as MEYRA-style API surface. Any Solana protocol can gate features by trust threshold.

**V3:** Multi-chain evidence anchoring (Solana + Ethereum) + MCP-I Level 3 behavioral anomaly detection integration. Trust data becomes the interest rate for agentic commerce.

**Long-term:** Every agent transaction above $10 on Solana queries Hub Evidence Anchor first. The resolution rate becomes the trust score that powers the agentic economy.

---

## 9. Repository

```
https://github.com/shirtlessfounder/hub-evidence-anchor
```

Structure:
```
hub-evidence-anchor/
├── programs/
│   └── hub-evidence-anchor/
│       └── src/
│           ├── lib.rs
│           └── instructions/
│               ├── anchor_evidence.rs
│               ├── verify_trust.rs
│               ├── update_resolution.rs
│               └── close_stale.rs
├── tests/
│   └── hub-evidence-anchor.ts
├── scripts/
│   └── deploy-devnet.sh
├── docs/
│   └── SPEC.md
├── README.md
├── Cargo.toml
├── Anchor.toml
└── package.json
```
