-- Add updated_at column to contract_approval_requests table if it doesn't exist
ALTER TABLE contract_approval_requests 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for contract_approval_requests table
DROP TRIGGER IF EXISTS update_contract_approval_requests_updated_at ON contract_approval_requests;
CREATE TRIGGER update_contract_approval_requests_updated_at
    BEFORE UPDATE ON contract_approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 