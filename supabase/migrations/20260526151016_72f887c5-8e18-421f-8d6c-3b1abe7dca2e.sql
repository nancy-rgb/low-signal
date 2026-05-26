
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trusted_contact;

DROP POLICY IF EXISTS "profiles read own" ON public.profiles;
CREATE POLICY "profiles read all authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
