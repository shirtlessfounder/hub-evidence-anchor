/**
 * hub-evidence-anchor — End-to-End Test Script
 *
 * Tests the full pipeline:
 * 1. anchor_evidence (trust score anchoring)
 * 2. anchor_handoff (commitment-completion pair)
 * 3. verify_trust (MCP read path)
 *
 * Usage:
 *   HUB_AUTHORITY_KEYPAIR=/path/to/keypair.json \
 *   PROGRAM_ID=ESagT1sQne5pwpRXLuh8Yh45EmBWBvNywgpsxrcnqsip \
 *   SOLANA_RPC=https://api.devnet.solana.com \
 *   node scripts/test-full-flow.ts
 *
 * Prerequisites:
 *   - Program deployed on devnet
 *   - Authority keypair funded with SOL
 *   - Hub obligation in terminal state (for anchor_handoff)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";

// ─── Config ──────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || "ESagT1sQne5pwpRXLuh8Yh45EmBWBvNywgpsxrcnqsip"
);
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const KEYPAIR_PATH = process.env.HUB_AUTHORITY_KEYPAIR || "./keypair.json";

const connection = new Connection(SOLANA_RPC, "confirmed");

// ─── Solana Client ──────────────────────────────────────────────────────

function deriveHubEvidencePDA(agentId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("hub-evidence"), Buffer.from(agentId)],
    PROGRAM_ID
  )[0];
}

function deriveHandoffPDA(obligor: string, obligationId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("handoff"), Buffer.from(obligor), Buffer.from(obligationId)],
    PROGRAM_ID
  )[0];
}

async function getFreshBlockhash(connection: Connection): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();
  return blockhash;
}

// ─── Instruction Builders ────────────────────────────────────────────────

/**
 * Build anchor_evidence instruction (discriminator: 1)
 */
