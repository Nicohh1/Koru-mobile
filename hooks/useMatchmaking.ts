import { useContext, useEffect, useRef, useState } from 'react';
import Swiper from 'react-native-deck-swiper';
import { AuthContext } from '../src/context/AuthContext';
import {
  fetchCandidateProfiles,
  recordSwipe,
  RemoteProfile,
  SwipeAction,
  syncRemoteProfile,
} from '../src/services/playerMatchService';

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
  remoteProfile: profile,
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
  const [isSubmittingSwipe, setIsSubmittingSwipe] = useState(false);
  const [remoteProfile, setRemoteProfile] = useState<RemoteProfile | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<RemoteProfile | null>(null);
  const [matchmakingError, setMatchmakingError] = useState<string | null>(null);
  const swiperRef = useRef<Swiper<any>>(null);
  const interactionLockedRef = useRef(false);
  const swipeRequestInFlightRef = useRef(false);

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

  const restoreSwipedCard = async () => {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const swiper = swiperRef.current;

        if (!swiper) {
          resolve();
          return;
        }

        swiper.swipeBack(() => resolve());
      }, 0);
    });
  };

  const handleNextProfile = async (action: SwipeAction, swipedCardIndex = currentIndex) => {
    if (swipeRequestInFlightRef.current) return false;

    const swipedProfile = PLAYER_PROFILES[swipedCardIndex];
    swipeRequestInFlightRef.current = true;
    interactionLockedRef.current = true;
    setIsSubmittingSwipe(true);
    setMatchmakingError(null);

    try {
      if (!remoteProfile?.id || !swipedProfile?.remoteProfileId) {
        throw new Error('No se pudo identificar el perfil remoto para guardar tu decision.');
      }

      const result = await recordSwipe(
        remoteProfile.id,
        swipedProfile.remoteProfileId,
        action,
      );

      setCurrentIndex(swipedCardIndex + 1);

      if (result.is_match) {
        setMatchedProfile(swipedProfile.remoteProfile as RemoteProfile);
      }

      return true;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo guardar tu decision. Revisa tu conexion e intenta nuevamente.';

      console.error('Error guardando el swipe en Supabase:', error);
      setMatchmakingError(message);
      await restoreSwipedCard();
      return false;
    } finally {
      swipeRequestInFlightRef.current = false;
      interactionLockedRef.current = false;
      setIsSubmittingSwipe(false);
    }
  };

  const requestSwipe = (action: 'Aceptar' | 'Rechazar') => {
    if (interactionLockedRef.current) return;

    const swiper = swiperRef.current;

    if (!swiper) {
      setMatchmakingError('No se pudo iniciar el swipe. Intenta nuevamente.');
      return;
    }

    interactionLockedRef.current = true;
    setIsSubmittingSwipe(true);

    if (action === 'Aceptar') {
      swiper.swipeRight();
    } else {
      swiper.swipeLeft();
    }
  };

  const closeMatchModal = () => {
    setMatchedProfile(null);
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
    isSubmittingSwipe,
    remoteProfile,
    matchedProfile,
    matchmakingError,
    requestSwipe,
    closeMatchModal,
    filtrosActivos,
    setFiltrosActivos,
    resetFilter,
  };
};
