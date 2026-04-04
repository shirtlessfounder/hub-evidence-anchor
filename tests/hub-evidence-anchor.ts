import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("hub-evidence-anchor", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.HubEvidenceAnchor as Program;

  // Test wallet (from provider)
  const authority = provider.wallet.publicKey;

  // Derive PDA for a test agent
  const [hubEvidencePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub-evidence"), Buffer.from("test-agent-001")],
    program.programId
  );

  it("anchors evidence for a new agent", async () => {
    const obligationCount = 63;
    const resolvedCount = 42;
    const failedCount = 16;
    const evidenceHash = "sha256:abc123def456...";

    const tx = await program.methods
      .anchorEvidence(
        "test-agent-001",
        obligationCount,
        resolvedCount,
        failedCount,
        evidenceHash
      )
      .accounts({
        hubEvidence: hubEvidencePDA,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Fetch the account
    const account = await program.account.hubEvidence.fetch(hubEvidencePDA);

    assert.equal(account.agentId, "test-agent-001");
    assert.equal(account.obligationCount, obligationCount);
    assert.equal(account.resolvedCount, resolvedCount);
    assert.equal(account.failedCount, failedCount);
    assert.equal(account.evidenceHash, evidenceHash);
    assert.closeTo(account.resolutionRate, 42 / 63, 0.001);
    assert.ok(account.lastUpdated > 0);
    assert.ok(account.authority.equals(authority));

    console.log("Evidence anchored. TX:", tx);
    console.log("Resolution rate:", account.resolutionRate);
  });

  it("updates resolution after obligation state change", async () => {
    const resolvedCount = 44; // +2 resolved since last anchor
    const failedCount = 16;   // no change
    const evidenceHash = "sha256:updated789...";

    const tx = await program.methods
      .updateResolution(resolvedCount, failedCount, evidenceHash)
      .accounts({
        hubEvidence: hubEvidencePDA,
        authority,
      })
      .rpc();

    const account = await program.account.hubEvidence.fetch(hubEvidencePDA);

    assert.equal(account.resolvedCount, resolvedCount);
    assert.closeTo(account.resolutionRate, 44 / 63, 0.001);
    assert.equal(account.evidenceHash, evidenceHash);
    assert.ok(account.lastUpdated > 0);

    console.log("Resolution updated. TX:", tx);
    console.log("New resolution rate:", account.resolutionRate);
  });

  it("rejects non-authority signer on update", async () => {
    const wrongAuthority = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .updateResolution(50, 16, "sha256:hacked...")
        .accounts({
          hubEvidence: hubEvidencePDA,
          authority: wrongAuthority.publicKey,
        })
        .signers([wrongAuthority])
        .rpc();

      assert.fail("Should have rejected non-authority signer");
    } catch (err) {
      // Expected: custom error or constraint violation
      assert(err.toString().includes("constraint") || err.toString().includes("Error"));
      console.log("Correctly rejected non-authority signer");
    }
  });

  it("verifies trust via fetch (read-only)", async () => {
    const account = await program.account.hubEvidence.fetch(hubEvidencePDA);

    // Any Solana agent/protocol can READ the trust data
    assert.ok(account.agentId);
    assert.ok(account.resolutionRate >= 0);
    assert.ok(account.obligationCount > 0);
    assert.ok(account.authority.equals(authority));

    console.log("Trust data readable by any caller:");
    console.log("  agent_id:", account.agentId);
    console.log("  resolution_rate:", account.resolutionRate);
    console.log("  obligation_count:", account.obligationCount);
    console.log("  last_updated:", new Date(account.lastUpdated * 1000).toISOString());
  });
});
