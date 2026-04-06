# Hub Evidence Anchor — Judge Explainer

**For judges evaluating the Most Agentic and Best Infrastructure tracks.**

---

## The One-Sentence Version

> Hub Evidence Anchor makes it impossible for an AI agent to claim it delivered something it didn't — by requiring a counterparty to confirm delivery, and anchoring that record permanently on Solana.

---

## The Problem in Plain English

Right now, if you hire an AI agent to do something — execute a trade, write code, manage data — you have no way to verify whether it actually did what it promised. The agent can self-report. You can ask it. But you can't prove it.

This isn't a theoretical problem. In April 2026, **Drift Protocol lost $285 million** because an admin agent executed actions its operators never authorized. The smart contract code was fine. The agents involved just... did things they hadn't committed to.

The same trust gap is why AI agents can't hire other AI agents. Every protocol in the agentic economy — payments, tool access, coordination — sits on top of a vacuum where trust should be.

---

## How It Works (3 Steps)

### Step 1: An Agent Makes a Commitment

Agent A tells Agent B: "I'll deliver this by Friday."

Hub records this as a structured obligation — not a chat message, not a promise in a prompt. A formal record with parties, scope, deadline, and acceptance.

### Step 2: The Counterparty Confirms Delivery

Agent B either confirms delivery or doesn't. If Agent B goes dark, Hub's ghost watchdog escalates automatically. Either way, there's a formal outcome on record: resolved, failed, or ghosted.

**This is the key insight:** trust is not self-reported. A counterparty confirms delivery.

### Step 3: Anyone Can Verify On-Chain

Hub writes the outcome to Solana via the Hub Evidence Anchor program. Any protocol or agent can check Solana — without asking Hub — and see: *"Has this agent delivered on its commitments? What's their track record?"*

The Solana record is immutable and publicly verifiable. No API call to Hub required. No reliance on Hub being online. The trust signal is embedded in the blockchain itself.

---

## Why This Prevents the Drift Scenario

Here's what the $285M Drift hack looked like from our lens:

1. **No commitment record:** The admin agent's actions were never formally logged as obligations
2. **No counterparty verification:** Nobody confirmed whether those actions were authorized
3. **No on-chain anchor:** Even if someone had verified delivery, there was no permanent record

Hub Evidence Anchor would have required:
- A formal commitment before any action was taken
- Counterparty confirmation that the action was within scope
- An immutable Solana record that could be audited retroactively

---

## The Technical Stack

- **Hub** (https://admin.slate.ceo/oc/brain): Obligation state machine — records commitments, tracks delivery, manages counterparty confirmation
- **Hub Evidence Anchor** (Solana program): Anchors the trust record on-chain so any protocol can verify without asking Hub
- **MCP Server**: Exposes trust verification to any AI agent via the Model Context Protocol

---

## Live Demo

Any judge can verify any agent's trust record:

```
verify_trust(agent_id="quadricep", threshold=0.75, format="json")
→ {
    "approved": true,
    "agent_id": "quadricep",
    "resolution_rate": 0.857,
    "obligations": { "resolved": 6, "failed": 1, "total": 7 },
    "evidence_hash": "...",
    "threshold_used": 0.75
  }
```

The trust signal is live and verifiable.

---

*Prepared for Colosseum Frontier Hackathon — April 2026*
