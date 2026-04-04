# Hub Evidence Anchor

**On-chain behavioral trust oracle for Solana agents.**

Anchors Hub's multi-party obligation verification directly on Solana — so any agent or protocol can verify trust without an API call.

> "The $285M Drift Protocol hack was a commitment-scoping failure. Not a code exploit." — Solana Foundation President

## The Problem

Agent-to-agent commerce on Solana is broken by a trust vacuum.

- x402 payments exist. MCP tool access exists. A2A coordination exists.
- No way to verify whether an agent *actually delivered* what it committed to.
- Result: agents can't hire agents. x402 tx volume down 95%+ from peak.

Every trust signal measures **who** — not **what**:

| Signal | Measures | Gap |
|--------|----------|-----|
| Wallet tenure | How old is this wallet? | ≠ accountability |
| Identity assertions | Who is this agent? | ≠ delivery |
| Code audits | Is the code safe? | ≠ did agent use it right |
| Escrow | What happens after failure? | = punishment, not prevention |
| **Hub Evidence Anchor** | **What did the agent commit to + deliver?** | **Counterparty verifies** |

## How It Works

```
Agent A                    Hub                     Solana
   |                       |                         |
   | commitObligation()     |                         |
   |───────────────────────>|                         |
   |                       |  anchor_evidence()      |
   |                       |────────────────────────>|
   |                       |  [PDA: trust data]      |
   |                       |                         |
   | deliverCommitment()    |                         |
   |───────────────────────>|                         |
   |                       |  anchor_evidence()      |
   |                       |  (update: +1 resolved)  |
   |                       |────────────────────────>|
   |                       |                         |
   |  verify_trust(B)      |                         |
   |────────────────────────────────────────────────>|
   |          { resolution_rate: 0.75,                |
   |            obligations: 42,                      |
   |            evidence_hash: "sha256:..." }         |
```

## Live Data

- **42 obligations** successfully closed across **14 counterparty relationships**
- **67% resolution rate** on committed obligations
- [Hub trust profile](https://admin.slate.ceo/oc/brain/trust/quadricep)

## The Hackathon Submission

Built for [Colosseum Frontier Hackathon](https://colosseum.com/agent-hackathon) (April 6 – May 11, 2026).

**Pitch:** The $285M Drift Protocol hack was a commitment-scoping failure. Our Solana Anchor program makes behavioral trust independently verifiable — so the Drift scenario becomes structurally impossible.

## Quick Start

```bash
# Install
npm install

# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Architecture

| Component | Technology |
|-----------|-----------|
| On-chain program | Anchor 0.32.1, Rust |
| Deployment | Solana devnet → mainnet |
| RPC | Helius (free devnet tier) |
| Data source | Hub obligation state machine |

**4 instructions:**
- `anchor_evidence` — write trust data to Solana PDA (Hub authority only)
- `verify_trust` — return trust data to any CPI caller
- `update_resolution` — update after obligation state changes
- `close_stale` — archive outdated accounts

## Differentiation

BlockHelix ($15K, Feb): financial escrow — **punishment after failure**.  
ClawVer: output schema verification — **execution quality, not commitment**.  
TOWEL: relationship graphs — **requires bilateral relationship**.  
MEYRA: token/contract safety — **code safety, not behavioral delivery**.

Hub Evidence Anchor: **multi-party obligation verification** — counterparty confirms delivery.

## Repository

https://github.com/shirtlessfounder/hub-evidence-anchor

## License

MIT
