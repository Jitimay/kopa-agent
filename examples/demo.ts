/**
 * Demo script showing complete KOPA Agent flow
 * Run with: ts-node examples/demo.ts
 */

import { ethers } from 'ethers';
import { CoordinatorAgent } from '../src/agents/CoordinatorAgent';
import { PaymentAgent } from '../src/agents/PaymentAgent';
import { VerificationAgent } from '../src/agents/VerificationAgent';
import { TransactionStateManager } from '../src/state/TransactionStateManager';
import { MockX402Facilitator } from '../src/blockchain/MockX402Facilitator';
import { ProofType, EscrowRequest, DeliveryProof } from '../src/models/types';

async function demonstrateSuccessfulFlow() {
  console.log('\n🎯 Demo: Successful Escrow → Delivery → Settlement Flow\n');

  // Initialize components
  const provider = new ethers.JsonRpcProvider('https://evm.cronos.org');
  const x402 = new MockX402Facilitator();
  const stateManager = new TransactionStateManager();
  const paymentAgent = new PaymentAgent(provider, x402);
  const verificationAgent = new VerificationAgent();
  const coordinator = new CoordinatorAgent(paymentAgent, verificationAgent, stateManager);

  // Step 1: Create escrow
  console.log('📝 Step 1: Creating escrow...');
  const escrowRequest: EscrowRequest = {
    buyerAddress: '0x1234567890123456789012345678901234567890',
    farmerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    amount: '1000000', // 1 USDC
    deliveryConditions: {
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 7), // 7 days from now
      requiredProofType: ProofType.QR_SCAN,
      additionalRequirements: []
    }
  };

  const transaction = await coordinator.initializeTransaction(escrowRequest);
  console.log(`✅ Escrow created: ${transaction.id}`);
  console.log(`   Hold ID: ${transaction.holdId}`);
  console.log(`   State: ${transaction.state}\n`);

  // Step 2: Submit delivery proof
  console.log('📦 Step 2: Submitting delivery proof...');
  const deliveryProof: DeliveryProof = {
    proofType: ProofType.QR_SCAN,
    timestamp: new Date(),
    data: {
      qrCode: 'QR123456789',
      metadata: {
        location: 'Nairobi Market',
        weight: '50kg'
      }
    },
    signature: 'a'.repeat(128)
  };

  const verificationResult = await coordinator.processDeliveryProof(transaction.id, deliveryProof);
  console.log(`✅ Verification result: ${verificationResult.approved ? 'APPROVED' : 'REJECTED'}`);
  if (verificationResult.reasons) {
    console.log(`   Reasons: ${verificationResult.reasons.join(', ')}`);
  }

  // Step 3: Check final status
  console.log('\n📊 Step 3: Checking final status...');
  const status = await coordinator.getTransactionStatus(transaction.id);
  console.log(`✅ Final state: ${status.state}`);
  console.log(`   Settlement tx: ${status.transaction.settlementTxHash}`);
  console.log(`   Completed at: ${status.transaction.completedAt}\n`);

  console.log('🎉 Demo completed successfully!\n');
}

async function demonstrateRefundFlow() {
  console.log('\n🎯 Demo: Escrow → Failed Verification → Refund Flow\n');

  // Initialize components
  const provider = new ethers.JsonRpcProvider('https://evm.cronos.org');
  const x402 = new MockX402Facilitator();
  const stateManager = new TransactionStateManager();
  const paymentAgent = new PaymentAgent(provider, x402);
  const verificationAgent = new VerificationAgent();
  const coordinator = new CoordinatorAgent(paymentAgent, verificationAgent, stateManager);

  // Step 1: Create escrow
  console.log('📝 Step 1: Creating escrow...');
  const escrowRequest: EscrowRequest = {
    buyerAddress: '0x1234567890123456789012345678901234567890',
    farmerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    amount: '2000000', // 2 USDC
    deliveryConditions: {
      expectedDeliveryDate: new Date(Date.now() - 86400000), // Yesterday (late delivery)
      requiredProofType: ProofType.RECEIPT,
      additionalRequirements: []
    }
  };

  const transaction = await coordinator.initializeTransaction(escrowRequest);
  console.log(`✅ Escrow created: ${transaction.id}\n`);

  // Step 2: Submit late delivery proof with wrong type
  console.log('📦 Step 2: Submitting late delivery proof with wrong type...');
  const deliveryProof: DeliveryProof = {
    proofType: ProofType.QR_SCAN, // Wrong type! Should be RECEIPT
    timestamp: new Date(), // Late!
    data: {
      qrCode: 'QR987654321'
    }
  };

  const verificationResult = await coordinator.processDeliveryProof(transaction.id, deliveryProof);
  console.log(`✅ Verification result: ${verificationResult.approved ? 'APPROVED' : 'REJECTED'}`);
  if (verificationResult.reasons) {
    console.log(`   Reasons:`);
    verificationResult.reasons.forEach(reason => console.log(`   - ${reason}`));
  }

  // Step 3: Check final status
  console.log('\n📊 Step 3: Checking final status...');
  const status = await coordinator.getTransactionStatus(transaction.id);
  console.log(`✅ Final state: ${status.state}`);
  console.log(`   Refund tx: ${status.transaction.refundTxHash}\n`);

  console.log('🎉 Demo completed successfully!\n');
}

async function main() {
  try {
    await demonstrateSuccessfulFlow();
    await demonstrateRefundFlow();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

main();
