import { X402Facilitator } from '../../src/blockchain/X402Facilitator';
import { CronosNetwork } from '@crypto.com/facilitator-client';
import { ethers } from 'ethers';

// Mock the Facilitator SDK
jest.mock('@crypto.com/facilitator-client', () => {
    return {
        Facilitator: jest.fn().mockImplementation(() => ({
            generatePaymentHeader: jest.fn().mockResolvedValue('mock-header'),
            generatePaymentRequirements: jest.fn().mockReturnValue({ payTo: '0x123', description: 'test', maxAmountRequired: '1000' }),
            buildVerifyRequest: jest.fn().mockReturnValue({ header: 'mock-header', requirements: {} }),
            verifyPayment: jest.fn().mockResolvedValue({ isValid: true, txHash: '0xmockverify' }),
            settlePayment: jest.fn().mockResolvedValue({ txHash: '0xmocksettle' })
        })),
        CronosNetwork: {
            CronosTestnet: 'testnet',
            CronosMainnet: 'mainnet'
        }
    };
});

// Mock ethers.JsonRpcProvider and Wallet
jest.mock('ethers', () => {
    const original = jest.requireActual('ethers');
    return {
        ...original,
        ethers: {
            ...original.ethers,
            JsonRpcProvider: jest.fn().mockImplementation(() => ({
                waitForTransaction: jest.fn().mockResolvedValue({ blockNumber: 12345 })
            })),
            Wallet: jest.fn().mockImplementation(() => ({
                address: '0xMockSigner'
            }))
        }
    };
});

describe('X402Facilitator Integration (Mocked)', () => {
    let facilitator: X402Facilitator;
    const privateKey = '0x' + '1'.repeat(64);
    const rpcUrl = 'https://mock-rpc.com';

    beforeEach(() => {
        facilitator = new X402Facilitator(
            CronosNetwork.CronosTestnet as any,
            privateKey,
            rpcUrl
        );
    });

    it('should create a hold successfully', async () => {
        const buyer = '0xBuyer';
        const farmer = '0xFarmer';
        const amount = '1000000';

        const result = await facilitator.createHold(buyer, farmer, amount);

        expect(result.holdId).toBeDefined();
        expect(result.holdId).toContain('x402-');
        expect(facilitator.getActiveHoldsCount()).toBe(1);
    });

    it('should release a hold successfully', async () => {
        const buyer = '0xBuyer';
        const farmer = '0xFarmer';
        const amount = '1000000';

        const hold = await facilitator.createHold(buyer, farmer, amount);
        const result = await facilitator.releaseHold(hold.holdId);

        expect(result.txHash).toBe('0xmocksettle');
        expect(result.blockNumber).toBe(12345);
        expect(facilitator.getActiveHoldsCount()).toBe(0);
    });

    it('should refund (expire) a hold successfully', async () => {
        const buyer = '0xBuyer';
        const farmer = '0xFarmer';
        const amount = '1000000';

        const hold = await facilitator.createHold(buyer, farmer, amount);
        const result = await facilitator.refundHold(hold.holdId);

        expect(result.txHash).toContain('0x0000');
        expect(facilitator.getActiveHoldsCount()).toBe(0);
    });

    it('should throw error when releasing non-existent hold', async () => {
        await expect(facilitator.releaseHold('non-existent')).rejects.toThrow('Hold non-existent not found');
    });
});
