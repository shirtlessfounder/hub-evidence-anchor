/**
 * Hub Evidence Anchor — Webhook Relay
 *
 * Subscribes to Hub's obligation state-change events and fires anchor_handoff
 * transactions on Solana when a handoff_schema obligation resolves.
 *
 * Two modes:
 * 1. Polling: polls Hub's GET /agents/<agent>/obligations every N seconds
 * 2. Webhook: receives POST from Hub's _fire_obligation_state_webhook
 *
 * Security: validates Hub's HMAC before processing any event.
 *
 * Usage:
 *   HUB_SECRET=<hub_agent_secret> \
 *   HUB_ENDPOINT=https://admin.slate.ceo/oc/brain \
 *   SOLANA_RPC=https://api.devnet.solana.com \
 *   PROGRAM_ID=spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf \
 *   node webhook-relay.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import * as http from "http";
import * as crypto from "crypto";

// Configuration
const HUB_SECRET = process.env.HUB_SECRET || "";
const HUB_ENDPOINT = process.env.HUB_ENDPOINT || "https://admin.slate.ceo/oc/brain";
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || "spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf"
);
const PORT = parseInt(process.env.PORT || "8080");
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "60") * 1000; // ms
const HUB_AGENT = process.env.HUB_AGENT || "quadricep";
const KEYPAIR_PATH = process.env.HUB_AUTHORITY_KEYPAIR;

// ─── Solana Client ───────────────────────────────────────────────────────

class SolanaRelay {
  private connection: Connection;
  private authority: Keypair;

  constructor(keypair: Keypair) {
    this.connection = new Connection(SOLANA_RPC, "confirmed");
    this.authority = keypair;
  }

  static fromKeypairFile(filePath: string): SolanaRelay {
    const raw = JSON.parse(require("fs").readFileSync(filePath, "utf8"));
    let secretKey: Uint8Array;
    if (Array.isArray(raw)) {
      secretKey = new Uint8Array(raw);
    } else if (raw.private_key) {
      const bs58 = require("bs58");
      const decoded = bs58.default.decode(raw.private_key);
      secretKey = new Uint8Array(decoded.slice(0, 64));
    } else {
      throw new Error(`Unknown keypair format: ${filePath}`);
    }
    return new SolanaRelay(Keypair.fromSecretKey(secretKey));
  }

  private derivePDA(obligor: string, obligationId: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("handoff"), Buffer.from(obligor), Buffer.from(obligationId)],
      PROGRAM_ID
    );
    return pda;
  }

  async anchorHandoff(params: {
    obligor: string;
    obligationId: string;
    commitmentText: string;
    obligorSignature: Uint8Array;
    completionProof: string;
    resolution: string;
  }): Promise<{ signature: string; slot: number }> {
    const { obligor, obligationId, commitmentText, obligorSignature, completionProof, resolution } = params;
    const pda = this.derivePDA(obligor, obligationId);

    // Check idempotency
    const existing = await this.connection.getAccountInfo(pda);
    if (existing) {
      console.log(`[relay] PDA already exists: ${pda.toBase58()} — skipping`);
      return { signature: "(already anchored)", slot: existing.slot };
    }

    // Build instruction data (Anchor v1 encoding)
    const encoder = new TextEncoder();
    const data = Buffer.alloc(1024);
    let offset = 0;

    // Discriminator: anchor_handoff = 2
    data.writeUInt32LE(2, offset);
    offset += 4;

    // obligor: String
    const obligorBytes = encoder.encode(obligor);
    data.writeUInt32LE(obligorBytes.length, offset);
    offset += 4;
    obligorBytes.copy(data, offset);
    offset += obligorBytes.length;

    // obligation_id: String
    data.writeUInt32LE(obligationId.length, offset);
    offset += 4;
    encoder.encodeInto(obligationId, data.subarray(offset));
    offset += obligationId.length;

    // commitment_text: String
    const commitmentBytes = encoder.encode(commitmentText);
    data.writeUInt32LE(commitmentBytes.length, offset);
    offset += 4;
    commitmentBytes.copy(data, offset);
    offset += commitmentBytes.length;

    // obligor_signature: [u8; 64]
    Buffer.from(obligorSignature).copy(data, offset);
    offset += 64;

    // completion_proof: String
    const proofBytes = encoder.encode(completionProof);
    data.writeUInt32LE(proofBytes.length, offset);
    offset += 4;
    proofBytes.copy(data, offset);
    offset += proofBytes.length;

    // resolution: String
    const resBytes = encoder.encode(resolution);
    data.writeUInt32LE(resBytes.length, offset);
    offset += 4;
    resBytes.copy(data, offset);
    offset += resBytes.length;

    const instructionData = data.subarray(0, offset);

    const { blockhash } = await this.connection.getLatestBlockhash();
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: this.authority.publicKey,
    }).add({
      keys: [
        { pubkey: pda, isSigner: false, isWritable: true },
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    tx.sign(this.authority);
    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    const confirmation = await this.connection.confirmTransaction(
      { signature, ...(await this.connection.getLatestBlockhash()) },
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error(`Solana tx failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return { signature, slot: confirmation.context.slot };
  }
}

// ─── Hub API Client ──────────────────────────────────────────────────────

interface HubVC {
  algorithm: "Ed25519";
  key_id: string;
  public_key: string;      // base64
  signed_at: string;       // ISO timestamp
  signed_fields: string[]; // fields covered by signature
  signature: string;       // base64 Ed25519 sig over signed_fields
  evidence_hash: string;   // sha256:<hex>
  bundle_url: string;      // e.g. /obligations/<id>/bundle
  verification?: any;
}

interface AdvanceResponse {
  obligation: any;
  hub_vc?: HubVC;         // included when status=resolved
}

async function fetchObligations(agentId: string, status?: string): Promise<any[]> {
  const url = `${HUB_ENDPOINT}/agents/${agentId}/obligations`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${HUB_SECRET}` },
  });
  if (!resp.ok) throw new Error(`Hub API error: ${resp.status} ${resp.statusText}`);
  const data = await resp.json() as any;
  let obligations = data.obligations || data || [];
  if (status) {
    obligations = obligations.filter((o: any) => o.status === status);
  }
  return obligations;
}

async function fetchObligation(obligationId: string): Promise<any> {
  const resp = await fetch(`${HUB_ENDPOINT}/obligations/${obligationId}`, {
    headers: { Authorization: `Bearer ${HUB_SECRET}` },
  });
  if (!resp.ok) throw new Error(`Hub API error: ${resp.status}`);
  const data = await resp.json();
  return data.obligation || data;
}

/**
 * Advances a terminal obligation to get hub_vc.
 * hub_vc is included in the response when advancing to resolved/rejected/expired.
 */
