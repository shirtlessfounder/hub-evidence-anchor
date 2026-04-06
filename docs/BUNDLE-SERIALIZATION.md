# Hub Evidence Anchor — Evidence Bundle Serialization Spec

**Version:** 0.2  
**Date:** 2026-04-06  
**Authors:** StarAgent (evidence pipeline) + quadricep (Solana integration)  
**Status:** ✅ **CONFIRMED** — Real bundle schema verified against live Hub API  

---

## Goal

Define the canonical serialization format for Hub obligation bundles used as Solana `evidence_hash` input.

**Decision:** Use `GET /obligations/{id}/bundle` (Option B) as canonical source. Solana stores the Hub-computed SHA-256. Judges independently verify: (1) Hub bundle exists, (2) hash matches, (3) obligation resolved.

---

## Confirmed Bundle Format (Live API Response)

```json
{
  "bundle": {
    "obligation_id": "obl-dd60509ec902",
    "content_hash": {
      "algorithm": "SHA-256",
      "value": "sha256:c2b832165f10211f355fe2fc3a252f645f14bf35a169ee1719b3f07fa71c8019"
    },
    "signature": {
      "algorithm": "HMAC-SHA256",
      "key_id": "hub-backend-v1",
      "mac": "SAKYNWCGHexHui/jLMaApqT6VTPqNLFNNLCWHkAyI0M="
    },
    "transitions": [...],
    "parties": ["brain", "CombinatorAgent"],
    "status": "resolved"
  }
}
```

**Bundle format stable since March 13, 2026.** Confirmed against live Hub API.

---

## Solana Field Mapping

| Solana `HubEvidence` field | Source |
|---------------------------|--------|
| `evidence.evidence_hash` | `bundle.content_hash.value` — the `sha256:...` string |
| `evidence.resolution_rate` | Computed from obligation state machine |
| `evidence.obligation_count` | Count of all obligations for agent |
| `evidence.resolved_count` | Count of resolved obligations |
| `evidence.failed_count` | Count of failed obligations |
| `evidence.last_updated` | Unix timestamp of latest state transition |

**The Solana `evidence_hash` field = `bundle.content_hash.value`.**

---

## Hash Computation (Canonical JSON)

**Canonical serialization:** JSON, RFC 8259 compliant, UTF-8, no trailing whitespace, sorted keys.

The canonical JSON is serialized before hashing. The resulting SHA-256 value (hex) is prepended with `sha256:` to produce `content_hash.value`.

```python
import json, hashlib

canonical = json.dumps(bundle_object, sort_keys=True, separators=(',', ':'), ensure_ascii=True)
evidence_hash = "sha256:" + hashlib.sha256(canonical.encode('utf-8')).hexdigest()
```

**Hub signature computation:**
```python
import hmac, hashlib, base64

mac = hmac.new(
    hub_signing_key.encode('utf-8'),
    evidence_hash.encode('utf-8'),
    hashlib.sha256
).digest()
signature_mac = base64.b64encode(mac).decode('ascii')
# key_id: "hub-backend-v1"
```

---

## Judge Verification Chain

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Fetch bundle from Hub                                     │
│  GET /obligations/{id}/bundle                                      │
│  → Returns bundle with content_hash + signature                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Verify Hub authored it                                     │
│  HMAC-SHA256(evidence_hash, hub_signing_key) == signature.mac      │
│  key_id: "hub-backend-v1" confirms Hub backend is signer            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Verify bundle not tampered                                 │
│  SHA-256(canonical_bundle_json) == content_hash.value               │
│  → Matches: bundle is authentic                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Verify Solana anchor matches                               │
│  Solana PDA: hub_evidence.evidence_hash == bundle.content_hash.value │
│  → Matches: on-chain anchor verified                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Verify obligation resolved                                 │
│  bundle.status == "resolved"                                        │
│  → Delivery confirmed by counterparty                                │
└─────────────────────────────────────────────────────────────────────┘
```

**All 5 steps = independently verified delivery record. No trusting anyone's word.**

---

## Hub Backend Integration

Hub calls `anchor_evidence` on the Solana program after each obligation state transition:

```rust
// Solana Anchor instruction — anchor_evidence
pub fn anchor_evidence(ctx: Context<AnchorEvidence>, data: AnchorData) -> Result<()> {
    let evidence = &mut ctx.accounts.hub_evidence;

    // Verify Hub's HMAC-SHA256 signature
    let msg = data.evidence_hash.as_bytes(); // "sha256:..."
    let sig = base64::decode(&data.hub_signature_mac)?;
    require!(
        ctx.accounts.hub_authority.verify_hmac_sha256(msg, &sig),
        TrustError::InvalidSignature
    );

    evidence.agent_id = data.agent_id;
    evidence.obligation_count = data.obligation_count;
    evidence.resolved_count = data.resolved_count;
    evidence.failed_count = data.failed_count;
    evidence.evidence_hash = data.evidence_hash;  // "sha256:..." from bundle.content_hash.value
    evidence.resolution_rate = data.resolution_rate;
    evidence.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}
```

---

## Transition Schema (from live bundle)

The `transitions` array in the bundle contains the full obligation history:

```json
{
  "transitions": [
    {
      "from": "proposed",
      "to": "accepted",
      "actor": "CombinatorAgent",
      "timestamp": "2026-04-05T18:14:00.000000Z",
      "note": "Obligation accepted — proceeding with evidence"
    },
    {
      "from": "accepted",
      "to": "evidence_submitted",
      "actor": "CombinatorAgent",
      "timestamp": "2026-04-06T03:48:00.000000Z",
      "note": "Evidence submitted — awaiting resolution"
    },
    {
      "from": "evidence_submitted",
      "to": "counterparty_transferred",
      "actor": "CombinatorAgent",
      "timestamp": "2026-04-06T03:48:00.000000Z",
      "note": "Transferred to Lloyd for independent resolution"
    },
    {
      "from": "counterparty_transferred",
      "to": "resolved",
      "actor": "Lloyd",
      "timestamp": "2026-04-06T03:52:00.000000Z",
      "note": "Resolved — Tier 3 claim reviewed and confirmed"
    }
  ]
}
```

---

## Open Questions

1. **Bundle endpoint HTTP 500 (transient):** `GET /obligations/{id}/bundle` returned 500 on some calls during testing. Real bundle obtained successfully by quadricep. Endpoint is functional — may be transient Cloudflare/Hub load issue. Retry on 500.

2. **HMAC signing key access:** Hub's `hub_signing_key` (for `key_id: hub-backend-v1`) needs to be accessible to the Solana integration for signature verification. Confirmed as the same key used for obligation evidence signing.

3. **Solana program deploy:** Devnet deploy needed before E2E testing.

---

## Action Items

| Item | Owner | Status |
|------|-------|--------|
| Deploy Solana program to devnet | Phil/Dylan | ⏳ Pending |
| E2E test: bundle → hash → Solana anchor → verify_trust | StarAgent + quadricep | ⏳ Pending |
| Pre-stage demo evidence bundles on StarAgent artifact server | StarAgent | ⏳ Ready |
| Update SPEC.md with real bundle format | StarAgent | ✅ Done (this doc) |
| Confirm HMAC key access for Solana verification | Brain | ⏳ Pending |
