import { Facilitator, CronosNetwork, PaymentRequirements } from '@crypto.com/facilitator-client';
import { ethers } from 'ethers';
import { IX402Facilitator } from '../agents/PaymentAgent';

/**
 * Real x402 Facilitator implementation using @crypto.com/facilitator-client SDK
 * 
 * This class wraps the official Cronos x402 Facilitator SDK to provide
 * real blockchain escrow functionality using EIP-3009 payment headers.
 */
export class X402Facilitator implements IX402Facilitator {
    private facilitator: Facilitator;
    private signer: ethers.Wallet;
    private provider: ethers.Provider;
    private holdStore: Map<string, { header: string; requirements: PaymentRequirements }> = new Map();

    constructor(
        network: CronosNetwork,
        privateKey: string,
        rpcUrl: string
    ) {
        this.facilitator = new Facilitator({ network });
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.signer = new ethers.Wallet(privateKey, this.provider);
    }

    /**
     * Creates an escrow hold using EIP-3009 payment authorization
     * 
     * Flow:
     * 1. Generate payment header (off-chain signature)
     * 2. Generate payment requirements
     * 3. Verify payment with Facilitator API
     * 4. Store hold information for later settlement
     */
    async createHold(
        buyer: string,
        farmer: string,
        amount: string
    ): Promise<{ holdId: string; txHash: string; blockNumber: number }> {
        try {
            console.log(`Creating x402 hold: ${buyer} → ${farmer}, amount: ${amount}`);

            // 1. Generate EIP-3009 payment header
            const header = await this.facilitator.generatePaymentHeader({
                to: farmer,
                value: amount,
                signer: this.signer,
                validBefore: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
            });

            console.log('✅ Payment header generated');

            // 2. Generate payment requirements
            const requirements = this.facilitator.generatePaymentRequirements({
                payTo: farmer,
                description: `KOPA Escrow: ${buyer} → ${farmer}`,
                maxAmountRequired: amount
            });

            console.log('✅ Payment requirements generated');

            // 3. Build verify request
            const verifyRequest = this.facilitator.buildVerifyRequest(header, requirements);

            // 4. Verify payment with Facilitator API
            const verifyResponse = await this.facilitator.verifyPayment(verifyRequest);

            if (!verifyResponse.isValid) {
                throw new Error(`Payment verification failed: ${JSON.stringify(verifyResponse)}`);
            }

            console.log('✅ Payment verified by Facilitator');

            // 5. Generate hold ID and store hold information
            const holdId = this.generateHoldId();
            this.holdStore.set(holdId, { header, requirements });

            console.log(`✅ Hold created with ID: ${holdId}`);

            return {
                holdId,
                txHash: '0x0', // Placeholder - actual tx happens on settlement
                blockNumber: 0
            };
        } catch (error) {
            console.error('❌ Failed to create x402 hold:', error);
            throw error;
        }
    }

    /**
     * Releases payment by settling the authorized transfer on-chain
     * 
     * Flow:
     * 1. Retrieve hold information
     * 2. Build verify request
     * 3. Settle payment via Facilitator API
     * 4. Wait for transaction confirmation
     */
    async releaseHold(holdId: string): Promise<{ txHash: string; blockNumber: number }> {
        try {
            console.log(`Releasing x402 hold: ${holdId}`);

            // 1. Retrieve hold information
            const holdInfo = this.holdStore.get(holdId);
            if (!holdInfo) {
                throw new Error(`Hold ${holdId} not found`);
            }

            const { header, requirements } = holdInfo;

            // 2. Build verify request
            const verifyRequest = this.facilitator.buildVerifyRequest(header, requirements);

            // 3. Settle payment on-chain via Facilitator API
            const settleResponse = await this.facilitator.settlePayment(verifyRequest);

            if (!settleResponse.txHash) {
                throw new Error('Settlement failed: No transaction hash returned');
            }

            console.log(`✅ Payment settled: ${settleResponse.txHash}`);

            // 4. Wait for transaction confirmation
            const receipt = await this.provider.waitForTransaction(settleResponse.txHash, 1);

            if (!receipt) {
                throw new Error(`Transaction ${settleResponse.txHash} not found`);
            }

            console.log(`✅ Transaction confirmed at block ${receipt.blockNumber}`);

            // 5. Clean up hold
            this.holdStore.delete(holdId);

            return {
                txHash: settleResponse.txHash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('❌ Failed to release x402 hold:', error);
            throw error;
        }
    }

    /**
     * Processes refund by allowing payment to expire
     * 
     * Note: x402 uses payment expiry instead of explicit refunds.
     * The payment header has a validBefore timestamp - after expiry,
     * the authorization becomes invalid and funds remain with buyer.
     */
    async refundHold(holdId: string): Promise<{ txHash: string; blockNumber: number }> {
        try {
            console.log(`Processing refund for hold: ${holdId}`);

            // Retrieve hold information
            const holdInfo = this.holdStore.get(holdId);
            if (holdInfo) {
                // Clean up hold - payment will expire naturally
                this.holdStore.delete(holdId);
                console.log('✅ Hold expired - funds remain with buyer');
            }

            // Return placeholder indicating expiry (no on-chain transaction needed)
            return {
                txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                blockNumber: 0
            };
        } catch (error) {
            console.error('❌ Failed to process refund:', error);
            throw error;
        }
    }

    /**
     * Generates a unique hold ID
     */
    private generateHoldId(): string {
        return `x402-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Gets the number of active holds (for monitoring)
     */
    getActiveHoldsCount(): number {
        return this.holdStore.size;
    }
}
