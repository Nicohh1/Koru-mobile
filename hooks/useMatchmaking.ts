import { useContext, useEffect, useRef, useState } from 'react';
import Swiper from 'react-native-deck-swiper';
import { AuthContext } from '../src/context/AuthContext';
import { crearPerfilesDePrueba, iniciarBaseDeDatos, obtenerPerfiles } from '../src/database/db';

// CUSTOM HOOK: USEMATCHMAKING
// Centraliza la lógica de negocio, el estado de la cola de emparejamiento,
// la persistencia local en SQLite y las reglas del motor de filtrado.
export const useMatchmaking = () => {
  // Extraemos el usuario autenticado para evitar que el sistema se empareje consigo mismo
  const { usuarioActivo } = useContext(AuthContext) as any;

  // ESTADOS CRÍTICOS DEL MATCHMAKING
  const [PLAYER_PROFILES, setPlayerProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const swiperRef = useRef<Swiper<any>>(null);

  // 1. EL NUEVO ESTADO DEL FILTRO: Guarda las opciones que elijas en los botones tipo píldora
  // Almacena las directrices seleccionadas por el usuario a través de las píldoras del modal
  const [filtrosActivos, setFiltrosActivos] = useState({
    rol: null,
    estilo: null,
    rango: null,
    juego: null
  });

  // EFECTO DE CONTROL: Sincronización y mutación de la base de datos
  // Se gatilla de forma automática cada vez que cambian los filtros activos o el usuario de la sesión
  useEffect(() => {
    const cargarUsuariosDeBaseDeDatos = async () => {
      setIsLoading(true);
      try {
        // Inicialización asincrónica de la base de datos local embebida (SQLite)
        const db = await iniciarBaseDeDatos();
        // Inyección de mock data controlado (Semilla / Seed) para simular el entorno de producción
        await crearPerfilesDePrueba(db);
        // Operación de lectura (Query SELECT) para recuperar los perfiles almacenados
        const perfilesDeLaBD = await obtenerPerfiles(db);
        
        // ADAPTADOR DE DATOS (MAPPING DTO)
        // Convierte el esquema relacional bruto de la base de datos a un objeto extendido
        // compatible con los requerimientos visuales y de simulación de APIs de la MatchCard
        const perfilesMapeados = perfilesDeLaBD.map((perfil: any) => ({
          id: perfil.id,
          name: perfil.nombre,
          level: Math.floor(Math.random() * 50) + 20, 
          compatibility: (Math.floor(Math.random() * 30) + 65) / 100,
          // Consumo de servicio externo para generar avatares responsivos basados en las iniciales del nombre
          profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nombre)}&background=7C3AED&color=fff&size=256`,
          verified: perfil.id % 2 === 0, 
          style: 'Competitivo', // En el futuro, esto se lee desde SQLite
          role: perfil.rolPrimario || 'Fill',
          availability: 'Noche',
          rank: perfil.juegoPrincipal === 'Valorant' ? 'Inmortal / Radiante' : 'Diamante / Master',
          countryName: 'Chile',
          countryISO: 'cl',
          karma: 1100 + (perfil.id * 45),
          victorias: `${Math.floor(Math.random() * 15) + 55}%`,
          partidas: Math.floor(Math.random() * 400) + 150,
          onlineStatus: 'En línea',
          last_act: 'Ahora',
          juegoPrincipal: perfil.juegoPrincipal,
          games: [
            { id: '1', logo: perfil.juegoPrincipal === 'Valorant' ? 'https://img.icons8.com/color/48/valorant.png' : 'https://img.icons8.com/color/48/league-of-legends.png' }
          ]
        }));

        // 2. EL MOTOR DE BÚSQUEDA INTELIGENTE
        // Aplica discriminación por cortocircuito evaluando cada perfil contra las reglas del negocio
        const listaFiltrada = perfilesMapeados.filter((p: any) => {
          // Regla 1: No mostrar tu propio perfil
          if (usuarioActivo && p.id === usuarioActivo.id) return false;

          // Regla 2: Aplicar las reglas de tu modal si están activas
          // Si el filtro está instanciado y no coincide con el atributo del perfil, se descarta (early return)
          if (filtrosActivos.rol && p.role !== filtrosActivos.rol) return false;
          if (filtrosActivos.estilo && p.style !== filtrosActivos.estilo) return false;
          if (filtrosActivos.rango && p.rank !== filtrosActivos.rango) return false;
          if (filtrosActivos.juego && p.juegoPrincipal !== filtrosActivos.juego) return false;

          return true; // Pasa la prueba y entra a la baraja
        });

        // Mutación coordinada de estados: Inyecta la nueva lista y resetea el puntero de visualización
        setPlayerProfiles(listaFiltrada);
        setCurrentIndex(0);
      } catch (error) {
        console.error("Error cargando el matchmaking desde SQLite:", error);
      } finally {
        // Libera la pantalla de carga, habilitando las interacciones del Frontend
        setIsLoading(false);
      }
    };

    cargarUsuariosDeBaseDeDatos();
  }, [filtrosActivos, usuarioActivo]); // Se vuelve a calcular si tocas el filtro o cambias de cuenta

  // Controla el avance secuencial del índice al desplazar una tarjeta
  const handleNextProfile = (action: string) => {
    setCurrentIndex(prev => prev + 1);
  };

  // Reestablece las propiedades del filtro a su estado neutro (null), gatillando la recarga completa de la cola
  const resetFilter = () => {
    // Limpia el filtro volviendo todo a null
    setFiltrosActivos({ rol: null, estilo: null, rango: null, juego: null });
    setCurrentIndex(0);
  };

  // INTERFAZ DE EXPORTACIÓN PÚBLICA DEL HOOK
  return {
    PLAYER_PROFILES,
    currentProfile: PLAYER_PROFILES[currentIndex],
    swiperRef,
    handleNextProfile,
    isQueueEmpty: currentIndex >= PLAYER_PROFILES.length,
    isLoading,
    filtrosActivos, // Exportamos los filtros actuales para que tu modal los vea
    setFiltrosActivos, // Exportamos la función para que tu modal los cambie
    resetFilter
  };
};