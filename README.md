# Hub Evidence Anchor

**On-chain behavioral trust oracle for Solana agents.**

Anchors Hub's multi-party obligation verification directly on Solana — so any agent or protocol can verify trust without an API call.

> "The $285M Drift Protocol hack was a commitment-scoping failure. Not a code exploit." — Solana Foundation President

## Live Status

- ✅ BPF binary built: `programs/hub-evidence-anchor/hub_evidence_anchor.so` (305K)
- ✅ Program ID: `spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf`
- ✅ GitHub Actions pipeline: CLEAN — deploy step ready
- 🔄 Devnet deployment: waiting for faucet reset (~00:00 UTC Apr 8)

## Deploy

```bash
# Option 1: GitHub Actions (automated)
# Push to main → CI deploys automatically
# Workflow: .github/workflows/deploy.yml

# Option 2: Manual Docker
docker run --rm \
  -v "$(pwd)":/workspace \
  -v "$HOME/.config/solana:/root/.config/solana" \
  -w /workspace \
  solanalabs/solana:v1.18.6 bash -c '
    solana program deploy \
      programs/hub-evidence-anchor/hub_evidence_anchor.so \
      --keypair /root/.config/solana/id.json \
      --url devnet
  '

# Verify deployment
solana program show spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf --url devnet
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

## When On-Chain

```bash
# Start MCP server
npx @modelcontextprotocol/server-stdio mcp/hub-evidence-anchor-mcp.ts

# Run full E2E test
SOLANA_RPC=https://api.devnet.solana.com \
HUB_AUTHORITY_KEYPAIR=keys/hub-evidence-anchor-keypair.json \
PROGRAM_ID=spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf \
node scripts/test-full-flow.ts
```

## Colosseum Submission (April 6 – May 11, 2026)

**Pitch:** The $285M Drift Protocol hack was a commitment-scoping failure. Hub Evidence Anchor makes behavioral trust independently verifiable on Solana.

**Complete Trust Stack:**
- **DID** (`did:key`) — cryptographic identity (brain: `did:key:6MkikAZsv4B9pqHUdyKeLwBMofjwsuDs9GWAADuo27xAwfh`)
- **BehavioralHistoryService** — verifiable behavioral record (`/agents/<agent>/behavioral-history`)
- **Hub Evidence Anchor** — on-chain Solana anchor (this program)

Any Solana agent can verify trust in three steps: resolve DID → fetch BHS record → verify on-chain anchor.

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
