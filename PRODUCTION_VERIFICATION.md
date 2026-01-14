# Production Verification Features

## Overview

The VerificationAgent now includes production-ready features:

1. **Cryptographic Signature Verification** - Real ethers.js signature validation
2. **Image Analysis** - Tesseract.js OCR for receipt validation
3. **Fraud Detection** - Comprehensive fraud scoring system

## Features

### 1. Signature Verification

Proofs can be cryptographically signed by the farmer using their Ethereum private key.

**How it works:**
- Farmer signs a message containing transaction ID, timestamp, and proof type
- System verifies the signature matches the farmer's address
- Uses EIP-191 personal sign format

**Example:**
```typescript
const farmerWallet = ethers.Wallet.createRandom();
const message = `KOPA Delivery Proof\nTransaction: ${txId}\nTimestamp: ${timestamp}\nType: ${proofType}`;
const signature = await farmerWallet.signMessage(message);

proof.signature = signature;

// Verification happens automatically
const result = await verificationAgent.verifyDelivery(txId, proof, conditions, farmerAddress);
console.log(result.signatureValid); // true/false
```

### 2. Image Analysis (OCR)

Receipt images are analyzed using Tesseract.js OCR to extract:
- Merchant name
- Amount
- Date
- Line items
- Confidence score

**Requirements:**
- Base64 encoded image (JPEG, PNG, or WebP)
- Minimum 70% confidence threshold

**Example:**
```typescript
const proof: DeliveryProof = {
  proofType: ProofType.RECEIPT,
  timestamp: new Date(),
  data: {
    receiptImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
  }
};

const result = await verificationAgent.verifyDelivery(txId, proof, conditions);
console.log(result.receiptData); // { merchantName, amount, date, confidence }
```

### 3. Fraud Detection

Comprehensive fraud scoring system (0-100 scale):

| Check | Score | Threshold |
|-------|-------|-----------|
| Duplicate proof | 100 | Reject |
| Proof reuse across transactions | 100 | Reject |
| Future timestamp (>24h) | 80 | Reject |
| Old proof (>30 days) | 75 | Reject |
| Geolocation mismatch (>100km) | 75 | Reject |
| Future timestamp (<24h) | 30 | Warning |
| Short QR code (<8 chars) | 40 | Warning |

**Rejection threshold:** Fraud score > 70

**Example:**
```typescript
const result = await verificationAgent.verifyDelivery(txId, proof, conditions);
console.log(result.fraudScore); // 0-100
console.log(result.approved); // false if fraudScore > 70
```

## API Changes

### Enhanced VerificationResult

```typescript
interface EnhancedVerificationResult extends VerificationResult {
  fraudScore?: number;           // 0-100
  receiptData?: ReceiptData;     // OCR extracted data
  signatureValid?: boolean;      // Signature verification result
}
```

### Updated verifyDelivery Method

```typescript
async verifyDelivery(
  transactionId: string,
  proof: DeliveryProof,
  conditions: DeliveryConditions,
  farmerAddress?: string  // NEW: Optional farmer address for signature verification
): Promise<EnhancedVerificationResult>
```

## Testing

Run the production verification tests:

```bash
npm test -- VerificationAgent.production.test
```

**Test Coverage:**
- Signature Verification: 5 tests
- Fraud Detection: 6 tests
- Image Analysis: 2 tests
- **Total: 13 tests, all passing**

## Demo

Run the demo script to see features in action:

```bash
ts-node examples/test-production-verification.ts
```

This demonstrates:
1. Signature creation and verification
2. Duplicate proof detection
3. Geolocation mismatch detection
4. Old proof detection

## Performance

- **Signature verification:** <100ms
- **Image OCR:** 2-5 seconds per receipt
- **Fraud detection:** <50ms
- **Total verification time:** <6 seconds (with image analysis)

## Configuration

Fraud detection thresholds can be adjusted in `VerificationAgent.ts`:

```typescript
// Fraud score thresholds
const DUPLICATE_PROOF_SCORE = 100;
const FUTURE_TIMESTAMP_SCORE = 80;
const OLD_PROOF_SCORE = 75;
const GEO_MISMATCH_SCORE = 75;
const REJECTION_THRESHOLD = 70;
```

## Production Deployment

### Requirements

1. **Dependencies installed:**
   ```bash
   npm install sharp tesseract.js
   ```

2. **Farmer signatures:**
   - Farmers must sign proofs with their private keys
   - Mobile app should handle signing automatically

3. **Image preprocessing:**
   - Receipt images should be clear and well-lit
   - Recommended: 1000x1500px minimum resolution

### Best Practices

1. **Always require signatures** when farmer address is known
2. **Log fraud scores** for audit trail
3. **Monitor OCR confidence** - flag low confidence for manual review
4. **Tune thresholds** based on real-world fraud patterns

## Troubleshooting

### Low OCR Confidence

- Ensure images are preprocessed (grayscale, enhanced contrast)
- Check image resolution (minimum 1000px width)
- Verify image format (JPEG, PNG, WebP)

### Signature Verification Failures

- Confirm message format matches exactly
- Check farmer address is correct
- Verify signature format (0x prefix, 130 hex chars)

### False Positive Fraud Detection

- Review fraud score breakdown in logs
- Adjust thresholds if needed
- Consider geolocation accuracy (GPS drift)

## Future Enhancements

- [ ] Machine learning-based fraud detection
- [ ] Multi-signature support
- [ ] Advanced image analysis (object detection)
- [ ] Blockchain-based proof registry
- [ ] Real-time fraud alerts
