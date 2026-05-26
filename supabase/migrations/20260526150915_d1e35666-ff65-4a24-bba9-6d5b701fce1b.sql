
CREATE OR REPLACE FUNCTION public.join_group_by_code(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'must be signed in';
  END IF;
  SELECT id INTO v_group_id FROM public.groups WHERE invite_code = lower(trim(_code));
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'invalid code';
  END IF;
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid())
  ON CONFLICT DO NOTHING;
  RETURN v_group_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_group_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(TEXT) TO authenticated;
