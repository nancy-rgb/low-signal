
-- Check-in kinds
CREATE TYPE public.check_in_kind AS ENUM ('on_the_way', 'arrived', 'delayed', 'safe', 'custom');

-- Check-ins table
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.check_in_kind NOT NULL DEFAULT 'custom',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Messages table (client-encrypted ciphertext)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the user either the requester OR the approved volunteer for a request?
CREATE OR REPLACE FUNCTION public.is_request_participant(_req UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.requests r
    LEFT JOIN public.request_claims c ON c.request_id = r.id AND c.status = 'approved'
    WHERE r.id = _req AND (r.requester_id = _user OR c.volunteer_id = _user)
  )
$$;

-- RLS: check_ins
CREATE POLICY "check_ins read by participant" ON public.check_ins FOR SELECT TO authenticated
  USING (public.is_request_participant(request_id, auth.uid()));
CREATE POLICY "check_ins insert by participant" ON public.check_ins FOR INSERT TO authenticated
  WITH CHECK (public.is_request_participant(request_id, auth.uid()) AND sender_id = auth.uid());

-- RLS: messages
CREATE POLICY "messages read by participant" ON public.messages FOR SELECT TO authenticated
  USING (public.is_request_participant(request_id, auth.uid()));
CREATE POLICY "messages insert by participant" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (public.is_request_participant(request_id, auth.uid()) AND sender_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Sweep function for expired requests
CREATE OR REPLACE FUNCTION public.sweep_expired_requests()
RETURNS TABLE(expired_count INT, safety_alert_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expired INT := 0;
  _safety INT := 0;
BEGIN
  -- Mark requests past expires_at as expired
  UPDATE public.requests
  SET status = 'expired'
  WHERE status IN ('open', 'pending_approval')
    AND expires_at < now();
  GET DIAGNOSTICS _expired = ROW_COUNT;

  -- Count missed safety deadlines (no "safe" check-in after deadline)
  SELECT COUNT(*) INTO _safety
  FROM public.requests r
  WHERE r.safety_deadline IS NOT NULL
    AND r.safety_deadline < now()
    AND r.status IN ('open', 'pending_approval', 'claimed')
    AND NOT EXISTS (
      SELECT 1 FROM public.check_ins c
      WHERE c.request_id = r.id AND c.kind = 'safe'
    );

  RETURN QUERY SELECT _expired, _safety;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sweep_expired_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sweep_expired_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_expired_requests() TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_request_participant(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_request_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_request_participant(UUID, UUID) TO service_role;
