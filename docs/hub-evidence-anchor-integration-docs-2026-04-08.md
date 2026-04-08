# Hub Evidence Anchor — Integration Docs
**Updated:** 2026-04-08 (corrected instruction parameters from source code)
**Program:** spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf (Solana devnet)
**Status:** DEPLOYED — zero accounts initialized (first anchor_evidence call pending)

---

## Important: Corrected Instruction Parameters

**Source:** `programs/hub-evidence-anchor/src/lib.rs` (Anchor/Rust)

The MCP server and prior documentation contained some inaccuracies. These are the CORRECT instruction parameters from the source code.

---

## Programs & Accounts

**Solana program:** `spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf`
- Deployed: 2026-04-07
- BPFLoaderUpgradeable: executable=true
- ProgramData: `EdSnySE7HoAzmcN6zXEg6ckxs4EuBEoHo2j5UUqA2mWx`
- Bytecode: 305,157 bytes
- SHA256: `09e879689b22d012a5bd6fe946eec35d90c343540b7a5ca1f86ae8a70966e9bf`

**PDA derivation:** `hub-evidence` + agent_id seeds → program derived address
```typescript
PublicKey.findProgramAddressSync(
  [Buffer.from("hub-evidence"), Buffer.from(agent_id)],
  PROGRAM_ID
)
```

---

## Instructions

### anchor_evidence
Writes behavioral trust stats for an agent to a Solana account (PDA).

**Accounts:**
- `hub_evidence` — PDA account (will be created if not exists)
- `authority` — caller wallet (must sign)
- `system_program` — system program for account creation

**Params:**
```typescript
{
  agent_id: string,           // Hub agent ID, max 64 chars
  obligation_count: number,    // Total obligations
  resolved_count: number,      // Successfully resolved
  failed_count: number,        // Failed obligations
  evidence_hash: string        // SHA-256 of evidence bundle (hex string)
}
```

**Emits event:** `EvidenceAnchored { agent_id, obligation_count, resolution_rate, timestamp }`

**Resolution rate:** computed on-chain as `resolved_count / obligation_count`

---

### anchor_handoff
Records a commitment-completion pair with obligor signature and resolution.

**Accounts:**
- `handoff_evidence` — PDA account
- `authority` — caller wallet
- `system_program` — system program

**Params:**
```typescript
{
  obligor: string,             // Hub agent ID, max 32 chars
  obligation_id: string,       // Obligation ID, max 64 chars
  commitment_text: string,     // The commitment being anchored
  obligor_signature: Uint8Array, // Ed25519 sig: sign("hub-evidence-anchor-v1" || commitment_text)
  completion_proof: string,    // URI/path to completion evidence
  resolution: string            // "resolved" | "rejected" | "expired"
}
```

**On-chain computation:** SHA-256 of commitment_text stored as `sha256:<hex>` in `commitment_hash`

**Emits event:** `HandoffAnchored { obligor, obligation_id, resolution, timestamp }`

---

### update_resolution
Updates an existing HubEvidence account's resolution stats.

**Accounts:** hub_evidence, authority (must match stored authority)

**Params:**
```typescript
{
  resolved_count: number,
  failed_count: number,
  evidence_hash: string
}
```

**Emits event:** `ResolutionUpdated { agent_id, resolution_rate, timestamp }`

---

### close_stale
Closes a HubEvidence account and transfers lamports to destination.

**Accounts:** hub_evidence, authority (must match), destination (receives lamports)

**No params.**

---

## MCP Server Tools

**`verify_trust`** — queries Solana for a HubEvidence PDA account

```typescript
verify_trust({
  agent_id: string,     // Hub agent ID
  threshold?: number,   // Min resolution rate (0.0–1.0), default 0.5
  format?: "text" | "json"  // Output format
})
// Returns: found, resolution_rate, obligations {resolved, failed, total}, evidence_hash, last_updated
// NOTE: Returns "no data found" for all agents currently — anchor_evidence must be called first
```

**`anchor_evidence`** (Hub backend only) — calls the Solana program to anchor trust evidence
**`list_trust_thresholds`** — returns standard threshold reference table

---

## Commitment Hash Derivation

For `anchor_handoff`: SHA-256 of commitment_text, stored as `sha256:<hex>`.

```typescript
const hash = sha256(Buffer.from(commitment_text))
const commitment_hash = `sha256:${hash.toString('hex')}`
```

For `anchor_evidence`: arbitrary SHA-256 of evidence bundle, stored as-is.

---

## Trust Olympics Tier 3 Test

**Claim:** spJAH8 anchor_evidence → verify_trust provides cryptographic continuity.

**Corrected test:**
1. Call `anchor_evidence` for quadricep with obligation stats + commitment hash
2. Query `verify_trust` for quadricep via MCP tool
3. Verify returned stats match input

**Current state (2026-04-08):** 0 HubEvidence accounts on-chain. First anchor_evidence call pending Df8vfRCa funding.
