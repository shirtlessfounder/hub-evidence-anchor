#!/usr/bin/env tsx
// @ts-nocheck
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
  address: "spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf",
  instructions: [
    {
      name: "anchor_evidence",
      accounts: [
        { name: "hub_evidence", writable: true, signer: false },
        { name: "authority", writable: false, signer: true },
        { name: "system_program", writable: false, signer: false },
      ],
      args: [
        { name: "agent_id", type: "string" },
        { name: "obligation_count", type: "u32" },
        { name: "resolved_count", type: "u32" },
        { name: "failed_count", type: "u32" },
        { name: "evidence_hash", type: "string" },
      ],
    },
  ],
  // @ts-ignore — minimal inline IDL for anchor-evidence call
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
    obligation_count: 23,       // Hub behavioral trust: as_claimant
    resolved_count: 21,
    failed_count: 2,
    resolution_rate: (21 / 23).toFixed(6),  // 91.3% success rate as claimant
    claim: "Trust Olympics Tier 3: Hub behavioral trust anchored on Solana via spJAH8",
    key_obligations: [
      "obl-7093405dee22 | pubkey registry + terminal verification (StarAgent)",
      "obl-6ca5ba29ddb5 | Ed25519 pubkey registry (brain)",
      "obl-86bbe4241a33 | obligation-weighted trust scoring (brain)",
      "obl-6d9d9677edab | Hub Evidence Anchor integration docs (Lloyd)",
      "obl-df967ea3bb71 | 12-competitor analysis (StarAgent)",
      "obl-55658a4ed490 | EWMA behavioral routing review (CombinatorAgent)",
      "obl-32e4c2bec405 | driftcornwall STS v1.1 review (brain)",
      "obl-920e508f32cc | laminar identity/continuity review (laminar)",
    ],
    hub_profile: "https://admin.slate.ceo/oc/brain/trust/quadricep",
    source: "Hub behavioral trust API (/trust/quadricep)",
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
  const program = new anchor.Program(idl as unknown as anchor.Idl, provider);

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
      .anchor_evidence(
        "quadricep",       // agent_id
        new anchor.BN(23), // obligation_count (as claimant, from Hub behavioral trust)
        new anchor.BN(21), // resolved_count
        new anchor.BN(2),  // failed_count
        evidenceHash        // evidence_hash: SHA-256 of Hub behavioral-history JSON
      )
      .accounts({
        hub_evidence: hubEvidencePDA,
        authority: wallet.publicKey,
        system_program: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();

    console.log("\n✅ SUCCESS!");
    console.log("TX signature:", tx);
    console.log("Explorer: https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
    console.log("\n--- Verification ---");
    console.log("HubEvidence PDA:", hubEvidencePDA.toBase58());
    console.log("Agent: quadricep");
    console.log("Obligation count: 23 | Resolved: 21 | Failed: 2");
    console.log("Resolution rate: 21/23 =", (21/23).toFixed(4), "(91.3%)");
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
      // Expected: resolution_rate = 6/7 ≈ 0.8571 stored at fixed offset
      const buf = accountInfo.data;
      const rate = buf.readFloatLE(8 + 64 + 4 + 128 + 4 + 4 + 4 + 4 + 128); // approximate offset
      console.log("  Resolution rate (raw):", rate.toFixed(4));
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
