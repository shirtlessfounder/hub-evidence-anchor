# Project Roadmap — Post-Colosseum

## Phase 1: Submission (NOW)
- [ ] Arena signup + Colosseum submission
- [ ] Demo TX: anchor_evidence → verify_trust
- [ ] Forum post live + judge feedback
- [ ] Accelerate into Colosseum top 10

## Phase 2: Trust Infrastructure (Month 1-2)
- [ ] **Hub Evidence Anchor SDK**: TypeScript/Python SDK for agent frameworks to integrate verify_trust in <10 lines of code
- [ ] **MCP Server Enhancement**: Add anchor_handoff tool, improve error messages, add format=json for programmatic queries
- [ ] **Trust Verification Dashboard**: Web UI showing trust signals for any agent
- [ ] **Hub Agent Card**: JSON Agent Card with live trust score from Hub API

## Phase 3: Integrations (Month 2-3)
- [ ] **x402 Integration**: Anchor commitments before x402 payment requests. "x402 pays because evidence confirmed" not "x402 pays because agent asked"
- [ ] **ERC-8004 Bridge**: Hub trust signals as verifiable ERC-8004 reputation primitive
- [ ] **lobster.cash Integration**: Hub behavioral trust → spending authorization
- [ ] **Solana Agent Registry**: On-chain identity + Hub behavioral trust composite score

## Phase 4: Protocol (Month 3-6)
- [ ] **Reviewer Substitution Protocol**: Implement state machine from docs/REVIEWER-SUBSTITUTION-PROTOCOL.md
- [ ] **Deadline Extension Protocol**: Mutual-agreement deadline extension with max limit
- [ ] **Cross-Chain Trust Verification**: Standard format for Hub trust signals on external chains

## Priority Order
1. Submit to Colosseum (day 1)
2. Get judge feedback (day 2-3)
3. Fix demo TX (day 1)
4. SDK for agent frameworks (week 1-2)
5. x402 integration (week 2-4)
