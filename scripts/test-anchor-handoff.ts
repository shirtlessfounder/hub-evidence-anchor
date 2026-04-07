/**
 * Test: Fire anchor_handoff instruction on Solana devnet.
 * 
 * This is a demo transaction showing the Hub Evidence Anchor
 * instruction working on-chain.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// ─── Config ─────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf");
const RPC = "https://api.devnet.solana.com";
const KEYPAIR_PATH = path.join(__dirname, "..", "keys", "hub-evidence-anchor-keypair.json");

// ─── Load Keypair ────────────────────────────────────────────────────────────

function loadKeypair(filePath: string): Keypair {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  // JSON array of bytes
  return Keypair.fromSecretKey(new Uint8Array(data));
}

// ─── Build anchor_handoff instruction ────────────────────────────────────────

function buildAnchorHandoffInstruction(params: {
  obligor: string;
  obligationId: string;
  commitmentText: string;
  obligorSignature: Uint8Array;
  completionProof: string;
  resolution: string;
  authority: PublicKey;
  programId: PublicKey;
}) {
  const { obligor, obligationId, commitmentText, obligorSignature, completionProof, resolution, authority, programId } = params;

  // Derive PDA: ["handoff", obligor, obligationId]
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("handoff"), Buffer.from(obligor), Buffer.from(obligationId)],
    programId
  );

  // Encode instruction data (Anchor v1 Borsh encoding)
  const encoder = new TextEncoder();
  const data = Buffer.alloc(2048);
  let offset = 0;

  // Discriminator: 4 bytes (u32 LE) — anchor_handoff = 2
  data.writeUInt32LE(2, offset);
  offset += 4;

  // obligor: String (4-byte length + bytes)
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

  return {
    keys: [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Hub Evidence Anchor — Test anchor_handoff ===\n");

  // Load deployer keypair
  const authority = loadKeypair(KEYPAIR_PATH);
  console.log("Authority:", authority.publicKey.toBase58());

  // Connection
  const connection = new Connection(RPC, "confirmed");

  // Check balance
  const balance = await connection.getBalance(authority.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  if (balance < 5000) {
    console.error("Insufficient SOL for deployment fees");
    process.exit(1);
  }

  // Test params
  const params = {
    obligor: "quadricep",
    obligationId: "obl-test-001",
    commitmentText: "Adopt 4-field handoff_schema on all open obligations for 14 days",
    obligorSignature: new Uint8Array(64), // zeros for test
    completionProof: "https://admin.slate.ceo/oc/brain/obligations/obl-test-001/evidence",
    resolution: "resolved",
    authority: authority.publicKey,
    programId: PROGRAM_ID,
  };

  // Build instruction
  const instruction = buildAnchorHandoffInstruction(params);

  // Derive PDA for display
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("handoff"), Buffer.from(params.obligor), Buffer.from(params.obligationId)],
    PROGRAM_ID
  );
  console.log("PDA:", pda.toBase58());
  console.log("Obligor:", params.obligor);
  console.log("Obligation ID:", params.obligationId);
  console.log("Resolution:", params.resolution);
  console.log("");

  // Check if PDA already exists
  const existing = await connection.getAccountInfo(pda);
  if (existing) {
    console.log("PDA already exists — skipping (idempotent)");
    console.log("✅ anchor_handoff already anchored!");
    process.exit(0);
  }

  // Build and send transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: authority.publicKey,
  }).add(instruction);

  tx.sign(authority);

  console.log("Sending transaction...");
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  console.log("Signature:", signature);

  // Confirm
  const confirmation = await connection.confirmTransaction(
    { signature, ...(await connection.getLatestBlockhash()) },
    "confirmed"
  );

  if (confirmation.value.err) {
    console.error("❌ Transaction failed:", confirmation.value.err);
    process.exit(1);
  }

  console.log("✅ Transaction confirmed!");
  console.log("✅ anchor_handoff instruction executed on Solana devnet!");
  console.log("");
  console.log("Explorer: https://explorer.solana.com/tx/" + signature + "?cluster=devnet");
  console.log("PDA: https://explorer.solana.com/address/" + pda.toBase58() + "?cluster=devnet");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
