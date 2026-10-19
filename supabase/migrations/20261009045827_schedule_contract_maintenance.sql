-- Supabase provides pg_cron, pg_net and Vault. Disposable test databases skip
-- the schedule; they exercise the maintenance handler and queue independently.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    PERFORM cron.schedule('contract-maintenance', '*/15 * * * *', $job$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_maintenance_url'),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
          'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_maintenance_token')),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $job$);
  END IF;
END;
$$;
