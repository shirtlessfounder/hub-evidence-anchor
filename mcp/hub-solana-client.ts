/**
 * Hub Evidence Anchor — Solana Client
 * Hub backend integration: calls anchor_handoff on obligation resolution.
 *
 * Wires Hub's handoff_schema obligations → Solana anchor.
 * This is the write path; the MCP server handles the read path (verify_trust).
 *
 * Usage:
 *   import { AnchorHandoffClient } from './hub-solana-client';
 *   const client = new AnchorHandoffClient({ keypair: hubAuthorityKeypair });
 *   await client.anchorHandoff({ obligor, obligationId, commitmentText, completionProof, resolution });
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  BorshCoder,
  BN,
  Program,
  workspace,
} from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Program ID
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || "8gdV37drn1T33qnomPKxUbkyhqAZ3CEzuF3iR88hET1k"
);
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const HUB_ENDPOINT = process.env.HUB_ENDPOINT || "https://admin.slate.ceo/oc/brain";

// ─── Types ───────────────────────────────────────────────────────────────

export interface HandoffParams {
  /** Hub agent ID: "testy" or "brain" */
  obligor: string;
  /** Hub obligation ID: e.g. "obl-8eb6e7b11522" */
  obligationId: string;
  /** Raw decision_context text from the handoff_schema obligation */
  commitmentText: string;
  /** Ed25519 sig of "hub-evidence-anchor-v1" || commitmentText, signed by obligor */
  obligorSignature: Uint8Array;
  /** URL to Hub obligation evidence bundle */
  completionProof: string;
  /** "resolved" | "rejected" | "expired" */
  resolution: "resolved" | "rejected" | "expired";
}

export interface AnchorHandoffResult {
  signature: string;
  slot: number;
  pda: PublicKey;
}

// ─── PDA Derivation ─────────────────────────────────────────────────────

export function deriveHandoffPDA(obligor: string, obligationId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("handoff"),
      Buffer.from(obligor),
      Buffer.from(obligationId),
    ],
    PROGRAM_ID
  );
  return pda;
}

// ─── Commitment Signing ──────────────────────────────────────────────────

const SIGNING_DOMAIN = Buffer.from("hub-evidence-anchor-v1");

/**
 * Signs commitment_text with obligor's Ed25519 private key.
 * Returns 64-byte signature.
 *
 * Hub's application layer must verify:
 * 1. The signing key is the obligor's Hub-registered key
 * 2. The obligor has authorized this specific commitment
 */
export async function signCommitment(
  commitmentText: string,
  obligorPrivateKey: Uint8Array
): Promise<Uint8Array> {
  // Import nacl for Ed25519 signing
  const nacl = await import("tweetnacl");
  const msg = Buffer.concat([SIGNING_DOMAIN, Buffer.from(commitmentText)]);
  const signature = nacl.sign.detached(msg, obligorPrivateKey);
  return signature;
}

/**
 * Verifies an obligor's Ed25519 signature over a commitment.
 * Used to verify the signature before submitting to Solana.
 */
export async function verifyCommitmentSignature(
  commitmentText: string,
  signature: Uint8Array,
  obligorPublicKey: Uint8Array
): Promise<boolean> {
  const nacl = await import("tweetnacl");
  const msg = Buffer.concat([SIGNING_DOMAIN, Buffer.from(commitmentText)]);
  return nacl.sign.detached.verify(msg, signature, obligorPublicKey);
}

// ─── Solana Client ──────────────────────────────────────────────────────

export class AnchorHandoffClient {
  private connection: Connection;
  private authority: Keypair;
  private recentBlockhash: string | null = null;
  private blockhashExpiry: number = 0;

  constructor(opts: {
    keypair: Keypair;
    rpc?: string;
  }) {
    this.connection = new Connection(opts.rpc || SOLANA_RPC, "confirmed");
    this.authority = opts.keypair;
  }

  /**
   * Loads a keypair from a JSON file path.
   * Supports both the 64-byte array format (Anchor) and the
   * {version, address, private_key} format.
   */
  static fromKeypairFile(filePath: string): AnchorHandoffClient {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let secretKey: Uint8Array;

    if (Array.isArray(raw)) {
      // 64-byte secret key array (e.g. from solana-keygen)
      secretKey = new Uint8Array(raw);
    } else if (raw.private_key) {
      // Anchor format: base58-encoded {version, address, private_key}
      const base58 = require("bs58");
      const decoded = base58.default.decode(raw.private_key);
      // First 64 bytes of decoded = secret key
      secretKey = new Uint8Array(decoded.slice(0, 64));
    } else {
      throw new Error(`Unknown keypair format in ${filePath}`);
    }

    return new AnchorHandoffClient({ keypair: Keypair.fromSecretKey(secretKey) });
  }

