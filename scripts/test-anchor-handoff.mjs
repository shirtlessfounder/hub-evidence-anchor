/**
 * Hub Evidence Anchor — Test anchor_handoff instruction
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
import * as readline from "readline";

const PROGRAM_ID = new PublicKey("6dap1barBURnSHW3qYMg7JK6iZGFUWWWMLSx4Qynbqek");
const RPC = "https://api.devnet.solana.com";
const KEYPAIR_PATH = path.join(process.cwd(), "keys", "hub-evidence-anchor-keypair.json");

// Load keypair from JSON array file
function loadKeypair(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(new Uint8Array(data));
}

// Encode string for Anchor v1 Borsh
function encodeString(str, buf, offset) {
  const bytes = Buffer.from(str, "utf8");
  buf.writeUInt32LE(bytes.length, offset);
  bytes.copy(buf, offset + 4);
  return offset + 4 + bytes.length;
}

function buildAnchorHandoffIx(params) {
  const { obligor, obligationId, commitmentText, obligorSignature, completionProof, resolution, authority, programId } = params;

  // Derive PDA
  const seeds = [Buffer.from("handoff"), Buffer.from(obligor), Buffer.from(obligationId)];
  const [pda] = PublicKey.findProgramAddressSync(seeds, programId);

  // Build instruction data
  const data = Buffer.alloc(2048);
  let offset = 0;

  // Discriminator: 2 (anchor_handoff)
  data.writeBigUInt64LE(12540841793794067308n, offset);
  offset += 4;

  // obligor: String
  offset = encodeString(obligor, data, offset);

  // obligation_id: String
  offset = encodeString(obligationId, data, offset);

  // commitment_text: String
  offset = encodeString(commitmentText, data, offset);

  // obligor_signature: [u8; 64]
  Buffer.from(obligorSignature).copy(data, offset);
  offset += 64;

  // completion_proof: String
  offset = encodeString(completionProof, data, offset);

  // resolution: String
  offset = encodeString(resolution, data, offset);

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

async function main() {
  console.log("=== Hub Evidence Anchor — Test anchor_handoff ===\n");

  const authority = loadKeypair(KEYPAIR_PATH);
  console.log("Authority:", authority.publicKey.toBase58());

  const connection = new Connection(RPC, "confirmed");

  const balance = await connection.getBalance(authority.publicKey);
  console.log("Balance:", (balance / 1e9).toFixed(4), "SOL\n");

  if (balance < 5000) {
    console.error("Insufficient SOL — need at least 0.000005 SOL for fees");
    process.exit(1);
  }

  // Test with quadricep as obligor
  const obligor = "quadricep";
  const obligationId = "obl-test-001";
  const commitmentText = "Deploy Hub Evidence Anchor on Solana devnet for Colosseum hackathon demo";
  const obligorSignature = new Uint8Array(64); // zeros for test
  const completionProof = "https://admin.slate.ceo/oc/quadricep/obligations/obl-test-001/evidence";
  const resolution = "resolved";

  const instruction = buildAnchorHandoffIx({
    obligor,
    obligationId,
    commitmentText,
    obligorSignature,
    completionProof,
    resolution,
    authority: authority.publicKey,
    programId: PROGRAM_ID,
  });

  // Derive PDA for display
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("handoff"), Buffer.from(obligor), Buffer.from(obligationId)],
    PROGRAM_ID
  );
  console.log("Obligor:", obligor);
  console.log("Obligation ID:", obligationId);
  console.log("Resolution:", resolution);
  console.log("PDA:", pda.toBase58());
  console.log("");

  // Check if already exists
  const existing = await connection.getAccountInfo(pda);
  if (existing) {
    console.log("PDA already exists — idempotent skip");
    console.log("✅ anchor_handoff already on-chain!");
    process.exit(0);
  }

  // Send transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: authority.publicKey,
  }).add(instruction);

  tx.sign(authority);

  console.log("Sending anchor_handoff tx...");
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  console.log("Signature:", signature);

  const confirmation = await connection.confirmTransaction(
    { signature, ...(await connection.getLatestBlockhash()) },
    "confirmed"
  );

  if (confirmation.value.err) {
    console.error("❌ Failed:", JSON.stringify(confirmation.value.err));
    process.exit(1);
  }

  console.log("\n✅ anchor_handoff confirmed on Solana devnet!");
  console.log("Explorer: https://explorer.solana.com/tx/" + signature + "?cluster=devnet");
  console.log("PDA: https://explorer.solana.com/address/" + pda.toBase58() + "?cluster=devnet");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