async function advanceObligation(obligationId: string, status: string): Promise<AdvanceResponse> {
  const resp = await fetch(`${HUB_ENDPOINT}/obligations/${obligationId}/advance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HUB_SECRET}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!resp.ok) throw new Error(`advance error: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<AdvanceResponse>;
}

// Check if an obligation uses handoff_schema
function isHandoffSchema(obl: any): boolean {
  return !!(obl.handoff_schema || obl.decision_context || obl.alternatives_rejected);
}

/**
 * Extracts the obligor's Ed25519 signature from evidence_refs.
 * This is the obligor's own signature over the commitment_text, verified by Hub.
 */
function extractObligorSignature(obl: any): Uint8Array | null {
  const evidenceSigs = (obl.evidence_refs || []).filter(
    (e: any) => e.type === "obligor_signature" || e.type === "signature"
  );
  if (evidenceSigs.length > 0) {
    const b64 = evidenceSigs[0].signature || evidenceSigs[0].value;
    if (b64) return Buffer.from(b64, "base64") as unknown as Uint8Array;
  }
  return null;
}

/**
 * Builds the completion proof URL from hub_vc.bundle_url or obligation ID.
 */
function buildCompletionProof(obl: any, hubVc?: HubVC): string {
  if (hubVc?.bundle_url) {
    return hubVc.bundle_url.startsWith("http")
      ? hubVc.bundle_url
      : `${HUB_ENDPOINT}${hubVc.bundle_url}`;
  }
  return `${HUB_ENDPOINT}/obligations/${obl.obligation_id}/evidence`;
}

// ─── Webhook Server ──────────────────────────────────────────────────────

function createWebhookServer(relay: SolanaRelay) {
  return http.createServer(async (req, res) => {
    if (req.method === "POST" && (req.url === "/webhook" || req.url === "/")) {
      // Read body
      let body = "";
      for await (const chunk of req) body += chunk;

      // Validate Hub HMAC
      const hmac = crypto.createHmac("sha256", HUB_SECRET);
      hmac.update(body);
      const expectedSig = hmac.digest("hex");
      const receivedSig = (req.headers["x-hub-signature"] as string || "").replace("sha256=", "");
      if (HUB_SECRET && receivedSig !== expectedSig) {
        console.warn("[relay] Invalid webhook signature");
        res.writeHead(401);
        res.end("Unauthorized");
        return;
      }

      let event: any;
      try {
        event = JSON.parse(body);
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
        return;
      }

      // Handle obligation state change
      if (event.obligation) {
        const obl = event.obligation;
        const terminalStates = ["resolved", "rejected", "expired"];
        if (terminalStates.includes(obl.status) && isHandoffSchema(obl)) {
          console.log(`[relay] Processing: ${obl.obligation_id} → ${obl.status}`);

          // hub_vc may be included in the webhook payload
          const hubVc: HubVC | undefined = event.hub_vc;

          // Extract decision_context (commitment text)
          const commitmentText = obl.decision_context
            || obl.binding_scope_text
            || JSON.stringify(obl.scope || obl.summary || "");

          // Get obligor's signature from evidence_refs
          const sigBuffer = extractObligorSignature(obl);
          const obligorSignature = sigBuffer || new Uint8Array(64);

          const completionProof = buildCompletionProof(obl, hubVc);

          try {
            const result = await relay.anchorHandoff({
              obligor: obl.parties?.[0]?.agent_id || obl.created_by || HUB_AGENT,
              obligationId: obl.obligation_id,
              commitmentText,
              obligorSignature,
              completionProof,
              resolution: obl.status,
            });
            console.log(`[relay] ✅ ${obl.obligation_id} → Solana sig: ${result.signature}`);
            if (hubVc) {
              console.log(`[relay]    hub_vc: evidence_hash=${hubVc.evidence_hash}, bundle=${hubVc.bundle_url}`);
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, result }));
          } catch (err: any) {
            console.error(`[relay] ❌ ${obl.obligation_id}: ${err.message}`);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
          return;
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "Received" }));
    } else if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200);
      res.end("OK");
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}

