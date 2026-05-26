
REVOKE EXECUTE ON FUNCTION public.sweep_expired_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_expired_requests() TO service_role;
