# How to Test KOPA Agent

## 🚀 Quick Start (5 minutes)

The fastest way to verify everything works:

```bash
# 1. Install dependencies
npm install

# 2. Run all tests
npm run test:all
```

This will run:
- ✅ Quick demo (both success and refund flows)
- ✅ TypeScript compilation check
- ✅ Unit tests
- ✅ Build verification

---

## 📋 Testing Methods

### Method 1: Quick Demo (Recommended First)

**What it does:** Runs two complete transaction flows without any setup.

```bash
npm run test:demo
```

**Expected Output:**
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

**What it tests:**
- Escrow creation with x402 holds
- Delivery proof submission
- Verification (approval and rejection)
- Settlement to farmer
- Refund to buyer
- State transitions

---

### Method 2: Unit Tests

**What it does:** Tests individual components in isolation.

```bash
# Run all unit tests
npm test

# Run in watch mode (auto-rerun on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

**Current Tests:**
- `TransactionStateManager.test.ts` - State transitions and validation
- `VerificationAgent.test.ts` - Proof validation logic

**Example Output:**
```
PASS  tests/unit/TransactionStateManager.test.ts
  TransactionStateManager
    validateTransition
      ✓ should allow valid transitions (3 ms)
      ✓ should reject invalid transitions (1 ms)
      ✓ should allow transition to FAILED from any state (1 ms)
    initializeTransaction
      ✓ should initialize a new transaction with CREATED state (2 ms)
      ✓ should throw error if transaction already exists (1 ms)

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
```

---

### Method 3: API Testing (Interactive)

**What it does:** Tests the REST API with real HTTP requests.

#### Step 1: Start the Server

```bash
npm run dev
```

Server starts on `http://localhost:3000`

#### Step 2: Test Endpoints

**Using curl:**

```bash
# Health check
curl http://localhost:3000/health

# Create escrow
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

# Save the transactionId from the response, then:

# Submit delivery proof
curl -X POST http://localhost:3000/api/v1/escrow/YOUR_TRANSACTION_ID/proof \
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

# Query transaction
curl http://localhost:3000/api/v1/escrow/YOUR_TRANSACTION_ID

# Query by address
curl http://localhost:3000/api/v1/escrow/address/0x1234567890123456789012345678901234567890
```

**Using VS Code REST Client:**

1. Install "REST Client" extension
2. Open `tests/api-test-collection.http`
3. Click "Send Request" above each test
4. View responses inline

---

### Method 4: Manual Testing Scenarios

#### Scenario A: Successful Transaction

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run commands
# 1. Create escrow
curl -X POST http://localhost:3000/api/v1/escrow \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "0x1111111111111111111111111111111111111111",
    "farmerAddress": "0x2222222222222222222222222222222222222222",
    "amount": "5000000",
    "deliveryConditions": {
      "expectedDeliveryDate": "2025-03-01T00:00:00Z",
      "requiredProofType": "qr_scan",
      "additionalRequirements": []
    }
  }'

# 2. Copy transactionId from response

# 3. Submit valid proof (on time, correct type)
curl -X POST http://localhost:3000/api/v1/escrow/TRANSACTION_ID/proof \
  -H "Content-Type: application/json" \
  -d '{
    "proofType": "qr_scan",
    "timestamp": "2025-01-20T10:00:00Z",
    "data": {
      "qrCode": "QR999888777"
    }
  }'

# 4. Check final state (should be "completed")
curl http://localhost:3000/api/v1/escrow/TRANSACTION_ID
```

**Expected Result:** Transaction state = `completed`, settlement tx hash present

---

#### Scenario B: Late Delivery (Refund)

```bash
# 1. Create escrow with past delivery date
curl -X POST http://localhost:3000/api/v1/escrow \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "0x3333333333333333333333333333333333333333",
    "farmerAddress": "0x4444444444444444444444444444444444444444",
    "amount": "3000000",
    "deliveryConditions": {
      "expectedDeliveryDate": "2025-01-01T00:00:00Z",
      "requiredProofType": "receipt",
      "additionalRequirements": []
    }
  }'

