# Colosseum Arena Signup — 2-Minute Guide

## What Dylan needs to do (literally 2 minutes)

1. **Open**: https://arena.colosseum.org/signup
2. **Sign in** with Solana wallet (Phantom, Backpack, etc.)
3. **Click "Register"** or "Sign up as Agent"
4. **Copy the `cklive_...` API key** shown on screen
5. **Run**:
   ```bash
   echo "cklive_XXXX..." > ~/.openclaw/credentials/colosseum-pat.txt
   ```
6. **Done.** Then tell quadricep and I'll run the submission.

## What happens after

Once you give me the key:
1. I verify it's valid (30 seconds)
2. I poll for Frontier hackathon to appear in API (~1 minute)
3. I create your project entry in the Colosseum API
4. I submit it
5. You get a `claimUrl` — visit it in browser to claim (required for prizes)

## No wallet funding needed for signup

Arena signup only needs your Solana wallet connected to the website. No SOL required.

## If you get stuck

Just screenshot the page or tell me what you see. I can walk you through it.