  private async getFreshBlockhash(): Promise<string> {
    const now = Date.now();
    if (this.recentBlockhash && now < this.blockhashExpiry) {
      return this.recentBlockhash;
    }
    const { blockhash } = await this.connection.getLatestBlockhash();
    this.recentBlockhash = blockhash;
    this.blockhashExpiry = now + 30_000; // refresh every 30s
    return blockhash;
  }

  /**
   * Builds and submits an anchor_handoff transaction.
   *
   * Security: caller must verify obligor's signature before calling this.
   * This function trusts the caller's verification.
   */
  async anchorHandoff(params: HandoffParams): Promise<AnchorHandoffResult> {
    const { obligor, obligationId, commitmentText, obligorSignature, completionProof, resolution } = params;

    // Derive PDA for this handoff
    const pda = deriveHandoffPDA(obligor, obligationId);

    // Check if account already exists (idempotency)
    const existing = await this.connection.getAccountInfo(pda);
    if (existing) {
      console.log(`[anchor-handoff] PDA already exists: ${pda.toBase58()}`);
      return {
        signature: "(already anchored — no new tx)",
        slot: existing.slot,
        pda,
      };
    }

    // Build the instruction using raw IDL encoding
    // anchor_handoff accounts: [handoff_evidence, authority, system_program]
    const accounts = [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // Encode instruction data
    // Discriminator (4 bytes) + fields
    // anchor_handoff discriminator = 2 (second instruction in the program)
    const encoder = new TextEncoder();
    const commitmentBytes = encoder.encode(commitmentText);
    const obligorBytes = encoder.encode(obligor);
    const completionBytes = encoder.encode(completionProof);
    const resolutionBytes = encoder.encode(resolution);

    // Build instruction data buffer
    // Layout (Anchor v1):
    //   4 bytes: instruction discriminator (little-endian u32)
    //   4 bytes: len(obligor) + obligor bytes
    //   4 bytes: len(obligation_id) + obligation_id bytes
    //   4 bytes: len(commitment_text) + commitment_text bytes
    //   64 bytes: obligor_signature
    //   4 bytes: len(completion_proof) + completion_proof bytes
    //   4 bytes: len(resolution) + resolution bytes
    const data = Buffer.alloc(1024);
    let offset = 0;

    // Discriminator for anchor_handoff (2)
    data.writeUInt32LE(2, offset);
    offset += 4;

    // obligor: String
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
    data.writeUInt32LE(commitmentBytes.length, offset);
    offset += 4;
    commitmentBytes.copy(data, offset);
    offset += commitmentBytes.length;

    // obligor_signature: [u8; 64]
    Buffer.from(obligorSignature).copy(data, offset);
    offset += 64;

    // completion_proof: String
    data.writeUInt32LE(completionBytes.length, offset);
    offset += 4;
    completionBytes.copy(data, offset);
    offset += completionBytes.length;

    // resolution: String
    data.writeUInt32LE(resolutionBytes.length, offset);
    offset += 4;
    resolutionBytes.copy(data, offset);
    offset += resolutionBytes.length;

    const instructionData = data.subarray(0, offset);

    // Build transaction
    const blockhash = await this.getFreshBlockhash();
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: this.authority.publicKey,
    }).add({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Sign and send
    tx.sign(this.authority);
    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // Wait for confirmation
    const confirmation = await this.connection.confirmTransaction(
      { signature, ...(await this.connection.getLatestBlockhash()) },
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log(`[anchor-handoff] ✅ Anchored: ${obligationId} by ${obligor} (sig: ${signature})`);

    return {
      signature,
      slot: confirmation.context.slot,
      pda,
    };
  }

  /**
   * Queries a specific handoff evidence record from Solana.
   */
  async getHandoff(obligor: string, obligationId: string): Promise<{
    found: boolean;
    data?: {
      obligor: string;
      obligationId: string;
      commitmentHash: string;
      obligorSignature: string;
      completionProof: string;
      resolution: string;
      timestamp: number;
    };
  }> {
    const pda = deriveHandoffPDA(obligor, obligationId);
    const accountInfo = await this.connection.getAccountInfo(pda);

    if (!accountInfo) {
      return { found: false };
    }

    // Decode account data manually
    const data = accountInfo.data;
    let offset = 8; // skip 8-byte Anchor discriminator

    // obligor: String
    const obligorLen = data.readUInt32LE(offset);
    offset += 4;
    const obligor = data.subarray(offset, offset + obligorLen).toString("utf8");
    offset += obligorLen;

    // obligation_id: String
    const oblIdLen = data.readUInt32LE(offset);
    offset += 4;
    const oblId = data.subarray(offset, offset + oblIdLen).toString("utf8");
    offset += oblIdLen;

    // commitment_hash: String
    const hashLen = data.readUInt32LE(offset);
    offset += 4;
    const commitmentHash = data.subarray(offset, offset + hashLen).toString("utf8");
    offset += hashLen;

    // obligor_signature: [u8; 64]
    const obligorSignature = data.subarray(offset, offset + 64);
    offset += 64;

    // completion_proof: String
    const proofLen = data.readUInt32LE(offset);
    offset += 4;
    const completionProof = data.subarray(offset, offset + proofLen).toString("utf8");
    offset += proofLen;

    // resolution: String
    const resLen = data.readUInt32LE(offset);
    offset += 4;
    const resolution = data.subarray(offset, offset + resLen).toString("utf8");
    offset += resLen;

    // timestamp: i64 (last 8 bytes before authority)
    const timestamp = Number(data.readBigInt64LE(data.length - 8 - 32));

    return {
      found: true,
      data: {
        obligor,
        obligationId: oblId,
        commitmentHash,
        obligorSignature: Buffer.from(obligorSignature).toString("base64"),
        completionProof,
        resolution,
        timestamp,
      },
    };
  }
}

// ─── CLI Entry Point ────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === "anchor") {
    // Usage: node hub-solana-client.ts anchor <obligor> <obligationId> <commitmentText> <completionProof> <resolution>
    const [, , obligor, obligationId, commitmentText, completionProof, resolution] = args;

    if (!obligor || !obligationId) {
      console.error("Usage: node hub-solana-client.ts anchor <obligor> <obligationId> <commitmentText> <completionProof> <resolution>");
      process.exit(1);
    }

    const keypairPath = process.env.HUB_AUTHORITY_KEYPAIR;
    if (!keypairPath) {
      console.error("Set HUB_AUTHORITY_KEYPAIR env var to the path of the Hub authority keypair JSON file");
      process.exit(1);
    }

    const client = AnchorHandoffClient.fromKeypairFile(keypairPath);

    // For CLI use, we skip signing (Hub backend provides the signature)
    // This is a placeholder — real implementation gets obligorSignature from Hub
    const dummySignature = new Uint8Array(64);

    client
      .anchorHandoff({
        obligor,
        obligationId,
        commitmentText: commitmentText || "",
        obligorSignature: dummySignature,
        completionProof: completionProof || `${HUB_ENDPOINT}/obligations/${obligationId}/evidence`,
        resolution: (resolution as any) || "resolved",
      })
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((err) => {
        console.error("Error:", err.message);
        process.exit(1);
      });
  } else if (args[0] === "get") {
    // Usage: node hub-solana-client.ts get <obligor> <obligationId>
    const [, , obligor, obligationId] = args;
    const client = new AnchorHandoffClient({ keypair: Keypair.generate() }); // read-only
    client
      .getHandoff(obligor, obligationId)
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((err) => {
        console.error("Error:", err.message);
        process.exit(1);
      });
  } else {
    console.log("Hub Evidence Anchor — Solana Client");
    console.log("");
    console.log("Usage:");
    console.log("  node hub-solana-client.ts anchor <obligor> <obligationId> [commitmentText] [completionProof] [resolution]");
    console.log("  node hub-solana-client.ts get <obligor> <obligationId>");
    console.log("");
    console.log("Environment:");
    console.log("  PROGRAM_ID          Solana program ID (default: 8gdV37drn1T33qnomPKxUbkyhqAZ3CEzuF3iR88hET1k)");
    console.log("  SOLANA_RPC          RPC endpoint (default: https://api.devnet.solana.com)");
    console.log("  HUB_AUTHORITY_KEYPAIR  Path to Hub authority keypair file");
  }
}
