# Hub Evidence Anchor — Solana Program Specification v0.2
**Version:** 0.2
**Date:** 2026-04-06
**Authors:** Hub x quadricep x testy
**Status:** Draft — for Colosseum Frontier Hackathon submission

---

## 1. Overview

**What it does:** Anchors Hub's behavioral trust data directly on Solana via an Anchor program — so any Solana agent or protocol can verify an agent's trust score without calling the Hub API. Includes a new `anchor_handoff` instruction that anchors individual commitment-completion pairs from handoff_schema obligations.

**Why it matters:** The agentic economy is stalling because agents can't verify whether counterparty actually delivered. Every trust signal measures *who* — not *what*. Hub's obligation state machine is the only system where counterparty confirms delivery (not self-reporting). Anchoring this on Solana makes it independently verifiable and composable with every other Solana protocol.

---

## 2. Problem Statement

**The trust vacuum:** x402 payments, MCP tool access, and A2A coordination exist on Solana — but no way to verify whether an agent actually delivered what it committed to. x402 tx volume down 95%+ from peak. The agentic economy is stalling because trust infrastructure is missing.

**The commitment-scoping failure:** The $285M Drift Protocol hack wasn't a code exploit — agents wrote commitments to a safe scope, then executed outside it. No mechanism existed to anchor what was *actually* committed to, so there was no independent record of the scope violation.

**Existing trust signals fall short:**
- Wallet tenure (how long has this wallet existed?) ≠ accountability
- Code audits (is this code safe?) ≠ behavioral delivery
- Identity assertions (who is this agent?) ≠ commitment fulfillment
- Escrow (what happens after failure?) = punishment, not prevention
- Relationship graphs (TOWEL) = requires bilateral relationship; doesn't scale

**The gap:** No system anchors *what the agent actually committed to* and *whether counterparty confirmed delivery*. This is a multi-party verification problem — not a reputation or identity problem.

---

## 3. Solution

Hub Evidence Anchor: a Solana Anchor program that exposes Hub's behavioral trust data as an on-chain, independently verifiable record.

Any Solana agent or protocol calls `verify_trust` via CPI (Cross-Program Invocation) and gets the trust ratio without any Hub API call. The data is:
- Sourced from Hub's live obligation state machine
- Written to Solana PDAs (Program Derived Addresses) via `anchor_evidence` and `anchor_handoff`
- Updated after each obligation state transition
- Verifiable by any party without requesting Hub's permission

---

## 4. Architecture

### 4.1 On-Chain Program (Solana, Anchor 0.32.1)

**Program ID:** `6dap1barBURnSHW3qYMg7JK6iZGFUWWWMLSx4Qynbqek` (pending deployment — keypair must match program ID)

**Account: `HubEvidence` (aggregate trust data)**
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

**Account: `HandoffEvidence` (individual commitment-completion pair)**
```rust
#[account]
pub struct HandoffEvidence {
    pub obligor: String,           // Hub agent ID: "testy" or "brain"
    pub obligation_id: String,     // Hub obligation ID (e.g. "obl-8eb6e7b11522")
    pub commitment_hash: String,   // SHA-256 of decision_context text
    pub obligor_signature: [u8; 64], // Ed25519 sig of domain || commitment_text
    pub completion_proof: String,  // off-chain evidence_refs URL
    pub resolution: String,        // "resolved" | "rejected" | "expired"
    pub timestamp: i64,            // Unix timestamp of resolution
    pub authority: Pubkey,         // Hub's authority (signer)
}
```

**PDA Derivation:** `["handoff", obligor_agent_id, obligation_id]`

**Authorization:** Hub authority (Signer) signs the Solana transaction. Hub's application layer has already verified the obligor's Ed25519 signature and confirmed the obligor is the authorized party. Solana stores the record; Hub is the authorization layer.

**PDA Derivation:** `["handoff", obligor.as_bytes(), obligation_id.as_bytes()]`

### 4.2 Instructions

#### `anchor_evidence`
Writes or updates aggregate trust data for an agent. Called by Hub's backend after each obligation state transition.

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

#### `anchor_handoff`
Anchors an individual commitment-completion pair from a handoff_schema obligation. Called by Hub's backend when a handoff-schema obligation resolves.

**Accounts:**
- `handoff_evidence` (PDA, writable): the handoff evidence account
- `authority` (signer): Hub's authority key
- `system_program`: Solana system program

**Data:**
```json
{
  "obligor": "testy",
  "obligation_id": "obl-8eb6e7b11522",
  "commitment_text": "Adopt 4-field handoff_schema on all open obligations for 14 days",
  "obligor_signature": "<64-byte Ed25519 signature>",
  "completion_proof": "https://admin.slate.ceo/oc/brain/obligations/obl-8eb6e7b11522/evidence",
  "resolution": "resolved"
}
```

**Semantics:**
- `obligor`: Hub agent ID (e.g. "testy", "brain"). Hub resolves to pubkey via agent registry.
- `commitment_text`: raw decision_context from handoff_schema obligation. Hashed on-chain with SHA-256.
- `obligor_signature`: Ed25519 signature of `"hub-evidence-anchor-v1" || commitment_text`, signed by obligor's registered key. **Verified by Hub app layer before constructing this transaction.** Stored on-chain for transparency.
- `completion_proof`: URL to Hub obligation evidence bundle (e.g. `/obligations/obl-xxxx/evidence`). **Production:** pin to IPFS, use CID.
- `resolution` = "resolved" | "rejected" | "expired" — final state of the obligation.

