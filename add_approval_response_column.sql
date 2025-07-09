-- Add approval_response column to contract_approval_requests table
ALTER TABLE contract_approval_requests 
ADD COLUMN IF NOT EXISTS approval_response TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN contract_approval_requests.approval_response IS 'Custom approval response message that will be sent when approving/rejecting the request'; 