-- Add foreign key constraints to contract_approval_requests table
ALTER TABLE contract_approval_requests 
ADD CONSTRAINT fk_contract_approval_requests_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Add foreign key constraints to contract_comments table
ALTER TABLE contract_comments 
ADD CONSTRAINT fk_contract_comments_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Add foreign key constraints for user references (if users table exists)
-- Note: This assumes you have a users table with id as UUID
-- If your users table structure is different, adjust accordingly
ALTER TABLE contract_approval_requests 
ADD CONSTRAINT fk_contract_approval_requests_requester_id 
FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE contract_comments 
ADD CONSTRAINT fk_contract_comments_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; 