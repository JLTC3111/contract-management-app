-- Create contract_approval_requests table
CREATE TABLE IF NOT EXISTS contract_approval_requests (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL,
  requester_id UUID NOT NULL,
  requester_email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contract_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS contract_comments (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contract_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for contract_approval_requests
CREATE POLICY "Allow all operations for authenticated users on approval requests" 
ON contract_approval_requests FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for contract_comments
CREATE POLICY "Allow all operations for authenticated users on comments" 
ON contract_comments FOR ALL 
USING (auth.role() = 'authenticated'); 