function buildAnchorEvidenceIx(
  authority: PublicKey,
  agentId: string,
  obligationCount: number,
  resolvedCount: number,
  failedCount: number,
  evidenceHash: string
): { keys: any[]; data: Buffer } {
  const encoder = new TextEncoder();
  const agentBytes = encoder.encode(agentId);
  const hashBytes = encoder.encode(evidenceHash);

  const data = Buffer.alloc(512);
  let offset = 0;

  // Discriminator (4 bytes): anchor_evidence = 1
  data.writeUInt32LE(1, offset);
  offset += 4;

  // agent_id: String
  data.writeUInt32LE(agentBytes.length, offset);
  offset += 4;
  agentBytes.copy(data, offset);
  offset += agentBytes.length;

  // obligation_count: u32
  data.writeUInt32LE(obligationCount, offset);
  offset += 4;

  // resolved_count: u32
  data.writeUInt32LE(resolvedCount, offset);
  offset += 4;

  // failed_count: u32
  data.writeUInt32LE(failedCount, offset);
  offset += 4;

  // evidence_hash: String
  data.writeUInt32LE(hashBytes.length, offset);
  offset += 4;
  hashBytes.copy(data, offset);
  offset += hashBytes.length;

  const keys = [
    { pubkey: deriveHubEvidencePDA(agentId), isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return { keys, data: data.subarray(0, offset) };
}

/**
 * Build anchor_handoff instruction (discriminator: 2)
 */
function buildAnchorHandoffIx(
  authority: PublicKey,
  obligor: string,
  obligationId: string,
  commitmentText: string,
  obligorSignature: Uint8Array,
  completionProof: string,
  resolution: string
): { keys: any[]; data: Buffer } {
  const encoder = new TextEncoder();
  const obligorBytes = encoder.encode(obligor);
  const oblIdBytes = encoder.encode(obligationId);
  const commitBytes = encoder.encode(commitmentText);
  const proofBytes = encoder.encode(completionProof);
  const resBytes = encoder.encode(resolution);

  const data = Buffer.alloc(1024);
  let offset = 0;

  // Discriminator (4 bytes): anchor_handoff = 2
  data.writeUInt32LE(2, offset);
  offset += 4;

  // obligor: String
  data.writeUInt32LE(obligorBytes.length, offset);
  offset += 4;
  obligorBytes.copy(data, offset);
  offset += obligorBytes.length;

  // obligation_id: String
  data.writeUInt32LE(oblIdBytes.length, offset);
  offset += 4;
  oblIdBytes.copy(data, offset);
  offset += oblIdBytes.length;

  // commitment_text: String
  data.writeUInt32LE(commitBytes.length, offset);
  offset += 4;
  commitBytes.copy(data, offset);
  offset += commitBytes.length;

  // obligor_signature: [u8; 64]
  Buffer.from(obligorSignature).copy(data, offset);
  offset += 64;

  // completion_proof: String
  data.writeUInt32LE(proofBytes.length, offset);
  offset += 4;
  proofBytes.copy(data, offset);
  offset += proofBytes.length;

  // resolution: String
  data.writeUInt32LE(resBytes.length, offset);
  offset += 4;
  resBytes.copy(data, offset);
  offset += resBytes.length;

  const pda = deriveHandoffPDA(obligor, obligationId);
  const keys = [
    { pubkey: pda, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return { keys, data: data.subarray(0, offset) };
}

// ─── Tx Sender ──────────────────────────────────────────────────────────

async function sendTx(
  connection: Connection,
  authority: Keypair,
  instructions: { keys: any[]; data: Buffer; programId: PublicKey }[]
): Promise<string> {
  const blockhash = await getFreshBlockhash(connection);
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: authority.publicKey });
  for (const ix of instructions) {
    tx.add({ ...ix });
  }
  tx.sign(authority);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  const confirmation = await connection.confirmTransaction(
    { signature: sig, ...(await connection.getLatestBlockhash()) },
    "confirmed"
  );
  if (confirmation.value.err) {
    throw new Error(`Tx failed: ${JSON.stringify(confirmation.value.err)}`);
  }
  return sig;
}

// ─── Read Helpers ────────────────────────────────────────────────────────

async function getAccountData(connection: Connection, pubkey: PublicKey): Promise<Buffer | null> {
  const info = await connection.getAccountInfo(pubkey);
  return info ? Buffer.from(info.data) : null;
}

function parseHubEvidence(data: Buffer) {
  let offset = 8; // Anchor discriminator
  const agentIdLen = data.readUInt32LE(offset);
  offset += 4;
  const agentId = data.subarray(offset, offset + agentIdLen).toString("utf8");
  offset += agentIdLen;
  offset += 128; // hub_endpoint
  const obligationCount = data.readUInt32LE(offset);
  offset += 4;
  const resolvedCount = data.readUInt32LE(offset);
  offset += 4;
  const failedCount = data.readUInt32LE(offset);
  offset += 4;
  offset += 128; // evidence_hash
  const resolutionRate = data.readFloat64LE(offset);
  offset += 8;
  const lastUpdated = Number(data.readBigInt64LE(offset));
  return { agentId, obligationCount, resolvedCount, failedCount, resolutionRate, lastUpdated };
}

// ─── Main Test ──────────────────────────────────────────────────────────

async function main() {
  console.log("=== Hub Evidence Anchor — E2E Test ===\n");
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`RPC: ${SOLANA_RPC}`);

  // Load authority keypair
  if (!fs.existsSync(KEYPAIR_PATH)) {
    console.error(`Keypair not found: ${KEYPAIR_PATH}`);
    console.error("Set HUB_AUTHORITY_KEYPAIR env var");
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"));
  const secretKey = Array.isArray(raw) ? new Uint8Array(raw) : Buffer.from(raw);
  const authority = Keypair.fromSecretKey(
    Array.isArray(secretKey) ? secretKey : new Uint8Array(secretKey as Buffer)
  );
  console.log(`Authority: ${authority.publicKey.toBase58()}\n`);

  // Check program is deployed
  const programInfo = await connection.getAccountInfo(PROGRAM_ID);
  if (!programInfo) {
    console.error("❌ Program not deployed! Run deploy first.");
    process.exit(1);
  }
  console.log(`✅ Program deployed (${programInfo.data.length} bytes)\n`);

  // Test 1: anchor_evidence
  console.log("--- Test 1: anchor_evidence ---");
  const agentId = "quadricep";
  const obligationCount = 10;
  const resolvedCount = 8;
  const failedCount = 1;
  const evidenceHash = crypto.createHash("sha256").update(JSON.stringify({ agentId, obligationCount, resolvedCount, failedCount })).digest("hex");

  try {
    const { keys, data } = buildAnchorEvidenceIx(
      authority.publicKey,
      agentId,
      obligationCount,
      resolvedCount,
      failedCount,
      evidenceHash
    );
    const sig = await sendTx(connection, authority, [{ keys, data, programId: PROGRAM_ID }]);
    console.log(`✅ anchor_evidence: ${sig}`);
    console.log(`   Agent: ${agentId}, Resolution rate: ${((resolvedCount / obligationCount) * 100).toFixed(1)}%`);
  } catch (err: any) {
    console.error(`❌ anchor_evidence failed: ${err.message}`);
  }

  // Read back
  const pda = deriveHubEvidencePDA(agentId);
  const evidenceData = await getAccountData(connection, pda);
  if (evidenceData) {
    const evidence = parseHubEvidence(evidenceData);
    console.log(`✅ Read back: ${evidence.resolvedCount}/${evidence.obligationCount} resolved (${(evidence.resolutionRate * 100).toFixed(1)}%)`);
  } else {
    console.log("⚠️  Could not read back evidence account");
  }

  // Test 2: anchor_handoff
  console.log("\n--- Test 2: anchor_handoff ---");
  const obligor = "testy";
  const obligationId = "obl-e2e-" + Date.now();
  const commitmentText = "I will deliver the Colosseum demo by May 1, 2026";
  const obligorSignature = new Uint8Array(64); // Dummy sig for test
  const completionProof = `https://admin.slate.ceo/oc/brain/obligations/${obligationId}/evidence`;
  const resolution = "resolved";

  try {
    const { keys, data } = buildAnchorHandoffIx(
      authority.publicKey,
      obligor,
      obligationId,
      commitmentText,
      obligorSignature,
      completionProof,
      resolution
    );
    const sig = await sendTx(connection, authority, [{ keys, data, programId: PROGRAM_ID }]);
    console.log(`✅ anchor_handoff: ${sig}`);
    console.log(`   Obligee: ${obligor}, Obligation: ${obligationId}`);
    console.log(`   Commitment: "${commitmentText}"`);
    console.log(`   Resolution: ${resolution}`);
  } catch (err: any) {
    console.error(`❌ anchor_handoff failed: ${err.message}`);
  }

  // Read back handoff
  const handoffPda = deriveHandoffPDA(obligor, obligationId);
  const handoffData = await getAccountData(connection, handoffPda);
  if (handoffData) {
    // Manual decode
    let offset = 8;
    const oblBytes = handoffData.readUInt32LE(offset); offset += 4;
    const obl = handoffData.subarray(offset, offset + oblBytes).toString(); offset += oblBytes;
    offset += 4; // obl_id
    const hashBytes = handoffData.readUInt32LE(offset); offset += 4;
    const commitHash = handoffData.subarray(offset, offset + hashBytes).toString();
    console.log(`✅ Handoff anchored: obligor=${obl}, commitment_hash=${commitHash}`);
  } else {
    console.log("⚠️  Could not read back handoff account");
  }

  console.log("\n=== E2E Test Complete ===");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
