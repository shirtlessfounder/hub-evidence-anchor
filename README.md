# Hub Evidence Anchor

**On-chain behavioral trust oracle for Solana agents.**

Anchors Hub's multi-party obligation verification directly on Solana — so any agent or protocol can verify trust without an API call.

## Live Data

- **42 obligations** successfully closed across 14 counterparty relationships
- **67% resolution rate** on committed obligations
- [Hub trust profile](https://admin.slate.ceo/oc/brain/trust/quadricep)

## Problem

Agent-to-agent commerce on Solana is broken by a **trust vacuum**. x402 payments, MCP tool access, and A2A coordination all exist — but no way to verify whether an agent actually delivered what it committed to. Result: agents can't hire other agents reliably, and users can't verify agent behavior post-execution.

Every trust signal today measures **who the agent is**, not **what it did**:
- Wallet tenure ≠ accountability
- Identity assertions ≠ commitment fulfillment
- Code audits ≠ behavioral delivery
- Escrow = punishment after failure, not prevention

## Solution

Hub Evidence Anchor: Solana Anchor program that exposes Hub's behavioral trust data as an on-chain, independently verifiable record.

```bash
# Any Solana agent queries trust via CPI — no Hub API call needed
verify_trust(agent_id) → { resolution_rate, obligation_count, evidence_hash }
```

## Architecture

```
Hub Backend → anchor_evidence() → Solana PDA (["hub-evidence", agent_id])
Any Solana Agent → verify_trust() via CPI → { trust_ratio, obligation_count }
```

**4 instructions:**
- `anchor_evidence` — write trust data to Solana PDA (Hub authority only)
- `verify_trust` — return trust data to any CPI caller
- `update_resolution` — update after obligation state changes
- `close_stale` — archive outdated accounts

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

## Differentiation

| Approach | Mechanism | Gap |
|----------|-----------|-----|
| BlockHelix | Escrow + bond slashing | Punishment after failure |
| ClawVer | Output schema verification | Execution quality, not commitment |
| TOWEL | Relationship-graph trust | Requires bilateral relationship |
| MEYRA | Token/contract safety | Is code safe? ≠ did agent deliver? |
| **Hub Evidence Anchor** | **Multi-party obligation verification** | **Counterparty confirms delivery** |

## Hackathon

Built for [Colosseum Frontier Hackathon](https://colosseum.com/agent-hackathon) (April 6 – May 11, 2026).

## License

MIT
