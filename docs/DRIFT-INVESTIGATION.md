# The $285M Drift Protocol Hack — Commitment-Scoping Failure, Not Code Exploit

**Source:** The Hacker News (April 6, 2026), CoinDesk, InfoSec Today, Somuchinfo
**Attribution confidence:** Medium — UNC4736 (DPRK), aka AppleJeus, Citrine Sleet, Golden Chollima, Gleaming Pisces
**Status:** This is the defining real-world case study for Hub Evidence Anchor.

---

## What Happened

On April 1, 2026, Drift Protocol lost **$285 million** in a single exploit. The smart contracts worked correctly. The attack was not a code exploit — it was a **six-month structured intelligence operation**.

### Attribution

Attributed with **medium confidence** to **UNC4736**, a North Korean state-sponsored hacking group tracked under multiple aliases:

| Alias | Notes |
|-------|-------|
| **AppleJeus** | Best known for 3CX supply chain breach (2023), $53M Radiant Capital hack (Oct 2024) |
| **Citrine Sleet** | Primary DeFi targeting unit |
| **Golden Chollima** | Offshoot of Labyrinth Chollima; cryptocurrency theft since at least 2018 |
| **Gleaming Pisces** | Operational alias |
| **Labyrinth Chollima** | DPRK's primary financial crime unit |

**Evidence for attribution:**
- On-chain fund flows trace back to the Radiant Capital attackers (Oct 2024)
- Operational overlap: personas deployed across the campaign match known DPRK-linked activity signatures
- Modus operandi consistent with Crowdstrike's January 2026 assessment of Golden Chollima's conference-based infiltration tactics

---

## How the Attack Worked

### Phase 1: Relationship Building (Fall 2025 — ~6 months)

- Individuals posing as a **quantitative trading company** approached Drift contributors at major international crypto conferences
- "The individuals who appeared in person were not North Korean nationals" — DPRK deployed third-party intermediaries for face-to-face trust-building
- Built rapport over **6 months** across multiple countries and conferences
- Operatives were "technically fluent, had verifiable professional backgrounds, and were familiar with how Drift operated"

### Phase 2: Operational Entrenchment (December 2025 — January 2026)

- Onboarded an **Ecosystem Vault** on Drift (requires a formal application process)
- Asked "detailed and informed product questions" to multiple contributors
- **Deposited $1M+ of their own funds** to establish operational credibility inside the Drift ecosystem
- Integration conversations continued through February and March

### Phase 3: Exploitation (April 1, 2026)

- Exploited VS Code `tasks.json` configuration and Apple TestFlight wallet compromise
- Extracted $285M in 12 minutes
- On-chain flows traced to Radiant Capital attacker wallets

---

## Why This Matters for Hub Evidence Anchor

**The smart contracts worked. The trust layer failed.**

This is a **commitment-scoping failure** at the human-agent level:

1. Operatives made commitments (vault integration, deposit, trading strategy) over months
2. Those commitments were never independently tracked or verified against actual behavior
3. The protocol had no behavioral evidence chain — no way to ask "has this counterparty delivered on what they committed to?"
4. The $1M deposit was treated as a trust signal, not as an operational commitment subject to verification

**What Hub Evidence Anchor would have changed:**

- Before granting Ecosystem Vault access → check Solana trust record via `verify_trust()`
- An agent that has ghosted 3 of its last 5 obligations has a visible behavioral record
- The protocol can require a minimum resolution rate threshold before onboarding
- The 6-month relationship-building becomes irrelevant if the behavioral evidence chain shows pattern anomalies

**The $1M deposit was not a trust signal — it was a commitment. Hub verifies whether commitments were delivered, not whether the counterparty appeared credible.**

---

## Key Quote

> "The basis for this connection is both on-chain (fund flows used to stage and test this operation trace back to the Radiant attackers) and operational (personas deployed across this campaign have identifiable overlaps with known DPRK-linked activity)."

— Drift Protocol, Sunday analysis (April 5, 2026)

---

## Broader Context

- **ByBit hack (2025):** $1.4B+ — largest crypto hack ever at the time
- **Radiant Capital (Oct 2024):** $53M — same threat actor cluster
- **3CX supply chain (2023):** DPRK's previous highest-profile financial supply chain attack
- **Solana Foundation President Lily Liu (April 2026):** "Smart contracts held up. The real targets now are humans."

**Hub Evidence Anchor's position:** Every protocol that grants admin powers to off-chain agents needs a behavioral trust record. The Drift scenario becomes structurally impossible when every vault onboarding requires a verified resolution rate on-chain.

---

## Sources

- [The Hacker News — $285 Million Drift Hack Traced to Six-Month DPRK Social Engineering Operation](https://thehackernews.com/2026/04/285-million-drift-hack-traced-to-six.html) (April 6, 2026)
- [CoinDesk — Drift Says $270M Exploit Was a Six-Month North Korean Intelligence Operation](https://www.coindesk.com/markets/2026/04/05/drift-says-usd270-million-exploit-was-a-six-month-north-korean-intelligence-operation) (April 5, 2026)
- [CrowdStrike — DPRK Operatives Impersonate (January 2026)](https://thehackernews.com/2026/02/dprk-operatives-impersonate.html)
