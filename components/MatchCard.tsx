import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, MapPin, Star, Target } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountryFlag from "react-native-country-flag";
import * as Progress from 'react-native-progress';
import { COLORS } from '../constants/theme';

// Capturamos el viewport del dispositivo para escalar la tarjeta de manera responsiva en cualquier pantalla
const { width, height } = Dimensions.get('window');

// COMPONENTE: MATCHCARD (TARJETA DE PERFIL)
// Renderiza de forma estructurada y minimalista toda la información técnica,
// competitiva y conductual de un candidato a compañero de equipo (Dúo).
export const MatchCard = ({ card }: { card: any }) => {
  return (
    <View style={styles.glassCardWrapper}>
      <LinearGradient
        colors={[COLORS.purple, COLORS.blue]}
        style={styles.glassCardBorder}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.profileCardInner}>
          
          {/* Sección Superior */}
          <View style={styles.topSection}>
            {/* Gráfico circular de compatibilidad utilizando react-native-progress */}
            <View style={styles.compatibilityContainer}>
              <Progress.Circle progress={card.compatibility} size={70} thickness={4} color={COLORS.blue} unfilledColor={'transparent'} borderWidth={0} />
              {/* Texto absoluto sobrepuesto en el centro del círculo de progreso */}
              <View style={styles.compatibilityTextWrapper}>
                <Text style={styles.compatibilityValue}>{`${(card.compatibility * 100)}%`}</Text>
                <Text style={styles.compatibilityLabel}>COMPATIBILIDAD</Text>
              </View>
            </View>
            
            {/* Contenedor de la foto de perfil con un indicador de estado "Online" en tiempo real */}
            <View style={styles.photoWrapper}>
              <Image source={{ uri: card.profilePic }} style={styles.profilePhoto} resizeMode="cover" />
              <View style={styles.onlineIndicator} />
            </View>
            
            {/* Botón contextual superior derecho (Opciones/Reportar) */}
            <TouchableOpacity style={styles.optionsButton}>
                <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
            </TouchableOpacity>
          </View>

          {/*SECCIÓN DE INFORMACIÓN (SCROLLABLE)*/}
          {/* Ocultamos el indicador de scroll para mantener una UI limpia y minimalista */}
          <ScrollView style={styles.scrollInfo} showsVerticalScrollIndicator={false}>
            {/* Identificador del jugador y verificación de cuenta */}
            <View style={styles.nameAndLevelContainer}>
              <Text style={styles.playerName}>{card.name}</Text>
              {/* Si el usuario está verificado por API, inyecta visualmente el badge de confianza */}
              {card.verified && <CheckCircle2 color={COLORS.purple} size={18} style={styles.verifiedIcon} />}
            </View>
            <Text style={[styles.playerLevel, { color: COLORS.purple }]}>{`Nivel ${card.level}`}</Text>
            
            {/* Etiquetas (Tags) de estilo, rol y disponibilidad para reducir la carga cognitiva */}
            <View style={styles.tagsContainer}>
              {card.style && <View style={styles.tag}><Text style={styles.tagText}>{card.style}</Text></View>}
              {card.role && <View style={[styles.tag, { borderColor: COLORS.blue }]}><Text style={styles.tagText}>{card.role}</Text></View>}
              {card.availability && <View style={[styles.tag, { borderColor: COLORS.textSecondary }]}><Text style={styles.tagText}>🕒 {card.availability}</Text></View>}
            </View>

            {/* Rango y Ubicación geográfica */}
            <View style={styles.rankLocationRow}>
              {/* Muestra el rango verificado obtenido directamente por API externa */}
              <View style={styles.rankBadge}>
                <Target color={COLORS.rankDiamond} size={14} style={styles.targetIcon} />
                <Text style={styles.rankText}>{card.rank}</Text>
              </View>
              {/* Renderiza de forma dinámica la bandera del país usando react-native-country-flag */}
              <View style={styles.countryBadge}>
                <MapPin color={COLORS.textSecondary} size={14} style={styles.countryIcon} />
                <CountryFlag isoCode={card.countryISO} size={12} style={styles.flagIcon} />
                <Text style={styles.countryName}>{card.countryName}</Text>
              </View>
            </View>

            {/* 2. CONTENEDOR DEL SISTEMA DE KARMA */}
            {/* Bloque visual que valida tu hipótesis antitoxicidad de cara al usuario */}
            <View style={styles.karmaContainer}>
              <Text style={styles.karmaLabelText}>KARMA</Text>
              <View style={styles.karmaValueRow}>
                <Star color={COLORS.blue} fill={COLORS.blue} size={14} style={styles.karmaStar} />
                <Text style={styles.karmaValue}>{card.karma ? card.karma.toLocaleString() : '1,000'}</Text>
              </View>
              <Text style={styles.notoxicText}>No tóxico • Buen compañero</Text>
            </View>
            
            {/* 3. BARRA DE ESTADÍSTICAS TÉCNICAS */}
            {/* Desglose rápido de rendimiento para agilizar el scouting del usuario */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}><Text style={styles.statLabel}>VICTORIAS</Text><Text style={styles.statValue}>{card.victorias}</Text></View>
              <View style={styles.statItem}><Text style={styles.statLabel}>PARTIDAS</Text><Text style={styles.statValue}>{card.partidas}</Text></View>
            </View>

            {/* Catálogo visual de videojuegos asociados al perfil */}
            <View style={styles.gamesSection}>
              <Text style={styles.gamesSectionTitle}>JUEGOS QUE JUEGA</Text>
              <View style={styles.gamesListScrollContent}>
                {/* Mapea la colección de juegos agregando de forma estática una pastilla expansiva (+2) */}
                {[...card.games, { id: 'more', label: '+2' }].map((gameItem, idx) => (
                    <View key={idx} style={styles.gameItemContainer}>
                      {gameItem.id === 'more' ? (
                          <View style={styles.moreGamesBox}><Text style={styles.moreGamesText}>{gameItem.label}</Text></View>
                      ) : (
                          <View style={styles.gameLogoPlaceholder}>
                              <Image source={{ uri: gameItem.logo }} style={styles.gameLogo} resizeMode="contain" />
                          </View>
                      )}
                    </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
};

// HOJA DE ESTILOS (SISTEMA DE DISEÑO)
const styles = StyleSheet.create({
  // Caja contenedora con escalado proporcional (90% del ancho de pantalla, 53% del alto) y sombras suaves
  glassCardWrapper: { width: width * 0.9, height: height * 0.53, borderRadius: 22, overflow: 'hidden', shadowColor: COLORS.background, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 15, elevation: 10 },
  glassCardBorder: { flex: 1, borderRadius: 22, padding: 2 },
  profileCardInner: { flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: 20, overflow: 'hidden' },
  // Layout de la cabecera interna de la tarjeta
  topSection: { flexDirection: 'row', height: '40%', padding: 15, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  compatibilityContainer: { position: 'absolute', top: 15, left: 15, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  compatibilityTextWrapper: { position: 'absolute', alignItems: 'center' },
  compatibilityValue: { fontSize: 16, fontWeight: '800', color: COLORS.blue },
  compatibilityLabel: { fontSize: 7, color: COLORS.textSecondary, marginTop: -2 },
  // Foto de perfil centralizada con bordes suavizados e indicador "Online" integrado de forma absoluta
  photoWrapper: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  profilePhoto: { width: 136, height: 136, borderRadius: 68, borderWidth: 2, borderColor: COLORS.blue, zIndex: 5 },
  onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.onlineGreen, borderColor: COLORS.cardBackground, borderWidth: 2, zIndex: 10 },
  optionsButton: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 12, borderRadius: 15, zIndex: 10 },
  dot: { width: 4, height: 4, backgroundColor: COLORS.textMain, borderRadius: 2, marginVertical: 2 },
  // Bloque inferior de información técnica del jugador
  scrollInfo: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  nameAndLevelContainer: { flexDirection: 'row', alignItems: 'center' },
  playerName: { fontSize: 22, fontWeight: 'bold', color: COLORS.textMain, marginRight: 6 },
  verifiedIcon: { marginTop: -2 },
  playerLevel: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  // Contenedor de badges flexibles (Pills de información estática)
  tagsContainer: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.purple, marginRight: 8, marginBottom: 5 },
  tagText: { color: COLORS.textMain, fontSize: 10, fontWeight: '700' },
  // Segmentación competitiva y geográfica
  rankLocationRow: { flexDirection: 'row', paddingVertical: 10, alignItems: 'center' },
  rankBadge: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  targetIcon: { marginRight: 5 },
  rankText: { fontSize: 14, color: COLORS.textMain },
  countryBadge: { flexDirection: 'row', alignItems: 'center' },
  countryIcon: { marginRight: 5 },
  flagIcon: { width: 20, height: 14, borderRadius: 2, marginRight: 6 },
  countryName: { fontSize: 14, color: COLORS.textSecondary },
  // Estilización del bloque de reputación comunitaria (Karma)
  karmaContainer: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 15, padding: 15, marginVertical: 5 },
  karmaLabelText: { fontSize: 9, color: COLORS.textSecondary, letterSpacing: 1 },
  karmaValueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  karmaStar: { marginRight: 6 },
  karmaValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.textMain },
  notoxicText: { fontSize: 12, color: COLORS.onlineGreen, fontWeight: '600', marginTop: 5 },
  // Grid de datos analíticos de rendimiento técnico
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0F0F1A', paddingVertical: 15, marginVertical: 10, borderColor: '#1A1A2A', borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderColor: '#1A1A2A' },
  statLabel: { fontSize: 9, color: COLORS.textSecondary, marginBottom: 5, letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  // Listado de juegos preferidos del perfil analizado
  gamesSection: { paddingBottom: 20 },
  gamesSectionTitle: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
  gamesListScrollContent: { flexDirection: 'row', paddingRight: 15 },
  gameItemContainer: { marginRight: 10, width: 60, height: 60, borderRadius: 12, backgroundColor: '#0F0F1A', overflow: 'hidden' },
  gameLogoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardBackground },
  gameLogo: { width: 60, height: 60 },
  moreGamesBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#1A1A2A' },
  moreGamesText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
});