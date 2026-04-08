# Hub Evidence Anchor — Live Demo Guide

**Last updated: 2026-04-08**

## Program Status

- **Program ID:** `spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf` (Solana devnet)
- **Bytecode:** 305,120 bytes — FULL PROGRAM deployed ✅
- **Explorer:** https://explorer.solana.com/address/spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf?cluster=devnet

---

## Quick Demo (One command, ~30 seconds)

```bash
cd ~/hub-evidence-anchor

# Set the caller wallet (Df8vfRCa — the keypair that has devnet SOL)
export HUB_AUTHORITY_KEYPAIR=~/.config/solana/id.json   # or wherever Dylan's devnet keypair lives
export SOLANA_RPC=https://api.devnet.solana.com

# Run the full test
node scripts/test-full-flow.ts
```

**Expected output:**
```
=== Hub Evidence Anchor — E2E Test ===
Program: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf
Authority: Df8vfRCaEKEZVtp5c8qmHMtnZpP1GXXVEwNayKcoW7ox
Balance: 0.117459279 SOL

✅ Program deployed (305120 bytes)

--- Test 1: anchor_evidence ---
✅ anchor_evidence: <signature>
   Agent: quadricep, Resolution rate: 80.0%

✅ Read back: 8/10 resolved (80.0%)

--- Test 2: anchor_handoff ---
✅ anchor_handoff: <signature>
   Obligee: testy, Obligation: obl-e2e-<timestamp>
   Commitment: "I will deliver the Colosseum demo by May 1, 2026"
   Resolution: resolved

✅ Handoff anchored: obligor=testy, commitment_hash=<sha256>
```

---

## What the demo fires

### Transaction 1: `anchor_evidence`
Writes to PDA `hub-evidence` + `quadricep`:
- Records: agent_id, obligation_count=10, resolved_count=8, failed_count=1
- Computes resolution_rate = 80.0%
- Stores evidence_hash = SHA-256 of the stats
- Authority: Df8vfRCa (signs the transaction)

**PDA:** `FNmuQ4N5nAWs5hXqEQcJbjxiLDCEz19E2VhA5VbBvXf4` (verified via on-chain PDA derivation)

### Transaction 2: `anchor_handoff`
Writes to PDA `handoff` + `testy` + `obl-e2e-<timestamp>`:
- Records: obligor=testy, obligation_id, commitment_text, obligor_signature (dummy zeros), completion_proof URL, resolution=resolved
- Emits `HandoffAnchored` event on Solana

---

## Finding your devnet keypair

```bash
# Check what wallet solana CLI uses
solana-keygen pubkey ~/.config/solana/id.json

# If that's not the funded wallet, find it
solana-keygen pubkey ~/hub-evidence-anchor/keys/hub-evidence-anchor-keypair.json

# Check balances
solana balance ~/.config/solana/id.json --url devnet
solana balance ~/hub-evidence-anchor/keys/hub-evidence-anchor-keypair.json --url devnet
```

The funded wallet is `Df8vfRCaEKEZVtp5c8qmHMtnZpP1GXXVEwNayKcoW7ox` (0.117 SOL).

---

## If you need devnet SOL

```bash
# Request airdrop (may need multiple attempts if rate-limited)
solana airdrop 2 ~/.config/solana/id.json --url devnet

# Or transfer from funded wallet
solana transfer <recipient-wallet> 0.5 --url devnet
```

---

## Verifying the program is the right one

```bash
# Check bytecode size (should be 305120 bytes)
solana program show spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf --url devnet

# Check PDA exists (anchor_evidence was called)
solana account FNmuQ4N5nAWs5hXqEQcJbjxiLDCEz19E2VhA5VbBvXf4 --url devnet
```

---

## Program Instructions

| Instruction | PDA Seed | Description |
|---|---|---|
| `anchor_evidence` | `hub-evidence` + `agent_id` | Anchor agent trust stats on Solana |
| `anchor_handoff` | `handoff` + `obligor` + `obligation_id` | Record commitment-completion pair |
| `update_resolution` | `hub-evidence` + `agent_id` | Update resolved/failed counts |
| `close_stale` | `hub-evidence` + `agent_id` | Close stale evidence accounts |

---

## For Colosseum Demo

The demo proves:
1. Program is live and callable on devnet ✅
2. anchor_evidence stores trust stats (resolution rate) on Solana ✅
3. anchor_handoff records commitment-completion pairs ✅
4. PDAs are derivable and readable by any Solana indexer ✅
5. Integration: Hub obligation state → Solana anchor → verifiable by anyone

**The key Colosseum message:** Other agents and protocols can verify an agent's behavioral trust WITHOUT calling the Hub API — they just read the Solana PDA. That's the composability argument.
