import { Router, Request, Response } from 'express';
import { CoordinatorAgent } from '../agents/CoordinatorAgent';
import { formatErrorResponse, ValidationError, TransactionNotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { EscrowRequest, DeliveryProof } from '../models/types';

export function createRouter(coordinatorAgent: CoordinatorAgent): Router {
  const router = Router();

  /**
   * POST /api/v1/escrow
   * Create a new escrow transaction
   */
  router.post('/escrow', async (req: Request, res: Response) => {
    try {
      const request: EscrowRequest = req.body;

      // Validate request
      if (!request.buyerAddress || !request.farmerAddress || !request.amount || !request.deliveryConditions) {
        throw new ValidationError('Missing required fields', {
          required: ['buyerAddress', 'farmerAddress', 'amount', 'deliveryConditions']
        });
      }

      logger.info('Creating escrow transaction', {
        buyerAddress: request.buyerAddress,
        farmerAddress: request.farmerAddress,
        amount: request.amount
      });

      const transaction = await coordinatorAgent.initializeTransaction(request);

      res.status(201).json({
        transactionId: transaction.id,
        status: transaction.state,
        holdId: transaction.holdId
      });
    } catch (error) {
      logger.error('Failed to create escrow', {}, error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      res.status(400).json(errorResponse);
    }
  });

  /**
   * POST /api/v1/escrow/:transactionId/proof
   * Submit delivery proof for a transaction
   */
  router.post('/escrow/:transactionId/proof', async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;
      const proof: DeliveryProof = req.body;

      // Validate proof
      if (!proof.proofType || !proof.timestamp || !proof.data) {
        throw new ValidationError('Invalid proof format', {
          required: ['proofType', 'timestamp', 'data']
        });
      }

      // Convert timestamp string to Date if needed
      if (typeof proof.timestamp === 'string') {
        proof.timestamp = new Date(proof.timestamp);
      }

      logger.info('Processing delivery proof', {
        transactionId,
        proofType: proof.proofType
      });

      const verificationResult = await coordinatorAgent.processDeliveryProof(transactionId, proof);

      res.status(200).json({
        verificationResult,
        status: verificationResult.approved ? 'approved' : 'rejected'
      });
    } catch (error) {
      logger.error('Failed to process delivery proof', { transactionId: req.params.transactionId }, error as Error);
      const errorResponse = formatErrorResponse(error as Error, req.params.transactionId);
      res.status(400).json(errorResponse);
    }
  });

  /**
   * GET /api/v1/escrow/:transactionId
   * Query transaction by ID
   */
  router.get('/escrow/:transactionId', async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;

      logger.info('Querying transaction', { transactionId });

      const status = await coordinatorAgent.getTransactionStatus(transactionId);

      res.status(200).json(status);
    } catch (error) {
      logger.error('Failed to query transaction', { transactionId: req.params.transactionId }, error as Error);

      if ((error as Error).message.includes('not found')) {
        const errorResponse = formatErrorResponse(
          new TransactionNotFoundError(req.params.transactionId)
        );
        res.status(404).json(errorResponse);
      } else {
        const errorResponse = formatErrorResponse(error as Error, req.params.transactionId);
        res.status(500).json(errorResponse);
      }
    }
  });

  /**
   * GET /api/v1/escrow/address/:address
   * Query transactions by address (buyer or farmer)
   */
  router.get('/escrow/address/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      logger.info('Querying transactions by address', { address });

      const transactions = await coordinatorAgent.getTransactionsByAddress(address);

      res.status(200).json({
        transactions
      });
    } catch (error) {
      logger.error('Failed to query transactions by address', { address: req.params.address }, error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      res.status(500).json(errorResponse);
    }
  });

  return router;
}
