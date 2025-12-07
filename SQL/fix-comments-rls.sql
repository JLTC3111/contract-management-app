-- Fix RLS policy for contract_comments table

-- Enable RLS
ALTER TABLE contract_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view comments" ON contract_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON contract_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON contract_comments;

-- Policy for SELECT (view comments)
-- Allow authenticated users to view all comments
CREATE POLICY "Users can view comments" ON contract_comments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy for INSERT (add comments)
-- Allow authenticated users to insert comments
-- We check that the user_id in the new row matches the authenticated user
CREATE POLICY "Users can insert comments" ON contract_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE
-- Allow users to delete ONLY their own comments
CREATE POLICY "Users can delete their own comments" ON contract_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON contract_comments TO authenticated;
GRANT USAGE ON SEQUENCE contract_comments_id_seq TO authenticated;
