#!/bin/bash
# Cargo wrapper: forces +1.85 for metadata, delegates everything else to cargo +solana
if [[ "$*" == *"metadata"* ]]; then
    exec /opt/cargo/bin/cargo +1.85 "$@"
else
    exec /opt/cargo/bin/cargo +solana "$@"
fi
