# Bytecode Analysis — spJAH8 Deployment

**Generated:** 2026-04-08

## Two .so Files

| File | Size | Built | Has spJHS8? | Instructions |
|---|---|---|---|---|
| `hub-evidence_anchor.so` (underscore) | 256KB | Apr 7 17:26 UTC | YES ✅ | 4 instructions |
| `hub-evidence_anchor.so` (hyphen) | 305KB | Apr 6 16:44 UTC | NO ❌ | 3 instructions |

## Deployed Bytecode

**What was actually deployed:** The hyphen .so (305KB, committed at ee428a3 on Apr 6 16:44 UTC)

The hyphen .so was built from `ee428a3: "fix: deploy-devnet.sh w/ Anchor.toml"` which had `declare_id!("6dap1barBURnSHW3qYMg7JK6iZGFUWWWMLSx4KQynbqek")`.

The underscore .so (256KB) was built later from `a3d1e85: "fix: spJAH8" which has `declare_id!("spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf")`.

## Instruction Set (from git history)

### In deployed bytecode (hyphen .so, Apr 6):
- `anchor_evidence` — anchor agent trust stats on Solana
- `anchor_handoff` — record commitment-completion pair  
- `update_resolution` — update resolution rate

### Not in deployed bytecode:
- `close_stale` — added at commit 5dcc3ab (after hyphen .so was built)
- `initialize` — was in early lib.rs but removed before hyphen .so was built

## Discriminators

Anchor instruction discriminators are computed at **runtime** via SHA256:
```
discriminator = SHA256(instruction_name)[:8]  (Anchor v0.30.x)
```

For the deployed program (hyphen .so):
- `anchor_evidence`: SHA256("anchor_evidence")[:8]
- `anchor_handoff`: SHA256("anchor_handoff")[:8]  
- `update_resolution`: SHA256("update_resolution")[:8]

## Account Layout

### anchor_evidence (3 accounts in deployed bytecode):
1. `hub_evidence` — PDA, writable
2. `authority` — signer, NOT writable
3. `system_program` — readonly

### anchor_handoff (4 accounts):
1. `hub_evidence` — writable
2. `handoff` — PDA, writable
3. `authority` — signer
4. `system_program` — readonly

## What This Means

The deployed program CAN be called with 3-account anchor_evidence. The PDA derivation and instruction data format are determined by the source code at the time of the build.

The script `scripts/anchor-evidence-call.ts` uses the Anchor SDK's BorshInstructionCoder to compute discriminators at runtime — it will use the correct SHA256-based discriminator for the instruction names in the IDL.

## Next Step

Deploy the underscore .so (256KB) via `deploy-only.yml` workflow. This will:
1. Replace the current 305KB bytecode with 256KB bytecode
2. Add the `spJAH8` program ID to the ELF
3. Potentially add `close_stale` instruction (if it was added before the underscore .so was built)
