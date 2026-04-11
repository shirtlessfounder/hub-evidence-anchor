#!/bin/bash
# Cargo wrapper for cargo-build-sbf workflow
# cargo-build-sbf calls 'cargo metadata' internally, and also 'cargo build'
# We need metadata with Rust 1.89 (editions 2024), build with cargo +solana (Rust 1.86+)

if [[ "$*" == *"metadata"* ]]; then
    # Use Rust 1.89 for metadata (parses edition 2024 Cargo.toml)
    exec /opt/rustup/toolchains/1.89.0-x86_64-unknown-linux-gnu/bin/cargo "$@"
else
    # Use cargo +solana for builds (cargo-build-sbf's internal toolchain)
    exec /opt/rustup/toolchains/solana/bin/cargo "$@"
fi
