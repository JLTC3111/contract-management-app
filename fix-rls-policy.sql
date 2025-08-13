-- Fix RLS policy for contracts table
-- The error "only WITH CHECK expression allowed for INSERT" means
-- the current policy uses USING clause for INSERT, which is invalid

-- First, drop the existing policies to start fresh
DROP POLICY IF EXISTS "contracts_policy" ON contracts;
DROP POLICY IF EXISTS "Users can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete contracts" ON contracts;

-- Create correct RLS policies
-- Policy for INSERT (only WITH CHECK allowed)
CREATE POLICY "Users can insert contracts" ON contracts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for SELECT
CREATE POLICY "Users can view contracts" ON contracts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy for UPDATE 
CREATE POLICY "Users can update contracts" ON contracts
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for DELETE
CREATE POLICY "Users can delete contracts" ON contracts
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Ensure RLS is enabled
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON contracts TO authenticated;
GRANT USAGE ON SEQUENCE contracts_id_seq TO authenticated;
