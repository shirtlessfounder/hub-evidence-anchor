# Colosseum Frontier Submission Checklist

**For Dylan** | Last updated: 2026-04-08 21:00 UTC

---

## Pre-Submission Checklist

### 1. Demo Transaction (HIGHEST PRIORITY)
- [ ] Run: `cd ~/hub-evidence-anchor && git checkout feat/demo`
- [ ] Run: `export KEYPAIR_PATH=~/.config/solana/id.json`
- [ ] Run: `node scripts/anchor-evidence-call.ts`
- [ ] Save TX signature from output
- [ ] Verify on explorer: `https://explorer.solana.com/tx/<sig>?cluster=devnet`
- [ ] Note TX in Colosseum submission

### 2. GitHub Actions: Deploy Correct Program
- [ ] Fund wallet: `solana airdrop 5 275QQuz5D6d5U7rhAVW1gYGZBmmyzq6srFdV3rT6rMdA --url devnet` (repeat until > 2 SOL)
- [ ] GitHub → Actions → "Deploy Pre-built .so" → Run workflow
- [ ] Verify: `solana program show spJAH8... --url devnet` → Data Length = 256064 bytes ✅

### 3. Merge Demo Branch
- [ ] `git checkout main && git merge feat/demo`
- [ ] Resolve any conflicts
- [ ] Push to origin/main

### 4. Colosseum Registration
- [ ] Visit: https://arena.colosseum.org/signup
- [ ] Register with Solana wallet
- [ ] Get `cklive_...` API key from dashboard
- [ ] Save to: `~/.openclaw/credentials/colosseum-pat.txt`
- [ ] Verify: `curl -s "https://agents.colosseum.com/api/agents/me" -H "Authorization: Bearer $(cat ~/.openclaw/credentials/colosseum-pat.txt)"`

### 5. Forum Post (Pre-Submission)
- [ ] Copy content from `docs/COLOSSEUM-FORUM-POST-v1.1.md`
- [ ] Paste to: https://forum.colosseum.org
- [ ] Add: live demo TX link from step 1
- [ ] Tag: @philkok (judge)

### 6. Submit to Colosseum
- [ ] `export COLOSSEUM_API_KEY=cklive_...`
- [ ] `cd ~/hub-evidence-anchor && bash scripts/submit-colosseum.sh`
- [ ] Verify submission at: https://arena.colosseum.org

### 7. Claim Agent (Required for Prizes)
- [ ] Submission script outputs `claimUrl`
- [ ] Visit `claimUrl` in browser
- [ ] Complete human claim verification

---

## Submission Fields

```json
{
  "name": "Hub Evidence Anchor",
  "description": "On-chain behavioral trust oracle for Solana agents. spJAH8 anchors x402 payment commitments with cryptographic evidence chains.",
  "repoLink": "https://github.com/shirtlessfounder/hub-evidence-anchor",
  "solanaIntegration": "BPF program spJAH8 on Solana devnet. Instructions: anchor_evidence, anchor_handoff, verify_trust.",
  "problemStatement": "Agentic payment rails execute transfers when agents ask — but cannot verify what happened before the transfer fired.",
  "technicalApproach": "spJAH8 (Anchor/Rust on Solana devnet) + Hub obligation state machine. Flow: anchor_evidence → evidence posted → x402 routes payment → anchor_handoff confirms.",
  "targetAudience": "Autonomous AI agents on Solana that need verifiable proof of delivery for x402 payment dispatch.",
  "businessModel": "Open infrastructure. Revenue: MCP tool integration fees in HUB tokens + premium verification tiers.",
  "competitiveLandscape": "x402/lobster.cash/MPP = payment rails, no accountability. Hub Evidence Anchor = accountability layer.",
  "futureVision": "Every x402 payment on Solana goes through Hub Evidence Anchor first.",
  "tags": ["infrastructure", "ai-agents", "solana", "trust", "x402"],
  "status": "submitted"
}
```

---

## Demo Script Command (Copy-Paste)

```bash
cd ~/hub-evidence-anchor
git checkout feat/demo
export KEYPAIR_PATH=~/.config/solana/id.json
node scripts/anchor-evidence-call.ts
```

Expected output:
```
Authority: Df8vfRCaEKEZVtp5c8qmHMtnZpP1GXXVEwNayKcoW7ox
Program: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf
Balance: 0.117 SOL
hub_evidence PDA: FNmuQ4N5nAWs5hXqEQcJbjxiLDCEz19E2VhA5VbBvXf4
Sending anchor_evidence transaction...
TX: <save this>
Explorer: https://explorer.solana.com/tx/<TX>?cluster=devnet
```

---

## Prize Targets

| Prize | Amount | Priority |
|---|---|---|
| Most Agentic | $5K | ⭐⭐⭐ HIGH |
| Best Infrastructure | $5K | ⭐⭐⭐ HIGH |
| Grand Champion | $30K | ⭐ MEDIUM |
| Superteam Earn: x402 | TBD | ⭐⭐ MEDIUM |

---

## Key Competitors (from Forum Research)

| Project | What they do | Our angle |
|---|---|---|
| TOWEL | Bilateral git repos + trust | We work without pre-existing relationships |
| ClawVer | WASM sandbox + x402 | We verify commitments, not just execution quality |
| Proof of Work | Every action logged | We prove delivery, not just activity |
| SugarClawdy | Escrow with human dispute | No human in our critical path |

---

## Deadline

**May 11, 2026** — 33 days left

