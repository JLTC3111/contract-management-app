-- SQL function to automatically update contract statuses based on expiry dates
-- This should be created as an RPC function in your Supabase database
--
-- Expiration Warning Timeframes:
-- - Draft contracts: 21 days before expiry
-- - Pending contracts: 14 days before expiry  
-- - Approved/Rejected contracts: 7 days before expiry

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT false,
  UNIQUE(user_id, contract_id, type, created_at) -- Prevent duplicate notifications
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Drop the function if it exists (optional, for clean recreation)
DROP FUNCTION IF EXISTS update_contract_expirations();

CREATE OR REPLACE FUNCTION update_contract_expirations()
RETURNS TABLE(
  updated_count INTEGER,
  expired_count INTEGER,
  expiring_count INTEGER,
  notifications_sent INTEGER
) AS $$
DECLARE
  expired_updates INTEGER := 0;
  expiring_updates INTEGER := 0;
  temp_updates INTEGER := 0;
  notifications_count INTEGER := 0;
  contract_record RECORD;
BEGIN
  -- Update contracts that have expired (past their expiry date)
  -- This includes approved, expiring, draft, pending, and rejected contracts that are now past due
  UPDATE contracts 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    expiry_date < CURRENT_DATE 
    AND status IN ('approved', 'expiring', 'draft', 'pending', 'rejected')
    AND status != 'expired';
  
  GET DIAGNOSTICS expired_updates = ROW_COUNT;

  -- Update contracts that are expiring within different timeframes based on status
  -- Draft contracts: 21 days warning period
  UPDATE contracts 
  SET 
    status = 'expiring',
    updated_at = NOW()
  WHERE 
    expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '21 days')
    AND status = 'draft'
    AND status != 'expiring';
  
  GET DIAGNOSTICS expiring_updates = ROW_COUNT;

  -- Pending contracts: 14 days warning period
  UPDATE contracts 
  SET 
    status = 'expiring',
    updated_at = NOW()
  WHERE 
    expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '14 days')
    AND status = 'pending'
    AND status != 'expiring';
  
  GET DIAGNOSTICS temp_updates = ROW_COUNT;
  expiring_updates := expiring_updates + temp_updates;

  -- Approved and rejected contracts: 7 days warning period
  UPDATE contracts 
  SET 
    status = 'expiring',
    updated_at = NOW()
  WHERE 
    expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
    AND status IN ('approved', 'rejected')
    AND status != 'expiring';
  
  GET DIAGNOSTICS temp_updates = ROW_COUNT;
  expiring_updates := expiring_updates + temp_updates;

  -- Send notifications for contracts that were updated
  -- Get all contracts that were just updated (both expired and expiring)
  FOR contract_record IN 
    SELECT id, title, author, status, expiry_date
    FROM contracts 
    WHERE (
      (expiry_date < CURRENT_DATE AND status = 'expired') OR
      (expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '21 days') AND status = 'expiring')
    )
    AND updated_at >= (NOW() - INTERVAL '5 minutes') -- Only recently updated contracts
  LOOP
    -- Insert notification for the contract author
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      contract_id,
      created_at,
      read
    ) 
    SELECT 
      u.id,
      CASE 
        WHEN contract_record.status = 'expired' THEN 'Contract Expired'
        WHEN contract_record.status = 'expiring' THEN 'Contract Expiring Soon'
        ELSE 'Contract Status Update'
      END,
      CASE 
        WHEN contract_record.status = 'expired' THEN 
          'Your contract "' || contract_record.title || '" has expired on ' || contract_record.expiry_date || '.'
        WHEN contract_record.status = 'expiring' THEN 
          'Your contract "' || contract_record.title || '" is expiring soon on ' || contract_record.expiry_date || '.'
        ELSE 
          'Your contract "' || contract_record.title || '" status has been updated.'
      END,
      CASE 
        WHEN contract_record.status = 'expired' THEN 'error'
        WHEN contract_record.status = 'expiring' THEN 'warning'
        ELSE 'info'
      END,
      contract_record.id,
      NOW(),
      false
    FROM users u
    WHERE u.email = contract_record.author
    ON CONFLICT DO NOTHING; -- Prevent duplicate notifications
    
    notifications_count := notifications_count + 1;
  END LOOP;

  -- Return the counts
  RETURN QUERY SELECT 
    (expired_updates + expiring_updates) as updated_count,
    expired_updates as expired_count,
    expiring_updates as expiring_count,
    notifications_count as notifications_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION update_contract_expirations() TO service_role;
