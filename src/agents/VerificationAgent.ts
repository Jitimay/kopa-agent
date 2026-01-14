import { createWorker } from 'tesseract.js';
import { DeliveryProof, DeliveryConditions, VerificationResult, ProofType, ReceiptData, FraudDetectionResult, EnhancedVerificationResult } from '../models/types';
import { createProofHash, createProofMessage, verifyEthereumSignature, isValidSignatureFormat } from '../utils/cryptoUtils';
import { preprocessImage, validateImageFormat } from '../utils/imageProcessor';

export class VerificationAgent {
  private proofHistory: Map<string, Set<string>> = new Map(); // transactionId -> proof hashes
  private fraudScores: Map<string, number> = new Map(); // transactionId -> fraud score

  /**
   * Verifies delivery proof against agreed conditions
   */
  async verifyDelivery(
    transactionId: string,
    proof: DeliveryProof,
    conditions: DeliveryConditions,
    farmerAddress?: string
  ): Promise<EnhancedVerificationResult> {
    const reasons: string[] = [];
    let fraudScore = 0;
    let receiptData: ReceiptData | undefined;
    let signatureValid: boolean | undefined;

    try {
      // 1. Check fraud detection
      const fraudResult = await this.detectFraud(transactionId, proof);
      fraudScore = fraudResult.score;

      if (fraudResult.isFraudulent) {
        reasons.push(...fraudResult.reasons);
      }

      // 2. Check proof authenticity (includes signature verification and image analysis)
      const authenticityResult = await this.checkProofAuthenticity(proof, farmerAddress);
      if (!authenticityResult.isAuthentic) {
        reasons.push(...authenticityResult.reasons);
      }

      signatureValid = authenticityResult.signatureValid;
      receiptData = authenticityResult.receiptData;

      // 3. Evaluate conditions
      const conditionsMet = await this.evaluateConditions(proof, conditions);
      if (!conditionsMet.success) {
        reasons.push(...conditionsMet.reasons);
      }

      const approved = !fraudResult.isFraudulent && authenticityResult.isAuthentic && conditionsMet.success;

      // Store proof hash if approved
      if (approved) {
        const proofHash = this.hashProof(proof);
        if (!this.proofHistory.has(transactionId)) {
          this.proofHistory.set(transactionId, new Set());
        }
        this.proofHistory.get(transactionId)!.add(proofHash);
      }

      return {
        approved,
        transactionId,
        timestamp: new Date(),
        reasons: approved ? undefined : reasons,
        fraudScore,
        receiptData,
        signatureValid
      };
    } catch (error) {
      console.error(`Verification failed for transaction ${transactionId}:`, error);
      return {
        approved: false,
        transactionId,
        timestamp: new Date(),
        reasons: [`Verification error: ${(error as Error).message}`],
        fraudScore: 100
      };
    }
  }

