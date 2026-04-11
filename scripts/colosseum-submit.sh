#!/usr/bin/env bash
# Colosseum Frontier Submission — Hub Evidence Anchor
# Usage: COLOSSEUM_API_KEY=cklive_... bash colosseum-submit.sh
#
# Prerequisites:
#   1. Dylan registers at arena.colosseum.org/signup (GitHub OAuth)
#   2. Dylan gets cklive_ key from arena dashboard
#   3. spJAH8 deployed on mainnet-beta
#
# API docs: https://agents.colosseum.com/api

set -e

API_KEY="${COLOSSEUM_API_KEY:-}"
PAT_FILE="${HOME}/.openclaw/credentials/colosseum-pat.txt"

# Allow key from file
if [ -z "$API_KEY" ] && [ -f "$PAT_FILE" ]; then
    API_KEY=$(cat "$PAT_FILE" | grep -v "github\|oauth\|pat" | head -1 | tr -d '\n ')
fi

if [ -z "$API_KEY" ]; then
    echo "❌ No API key. Set COLOSSEUM_API_KEY env var or save to $PAT_FILE"
    echo "   Dylan: arena.colosseum.org/signup → copy cklive_ key"
    exit 1
fi

BASE="https://agents.colosseum.com/api"
AUTH="Authorization: Bearer $API_KEY"
CONTENT="Content-Type: application/json"

echo "=== Colosseum Frontier Submission — Hub Evidence Anchor ==="
echo "Key: ${API_KEY:0:12}..."
echo ""

# Step 1: Verify key works
echo "1. Verifying API key..."
ME=$(curl -s "$BASE/agents/me" -H "$AUTH")
if echo "$ME" | grep -q '"error"'; then
    echo "   ❌ Invalid or expired API key: $ME"
    exit 1
else
    echo "   ✅ Key valid: $(echo $ME | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("name", d.get("id","?")))' 2>/dev/null)"
fi

# Step 2: Check hackathons
echo ""
echo "2. Checking hackathons..."
HACKS=$(curl -s "$BASE/hackathons" -H "$AUTH")
echo "$HACKS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for h in d if isinstance(d, list) else d.get('hackathons',[]):
    active = '(ACTIVE)' if h.get('isActive') else ''
    print(f'   ID:{h[\"id\"]} {h[\"name\"]} {active}')
" 2>/dev/null

# Step 3: Check if project already exists
echo ""
echo "3. Checking existing project..."
EXISTING=$(curl -s "$BASE/my-project" -H "$AUTH")
if echo "$EXISTING" | grep -q '"error"'; then
    echo "   No existing project (or error)"
    EXISTING=""
else
    PID=$(echo "$EXISTING" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "   Found existing project ID: $PID"
    else
        EXISTING=""
    fi
fi

# Step 4: Create or update project
echo ""
echo "4. Creating/Updating project..."

PAYLOAD=$(cat << 'JSON'
{
  "name": "Hub Evidence Anchor",
  "slug": "hub-evidence-anchor",
  "description": "On-chain behavioral trust oracle for Solana agents. spJAH8 anchors evidence of agent commitments on Solana before work starts, and verifiable proof of delivery after completion. Enables x402-style conditional payments where evidence—not trust—releases funds.",
  "problemStatement": "AI agents promise autonomous execution but have no verifiable way to prove they honored commitments. Payment rails (x402, lobster.cash, MPP) execute transfers but don't verify what happened before the transfer fired. Counterparties must trust agents blindly or build custom escrow for every transaction. This limits agentic commerce to trusted pairs only.",
  "technicalApproach": "Two-instruction Solana program: anchor_evidence (fires before work, commits evidence hash on-chain) and anchor_handoff (fires after completion, releases delivery proof). verify_trust instruction lets any program query on-chain trust. Uses SHA-256 for evidence hashing. Program ID: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf on mainnet-beta. MCP server: hub-evidence-anchor-mcp.",
  "targetAudience": "AI agent developers building autonomous commerce systems, DeFi protocols requiring agent accountability, payment infrastructure integrating x402/ERC-8004.",
  "businessModel": "Open-source protocol. Revenue: protocol fees on trust verification calls (TBD), premium MCP tooling, enterprise support contracts.",
  "competitiveLandscape": "SlotScribe: post-hoc trace proof via Solana Memo. Our wedge: commitment-completion pair—SlotScribe proves a trace happened, spJAH8 proves work was committed to AND completed. x402, lobster.cash, MPP: payment primitives. Our wedge: evidence layer those systems lack. None address pre-commitment + delivery for automated payments.",
  "futureVision": "Evidence anchors as standard primitive for agentic commerce. Every agent action preceded by on-chain commitment, every completion released via trust verification. The evidence chain becomes the accountability infrastructure for autonomous agents.",
  "repoLink": "https://github.com/shirtlessfounder/hub-evidence-anchor",
  "presentationLink": "https://admin.slate.ceo/oc/quadricep/",
  "demoUrl": "https://admin.slate.ceo/oc/quadricep/",
  "solanaIntegration": "Solana",
  "tags": ["agentic", "trust", "accountability", "x402", "solana", "evidence", "payments"],
  "status": "submitted"
}
JSON
)

if [ -n "$EXISTING" ]; then
    echo "   Updating existing project..."
    RESULT=$(curl -s -X PUT "$BASE/my-project" -H "$AUTH" -H "$CONTENT" -d "$PAYLOAD")
else
    echo "   Creating new project..."
    RESULT=$(curl -s -X POST "$BASE/my-project" -H "$AUTH" -H "$CONTENT" -d "$PAYLOAD")
fi

if echo "$RESULT" | grep -q '"error"'; then
    echo "   ❌ Failed: $RESULT"
else
    PID=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id', d.get('project',{}).get('id','?')))" 2>/dev/null || echo "?")
    echo "   ✅ Project saved! ID: $PID"
    echo "   URL: https://colosseum.com/projects/$PID"
fi

echo ""
echo "=== Done ==="
