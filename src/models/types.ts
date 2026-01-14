// Core type definitions for KOPA Agent

export enum ProofType {
  QR_SCAN = "qr_scan",
  RECEIPT = "receipt",
  CONFIRMATION = "confirmation"
}

export enum TransactionState {
  CREATED = "created",
  ESCROW_CREATED = "escrow_created",
  VERIFICATION_PENDING = "verification_pending",
  SETTLEMENT_PENDING = "settlement_pending",
  COMPLETED = "completed",
  REFUNDED = "refunded",
  FAILED = "failed"
}

export interface DeliveryConditions {
  expectedDeliveryDate: Date;
  requiredProofType: ProofType;
  additionalRequirements?: string[];
}

export interface ProofData {
  qrCode?: string;
  receiptImage?: string; // base64 encoded image
  confirmationCode?: string;
  geolocation?: { lat: number; lon: number };
  metadata?: Record<string, any>;
}

export interface DeliveryProof {
  proofType: ProofType;
  timestamp: Date;
  data: ProofData;
  signature?: string;
}

export interface VerificationResult {
  approved: boolean;
  transactionId: string;
  timestamp: Date;
  reasons?: string[];
}

export interface ReceiptData {
  merchantName?: string;
  amount?: string;
  date?: string;
  items?: string[];
  confidence: number;
}

export interface FraudDetectionResult {
  isFraudulent: boolean;
  score: number; // 0-100
  reasons: string[];
}

export interface EnhancedVerificationResult extends VerificationResult {
  fraudScore?: number;
  receiptData?: ReceiptData;
  signatureValid?: boolean;
}

export interface Transaction {
  id: string;
  buyerAddress: string;
  farmerAddress: string;
  amount: string;
  deliveryConditions: DeliveryConditions;
  state: TransactionState;
  holdId?: string;
  deliveryProof?: DeliveryProof;
  verificationResult?: VerificationResult;
  settlementTxHash?: string;
  refundTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface StateTransition {
  transactionId: string;
  fromState: TransactionState;
  toState: TransactionState;
  timestamp: Date;
  triggeredBy: string;
  reason?: string;
}

export interface EscrowRequest {
  buyerAddress: string;
  farmerAddress: string;
  amount: string;
  deliveryConditions: DeliveryConditions;
}

export interface EscrowHoldRequest {
  buyerAddress: string;
  farmerAddress: string;
  amount: string;
  transactionId: string;
}

export interface EscrowHoldResult {
  success: boolean;
  holdId: string;
  txHash: string;
  blockNumber: number;
}

export interface PaymentResult {
  success: boolean;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
}

export interface RefundResult {
  success: boolean;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
}

export interface TransactionStatus {
  transaction: Transaction;
  state: TransactionState;
  history: StateTransition[];
}

// Valid state transitions map
export const VALID_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  [TransactionState.CREATED]: [TransactionState.ESCROW_CREATED, TransactionState.FAILED],
  [TransactionState.ESCROW_CREATED]: [TransactionState.VERIFICATION_PENDING, TransactionState.FAILED],
  [TransactionState.VERIFICATION_PENDING]: [TransactionState.SETTLEMENT_PENDING, TransactionState.REFUNDED, TransactionState.FAILED],
  [TransactionState.SETTLEMENT_PENDING]: [TransactionState.COMPLETED, TransactionState.FAILED],
  [TransactionState.COMPLETED]: [],
  [TransactionState.REFUNDED]: [],
  [TransactionState.FAILED]: []
};
