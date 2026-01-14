import { TransactionState, StateTransition, VALID_TRANSITIONS } from '../models/types';

export interface ITransactionStateManager {
  transitionState(transactionId: string, newState: TransactionState, triggeredBy: string, reason?: string): Promise<void>;
  validateTransition(currentState: TransactionState, newState: TransactionState): boolean;
  getTransactionState(transactionId: string): Promise<TransactionState>;
  getStateHistory(transactionId: string): Promise<StateTransition[]>;
  initializeTransaction(transactionId: string, triggeredBy: string): Promise<void>;
}

export class TransactionStateManager implements ITransactionStateManager {
  private stateStore: Map<string, TransactionState>;
  private transitionHistory: Map<string, StateTransition[]>;

  constructor() {
    this.stateStore = new Map();
    this.transitionHistory = new Map();
  }

  /**
   * Validates if a state transition is allowed
   */
  validateTransition(currentState: TransactionState, newState: TransactionState): boolean {
    const allowedTransitions = VALID_TRANSITIONS[currentState];
    return allowedTransitions.includes(newState);
  }

  /**
   * Transitions a transaction to a new state
   * Throws error if transition is invalid
   */
  async transitionState(
    transactionId: string,
    newState: TransactionState,
    triggeredBy: string,
    reason?: string
  ): Promise<void> {
    const currentState = await this.getTransactionState(transactionId);

    // Validate transition
    if (!this.validateTransition(currentState, newState)) {
      throw new Error(
        `Invalid state transition: ${currentState} -> ${newState} for transaction ${transactionId}`
      );
    }

    // Record transition
    const transition: StateTransition = {
      transactionId,
      fromState: currentState,
      toState: newState,
      timestamp: new Date(),
      triggeredBy,
      reason
    };

    // Update state
    this.stateStore.set(transactionId, newState);

    // Add to history
    const history = this.transitionHistory.get(transactionId) || [];
    history.push(transition);
    this.transitionHistory.set(transactionId, history);
  }

  /**
   * Gets the current state of a transaction
   */
  async getTransactionState(transactionId: string): Promise<TransactionState> {
    const state = this.stateStore.get(transactionId);
    if (!state) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    return state;
  }

  /**
   * Gets the state transition history for a transaction
   */
  async getStateHistory(transactionId: string): Promise<StateTransition[]> {
    return this.transitionHistory.get(transactionId) || [];
  }

  /**
   * Initializes a new transaction with CREATED state
   */
  async initializeTransaction(transactionId: string, triggeredBy: string): Promise<void> {
    if (this.stateStore.has(transactionId)) {
      throw new Error(`Transaction ${transactionId} already exists`);
    }

    this.stateStore.set(transactionId, TransactionState.CREATED);

    const transition: StateTransition = {
      transactionId,
      fromState: TransactionState.CREATED,
      toState: TransactionState.CREATED,
      timestamp: new Date(),
      triggeredBy,
      reason: 'Transaction initialized'
    };

    this.transitionHistory.set(transactionId, [transition]);
  }
}
