import { useRouter } from 'expo-router';
import { Eye, Filter, Heart, RotateCcw, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';

import { MatchCard } from '../../components/MatchCard';
import { COLORS } from '../../constants/theme';
import { useMatchmaking } from '../../hooks/useMatchmaking';

// Capturamos las dimensiones de la pantalla para renderizar layouts responsivos
const { width } = Dimensions.get('window');

// El Modal de Filtros: Encargado de la segmentación de usuarios por rol, estilo de juego y rango.
const MatchmakingFilter = ({ isVisible, onClose, onApply, currentFilters, resetFilter }: any) => {
  // Estado local para almacenar las modificaciones temporales antes de ser aplicadas globalmente
  const [localFilters, setLocalFilters] = useState(currentFilters);

  //Le decimos que category y value son textos (string) y prev es any
  // Función tipo interruptor para seleccionar/deseleccionar un filtro específico dentro de una categoría
  const toggleFilter = (category: string, value: string) => {
    setLocalFilters((prev: any) => ({
      ...prev,
      // Si el valor ya existía, lo remueve (null); si no, lo asigna
      [category]: prev[category] === value ? null : value
    }));
  };

  // Despacha los filtros acumulados localmente hacia el estado global y cierra el modal
  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterContainer}>
          
          {/* HEADER DEL MODAL */}
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filtrar Búsqueda</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          {/* CUERPO DEL FILTRO (SCROLLABLE PARA PANTALLAS PEQUEÑAS) */}
          <ScrollView style={styles.filterScroll}>
            {/* CATEGORÍA: ROL */}
            {/* Mapea dinámicamente los roles competitivos tanto para MOBAs como para Tactical Shooters */}
            <Text style={styles.filterCategoryLabel}>Rol Preferido</Text>
            <View style={styles.pillContainer}>
              {['Top', 'Jungle', 'Mid', 'ADC', 'Soporte', 'Duelista', 'Controlador', 'Iniciador', 'Centinela', 'Fill'].map((rol) => (
                <TouchableOpacity 
                  key={rol} 
                  style={[styles.pill, localFilters.rol === rol && styles.pillActive]}
                  onPress={() => toggleFilter('rol', rol)}
                >
                  <Text style={[styles.pillText, localFilters.rol === rol && styles.pillTextActive]}>{rol}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* CATEGORÍA: ESTILO DE JUEGO */}
            {/* Filtro clave para el algoritmo de compatibilidad conductual del proyecto */}
            <Text style={styles.filterCategoryLabel}>Estilo de Juego</Text>
            <View style={styles.pillContainer}>
              {['Competitivo', 'Chill', 'Tryhard', 'Casual'].map((estilo) => (
                <TouchableOpacity 
                  key={estilo} 
                  style={[styles.pill, localFilters.estilo === estilo && styles.pillActive]}
                  onPress={() => toggleFilter('estilo', estilo)}
                >
                  <Text style={[styles.pillText, localFilters.estilo === estilo && styles.pillTextActive]}>{estilo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* CATEGORÍA: RANGO */}
            {/* Segmentación visual basada en los datos técnicos recuperados de APIs oficiales */}
            <Text style={styles.filterCategoryLabel}>Rango (Mínimo)</Text>
            <View style={styles.pillContainer}>
              {['Plata / Oro', 'Platino / Esmeralda', 'Diamante / Master', 'Inmortal / Radiante'].map((rango) => (
                <TouchableOpacity 
                  key={rango} 
                  style={[styles.pill, localFilters.rango === rango && styles.pillActive]}
                  onPress={() => toggleFilter('rango', rango)}
                >
                  <Text style={[styles.pillText, localFilters.rango === rango && styles.pillTextActive]}>{rango}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterFooter}>
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                setLocalFilters({ rol: null, estilo: null, rango: null, juego: null });
                resetFilter();
                onClose();
              }}
            >
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
            {/* Botón de Aplicar: Confirma la selección de los filtros */}
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};
// --- FIN DEL COMPONENTE DEL MODAL ---

// COMPONENTE PRINCIPAL: PANTALLA DE MATCHMAKING
export default function MatchScreen() {
  // Consumo de lógica de negocio desacoplada mediante un custom hook especializado
  const { 
    currentProfile, PLAYER_PROFILES, swiperRef, handleNextProfile, 
    isQueueEmpty, resetFilter, isLoading, 
    filtrosActivos, setFiltrosActivos, matchmakingError
  } = useMatchmaking();

  const router = useRouter();

  // Estado local para alternar la visibilidad de la interfaz del filtro modal
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);

  // CONTROL DE FLUJO: Renderizado condicional de pantalla de carga (Sincronización con Backend/APIs)
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyContainer]}>
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={[styles.emptyText, { marginTop: 15 }]}>Sincronizando Base de Datos...</Text>
      </SafeAreaView>
    );
  }

  // CONTROL DE FLUJO: Renderizado condicional para cola vacía (Ausencia de perfiles con filtros actuales)
  if (isQueueEmpty) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>{matchmakingError || 'No hay mas jugadores disponibles por ahora'}</Text>
        <TouchableOpacity style={styles.resetDemoButton} onPress={resetFilter}>
          <Text style={styles.resetDemoText}>Reiniciar Búsqueda</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={resetFilter}>
          <RotateCcw color={COLORS.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>MATCHMAKING</Text>
          <Text style={styles.headerSubtitle}>Encuentra tu próximo dúo</Text>
        </View>
        {/* Botón Derecho: Disparador visual para abrir el Modal de Filtros */}
        <TouchableOpacity 
          style={styles.headerIconButton} 
          onPress={() => setModalFiltroVisible(true)} 
        >
          <Filter color={COLORS.textSecondary} size={24} />
        </TouchableOpacity>
      </View>

      {/* MAZO DE CARTAS DESLIZABLES (DECK SWIPER) */}
      <View style={styles.deckSwiperContainer}>
        <Swiper
          ref={swiperRef}
          cards={PLAYER_PROFILES}
          // Manejo de gestos nativos: Deslizar izquierda ejecuta la lógica de rechazo
          onSwipedLeft={() => handleNextProfile('Rechazar')}
          // Deslizar derecha ejecuta la lógica de aceptación/interés
          onSwipedRight={() => handleNextProfile('Aceptar')}
          stackSize={3} // Cantidad de tarjetas renderizadas en cascada en el fondo
          stackScale={1}
          stackSeparation={3}
          backgroundColor={'transparent'}
          // Calcula el índice dinámico del perfil actual dentro de la cola de datos
          cardIndex={PLAYER_PROFILES.indexOf(PLAYER_PROFILES.find(p => p.id === currentProfile?.id)) || 0}
          // Delegación de renderizado para la tarjeta individual inyectando el objeto card
          renderCard={(card) => {
            if (!card) return null;
            return <MatchCard card={card} />;
          }}
        />
      </View>

      {/* BOTONES DE ACCIÓN: RECHAZAR */}
      <View style={styles.actionButtonsRow}>
        <View style={styles.actionButtonWrapper}>
          <TouchableOpacity style={styles.circleActionButtonGlowRed} onPress={() => swiperRef.current?.swipeLeft()}>
            <X color={COLORS.actionRed} size={32} />
          </TouchableOpacity>
          <Text style={styles.actionLabelTextRed}>RECHAZAR</Text>
        </View>

        {/* BOTÓN: NAVEGACIÓN - DETALLE DEL PERFIL */}
        <View style={styles.actionButtonWrapper}>
          <TouchableOpacity 
            style={styles.circleActionButtonGlowPurple}
            onPress={() => {
              if (currentProfile) {
                // Enrutamiento nativo dinámico inyectando el ID del jugador por query parameter
                // @ts-ignore
                router.push(`/perfil?id=${currentProfile.id}`);
              }
            }}
          >
            <Eye color={COLORS.purple} size={32} />
          </TouchableOpacity>
          <Text style={styles.actionLabelTextPurple}>VER PERFIL</Text>
        </View>

        {/* BOTÓN: ACEPTAR */}
        <View style={styles.actionButtonWrapper}>
          <TouchableOpacity style={styles.circleActionButtonGlowBlue} onPress={() => swiperRef.current?.swipeRight()}>
            <Heart color={COLORS.blue} size={32} />
          </TouchableOpacity>
          <Text style={styles.actionLabelTextBlue}>ACEPTAR</Text>
        </View>
      </View>

      {/* INYECCIÓN Y VINCULACIÓN DEL MODAL DE FILTRO */}
      {/* Sincroniza los estados del componente de la pantalla con la ventana del modal */}      
      <MatchmakingFilter 
        isVisible={modalFiltroVisible}
        onClose={() => setModalFiltroVisible(false)}
        currentFilters={filtrosActivos}
        onApply={setFiltrosActivos}
        resetFilter={resetFilter}
      />
    </SafeAreaView>
  );
}

