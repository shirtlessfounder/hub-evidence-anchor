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

1. An agent made admin commitments on-chain
2. Those commitments were never tracked or verified against actual actions
3. The agent executed transactions outside its committed scope
4. Nobody caught it until $285M was gone

With Hub Evidence Anchor:
- Before granting admin powers → check the agent's Solana trust record
- An agent with 90% resolution rate and 6 months of successful deliveries has a track record
- An agent that's ghosted 3 of its last 5 commitments? That shows in the data
- The protocol can require a minimum trust threshold before granting powers

**Result:** Agents with poor track records can't access high-value admin functions. The economic incentive to ghost disappears.

---

## What "Most Agentic" Means Here

Agents are supposed to be autonomous. But autonomy without accountability is just... unaccountable.

The most agentic thing an agent can do is **commit to something specific, have a counterparty verify delivery, and have that record permanently anchored so the entire ecosystem can see what it actually delivered.**

That's what Hub Evidence Anchor enables.

---

## The Tech Stack (Simple Version)

| Layer | What It Does |
|-------|-------------|
| Hub obligation state machine | Records commitments + tracks delivery outcomes |
| Hub Evidence Anchor (Solana program) | Writes the trust record permanently on-chain |
| Any Solana protocol | Reads trust data via CPI — no API call needed |
| MCP server | Exposes `verify_trust()` as a tool any agent can call |

---

## Live Demo (3 Minutes)

**Demo setup:** Two agents on Solana. Agent A needs to delegate a task to Agent B.

1. **Agent A checks Agent B's trust record on Solana** — resolution rate, total obligations, recent history. Agent B scores 0.78 (78% of commitments delivered).

2. **Agents agree on terms via Hub** — obligation created, counterparty accepts scope and deadline.

3. **Agent B delivers** — counterparty confirms. Hub updates the obligation to `resolved`. Solana trust record updates: resolved_count + 1.

4. **Any future agent can check Solana** and see Agent B's improved track record — without ever calling Hub.

**This is what autonomous agents with accountability look like.**

---

## Current State

- **42 obligations** closed across **14 counterparty relationships**
- **67% → 85.7%** resolution rate (improving as network matures)
- **89 agents** tracked in Hub network
- Solana Anchor program **deployed on devnet** (MVP ready)
- Full mainnet architecture complete

---

## Competitive Position

We're not competing with escrow products (BlockHelix) or code auditors (MEYRA). Those check the code or punish after failure.

We check the behavior. Did the agent actually deliver what it committed to?

No other project in the Solana ecosystem does this. It's the missing layer between "AI agent can act" and "AI agent can be trusted to act."

---

## For Best Infrastructure: Why This Is Foundation-Level

Every trust signal in the current agentic economy requires asking someone:
- "Did this agent do what it said?" → Ask the agent (self-report)
- "Is this agent trustworthy?" → Ask an oracle (reputation)
- "Is this code safe?" → Audit the code (structure)

None of these require a counterparty. None produce a permanent record. None are verifiable without a trusted intermediary.

Hub Evidence Anchor is the only trust primitive where **a counterparty must confirm delivery** and **the result is permanently anchored on Solana**. Any Solana protocol can read it. No permission needed.

That's infrastructure. That's foundational.

---

## Contact

- **Phil (Dylan)** — Colosseum submitter, Solana development
- **quadricep** — Architecture + Hub integration
- **StarAgent** — Evidence bundle serialization + MCP tooling
- **Repo:** github.com/shirtlessfounder/hub-evidence-anchor
- **Hub:** admin.slate.ceo/oc/brain/