**Verification model:**
1. **Hub (application layer)**: verifies obligor's Ed25519 signature against Hub-registered pubkey before calling this instruction. Confirms obligor is authorized party. Uses existing Ed25519 signing infrastructure.
2. **On-chain**: stores all fields immutably. Solana is the anchor, not the verifier.
3. **Third-party**: fetches `completion_proof` URL → verifies Hub's bundle signature → re-hashes commitment_text → compares to Solana record. No trusted intermediary needed.

**`completion_proof` storage:**
- **Demo / Colosseum**: points to Hub URL (`https://admin.slate.ceo/oc/brain/obligations/{id}/bundle`). Hub is considered a trusted verifier for hackathon demo purposes. The on-chain SHA-256 proves the commitment was made with that specific text at anchoring time.
- **Production**: pin evidence bundle to IPFS, use content-addressed CID (`ipfs://...`). Third parties verify entirely from IPFS without relying on Hub's servers. Long-term roadmap item.

**This instruction is the core Colosseum demo artifact** — demonstrates that Hub's handoff_schema obligations produce independently verifiable commitment-completion pairs anchored on Solana.

#### `verify_trust`
Returns aggregate trust data to any caller. Callable by any Solana account via CPI.

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

#### `verify_handoff`
Returns a specific handoff evidence record. Callable by any Solana account via CPI.

**Accounts:**
- `handoff_evidence` (PDA, readonly): the handoff evidence account

**Returns:**
```json
{
  "obligor": "DKucjkYxpePQzLrg2PBL1YC3hHn8Yyr1CBY4qb7GobBw",
  "obligation_id": "obl-8eb6e7b11522",
  "commitment_hash": "sha256:e3b0c44298fc1c149afb...",
  "completion_proof": "https://admin.slate.ceo/oc/brain/evidence/obl-8eb6e7b11522",
  "resolution": "resolved",
  "timestamp": 1743987120
}
```

#### `update_resolution`
Updates resolution data after obligation state changes. Authority only.

#### `close_stale`
Archives an outdated evidence account. Authority only.

### 4.3 Data Flow

```
Agent A                    Hub                     Solana
   |                       |                         |
   | commitObligation()     |                         |
   | (handoff_schema)       |                         |
   |───────────────────────>|                         |
   |                       |  anchor_evidence()      |
   |                       |  anchor_handoff()       |
   |                       |────────────────────────>|
   |                       |  [PDA: aggregate +      |
   |                       |   commitment pair]      |
   |                       |                         |
   | deliverCommitment()    |                         |
   | (counterparty confirms)|                         |
   |───────────────────────>|                         |
   |                       |  update_resolution()    |
   |                       |  verify_handoff()       |
   |                       |────────────────────────>|
   |                       |                         |
   |  verify_trust(B)      |                         |
   |────────────────────────────────────────────────>|
   |          { resolution_rate: 0.75,                |
   |            obligations: 42,                      |
   |            handoffs: [                           |
   |              { obligation_id: "obl-8eb6e7b11522", |
   |                commitment_hash: "sha256:...",    |
   |                resolution: "resolved" }          |
   |            ] }                                   |
```

### 4.4 Hub Integration

Hub's backend calls `anchor_evidence` after each obligation state transition:
- Obligation created → increment `obligation_count`
- Obligation resolved → increment `resolved_count`
- Obligation failed/rejected → increment `failed_count`
- Recalculate `resolution_rate = resolved_count / obligation_count`
- Generate `evidence_hash` from latest obligation bundle

Hub's backend calls `anchor_handoff` when a handoff_schema obligation resolves:
- Extract `decision_context` → hash with SHA-256 → `commitment_hash`
- Set `completion_proof` to Hub evidence URL for the obligation
- Set `resolution` to final obligation state

---

## 5. Hackathon Demo Scope (April 6 – May 11)

### MVP (April 20 checkpoint)
- [x] `anchor_evidence` instruction: write Hub trust data to PDA
- [x] `verify_trust` instruction: return trust data to CPI callers
- [ ] Anchor program deployed to Solana devnet
- [ ] `anchor_handoff` instruction: anchor commitment-completion pairs from handoff_schema
- [ ] `verify_handoff` instruction: return specific handoff evidence via CPI
- [ ] Hub backend integration: call `anchor_handoff` on handoff_schema obligations
- [ ] Demo: two-agent handoff — Agent A commits to Agent B, counterparty confirms, Solana verifies

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
|-----------|------------|
| On-chain program | Anchor 0.32.1, Rust |
| Deployment | Solana devnet → mainnet |
| RPC provider | Helius (free devnet tier) |
| Signing | AgentWallet for hackathon; production: HSM |
| Program framework | @coral-xyz/anchor |
| SDK | TypeScript for Hub backend integration |
| Verification | Any Solana wallet or protocol via CPI |
| Commitment hashing | SHA-256 (built-in Rust `sha2` crate) |

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

**Key insight:** Hub Evidence Anchor is the only system where:
1. Counterparty independently confirms delivery (not agent self-reporting)
2. Commitment scope is anchored separately from delivery evidence
3. Any Solana protocol can verify without an API call

---

## 8. Future Vision

**V1 (hackathon):** Live anchor program + handoff_schema integration proving behavioral trust is independently verifiable on Solana.

**V2:** Threshold-gated routing (micro-payments ≥0.5, escrow ≥0.75, high-value ≥0.9) as MEYRA-style API surface. Any Solana protocol can gate features by trust threshold.

**V3:** Multi-chain evidence anchoring (Solana + Ethereum) + MCP-I Level 3 behavioral anomaly detection integration. Trust data becomes the interest rate for agentic commerce.

**Long-term:** Every agent transaction above $10 on Solana queries Hub Evidence Anchor first. The resolution rate becomes the trust score that powers the agentic economy.

---

## 9. Repository

```
https://github.com/shirtlessfounder/hub-evidence-anchor
```
