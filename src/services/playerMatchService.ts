import { supabase } from '../lib/supabase';

export type LocalActiveUser = {
  id?: number;
  usuario?: string;
  nombre?: string;
  rolPrimario?: string | null;
  rolSecundario?: string | null;
  juegoPrincipal?: string | null;
};

export type RemoteProfile = {
  id: string;
  local_username: string;
  display_name: string;
  local_sqlite_id: number | null;
  primary_game: string | null;
  primary_role: string | null;
  secondary_role: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SwipeAction = 'Aceptar' | 'Rechazar' | 'like' | 'reject' | 'right' | 'left';

export type RecordSwipeResult = {
  is_match: boolean;
  match_id: string | null;
};

export type PlayerMatch = {
  id: string;
  created_at: string | null;
  other_profile: RemoteProfile;
};

export const CANDIDATE_COOLDOWN_MINUTES = 5;

type MatchRow = {
  id: string;
  profile_a_id: string;
  profile_b_id: string;
  created_at: string | null;
};

type RecentSwipeRow = {
  swiped_profile_id: string;
  updated_at: string;
};

const normalizeSwipeAction = (action: SwipeAction): 'like' | 'reject' => {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction === 'aceptar' || normalizedAction === 'like' || normalizedAction === 'right') {
    return 'like';
  }

  if (normalizedAction === 'rechazar' || normalizedAction === 'reject' || normalizedAction === 'left') {
    return 'reject';
  }

  throw new Error('La decision de matchmaking no es valida.');
};