// HOJA DE ESTILOS (SISTEMA DE DISEÑO DEL FRONTEND)
// Implementa un tema visual oscuro de alta fidelidad con acentos neón personalizados.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 10 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  emptyText: { color: COLORS.blue, fontSize: 16, textAlign: 'center', marginBottom: 20, fontWeight: '600' },
  resetDemoButton: { padding: 12, backgroundColor: COLORS.purple, borderRadius: 10 },
  resetDemoText: { color: COLORS.textMain, fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginVertical: 10, height: 50 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain, letterSpacing: 1 },
  headerSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  headerIconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  
  deckSwiperContainer: { 
    flex: 1, 
    marginTop: -25,
    marginBottom: 130
  },
  
  actionButtonsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-evenly', 
    alignItems: 'center', 
    position: 'absolute', 
    bottom: 35,
    zIndex: 100,
    width: width 
  },
  
  // Estilos con sombras difuminadas (Glow effects) imitando interfaces estéticas Cyberpunk/Gamer
  actionButtonWrapper: { alignItems: 'center', width: 90 },
  circleActionButtonGlowRed: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.actionRed, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6, borderColor: COLORS.actionRed, borderWidth: 1 },
  actionLabelTextRed: { fontSize: 10, fontWeight: '800', marginTop: 10, letterSpacing: 1, color: COLORS.actionRed },
  circleActionButtonGlowPurple: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6, borderColor: COLORS.purple, borderWidth: 1 },
  actionLabelTextPurple: { fontSize: 10, fontWeight: '800', marginTop: 10, letterSpacing: 1, color: COLORS.purple },
  circleActionButtonGlowBlue: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.blue, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6, borderColor: COLORS.blue, borderWidth: 1 },
  actionLabelTextBlue: { fontSize: 10, fontWeight: '800', marginTop: 10, letterSpacing: 1, color: COLORS.blue },

  // Estilos específicos estructurados para la ventana del modal de filtros
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  filterContainer: { backgroundColor: COLORS.cardBackground, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textMain },
  filterScroll: { marginBottom: 20 },
  filterCategoryLabel: { fontSize: 14, fontWeight: '600', color: COLORS.blue, marginTop: 15, marginBottom: 10 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.textSecondary, marginRight: 10, marginBottom: 10 },
  pillActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purpleLight },
  pillText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: COLORS.textMain, fontWeight: 'bold' },
  filterFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  clearButton: { paddingVertical: 12, paddingHorizontal: 20 },
  clearButtonText: { color: COLORS.textSecondary, fontWeight: 'bold', fontSize: 14 },
  applyButton: { backgroundColor: COLORS.blue, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  applyButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 14 },
});
