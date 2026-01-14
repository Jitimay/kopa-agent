// Custom error types for KOPA Agent

export class KopaError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'KopaError';
  }
}

export class ValidationError extends KopaError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class BlockchainError extends KopaError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'BLOCKCHAIN_ERROR', details);
    this.name = 'BlockchainError';
  }
}

export class AgentCommunicationError extends KopaError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AGENT_COMMUNICATION_ERROR', details);
    this.name = 'AgentCommunicationError';
  }
}

export class StateTransitionError extends KopaError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'STATE_TRANSITION_ERROR', details);
    this.name = 'StateTransitionError';
  }
}

export class TransactionNotFoundError extends KopaError {
  constructor(transactionId: string) {
    super(
      `Transaction ${transactionId} not found`,
      'TRANSACTION_NOT_FOUND',
      { transactionId }
    );
    this.name = 'TransactionNotFoundError';
  }
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    transactionId?: string;
    timestamp: Date;
  };
}

export function formatErrorResponse(error: Error, transactionId?: string): ErrorResponse {
  if (error instanceof KopaError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        transactionId,
        timestamp: new Date()
      }
    };
  }

  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message,
      transactionId,
      timestamp: new Date()
    }
  };
}
