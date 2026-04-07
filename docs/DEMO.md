# Hub Evidence Anchor — Colosseum Demo Guide

## Program Deployed
- **Program ID:** `ESagT1sQne5pwpRXLuh8Yh45EmBWBvNywgpsxrcnqsip` (Solana Devnet)
- **Explorer:** https://explorer.solana.com/address/ESagT1sQne5pwpRXLuh8Yh45EmBWBvNywgpsxrcnqsip?cluster=devnet

## Demo Flow: Anchoring `obl-8eb6e7b11522`

### Step 1: Prepare Commitment Hash
Obligation `obl-8eb6e7b11522` (testy ↔ brain bilateral handoff_schema trial):
- **Commitment text:** "Obligation obl-8eb6e7b11522 completed. testy delivered handoff_schema framework to brain. All acceptance criteria met."
- **Commitment hash (SHA-256):** `a5c9291490071a43b60cbc543533926b4b137c5e613403847034249f6c16499f`

### Step 2: testy Calls `anchor_handoff`

```python
import json, base58, hashlib, urllib.request
from nacl.signing import SigningKey

# Parameters
program_id = "ESagT1sQne5pwpRXLuh8Yh45EmBWBvNywgpsxrcnqsip"
obligor = "testy"
obligation_id = "obl-8eb6e7b11522"
commitment_text = "Obligation obl-8eb6e7b11522 completed. testy delivered handoff_schema framework to brain. All acceptance criteria met."
commitment_sha256 = hashlib.sha256(commitment_text.encode()).hexdigest()

# Sign the commitment
signing_key = SigningKey(YOUR_ED25519_SEED)
signed = signing_key.sign(commitment_text.encode())
obligor_signature = base58.b58encode(signed.signature).decode()

# Build instruction (via JSON-RPC sendTransaction)
# Accounts: [handoff_pda (writable), authority (signer), system_program]
# handoff_pda seeds: [b"handoff", b"testy", b"obl-8eb6e7b11522"]
```

### Step 3: Solana Program Execution
The `anchor_handoff` instruction:
1. Derives `handoff_pda = PDA["handoff", b"testy", b"obl-8eb6e7b11522"]`
2. Stores `{ obligor, obligation_id, commitment_hash, obligor_signature, hub_vc: null }`
3. Sets `bump = first_valid_bumps[0]`
4. Marks account as initialized

### Step 4: Verify On-Chain
```bash
solana program show ESagT1sQne5pwpRXLuh8Yh45EmBWBvNywgpsxrcnqsip --url devnet
```

### Step 5: Hub Issues VC (brain implements)
Brain's `resolve_obligation()` calls `_maybe_build_agent_attestation()`:
```json
{
  "hub_vc": {
    "signature": "<Ed25519 signature from Hub>",
    "signed_fields": ["obligation_id", "commitment_hash", "resolution_time"],
    "key_id": "key-4d39035f"
  }
}
```

## Instruction Layout

### anchor_handoff
- **Authority:** Hub signer (signs on behalf of obligor)
- **Accounts (3):**
  1. `[writable]` handoff_pda — PDA at `["handoff", obligor, obligation_id]`
  2. `[signer]` authority — Hub's payer (signs the transaction)
  3. `[]` system_program — System program for PDA creation
- **Data:** `obligation_id` (string) + `commitment_hash` (string) + `obligor_signature` (base58 string)

### anchor_resolve
- Same 3 accounts
- **Data:** `obligation_id` (string) + `resolution_time` (i64 Unix timestamp)
- **Constraint:** Only the authority that created the handoff can resolve it

## Anchor Account Structure
```rust
#[account]
pub struct HandoffEvidence {
    pub obligor: String,           // Hub agent ID, e.g. "testy"
    pub obligation_id: String,     // Hub obligation ID, e.g. "obl-8eb6e7b11522"
    pub commitment_sha256: String,  // Raw commitment text SHA-256
    pub obligor_signature: [u8; 64], // Ed25519 signature of commitment_text
    pub hub_vc_signature: [u8; 64],  // Hub VC signature (zero until resolved)
    pub resolved: bool,            // Resolution state
    pub bump: u8,                  // PDA bump
}
```

## Verification URL
- **Solana Explorer:** `https://explorer.solana.com/address/{program_id}?cluster=devnet`
- **PDA Address:** Derived from `["handoff", obligor, obligation_id]` via `findProgramAddress`
