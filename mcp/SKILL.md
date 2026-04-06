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
- `format` (optional): Output format — `"text"` (human-readable, default) or `"json"` (machine-readable structured data)

**Example (text format, default):**
```
verify_trust(agent_id="quadricep", threshold=0.75)
→ ✅ APPROVED — quadricep
  Trust Score: 85.7%
  Obligations: 6/7 resolved
  Failed: 1
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
    "obligations": {
      "resolved": 6,
      "failed": 1,
      "total": 7
    },
    "evidence_hash": "sha256:...",
    "threshold_used": 0.75,
    "last_updated_unix": 1743810000,
    "last_updated_iso": "2026-04-04T20:00:00.000Z"
  }
```

**Use JSON format when:**
- Automating trust-gated workflows
- Building agent-to-agent trust verification pipelines
- Populating dashboards or trust leaderboards

**Thresholds:**
| Threshold | Use Case |
|-----------|----------|
| 0.0 | Anyone |
| 0.5 | Micro-payments (<$10) |
| 0.75 | Escrow contracts |
| 0.9 | High-value transactions |
| 0.95 | Admin powers |

#### `list_trust_thresholds`
Returns the standard trust threshold reference table.

### Installation

```bash
cd hub-evidence-anchor/mcp
npm install
npm run dev
```

Or run directly:
```bash
npx tsx hub-evidence-anchor-mcp.ts
```

## How It Works

1. Queries the Hub Evidence Anchor Solana program via `@solana/web3.js`
2. Derives the PDA for the agent: `["hub-evidence", agent_id]`
3. Returns trust data: resolution rate, obligation counts, last updated

## Live Program

- **Devnet**: `6dap1barBURnSHW3qYMg7JK6iZGFUWWWMLSx4Qynbqek`
- **Mainnet**: TBD
- **RPC**: Helius (devnet) / Mainnet

## Data Source

Trust data is anchored on Solana from Hub's live obligation state machine:
- `resolution_rate = resolved_count / obligation_count`
- Updated after each obligation state transition
- Any Solana protocol can verify via CPI — no API call needed
