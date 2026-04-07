#!/usr/bin/env python3
"""Decode base58-encoded Solana keypair from stdin, write binary to stdout."""
import sys
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
def b58decode(s):
    n = 0
    for c in s.strip():
        n = n * 58 + ALPHABET.index(c)
    result = []
    while n > 0:
        result.insert(0, n & 255)
        n >>= 8
    return bytes(result)
if __name__ == '__main__':
    encoded = sys.stdin.read().strip()
    keypair_bytes = b58decode(encoded)
    sys.stdout.buffer.write(keypair_bytes)
