-- ─── Script idempotente: pode rodar quantas vezes quiser ──────────────────────
-- Cole tudo isso no SQL Editor do Supabase e execute.

-- ─── 1. Grants (necessários quando migração é feita fora do dashboard) ────────

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles     TO anon, authenticated, service_role;
GRANT ALL ON public.rooms        TO anon, authenticated, service_role;
GRANT ALL ON public.room_members TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ─── 2. Profiles ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─── 3. Rooms ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert" ON public.rooms;

-- SELECT: sala pública OU usuário é membro
CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (
    NOT is_private
    OR EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = rooms.id AND user_id = auth.uid()
    )
  );

-- INSERT: auth.uid() deve ser o created_by (criador da sala)
CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ─── 4. Room members ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "room_members_select"       ON public.room_members;
DROP POLICY IF EXISTS "room_members_insert_self"  ON public.room_members;

-- SELECT: cada usuário vê apenas as próprias participações
-- (listar todos os membros de uma sala é feito via service_role nas API routes)
CREATE POLICY "room_members_select" ON public.room_members
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: usuário pode inserir apenas a si mesmo
-- (inserir outros membros é feito via service_role nas API routes)
CREATE POLICY "room_members_insert_self" ON public.room_members
  FOR INSERT WITH CHECK (user_id = auth.uid());
