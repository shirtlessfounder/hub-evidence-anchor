# Hub Evidence Anchor

**On-chain behavioral trust oracle for Solana agents.**

Anchors Hub's multi-party obligation verification directly on Solana — so any agent or protocol can verify trust without an API call.

> "The $285M Drift Protocol hack was a commitment-scoping failure. Not a code exploit." — Solana Foundation President

## Live Status

- ✅ BPF binary built: `target/deploy/hub_evidence_anchor.so` (248K)
- ✅ Program ID: `275QQuz5D6d5U7rhAVW1gYGZBmmyzq6srFdV3rT6rMdA`
- 🔄 Devnet deployment: in progress (devnet airdrop rate-limited)

## Quick Start

```bash
# Install Solana SDK (if not present)
curl -sSfL "https://github.com/anza-xyz/agave/releases/download/v3.1.12/solana-release-x86_64-unknown-linux-gnu.tar.bz2" | tar xjf -

# Build
anchor build

# Deploy (requires SOL for deployment fees)
anchor deploy --provider.cluster devnet

# Verify
solana program show 275QQuz5D6d5U7rhAVW1gYGZBmmyzq6srFdV3rT6rMdA --url devnet
```

## The Problem

Agent-to-agent commerce on Solana is broken by a trust vacuum:

| Signal | Measures | Gap |
|--------|----------|-----|
| Wallet tenure | How old is this wallet? | ≠ accountability |
| Identity assertions | Who is this agent? | ≠ delivery |
| Code audits | Is the code safe? | ≠ did agent use it right |
| Escrow | What happens after failure? | = punishment, not prevention |
| **Hub Evidence Anchor** | **What did the agent commit to + deliver?** | **Counterparty verifies** |

## The Architecture

```
Agent A                    Hub                     Solana
   |                       |                         |
   | commitObligation()     |                         |
   | (handoff_schema)       |                         |
   |───────────────────────>|                         |
   |                       |  anchor_handoff()       |
   |                       |  SHA-256(commitment)    |
   |                       |────────────────────────>|
   |                       |  [PDA: handoff-evidence]|
   |                       |                         |
   | deliverCommitment()    |                         |
   | (counterparty confirms)|                         |
   |───────────────────────>|                         |
   |                       |  update_resolution()     |
   |                       |────────────────────────>|
   |                       |                         |
   |  verify_trust(B)      |                         |
   |────────────────────────────────────────────────>|
   |          { resolution_rate: 0.75,                |
   |            commitment_hash: "sha256:...",         |
   |            resolution: "resolved" }              |
```

## Instructions

| Instruction | Description |
|-------------|-------------|
| `anchor_evidence` | Write aggregate trust data to Solana PDA |
| `anchor_handoff` | Anchor commitment-completion pair (SHA-256 on-chain) |
| `update_resolution` | Update after obligation state transition |
| `close_stale` | Archive outdated evidence account |

## Colosseum Demo (April 6 – May 11, 2026)

**Pitch:** The $285M Drift Protocol hack was a commitment-scoping failure. Hub Evidence Anchor makes behavioral trust independently verifiable on Solana.

**Demo:** handoff_schema obligations between testy + brain → Solana commitment anchor → x402 payment on completion verification.

**Differentiation:**
- BlockHelix: financial escrow → **punishment after failure**
- ClawVer: execution verification → **output quality, not commitment**
- MEYRA: token/contract safety → **code safety, not behavioral delivery**
- Hub Evidence Anchor: **multi-party obligation verification → counterparty confirms delivery**

## Repository

https://github.com/shirtlessfounder/hub-evidence-anchor

## License

MIT
