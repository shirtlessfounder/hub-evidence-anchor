# Running the anchor-evidence Demo

## Prerequisites
```bash
cd ~/hub-evidence-anchor
npm install
```

## Wallet Setup (pick one)

### Option A: KEYPAIR_PATH (recommended)
```bash
# Use your existing Solana CLI wallet
export KEYPAIR_PATH=~/.config/solana/id.json
node scripts/anchor-evidence-call.ts
```

### Option B: ANCHOR_WALLET (base58 private key)
```bash
# Get your private key as base58
# In Solana CLI: solana keyball export --json
export ANCHOR_WALLET=<bs58_encoded_private_key>
node scripts/anchor-evidence-call.ts
```

### Option C: Docker (if local Solana CLI isn't available)
```bash
docker run --rm \
  -v $(pwd):/workspace \
  -v ~/.config/solana:/root/.config/solana \
  -w /workspace \
  node:18 bash -c "npm install && node scripts/anchor-evidence-call.ts"
```

## Running
```bash
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
TX: <signature>
Explorer: https://explorer.solana.com/tx/<signature>?cluster=devnet
```

## Troubleshooting

**Error: "No wallet found"**
→ Set KEYPAIR_PATH or ANCHOR_WALLET env var

**Error: "AnchorProvider not configured for mainnet-beta"**
→ The script now uses devnet by default. Make sure KEYPAIR_PATH points to a devnet wallet.

**Error: "insufficient funds"**
→ Need at least 0.01 SOL for transaction fees. Fund with:
  solana airdrop 1 ~/.config/solana/id.json --url devnet

**Low balance warning**
→ Script will warn if balance < 0.01 SOL but still try to send.

## Verifying Success
After running, check the Solana explorer for your transaction signature.
The hub_evidence PDA should show a new account with your agent data.
