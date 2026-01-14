# 🚀 Test KOPA Agent NOW!

## One Command to Test Everything

```bash
npm install && npm run test:all
```

**That's it!** This single command will:
1. ✅ Install dependencies
2. ✅ Run the demo
3. ✅ Run unit tests
4. ✅ Check TypeScript
5. ✅ Build the project

---

## What You'll See

```
🧪 KOPA Agent Test Suite
═══════════════════════════════════════════════════

Test 1: Quick Demo
──────────────────────────────────────────────────
🎯 Demo: Successful Escrow → Delivery → Settlement Flow

📝 Step 1: Creating escrow...
✅ Escrow created: 550e8400-e29b-41d4-a716-446655440000
   Hold ID: hold_1
   State: escrow_created

📦 Step 2: Submitting delivery proof...
✅ Verification result: APPROVED

📊 Step 3: Checking final status...
✅ Final state: completed
   Settlement tx: 0xabc123...
   Completed at: 2025-01-14T12:34:56.789Z

🎉 Demo completed successfully!

🎯 Demo: Escrow → Failed Verification → Refund Flow

📝 Step 1: Creating escrow...
✅ Escrow created: 660f9511-f3ac-52e5-b827-557766551111

📦 Step 2: Submitting late delivery proof with wrong type...
✅ Verification result: REJECTED
   Reasons:
   - Proof type mismatch: expected receipt, got qr_scan
   - Delivery is 19 day(s) late

📊 Step 3: Checking final status...
✅ Final state: refunded
   Refund tx: 0xdef456...

🎉 Demo completed successfully!

✅ Test 1: Quick Demo passed

Test 2: TypeScript Compilation
──────────────────────────────────────────────────
✅ Test 2: TypeScript Compilation passed

Test 3: Unit Tests
──────────────────────────────────────────────────
PASS  tests/unit/TransactionStateManager.test.ts
  TransactionStateManager
    validateTransition
      ✓ should allow valid transitions (3 ms)
      ✓ should reject invalid transitions (1 ms)
      ✓ should allow transition to FAILED from any state (1 ms)
    initializeTransaction
      ✓ should initialize a new transaction with CREATED state (2 ms)
      ✓ should throw error if transaction already exists (1 ms)
      ✓ should record initial state transition (1 ms)
    transitionState
      ✓ should transition to valid state (2 ms)
      ✓ should throw error for invalid transition (1 ms)

PASS  tests/unit/VerificationAgent.test.ts
  VerificationAgent
    validateProofFormat
      ✓ should validate correct QR_SCAN proof (2 ms)
      ✓ should validate correct RECEIPT proof (1 ms)
      ✓ should validate correct CONFIRMATION proof (1 ms)
      ✓ should reject proof without proofType (1 ms)
      ✓ should reject proof without timestamp (1 ms)
      ✓ should reject proof without data (1 ms)
    verifyDelivery
      ✓ should approve valid on-time delivery (3 ms)
      ✓ should reject late delivery (2 ms)
      ✓ should reject wrong proof type (2 ms)

Test Suites: 2 passed, 2 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        2.456 s
✅ Test 3: Unit Tests passed

Test 4: Build Project
──────────────────────────────────────────────────
✅ Test 4: Build Project passed

═══════════════════════════════════════════════════
📊 Test Summary
═══════════════════════════════════════════════════
✅ Quick Demo
✅ TypeScript Compilation
✅ Unit Tests
✅ Build

──────────────────────────────────────────────────
🎉 All tests passed! (4/4)

Next steps:
  • Start API server: npm run dev
  • Run with coverage: npm run test:coverage
  • Test API: See TESTING_GUIDE.md
```

---

## ✅ If All Tests Pass

**Congratulations!** Your KOPA Agent is working perfectly.

### Try the API Next

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Test it
curl http://localhost:3000/health
```

---

## ❌ If Tests Fail

### Common Issues

**Port 3000 in use?**
```bash
PORT=3001 npm run dev
```

**Module not found?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors?**
```bash
npx tsc --noEmit
```

---

## 📚 Learn More

- **START_HERE.md** - Complete getting started guide
- **HOW_TO_TEST.md** - Detailed testing instructions
- **QUICKSTART.md** - API usage examples
- **PROJECT_SUMMARY.md** - Project overview

---

## 🎯 What Gets Tested

✅ Escrow creation  
✅ Delivery proof submission  
✅ Verification (approval & rejection)  
✅ Settlement to farmer  
✅ Refund to buyer  
✅ State transitions  
✅ Error handling  
✅ TypeScript compilation  
✅ Build process  

---

## 🚀 Ready?

```bash
npm install && npm run test:all
```

**Go!** 🏃‍♂️