  /**
   * Checks if the proof is authentic and not forged
   */
  private async checkProofAuthenticity(
    proof: DeliveryProof,
    farmerAddress?: string
  ): Promise<{
    isAuthentic: boolean;
    reasons: string[];
    signatureValid?: boolean;
    receiptData?: ReceiptData;
  }> {
    const reasons: string[] = [];
    let signatureValid: boolean | undefined;
    let receiptData: ReceiptData | undefined;

    // Validate proof has required fields
    if (!proof.proofType || !proof.timestamp || !proof.data) {
      reasons.push('Missing required proof fields');
      return { isAuthentic: false, reasons };
    }

    // Validate proof type matches data
    switch (proof.proofType) {
      case ProofType.QR_SCAN:
        if (!proof.data.qrCode) {
          reasons.push('Missing QR code for QR_SCAN proof type');
        }
        break;
      case ProofType.RECEIPT:
        if (!proof.data.receiptImage) {
          reasons.push('Missing receipt image for RECEIPT proof type');
        } else {
          // Analyze receipt image
          try {
            receiptData = await this.analyzeReceiptImage(proof.data.receiptImage);
            if (receiptData.confidence < 70) {
              reasons.push(`Receipt image quality too low (confidence: ${receiptData.confidence}%)`);
            }
          } catch (error) {
            reasons.push(`Receipt analysis failed: ${(error as Error).message}`);
          }
        }
        break;
      case ProofType.CONFIRMATION:
        if (!proof.data.confirmationCode) {
          reasons.push('Missing confirmation code for CONFIRMATION proof type');
        }
        break;
      default:
        reasons.push('Invalid proof type');
    }

    // Validate timestamp is not in the future
    if (proof.timestamp > new Date()) {
      reasons.push('Proof timestamp is in the future');
    }

    // Validate signature if present
    if (proof.signature) {
      if (!isValidSignatureFormat(proof.signature)) {
        reasons.push('Invalid signature format');
        signatureValid = false;
      } else if (farmerAddress) {
        // Verify cryptographic signature
        const message = createProofMessage(proof.data.metadata?.transactionId || '', proof);
        signatureValid = verifyEthereumSignature(message, proof.signature, farmerAddress);

        if (!signatureValid) {
          reasons.push('Signature verification failed - signer does not match farmer address');
        }
      } else {
        // Signature present but no farmer address to verify against
        signatureValid = undefined;
      }
    } else if (farmerAddress) {
      // Signature required but not provided
      reasons.push('Signature required but not provided');
      signatureValid = false;
    }

    return {
      isAuthentic: reasons.length === 0,
      reasons,
      signatureValid,
      receiptData
    };
  }

