/**
 * Demo script showing production verification features
 * Run with: ts-node examples/test-signature.ts
 */

import { ethers } from 'ethers';
import { VerificationAgent } from '../src/agents/VerificationAgent';
import { DeliveryProof, ProofType, DeliveryConditions } from '../src/models/types';

async function demonstrateSignatureVerification() {
    console.log('\n🔐 Demo: Signature Verification\n');

    const agent = new VerificationAgent();

    // Create a test wallet (farmer)
    const farmerWallet = ethers.Wallet.createRandom();
    console.log(`✅ Farmer wallet created: ${farmerWallet.address}\n`);

    // Create a proof
    const transactionId = 'demo-tx-001';
    const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
            qrCode: 'QR123456789ABCDEF',
            metadata: { transactionId }
        }
    };

    // Sign the proof
    const message = `KOPA Delivery Proof\nTransaction: ${transactionId}\nTimestamp: ${proof.timestamp.toISOString()}\nType: ${proof.proofType}`;
    proof.signature = await farmerWallet.signMessage(message);
    console.log(`✅ Proof signed by farmer`);
    console.log(`   Signature: ${proof.signature.substring(0, 20)}...`);

    // Verify the proof
    const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        requiredProofType: ProofType.QR_SCAN
    };

    const result = await agent.verifyDelivery(
        transactionId,
        proof,
        conditions,
        farmerWallet.address
    );

    console.log(`\n📊 Verification Result:`);
    console.log(`   Approved: ${result.approved ? '✅' : '❌'}`);
    console.log(`   Signature Valid: ${result.signatureValid ? '✅' : '❌'}`);
    console.log(`   Fraud Score: ${result.fraudScore}/100`);

    if (result.reasons) {
        console.log(`   Reasons: ${result.reasons.join(', ')}`);
    }

    console.log('\n🎉 Signature verification demo completed!\n');
}

async function demonstrateFraudDetection() {
    console.log('\n🚨 Demo: Fraud Detection\n');

    const agent = new VerificationAgent();

    // Test 1: Duplicate proof detection
    console.log('Test 1: Duplicate Proof Detection');
    const proof1: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
            qrCode: 'QR_DUPLICATE_TEST'
        }
    };

    const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        requiredProofType: ProofType.QR_SCAN
    };

    const result1 = await agent.verifyDelivery('tx-1', proof1, conditions);
    console.log(`   First submission: ${result1.approved ? '✅ Approved' : '❌ Rejected'}`);

    const result2 = await agent.verifyDelivery('tx-1', proof1, conditions);
    console.log(`   Second submission: ${result2.approved ? '✅ Approved' : '❌ Rejected'}`);
    console.log(`   Fraud Score: ${result2.fraudScore}/100`);
    console.log(`   Reason: ${result2.reasons?.[0]}\n`);

    // Test 2: Geolocation mismatch
    console.log('Test 2: Geolocation Mismatch');
    const proof2: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
            qrCode: 'QR_GEO_TEST',
            geolocation: { lat: 40.7128, lon: -74.0060 }, // New York
            metadata: {
                expectedLocation: { lat: 51.5074, lon: -0.1278 } // London
            }
        }
    };

    const result3 = await agent.verifyDelivery('tx-2', proof2, conditions);
    console.log(`   Result: ${result3.approved ? '✅ Approved' : '❌ Rejected'}`);
    console.log(`   Fraud Score: ${result3.fraudScore}/100`);
    console.log(`   Reason: ${result3.reasons?.[0]}\n`);

    // Test 3: Old proof
    console.log('Test 3: Old Proof Detection');
    const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
    const proof3: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: oldDate,
        data: {
            qrCode: 'QR_OLD_TEST'
        }
    };

    const result4 = await agent.verifyDelivery('tx-3', proof3, conditions);
    console.log(`   Result: ${result4.approved ? '✅ Approved' : '❌ Rejected'}`);
    console.log(`   Fraud Score: ${result4.fraudScore}/100`);
    console.log(`   Reason: ${result4.reasons?.[0]}\n`);

    console.log('🎉 Fraud detection demo completed!\n');
}

async function main() {
    try {
        await demonstrateSignatureVerification();
        await demonstrateFraudDetection();
    } catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}

main();
