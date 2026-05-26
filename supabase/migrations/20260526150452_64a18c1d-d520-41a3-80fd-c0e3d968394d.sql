
-- Extensions required by later DDL (gen_random_bytes for invite codes)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET search_path TO public, extensions;

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'volunteer', 'member');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT NOT NULL DEFAULT 'Anonymous',
  trusted_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, group_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  region_label TEXT,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Group members
CREATE TABLE public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group AND user_id = _user)
$$;

CREATE POLICY "groups read if member" ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "groups insert any auth" ON public.groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "groups update by creator" ON public.groups FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "members read own group" ON public.group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(group_id, auth.uid()));
CREATE POLICY "members insert self" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "members delete self" ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Requests
CREATE TYPE public.help_type AS ENUM (
  'safe_shelter','secure_travel','supplies','medical','medical_supplies','legal','message_relay','other'
);
CREATE TYPE public.request_status AS ENUM (
  'open','pending_approval','claimed','completed','cancelled','expired'
);
CREATE TYPE public.urgency_level AS ENUM ('low','medium','high');

CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  help_type public.help_type NOT NULL,
  urgency public.urgency_level NOT NULL DEFAULT 'medium',
  notes TEXT,
  area_label TEXT,
  -- coarse coords (rounded client-side); exact location only revealed after approval
  lat_coarse DOUBLE PRECISION,
  lng_coarse DOUBLE PRECISION,
  lat_exact DOUBLE PRECISION,
  lng_exact DOUBLE PRECISION,
  status public.request_status NOT NULL DEFAULT 'open',
  safety_deadline TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requests read by requester" ON public.requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid());
CREATE POLICY "requests read by group members" ON public.requests FOR SELECT TO authenticated
  USING (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "requests read open public" ON public.requests FOR SELECT TO authenticated
  USING (group_id IS NULL AND status IN ('open','pending_approval','claimed'));
CREATE POLICY "requests insert by requester" ON public.requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "requests update by requester" ON public.requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid());

-- Request claims (volunteers)
CREATE TABLE public.request_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|declined|withdrawn
  meetup_type TEXT, -- pickup|delivery
  meetup_point TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, volunteer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.request_claims TO authenticated;
GRANT ALL ON public.request_claims TO service_role;
ALTER TABLE public.request_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_request_requester(_req UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.requests WHERE id = _req AND requester_id = _user)
$$;

CREATE POLICY "claims read by volunteer" ON public.request_claims FOR SELECT TO authenticated
  USING (volunteer_id = auth.uid());
CREATE POLICY "claims read by requester" ON public.request_claims FOR SELECT TO authenticated
  USING (public.is_request_requester(request_id, auth.uid()));
CREATE POLICY "claims insert by volunteer" ON public.request_claims FOR INSERT TO authenticated
  WITH CHECK (volunteer_id = auth.uid());
CREATE POLICY "claims update by volunteer" ON public.request_claims FOR UPDATE TO authenticated
  USING (volunteer_id = auth.uid());
CREATE POLICY "claims update by requester" ON public.request_claims FOR UPDATE TO authenticated
  USING (public.is_request_requester(request_id, auth.uid()));

-- Offers (resources directory)
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offerer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  offer_type TEXT NOT NULL,
  description TEXT NOT NULL,
  area_label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers read by group members" ON public.offers FOR SELECT TO authenticated
  USING (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "offers read public" ON public.offers FOR SELECT TO authenticated
  USING (group_id IS NULL AND active = true);
CREATE POLICY "offers read own" ON public.offers FOR SELECT TO authenticated
  USING (offerer_id = auth.uid());
CREATE POLICY "offers insert own" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (offerer_id = auth.uid());
CREATE POLICY "offers update own" ON public.offers FOR UPDATE TO authenticated
  USING (offerer_id = auth.uid());
CREATE POLICY "offers delete own" ON public.offers FOR DELETE TO authenticated
  USING (offerer_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, alias)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'alias', 'Anonymous'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_requests_touch BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_claims_touch BEFORE UPDATE ON public.request_claims
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
