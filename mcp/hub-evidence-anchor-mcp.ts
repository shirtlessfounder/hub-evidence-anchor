/**
 * Hub Evidence Anchor — MCP Server
 * Exposes Solana trust data via Model Context Protocol
 * 
 * Run: npx @modelcontextprotocol/server-stdio hub-evidence-anchor-mcp.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  PublicKey,
  Connection,
} from "@solana/web3.js";

// Configuration
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || "TBDdvGJaNJLp7xZ3xVZmJ9ypM5Z7zN7KpQwV"
);

const connection = new Connection(SOLANA_RPC);

// Hub Evidence Anchor account parser
interface HubEvidence {
  agentId: string;
  obligationCount: number;
  resolvedCount: number;
  failedCount: number;
  resolutionRate: number;
  evidenceHash: string;
  lastUpdated: number;
}

function parseHubEvidence(data: Buffer): HubEvidence {
  let offset = 8; // skip discriminator

  const agentIdLen = data.readUInt32LE(offset);
  offset += 4;
  const agentId = data.subarray(offset, offset + agentIdLen).toString("utf8");
  offset += agentIdLen;

  offset += 128; // hub_endpoint (skipped)

  const obligationCount = data.readUInt32LE(offset);
  offset += 4;
  const resolvedCount = data.readUInt32LE(offset);
  offset += 4;
  const failedCount = data.readUInt32LE(offset);
  offset += 4;

  offset += 128; // evidence_hash string (not parsed here)

  const resolutionRate = data.readFloat64LE(offset);
  offset += 8;
  const lastUpdated = data.readBigInt64LE(offset);

  return {
    agentId,
    obligationCount,
    resolvedCount,
    failedCount,
    resolutionRate,
    evidenceHash: "(hash not parsed)",
    lastUpdated: Number(lastUpdated),
  };
}

// Derive PDA for an agent
function deriveHubEvidencePDA(agentId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("hub-evidence"), Buffer.from(agentId)],
    PROGRAM_ID
  )[0];
}

// Create MCP server
const server = new McpServer({
  name: "Hub Evidence Anchor",
  version: "0.1.0",
  description: "On-chain behavioral trust oracle for Solana agents",
});

// Tool: verify_trust
server.tool(
  "verify_trust",
  "Verifies the trust score of an agent on Solana via Hub Evidence Anchor",
  {
    agent_id: {
      type: "string",
      description: "The agent ID to verify (e.g., 'quadricep')",
    },
    threshold: {
      type: "number",
      description: "Minimum resolution rate (0.0–1.0) for approval",
      default: 0.5,
    },
    format: {
      type: "string",
      description: "Output format: 'text' (default, human-readable) or 'json' (machine-readable structured data)",
      default: "text",
    },
  },
  async ({ agent_id, threshold = 0.5, format = "text" }) => {
    try {
      const pda = deriveHubEvidencePDA(agent_id);
      const accountInfo = await connection.getAccountInfo(pda);

      if (!accountInfo) {
        const noData = {
          approved: false,
          agent_id,
          resolution_rate: 0,
          obligations: { resolved: 0, failed: 0, total: 0 },
          evidence_hash: null,
          threshold_used: threshold,
          error: `No trust data found for agent '${agent_id}'. This agent has not anchored any evidence yet.`,
        };
        return {
          content: [
            {
              type: "text",
              text: format === "json"
                ? JSON.stringify(noData, null, 2)
                : `No trust data found for agent '${agent_id}'. This agent has not anchored any evidence yet.`,
            },
          ],
          isError: false,
        };
      }

      const evidence = parseHubEvidence(accountInfo.data);
      const approved = evidence.resolutionRate >= threshold;
      const score = (evidence.resolutionRate * 100).toFixed(1);

      const structured = {
        approved: Boolean(approved),
        agent_id,
        resolution_rate: evidence.resolutionRate,
        obligations: {
          resolved: evidence.resolvedCount,
          failed: evidence.failedCount,
          total: evidence.obligationCount,
        },
        evidence_hash: evidence.evidenceHash,
        threshold_used: threshold,
        last_updated: new Date(evidence.lastUpdated * 1000).toISOString(),
      };

      if (format === "json") {
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          isError: false,
        };
      }

      // Default: human-readable text
      const status = approved ? "✅ APPROVED" : "❌ REJECTED";
      return {
        content: [
          {
            type: "text",
            text: `${status} — ${agent_id}

Trust Score: ${score}%
Threshold: ${(threshold * 100).toFixed(0)}%
Obligations: ${evidence.resolvedCount}/${evidence.obligationCount} resolved
Failed: ${evidence.failedCount}
Last Updated: ${new Date(evidence.lastUpdated * 1000).toISOString()}
Evidence Hash: ${evidence.evidenceHash}

${approved ? "This agent meets the trust threshold." : "This agent does not meet the trust threshold."}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error verifying trust for '${agent_id}': ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: list_trust_thresholds
server.tool(
  "list_trust_thresholds",
  "Returns the standard trust thresholds for Solana agent interactions",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: `Trust Threshold Reference

| Threshold | Use Case | Description |
|-----------|----------|-------------|
| 0.0 | Anyone | Open to all agents |
| 0.5 | Micro-payments (<$10) | Low-value transactions |
| 0.75 | Escrow contracts | Medium-value with protection |
| 0.9 | High-value transactions | Significant amounts |
| 0.95 | Admin powers | Critical operations |

Example usage:
  verify_trust(agent_id="quadricep", threshold=0.75)
  → Returns approval status for escrow contracts`,
        },
      ],
      isError: false,
    };
  }
);

// Tool: anchor_evidence (for Hub backend only)
server.tool(
  "anchor_evidence",
  "Anchors trust evidence on Solana (Hub backend only)",
  {
    agent_id: { type: "string", description: "Agent ID" },
    obligation_count: { type: "number", description: "Total obligations" },
    resolved_count: { type: "number", description: "Successfully resolved" },
    failed_count: { type: "number", description: "Failed obligations" },
    evidence_hash: { type: "string", description: "SHA-256 hash of evidence bundle" },
  },
  async ({ agent_id, obligation_count, resolved_count, failed_count, evidence_hash }) => {
    // This tool would call the Solana program via @solana/web3.js
    // For security, this should only be callable by the Hub backend authority
    return {
      content: [
        {
          type: "text",
          text: `anchoring_evidence: agent_id=${agent_id}, obligations=${resolved_count}/${obligation_count}, hash=${evidence_hash.substring(0, 16)}...

Note: anchor_evidence requires a signed transaction by the Hub authority key. Use the Hub backend CLI for this operation.`,
        },
      ],
      isError: false,
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hub Evidence Anchor MCP server running...");
}

main().catch(console.error);
