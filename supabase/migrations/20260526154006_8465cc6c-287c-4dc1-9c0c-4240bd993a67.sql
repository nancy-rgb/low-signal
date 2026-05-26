
CREATE TABLE public.trusted_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trusted_contacts_user ON public.trusted_contacts(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_contacts TO authenticated;
GRANT ALL ON public.trusted_contacts TO service_role;

ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts read own" ON public.trusted_contacts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "contacts insert own" ON public.trusted_contacts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "contacts update own" ON public.trusted_contacts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "contacts delete own" ON public.trusted_contacts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.safety_alerts (
  request_id UUID NOT NULL PRIMARY KEY,
  requester_id UUID NOT NULL,
  alerted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contacts_notified INT NOT NULL DEFAULT 0,
  delivered BOOLEAN NOT NULL DEFAULT false
);

GRANT SELECT ON public.safety_alerts TO authenticated;
GRANT ALL ON public.safety_alerts TO service_role;

ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts read own" ON public.safety_alerts
  FOR SELECT TO authenticated USING (requester_id = auth.uid());

DROP FUNCTION IF EXISTS public.sweep_expired_requests();

CREATE FUNCTION public.sweep_expired_requests()
RETURNS TABLE(expired_count INT, safety_alert_count INT, new_alerts INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _expired INT := 0;
  _safety INT := 0;
  _new INT := 0;
BEGIN
  UPDATE public.requests
  SET status = 'expired'
  WHERE status IN ('open', 'pending_approval')
    AND expires_at < now();
  GET DIAGNOSTICS _expired = ROW_COUNT;

  SELECT COUNT(*) INTO _safety
  FROM public.requests r
  WHERE r.safety_deadline IS NOT NULL
    AND r.safety_deadline < now()
    AND r.status IN ('open', 'pending_approval', 'claimed')
    AND NOT EXISTS (
      SELECT 1 FROM public.check_ins c
      WHERE c.request_id = r.id AND c.kind = 'safe'
    );

  WITH inserted AS (
    INSERT INTO public.safety_alerts (request_id, requester_id)
    SELECT r.id, r.requester_id
    FROM public.requests r
    WHERE r.safety_deadline IS NOT NULL
      AND r.safety_deadline < now()
      AND r.status IN ('open', 'pending_approval', 'claimed')
      AND NOT EXISTS (
        SELECT 1 FROM public.check_ins c
        WHERE c.request_id = r.id AND c.kind = 'safe'
      )
    ON CONFLICT (request_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO _new FROM inserted;

  RETURN QUERY SELECT _expired, _safety, _new;
END;
$$;
