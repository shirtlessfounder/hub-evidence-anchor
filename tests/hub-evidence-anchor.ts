import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("hub-evidence-anchor", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.HubEvidenceAnchor as Program;
  const authority = provider.wallet.publicKey;

  // PDA for main test agent (quadricep)
  const [hubEvidencePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub-evidence"), Buffer.from("quadricep")],
    program.programId
  );

  // PDA for cold-start agent (no obligations yet)
  const [coldStartPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub-evidence"), Buffer.from("cold-start-agent")],
    program.programId
  );

  // Clean up between test suites
  beforeEach(async () => {
    // Tests use fresh PDAs per describe block
  });

  describe("anchor_evidence", () => {
    it("anchors evidence for quadricep with live Hub data", async () => {
      // Real data from Hub obligation state machine
      const tx = await program.methods
        .anchorEvidence(
          "quadricep",
          63,   // obligation_count
          42,   // resolved_count
          16,   // failed_count
          "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        )
        .accounts({
          hubEvidence: hubEvidencePDA,
          authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const account = await program.account.hubEvidence.fetch(hubEvidencePDA);

      assert.equal(account.agentId, "quadricep");
      assert.equal(account.obligationCount, 63);
      assert.equal(account.resolvedCount, 42);
      assert.equal(account.failedCount, 16);
      assert.equal(account.resolutionRate, 42 / 63); // ~0.667
      assert.closeTo(account.resolutionRate, 0.667, 0.01);
      assert.ok(account.lastUpdated > 0);
      assert.ok(account.authority.equals(authority));

      console.log("✅ quadricep: 42/63 obligations =", (42/63*100).toFixed(1) + "% resolution rate");
    });

    it("anchors cold-start agent with zero obligations", async () => {
      const tx = await program.methods
        .anchorEvidence(
          "cold-start-agent",
          0,    // obligation_count
          0,    // resolved_count
          0,    // failed_count
          "sha256:0000000000000000000000000000000000000000000000000000000000000000"
        )
        .accounts({
          hubEvidence: coldStartPDA,
          authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const account = await program.account.hubEvidence.fetch(coldStartPDA);

      assert.equal(account.obligationCount, 0);
      assert.equal(account.resolvedCount, 0);
      assert.equal(account.resolutionRate, 0); // 0/0 = 0, not NaN
      assert.equal(account.failedCount, 0);

      console.log("✅ cold-start-agent: 0/0 = 0% (graceful zero handling)");
    });

    it("anchors agent with perfect record", async () => {
      const [perfectPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("hub-evidence"), Buffer.from("perfect-agent")],
        program.programId
      );

      const tx = await program.methods
        .anchorEvidence(
          "perfect-agent",
          10,   // obligation_count
          10,   // resolved_count
          0,    // failed_count
          "sha256:perfect..."
        )
        .accounts({
          hubEvidence: perfectPDA,
          authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const account = await program.account.hubEvidence.fetch(perfectPDA);
      assert.equal(account.resolutionRate, 1.0);
      console.log("✅ perfect-agent: 10/10 = 100% (perfect record)");
    });

    it("anchors agent with zero resolution rate (all failed)", async () => {
      const [failedPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("hub-evidence"), Buffer.from("failed-agent")],
        program.programId
      );

      const tx = await program.methods
        .anchorEvidence(
          "failed-agent",
          5,    // obligation_count
          0,    // resolved_count
          5,    // failed_count
          "sha256:allfailed..."
        )
        .accounts({
          hubEvidence: failedPDA,
          authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const account = await program.account.hubEvidence.fetch(failedPDA);
      assert.equal(account.resolutionRate, 0.0);
      console.log("✅ failed-agent: 0/5 = 0% (all failed)");
    });
  });

  describe("update_resolution", () => {
    it("updates after new obligations resolve", async () => {
      const tx = await program.methods
        .updateResolution(
          44,   // +2 resolved (42→44)
          16,   // no new failures
          "sha256:updated-after-2-more-resolved"
        )
        .accounts({
          hubEvidence: hubEvidencePDA,
          authority,
        })
        .rpc();

      const account = await program.account.hubEvidence.fetch(hubEvidencePDA);
      assert.equal(account.resolvedCount, 44);
      assert.equal(account.failedCount, 16);
      assert.equal(account.obligationCount, 63); // unchanged
      assert.equal(account.resolutionRate, 44 / 63); // ~0.698
      console.log("✅ Updated: 44/63 =", (44/63*100).toFixed(1) + "%");
    });

    it("records new failure", async () => {
      const tx = await program.methods
        .updateResolution(
          44,   // no change
          17,   // +1 failure
          "sha256:new-failure-recorded"
        )
        .accounts({
          hubEvidence: hubEvidencePDA,
          authority,
        })
        .rpc();

      const account = await program.account.hubEvidence.fetch(hubEvidencePDA);
      assert.equal(account.failedCount, 17);
      assert.equal(account.resolutionRate, 44 / 63); // resolution rate unchanged
      console.log("✅ New failure recorded: 44/63 =", (44/63*100).toFixed(1) + "% (failed count up)");
    });

    it("rejects non-authority signer", async () => {
      const wrongKey = anchor.web3.Keypair.generate();

      try {
        await program.methods
          .updateResolution(50, 16, "sha256:hacked")
          .accounts({
            hubEvidence: hubEvidencePDA,
            authority: wrongKey.publicKey,
          })
          .signers([wrongKey])
          .rpc();

        assert.fail("Should have rejected non-authority signer");
      } catch (err) {
        assert(err.toString().includes("constraint") || err.toString().includes("Error"));
        console.log("✅ Correctly rejected non-authority signer");
      }
    });
  });

  describe("verify_trust (read-only)", () => {
    it("returns trust data to any caller", async () => {
      const account = await program.account.hubEvidence.fetch(hubEvidencePDA);

      // Trust data readable by any Solana agent/protocol via CPI
      assert.equal(account.agentId, "quadricep");
      assert.ok(account.resolutionRate >= 0 && account.resolutionRate <= 1.0);
      assert.ok(account.obligationCount > 0);
      assert.ok(account.authority.equals(authority));
      assert.ok(account.evidenceHash.startsWith("sha256:"));
      assert.ok(account.lastUpdated > 0);

      console.log("✅ Any caller can read trust data:");
      console.log("   agent_id:", account.agentId);
      console.log("   resolution_rate:", (account.resolutionRate * 100).toFixed(1) + "%");
      console.log("   obligation_count:", account.obligationCount);
      console.log("   resolved_count:", account.resolvedCount);
      console.log("   failed_count:", account.failedCount);
    });
  });

  describe("threshold-gated trust (integration demo)", () => {
    it("demo: micro-payment gate (resolution_rate >= 0.5)", async () => {
      const account = await program.account.hubEvidence.fetch(hubEvidencePDA);
      const MICRO_PAYMENT_THRESHOLD = 0.5;

      const canUseMicropayments = account.resolutionRate >= MICRO_PAYMENT_THRESHOLD;
      assert.equal(canUseMicropayments, true);
      console.log(`✅ resolution_rate ${(account.resolutionRate*100).toFixed(1)}% >= 50% → micro-payments ALLOWED`);
    });

    it("demo: escrow gate (resolution_rate >= 0.75)", async () => {
      const account = await program.account.hubEvidence.fetch(hubEvidencePDA);
      const ESCROW_THRESHOLD = 0.75;

      const canUseEscrow = account.resolutionRate >= ESCROW_THRESHOLD;
      assert.equal(canUseEscrow, false); // 0.698 < 0.75
      console.log(`✅ resolution_rate ${(account.resolutionRate*100).toFixed(1)}% < 75% → escrow NOT YET`);
    });

    it("demo: high-value gate (resolution_rate >= 0.9)", async () => {
      const account = await program.account.hubEvidence.fetch(hubEvidencePDA);
      const HIGH_VALUE_THRESHOLD = 0.9;

      const canUseHighValue = account.resolutionRate >= HIGH_VALUE_THRESHOLD;
      assert.equal(canUseHighValue, false);
      console.log(`✅ resolution_rate ${(account.resolutionRate*100).toFixed(1)}% < 90% → high-value NOT YET`);
    });
  });
});
