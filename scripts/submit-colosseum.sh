#!/bin/bash
# Colosseum Frontier Hackathon Submission Script v2
# API reference: https://colosseum.com/skill.md (colosseum-agent-hackathon v1.8.0)
# 
# BEFORE FIRST RUN:
#   1. Dylan registers at arena.colosseum.org/signup
#   2. Dylan gives you the cklive_ API key
#   3. Set: export COLOSSEUM_API_KEY="cklive_..."
#
# Registration (if not yet registered as Colosseum agent):
#   curl -X POST https://agents.colosseum.com/api/agents \
#     -H "Content-Type: application/json" \
#     -d '{"name": "quadricep"}'
#   Save the apiKey — shown exactly once.

set -e

API_KEY="${COLOSSEUM_API_KEY:-}"
BASE="https://agents.colosseum.com/api"

if [ -z "$API_KEY" ]; then
    echo "ERROR: COLOSSEUM_API_KEY not set."
    echo "Get your key from the Colosseum dashboard after registering at arena.colosseum.org/signup"
    exit 1
fi

AUTH_HEADER="Authorization: Bearer $API_KEY"

echo "=== Colosseum Frontier Submission ==="

# Step 1: Check agent status
echo "[1/6] Agent status..."
STATUS=$(curl -s "${BASE}/agents/status")
echo "$STATUS" | python3 -m json.tool 2>/dev/null | head -20
CLAIM_URL=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('claimUrl',''))" 2>/dev/null)
if [ -n "$CLAIM_URL" ]; then
    echo "Claim URL (send to Dylan): $CLAIM_URL"
fi

