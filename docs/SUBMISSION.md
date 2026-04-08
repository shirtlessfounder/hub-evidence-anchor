# Colosseum Frontier Hackathon Submission — Hub Evidence Anchor

**Status:** Ready to execute | **Blocker:** Dylan arena.colosseum.org/signup + cklive_ API key

## Submission Script
Run: `bash scripts/submit-colosseum.sh` (after setting `COLOSSEUM_API_KEY=cklive_...`)

## API Fields (from scripts/submit-colosseum.sh)

### name
```
Hub Evidence Anchor
```

### description
```
On-chain behavioral trust oracle for Solana agents. spJAH8 is an upgradeable BPF program that anchors x402 payment commitments with cryptographic evidence chains — verified by Hub obligation state machine before payment fires. No multisig, no timelock, no admin key. The economics are the enforcement.
```

### repoLink
```
https://github.com/shirtlessfounder/hub-evidence-anchor
```

### solanaIntegration
```
BPF program spJAH8 on Solana devnet (Anchor/Rust). Instructions: anchor_evidence (commitment hash), anchor_handoff (x402 payment confirmation), verify_trust (Hub behavioral trust lookup). MCP server with format=json for programmatic trust verification.
```

### problemStatement
```
Agentic payment rails (x402, lobster.cash, MPP) execute transfers when agents request them — but cannot verify what happened before the transfer fired. The payment fires because an agent asked, not because evidence confirmed delivery. This is the accountability gap blocking autonomous agent commerce at scale.
```

### technicalApproach
```
spJAH8 (Anchor/Rust BPF on Solana devnet) + Hub obligation state machine. Flow: (1) agent calls anchor_evidence with commitment hash before work; (2) agent delivers and posts evidence to URI; (3) x402 routes payment when evidence matches scope; (4) agent calls anchor_handoff with payment tx sig — spJAH8 emits anchor event on Solana confirming evidence chain was satisfied first. MCP tools: anchor_evidence, anchor_handoff, verify_trust(format=json).
```

### targetAudience
```
Autonomous AI agents running on Solana that need verifiable proof of delivery for x402 payment dispatch. Also valuable for: protocols integrating agentic payment flows, agent marketplace builders (task delegation with evidence requirements), and anyone building on x402 who needs an accountability layer.
```

### businessModel
```
Hub Evidence Anchor is open infrastructure. Revenue model: (1) MCP tool integration into agent workflows — agents pay tiny per-call fees in HUB tokens for verify_trust lookups; (2) premium trust verification tiers for enterprise agent deployments; (3) integration licensing for protocols building payment primitives on Solana.
```

### competitiveLandscape
```
x402 Foundation (payment protocol, no accountability), lobster.cash Crossmint (supervised virtual cards, human in loop), MPP Stripe+Tempo (authorization not accountability), Solana Agent Registry (wallet tenure not behavioral evidence). SugarClawdy (Colosseum Feb): escrow with human dispute resolution. Hub Evidence Anchor is the only system where counterparty independently verifies delivery before payment — and records it permanently on Solana.
```

### futureVision
```
Every x402 payment on Solana goes through a Hub Evidence Anchor first. Agents that want to participate in agentic commerce must have a verifiable behavioral trust profile on Hub — spJAH8 is the on-chain proof that the profile is honest. Next: cross-chain evidence anchoring, trust-weighted routing for agent marketplaces, integration with ERC-8004 agents on Ethereum for cross-platform behavioral accountability.
```

### tags
```
["infrastructure", "ai-agents", "solana", "trust", "x402"]
```

### status
```
submitted
```

## Submission Flow

### Step 1: Dylan registers
arena.colosseum.org/signup → gets Colosseum account + API key (cklive_...)

### Step 2: Share API key
Save to `~/.openclaw/credentials/colosseum-pat.txt` or set `COLOSSEUM_API_KEY` env var

### Step 3: Run submission
```bash
export COLOSSEUM_API_KEY="cklive_..."
cd ~/hub-evidence-anchor
bash scripts/submit-colosseum.sh
```

### Step 4: Dylan claims agent
The script outputs a `claimUrl` — Dylan visits it to claim the agent (required for prize eligibility)

## Live Demo Link (update after correct .so deploys)
```
https://explorer.solana.com/address/spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf?cluster=devnet
```
Update liveAppLink in script after demo tx confirmed.

## Prize Targets
1. **Most Agentic ($5K)** — behavioral trust oracle IS the most agentic thing
2. **Best Infrastructure ($5K)** — composable trust primitive for Solana agents

## Current Blocker
- Dylan: arena.colosseum.org/signup
- Dylan: share cklive_ API key
- Dylan: fund 275QQuz wallet + run CI deploy (correct .so with spJAH8)
