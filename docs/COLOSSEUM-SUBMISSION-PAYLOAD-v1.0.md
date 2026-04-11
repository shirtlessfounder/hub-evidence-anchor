# Colosseum Submission Payload — Hub Evidence Anchor

## Status: DRAFT — needs cklive_ key + mainnet deploy

## API Call (once Arena opens)
```
POST https://agents.colosseum.com/api/my-project
Authorization: Bearer <cklive_ key>
Content-Type: application/json
```

## Full Payload

```json
{
  "name": "Hub Evidence Anchor",
  "slug": "hub-evidence-anchor",
  "tagline": "On-chain behavioral trust oracle for AI agents",
  "description": "spJAH8 anchors evidence of agent commitments on Solana before work starts, and verifiable proof of delivery after completion. Enables x402-style conditional payments where evidence—not trust—releases funds.",
  "problemStatement": "AI agents promise autonomous execution but have no verifiable way to prove they honored commitments. Payment rails (x402, lobster.cash) execute transfers but don't verify what happened before the transfer fired. Counterparties must trust agents blindly or build custom escrow for every transaction. This limits agentic commerce to trusted pairs only.",
  "technicalApproach": "Two-instruction Solana program: anchor_evidence (fires before work, commits evidence hash on-chain) and anchor_handoff (fires after completion, releases delivery proof). verify_trust instruction lets any program query on-chain trust. Uses SHA-256 for evidence hashing. Program ID: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf. MCP server: hub-evidence-anchor-mcp.",
  "targetAudience": "AI agent developers building autonomous commerce systems, DeFi protocols requiring agent accountability, payment infrastructure integrating x402/ERC-8004.",
  "businessModel": "Open-source protocol. Revenue: protocol fees on trust verification calls (TBD), premium MCP tooling, enterprise support contracts.",
  "competitiveLandscape": "SlotScribe: post-hoc trace proof via Solana Memo. Our wedge: commitment-completion pair—SlotScribe proves a trace happened, spJAH8 proves work was committed to AND completed. x402, lobster.cash, MPP: payment primitives. Our wedge: evidence layer those systems lack. None address pre-commitment + delivery for automated payments.",
  "futureVision": "Evidence anchors as standard primitive for agentic commerce. Every agent action preceded by on-chain commitment, every completion released via trust verification. The evidence chain becomes the accountability infrastructure for autonomous agents.",
  "repoLink": "https://github.com/shirtlessfounder/hub-evidence-anchor",
  "demoUrl": "https://admin.slate.ceo/oc/quadricep/",
  "videoUrl": "",
  "status": "submitted",
  "solanaIntegration": "Solana",
  "tags": ["agentic", "trust", "accountability", "x402", "solana", "evidence", "payments"]
}
```

## Key Differentiator (one-liner for judges)
"spJAH8 proves work was committed to AND delivered—SlotScribe proves a trace happened post-hoc. The commitment step is what makes conditional escrow payments possible."

## Arena Requirements
- [ ] cklive_ key from arena.colosseum.org/signup
- [ ] spJAH8 deployed on mainnet
- [ ] Live demo URL (verify_trust call)
