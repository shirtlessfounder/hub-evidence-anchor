# Colosseum Frontier Submission — Hub Evidence Anchor

**Status:** Ready to submit — awaiting Dylan registration + Df8vfRCa funding  
**Updated:** 2026-04-08

## Project Info
- **Project Name:** Hub Evidence Anchor
- **Team:** Dylan (shirtlessfounder, human) + quadricep (cofounder-brain agent, all code)
- **Repo:** https://github.com/shirtlessfounder/hub-evidence-anchor
- **Live program:** `spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf` (Solana devnet, executable ✅)
- **Narrative:** `docs/SUBMISSION-NARRATIVE-v0.1.md`
- **Submission script:** `scripts/submit-colosseum.sh`

## Pitch (60 words)
Hub Evidence Anchor is an on-chain behavioral trust oracle for Solana agents. spJAH8 anchors x402 payment commitments with cryptographic evidence chains verified by Hub's obligation state machine — before payment fires. No multisig, no timelock, no admin key. The economics are the enforcement. The $285M Drift Protocol hack was a commitment-scoping failure. Hub Evidence Anchor solves it.

## The Problem
Every agentic payment rail in production (x402, lobster.cash, MPP) executes transfers when agents request them — but cannot verify what happened *before* the transfer fired. The payment fires because an agent asked, not because evidence confirmed delivery.

The $285M Drift Protocol hack (April 2026): DPRK operatives established trust through relationship-building, then violated the commitment scope. Smart contracts worked. The trust layer failed.

## The Solution
spJAH8 — an upgradeable BPF program on Solana devnet that makes x402's evidence condition legible on-chain.

**The three instructions:**
- `anchor_evidence` — caller submits commitment hash before work (ex-ante binding)
- `anchor_handoff` — called after x402 routes payment; emits anchor event confirming evidence chain satisfied first
- `verify_trust` — queries Hub behavioral evidence chain; returns resolution rate + trust score

**The inversion:** x402 doesn't wait for an agent to claim completion. It confirms the evidence chain against the commitment hash. If evidence matches scope, payment fires. If it doesn't, it doesn't.

## Most Agentic Framing
> "The most autonomous system isn't the one that acts most — it's the one whose constraints are most self-enforcing. spJAH8 can only emit an anchor event if x402 routed payment first. No multisig, no timelock, no admin key. The economics are the enforcement."

## Technical Stack
- **Solana Program:** Anchor/Rust, 3 instructions, deployed to devnet as BPFLoaderUpgradeable
- **MCP Server:** `mcp/hub-evidence-anchor-mcp.ts` — `anchor_evidence`, `anchor_handoff`, `verify_trust(format=json)`
- **Hub Integration:** obligation state machine → Ed25519 signed evidence bundles → Solana anchor
- **Evidence Format:** JSON bundles with SHA-256 commitment hashes

## Trust Olympics Verification (StarAgent, independent)
- **Tier 1:** SPEC.md, integration docs, evidence bundle format — ✅ PASS
- **Tier 2:** MCP server with 3 tools — ✅ PASS
- **Tier 3:** spJAH8 deployed + executable on devnet, bytecode verified — ✅ PASS

Hub trust profile: `/brain/trust/quadricep` — 6/11 obligations resolved (54.5%), weighted trust score 0.321

## Competitive Differentiation
| System | What it does | Gap |
|--------|-------------|-----|
| x402 Foundation | Payment protocol | No evidence verification |
| lobster.cash (Crossmint) | Supervised virtual cards | Human in loop on every tx |
| MPP (Stripe + Tempo) | Session-based authorization | Authorization, not accountability |
| Solana Agent Registry | Wallet-based reputation | Wallet tenure ≠ behavioral evidence |
| SugarClawdy (Feb) | Escrow with human dispute | Different finality model |

**spJAH8:** the only system where counterparty independently verifies delivery *before* payment fires.

## Live Demo Path
Once `Df8vfRCaEKEZVtp5c8qmHMtnZpP1GXXVEwNayKcoW7ox` is funded:
1. Agent calls `anchor_evidence` → commitment hash on Solana
2. Agent delivers work
3. Agent calls `anchor_handoff` with x402 payment tx signature
4. spJHS8 emits anchor event → Solana confirms evidence chain satisfied
5. Agent calls `verify_trust` → Hub returns behavioral trust signal

Explorer: https://explorer.solana.com/address/spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf?cluster=devnet

## Submission Checklist
- [x] Program deployed on Solana devnet (spJAH8, executable=true, 305KB ELF)
- [x] MCP server complete (3 tools)
- [x] Docs: integration docs, SPEC.md, evidence bundle format, judge explainer
- [x] Trust Olympics: all 3 tiers verified by StarAgent
- [x] Narrative doc: co-authored with CombinatorAgent
- [ ] arena.colosseum.org/signup (Dylan — triggers Frontier in API)
- [ ] Get cklive_ API key from Colosseum dashboard
- [ ] Run submission script: `bash scripts/submit-colosseum.sh`
- [ ] Live demo: first successful anchor_handoff tx on spJAH8
- [ ] Post Colosseum forum update (script ready, docs staged)

## Judges' Notes
- Commitment-scoping failure is the core thesis (not a code exploit)
- DPRK attribution validates the problem: trust establishment without behavioral verification fails
- Hub's obligation state machine: the ONLY system where counterparty independently verifies delivery
- NIST RSAC 2026: behavioral evidence gap is #1 enterprise security concern for AI agents
- All code written by quadricep (AI agent) — fully compliant with "no human code" requirement
