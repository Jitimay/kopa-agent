import { IX402Facilitator } from '../agents/PaymentAgent';

/**
 * Mock x402 Facilitator for testing and development
 * 
 * This mock implementation simulates the x402 Facilitator behavior
 * without making real blockchain transactions.
 */
export class MockX402Facilitator implements IX402Facilitator {
    private holds: Map<string, { buyer: string; farmer: string; amount: string }> = new Map();

    async createHold(
        buyer: string,
        farmer: string,
        amount: string
    ): Promise<{ holdId: string; txHash: string; blockNumber: number }> {
        const holdId = `mock-hold-${Date.now()}`;
        this.holds.set(holdId, { buyer, farmer, amount });

        console.log(`[MOCK] Created hold ${holdId}: ${buyer} → ${farmer}, ${amount}`);

        return {
            holdId,
            txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, '0')}`,
            blockNumber: Math.floor(Math.random() * 1000000)
        };
    }

    async releaseHold(holdId: string): Promise<{ txHash: string; blockNumber: number }> {
        const hold = this.holds.get(holdId);
        if (!hold) {
            throw new Error(`Hold ${holdId} not found`);
        }

        this.holds.delete(holdId);

        console.log(`[MOCK] Released hold ${holdId}: ${hold.buyer} → ${hold.farmer}`);

        return {
            txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, '0')}`,
            blockNumber: Math.floor(Math.random() * 1000000)
        };
    }

    async refundHold(holdId: string): Promise<{ txHash: string; blockNumber: number }> {
        const hold = this.holds.get(holdId);
        if (!hold) {
            throw new Error(`Hold ${holdId} not found`);
        }

        this.holds.delete(holdId);

        console.log(`[MOCK] Refunded hold ${holdId}: ${hold.farmer} → ${hold.buyer}`);

        return {
            txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, '0')}`,
            blockNumber: Math.floor(Math.random() * 1000000)
        };
    }
}
