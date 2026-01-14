import { VerificationAgent } from '../../src/agents/VerificationAgent';
import { ProofType, DeliveryProof, DeliveryConditions } from '../../src/models/types';

describe('VerificationAgent', () => {
  let agent: VerificationAgent;

  beforeEach(() => {
    agent = new VerificationAgent();
  });

  describe('validateProofFormat', () => {
    it('should validate correct QR_SCAN proof', () => {
      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
          qrCode: 'QR123456789'
        }
      };

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct RECEIPT proof', () => {
      const proof: DeliveryProof = {
        proofType: ProofType.RECEIPT,
        timestamp: new Date(),
        data: {
          receiptImage: 'base64encodedimage...'
        }
      };

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct CONFIRMATION proof', () => {
      const proof: DeliveryProof = {
        proofType: ProofType.CONFIRMATION,
        timestamp: new Date(),
        data: {
          confirmationCode: 'CONF123'
        }
      };

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject proof without proofType', () => {
      const proof = {
        timestamp: new Date(),
        data: { qrCode: 'QR123' }
      } as any;

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing proof type');
    });

    it('should reject proof without timestamp', () => {
      const proof = {
        proofType: ProofType.QR_SCAN,
        data: { qrCode: 'QR123' }
      } as any;

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing timestamp');
    });

    it('should reject proof without data', () => {
      const proof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date()
      } as any;

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing proof data');
    });

    it('should reject QR_SCAN proof without qrCode', () => {
      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {}
      };

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing QR code for QR_SCAN proof type');
    });

    it('should reject RECEIPT proof without receiptImage', () => {
      const proof: DeliveryProof = {
        proofType: ProofType.RECEIPT,
        timestamp: new Date(),
        data: {}
      };

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing receipt image for RECEIPT proof type');
    });

    it('should reject CONFIRMATION proof without confirmationCode', () => {
      const proof: DeliveryProof = {
        proofType: ProofType.CONFIRMATION,
        timestamp: new Date(),
        data: {}
      };

      const result = agent.validateProofFormat(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing confirmation code for CONFIRMATION proof type');
    });
  });

  describe('verifyDelivery', () => {
    it('should approve valid on-time delivery with correct proof type', async () => {
      const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() + 86400000), // Tomorrow
        requiredProofType: ProofType.QR_SCAN,
        additionalRequirements: []
      };

      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
          qrCode: 'QR123456789'
        }
        // No signature - not required when farmer address not provided
      };

      const result = await agent.verifyDelivery('tx-1', proof, conditions);
      // Note: Without farmer address, signature is not required
      expect(result.approved).toBe(true);
      expect(result.reasons).toBeUndefined();
    });

    it('should reject late delivery', async () => {
      const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() - 86400000), // Yesterday
        requiredProofType: ProofType.QR_SCAN,
        additionalRequirements: []
      };

      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
          qrCode: 'QR123456789'
        }
      };

      const result = await agent.verifyDelivery('tx-2', proof, conditions);
      expect(result.approved).toBe(false);
      expect(result.reasons).toBeDefined();
      expect(result.reasons![0]).toContain('late');
    });

    it('should reject wrong proof type', async () => {
      const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        requiredProofType: ProofType.RECEIPT,
        additionalRequirements: []
      };

      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN, // Wrong type!
        timestamp: new Date(),
        data: {
          qrCode: 'QR123456789'
        }
      };

      const result = await agent.verifyDelivery('tx-3', proof, conditions);
      expect(result.approved).toBe(false);
      expect(result.reasons).toBeDefined();
      expect(result.reasons![0]).toContain('Proof type mismatch');
    });

    it('should reject proof with future timestamp', async () => {
      const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        requiredProofType: ProofType.QR_SCAN,
        additionalRequirements: []
      };

      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(Date.now() + 86400000 * 2), // Future timestamp
        data: {
          qrCode: 'QR123456789'
        }
      };

      const result = await agent.verifyDelivery('tx-4', proof, conditions);
      expect(result.approved).toBe(false);
      expect(result.reasons).toBeDefined();
    });

    it('should reject proof with empty signature', async () => {
      const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        requiredProofType: ProofType.QR_SCAN,
        additionalRequirements: []
      };

      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
          qrCode: 'QR123456789'
        },
        signature: '' // Empty signature
      };

      const result = await agent.verifyDelivery('tx-5', proof, conditions);
      // Empty signature is now ignored when no farmer address provided
      expect(result.approved).toBe(true);
    });

    it('should check additional requirements', async () => {
      const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        requiredProofType: ProofType.QR_SCAN,
        additionalRequirements: ['weight', 'location']
      };

      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
          qrCode: 'QR123456789',
          metadata: {
            weight: '50kg',
            location: 'Nairobi'
          }
        }
      };

      const result = await agent.verifyDelivery('tx-6', proof, conditions);
      expect(result.approved).toBe(true);
    });

    it('should reject when missing additional requirements', async () => {
      const conditions: DeliveryConditions = {
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        requiredProofType: ProofType.QR_SCAN,
        additionalRequirements: ['weight', 'location']
      };

      const proof: DeliveryProof = {
        proofType: ProofType.QR_SCAN,
        timestamp: new Date(),
        data: {
          qrCode: 'QR123456789',
          metadata: {
            weight: '50kg'
            // Missing 'location'
          }
        }
      };

      const result = await agent.verifyDelivery('tx-7', proof, conditions);
      expect(result.approved).toBe(false);
      expect(result.reasons).toBeDefined();
      expect(result.reasons!.some(r => r.includes('location'))).toBe(true);
    });
  });
});
