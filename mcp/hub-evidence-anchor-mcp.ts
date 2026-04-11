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
// Set SOLANA_NETWORK=mainnet-beta for production, devnet for testing
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || "devnet";
const SOLANA_RPC = process.env.SOLANA_RPC || (
  SOLANA_NETWORK === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com"
);
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || "spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf"
);

const connection = new Connection(SOLANA_RPC, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60_000,
});

// Hub Evidence Anchor account parser
interface HubEvidence {
  agentId: string;
  obligationCount: number;
  resolvedCount: number;
  failedCount: number;
  resolutionRate: number;
  evidenceHash: string;
  lastUpdated: number;
  authority: string;
}

function parseHubEvidence(data: Buffer): HubEvidence {
  let offset = 8; // skip 8-byte Anchor discriminator

  // agent_id: 4-byte length + UTF-8 string (max 64)
  const agentIdLen = data.readUInt32LE(offset);
  offset += 4;
  const agentId = data.subarray(offset, offset + agentIdLen).toString("utf8");
  offset += agentIdLen;

  // hub_endpoint: 4-byte length + UTF-8 string (max 128)
  const hubEndpointLen = data.readUInt32LE(offset);
  offset += 4;
  offset += hubEndpointLen;

  // obligation_count, resolved_count, failed_count: u32 each
  const obligationCount = data.readUInt32LE(offset); offset += 4;
  const resolvedCount = data.readUInt32LE(offset); offset += 4;
  const failedCount = data.readUInt32LE(offset); offset += 4;

  // evidence_hash: 4-byte length + UTF-8 string (max 128)
  const evidenceHashLen = data.readUInt32LE(offset);
  offset += 4;
  const evidenceHash = data.subarray(offset, offset + evidenceHashLen).toString("utf8");
  offset += evidenceHashLen;

  // resolution_rate: f64, last_updated: i64
  const resolutionRate = data.readFloat64LE(offset); offset += 8;
  const lastUpdated = Number(data.readBigInt64LE(offset)); offset += 8;

  // authority: Pubkey (32 bytes)
  const authority = new PublicKey(data.subarray(offset, offset + 32)).toBase58();

  return { agentId, obligationCount, resolvedCount, failedCount, resolutionRate, evidenceHash, lastUpdated, authority };
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
  version: "0.3.0",
  description: "On-chain behavioral trust oracle for Solana agents — structured JSON, batch verification, RPC health check",
});

// Tool: verify_trust
server.tool(
  "verify_trust",
  "Verifies the trust score of an agent on Solana via Hub Evidence Anchor. Network: " + SOLANA_NETWORK,
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
          agent_id,
          found: false,
          approved: false,
          resolution_rate: 0.0,
          obligations: { resolved: 0, failed: 0, total: 0 },
          evidence_hash: null,
          threshold_used: threshold,
          message: `No trust data found for agent '${agent_id}'. This agent has not anchored any evidence yet.`,
        };
        return {
          content: [
            {
              type: "text",
              text: format === "json"
                ? JSON.stringify(noData, null, 2)
                : noData.message,
            },
          ],
          isError: false,
        };
      }

      const evidence = parseHubEvidence(accountInfo.data);
      const approved = evidence.resolutionRate >= threshold;
      const score = (evidence.resolutionRate * 100).toFixed(1);

      const lastUpdatedUnix = evidence.lastUpdated;
      const lastUpdatedIso = new Date(lastUpdatedUnix * 1000).toISOString();

      const structured = {
        agent_id,
        found: true,
        approved,
        resolution_rate: parseFloat(evidence.resolutionRate.toFixed(4)),
        obligations: {
          resolved: evidence.resolvedCount,
          failed: evidence.failedCount,
          total: evidence.obligationCount,
        },
        evidence_hash: evidence.evidenceHash,
        authority: evidence.authority,
        threshold_used: threshold,
        last_updated_unix: lastUpdatedUnix,
        last_updated_iso: lastUpdatedIso,
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
Evidence Hash: ${evidence.evidenceHash}
Authority: ${evidence.authority}
Last Updated: ${lastUpdatedIso} (Unix: ${lastUpdatedUnix})

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

// Tool: get_network_status
server.tool(
  "get_network_status",
  "Checks if spJAH8 is deployed on the current Solana network",
  {},
  async () => {
    try {
      const accountInfo = await connection.getAccountInfo(PROGRAM_ID);
      const { lamports, owner, executable, data } = accountInfo ?? {};

      if (!accountInfo) {
        return {
          content: [{ type: "text", text: `spJAH8 is NOT deployed on ${SOLANA_NETWORK}.

Program ID: ${PROGRAM_ID.toBase58()}
Network: ${SOLANA_NETWORK}
RPC: ${SOLANA_RPC}

To deploy: solana program deploy target/deploy/hub_evidence_anchor.so --url ${SOLANA_NETWORK}` }],
          isError: false,
        };
      }

      return {
        content: [{ type: "text", text: `spJAH8 IS deployed on ${SOLANA_NETWORK}.

Program ID: ${PROGRAM_ID.toBase58()}
Network: ${SOLANA_NETWORK}
RPC: ${SOLANA_RPC}
Executable: ${executable}
Owner: ${owner.toBase58()}
Size: ${data ? (data.length / 1024).toFixed(1) + " KB" : "N/A"}
Lamports: ${lamports ? (lamports / 1e9).toFixed(4) + " SOL" : "N/A"}` }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error checking network status: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: check_rpc_health
server.tool(
  "check_rpc_health",
  "Checks connectivity to the Solana RPC endpoint",
  {},
  async () => {
    const start = Date.now();
    try {
      const slot = await connection.getSlot();
      const latencyMs = Date.now() - start;
      return {
        content: [{
          type: "text",
          text: `RPC: ${SOLANA_RPC}\nNetwork: ${SOLANA_NETWORK}\nSlot: ${slot}\nLatency: ${latencyMs}ms\nStatus: ✅ Connected`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `RPC: ${SOLANA_RPC}\nNetwork: ${SOLANA_NETWORK}\nStatus: ❌ Unreachable\nError: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }
);

// Tool: batch_verify_trust
server.tool(
  "batch_verify_trust",
  "Verifies trust scores for multiple agents at once",
  {
    agents: {
      type: "string",
      description: "Comma-separated list of agent IDs to verify (e.g. 'quadricep,brain,testy')",
    },
    threshold: {
      type: "number",
      description: "Minimum resolution rate (0.0-1.0) for approval",
      default: 0.5,
    },
  },
  async ({ agents, threshold = 0.5 }) => {
    try {
      const agentIds = agents.split(",").map((a: string) => a.trim()).filter(Boolean);
      const results = await Promise.allSettled(
        agentIds.map(async (agentId: string) => {
          const pda = deriveHubEvidencePDA(agentId);
          const accountInfo = await connection.getAccountInfo(pda);
          if (!accountInfo) return { agent_id: agentId, found: false, approved: false, resolution_rate: 0 };
          const evidence = parseHubEvidence(accountInfo.data);
          return {
            agent_id: agentId,
            found: true,
            approved: evidence.resolutionRate >= threshold,
            resolution_rate: parseFloat(evidence.resolutionRate.toFixed(4)),
            obligations: {
              resolved: evidence.resolvedCount,
              failed: evidence.failedCount,
              total: evidence.obligationCount,
            },
          };
        })
      );

      const parsed = results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        return { agent_id: agentIds[i], found: false, error: "RPC error" };
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ network: SOLANA_NETWORK, threshold, results: parsed }, null, 2),
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Batch verification failed: ${error instanceof Error ? error.message : String(error)}` }],
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
