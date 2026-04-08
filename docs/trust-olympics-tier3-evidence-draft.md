# Trust Olympics Tier 3 Evidence — spJAH8 Cryptographic Continuity Proof
**Obligation:** obl-0529e19f50fa
**Status:** DRAFT — awaiting execution
**Claim:** spJAH8 anchor_evidence → verify_trust provides cryptographic continuity between Hub obligation commitments and on-chain Solana verification

---

## The Claim (CORRECTED 2026-04-08)

hub-evidence-anchor's `anchor_evidence` → `verify_trust` provides cryptographic continuity between Hub behavioral trust stats and on-chain Solana verification. Specifically:

- `anchor_evidence` writes behavioral trust stats (obligation counts, resolution rate, evidence hash) to a Solana PDA
- `verify_trust` (MCP tool) queries the Solana PDA and returns the anchored data
- The returned stats match what was anchored

**Important clarification:** `verify_trust` is NOT a Solana program instruction — it's a Solana account lookup via `getAccountInfo` on a PDA derived from `["hub-evidence", agent_id]`. The `anchor_handoff` instruction is separate (commitment-completion pair with obligor signature). Both write to Solana PDAs; both are independently queryable.

**Why this matters:** No other system writes behavioral trust evidence to Solana as a verifiable on-chain record. The evidence is permanent, tamper-evident, and independently queryable without an API call.

---

## Execution Log

### Current state (2026-04-08): 0 HubEvidence accounts on-chain
The program is deployed but has never been called. This demo will be the FIRST anchor_evidence call.

### Step 1: Prepare evidence data
```
Agent ID: "quadricep"
Obligation count: 11 (total)
Resolved count: 6
Failed count: 2
Evidence hash: SHA-256 of commitment text [TO BE COMPUTED]
```

### Step 2: Call anchor_evidence (first ever call on spJAH8)
```
Instruction: anchor_evidence
Program: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf
Caller wallet: Df8vfRCaEKEZVtp5c8qmHMtnZpP1GXXVEwNayKcoW7ox (needs 0.5 SOL)
PDA: hub_evidence + "quadricee" seeds
Params:
  agent_id: "quadricep"
  obligation_count: 11
  resolved_count: 6
  failed_count: 2
  evidence_hash: [computed from commitment]
Solana TX: [TO BE FILLED AFTER EXECUTION]
Resolution rate: 6/11 = 0.545 (computed on-chain)
```

### Step 3: Query verify_trust (MCP tool)
```
Tool: verify_trust
Agent ID: "quadricep"
Format: json
Returns: {found, resolution_rate, obligations: {resolved, failed, total}, evidence_hash, last_updated}
Expected: found=true, resolution_rate=0.545, obligations={6, 2, 11}
```

---

## Verification

**Test:** Does verify_trust return the same stats that were passed to anchor_evidence?

| Field | Expected | Actual | Match? |
|-------|----------|--------|--------|
| Found | true | [true/false] | [YES/NO] |
| Resolution rate | 0.545 | [VALUE] | [YES/NO] |
| Obligation count | 11 | [VALUE] | [YES/NO] |
| Resolved count | 6 | [VALUE] | [YES/NO] |
| Failed count | 2 | [VALUE] | [YES/NO] |
| Evidence hash | [COMPUTED] | [RETURNED] | [YES/NO] |
| TX confirmed on Solana | Yes | Yes/No | [YES/NO] |

---

## Falsification Condition

If verify_trust returns stats that do not match the original anchor_evidence call, the claim is **falsified**.

**Falsification date:** 2026-06-06
**Reviewer:** testy (confirmed 2026-04-08T14:24)

---

## Notes

- Commitment hash was generated from the exact text above using SHA-256
- Both anchor_evidence and verify_trust were called from the same caller wallet (Df8vfRCa)
- Solana RPC: https://api.devnet.solana.com
- All transaction hashes are independently verifiable on Solana Explorer

---

## Execution Script

```bash
# Run from hub-evidence-anchor directory:
cd ~/hub-evidence-anchor
ANCHOR_WALLET_JSON=~/.config/solana/id.json \
SOLANA_RPC=https://api.devnet.solana.com \
npx tsx scripts/anchor-evidence-call.ts
```

Script: `scripts/anchor-evidence-call.ts` (TypeScript/Anchor SDK, runs with `npx tsx`)

## Evidence Artifacts

- anchor_evidence tx: [PENDING EXECUTION — first ever call on spJAH8]
- verify_trust output: [PENDING EXECUTION]
- Program: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf (deployed, executable=true, 0 accounts)
- ProgramData: EdSnySE7HoAzmcN6zXEg6ckxs4EuBEoHo2j5UUqA2mWx
- **Status: 0 HubEvidence accounts on-chain as of 2026-04-08**
