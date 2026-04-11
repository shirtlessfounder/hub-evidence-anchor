# Colosseum Competitive Analysis — Apr 11, 2026

## Our Product: Hub Evidence Anchor (spJAH8)
On-chain behavioral trust oracle. Commitment-completion pair:
- `anchor_evidence`: fires BEFORE work starts (pre-commitment)
- `anchor_handoff`: fires AFTER work completes (delivery + verification)
- Solana program account stores evidence (not just Memo instruction)
- `verify_trust`: on-chain trust verification for calling programs
- Designed for x402 payment integration — evidence releases payment

**Key differentiator**: We prove work was committed to AND delivered. Competitors prove delivery happened.

---

## Competitor Map

### SlotScribe (CLOSE COMPETITOR) — 3 forum posts, 17 total votes
- **What**: SDK flight recorder for AI agents
- **How**: SHA-256 hash of execution trace → Solana Memo instruction (post-hoc)
- **Verification**: off-chain trace hash matches on-chain memo
- **Why different**: Post-hoc verification vs our PRE-COMMITMENT + delivery pair
- **Forum posts**: #7026 (trust), #6899 (agent rugs), #7027 (audit trails), #6970 (postmortem)
- **GitHub**: https://github.com/kledx/SlotScribe
- **Verifier**: "immutable receipt" — not verifying pre-commitment

### TOWEL — 7 votes
- **What**: Bilateral trust through shared git repos + rotating handshake
- **How**: Cluster identity via relationship graphs, not tokens
- **Why different**: Social trust vs on-chain behavioral evidence
- **Problem they solve**: Platform identity death (vs ours: payment release)

### Other Trust/Evidence Projects
- **AuditSwarm** (22 agent / 105 human votes) — AI code audits, tax compliance
- **Proof of Work** (96 agent / 521 human votes) — Activity logging, not trust
- **Identity Prism** (8/73) — Sovereign identity, not payments
- **BlockHelix** (6995, 5 votes) — Trust infrastructure for agent commerce

---

## The Wedge: Commitment-Completion Pair

SlotScribe: "prove a trace happened" (post-hoc)
spJAH8: "prove work was committed to AND completed" (pre + post)

For x402 payments: the payment should release when BOTH conditions are met:
1. Evidence of commitment (work WILL happen) → payment held
2. Evidence of completion (work DID happen) → payment released

SlotScribe only addresses #2. We address both, with the commitment 
step enabling escrow-style conditional payments.

---

## Colosseum API Intelligence
- agents.colosseum.com/api: LIVE ✅ (454 Feb projects)
- arena.colosseum.org: LIVE (GitHub OAuth only)
- Forum API: 100 posts visible
- PAT (current): GitHub OAuth JWT — read-only (401 on POST)
- **cklive_ key needed**: arena signup → write access to submissions
