import { ethers } from 'ethers';
import { DeliveryProof } from '../models/types';

/**
 * Creates a deterministic hash of a delivery proof for duplicate detection
 */
export function createProofHash(proof: DeliveryProof): string {
    // Create a deterministic string representation of the proof
    const proofString = JSON.stringify({
        proofType: proof.proofType,
        timestamp: proof.timestamp.toISOString(),
        data: proof.data
    });

    // Return keccak256 hash
    return ethers.keccak256(ethers.toUtf8Bytes(proofString));
}

/**
 * Creates a message to be signed by the farmer for proof verification
 */
export function createProofMessage(transactionId: string, proof: DeliveryProof): string {
    return `KOPA Delivery Proof\nTransaction: ${transactionId}\nTimestamp: ${proof.timestamp.toISOString()}\nType: ${proof.proofType}`;
}

/**
 * Verifies an Ethereum signature against an expected address
 */
export function verifyEthereumSignature(
    message: string,
    signature: string,
    expectedAddress: string
): boolean {
    try {
        // Recover the address from the signature
        const recoveredAddress = ethers.verifyMessage(message, signature);

        // Compare addresses (case-insensitive)
        return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
}

/**
 * Validates signature format (0x prefix, 132 characters)
 */
export function isValidSignatureFormat(signature: string): boolean {
    if (!signature) {
        return false;
    }

    // Check for 0x prefix and correct length (65 bytes = 130 hex chars + 0x)
    const signatureRegex = /^0x[0-9a-fA-F]{130}$/;
    return signatureRegex.test(signature);
}
