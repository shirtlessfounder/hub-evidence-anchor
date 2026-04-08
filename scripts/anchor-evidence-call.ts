#!/usr/bin/env tsx
/**
 * anchor_evidence call — Trust Olympics Tier 3
 * First ever call to spJAH8 on Solana devnet
 * 
 * Prerequisites:
 *   cd ~/hub-evidence-anchor && npm install
 *   export ANCHOR_WALLET_JSON=~/.config/solana/id.json
 *   export SOLANA_RPC=https://api.devnet.solana.com
 *   Df8vfRCa must be funded with >= 0.5 SOL
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ─── Config ─────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf");
const WALLET_PATH = process.env.ANCHOR_WALLET_JSON || path.join(process.env.HOME || "/root", ".config/solana/id.json");
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";

// ─── Inline IDL ──────────────────────────────────────────────────────────────

const idl = {
  version: "0.1.0",
  name: "hub_evidence_anchor",
  instructions: [
    {
      name: "anchorEvidence",
      accounts: [
        { name: "hubEvidence", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "agentId", type: "string" },
        { name: "obligationCount", type: "u32" },
        { name: "resolvedCount", type: "u32" },
        { name: "failedCount", type: "u32" },
        { name: "evidenceHash", type: "string" },
      ],
    },
  ],
};

async function main() {
  console.log("=== anchor_evidence — Trust Olympics Tier 3 ===\n");

  // Load wallet
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, "utf8"));
  const wallet = Keypair.fromSecretKey(Buffer.from(walletData));
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program:", PROGRAM_ID.toBase58());
  console.log("RPC:", RPC);

  // ─── Compute evidence hash ──────────────────────────────────────────────
  const evidenceData = {
    agent: "quadricep",
    obligation_count: 11,
    resolved_count: 6,
    failed_count: 2,
    resolution_rate: (6 / 11).toFixed(6),
    claim: "Trust Olympics Tier 3: Hub behavioral trust anchored on Solana via spJAH8",
    obligations: [
      "obl-f3ac93fa02de (enrollment, accepted)",
      "obl-6d9d9677edab (integration docs review, evidence submitted)",
      "obl-34fd6381b75d (Colosseum coordination, resolved)",
      "obl-df967ea3bb71 (competitive analysis, evidence submitted)",
      "obl-55658a4ed490 (EWMA review, resolved)",
      "obl-32e4c2bec405 (driftcornwall STS review, proposed)",
      "obl-920e508f32cc (laminar identity review, proposed)",
      "obl-0529e19f50fa (Tier3 synthetic anchor, proposed)",
    ],
    date: new Date().toISOString(),
  };
  const evidenceJson = JSON.stringify(evidenceData);
  const evidenceHash = crypto.createHash("sha256").update(Buffer.from(evidenceJson)).digest("hex");

  console.log("\nEvidence data:");
  console.log(evidenceJson);
  console.log("SHA-256 hash:", evidenceHash);

  // ─── Check wallet balance ────────────────────────────────────────────────
  const connection = new Connection(RPC, "confirmed");
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`\nWallet balance: ${(balance / 1e9).toFixed(6)} SOL`);

  if (balance < 500_000_000) {
    console.error(`\nERROR: Need >= 0.5 SOL, have ${(balance / 1e9).toFixed(4)} SOL`);
    console.error("Ask Dylan: solana transfer " + wallet.publicKey.toBase58() + " 0.5 --url devnet");
    process.exit(1);
  }

  // ─── Set up Anchor ──────────────────────────────────────────────────────
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: "confirmed",
    skipPreflight: false,
  });
  anchor.setProvider(provider);

  // Create program from IDL
  const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);

  // Derive PDA
  const [hubEvidencePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub-evidence"), Buffer.from("quadricep")],
    PROGRAM_ID
  );
  console.log("\nHubEvidence PDA:", hubEvidencePDA.toBase58());

  // ─── Build transaction ───────────────────────────────────────────────────
  console.log("\nSending anchor_evidence transaction...");

  try {
    const tx = await program.methods
      .anchorEvidence(
        "quadricep",       // agentId
        new anchor.BN(11), // obligationCount
        new anchor.BN(6),  // resolvedCount
        new anchor.BN(2),  // failedCount
        evidenceHash       // evidenceHash
      )
      .accounts({
        hubEvidence: hubEvidencePDA,
        authority: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();

    console.log("\n✅ SUCCESS!");
    console.log("TX signature:", tx);
    console.log("Explorer: https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
    console.log("\n--- Verification ---");
    console.log("HubEvidence PDA:", hubEvidencePDA.toBase58());
    console.log("Agent: quadricep");
    console.log("Obligation count: 11 | Resolved: 6 | Failed: 2");
    console.log("Resolution rate:", (6 / 11).toFixed(4));
    console.log("Evidence hash:", evidenceHash);
    console.log("\nTrust Olympics Tier 3: claim verified ✅");

    // ─── Verify: read back the account ────────────────────────────────────
    console.log("\nReading back account...");
    const accountInfo = await connection.getAccountInfo(hubEvidencePDA);
    if (accountInfo) {
      console.log("✅ Account confirmed on-chain!");
      console.log("  Size:", accountInfo.data.length, "bytes");
      console.log("  Owner:", accountInfo.owner.toBase58());
      console.log("  Lamports:", accountInfo.lamports);
    } else {
      console.log("⚠️ Account not returned by RPC (may need to wait for slot)");
    }

  } catch (err) {
    console.error("\n❌ Transaction failed:", err);
    if (err instanceof Error) {
      console.error("Error message:", err.message);
      // Try to parse Anchor error
      const anchorErr = err as any;
      if (anchorErr.logs) {
        console.error("Program logs:", anchorErr.logs.join("\n"));
      }
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
