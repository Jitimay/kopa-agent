import { ethers } from 'ethers';
import { VerificationAgent } from '../../src/agents/VerificationAgent';
import { DeliveryProof, ProofType, DeliveryConditions } from '../../src/models/types';

describe('VerificationAgent - Production Features', () => {
    let agent: VerificationAgent;
    let testWallet: ethers.HDNodeWallet;
    let farmerAddress: string;

    beforeEach(() => {
        agent = new VerificationAgent();
        // Create a test wallet for signing
        testWallet = ethers.Wallet.createRandom();
        farmerAddress = testWallet.address;
    });

    describe('Signature Verification', () => {
        it('should verify valid signature from farmer', async () => {
            const transactionId = 'test-tx-1';
            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789',
                    metadata: { transactionId }
                }
            };

            // Sign the proof
            const message = `KOPA Delivery Proof\nTransaction: ${transactionId}\nTimestamp: ${proof.timestamp.toISOString()}\nType: ${proof.proofType}`;
            proof.signature = await testWallet.signMessage(message);

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions, farmerAddress);

            expect(result.approved).toBe(true);
            expect(result.signatureValid).toBe(true);
            expect(result.fraudScore).toBe(0);
        });

        it('should reject invalid signature', async () => {
            const transactionId = 'test-tx-2';
            const wrongWallet = ethers.Wallet.createRandom();

            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789',
                    metadata: { transactionId }
                }
            };

            // Sign with wrong wallet
            const message = `KOPA Delivery Proof\nTransaction: ${transactionId}\nTimestamp: ${proof.timestamp.toISOString()}\nType: ${proof.proofType}`;
            proof.signature = await wrongWallet.signMessage(message);

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions, farmerAddress);

            expect(result.approved).toBe(false);
            expect(result.signatureValid).toBe(false);
            expect(result.reasons).toContain('Signature verification failed - signer does not match farmer address');
        });

        it('should reject malformed signature', async () => {
            const transactionId = 'test-tx-3';
            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789',
                    metadata: { transactionId }
                },
                signature: 'invalid-signature'
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions, farmerAddress);

            expect(result.approved).toBe(false);
            expect(result.reasons).toContain('Invalid signature format');
        });

        it('should require signature when farmer address provided', async () => {
            const transactionId = 'test-tx-4';
            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789',
                    metadata: { transactionId }
                }
                // No signature provided
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions, farmerAddress);

            expect(result.approved).toBe(false);
            expect(result.reasons).toContain('Signature required but not provided');
        });

        it('should allow missing signature when no farmer address', async () => {
            const transactionId = 'test-tx-5';
            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789',
                    metadata: { transactionId }
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions);

            expect(result.approved).toBe(true);
            expect(result.signatureValid).toBeUndefined();
        });
    });

    describe('Fraud Detection', () => {
        it('should detect duplicate proof submission', async () => {
            const transactionId = 'test-tx-6';
            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789',
                    metadata: { transactionId }
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            // First submission - should pass
            const result1 = await agent.verifyDelivery(transactionId, proof, conditions);
            expect(result1.approved).toBe(true);

            // Second submission with same proof - should fail
            const result2 = await agent.verifyDelivery(transactionId, proof, conditions);
            expect(result2.approved).toBe(false);
            expect(result2.fraudScore).toBeGreaterThan(70);
            expect(result2.reasons?.some(r => r.includes('Duplicate'))).toBe(true);
        });

        it('should detect proof reuse across transactions', async () => {
            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789'
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            // Use proof in first transaction
            const result1 = await agent.verifyDelivery('tx-1', proof, conditions);
            expect(result1.approved).toBe(true);

            // Try to reuse same proof in different transaction
            const result2 = await agent.verifyDelivery('tx-2', proof, conditions);
            expect(result2.approved).toBe(false);
            expect(result2.fraudScore).toBe(100);
            expect(result2.reasons?.some(r => r.includes('reused'))).toBe(true);
        });

        it('should detect future timestamp anomaly', async () => {
            const transactionId = 'test-tx-7';
            const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours in future

            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: futureDate,
                data: {
                    qrCode: 'QR123456789',
                    metadata: { transactionId }
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions);

            expect(result.approved).toBe(false);
            expect(result.fraudScore).toBeGreaterThan(70);
            expect(result.reasons?.some(r => r.includes('future'))).toBe(true);
        });

        it('should detect very old proof', async () => {
            const transactionId = 'test-tx-8';
            const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago

            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: oldDate,
                data: {
                    qrCode: 'QR123456789',
                    metadata: { transactionId }
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions);

            expect(result.approved).toBe(false);
            expect(result.fraudScore).toBeGreaterThanOrEqual(50);
            expect(result.reasons?.some(r => r.includes('days old'))).toBe(true);
        });

        it('should detect geolocation mismatch', async () => {
            const transactionId = 'test-tx-9';
            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789',
                    geolocation: { lat: 40.7128, lon: -74.0060 }, // New York
                    metadata: {
                        transactionId,
                        expectedLocation: { lat: 51.5074, lon: -0.1278 } // London (>5000km away)
                    }
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions);

            expect(result.approved).toBe(false);
            expect(result.fraudScore).toBeGreaterThan(50);
            expect(result.reasons?.some(r => r.includes('location'))).toBe(true);
        });

        it('should pass clean proof with zero fraud score', async () => {
            const transactionId = 'test-tx-10';
            const proof: DeliveryProof = {
                proofType: ProofType.QR_SCAN,
                timestamp: new Date(),
                data: {
                    qrCode: 'QR123456789ABCDEF', // Valid length
                    metadata: { transactionId }
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.QR_SCAN
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions);

            expect(result.approved).toBe(true);
            expect(result.fraudScore).toBe(0);
        });
    });

    describe('Image Analysis', () => {
        // Note: These tests would require actual receipt images
        // For now, we'll test error handling

        it('should reject invalid image format', async () => {
            const transactionId = 'test-tx-11';
            const proof: DeliveryProof = {
                proofType: ProofType.RECEIPT,
                timestamp: new Date(),
                data: {
                    receiptImage: 'invalid-base64-image',
                    metadata: { transactionId }
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.RECEIPT
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions);

            expect(result.approved).toBe(false);
            expect(result.reasons?.some(r => r.includes('Receipt analysis failed') || r.includes('Invalid image format'))).toBe(true);
        });

        it('should require receipt image for RECEIPT proof type', async () => {
            const transactionId = 'test-tx-12';
            const proof: DeliveryProof = {
                proofType: ProofType.RECEIPT,
                timestamp: new Date(),
                data: {
                    // Missing receiptImage
                    metadata: { transactionId }
                }
            };

            const conditions: DeliveryConditions = {
                expectedDeliveryDate: new Date(Date.now() + 86400000),
                requiredProofType: ProofType.RECEIPT
            };

            const result = await agent.verifyDelivery(transactionId, proof, conditions);

            expect(result.approved).toBe(false);
            expect(result.reasons).toContain('Missing receipt image for RECEIPT proof type');
        });
    });
});
