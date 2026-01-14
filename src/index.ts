// KOPA Agent - Main entry point
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { createServer } from './api/server';
import { CoordinatorAgent } from './agents/CoordinatorAgent';
import { PaymentAgent } from './agents/PaymentAgent';
import { VerificationAgent } from './agents/VerificationAgent';
import { TransactionStateManager } from './state/TransactionStateManager';
import { logger } from './utils/logger';
import { X402Facilitator } from './blockchain/X402Facilitator';
import { MockX402Facilitator } from './blockchain/MockX402Facilitator';
import { CronosNetwork } from '@crypto.com/facilitator-client';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Initialize blockchain provider
    const rpcUrl = process.env.CRONOS_RPC_URL || 'https://evm.cronos.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize x402 Facilitator (real or mock based on config)
    let x402Facilitator;

    if (process.env.X402_PRIVATE_KEY && process.env.X402_NETWORK) {
      // Use real x402 Facilitator
      const network = process.env.X402_NETWORK === 'mainnet'
        ? CronosNetwork.CronosMainnet
        : CronosNetwork.CronosTestnet;

      const x402RpcUrl = process.env.X402_CRONOS_RPC_URL || rpcUrl;

      x402Facilitator = new X402Facilitator(
        network,
        process.env.X402_PRIVATE_KEY,
        x402RpcUrl
      );

      logger.info('Initialized real x402 Facilitator', {
        network: process.env.X402_NETWORK,
        rpcUrl: x402RpcUrl
      });
      console.log(`✅ Using REAL x402 Facilitator on ${process.env.X402_NETWORK}`);
    } else {
      // Use mock facilitator for development
      x402Facilitator = new MockX402Facilitator();
      logger.warn('Using mock x402 Facilitator - set X402_PRIVATE_KEY and X402_NETWORK for real blockchain');
      console.log('⚠️  Using MOCK x402 Facilitator (set X402_PRIVATE_KEY for real blockchain)');
    }

    // Initialize agents
    const stateManager = new TransactionStateManager();
    const paymentAgent = new PaymentAgent(provider, x402Facilitator);
    const verificationAgent = new VerificationAgent();
    const coordinatorAgent = new CoordinatorAgent(paymentAgent, verificationAgent, stateManager);

    // Create and start server
    const app = createServer(coordinatorAgent);
    const port = process.env.PORT || 3000;

    app.listen(port, () => {
      logger.info(`KOPA Agent server started`, { port });
      console.log(`🚀 KOPA Agent running on http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start KOPA Agent', {}, error as Error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}

export { main };
