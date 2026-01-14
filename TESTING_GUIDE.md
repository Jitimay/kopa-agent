# KOPA Agent - Testing Guide

## 🧪 Testing Options

### Option 1: Quick Demo (Recommended for First Test)

The easiest way to test the system - no database or setup required!

```bash
# Install dependencies
npm install

# Run the demo
npx ts-node examples/demo.ts
```

**What it tests:**
- ✅ Escrow creation
- ✅ Delivery proof submission
- ✅ Verification (approval and rejection)
- ✅ Settlement flow
- ✅ Refund flow
- ✅ State transitions

**Expected output:**
```
🎯 Demo: Successful Escrow → Delivery → Settlement Flow

📝 Step 1: Creating escrow...
✅ Escrow created: 550e8400-e29b-41d4-a716-446655440000
   Hold ID: hold_1
   State: escrow_created

📦 Step 2: Submitting delivery proof...
✅ Verification result: APPROVED

📊 Step 3: Checking final status...
✅ Final state: completed
   Settlement tx: 0x...
   Completed at: 2025-01-14T...

🎉 Demo completed successfully!
```

---

### Option 2: Run Unit Tests

Test individual components in isolation.

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

---

### Option 3: Test via API

Test the REST API endpoints with real HTTP requests.

#### Step 1: Start the server

```bash
npm run dev
```

Server starts on `http://localhost:3000`

#### Step 2: Test endpoints

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Create Escrow:**
```bash
curl -X POST http://localhost:3000/api/v1/escrow \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "0x1234567890123456789012345678901234567890",
    "farmerAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "amount": "1000000",
    "deliveryConditions": {
      "expectedDeliveryDate": "2025-02-01T00:00:00Z",
      "requiredProofType": "qr_scan",
      "additionalRequirements": []
    }
  }'
```

**Submit Delivery Proof:**
```bash
# Replace {transactionId} with the ID from previous response
curl -X POST http://localhost:3000/api/v1/escrow/{transactionId}/proof \
  -H "Content-Type: application/json" \
  -d '{
    "proofType": "qr_scan",
    "timestamp": "2025-01-15T10:00:00Z",
    "data": {
      "qrCode": "QR123456789",
      "metadata": {
        "location": "Nairobi Market",
        "weight": "50kg"
      }
    }
  }'
```

**Query Transaction:**
```bash
curl http://localhost:3000/api/v1/escrow/{transactionId}
```

**Query by Address:**
```bash
curl http://localhost:3000/api/v1/escrow/address/0x1234567890123456789012345678901234567890
```

---

### Option 4: Interactive Testing with Postman/Insomnia

1. Import the API endpoints into Postman or Insomnia
2. Start the server: `npm run dev`
3. Test each endpoint interactively

**Base URL:** `http://localhost:3000`

**Endpoints:**
- `POST /api/v1/escrow` - Create escrow
- `POST /api/v1/escrow/:id/proof` - Submit proof
- `GET /api/v1/escrow/:id` - Get transaction
- `GET /api/v1/escrow/address/:address` - Get by address
- `GET /health` - Health check

---

## 🎯 Test Scenarios

### Scenario 1: Successful Transaction
1. Create escrow with valid data
2. Submit valid delivery proof (correct type, on time)
3. Verify transaction completes with settlement

### Scenario 2: Late Delivery
1. Create escrow with past delivery date
2. Submit proof after deadline
3. Verify transaction is refunded

### Scenario 3: Wrong Proof Type
1. Create escrow requiring "receipt"
2. Submit "qr_scan" proof instead
3. Verify transaction is refunded

### Scenario 4: Invalid Proof Format
1. Create escrow
2. Submit proof with missing fields
3. Verify error response

### Scenario 5: Query Operations
1. Create multiple transactions
2. Query by transaction ID
3. Query by buyer/farmer address
4. Verify all transactions returned

---

## 🔍 What to Look For

### Successful Test Indicators:
✅ No errors in console
✅ Proper state transitions (created → escrow_created → verification_pending → completed/refunded)
✅ Transaction IDs generated
✅ Hold IDs created
✅ Settlement/refund tx hashes present
✅ Timestamps recorded

### Common Issues:
❌ Port 3000 already in use → Change PORT in .env
❌ Module not found → Run `npm install`
❌ TypeScript errors → Run `npm run build`

---

## 📊 Test Coverage

The project includes test generators for property-based testing:

**Generated Test Data:**
- Ethereum addresses
- USDC amounts
- Delivery proofs (valid/invalid)
- Escrow requests
- Transaction states

**Test Files Location:**
- `tests/generators.ts` - Test data generators
- `tests/unit/` - Unit tests (to be added)
- `tests/property/` - Property-based tests (to be added)
- `tests/integration/` - Integration tests (to be added)

---

## 🚀 Quick Test Commands

```bash
# Quick demo (no setup)
npm install && npx ts-node examples/demo.ts

# Start API server
npm run dev

# Run tests
npm test

# Build project
npm run build

# Check TypeScript
npx tsc --noEmit
```

---

## 🐛 Debugging Tips

1. **Check logs:** All operations are logged with structured logging
2. **Inspect state:** Use query endpoints to check transaction state
3. **Verify transitions:** Check state_transitions in logs
4. **Test incrementally:** Test each endpoint separately first

---

## 📝 Next Steps

After basic testing:
1. Write unit tests for each agent
2. Add property-based tests using fast-check
3. Create integration tests for complete flows
4. Set up CI/CD pipeline
5. Add performance tests

---

## 💡 Pro Tips

- Use the demo script to understand the flow first
- Test error cases (invalid data, wrong types, late delivery)
- Check state transitions in the logs
- Use curl with `-v` flag for verbose output
- Save successful requests as templates
