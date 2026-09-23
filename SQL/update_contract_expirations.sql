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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE (read), DELETE ON public.notifications TO authenticated;
-- The audit migration replaces legacy policies with recipient-only policies.

CREATE OR REPLACE FUNCTION public.update_contract_expirations()
RETURNS TABLE(updated_count integer, expired_count integer, expiring_count integer, notifications_sent integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  WITH changed AS (
    UPDATE public.contracts c SET status = CASE WHEN expiry_date < CURRENT_DATE THEN 'expired' ELSE 'expiring' END,
      updated_at = now()
    WHERE (expiry_date < CURRENT_DATE AND status IN ('draft', 'pending', 'approved', 'rejected', 'in_progress', 'completed', 'expiring'))
      OR (expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + CASE status WHEN 'draft' THEN 21 WHEN 'pending' THEN 14 ELSE 7 END
        AND status IN ('draft', 'pending', 'approved', 'rejected', 'in_progress', 'completed'))
    RETURNING c.id, c.title, c.author, c.status, c.expiry_date
  ), sent AS (
    INSERT INTO public.notifications(user_id, title, message, type, contract_id)
    SELECT u.id, CASE WHEN c.status = 'expired' THEN 'Contract Expired' ELSE 'Contract Expiring Soon' END,
      'Your contract "' || c.title || '" ' || CASE WHEN c.status = 'expired' THEN 'expired on ' ELSE 'expires on ' END || c.expiry_date || '.',
      CASE WHEN c.status = 'expired' THEN 'error' ELSE 'warning' END, c.id
    FROM changed c JOIN public.users u ON u.email = c.author RETURNING id
  )
  SELECT count(*)::integer, count(*) FILTER (WHERE status = 'expired')::integer,
    count(*) FILTER (WHERE status = 'expiring')::integer, (SELECT count(*)::integer FROM sent) FROM changed;
END;
$$;
REVOKE ALL ON FUNCTION public.update_contract_expirations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_contract_expirations() TO service_role;
