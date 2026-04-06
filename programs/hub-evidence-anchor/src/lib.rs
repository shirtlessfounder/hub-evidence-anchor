use anchor_lang::prelude::*;
use sha2::{Sha256, Digest};

declare_id!("275QQuz5D6d5U7rhAVW1gYGZBmmyzq6srFdV3rT6rMdA");

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
    /// commitment_text is hashed with SHA-256 ON-CHAIN. Solana stores the hash,
    /// not the full text. This keeps the Solana tx small (~200 bytes account).
    ///
    /// Verification model:
    /// - Hub-native: Hub provides the original text when calling this instruction.
    ///   On-chain hash proves it wasn't altered after anchoring.
    /// - Third-party: completion_proof URL should point to content-addressed storage
    ///   (IPFS) so anyone can fetch the original and rehash without trusting Hub.
    ///
    /// completion_proof is an off-chain URL to the full Hub evidence bundle.
    pub fn anchor_handoff(
        ctx: Context<AnchorHandoff>,
        _obligor: Pubkey,
        obligation_id: String,
        commitment_text: String,
        completion_proof: String,
        resolution: String,
    ) -> Result<()> {
        let handoff = &mut ctx.accounts.handoff_evidence;
        let clock = Clock::get()?;

        require!(obligation_id.len() <= 64, ErrorCode::InvalidObligationId);
        require!(
            resolution == "resolved"
                || resolution == "rejected"
                || resolution == "expired",
            ErrorCode::InvalidResolution
        );

        // SHA-256 hash of the commitment text, stored as hex string
        let mut hasher = Sha256::new();
        hasher.update(commitment_text.as_bytes());
        let result = hasher.finalize();
        let commitment_hash = format!("sha256:{:x}", result);

        handoff.obligor = ctx.accounts.authority.key();
        handoff.obligation_id = obligation_id;
        handoff.commitment_hash = commitment_hash;
        handoff.completion_proof = completion_proof;
        handoff.resolution = resolution;
        handoff.timestamp = clock.unix_timestamp;
        handoff.authority = ctx.accounts.authority.key();

        emit!(HandoffAnchored {
            obligor: handoff.obligor,
            obligation_id: handoff.obligation_id.clone(),
            resolution: handoff.resolution.clone(),
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
#[instruction(_obligor: Pubkey, obligation_id: String)]
pub struct AnchorHandoff<'info> {
    #[account(
        init,
        payer = authority,
        space = HandoffEvidence::INIT_SPACE,
        seeds = [b"handoff", authority.key().as_ref(), obligation_id.as_bytes()],
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
/// Anchored on Solana so any party can independently verify the commitment
/// scope and delivery without calling the Hub API.
#[account]
#[derive(InitSpace)]
pub struct HandoffEvidence {
    pub obligor: Pubkey,

    #[max_len(64)]
    pub obligation_id: String,

    #[max_len(80)]
    pub commitment_hash: String, // "sha256:..." = 8 + 64 hex chars

    #[max_len(256)]
    pub completion_proof: String, // off-chain URL to full Hub evidence

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
    pub obligor: Pubkey,
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

    #[msg("Resolution must be 'resolved', 'rejected', or 'expired'")]
    InvalidResolution,

    #[msg("Overflow in arithmetic")]
    Overflow,
}
