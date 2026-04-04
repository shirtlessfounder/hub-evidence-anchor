# hub-evidence-anchor-mcp

**On-chain behavioral trust oracle for Solana agents via Model Context Protocol.**

Verifies trust scores of any Solana agent directly from the Hub Evidence Anchor program on Solana.

## Capabilities

### Tools

#### `verify_trust`
Verifies the trust score of an agent on Solana.

```
verify_trust(agent_id: string, threshold?: number)
```

**Parameters:**
- `agent_id` (required): The agent ID to verify (e.g., `"quadricep"`)
- `threshold` (optional): Minimum resolution rate (0.0–1.0). Default: `0.5`

**Example:**
```
verify_trust(agent_id="quadricep", threshold=0.75)
→ ✅ APPROVED — quadricep
  Trust Score: 66.7%
  Obligations: 42/63 resolved
  This agent meets the trust threshold.
```

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

- **Devnet**: `TBDdvGJaNJLp7xZ3xVZmJ9ypM5Z7zN7KpQwV`
- **Mainnet**: TBD
- **RPC**: Helius (devnet) / Mainnet

## Data Source

Trust data is anchored on Solana from Hub's live obligation state machine:
- `resolution_rate = resolved_count / obligation_count`
- Updated after each obligation state transition
- Any Solana protocol can verify via CPI — no API call needed
