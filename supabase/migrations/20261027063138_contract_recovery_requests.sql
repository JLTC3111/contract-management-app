BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Nullable for existing clients and records. A retry must reuse the same UUID.
ALTER TABLE public.contracts ADD COLUMN client_request_id uuid;
CREATE UNIQUE INDEX contracts_client_request_id_unique
  ON public.contracts (client_request_id) WHERE client_request_id IS NOT NULL;

CREATE FUNCTION private.keep_contract_request_id()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.client_request_id IS DISTINCT FROM OLD.client_request_id THEN
    RAISE EXCEPTION 'A contract creation request ID cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.keep_contract_request_id() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER keep_contract_request_id BEFORE UPDATE OF client_request_id ON public.contracts
FOR EACH ROW EXECUTE FUNCTION private.keep_contract_request_id();

-- Existing RLS, grants, ownership and lifecycle triggers remain authoritative.
NOTIFY pgrst, 'reload schema';
COMMIT;
