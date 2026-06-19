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

  const { data, error } = await supabase
    .from('profiles')
    .select('id, local_username, display_name, local_sqlite_id, primary_game, primary_role, secondary_role, avatar_url, created_at, updated_at')
    .neq('id', remoteProfileId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar candidatos remotos: ${error.message}`);
  }

  return (data ?? []) as RemoteProfile[];
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
