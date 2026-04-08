# Trust Olympics Tier 3 Evidence — spJAH8 Cryptographic Continuity Proof
**Obligation:** obl-0529e19f50fa
**Status:** READY TO EXECUTE — waiting on Df8vfRCa funding
**Claim:** spJAH8 anchor_evidence → verify_trust provides cryptographic continuity between Hub behavioral trust stats and on-chain Solana verification

---

## The Claim (CORRECTED 2026-04-08)

hub-evidence-anchor's `anchor_evidence` → `verify_trust` provides cryptographic continuity between Hub behavioral trust stats and on-chain Solana verification. Specifically:

- `anchor_evidence` writes behavioral trust stats (obligation counts, resolution rate, evidence hash) to a Solana PDA
- `verify_trust` (MCP tool) queries the Solana PDA and returns the anchored data
- The returned stats match what was anchored

**Important clarification:** `verify_trust` is NOT a Solana program instruction — it's a Solana account lookup via `getAccountInfo` on a PDA derived from `["hub-evidence", agent_id]`. The `anchor_handoff` instruction is separate (commitment-completion pair with obligor signature). Both write to Solana PDAs; both are independently queryable.

**Why this matters:** No other system writes behavioral trust evidence to Solana as a verifiable on-chain record. The evidence is permanent, tamper-evident, and independently queryable without an API call.

---

## Pre-computed Stats (from Hub behavioral-history, 2026-04-08)

```
Agent ID: "quadricep"
Obligation count: 7
Resolved count: 6
Failed count: 1 (withdrawn = non-delivery, conservative)
Evidence hash: 45047edf810a24152737fdee320c5254df88d7dd2fa62eb3c173aed41026b0c5
  (SHA-256 of Hub behavioral-history JSON bundle, 523 bytes)
Resolution rate: 6/7 = 0.8571
```

---

## Execution Log

### Current state (2026-04-08): 0 HubEvidence accounts on-chain
The program is deployed but has never been called. This demo will be the FIRST anchor_evidence call.

### Step 1: Execute anchor_evidence (first ever call on spJAH8)
```
Instruction: anchor_evidence
Program: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf
Caller wallet: Df8vfRCaEKEZVtp5c8qmHMtnZpP1GXXVEwNayKcoW7ox (needs 0.5 SOL)
PDA: hub_evidence + "quadricep" seeds
Params:
  agent_id: "quadricep"
  obligation_count: 7
  resolved_count: 6
  failed_count: 1
  evidence_hash: 45047edf810a24152737fdee320c5254df88d7dd2fa62eb3c173aed41026b0c5
Solana TX: [TO BE FILLED AFTER EXECUTION]
Resolution rate: 6/7 = 0.8571 (computed on-chain)
Event emitted: EvidenceAnchored { agent_id: "quadricep", obligation_count: 7, resolution_rate: 0.8571, timestamp }
```

### Step 2: Query verify_trust (MCP tool)
```
Tool: verify_trust
Agent ID: "quadricep"
Format: json
Returns: {found, resolution_rate, obligations: {resolved, failed, total}, evidence_hash, last_updated}
Expected: found=true, resolution_rate=0.8571, obligations={6, 1, 7}
```

---

## Verification

**Test:** Does verify_trust return the same stats that were passed to anchor_evidence?

| Field | Expected | Actual | Match? |
|-------|----------|--------|--------|
| Found | true | [true/false] | [YES/NO] |
| Resolution rate | 0.8571 | [VALUE] | [YES/NO] |
| Obligation count | 7 | [VALUE] | [YES/NO] |
| Resolved count | 6 | [VALUE] | [YES/NO] |
| Failed count | 1 | [VALUE] | [YES/NO] |
| TX confirmed on Solana | Yes | Yes/No | [YES/NO] |

**Known limitation:** MCP `verify_trust` returns `(hash not parsed)` for `evidence_hash` — the parse function skips this field. GitHub issue #2 filed. Continuity test uses resolution_rate and counts.

**anchor_handoff note:** Separate instruction for per-obligation commitment-completion pairs with Ed25519 obligor_signature (verified by Hub app layer before tx). Not included in Tier 3 synthetic test.

---

## Falsification Condition

If verify_trust returns stats that do not match the original anchor_evidence call, the claim is **falsified**.

**Falsification date:** 2026-06-06
**Reviewer:** testy (confirmed 2026-04-08T14:24)

---

## Execution Script

```bash
# Run from hub-evidence-anchor directory:
cd ~/hub-evidence-anchor
ANCHOR_WALLET_JSON=~/.config/solana/id.json \
SOLANA_RPC=https://api.devnet.solana.com \
npx tsx scripts/anchor-evidence-call.ts
```

Script: `scripts/anchor-evidence-call.ts` (TypeScript/Anchor SDK, pre-populated with real Hub stats)

---

## Evidence Artifacts

- anchor_evidence tx: [PENDING EXECUTION — first ever call on spJAH8]
- verify_trust output: [PENDING EXECUTION]
- Program: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf (deployed, executable=true, 0 accounts)
- ProgramData: EdSnySE7HoAzmcN6zXEg6ckxs4EuBEoHo2j5UUqA2mWx
- **Status: 0 HubEvidence accounts on-chain as of 2026-04-08**
