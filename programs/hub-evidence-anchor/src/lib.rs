use anchor_lang::prelude::*;
use sha2::{Sha256, Digest};

declare_id!("8gdV37drn1T33qnomPKxUbkyhqAZ3CEzuF3iR88hET1k");

#[program]
pub mod hub_evidence_anchor {
    use super::*;

    // ─── Aggregate Evidence ───────────────────────────────────────────────

    pub fn anchor_evidence(
        ctx: Context<AnchorEvidence>,
        agent_id: String,
        obligation_count: u32,
        resolved_count: u32,
        failed_count: u32,
        evidence_hash: String,
    ) -> Result<()> {
        let evidence = &mut ctx.accounts.hub_evidence;
        let clock = Clock::get()?;

        require!(agent_id.len() <= 64, ErrorCode::InvalidAgentId);

        let resolution_rate = if obligation_count > 0 {
            (resolved_count as f64) / (obligation_count as f64)
        } else {
            0.0
        };

        evidence.agent_id = agent_id;
        evidence.obligation_count = obligation_count;
        evidence.resolved_count = resolved_count;
        evidence.failed_count = failed_count;
        evidence.evidence_hash = evidence_hash;
        evidence.resolution_rate = resolution_rate;
        evidence.last_updated = clock.unix_timestamp;
        evidence.authority = ctx.accounts.authority.key();

        emit!(EvidenceAnchored {
            agent_id: evidence.agent_id.clone(),
            obligation_count,
            resolution_rate,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_resolution(
        ctx: Context<UpdateResolution>,
        resolved_count: u32,
        failed_count: u32,
        evidence_hash: String,
    ) -> Result<()> {
        let evidence = &mut ctx.accounts.hub_evidence;
        let clock = Clock::get()?;

        evidence.resolved_count = resolved_count;
        evidence.failed_count = failed_count;
        evidence.evidence_hash = evidence_hash;
        evidence.resolution_rate = if evidence.obligation_count > 0 {
            (resolved_count as f64) / (evidence.obligation_count as f64)
        } else {
            0.0
        };
        evidence.last_updated = clock.unix_timestamp;

        emit!(ResolutionUpdated {
            agent_id: evidence.agent_id.clone(),
            resolution_rate: evidence.resolution_rate,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ─── Handoff Schema Commitment-Completion Pair ────────────────────────

    /// Anchors a commitment-completion pair from a handoff_schema obligation.
    ///
    /// Authorization: Hub authority (Signer) signs the Solana tx.
    /// Hub's application layer has already verified:
    ///   1. obligor's Ed25519 signature over commitment_text
    ///   2. obligor is the authorized party to this obligation
    ///   3. obligation is in a terminal state
    /// Solana stores the record. Hub is the authorization layer.
    ///
    /// obligor: Hub agent ID (e.g. "testy", "brain"). Hub resolves to pubkey.
    /// obligor_signature: Ed25519 sig of "hub-evidence-anchor-v1" || commitment_text
    ///   — verified by Hub application layer before constructing this tx
    ///   — stored on-chain for transparency and off-chain verification
    ///
    /// Verification:
    ///   - Hub-native: Hub verifies obligor's Ed25519, signs VC, fires tx
    ///   - Solana: immutable anchor (commitment_hash + obligor_signature stored)
    ///   - Third-party: fetches Hub bundle, verifies Hub VC sig, re-hashes, compares to Solana
    pub fn anchor_handoff(
        ctx: Context<AnchorHandoff>,
        obligor: String,              // Hub agent ID: "testy" or "brain"
        obligation_id: String,
        commitment_text: String,
        obligor_signature: [u8; 64],  // Ed25519 sig: "hub-evidence-anchor-v1" || commitment_text
        completion_proof: String,
        resolution: String,
    ) -> Result<()> {
        let handoff = &mut ctx.accounts.handoff_evidence;
        let clock = Clock::get()?;

        require!(obligation_id.len() <= 64, ErrorCode::InvalidObligationId);
        require!(obligor.len() <= 32, ErrorCode::InvalidObligor);
        require!(
            resolution == "resolved"
                || resolution == "rejected"
                || resolution == "expired",
            ErrorCode::InvalidResolution
        );

        // SHA-256 hash of the commitment text, stored as hex string
        let mut hasher = Sha256::new();
        hasher.update(commitment_text.as_bytes());
        let hash_result = hasher.finalize();
        let commitment_hash = format!("sha256:{:x}", hash_result);

        handoff.obligor = obligor;
        handoff.obligation_id = obligation_id.clone();
        handoff.commitment_hash = commitment_hash;
        handoff.obligor_signature = obligor_signature;
        handoff.completion_proof = completion_proof;
        handoff.resolution = resolution.clone();
        handoff.timestamp = clock.unix_timestamp;
        handoff.authority = ctx.accounts.authority.key();

        emit!(HandoffAnchored {
            obligor: handoff.obligor.clone(),
            obligation_id,
            resolution,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn close_stale(ctx: Context<CloseStale>) -> Result<()> {
        let dest = &mut ctx.accounts.destination;
        let evidence = &ctx.accounts.hub_evidence;
        let lamports = evidence.to_account_info().lamports();
        **dest.lamports.borrow_mut() = dest.lamports()
            .checked_add(lamports)
            .ok_or(ErrorCode::Overflow)?;
        **evidence.to_account_info().lamports.borrow_mut() = 0;
        Ok(())
    }
}

// ─── Accounts ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct AnchorEvidence<'info> {
    #[account(
        init,
        payer = authority,
        space = HubEvidence::INIT_SPACE,
        seeds = [b"hub-evidence", agent_id.as_bytes()],
        bump
    )]
    pub hub_evidence: Account<'info, HubEvidence>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateResolution<'info> {
    #[account(
        mut,
        seeds = [b"hub-evidence", hub_evidence.agent_id.as_bytes()],
        bump,
        has_one = authority
    )]
    pub hub_evidence: Account<'info, HubEvidence>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(obligor: String, obligation_id: String)]
pub struct AnchorHandoff<'info> {
    #[account(
        init,
        payer = authority,
        space = HandoffEvidence::INIT_SPACE,
        seeds = [b"handoff", obligor.as_bytes(), obligation_id.as_bytes()],
        bump
    )]
    pub handoff_evidence: Account<'info, HandoffEvidence>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseStale<'info> {
    #[account(
        mut,
        close = destination,
        seeds = [b"hub-evidence", hub_evidence.agent_id.as_bytes()],
        bump,
        has_one = authority
    )]
    pub hub_evidence: Account<'info, HubEvidence>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub destination: SystemAccount<'info>,
}

// ─── Data Structures ───────────────────────────────────────────────────────

/// Aggregate trust evidence for an agent.
/// Written to Solana PDA on each obligation state transition.
#[account]
#[derive(InitSpace)]
pub struct HubEvidence {
    #[max_len(64)]
    pub agent_id: String,

    #[max_len(128)]
    pub hub_endpoint: String,

    pub obligation_count: u32,
    pub resolved_count: u32,
    pub failed_count: u32,

    #[max_len(128)]
    pub evidence_hash: String,

    pub resolution_rate: f64,
    pub last_updated: i64,
    pub authority: Pubkey,
}

/// Individual commitment-completion pair from a handoff_schema obligation.
/// Anchored on Solana so any party can independently verify without calling Hub API.
#[account]
#[derive(InitSpace)]
pub struct HandoffEvidence {
    /// Hub agent ID (e.g. "testy", "brain") — resolved to pubkey by Hub
    #[max_len(32)]
    pub obligor: String,

    #[max_len(64)]
    pub obligation_id: String,

    #[max_len(80)]
    pub commitment_hash: String, // "sha256:..." (8 prefix + 64 hex)

    /// Ed25519 signature of "hub-evidence-anchor-v1" || commitment_text,
    /// signed by obligor's registered key. Verified by Hub app layer before tx.
    pub obligor_signature: [u8; 64],

    #[max_len(256)]
    pub completion_proof: String, // URL to Hub obligation evidence bundle

    #[max_len(16)]
    pub resolution: String, // "resolved" | "rejected" | "expired"

    pub timestamp: i64,
    pub authority: Pubkey,
}

// ─── Events ────────────────────────────────────────────────────────────────

#[event]
pub struct EvidenceAnchored {
    pub agent_id: String,
    pub obligation_count: u32,
    pub resolution_rate: f64,
    pub timestamp: i64,
}

#[event]
pub struct ResolutionUpdated {
    pub agent_id: String,
    pub resolution_rate: f64,
    pub timestamp: i64,
}

#[event]
pub struct HandoffAnchored {
    pub obligor: String,
    pub obligation_id: String,
    pub resolution: String,
    pub timestamp: i64,
}

// ─── Errors ────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Agent ID too long (max 64 chars)")]
    InvalidAgentId,

    #[msg("Obligation ID too long (max 64 chars)")]
    InvalidObligationId,

    #[msg("Obligor ID too long (max 32 chars)")]
    InvalidObligor,

    #[msg("Resolution must be 'resolved', 'rejected', or 'expired'")]
    InvalidResolution,

    #[msg("Overflow in arithmetic")]
    Overflow,

    #[msg("Obligor Ed25519 signature verification failed")]
    InvalidObligorSignature,
}
