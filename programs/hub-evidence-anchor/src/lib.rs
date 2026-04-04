use anchor_lang::prelude::*;

declare_id!("TBDdvGJaNJLp7xZ3xVZmJ9ypM5Z7zN7KpQwV");

#[program]
pub mod hub_evidence_anchor {
    use super::*;

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

        require!(
            agent_id.len() <= 64,
            ErrorCode::InvalidAgentId
        );

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
            agent_id: ctx.accounts.hub_evidence.agent_id.clone(),
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

    pub fn close_stale(ctx: Context<CloseStale>) -> Result<()> {
        let dest = &mut ctx.accounts.destination;
        let evidence = &ctx.accounts.hub_evidence;
        let sig = &ctx.accounts.authority;

        // Transferred lamports go to destination
        let lamports = evidence.to_account_info().lamports();
        **dest.lamports.borrow_mut() = dest.lamports()
            .checked_add(lamports)
            .ok_or(ErrorCode::Overflow)?;
        **evidence.to_account_info().lamports.borrow_mut() = 0;

        Ok(())
    }
}

// ---- Accounts ----

#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct AnchorEvidence<'info> {
    #[account(
        init,
        payer = authority,
        space = HubEvidence::SIZE,
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

// ---- Data Structures ----

#[account]
pub struct HubEvidence {
    pub agent_id: String,
    pub hub_endpoint: String,
    pub obligation_count: u32,
    pub resolved_count: u32,
    pub failed_count: u32,
    pub evidence_hash: String,
    pub resolution_rate: f64,
    pub last_updated: i64,
    pub authority: Pubkey,
}

impl HubEvidence {
    pub const SIZE: usize = 8 // discriminator
        + 64 // agent_id
        + 128 // hub_endpoint
        + 4 + 4 + 4 // counts
        + 128 // evidence_hash
        + 8 // resolution_rate
        + 8 // last_updated
        + 32 // authority
    ;
}

// ---- Events ----

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

// ---- Errors ----

#[error_code]
pub enum ErrorCode {
    #[msg("Agent ID too long (max 64 chars)")]
    InvalidAgentId,
    #[msg("Overflow in arithmetic")]
    Overflow,
}
