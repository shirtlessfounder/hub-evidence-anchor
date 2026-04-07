#!/usr/bin/env python3
"""Decode GitHub Actions base64-encoded deploy wallet keypair and print pubkey."""
import base64, os, subprocess

json_str = os.environ.get('ANCHOR_WALLET_JSON', '').strip()
if not json_str:
    try:
        with open('/tmp/encoded_b58.txt') as f:
            json_str = f.read().strip()
    except FileNotFoundError:
        pass

keypair_bytes = base64.b64decode(json_str)
os.makedirs('target/deploy', exist_ok=True)
with open('target/deploy/hub_evidence_anchor-keypair.json', 'wb') as f:
    f.write(keypair_bytes)
print(f'Keypair saved: {len(keypair_bytes)} bytes')

# Derive pubkey from last 32 bytes
pubkey_bytes = keypair_bytes[-32:]
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
def b58encode(data):
    n = int.from_bytes(data, 'big')
    result = ''
    while n > 0:
        n, rem = divmod(n, 58)
        result = ALPHABET[rem] + result
    return result or '1'
addr = b58encode(pubkey_bytes)
print(f'Deploy wallet pubkey: {addr}')

# Verify with Solana CLI
solana_bin = os.environ.get('SOLANA_BIN', '/tmp/solana-release/bin/solana')
kp_path = 'target/deploy/hub_evidence_anchor-keypair.json'
if os.path.exists(solana_bin) and os.path.exists(kp_path):
    r = subprocess.run([solana_bin, 'address', '--keypair', kp_path],
                       capture_output=True, text=True, timeout=10)
    if r.returncode == 0:
        print(f'Solana CLI confirms: {r.stdout.strip()}')
    else:
        print(f'CLI check: {r.stderr.strip() or "unknown error"}')
