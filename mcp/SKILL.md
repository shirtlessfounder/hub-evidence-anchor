# hub-evidence-anchor-mcp

**On-chain behavioral trust oracle for Solana agents via Model Context Protocol.**

Verifies trust scores of any Solana agent directly from the Hub Evidence Anchor program on Solana.

## Capabilities

### Tools

#### `verify_trust`
Verifies the trust score of an agent on Solana.

```
verify_trust(agent_id: string, threshold?: number, format?: string)
```

**Parameters:**
- `agent_id` (required): The agent ID to verify (e.g., `"quadricep"`)
- `threshold` (optional): Minimum resolution rate (0.0–1.0). Default: `0.5`
- `format` (optional): Output format — `"text"` (human-readable, default) or `"json"` (machine-readable)

**Example (text format, default):**
```
verify_trust(agent_id="quadricep", threshold=0.75)
→ ✅ APPROVED — quadricep
  Trust Score: 85.7%
  Obligations: 6/7 resolved
  Failed: 1
  Evidence Hash: sha256:abc123...
  Authority: DKucjkYxpePQzLrg2PBL1YC3hHn8Yyr1CBY4qb7GobBw
  This agent meets the trust threshold.
```

**Example (JSON format — for programmatic use):**
```
verify_trust(agent_id="quadricep", threshold=0.75, format="json")
→ {
    "agent_id": "quadricep",
    "found": true,
    "approved": true,
    "resolution_rate": 0.857,
    "obligations": { "resolved": 6, "failed": 1, "total": 7 },
    "evidence_hash": "sha256:...",
    "authority": "DKucjk...",
    "threshold_used": 0.75,
    "last_updated_unix": 1743810000,
    "last_updated_iso": "2026-04-04T20:00:00.000Z"
  }
```

#### `get_network_status`
Checks if spJAH8 is deployed on the current Solana network.

```
get_network_status()
```

**Example:**
```
get_network_status()
→ spJAH8 IS deployed on devnet.
  Program ID: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf
  Network: devnet
  Size: 305.1 KB
```

#### `check_rpc_health`
Verifies connectivity and latency to the Solana RPC endpoint.

```
check_rpc_health()
```

**Example:**
```
check_rpc_health()
→ RPC: https://api.devnet.solana.com
  Network: devnet
  Slot: 454011953
  Latency: 142ms
  Status: ✅ Connected
```

#### `batch_verify_trust`
Verifies trust scores for multiple agents in a single call.

```
batch_verify_trust(agents: string, threshold?: number)
```

**Parameters:**
- `agents` (required): Comma-separated list of agent IDs (e.g. `"quadricep,brain,testy"`)
- `threshold` (optional): Minimum resolution rate. Default: `0.5`

**Example:**
```
batch_verify_trust(agents="quadricep,brain,testy", threshold=0.5)
→ {
    "network": "devnet",
    "threshold": 0.5,
    "results": [
      { "agent_id": "quadricep", "found": true, "approved": true, "resolution_rate": 0.857 },
      { "agent_id": "brain", "found": true, "approved": true, "resolution_rate": 0.91 },
      { "agent_id": "testy", "found": false, "approved": false, "resolution_rate": 0 }
    ]
  }
```

#### `list_trust_thresholds`
Returns the standard trust threshold reference table.

```
list_trust_thresholds()
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SOLANA_NETWORK` | `devnet` | Solana network: `devnet` or `mainnet-beta` |
| `SOLANA_RPC` | auto | RPC URL (overrides `SOLANA_NETWORK`) |
| `PROGRAM_ID` | spJAH8... | Hub Evidence Anchor program ID |

**Production (mainnet):**
```bash
SOLANA_NETWORK=mainnet-beta npx tsx hub-evidence-anchor-mcp.ts
```

## Installation

```bash
cd hub-evidence-anchor/mcp
npm install
npx tsx hub-evidence-anchor-mcp.ts
```

## How It Works

1. Queries the Hub Evidence Anchor Solana program via `@solana/web3.js`
2. Derives the PDA for the agent: `["hub-evidence", agent_id]`
3. Returns trust data: resolution rate, obligation counts, last updated

## Live Program

- **Devnet**: `spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf` (deployed)
- **Mainnet**: TBD (pending wallet funding)
- **RPC**: `https://api.devnet.solana.com` (free tier)

## Data Source

Trust data is anchored on Solana from Hub's live obligation state machine:
- `resolution_rate = resolved_count / obligation_count`
- Updated after each obligation state transition
- Any Solana protocol can verify via CPI — no API call needed
