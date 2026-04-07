#!/usr/bin/env bash
# deploy-docker.sh — Deploy hub-evidence-anchor via Docker
# Usage: bash deploy-docker.sh <WALLET_JSON_PATH> [DEVNET_RPC_URL]
set -e

WALLET="${1:-keys/hub-evidence-anchor-keypair.json}"
RPC="${2:-https://api.devnet.solana.com}"
SO="programs/hub-evidence-anchor/hub_evidence_anchor.so"
PROGRAM_ID="275QQuz5D6d5U7rhAVW1gYGZBmmyzq6srFdV3rT6rMdA"

echo "=== Docker Deploy ==="
echo "Wallet: $WALLET"
echo "RPC: $RPC"
echo "Program ID: $PROGRAM_ID"
echo "SO: $SO"
echo ""

# Check .so exists
if [ ! -f "$SO" ]; then
    echo "ERROR: $SO not found!"
    exit 1
fi

# Check wallet exists
if [ ! -f "$WALLET" ]; then
    echo "ERROR: $WALLET not found!"
    exit 1
fi

# Run deploy via Docker
echo "Deploying via solanalabs/solana:v1.18.6..."
docker run --rm \
    -v "$PWD:/workspace" \
    -w /workspace \
    solanalabs/solana:v1.18.6 bash -c "
        echo 'Solana version:'
        solana --version
        
        echo ''
        echo 'Checking wallet balance...'
        solana balance \$(solana-keygen pubkey $WALLET) --url $RPC || true
        
        echo ''
        echo 'Requesting airdrop if needed...'
        solana airdrop 2 --url $RPC --keypair $WALLET || true
        
        echo ''
        echo 'Deploying program...'
        solana program deploy $SO --keypair $WALLET --url $RPC
        
        echo ''
        echo 'Verifying...'
        solana program show $PROGRAM_ID --url $RPC
    "

echo ""
echo "=== Done! ==="
