# 🚀 KOPA Agent - START HERE

Welcome to KOPA Agent! This guide will get you testing in under 5 minutes.

---

## ⚡ Quick Start (Copy & Paste)

```bash
# Install and test everything
npm install && npm run test:all
```

That's it! This will:
- ✅ Install all dependencies
- ✅ Run the demo (see it work!)
- ✅ Run unit tests
- ✅ Verify TypeScript compilation
- ✅ Build the project

---

## 🎯 What You'll See

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
   Settlement tx: 0x...

🎉 Demo completed successfully!

✅ Test 1: Quick Demo passed
✅ Test 2: TypeScript Compilation passed
✅ Test 3: Unit Tests passed
✅ Test 4: Build passed

🎉 All tests passed! (4/4)
```

---

## 🎮 Try the API

### Step 1: Start the Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Step 2: Test It

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
```

You'll get back a transaction ID. Use it to submit proof and query status!

---

## 📚 What's Available

### Test Commands
```bash
npm run test:demo      # Quick demo (5 seconds)
npm run test:all       # All tests (30 seconds)
npm test               # Unit tests only
npm run test:watch     # Auto-rerun on changes
npm run test:coverage  # With coverage report
```

### Run Commands
```bash
npm run dev            # Start API server
npm run build          # Build for production
npm start              # Run production build
```

---

## 📖 Documentation

| File | Purpose |
|------|---------|
| **HOW_TO_TEST.md** | Detailed testing guide with examples |
| **TEST_SUMMARY.md** | Quick reference and test statistics |
| **TESTING_GUIDE.md** | Comprehensive testing documentation |
| **QUICKSTART.md** | API usage examples |
| **PROJECT_SUMMARY.md** | Complete project overview |
| **README.md** | Main documentation |

---

## 🎯 What KOPA Agent Does

KOPA Agent is an **autonomous AI escrow system** for informal trade:

1. **Buyer creates escrow** → Funds locked via x402
2. **Farmer delivers goods** → Submits proof
3. **AI verifies delivery** → Checks conditions
4. **Automatic settlement** → Farmer gets paid instantly

Or if verification fails → Buyer gets refunded automatically.

**No middlemen. No disputes. No waiting.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         KOPA Agent System               │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Coordinator  │  │ Verification │   │
│  │    Agent     │──│    Agent     │   │
│  └──────────────┘  └──────────────┘   │
│         │                               │
│         │                               │
│  ┌──────────────┐                      │
│  │   Payment    │                      │
│  │    Agent     │                      │
│  └──────────────┘                      │
│         │                               │
│         ↓                               │
│  ┌──────────────┐                      │
│  │ x402 Escrow  │                      │
│  │   (Cronos)   │                      │
│  └──────────────┘                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

After running tests, you should see:

- [x] Demo runs without errors
- [x] Both success and refund flows work
- [x] All unit tests pass (23 tests)
- [x] TypeScript compiles cleanly
- [x] Build completes successfully
- [x] API server starts on port 3000
- [x] Health endpoint responds
- [x] Structured logs in JSON format

---

## 🐛 Troubleshooting

### Port 3000 in use?
```bash
PORT=3001 npm run dev
```

### Module not found?
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tests failing?
```bash
npm test -- --verbose
```

---

## 🎓 Learn More

### Test the System
1. Run `npm run test:demo` - See it work
2. Run `npm run dev` - Start API server
3. Try the curl commands above
4. Read `HOW_TO_TEST.md` for more

### Understand the Code
1. Check `src/agents/` - AI agent implementations
2. Check `src/models/types.ts` - Data structures
3. Check `examples/demo.ts` - Complete flow example
4. Read `.kiro/specs/kopa-agent/design.md` - System design

### Add Features
1. Read `PROJECT_SUMMARY.md` - Architecture overview
2. Check `tests/generators.ts` - Test data generators
3. Write tests first (TDD)
4. Implement features

---

## 🚀 Next Steps

After successful testing:

1. **Explore the API** - Try different scenarios
2. **Read the design** - Understand the architecture
3. **Add tests** - Improve coverage
4. **Integrate x402** - Connect to real contracts
5. **Deploy** - Take it to production

---

## 💡 Pro Tips

- Use `npm run test:watch` during development
- Check logs for detailed operation info
- Test error cases (invalid data, late delivery)
- Use the API test collection in VS Code
- Read the design doc for correctness properties

---

## 🎉 You're Ready!

If `npm run test:all` passes, you have a fully functional autonomous escrow system!

**Questions?** Check the documentation files listed above.

**Ready to deploy?** See `PROJECT_SUMMARY.md` for production checklist.

**Want to contribute?** Write more tests and add features!

---

## 📞 Quick Links

- **Test Guide:** `HOW_TO_TEST.md`
- **API Guide:** `QUICKSTART.md`
- **Project Info:** `PROJECT_SUMMARY.md`
- **Design Doc:** `.kiro/specs/kopa-agent/design.md`
- **Requirements:** `.kiro/specs/kopa-agent/requirements.md`

---

**Built with ❤️ for informal trade in Africa**

*Autonomous AI agents + x402 conditional payments = Trust as code*
