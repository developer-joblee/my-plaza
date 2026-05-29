-- Profiles: estende auth.users com dados públicos
CREATE TABLE public.profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT       NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#f4c95a',
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Salas
CREATE TABLE public.rooms (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT        UNIQUE NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  is_private  BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Membros de cada sala
CREATE TABLE public.room_members (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id    UUID        REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Profiles: qualquer usuário autenticado pode ver todos os perfis
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Profiles: cada usuário gerencia o próprio perfil
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Rooms: vê sala pública OU sala onde é membro
CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (
    NOT is_private
    OR EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = rooms.id AND user_id = auth.uid()
    )
  );

-- Room members: cada usuário vê apenas as próprias participações
CREATE POLICY "room_members_select" ON public.room_members
  FOR SELECT USING (user_id = auth.uid());

-- Rooms: criador pode inserir (usado na criação de sala via API)
CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Room members: usuário pode inserir a si mesmo (criador como owner)
CREATE POLICY "room_members_insert_self" ON public.room_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── Grants explícitos para os roles do Supabase ─────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles     TO anon, authenticated, service_role;
GRANT ALL ON public.rooms        TO anon, authenticated, service_role;
GRANT ALL ON public.room_members TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ─── Trigger: cria perfil automaticamente ao cadastrar ───────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  palette TEXT[] := ARRAY[
    '#f4c95a','#7ab8ff','#ff7a5a',
    '#9d7ce0','#5ac08a','#e94a8d','#ffb454'
  ];
  picked TEXT;
BEGIN
  picked := palette[1 + (floor(random() * 7))::int];
  INSERT INTO public.profiles (id, display_name, color, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    picked,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