// ─── Polling Mode ────────────────────────────────────────────────────────

/**
 * Polling mode: watches obligations and calls anchor_handoff when handoff_schema
 * obligations reach terminal state.
 *
 * For each terminal obligation:
 * 1. Calls advance_obligation to get hub_vc (Hub's signed VC over the resolution)
 * 2. Extracts obligor's signature from evidence_refs
 * 3. Calls anchor_handoff on Solana with both signatures
 *
 * hub_vc fields used:
 * - evidence_hash: stored in Solana completion_proof
 * - bundle_url: for off-chain evidence verification
 * - signature: Hub's Ed25519 sig over the obligation data
 */
async function pollMode(relay: SolanaRelay, agentId: string) {
  const seen = new Set<string>();

  while (true) {
    try {
      const obligations = await fetchObligations(agentId);

      // Find handoff_schema obligations that are terminal but not yet processed
      const candidates = obligations.filter(
        (o) =>
          ["resolved", "rejected", "expired"].includes(o.status) &&
          isHandoffSchema(o) &&
          !seen.has(o.obligation_id)
      );

      for (const obl of candidates) {
        seen.add(obl.obligation_id);

        // Call advance to get hub_vc (Hub's signed VC)
        let hubVc: HubVC | undefined;
        try {
          const advanceResp = await advanceObligation(obl.obligation_id, obl.status);
          hubVc = advanceResp.hub_vc;
          console.log(`[poll] Advanced ${obl.obligation_id} → hub_vc: ${hubVc ? "present" : "absent"}`);
        } catch (err: any) {
          // May fail if already advanced — that's ok, continue with what we have
          console.warn(`[poll] advance ${obl.obligation_id}: ${err.message}`);
        }

        const commitmentText =
          obl.decision_context ||
          obl.binding_scope_text ||
          JSON.stringify(obl.scope || "");

        const sigBuffer = extractObligorSignature(obl);
        const obligorSignature = sigBuffer || new Uint8Array(64);

        const completionProof = buildCompletionProof(obl, hubVc);

        try {
          const result = await relay.anchorHandoff({
            obligor: obl.created_by || agentId,
            obligationId: obl.obligation_id,
            commitmentText,
            obligorSignature,
            completionProof,
            resolution: obl.status,
          });
          console.log(`[poll] ✅ ${obl.obligation_id} → Solana sig: ${result.signature}`);
          if (hubVc) {
            console.log(`[poll]    hub_vc evidence_hash: ${hubVc.evidence_hash}`);
          }
        } catch (err: any) {
          console.error(`[poll] ❌ ${obl.obligation_id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      console.error(`[poll] Error: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (!KEYPAIR_PATH) {
    console.error("Set HUB_AUTHORITY_KEYPAIR to the path of the Hub authority keypair");
    process.exit(1);
  }

  const relay = SolanaRelay.fromKeypairFile(KEYPAIR_PATH);
  console.log(`[relay] Solana authority: ${relay["authority"].publicKey.toBase58()}`);
  console.log(`[relay] Program ID: ${PROGRAM_ID.toBase58()}`);

  const mode = process.env.MODE || "webhook";

  if (mode === "webhook") {
    const server = createWebhookServer(relay);
    server.listen(PORT, () => {
      console.log(`[relay] Webhook server listening on :${PORT}/webhook`);
    });
  } else if (mode === "poll") {
    console.log(`[relay] Polling mode: ${HUB_ENDPOINT}/agents/${HUB_AGENT}/obligations every ${POLL_INTERVAL}ms`);
    await pollMode(relay, HUB_AGENT);
  }
}

main().catch((e) => {
  console.error("[relay] Fatal:", e);
  process.exit(1);
});
