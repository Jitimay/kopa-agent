import { randomUUID } from 'crypto';
import {
  Transaction,
  EscrowRequest,
  DeliveryProof,
  VerificationResult,
  TransactionState,
  TransactionStatus
} from '../models/types';
import { PaymentAgent } from './PaymentAgent';
import { VerificationAgent } from './VerificationAgent';
import { ITransactionStateManager } from '../state/TransactionStateManager';

export class CoordinatorAgent {
  private transactions: Map<string, Transaction>;
  private paymentAgent: PaymentAgent;
  private verificationAgent: VerificationAgent;
  private stateManager: ITransactionStateManager;

  constructor(
    paymentAgent: PaymentAgent,
    verificationAgent: VerificationAgent,
    stateManager: ITransactionStateManager
  ) {
    this.transactions = new Map();
    this.paymentAgent = paymentAgent;
    this.verificationAgent = verificationAgent;
    this.stateManager = stateManager;
  }

  /**
   * Initializes a new escrow transaction
   */
  async initializeTransaction(request: EscrowRequest): Promise<Transaction> {
    const transactionId = randomUUID();

    try {
      // Initialize state
      await this.stateManager.initializeTransaction(transactionId, 'CoordinatorAgent');

      // Create transaction object
      const transaction: Transaction = {
        id: transactionId,
        buyerAddress: request.buyerAddress,
        farmerAddress: request.farmerAddress,
        amount: request.amount,
        deliveryConditions: request.deliveryConditions,
        state: TransactionState.CREATED,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store transaction
      this.transactions.set(transactionId, transaction);

      // Create escrow hold via Payment Agent
      const holdResult = await this.paymentAgent.createEscrowHold({
        buyerAddress: request.buyerAddress,
        farmerAddress: request.farmerAddress,
        amount: request.amount,
        transactionId
      });

      // Update transaction with hold info
      transaction.holdId = holdResult.holdId;
      transaction.state = TransactionState.ESCROW_CREATED;
      transaction.updatedAt = new Date();

      // Transition state
      await this.stateManager.transitionState(
        transactionId,
        TransactionState.ESCROW_CREATED,
        'CoordinatorAgent',
        'Escrow hold created successfully'
      );

      this.transactions.set(transactionId, transaction);

      console.log(`Transaction ${transactionId} initialized with hold ${holdResult.holdId}`);
      return transaction;
    } catch (error) {
      console.error(`Failed to initialize transaction:`, error);

      // Mark as failed if state was initialized
      try {
        await this.stateManager.transitionState(
          transactionId,
          TransactionState.FAILED,
          'CoordinatorAgent',
          `Initialization failed: ${(error as Error).message}`
        );
      } catch (stateError) {
        // State might not exist yet, ignore
      }

      throw error;
    }
  }

  /**
   * Processes delivery proof submission
   */
  async processDeliveryProof(
    transactionId: string,
    proof: DeliveryProof
  ): Promise<VerificationResult> {
    try {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Validate current state
      const currentState = await this.stateManager.getTransactionState(transactionId);
      if (currentState !== TransactionState.ESCROW_CREATED) {
        throw new Error(
          `Invalid state for proof submission: ${currentState}. Expected: ${TransactionState.ESCROW_CREATED}`
        );
      }

      // Transition to verification pending
      await this.stateManager.transitionState(
        transactionId,
        TransactionState.VERIFICATION_PENDING,
        'CoordinatorAgent',
        'Delivery proof submitted'
      );

      // Store proof
      transaction.deliveryProof = proof;
      transaction.updatedAt = new Date();

      // Verify delivery with farmer address for signature verification
      const verificationResult = await this.verificationAgent.verifyDelivery(
        transactionId,
        proof,
        transaction.deliveryConditions,
        transaction.farmerAddress // Pass farmer address for signature verification
      );

      // Store verification result
      transaction.verificationResult = verificationResult;
      transaction.updatedAt = new Date();

      // Log fraud score and signature validation if available
      if ('fraudScore' in verificationResult) {
        console.log(`Fraud score for ${transactionId}: ${verificationResult.fraudScore}`);
      }
      if ('signatureValid' in verificationResult) {
        console.log(`Signature valid for ${transactionId}: ${verificationResult.signatureValid}`);
      }
      if ('receiptData' in verificationResult && verificationResult.receiptData) {
        console.log(`Receipt data for ${transactionId}:`, verificationResult.receiptData);
      }

      if (verificationResult.approved) {
        // Proof approved - proceed to settlement
        await this.authorizeSettlement(transactionId);
      } else {
        // Proof rejected - process refund
        const rejectionReason = verificationResult.reasons?.join(', ') || 'Verification failed';
        await this.authorizeRefund(transactionId, rejectionReason);
      }

      return verificationResult;
    } catch (error) {
      console.error(`Failed to process delivery proof for ${transactionId}:`, error);

      // Transition to failed state
      try {
        await this.stateManager.transitionState(
          transactionId,
          TransactionState.FAILED,
          'CoordinatorAgent',
          `Proof processing error: ${(error as Error).message}`
        );
      } catch (stateError) {
        console.error(`Failed to transition to failed state:`, stateError);
      }

      throw error;
    }
  }

  /**
   * Authorizes payment settlement
   */
  async authorizeSettlement(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (!transaction.holdId) {
      throw new Error(`Transaction ${transactionId} has no hold ID`);
    }

    try {
      // Transition to settlement pending
      await this.stateManager.transitionState(
        transactionId,
        TransactionState.SETTLEMENT_PENDING,
        'CoordinatorAgent',
        'Settlement authorized'
      );

      transaction.state = TransactionState.SETTLEMENT_PENDING;
      this.transactions.set(transactionId, transaction);

      // Delegate to Payment Agent
      const paymentResult = await this.paymentAgent.releasePayment(
        transactionId,
        transaction.holdId
      );

      // Update transaction
      transaction.settlementTxHash = paymentResult.txHash;
      transaction.state = TransactionState.COMPLETED;
      transaction.completedAt = new Date();
      transaction.updatedAt = new Date();

      // Transition to completed
      await this.stateManager.transitionState(
        transactionId,
        TransactionState.COMPLETED,
        'CoordinatorAgent',
        'Settlement completed successfully'
      );

      this.transactions.set(transactionId, transaction);

      console.log(`Transaction ${transactionId} completed with settlement tx ${paymentResult.txHash}`);
    } catch (error) {
      console.error(`Failed to authorize settlement for ${transactionId}:`, error);

      // Mark as failed
      await this.stateManager.transitionState(
        transactionId,
        TransactionState.FAILED,
        'CoordinatorAgent',
        `Settlement failed: ${(error as Error).message}`
      );

      transaction.state = TransactionState.FAILED;
      this.transactions.set(transactionId, transaction);

      throw error;
    }
  }

  /**
   * Authorizes refund processing
   */
  async authorizeRefund(transactionId: string, reason: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (!transaction.holdId) {
      throw new Error(`Transaction ${transactionId} has no hold ID`);
    }

    try {
      // Delegate to Payment Agent
      const refundResult = await this.paymentAgent.processRefund(
        transactionId,
        transaction.holdId
      );

      // Update transaction
      transaction.refundTxHash = refundResult.txHash;
      transaction.state = TransactionState.REFUNDED;
      transaction.completedAt = new Date();
      transaction.updatedAt = new Date();

      // Transition to refunded
      await this.stateManager.transitionState(
        transactionId,
        TransactionState.REFUNDED,
        'CoordinatorAgent',
        reason
      );

      this.transactions.set(transactionId, transaction);

      console.log(`Transaction ${transactionId} refunded with tx ${refundResult.txHash}`);
    } catch (error) {
      console.error(`Failed to authorize refund for ${transactionId}:`, error);

      // Mark as failed
      await this.stateManager.transitionState(
        transactionId,
        TransactionState.FAILED,
        'CoordinatorAgent',
        `Refund failed: ${(error as Error).message}`
      );

      transaction.state = TransactionState.FAILED;
      this.transactions.set(transactionId, transaction);

      throw error;
    }
  }

  /**
   * Gets transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const history = await this.stateManager.getStateHistory(transactionId);

    return {
      transaction,
      state: transaction.state,
      history
    };
  }

  /**
   * Gets all transactions for an address (buyer or farmer)
   */
  async getTransactionsByAddress(address: string): Promise<Transaction[]> {
    const transactions: Transaction[] = [];

    for (const transaction of this.transactions.values()) {
      if (
        transaction.buyerAddress.toLowerCase() === address.toLowerCase() ||
        transaction.farmerAddress.toLowerCase() === address.toLowerCase()
      ) {
        transactions.push(transaction);
      }
    }

    return transactions;
  }
}