  /**
   * Analyzes a receipt image using OCR
   */
  private async analyzeReceiptImage(base64Image: string): Promise<ReceiptData> {
    // Validate image format
    if (!validateImageFormat(base64Image)) {
      throw new Error('Invalid image format. Expected base64 encoded JPEG, PNG, or WebP');
    }

    try {
      // Preprocess image
      const processedBuffer = await preprocessImage(base64Image);

      // Initialize Tesseract worker
      const worker = await createWorker('eng');

      // Perform OCR
      const { data } = await worker.recognize(processedBuffer);
      await worker.terminate();

      // Extract relevant information from OCR text
      const text = data.text;
      const confidence = data.confidence;

      // Simple extraction logic (can be enhanced with regex patterns)
      const lines = text.split('\n').filter(line => line.trim().length > 0);

      // Try to extract merchant name (usually first few lines)
      const merchantName = lines[0] || undefined;

      // Try to extract amount (look for currency symbols or "total")
      const amountMatch = text.match(/(?:total|amount|sum)[:\s]*\$?(\d+\.?\d*)/i);
      const amount = amountMatch ? amountMatch[1] : undefined;

      // Try to extract date
      const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      const date = dateMatch ? dateMatch[1] : undefined;

      return {
        merchantName,
        amount,
        date,
        items: lines.slice(1, 5), // First few lines after merchant name
        confidence: Math.round(confidence)
      };
    } catch (error) {
      throw new Error(`OCR analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Detects potential fraud in delivery proof
   */
  private async detectFraud(
    transactionId: string,
    proof: DeliveryProof
  ): Promise<FraudDetectionResult> {
    const reasons: string[] = [];
    let score = 0;

    // 1. Check for duplicate proof (same proof used twice)
    const proofHash = this.hashProof(proof);

    // Check if this exact proof was used before in ANY transaction
    for (const [txId, hashes] of this.proofHistory.entries()) {
      if (hashes.has(proofHash)) {
        if (txId === transactionId) {
          reasons.push('Duplicate proof submission for same transaction');
          score += 100;
        } else {
          reasons.push(`Proof reused from transaction ${txId}`);
          score += 100;
        }
        break;
      }
    }

    // 2. Timestamp anomaly detection
    const now = new Date();
    const proofTime = proof.timestamp;
    const timeDiff = now.getTime() - proofTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    // Future timestamp (already checked in authenticity, but count for fraud score)
    if (proofTime > now) {
      const futureHours = (proofTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (futureHours > 24) {
        reasons.push(`Proof timestamp is ${Math.round(futureHours)} hours in the future`);
        score += 80;
      } else {
        reasons.push(`Proof timestamp is ${Math.round(futureHours)} hours in the future (minor)`);
        score += 30;
      }
    }

    // Very old proof (>30 days)
    if (daysDiff > 30) {
      reasons.push(`Proof is ${Math.round(daysDiff)} days old`);
      score += 75; // Increased to trigger rejection
    }

    // 3. Geolocation validation (if available)
    if (proof.data.geolocation && proof.data.metadata?.expectedLocation) {
      const { lat, lon } = proof.data.geolocation;
      const { lat: expectedLat, lon: expectedLon } = proof.data.metadata.expectedLocation;

      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(lat, lon, expectedLat, expectedLon);

      if (distance > 100) { // More than 100km away
        reasons.push(`Delivery location ${Math.round(distance)}km from expected location`);
        score += 75; // Increased to trigger rejection
      }
    }

    // 4. Suspicious patterns
    // Check if proof data looks too generic or template-like
    if (proof.proofType === ProofType.QR_SCAN && proof.data.qrCode) {
      // Very short QR codes might be suspicious
      if (proof.data.qrCode.length < 8) {
        reasons.push('QR code appears too short to be valid');
        score += 40;
      }
    }

    // Cap fraud score at 100
    score = Math.min(score, 100);

    return {
      isFraudulent: score > 70,
      score,
      reasons
    };
  }

  /**
   * Creates a deterministic hash of a proof for duplicate detection
   */
  private hashProof(proof: DeliveryProof): string {
    return createProofHash(proof);
  }

  /**
   * Calculates distance between two coordinates in kilometers (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Converts degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Evaluates if the proof meets the delivery conditions
   */
  private async evaluateConditions(
    proof: DeliveryProof,
    conditions: DeliveryConditions
  ): Promise<{ success: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    // Check proof type matches required type
    if (proof.proofType !== conditions.requiredProofType) {
      reasons.push(
        `Proof type mismatch: expected ${conditions.requiredProofType}, got ${proof.proofType}`
      );
    }

    // Check delivery is not too late
    if (proof.timestamp > conditions.expectedDeliveryDate) {
      const daysLate = Math.ceil(
        (proof.timestamp.getTime() - conditions.expectedDeliveryDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      reasons.push(`Delivery is ${daysLate} day(s) late`);
    }

    // Check additional requirements if any
    if (conditions.additionalRequirements && conditions.additionalRequirements.length > 0) {
      for (const requirement of conditions.additionalRequirements) {
        if (!proof.data.metadata || !proof.data.metadata[requirement]) {
          reasons.push(`Missing required metadata: ${requirement}`);
        }
      }
    }

    return {
      success: reasons.length === 0,
      reasons
    };
  }

  /**
   * Validates proof format and completeness
   */
  validateProofFormat(proof: DeliveryProof): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!proof.proofType) {
      errors.push('Missing proof type');
    }

    if (!proof.timestamp) {
      errors.push('Missing timestamp');
    }

    if (!proof.data) {
      errors.push('Missing proof data');
    } else {
      // Validate data based on proof type
      switch (proof.proofType) {
        case ProofType.QR_SCAN:
          if (!proof.data.qrCode) {
            errors.push('Missing QR code for QR_SCAN proof type');
          }
          break;
        case ProofType.RECEIPT:
          if (!proof.data.receiptImage) {
            errors.push('Missing receipt image for RECEIPT proof type');
          }
          break;
        case ProofType.CONFIRMATION:
          if (!proof.data.confirmationCode) {
            errors.push('Missing confirmation code for CONFIRMATION proof type');
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
