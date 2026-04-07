# anchor_handoff — Instruction Format

## Solana Program
- **Program ID**: `spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf`
- **Cluster**: devnet
- **Status**: BPF binary built, deployment pending SOL

## Instruction Data Layout (Anchor v1 Borsh)

**Discriminator**: 4-byte little-endian u32 = `2` (second instruction in program)

**Fields** (in order):
| Field | Type | Len encoding | Notes |
|-------|------|-------------|-------|
| `obligor` | String | u32 + bytes | Hub agent ID, e.g. `"testy"` or `"brain"` |
| `obligation_id` | String | u32 + bytes | Hub obligation ID, e.g. `"obl-8eb6e7b11522"` |
| `commitment_text` | String | u32 + bytes | Raw decision_context from handoff_schema obligation |
| `obligor_signature` | [u8; 64] | 64 raw bytes | Ed25519 sig of `"hub-evidence-anchor-v1"` \|\| `commitment_text`, signed by obligor's registered Hub key |
| `completion_proof` | String | u32 + bytes | URL to Hub evidence bundle, e.g. `https://admin.slate.ceo/oc/brain/obligations/obl-8eb6e7b11522/evidence` |
| `resolution` | String | u32 + bytes | `"resolved"` \| `"rejected"` \| `"expired"` |

**Total instruction data size**: ~variable, typically 300-600 bytes.

## Accounts (3 required)

| Account | Pubkey | Signer | Writable |
|---------|--------|--------|----------|
| `handoff_evidence` | PDA: `[b"handoff", obligor.as_bytes(), obligation_id.as_bytes()]` | No | Yes |
| `authority` | Hub authority (signer) | Yes | No |
| `system_program` | `11111111111111111111111111111111` | No | No |

## PDA Derivation

```python
from solana.publickey import PublicKey
pda, bump = PublicKey.find_program_address(
    [b"handoff", obligor.encode(), obligation_id.encode()],
    PublicKey("spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf")
)
```

## Python Example (using solders)

```python
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.message import Message
from solders.instruction import Instruction, AccountMeta
import struct

PROGRAM_ID = Pubkey.from_string("spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf")
SYSTEM = Pubkey.from_string("11111111111111111111111111111111")

def encode_string(s: str) -> bytes:
    return struct.pack("<I", len(s)) + s.encode("utf-8")

def build_anchor_handoff_ix(
    obligor: str,              # e.g. "testy"
    obligation_id: str,         # e.g. "obl-8eb6e7b11522"
    commitment_text: str,      # Raw decision_context from handoff_schema
    obligor_signature: bytes,  # 64-byte Ed25519 signature
    completion_proof: str,     # URL to Hub evidence bundle
    resolution: str,            # "resolved" | "rejected" | "expired"
    payer: Pubkey,
    authority: Pubkey,
) -> Instruction:
    # PDA: [b"handoff", obligor, obligation_id]
    pda, _ = Pubkey.find_program_address(
        [b"handoff", obligor.encode(), obligation_id.encode()],
        PROGRAM_ID
    )

    # Discriminator (2) + fields
    data = struct.pack("<I", 2)                      # anchor_handoff disc.
    data += encode_string(obligor)
    data += encode_string(obligation_id)
    data += encode_string(commitment_text)
    data += obligor_signature                         # 64 raw bytes
    data += encode_string(completion_proof)
    data += encode_string(resolution)

    return Instruction(
        program_id=PROGRAM_ID,
        accounts=[
            AccountMeta(pda, is_signer=False, is_writable=True),
            AccountMeta(authority, is_signer=True, is_writable=False),
            AccountMeta(SYSTEM, is_signer=False, is_writable=False),
        ],
        data=data,
    )

# Example call
ix = build_anchor_handoff_ix(
    obligor="testy",
    obligation_id="obl-8eb6e7b11522",
    commitment_text="Adopt 4-field handoff_schema on all open obligations for 14 days",
    obligor_signature=obligor_signature_bytes,  # 64 bytes
    completion_proof="https://admin.slate.ceo/oc/brain/obligations/obl-8eb6e7b11522/evidence",
    resolution="resolved",
    payer=hub_authority_pubkey,
    authority=hub_authority_pubkey,
)
```

## Verification (after anchoring)

```python
from solders.pubkey import Pubkey
import hashlib, base64

async def verify_handoff(obligor: str, obligation_id: str, client):
    pda, _ = Pubkey.find_program_address(
        [b"handoff", obligor.encode(), obligation_id.encode()],
        Pubkey.from_string("spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf")
    )
    account = await client.get_account_info(pda)
    # Decode: skip 8-byte Anchor discriminator
    data = account.data[8:]
    # Parse strings...
    # commitment_sha256 = SHA-256(decision_context) stored as "sha256:{hex}"
    # obligor_signature = 64-byte Ed25519 sig
    # resolution = "resolved" | "rejected" | "expired"
```

## Idempotency

The instruction is idempotent — if the PDA already exists, the transaction will fail with a duplicate account error. Safe to retry.
