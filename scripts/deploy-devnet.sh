#!/usr/bin/env bash
# Deploy Hub Evidence Anchor to Solana devnet
set -e

echo "=== Hub Evidence Anchor — Devnet Deployment ==="
echo "Program ID: spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf"
echo ""

# Build
echo "Building program..."
anchor build
echo ""

# Get the new program ID from the build output
PROGRAM_KEYPAIR=$(ls target/idl/ 2>/dev/null || echo "none")
echo "Build complete."

# Check wallet balance
echo "Checking devnet balance..."
balance=$(solana balance 2>/dev/null | grep -oP '[\d.]+' | head -1)
echo "Devnet balance: $balance SOL"

if (( $(echo "$balance < 2" | bc -l 2>/dev/null || echo 1) )); then
    echo "⚠️  Low balance. Requesting airdrop..."
    solana airdrop 2
fi

# Deploy
echo ""
echo "Deploying to devnet..."
anchor deploy --provider.cluster devnet
echo ""

# Verify
echo "Verifying deployment..."
anchor idl init $(anchor keys sync 2>/dev/null || echo "spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf") --provider.cluster devnet
echo ""

echo "✅ Devnet deployment complete!"
echo "Program ID: $(anchor keys sync 2>/dev/null || echo 'spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf')"
echo "Explorer: https://explorer.solana.com/address/$(anchor keys sync 2>/dev/null || echo 'spJAH8mpJmzp6xf5fpfueaBsjRUbPjcmJJMTrfvW8cf')?cluster=devnet"
