import fc from 'fast-check';
import {
  ProofType,
  TransactionState,
  DeliveryConditions,
  DeliveryProof,
  EscrowRequest,
  ProofData
} from '../src/models/types';

/**
 * Generates a valid Ethereum address
 */
export const ethereumAddress = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map(hex => `0x${hex}`);

/**
 * Generates a USDC amount (6 decimals)
 */
export const usdcAmount = fc
  .bigInt({ min: 1n, max: 1000000000000n })
  .map(amount => amount.toString());

/**
 * Generates a proof type
 */
export const proofType = fc.constantFrom(
  ProofType.QR_SCAN,
  ProofType.RECEIPT,
  ProofType.CONFIRMATION
);

/**
 * Generates proof data based on proof type
 */
export const proofData = (type: ProofType): fc.Arbitrary<ProofData> => {
  switch (type) {
    case ProofType.QR_SCAN:
      return fc.record({
        qrCode: fc.string({ minLength: 10, maxLength: 100 }),
        receiptImage: fc.constant(undefined),
        confirmationCode: fc.constant(undefined),
        metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
      });
    case ProofType.RECEIPT:
      return fc.record({
        qrCode: fc.constant(undefined),
        receiptImage: fc.string({ minLength: 20, maxLength: 200 }),
        confirmationCode: fc.constant(undefined),
        metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
      });
    case ProofType.CONFIRMATION:
      return fc.record({
        qrCode: fc.constant(undefined),
        receiptImage: fc.constant(undefined),
        confirmationCode: fc.string({ minLength: 6, maxLength: 20 }),
        metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
      });
  }
};

/**
 * Generates delivery conditions
 */
export const deliveryConditions: fc.Arbitrary<DeliveryConditions> = fc.record({
  expectedDeliveryDate: fc.date({
    min: new Date('2024-01-01'),
    max: new Date('2026-12-31')
  }),
  requiredProofType: proofType,
  additionalRequirements: fc.option(fc.array(fc.string(), { minLength: 0, maxLength: 3 }))
});

/**
 * Generates a valid delivery proof
 */
export const validDeliveryProof: fc.Arbitrary<DeliveryProof> = proofType.chain(type =>
  fc.record({
    proofType: fc.constant(type),
    timestamp: fc.date({
      min: new Date('2024-01-01'),
      max: new Date()
    }),
    data: proofData(type),
    signature: fc.option(fc.hexaString({ minLength: 128, maxLength: 128 }))
  })
);

/**
 * Generates an invalid delivery proof (missing required fields)
 */
export const invalidDeliveryProof: fc.Arbitrary<Partial<DeliveryProof>> = fc.oneof(
  // Missing proofType
  fc.record({
    timestamp: fc.date(),
    data: fc.record({
      qrCode: fc.option(fc.string())
    })
  }),
  // Missing timestamp
  fc.record({
    proofType: proofType,
    data: fc.record({
      qrCode: fc.option(fc.string())
    })
  }),
  // Missing data
  fc.record({
    proofType: proofType,
    timestamp: fc.date()
  })
);

/**
 * Generates a transaction state
 */
export const transactionState = fc.constantFrom(
  TransactionState.CREATED,
  TransactionState.ESCROW_CREATED,
  TransactionState.VERIFICATION_PENDING,
  TransactionState.SETTLEMENT_PENDING,
  TransactionState.COMPLETED,
  TransactionState.REFUNDED,
  TransactionState.FAILED
);

/**
 * Generates an escrow request
 */
export const escrowRequest: fc.Arbitrary<EscrowRequest> = fc.record({
  buyerAddress: ethereumAddress,
  farmerAddress: ethereumAddress,
  amount: usdcAmount,
  deliveryConditions: deliveryConditions
});

/**
 * Generates an escrow request with insufficient balance
 * (amount larger than typical balance)
 */
export const escrowRequestWithInsufficientBalance: fc.Arbitrary<EscrowRequest> = fc.record({
  buyerAddress: ethereumAddress,
  farmerAddress: ethereumAddress,
  amount: fc.bigInt({ min: 10000000000000n, max: 100000000000000n }).map(n => n.toString()),
  deliveryConditions: deliveryConditions
});

/**
 * Generates a late delivery proof (after expected delivery date)
 */
export const lateDeliveryProof = (conditions: DeliveryConditions): fc.Arbitrary<DeliveryProof> => {
  return proofType.chain(type =>
    fc.record({
      proofType: fc.constant(type),
      timestamp: fc.date({
        min: new Date(conditions.expectedDeliveryDate.getTime() + 86400000), // 1 day after
        max: new Date(conditions.expectedDeliveryDate.getTime() + 86400000 * 30) // Up to 30 days after
      }),
      data: proofData(type),
      signature: fc.option(fc.hexaString({ minLength: 128, maxLength: 128 }))
    })
  );
};

/**
 * Generates a proof with wrong type (doesn't match conditions)
 */
export const wrongTypeProof = (conditions: DeliveryConditions): fc.Arbitrary<DeliveryProof> => {
  const wrongTypes = [ProofType.QR_SCAN, ProofType.RECEIPT, ProofType.CONFIRMATION]
    .filter(t => t !== conditions.requiredProofType);

  return fc.constantFrom(...wrongTypes).chain(type =>
    fc.record({
      proofType: fc.constant(type),
      timestamp: fc.date({
        min: new Date('2024-01-01'),
        max: conditions.expectedDeliveryDate
      }),
      data: proofData(type),
      signature: fc.option(fc.hexaString({ minLength: 128, maxLength: 128 }))
    })
  );
};
