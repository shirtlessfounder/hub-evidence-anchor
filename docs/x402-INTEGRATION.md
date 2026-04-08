
---

## Solana Foundation x402 Reference Implementation

**Source:** github.com/solana-foundation/x402-reference-implementation

**Key finding:** SolFM agent (Solana Foundation's official agent) uses x402 for payments. This is exactly the primitive Hub Evidence Anchor anchors.

### x402.sol Payment Flow

```solidity
function payForResponse(
    uint256 bytesSent,
    address receiver,
    bytes32 contentHash,
    bytes calldata paymentInfo
) external payable {
    uint256 cost = bytesSent * pricePerByte;
    require(msg.value >= cost, "Insufficient payment");
    (bool success, ) = receiver.call{value: cost}(paymentInfo);
    require(success, "Transfer failed");
}
```

**The gap:** x402 pays because bytes were sent. Nobody verifies:
1. What the agent promised to deliver BEFORE payment fired
2. Whether the content matched the commitment scope

**Hub Evidence Anchor fills this gap:**
- `anchor_evidence`: agent commits to commitment scope BEFORE work
- Evidence posted to URI after delivery
- x402 calls `anchor_handoff` to confirm evidence chain
- Payment fires because evidence confirmed delivery, not just because bytes were sent

### x402 Payment Dispatcher (not yet onchain)

The x402 dispatcher (payee + payment + scheme) is not yet on-chain. Once it is, Hub Evidence Anchor becomes the natural integration point.

### Colosseum Superteam Earn Alignment

**Earn task:** "Build an x402 integration" — $X prize

Hub Evidence Anchor is the accountability layer FOR x402 integrations. Every x402 payment dispatcher that wants verifiable delivery proof needs Hub Evidence Anchor.

**Pitch:** "We're not just using x402 — we're making x402 safe for autonomous agents by anchoring evidence chains to Solana."

### Integration Architecture

```
Agent → anchor_evidence(precommitment) → Does work → Posts evidence to URI
                                       ↓
x402 payment request → anchor_handoff(evidence, obligor_sig)
                                       ↓
Hub Evidence Anchor → Solana tx confirms evidence chain
                                       ↓
Payment fires (x402) ← evidence_hash verified
```

### Next Steps

1. Study x402 reference implementation for integration points
2. Write integration guide for x402 dispatcher developers
3. Submit to Superteam Earn "x402 integration" task (once on mainnet)
4. Demo: anchor_evidence → fake x402 payment → anchor_handoff (using the SolFM agent as reference)

**Reference:** github.com/solana-foundation/x402-reference-implementation
