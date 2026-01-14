import { Pool, PoolClient } from 'pg';
import { Transaction, StateTransition, TransactionState } from '../models/types';
import { logger } from '../utils/logger';

export class DatabaseClient {
  private pool: Pool;

  constructor(config?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  }) {
    this.pool = new Pool({
      host: config?.host || process.env.DATABASE_HOST || 'localhost',
      port: config?.port || parseInt(process.env.DATABASE_PORT || '5432'),
      database: config?.database || process.env.DATABASE_NAME || 'kopa_agent',
      user: config?.user || process.env.DATABASE_USER || 'postgres',
      password: config?.password || process.env.DATABASE_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', {}, err);
    });
  }

  /**
   * Saves a transaction to the database
   */
  async saveTransaction(transaction: Transaction): Promise<void> {
    const query = `
      INSERT INTO transactions (
        id, buyer_address, farmer_address, amount, delivery_conditions,
        state, hold_id, delivery_proof, verification_result,
        settlement_tx_hash, refund_tx_hash, created_at, updated_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        state = EXCLUDED.state,
        hold_id = EXCLUDED.hold_id,
        delivery_proof = EXCLUDED.delivery_proof,
        verification_result = EXCLUDED.verification_result,
        settlement_tx_hash = EXCLUDED.settlement_tx_hash,
        refund_tx_hash = EXCLUDED.refund_tx_hash,
        updated_at = EXCLUDED.updated_at,
        completed_at = EXCLUDED.completed_at
    `;

    const values = [
      transaction.id,
      transaction.buyerAddress,
      transaction.farmerAddress,
      transaction.amount,
      JSON.stringify(transaction.deliveryConditions),
      transaction.state,
      transaction.holdId,
      transaction.deliveryProof ? JSON.stringify(transaction.deliveryProof) : null,
      transaction.verificationResult ? JSON.stringify(transaction.verificationResult) : null,
      transaction.settlementTxHash,
      transaction.refundTxHash,
      transaction.createdAt,
      transaction.updatedAt,
      transaction.completedAt
    ];

    try {
      await this.pool.query(query, values);
      logger.debug('Transaction saved to database', { transactionId: transaction.id });
    } catch (error) {
      logger.error('Failed to save transaction', { transactionId: transaction.id }, error as Error);
      throw error;
    }
  }

  /**
   * Gets a transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const query = 'SELECT * FROM transactions WHERE id = $1';

    try {
      const result = await this.pool.query(query, [transactionId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get transaction', { transactionId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets all transactions for an address
   */
  async getTransactionsByAddress(address: string): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions
      WHERE LOWER(buyer_address) = LOWER($1) OR LOWER(farmer_address) = LOWER($1)
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [address]);
      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      logger.error('Failed to get transactions by address', { address }, error as Error);
      throw error;
    }
  }

  /**
   * Saves a state transition
   */
  async saveStateTransition(transition: StateTransition): Promise<void> {
    const query = `
      INSERT INTO state_transitions (
        transaction_id, from_state, to_state, timestamp, triggered_by, reason
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      transition.transactionId,
      transition.fromState,
      transition.toState,
      transition.timestamp,
      transition.triggeredBy,
      transition.reason
    ];

    try {
      await this.pool.query(query, values);
      logger.debug('State transition saved', { transactionId: transition.transactionId });
    } catch (error) {
      logger.error('Failed to save state transition', { transactionId: transition.transactionId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets state transition history for a transaction
   */
  async getStateHistory(transactionId: string): Promise<StateTransition[]> {
    const query = `
      SELECT * FROM state_transitions
      WHERE transaction_id = $1
      ORDER BY timestamp ASC
    `;

    try {
      const result = await this.pool.query(query, [transactionId]);

      return result.rows.map(row => ({
        transactionId: row.transaction_id,
        fromState: row.from_state as TransactionState,
        toState: row.to_state as TransactionState,
        timestamp: row.timestamp,
        triggeredBy: row.triggered_by,
        reason: row.reason
      }));
    } catch (error) {
      logger.error('Failed to get state history', { transactionId }, error as Error);
      throw error;
    }
  }

  /**
   * Executes a database transaction
   */
  async executeTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Closes the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  /**
   * Maps a database row to a Transaction object
   */
  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      buyerAddress: row.buyer_address,
      farmerAddress: row.farmer_address,
      amount: row.amount,
      deliveryConditions: row.delivery_conditions,
      state: row.state as TransactionState,
      holdId: row.hold_id,
      deliveryProof: row.delivery_proof,
      verificationResult: row.verification_result,
      settlementTxHash: row.settlement_tx_hash,
      refundTxHash: row.refund_tx_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }
}
