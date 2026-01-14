# KOPA Agent

Autonomous AI escrow and payments system for informal trade using x402 conditional payments on Cronos blockchain.

## Overview

KOPA Agent replaces middlemen with AI agents that hold, verify, and release payments automatically. The system consists of three specialized agents:

- **Coordinator Agent**: Orchestrates transaction lifecycle
- **Verification Agent**: Validates delivery proof
- **Payment Agent**: Executes x402 blockchain transactions

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Cronos blockchain access (RPC endpoint)

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
psql -U postgres -d kopa_agent -f database/schema.sql
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build project
npm run build

# Start development server
npm run dev
```

## Project Structure

```
kopa-agent/
├── src/
│   ├── agents/          # AI agents (Coordinator, Verification, Payment)
│   ├── models/          # Data models and types
│   ├── state/           # Transaction state management
│   ├── api/             # REST API endpoints
│   ├── database/        # Database client and operations
│   └── utils/           # Utility functions
├── tests/
│   ├── unit/            # Unit tests
│   ├── property/        # Property-based tests
│   └── integration/     # Integration tests
├── database/
│   └── schema.sql       # Database schema
└── package.json
```

## API Endpoints

- `POST /api/v1/escrow` - Create escrow
- `POST /api/v1/escrow/:transactionId/proof` - Submit delivery proof
- `GET /api/v1/escrow/:transactionId` - Query transaction by ID
- `GET /api/v1/escrow/address/:address` - Query by address

## Testing

The project includes comprehensive testing infrastructure:

### Quick Start
```bash
# Run all tests (demo + unit + build)
npm run test:all

# Run quick demo only
npm run test:demo

# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Test Types
- **Demo Tests**: 2 complete transaction flows (success + refund)
- **Unit Tests**: 23 tests for state management and verification
- **API Tests**: 15 scenarios for REST endpoints
- **Property Tests**: Generators for property-based testing

### Documentation
- **START_HERE.md** - Quick start guide
- **HOW_TO_TEST.md** - Detailed testing instructions
- **TEST_SUMMARY.md** - Test statistics and reference
- **TESTING_GUIDE.md** - Comprehensive testing guide

See `START_HERE.md` for complete testing instructions.

## License

MIT
