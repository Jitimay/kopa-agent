  # Implementation Plan: KOPA Agent

## Overview

This implementation plan breaks down the KOPA Agent autonomous escrow system into discrete, incremental coding tasks. The approach follows a bottom-up strategy: first establishing core data models and state management, then implementing individual agents, followed by integration and API layer, and finally comprehensive testing. Each task builds on previous work to ensure no orphaned code.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize TypeScript Node.js project with proper configuration
  - Install dependencies: fast-check, jest, ethers.js, express, pg (PostgreSQL client)
  - Set up database schema and migrations
  - Configure testing framework (Jest) with TypeScript support
  - _Requirements: All (foundational)_

- [x] 2. Implement core data models and types
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define Transaction, DeliveryProof, DeliveryConditions, VerificationResult interfaces
    - Define EscrowRequest, EscrowHoldResult, PaymentResult, RefundResult interfaces
    - Define TransactionState enum and StateTransition interface
    - _Requirements: 1.3, 6.1-6.5_
  
  - [ ]* 2.2 Write property test for data model completeness
    - **Property: Data Model Completeness** - For any transaction created, all required fields should be present and properly typed
    - **Validates: Requirements 1.3**

- [x] 3. Implement Transaction State Manager
  - [x] 3.1 Create TransactionStateManager class
    - Implement state transition validation logic with VALID_TRANSITIONS map
    - Implement transitionState() method with validation
    - Implement getTransactionState() method
    - Add database persistence for state transitions
    - _Requirements: 6.1-6.6_
  
  - [ ]* 3.2 Write property test for state transition validity
    - **Property 9: State Transition Validity** - For any transaction, all state transitions should follow valid transition rules
    - **Validates: Requirements 6.6**
  
  - [ ]* 3.3 Write unit tests for state manager edge cases
    - Test invalid state transitions are rejected
    - Test state transition history is recorded
    - _Requirements: 6.6_

- [x] 4. Implement Payment Agent
  - [x] 4.1 Create PaymentAgent class with x402 integration
    - Implement createEscrowHold() method with x402 Facilitator calls
    - Implement releasePayment() method with x402 release logic
    - Implement processRefund() method with x402 refund logic
    - Implement verifyOnChainConfirmation() method
    - Implement retry logic with exponential backoff
    - _Requirements: 1.2, 4.2, 4.3, 5.2, 5.3, 8.1-8.5, 10.2_
  
  - [ ]* 4.2 Write property test for x402 integration
    - **Property 12: x402 Integration** - For any escrow/release/refund operation, Payment_Agent should invoke x402 and verify confirmation
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
  
  - [ ]* 4.3 Write property test for retry with exponential backoff
    - **Property 13: Retry with Exponential Backoff** - For any failed x402 transaction, retry up to 3 times with exponential backoff
    - **Validates: Requirements 8.5, 10.2, 10.3**
  
  - [ ]* 4.4 Write unit tests for Payment Agent error cases
    - Test insufficient balance rejection
    - Test blockchain transaction failures
    - _Requirements: 1.5, 8.5_

- [x] 5. Implement Verification Agent
  - [x] 5.1 Create VerificationAgent class
    - Implement verifyDelivery() method with proof validation logic
    - Implement checkProofAuthenticity() helper method
    - Implement evaluateConditions() helper method
    - Return VerificationResult with approval/rejection and reasons
    - _Requirements: 3.1-3.4_
  
  - [ ]* 5.2 Write property test for verification outcome notification
    - **Property 6: Verification Outcome Notification** - For any completed verification, notify Coordinator with approval or rejection
    - **Validates: Requirements 3.3, 3.4**
  
  - [ ]* 5.3 Write property test for invalid proof rejection
    - **Property 4: Invalid Proof Rejection** - For any invalid/incomplete proof, reject without state change
    - **Validates: Requirements 2.2, 2.4**
  
  - [ ]* 5.4 Write unit tests for verification edge cases
    - Test various proof types (QR, receipt, confirmation)
    - Test missing required fields
    - Test expired proofs
    - _Requirements: 2.2, 2.4, 3.1_

- [x] 6. Implement Coordinator Agent
  - [x] 6.1 Create CoordinatorAgent class with orchestration logic
    - Implement initializeTransaction() method
    - Implement processDeliveryProof() method with delegation to Verification Agent
    - Implement authorizeSettlement() method with delegation to Payment Agent
    - Implement authorizeRefund() method with delegation to Payment Agent
    - Implement getTransactionStatus() method
    - Add transaction context management
    - _Requirements: 1.1, 2.5, 4.1, 5.1, 7.2, 7.3, 7.5_
  
  - [ ]* 6.2 Write property test for escrow creation completeness
    - **Property 1: Escrow Creation Completeness** - For any valid request with sufficient balance, create complete escrow
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 6.1**
  
  - [ ]* 6.3 Write property test for agent delegation
    - **Property 10: Agent Delegation** - For any transaction, Coordinator should delegate to Verification and Payment agents appropriately
    - **Validates: Requirements 7.2, 7.3**
  
  - [ ]* 6.4 Write property test for transaction context preservation
    - **Property 11: Transaction Context Preservation** - For any multi-agent transaction, context should remain consistent
    - **Validates: Requirements 7.5**

