#!/usr/bin/env python3
"""Decode Solana wallet secret (base58, JSON array, or base64) → /tmp/wallet.json + /tmp/program-pubkey.txt"""
import os, base64, json, sys

ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

def b58decode(s):
    n = 0
    for c in s.strip():
        n = n * 58 + ALPHABET.index(c)
    return n.to_bytes(64, 'big')

secret = os.environ.get('WALLET_JSON', '').strip()
if not secret:
    raise Exception('WALLET_JSON env var is empty!')

raw = None
if secret.startswith('['):
    raw = bytes(json.loads(secret))
elif len(secret) == 88:
    raw = b58decode(secret)
else:
    decoded = base64.b64decode(secret)
    try:
        raw = bytes(json.loads(decoded))
    except:
        raw = decoded

if not raw or len(raw) != 64:
    raise Exception(f'Bad wallet: got {len(raw) if raw else 0} bytes, need 64')

# Write JSON array (solana-keygen format)
with open('/tmp/wallet.json', 'w') as f:
    json.dump([int(b) for b in raw], f)

# Derive and write pubkey
pubkey_bytes = raw[32:]
n = int.from_bytes(pubkey_bytes, 'big')
addr = ''
while n > 0:
    n, rem = divmod(n, 58)
    addr = ALPHABET[rem] + addr

print(f'Wallet pubkey: {addr}')
with open('/tmp/program-pubkey.txt', 'w') as f:
    f.write(addr + '\n')
