-- KOPA Agent Database Schema

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  buyer_address VARCHAR(42) NOT NULL,
  farmer_address VARCHAR(42) NOT NULL,
  amount NUMERIC(78, 0) NOT NULL,
  delivery_conditions JSONB NOT NULL,
  state VARCHAR(50) NOT NULL,
  hold_id VARCHAR(100),
  delivery_proof JSONB,
  verification_result JSONB,
  settlement_tx_hash VARCHAR(66),
  refund_tx_hash VARCHAR(66),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_address ON transactions(buyer_address);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer_address ON transactions(farmer_address);
CREATE INDEX IF NOT EXISTS idx_transactions_state ON transactions(state);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Create state_transitions table
CREATE TABLE IF NOT EXISTS state_transitions (
  id SERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  from_state VARCHAR(50) NOT NULL,
  to_state VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  triggered_by VARCHAR(100) NOT NULL,
  reason TEXT
);

-- Create indexes for state_transitions table
CREATE INDEX IF NOT EXISTS idx_state_transitions_transaction_id ON state_transitions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_timestamp ON state_transitions(timestamp);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
