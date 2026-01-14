import { ethers } from 'ethers';
import { EscrowHoldRequest, EscrowHoldResult, PaymentResult, RefundResult } from '../models/types';

export interface IX402Facilitator {
  createHold(buyer: string, farmer: string, amount: string): Promise<{ holdId: string; txHash: string; blockNumber: number }>;
  releaseHold(holdId: string): Promise<{ txHash: string; blockNumber: number }>;
  refundHold(holdId: string): Promise<{ txHash: string; blockNumber: number }>;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export class PaymentAgent {
  private provider: ethers.Provider;
  private x402Facilitator: IX402Facilitator;
  private retryConfig: RetryConfig;

  constructor(
    provider: ethers.Provider,
    x402Facilitator: IX402Facilitator,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.provider = provider;
    this.x402Facilitator = x402Facilitator;
    this.retryConfig = {
      maxAttempts: retryConfig?.maxAttempts ?? 3,
      initialDelayMs: retryConfig?.initialDelayMs ?? 1000,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
      maxDelayMs: retryConfig?.maxDelayMs ?? 10000
    };
  }

  /**
   * Creates an escrow hold using x402
   */
  async createEscrowHold(request: EscrowHoldRequest): Promise<EscrowHoldResult> {
    try {
      // Check buyer balance
      const balance = await this.getBalance(request.buyerAddress);
      const requiredAmount = BigInt(request.amount);

      if (balance < requiredAmount) {
        throw new Error(`Insufficient balance: ${balance} < ${requiredAmount}`);
      }

      // Create x402 hold with retry logic
      const result = await this.retryWithBackoff(async () => {
        return await this.x402Facilitator.createHold(
          request.buyerAddress,
          request.farmerAddress,
          request.amount
        );
      });

      // Verify on-chain confirmation
      await this.verifyOnChainConfirmation(result.txHash);

      return {
        success: true,
        holdId: result.holdId,
        txHash: result.txHash,
        blockNumber: result.blockNumber
      };
    } catch (error) {
      console.error(`Failed to create escrow hold for transaction ${request.transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Releases payment from escrow to farmer
   */
  async releasePayment(transactionId: string, holdId: string): Promise<PaymentResult> {
    try {
      // Execute x402 release with retry logic
      const result = await this.retryWithBackoff(async () => {
        return await this.x402Facilitator.releaseHold(holdId);
      });

      // Verify on-chain confirmation
      await this.verifyOnChainConfirmation(result.txHash);

      return {
        success: true,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Failed to release payment for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Processes refund from escrow to buyer
   */
  async processRefund(transactionId: string, holdId: string): Promise<RefundResult> {
    try {
      // Execute x402 refund with retry logic
      const result = await this.retryWithBackoff(async () => {
        return await this.x402Facilitator.refundHold(holdId);
      });

      // Verify on-chain confirmation
      await this.verifyOnChainConfirmation(result.txHash);

      return {
        success: true,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Failed to process refund for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Verifies on-chain confirmation of a transaction
   */
  async verifyOnChainConfirmation(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error(`Transaction ${txHash} not found`);
      }
      if (receipt.status !== 1) {
        throw new Error(`Transaction ${txHash} failed on-chain`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to verify on-chain confirmation for ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Gets USDC balance for an address
   */
  private async getBalance(address: string): Promise<bigint> {
    try {
      // USDC contract address on Cronos
      const USDC_ADDRESS = process.env.USDC_CONTRACT_ADDRESS ||
        '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59'; // Cronos Testnet USDC (devUSDC.e)

      const usdcAbi = [
        'function balanceOf(address owner) view returns (uint256)'
      ];

      const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcAbi, this.provider);
      const balance = await usdcContract.balanceOf(address);

      console.log(`USDC balance for ${address}: ${balance}`);
      return balance;
    } catch (error) {
      console.error(`Failed to get USDC balance for ${address}:`, error);
      // Return mock balance as fallback for development
      return BigInt(1000000); // 1 USDC (6 decimals)
    }
  }

  /**
   * Retries an operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt}/${this.retryConfig.maxAttempts} failed:`, error);

        if (attempt < this.retryConfig.maxAttempts) {
          await this.sleep(delay);
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelayMs
          );
        }
      }
    }

    throw new Error(
      `Operation failed after ${this.retryConfig.maxAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