export async function syncRemoteProfile(usuarioActivo: LocalActiveUser): Promise<RemoteProfile> {
  const localUsername = usuarioActivo?.usuario?.trim();

  if (!localUsername) {
    throw new Error('No se pudo sincronizar el perfil remoto: usuarioActivo.usuario no existe.');
  }

  const displayName = usuarioActivo.nombre?.trim() || localUsername;

  const profilePayload = {
    local_username: localUsername,
    display_name: displayName,
    local_sqlite_id: usuarioActivo.id ?? null,
    primary_game: usuarioActivo.juegoPrincipal ?? null,
    primary_role: usuarioActivo.rolPrimario ?? null,
    secondary_role: usuarioActivo.rolSecundario ?? null,
    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7C3AED&color=fff&size=256`,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'local_username' })
    .select('id, local_username, display_name, local_sqlite_id, primary_game, primary_role, secondary_role, avatar_url, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(`No se pudo sincronizar el perfil remoto: ${error.message}`);
  }

  if (!data) {
    throw new Error('No se pudo sincronizar el perfil remoto: Supabase no devolvió datos.');
  }

  return data as RemoteProfile;
}

export async function fetchCandidateProfiles(remoteProfileId: string): Promise<RemoteProfile[]> {
  if (!remoteProfileId) {
    throw new Error('No se pueden cargar candidatos sin un perfil remoto sincronizado.');
  }

  const cooldownStartedAt = new Date(
    Date.now() - CANDIDATE_COOLDOWN_MINUTES * 60 * 1000,
  ).toISOString();

  const [recentSwipesResult, matchesResult, profilesResult] = await Promise.all([
    supabase
      .from('player_swipes')
      .select('swiped_profile_id, updated_at')
      .eq('swiper_profile_id', remoteProfileId)
      .in('action', ['like', 'reject'])
      .gte('updated_at', cooldownStartedAt),
    supabase
      .from('matches')
      .select('profile_a_id, profile_b_id')
      .or(`profile_a_id.eq.${remoteProfileId},profile_b_id.eq.${remoteProfileId}`),
    supabase
      .from('profiles')
      .select('id, local_username, display_name, local_sqlite_id, primary_game, primary_role, secondary_role, avatar_url, created_at, updated_at')
      .neq('id', remoteProfileId)
      .order('created_at', { ascending: true }),
  ]);

  if (recentSwipesResult.error) {
    throw new Error(`No se pudieron revisar tus decisiones recientes: ${recentSwipesResult.error.message}`);
  }

  if (matchesResult.error) {
    throw new Error(`No se pudieron revisar tus matches activos: ${matchesResult.error.message}`);
  }

  if (profilesResult.error) {
    throw new Error(`No se pudieron cargar candidatos remotos: ${profilesResult.error.message}`);
  }

  const excludedProfileIds = new Set<string>([remoteProfileId]);

  ((recentSwipesResult.data ?? []) as RecentSwipeRow[]).forEach((swipe) => {
    excludedProfileIds.add(swipe.swiped_profile_id);
  });

  ((matchesResult.data ?? []) as Pick<MatchRow, 'profile_a_id' | 'profile_b_id'>[])
    .forEach((match) => {
      const otherProfileId = match.profile_a_id === remoteProfileId
        ? match.profile_b_id
        : match.profile_a_id;
      excludedProfileIds.add(otherProfileId);
    });

  return ((profilesResult.data ?? []) as RemoteProfile[])
    .filter((profile) => !excludedProfileIds.has(profile.id));
}

export async function recordSwipe(
  swiperProfileId: string,
  swipedProfileId: string,
  action: SwipeAction,
): Promise<RecordSwipeResult> {
  if (!swiperProfileId || !swipedProfileId) {
    throw new Error('No se pudo identificar a los jugadores de esta decision.');
  }

  if (swiperProfileId === swipedProfileId) {
    throw new Error('No puedes registrar una decision sobre tu propio perfil.');
  }

  const normalizedAction = normalizeSwipeAction(action);
  const { data, error } = await supabase.rpc('record_player_swipe', {
    p_swiper_profile_id: swiperProfileId,
    p_swiped_profile_id: swipedProfileId,
    p_action: normalizedAction,
  });

  if (error) {
    throw new Error(`No se pudo guardar tu decision: ${error.message}`);
  }

  const rpcResult = Array.isArray(data) ? data[0] : data;

  if (!rpcResult || typeof rpcResult !== 'object') {
    return { is_match: false, match_id: null };
  }

  const result = rpcResult as { is_match?: boolean; match_id?: string | null };

  return {
    is_match: result.is_match === true,
    match_id: typeof result.match_id === 'string' ? result.match_id : null,
  };
}

export async function fetchMyMatches(remoteProfileId: string): Promise<PlayerMatch[]> {
  if (!remoteProfileId) {
    throw new Error('No se pueden cargar matches sin un perfil remoto sincronizado.');
  }

  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('id, profile_a_id, profile_b_id, created_at')
    .or(`profile_a_id.eq.${remoteProfileId},profile_b_id.eq.${remoteProfileId}`)
    .order('created_at', { ascending: false });

  if (matchError) {
    throw new Error(`No se pudieron cargar tus matches: ${matchError.message}`);
  }

  const matchRows = (matchData ?? []) as MatchRow[];

  if (matchRows.length === 0) {
    return [];
  }

  const otherProfileIds = [
    ...new Set(
      matchRows.map((match) => (
        match.profile_a_id === remoteProfileId
          ? match.profile_b_id
          : match.profile_a_id
      )),
    ),
  ];

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, local_username, display_name, local_sqlite_id, primary_game, primary_role, secondary_role, avatar_url, created_at, updated_at')
    .in('id', otherProfileIds);

  if (profileError) {
    throw new Error(`No se pudieron cargar los perfiles de tus matches: ${profileError.message}`);
  }

  const profilesById = new Map(
    ((profileData ?? []) as RemoteProfile[]).map((profile) => [profile.id, profile]),
  );

  const matchesWithProfiles = matchRows.flatMap((match) => {
    const otherProfileId = match.profile_a_id === remoteProfileId
      ? match.profile_b_id
      : match.profile_a_id;
    const otherProfile = profilesById.get(otherProfileId);

    return otherProfile
      ? [{ id: match.id, created_at: match.created_at, other_profile: otherProfile }]
      : [];
  });

  if (matchesWithProfiles.length !== matchRows.length) {
    throw new Error('No se pudieron cargar todos los perfiles asociados a tus matches.');
  }

  return matchesWithProfiles;
}
