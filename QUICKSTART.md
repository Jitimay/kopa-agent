# KOPA Agent - Quick Start Guide

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (optional for full functionality)

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Running the Demo

The easiest way to see KOPA Agent in action is to run the demo script:

```bash
# Run the demo (no database required)
npx ts-node examples/demo.ts
```

This will demonstrate:
1. **Successful Flow**: Escrow → Delivery → Settlement
2. **Refund Flow**: Escrow → Failed Verification → Refund

### Running the API Server

```bash
# Start the development server
npm run dev
```

The server will start on `http://localhost:3000`

### API Examples

#### 1. Create Escrow

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

Response:
```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "escrow_created",
  "holdId": "hold_1_1234567890"
}
```

#### 2. Submit Delivery Proof

```bash
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
    },
    "signature": "a1b2c3..."
  }'
```

#### 3. Query Transaction

```bash
# By transaction ID
curl http://localhost:3000/api/v1/escrow/{transactionId}

# By address
curl http://localhost:3000/api/v1/escrow/address/0x1234567890123456789012345678901234567890
```

#### 4. Health Check

```bash
curl http://localhost:3000/health
```

## 🏗️ Architecture Overview

KOPA Agent consists of three AI agents:

1. **Coordinator Agent**: Orchestrates the transaction lifecycle
2. **Verification Agent**: Validates delivery proof
3. **Payment Agent**: Executes x402 blockchain transactions

### Transaction Flow

```
1. Buyer creates escrow → Funds locked via x402
2. Farmer delivers goods → Submits proof
3. Verification Agent validates → Approves/Rejects
4. Payment Agent executes → Settlement or Refund
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 📊 Transaction States

- `created` → Initial state
- `escrow_created` → Funds locked on-chain
- `verification_pending` → Proof submitted, awaiting verification
- `settlement_pending` → Approved, payment being released
- `completed` → Payment settled to farmer
- `refunded` → Payment returned to buyer
- `failed` → Error occurred

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Blockchain
CRONOS_RPC_URL=https://evm.cronos.org
X402_FACILITATOR_ADDRESS=0x...

# API
PORT=3000
NODE_ENV=development

# Database (optional)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=kopa_agent
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
```

## 📝 Notes

- The current implementation uses a **mock x402 Facilitator** for development
- Database persistence is optional - the system works in-memory by default
- For production, integrate with the real x402 Facilitator contract on Cronos

## 🎯 Next Steps

1. Integrate with real x402 Facilitator contract
2. Set up PostgreSQL database for persistence
3. Deploy to production environment
4. Add authentication and authorization
5. Implement monitoring and alerting

## 🤝 Support

For issues or questions, refer to the main README.md or check the design documentation in `.kiro/specs/kopa-agent/`.