- [x] 7. Checkpoint - Ensure core agents work together
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement complete transaction flows
  - [x] 8.1 Implement settlement flow integration
    - Wire Coordinator → Verification → Payment agents for successful delivery
    - Ensure state transitions from verification_pending → settlement_pending → completed
    - Persist settlement metadata (timestamp, tx hash)
    - _Requirements: 4.1-4.5, 6.3, 6.4_
  
  - [ ]* 8.2 Write property test for settlement execution completeness
    - **Property 7: Settlement Execution Completeness** - For any approved verification, complete settlement flow should execute
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 6.4**
  
  - [x] 8.3 Implement refund flow integration
    - Wire Coordinator → Verification → Payment agents for rejected delivery
    - Ensure state transitions from verification_pending → refunded
    - Persist refund metadata (reason, timestamp)
    - _Requirements: 5.1-5.5, 6.5_
  
  - [ ]* 8.4 Write property test for refund execution completeness
    - **Property 8: Refund Execution Completeness** - For any rejected verification, complete refund flow should execute
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.5**

- [x] 9. Implement delivery proof handling
  - [x] 9.1 Add delivery proof submission logic
    - Implement proof validation and association with transaction
    - Trigger state transition to verification_pending
    - Initiate verification process
    - _Requirements: 2.1-2.5, 6.2_
  
  - [ ]* 9.2 Write property test for delivery proof association
    - **Property 3: Delivery Proof Association** - For any valid proof, associate with transaction and transition state
    - **Validates: Requirements 2.1, 2.3, 2.5, 6.2**
  
  - [ ]* 9.3 Write property test for verification triggers state update
    - **Property 5: Verification Triggers State Update** - For any verification completion, update state and persist result
    - **Validates: Requirements 3.1, 3.2, 3.5**

- [x] 10. Implement transaction query functionality
  - [x] 10.1 Create query methods in Coordinator Agent
    - Implement queryByTransactionId() method
    - Implement queryByAddress() method (buyer or farmer)
    - Return complete transaction data with state and timestamps
    - Handle non-existent transaction IDs gracefully
    - _Requirements: 9.1-9.4_
  
  - [ ]* 10.2 Write property test for transaction query by ID
    - **Property 14: Transaction Query by ID** - For any existing transaction ID, return complete data
    - **Validates: Requirements 9.1, 9.3**
  
  - [ ]* 10.3 Write property test for transaction query by address
    - **Property 15: Transaction Query by Address** - For any address, return all associated transactions
    - **Validates: Requirements 9.2, 9.3**
  
  - [ ]* 10.4 Write property test for non-existent transaction query
    - **Property 16: Non-existent Transaction Query** - For any non-existent ID, return not found error
    - **Validates: Requirements 9.4**

- [x] 11. Implement error handling and logging
  - [x] 11.1 Add comprehensive error logging
    - Implement error logging with full context (transaction ID, agent, operation, timestamp)
    - Add structured logging for all agent operations
    - Implement error response formatting
    - _Requirements: 10.1_
  
  - [ ]* 11.2 Write property test for error logging completeness
    - **Property 17: Error Logging Completeness** - For any failed operation, log with full context
    - **Validates: Requirements 10.1**
  
  - [x] 11.3 Implement agent failure detection and recovery
    - Add timeout detection for agent operations
    - Implement circuit breaker pattern for agent communication
    - Add recovery logic or failure state transitions
    - _Requirements: 10.3, 10.4_
  
  - [ ]* 11.4 Write property test for agent failure detection
    - **Property 18: Agent Failure Detection** - For any unavailable agent, detect failure and attempt recovery
    - **Validates: Requirements 10.4**

- [x] 12. Checkpoint - Ensure error handling works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement REST API layer
  - [x] 13.1 Create Express API server with endpoints
    - POST /api/v1/escrow - Create escrow endpoint
    - POST /api/v1/escrow/:transactionId/proof - Submit delivery proof endpoint
    - GET /api/v1/escrow/:transactionId - Query transaction by ID endpoint
    - GET /api/v1/escrow/address/:address - Query by address endpoint
    - Add input validation middleware
    - Add error handling middleware
    - Wire endpoints to Coordinator Agent
    - _Requirements: All (API layer)_
  
  - [ ]* 13.2 Write integration tests for API endpoints
    - Test complete end-to-end flows through API
    - Test error responses and validation
    - _Requirements: All_

- [x] 14. Add database persistence layer
  - [x] 14.1 Implement database operations
    - Create database client with connection pooling
    - Implement transaction CRUD operations
    - Implement state transition logging
    - Add database transaction support for atomic operations
    - _Requirements: 1.3, 6.1-6.5_
  
  - [ ]* 14.2 Write unit tests for database operations
    - Test transaction persistence
    - Test state transition history
    - Test query operations
    - _Requirements: 1.3, 6.1-6.5, 9.1-9.4_

- [x] 15. Implement test data generators for property tests
  - [x] 15.1 Create fast-check generators
    - Implement ethereumAddress generator
    - Implement usdcAmount generator
    - Implement validDeliveryProof generator
    - Implement transactionState generator
    - Implement escrowRequest generator
    - _Requirements: All (testing infrastructure)_

- [x] 16. Final integration and end-to-end testing
  - [x] 16.1 Wire all components together
    - Ensure API → Coordinator → Verification/Payment → x402 flow works
    - Ensure database persistence works across all operations
    - Ensure error handling propagates correctly
    - _Requirements: All_
  
  - [ ]* 16.2 Write end-to-end integration tests
    - Test complete successful escrow → delivery → settlement flow
    - Test complete escrow → delivery → refund flow
    - Test error scenarios and recovery
    - _Requirements: All_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Run complete test suite (unit + property + integration)
  - Verify all 18 correctness properties are tested
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Checkpoints ensure incremental validation at key milestones
- All code should be written in TypeScript with proper type safety
- x402 Facilitator integration may require mocking for initial development
