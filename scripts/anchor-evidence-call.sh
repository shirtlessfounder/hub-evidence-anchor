#!/bin/bash
# anchor_evidence call — Trust Olympics Tier 3
# First ever call to spJAH8 on Solana devnet
#
# Prerequisites:
#   - Anchor CLI installed (npm install -g @coral-xyz/anchor-cli)
#   - ANCHOR_WALLET_JSON=~/.config/solana/id.json
#   - SOLANA_RPC=https://api.devnet.solana.com
#   - Df8vfRCa funded with >= 0.5 SOL
#
# Usage: ./anchor-evidence-call.sh

set -e

WALLET="${ANCHOR_WALLET_JSON:-$HOME/.config/solana/id.json}"
RPC="${SOLANA_RPC:-https://api.devnet.solana.com}"
PROGRAM="spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf"
PDA=$(solana address -k "$WALLET" 2>/dev/null || echo "")

echo "=== anchor_evidence call — Trust Olympics Tier 3 ==="
echo "Program: $PROGRAM"
echo "Wallet:  $(cat "$WALLET" | python3 -c 'import json,sys; k=json.load(sys.stdin); from nacl.signing import SigningKey; sk=SigningKey(bytes(k)); print(sk.verify_key.encode().hex()[:8]+"...")' 2>/dev/null || echo "(loading from keypair)")"

# Check balance
BALANCE=$(curl -s -X POST "$RPC" -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getBalance\",\"params\":[\"$(solana-keygen pubkey $WALLET 2>/dev/null)\"]}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('value',0)/1e9)")

echo "Balance: ${BALANCE} SOL"
if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
  echo "ERROR: Need >= 0.5 SOL, have ${BALANCE} SOL"
  echo "Ask Dylan: solana transfer <pubkey> 0.5 --url devnet"
  exit 1
fi

# Compute evidence hash (SHA-256 of evidence JSON)
EVIDENCE_JSON='{"agent":"quadricep","obligation_count":11,"resolved_count":6,"failed_count":2,"resolution_rate":0.545,"claim":"Trust Olympics Tier 3"}'
EVIDENCE_HASH=$(echo -n "$EVIDENCE_JSON" | sha256sum | cut -d' ' -f1)
echo "Evidence hash: $EVIDENCE_HASH"

# Build the instruction using anchor program call
# anchor program call <program_id> <instruction> <args...>
echo ""
echo "Calling anchor_evidence..."
anchor program call "$PROGRAM" anchor_evidence \
  --arbitrary \
  --idls <(echo '[
    {
      "name": "anchorEvidence",
      "accounts": [{"name": "hubEvidence"},{"name": "authority"},{"name": "systemProgram"}],
      "args": [
        {"name": "agentId","type":"string"},
        {"name": "obligationCount","type":"u32"},
        {"name": "resolvedCount","type":"u32"},
        {"name": "failedCount","type":"u32"},
        {"name": "evidenceHash","type":"string"}
      ]
    }
  ]') \
  --provider.cluster devnet \
  --provider.wallet "$WALLET" \
  -- \
  "quadricep" 11 6 2 "$EVIDENCE_HASH"

echo ""
echo "✅ anchor_evidence call complete!"
echo "Verify: solana account <PDA> --url devnet"
