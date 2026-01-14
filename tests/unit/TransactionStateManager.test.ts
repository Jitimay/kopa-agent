import { TransactionStateManager } from '../../src/state/TransactionStateManager';
import { TransactionState } from '../../src/models/types';

describe('TransactionStateManager', () => {
  let stateManager: TransactionStateManager;

  beforeEach(() => {
    stateManager = new TransactionStateManager();
  });

  describe('validateTransition', () => {
    it('should allow valid transitions', () => {
      expect(stateManager.validateTransition(
        TransactionState.CREATED,
        TransactionState.ESCROW_CREATED
      )).toBe(true);

      expect(stateManager.validateTransition(
        TransactionState.ESCROW_CREATED,
        TransactionState.VERIFICATION_PENDING
      )).toBe(true);

      expect(stateManager.validateTransition(
        TransactionState.VERIFICATION_PENDING,
        TransactionState.SETTLEMENT_PENDING
      )).toBe(true);

      expect(stateManager.validateTransition(
        TransactionState.SETTLEMENT_PENDING,
        TransactionState.COMPLETED
      )).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(stateManager.validateTransition(
        TransactionState.COMPLETED,
        TransactionState.VERIFICATION_PENDING
      )).toBe(false);

      expect(stateManager.validateTransition(
        TransactionState.REFUNDED,
        TransactionState.COMPLETED
      )).toBe(false);

      expect(stateManager.validateTransition(
        TransactionState.CREATED,
        TransactionState.COMPLETED
      )).toBe(false);
    });

    it('should allow transition to FAILED from any state', () => {
      expect(stateManager.validateTransition(
        TransactionState.CREATED,
        TransactionState.FAILED
      )).toBe(true);

      expect(stateManager.validateTransition(
        TransactionState.ESCROW_CREATED,
        TransactionState.FAILED
      )).toBe(true);

      expect(stateManager.validateTransition(
        TransactionState.VERIFICATION_PENDING,
        TransactionState.FAILED
      )).toBe(true);
    });
  });

  describe('initializeTransaction', () => {
    it('should initialize a new transaction with CREATED state', async () => {
      const transactionId = 'test-tx-1';
      await stateManager.initializeTransaction(transactionId, 'TestAgent');

      const state = await stateManager.getTransactionState(transactionId);
      expect(state).toBe(TransactionState.CREATED);
    });

    it('should throw error if transaction already exists', async () => {
      const transactionId = 'test-tx-2';
      await stateManager.initializeTransaction(transactionId, 'TestAgent');

      await expect(
        stateManager.initializeTransaction(transactionId, 'TestAgent')
      ).rejects.toThrow('already exists');
    });

    it('should record initial state transition', async () => {
      const transactionId = 'test-tx-3';
      await stateManager.initializeTransaction(transactionId, 'TestAgent');

      const history = await stateManager.getStateHistory(transactionId);
      expect(history).toHaveLength(1);
      expect(history[0].fromState).toBe(TransactionState.CREATED);
      expect(history[0].toState).toBe(TransactionState.CREATED);
      expect(history[0].triggeredBy).toBe('TestAgent');
    });
  });

  describe('transitionState', () => {
    it('should transition to valid state', async () => {
      const transactionId = 'test-tx-4';
      await stateManager.initializeTransaction(transactionId, 'TestAgent');

      await stateManager.transitionState(
        transactionId,
        TransactionState.ESCROW_CREATED,
        'TestAgent',
        'Escrow created'
      );

      const state = await stateManager.getTransactionState(transactionId);
      expect(state).toBe(TransactionState.ESCROW_CREATED);
    });

    it('should throw error for invalid transition', async () => {
      const transactionId = 'test-tx-5';
      await stateManager.initializeTransaction(transactionId, 'TestAgent');

      await expect(
        stateManager.transitionState(
          transactionId,
          TransactionState.COMPLETED,
          'TestAgent'
        )
      ).rejects.toThrow('Invalid state transition');
    });

    it('should record state transition history', async () => {
      const transactionId = 'test-tx-6';
      await stateManager.initializeTransaction(transactionId, 'TestAgent');

      await stateManager.transitionState(
        transactionId,
        TransactionState.ESCROW_CREATED,
        'TestAgent',
        'Escrow created'
      );

      await stateManager.transitionState(
        transactionId,
        TransactionState.VERIFICATION_PENDING,
        'TestAgent',
        'Proof submitted'
      );

      const history = await stateManager.getStateHistory(transactionId);
      expect(history).toHaveLength(3); // Initial + 2 transitions
      expect(history[1].fromState).toBe(TransactionState.CREATED);
      expect(history[1].toState).toBe(TransactionState.ESCROW_CREATED);
      expect(history[2].fromState).toBe(TransactionState.ESCROW_CREATED);
      expect(history[2].toState).toBe(TransactionState.VERIFICATION_PENDING);
    });
  });

  describe('getTransactionState', () => {
    it('should throw error for non-existent transaction', async () => {
      await expect(
        stateManager.getTransactionState('non-existent')
      ).rejects.toThrow('not found');
    });
  });

  describe('getStateHistory', () => {
    it('should return empty array for non-existent transaction', async () => {
      const history = await stateManager.getStateHistory('non-existent');
      expect(history).toEqual([]);
    });

    it('should return complete history in chronological order', async () => {
      const transactionId = 'test-tx-7';
      await stateManager.initializeTransaction(transactionId, 'TestAgent');

      await stateManager.transitionState(
        transactionId,
        TransactionState.ESCROW_CREATED,
        'TestAgent'
      );

      await stateManager.transitionState(
        transactionId,
        TransactionState.VERIFICATION_PENDING,
        'TestAgent'
      );

      const history = await stateManager.getStateHistory(transactionId);
      expect(history).toHaveLength(3);
      
      // Verify chronological order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].timestamp.getTime()
        );
      }
    });
  });
});
