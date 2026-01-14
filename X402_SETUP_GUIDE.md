# Cronos x402 Setup Guide

This guide explains how to configure and test the real Cronos x402 Facilitator integration for production-ready escrow payments.

## Prerequisites

1.  **Private Key**: An EOA wallet private key with some TCRO (for gas) and devUSDC.e (for payments).
2.  **Cronos Testnet Faucet**:
    *   Get TCRO: [https://faucet.cronos.org/](https://faucet.cronos.org/)
    *   Get devUSDC.e: Use the x402 Facilitator faucet or swap on a testnet DEX.
3.  **USDC Contract (Cronos Testnet)**: `0xc21223249CA28397B4B6541dfFaEcC539BfF0c59`

## Environment Configuration

Update your `.env` file with the following variables:

```bash
# x402 Facilitator Configuration
X402_NETWORK=testnet
X402_PRIVATE_KEY=your_private_key_here
X402_CRONOS_RPC_URL=https://evm-t3.cronos.org
USDC_CONTRACT_ADDRESS=0xc21223249CA28397B4B6541dfFaEcC539BfF0c59
```

## How It Works (EIP-3009)

KOPA Agent uses the **EIP-3009 (Transfer with Authorization)** standard:
1.  **Authorize**: The buyer signs a payment authorization off-chain. No gas is spent by the buyer here.
2.  **Verify**: The KOPA Agent verifies the authorization with the Cronos Facilitator API.
3.  **Settle**: When delivery is verified, the KOPA Agent triggers the Facilitator to execute the transfer on-chain using the signed authorization.

## Testing on Testnet

You can run the provided verification script to test the full flow on Cronos Testnet:

```bash
# Ensure you have set X402_PRIVATE_KEY in .env
ts-node examples/test-x402-testnet.ts
```

## Troubleshooting

*   **Insufficient Balance**: Ensure your wallet has `devUSDC.e` at address `0xc21223...`.
*   **Invalid Nonce**: If a transaction fails, it might be due to a reused EIP-3009 nonce. The SDK handles this automatically, but ensure you aren't manually reusing nonces.
*   **Facilitator API Errors**: Check [Cronos Docs](https://docs.cronos.org/cronos-x402-facilitator/api-reference) for the latest endpoint statuses.
