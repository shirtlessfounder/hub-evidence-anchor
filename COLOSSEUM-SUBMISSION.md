# Colosseum Frontier Submission — Hub Evidence Anchor

## Project Info
- **Project Name:** Hub Evidence Anchor
- **Team:** Dylan (shirtlessfounder) + quadricep (cofounder-brain agent)
- **Repo:** https://github.com/shirtlessfounder/hub-evidence-anchor
- **Live Demo URL:** PENDING (program deployment)

## Pitch (60 words)
Hub Evidence Anchor is an on-chain behavioral trust oracle for Solana agents. It proves what agents committed to deliver and whether they delivered — anchoring Hub's obligation resolution evidence on Solana for immutable, third-party-verifiable trust records. The $285M Drift Protocol hack was a commitment-scoping failure. Hub Evidence Anchor solves it.

## Full Description

### Problem
AI agents increasingly act autonomously on-chain, but there's no way to verify:
1. Whether an agent committed to deliver something
2. Whether it actually delivered
3. What the counterparty agreed to

Social engineering and commitment-scoping failures cause billions in losses. DPRK operatives used relationship-building + trust establishment before exploiting protocols.

### Solution
Hub Evidence Anchor creates an immutable behavioral trust record on Solana:
- **anchor_evidence**: Commits a trust score with obligation history on-chain
- **anchor_handoff**: Records commitment-completion pairs with cryptographic proof
- **verify_trust**: Third parties can query on-chain trust state

### How It Works
1. Agent creates obligation on Hub → Hub records commitment
2. On completion, Hub resolves obligation → issues hub_vc (Hub-signed VC)
3. Relay calls anchor_handoff → commitment hash anchored on Solana
4. Third parties verify on-chain: "This agent committed X and delivered Y"
5. Solana program verifies Hub VC signature cryptographically

### Technical Stack
- **Solana Program:** Anchor/Rust, 4 instructions (anchor_evidence, anchor_handoff, verify_trust, close_stale)
- **MCP Server:** hub-evidence-anchor-mcp.ts — programmatic trust verification
- **Hub Integration:** webhook-relay.ts — obligation → hub_vc → Solana pipeline
- **Evidence Format:** JSON bundles with Ed25519 signatures, SHA-256 commitment hashes

### Why It Matters
- DPRK attributed to Drift Protocol: 6-month social engineering op. Smart contracts worked. Trust layer failed.
- NIST RSAC 2026: behavioral evidence gap is the #1 enterprise security concern for AI agents
- Hub's obligation state machine is the only system where counterparty independently verifies delivery
- Solana Foundation: "Smart contracts held up. The real targets are humans." Hub Evidence Anchor protects the humans.

## Prize Categories
- **Primary:** Most Agentic — agents acting autonomously on behalf of users
- **Secondary:** Best Infrastructure — tools that enable other builders

## Submission Checklist
- [ ] Program deployed on Solana devnet
- [ ] Live demo URL (program + MCP server)
- [ ] README with quickstart
- [ ] Demo video (optional but recommended)
- [ ] Team registration at arena.colosseum.org/signup

## Demo Flow (once deployed)
1. `solana program show ESagT1sQne5pwpRXLuh8Yh45EmBWBvNywgpsxrcnqsip --url devnet`
2. MCP: `verify_trust` → returns agent trust score + obligation history
3. Hub: obligation created → resolved → anchor_handoff → Solana tx confirmed
4. Demo: https://github.com/shirtlessfounder/hub-evidence-anchor/tree/main/DEMO-EVIDENCE.md

## Judges' Notes
- Commitment-scoping failure is the core thesis (not a code exploit)
- Hub vs on-chain alternatives: Hub is the ONLY system with multi-party obligation confirmation
- Differentiation: DPRK attribution, NIST validation, enterprise security urgency
- Weakness: not yet on mainnet (devnet only for hackathon)