# 2. Submit late proof
curl -X POST http://localhost:3000/api/v1/escrow/TRANSACTION_ID/proof \
  -H "Content-Type: application/json" \
  -d '{
    "proofType": "receipt",
    "timestamp": "2025-01-20T10:00:00Z",
    "data": {
      "receiptImage": "base64data..."
    }
  }'

# 3. Check state (should be "refunded")
curl http://localhost:3000/api/v1/escrow/TRANSACTION_ID
```

**Expected Result:** Transaction state = `refunded`, refund tx hash present, reasons include "late"

---

#### Scenario C: Wrong Proof Type (Refund)

```bash
# 1. Create escrow requiring "receipt"
curl -X POST http://localhost:3000/api/v1/escrow \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "0x5555555555555555555555555555555555555555",
    "farmerAddress": "0x6666666666666666666666666666666666666666",
    "amount": "2000000",
    "deliveryConditions": {
      "expectedDeliveryDate": "2025-03-01T00:00:00Z",
      "requiredProofType": "receipt",
      "additionalRequirements": []
    }
  }'

# 2. Submit QR scan instead of receipt
curl -X POST http://localhost:3000/api/v1/escrow/TRANSACTION_ID/proof \
  -H "Content-Type: application/json" \
  -d '{
    "proofType": "qr_scan",
    "timestamp": "2025-01-20T10:00:00Z",
    "data": {
      "qrCode": "QR123"
    }
  }'

# 3. Check state (should be "refunded")
curl http://localhost:3000/api/v1/escrow/TRANSACTION_ID
```

**Expected Result:** Transaction state = `refunded`, reasons include "Proof type mismatch"

---

## 🔍 Verification Checklist

After running tests, verify:

- [ ] Demo runs without errors
- [ ] All unit tests pass
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] API server starts on port 3000
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Escrow creation returns transaction ID and hold ID
- [ ] Valid proof results in "completed" state
- [ ] Invalid proof results in "refunded" state
- [ ] Query endpoints return correct data
- [ ] State transitions follow valid paths
- [ ] Logs show structured JSON output

---

## 🐛 Troubleshooting

### Issue: Port 3000 already in use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Issue: Module not found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors

```bash
# Check for errors
npx tsc --noEmit

# Rebuild
npm run build
```

### Issue: Tests fail

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- TransactionStateManager.test.ts
```

---

## 📊 Test Coverage

To see which code is tested:

```bash
npm run test:coverage
```

This generates:
- Console summary
- HTML report in `coverage/` directory

Open `coverage/lcov-report/index.html` in browser to see detailed coverage.

---

## 🎯 What Each Test Validates

### Quick Demo
- ✅ Agent coordination
- ✅ State machine logic
- ✅ Verification rules
- ✅ Settlement/refund flows
- ✅ End-to-end integration

### Unit Tests
- ✅ State transition validation
- ✅ Invalid state rejection
- ✅ Proof format validation
- ✅ Delivery condition checking
- ✅ Error handling

### API Tests
- ✅ HTTP endpoints
- ✅ Request validation
- ✅ Error responses
- ✅ JSON serialization
- ✅ Query operations

---

## 🚀 Next Steps

After successful testing:

1. **Add more tests:** Write tests for PaymentAgent and CoordinatorAgent
2. **Integration tests:** Test complete flows with database
3. **Property-based tests:** Use fast-check generators
4. **Load testing:** Test with multiple concurrent requests
5. **Security testing:** Test with malicious inputs

---

## 📚 Additional Resources

- `TESTING_GUIDE.md` - Comprehensive testing documentation
- `tests/api-test-collection.http` - API test collection
- `examples/demo.ts` - Demo script source code
- `tests/generators.ts` - Property-based test generators
- `.kiro/specs/kopa-agent/design.md` - System design and properties

---

## ✅ Success Criteria

Your tests are successful when:

1. ✅ `npm run test:all` completes without errors
2. ✅ Demo shows both success and refund flows
3. ✅ All unit tests pass
4. ✅ API server starts and responds to requests
5. ✅ State transitions follow valid paths
6. ✅ Verification logic works correctly
7. ✅ Logs show structured output

**You're ready to deploy when all criteria are met!** 🎉