# Step 2: Check if Frontier is in the API yet (poll with timeout)
echo ""
echo "[2/6] Checking hackathons in API..."
FRONTIER_ID=""
for i in 1 2 3 4 5 6; do
    HACKS=$(curl -s "${BASE}/hackathons")
    FRONTIER_ID=$(echo "$HACKS" | python3 -c "
import sys,json
data=json.load(sys.stdin)
slugs = ['frontier', 'colosseum-frontier', 'colosseum/frontier']
hacks = data.get('hackathons',[])
for slug in slugs:
    matches = [x for x in hacks if slug in x.get('slug','').lower() or slug in x.get('name','').lower()]
    if matches:
        print(matches[0]['id'])
        break
else:
    print('NOT_FOUND')
" 2>/dev/null)
    if [ "$FRONTIER_ID" != "NOT_FOUND" ]; then
        echo "Found Frontier hackathon ID: $FRONTIER_ID"
        break
    fi
    if [ $i -lt 6 ]; then
        echo "Frontier not visible yet (attempt $i/6) — waiting 10s..."
        sleep 10
    fi
done

if [ "$FRONTIER_ID" = "NOT_FOUND" ]; then
    echo "ERROR: Frontier hackathon not in API after 60s."
    echo "This means Dylan hasn't completed arena.colosseum.org/signup yet."
    echo "Current hackathons visible:"
    echo "$HACKS" | python3 -m json.tool 2>/dev/null | head -30
    echo ""
    echo "Action: Dylan must register at arena.colosseum.org/signup first."
    exit 1
fi

# Step 3: Get current project or create new
echo ""
echo "[3/6] Checking existing project..."
PROJECT=$(curl -s "${BASE}/my-project" -H "$AUTH_HEADER")
PROJECT_ID=$(echo "$PROJECT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "No project found. Creating new project..."
    CREATE_RESP=$(curl -s -X POST "${BASE}/my-project" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"Hub Evidence Anchor\",
            \"hackathonId\": ${FRONTIER_ID},
            \"description\": \"On-chain behavioral trust oracle for Solana agents. spJAH8 anchors x402 payment commitments with cryptographic evidence chains — 37 Hub obligations, 88.9% resolution rate, 215 HUB earned.\",
            \"repoLink\": \"https://github.com/shirtlessfounder/hub-evidence-anchor\",
            \"presentationLink\": \"https://admin.slate.ceo/oc/quadricep/\",
            \"solanaIntegration\": \"BPF program on Solana devnet (spJAH8) using Anchor; x402 micropayment integration; Hub obligation state machine for behavioral trust verification\",
            \"tags\": [\"infrastructure\", \"ai-agents\", \"solana\", \"trust\", \"x402\"]
        }")
    echo "$CREATE_RESP" | python3 -m json.tool 2>/dev/null
    PROJECT_ID=$(echo "$CREATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
    echo "Created project ID: $PROJECT_ID"
else
    echo "Existing project ID: $PROJECT_ID"
fi

# Step 4: Update with full submission fields (Feb-style — Frontier likely same schema)
echo ""
echo "[4/6] Updating project with full submission fields..."
UPDATE_RESP=$(curl -s -X PUT "${BASE}/my-project" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
        \"hackathonId\": ${FRONTIER_ID},
        \"name\": \"Hub Evidence Anchor\",
        \"description\": \"On-chain behavioral trust oracle for Solana agents. spJAH8 anchors x402 payment commitments with cryptographic evidence chains — 37 Hub obligations, 88.9% resolution rate, 215 HUB earned. No multisig, no timelock, no admin key. The economics are the enforcement.\",
        \"repoLink\": \"https://github.com/shirtlessfounder/hub-evidence-anchor\",
        \"presentationLink\": \"https://admin.slate.ceo/oc/quadricep/\",
        \"solanaIntegration\": \"BPF program spJAH8 on Solana devnet (Anchor/Rust). Instructions: anchor_evidence (commitment hash), anchor_handoff (x402 payment confirmation), verify_trust (Hub behavioral trust lookup). MCP server with format=json for programmatic trust verification.\",
        \"problemStatement\": \"Agentic payment rails (x402, lobster.cash, MPP) execute transfers when agents request them — but cannot verify what happened before the transfer fired. The payment fires because an agent asked, not because evidence confirmed delivery. This is the accountability gap blocking autonomous agent commerce at scale.\",
        \"technicalApproach\": \"spJAH8 (Anchor/Rust BPF on Solana devnet) + Hub obligation state machine. Flow: (1) agent calls anchor_evidence with commitment hash before work; (2) agent delivers and posts evidence to URI; (3) x402 routes payment when evidence matches scope; (4) agent calls anchor_handoff with payment tx sig — spJAH8 emits anchor event on Solana confirming evidence chain was satisfied first. MCP tools: anchor_evidence, anchor_handoff, verify_trust(format=json).\",
        \"targetAudience\": \"Autonomous AI agents running on Solana that need verifiable proof of delivery for x402 payment dispatch. Also valuable for: protocols integrating agentic payment flows, agent marketplace builders (task delegation with evidence requirements), and anyone building on x402 who needs an accountability layer.\",
        \"businessModel\": \"Hub Evidence Anchor is open infrastructure. Traction: 37 obligations, 88.9% resolution rate, 215 HUB earned. Team: Dylan (founder, Solana/DeFi) + quadricep (agent). Revenue: MCP per-call fees (HUB tokens), enterprise trust tiers, protocol licensing (x402, ERC-8004, lobster.cash). Path to: on-chain HUB token settlements from obligation completion.\",
        \"competitiveLandscape\": \"Every competitor verifies something that happened. Hub Evidence Anchor verifies what was promised AND whether it delivered. Specific landscape: ERC-8004 (live on mainnet Jan 2026, MetaMask/Google/Coinbase — feedback not commitment); TrustBench (pre-execution gate, not post-execution evidence); MCP-I L3 (behavioral anomaly detection spec, Hub is the implementation); Mastercard Verifiable Intent (authorization not behavioral accountability); Microsoft AGT (runtime policy enforcement not evidence chain); MEYRA (contract safety not behavioral delivery); Know Your Agent (wallet tenure not obligation completion); Solana Agent Registry (reputation not commitment). The Trust Olympics behavioral trust scoring (async settlement queue confirmed live, TX 4sv3fR2...) is the only system where counterparty independently verifies delivery before payment — and records it permanently on Solana.\",
        \"futureVision\": \"Every x402 payment on Solana goes through a Hub Evidence Anchor first. The Trust Olympics behavioral trust infrastructure validates the model: agents with high EWMA role trust scores are routed for reviewer tasks, and obligations resolve into on-chain HUB token settlements. spJAH8 is the on-chain proof layer for this model. Next: cross-chain evidence anchoring (Hub behavioral trust → Ethereum ERC-8004 agents), trust-weighted routing for Colosseum judge selection, integration with MCP-I L3 as behavioral evidence oracle.\"
    }")

if echo "$UPDATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('id') else 'error')" 2>/dev/null | grep -q ok; then
    echo "Project updated successfully ✅"
else
    echo "Update response:"
    echo "$UPDATE_RESP" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESP"
fi

# Step 5: Submit project (mark as complete — use dedicated submit endpoint)
echo ""
echo "[5/6] Submitting project..."
SUBMIT_RESP=$(curl -s -X POST "${BASE}/my-project/submit" \
    -H "$AUTH_HEADER")

if echo "$SUBMIT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('submitted' if d.get('status')=='submitted' else 'not_submitted')" 2>/dev/null | grep -q submitted; then
    echo "Project SUBMITTED ✅"
else
    echo "Submit response:"
    echo "$SUBMIT_RESP" | python3 -m json.tool 2>/dev/null || echo "$SUBMIT_RESP"
fi

# Step 6: Verify
echo ""
echo "[6/6] Final project state:"
curl -s "${BASE}/my-project" -H "$AUTH_HEADER" | python3 -m json.tool 2>/dev/null

echo ""
echo "=== Submission Complete ==="
echo "Judging begins after May 11, 2026."
echo "Live program: https://explorer.solana.com/address/spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf?cluster=devnet"
echo "Hub trust profile: https://admin.slate.ceo/oc/brain/trust/quadricep"
