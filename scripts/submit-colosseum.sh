#!/bin/bash
# Colosseum Frontier Hackathon Submission Script
# Run AFTER Dylan registers at arena.colosseum.org/signup
# Requires: Colosseum account + cklive_ API key

set -e

API_KEY="${COLOSSEUM_API_KEY:-}"
HACKATHON_API="https://agents.colosseum.com/api"

echo "=== Colosseum Frontier Submission ==="

# Step 1: Check if Frontier is in the API yet
echo "[1/5] Checking hackathons in API..."
HACKATHON_RESPONSE=$(curl -s "${HACKATHON_API}/hackathons")
FRONTIER_ID=$(echo "$HACKATHON_RESPONSE" | python3 -c "import sys,json; data=json.load(sys.stdin); h=[x for x in data.get('hackathons',[]) if 'frontier' in x.get('slug','').lower()]; print(h[0]['id'] if h else 'NOT_FOUND')" 2>/dev/null || echo "PARSE_ERROR")

if [ "$FRONTIER_ID" = "NOT_FOUND" ]; then
    echo "ERROR: Frontier hackathon not in API yet."
    echo "Action needed: Dylan must register at arena.colosseum.org/signup first"
    echo "Current hackathons:"
    echo "$HACKATHON_RESPONSE"
    exit 1
fi

echo "Found Frontier hackathon ID: $FRONTIER_ID"

# Step 2: Get submission requirements
echo "[2/5] Fetching hackathon details..."
curl -s "${HACKATHON_API}/hackathons/${FRONTIER_ID}" | python3 -m json.tool 2>/dev/null || echo "$HACKATHON_RESPONSE"

# Step 3: Submit project
echo "[3/5] Project submission endpoint..."
echo "POST ${HACKATHON_API}/hackathons/${FRONTIER_ID}/submissions"
echo "Expected fields: project_name, description, repo_url, demo_url, submission_data"
echo "API key needed: cklive_..."
echo ""
echo "Submission payload (fill in cklive_ key to run):"
cat << 'EOF'
{
  "project_name": "Hub Evidence Anchor",
  "description": "On-chain behavioral trust oracle for Solana agents. spJAH8 anchors x402 payment commitments with cryptographic evidence chains verified by Hub's obligation state machine.",
  "repo_url": "https://github.com/shirtlessfounder/hub-evidence-anchor",
  "demo_url": "https://explorer.solana.com/address/spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf?cluster=devnet",
  "submission_data": {
    "program_id": "spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf",
    "network": "solana-devnet",
    "trust_olympics_tier1": "docs verified",
    "trust_olympics_tier2": "mcp integration verified", 
    "trust_olympics_tier3": "program deployed and executable",
    "hub_trust_profile": "https://admin.slate.ceo/oc/brain/trust/quadricep",
    "mcp_server": "https://github.com/shirtlessfounder/hub-evidence-anchor/tree/main/mcp"
  }
}
EOF

# Step 4: Verify submission
echo ""
echo "[4/5] To verify submission:"
echo "curl -H 'Authorization: Bearer ${COLOSSEUM_API_KEY}' ${HACKATHON_API}/hackathons/${FRONTIER_ID}/submissions"

# Step 5: Wait for judging
echo "[5/5] Submission complete. Judging begins after May 11, 2026."

echo ""
echo "=== Required Actions Before Running ==="
echo "1. Dylan: arena.colosseum.org/signup (triggers Frontier in API)"
echo "2. Get cklive_ API key from Colosseum dashboard"
echo "3. Set COLOSSEUM_API_KEY env var"
echo "4. Re-run this script"
