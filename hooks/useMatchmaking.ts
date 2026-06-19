import { useContext, useEffect, useRef, useState } from 'react';
import Swiper from 'react-native-deck-swiper';
import { AuthContext } from '../src/context/AuthContext';
import { fetchCandidateProfiles, RemoteProfile, syncRemoteProfile } from '../src/services/playerMatchService';

const mapRemoteProfileToCard = (profile: RemoteProfile) => ({
  id: profile.id,
  name: profile.display_name,
  level: 30,
  compatibility: 0.85,
  profilePic: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name)}&background=7C3AED&color=fff&size=256`,
  verified: true,
  style: 'Competitivo',
  role: profile.primary_role || 'Fill',
  availability: 'Noche',
  rank: profile.primary_game === 'Valorant' ? 'Inmortal / Radiante' : 'Diamante / Master',
  countryName: 'Chile',
  countryISO: 'cl',
  karma: 1200,
  victorias: '60%',
  partidas: 200,
  onlineStatus: 'En linea',
  last_act: 'Ahora',
  juegoPrincipal: profile.primary_game,
  remoteProfileId: profile.id,
  localUsername: profile.local_username,
  games: [
    {
      id: '1',
      logo: profile.primary_game === 'Valorant'
        ? 'https://img.icons8.com/color/48/valorant.png'
        : 'https://img.icons8.com/color/48/league-of-legends.png',
    },
  ],
});

export const useMatchmaking = () => {
  const { usuarioActivo } = useContext(AuthContext) as any;

  const [PLAYER_PROFILES, setPlayerProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [remoteProfile, setRemoteProfile] = useState<RemoteProfile | null>(null);
  const [matchmakingError, setMatchmakingError] = useState<string | null>(null);
  const swiperRef = useRef<Swiper<any>>(null);

  const [filtrosActivos, setFiltrosActivos] = useState({
    rol: null,
    estilo: null,
    rango: null,
    juego: null,
  });

  useEffect(() => {
    const cargarUsuariosRemotos = async () => {
      setIsLoading(true);
      setMatchmakingError(null);

      try {
        if (!usuarioActivo?.usuario) {
          setRemoteProfile(null);
          setPlayerProfiles([]);
          setCurrentIndex(0);
          return;
        }

        const syncedProfile = await syncRemoteProfile(usuarioActivo);
        setRemoteProfile(syncedProfile);

        const remoteCandidates = await fetchCandidateProfiles(syncedProfile.id);
        const perfilesMapeados = remoteCandidates.map(mapRemoteProfileToCard);

        const listaFiltrada = perfilesMapeados.filter((p: any) => {
          if (filtrosActivos.rol && p.role !== filtrosActivos.rol) return false;
          if (filtrosActivos.estilo && p.style !== filtrosActivos.estilo) return false;
          if (filtrosActivos.rango && p.rank !== filtrosActivos.rango) return false;
          if (filtrosActivos.juego && p.juegoPrincipal !== filtrosActivos.juego) return false;

          return true;
        });

        setPlayerProfiles(listaFiltrada);
        setCurrentIndex(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo cargar el matchmaking remoto.';
        console.error('Error cargando el matchmaking desde Supabase:', error);
        setMatchmakingError(message);
        setPlayerProfiles([]);
        setCurrentIndex(0);
      } finally {
        setIsLoading(false);
      }
    };

    cargarUsuariosRemotos();
  }, [filtrosActivos, usuarioActivo]);

  const handleNextProfile = (action: string) => {
    setCurrentIndex(prev => prev + 1);
  };

  const resetFilter = () => {
    setFiltrosActivos({ rol: null, estilo: null, rango: null, juego: null });
    setCurrentIndex(0);
  };

  return {
    PLAYER_PROFILES,
    currentProfile: PLAYER_PROFILES[currentIndex],
    swiperRef,
    handleNextProfile,
    isQueueEmpty: currentIndex >= PLAYER_PROFILES.length,
    isLoading,
    remoteProfile,
    matchmakingError,
    filtrosActivos,
    setFiltrosActivos,
    resetFilter,
  };
};
