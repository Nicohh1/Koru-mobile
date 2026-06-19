import { useFocusEffect } from 'expo-router';
import { CalendarDays, Gamepad2, Heart, RefreshCw, Shield } from 'lucide-react-native';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/theme';
import { AuthContext } from '../../src/context/AuthContext';
import { fetchMyMatches, PlayerMatch, syncRemoteProfile } from '../../src/services/playerMatchService';

const formatMatchDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const MatchListItem = ({ match }: { match: PlayerMatch }) => {
  const profile = match.other_profile;
  const matchDate = formatMatchDate(match.created_at);
  const initial = profile.display_name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.matchItem}>
      {profile.avatar_url ? (
        <Image
          accessibilityLabel={`Foto de ${profile.display_name}`}
          source={{ uri: profile.avatar_url }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      )}

      <View style={styles.matchDetails}>
        <Text selectable style={styles.playerName}>{profile.display_name}</Text>
        {profile.primary_game ? (
          <View style={styles.detailRow}>
            <Gamepad2 color={COLORS.blue} size={16} />
            <Text selectable style={styles.detailText}>{profile.primary_game}</Text>
          </View>
        ) : null}
        {profile.primary_role ? (
          <View style={styles.detailRow}>
            <Shield color={COLORS.purpleLight} size={16} />
            <Text selectable style={styles.detailText}>{profile.primary_role}</Text>
          </View>
        ) : null}
        {matchDate ? (
          <View style={styles.detailRow}>
            <CalendarDays color={COLORS.textSecondary} size={16} />
            <Text selectable style={styles.dateText}>{matchDate}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default function MatchesScreen() {
  const { usuarioActivo } = useContext(AuthContext) as any;
  const [matches, setMatches] = useState<PlayerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadMatches = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!usuarioActivo?.usuario) {
        throw new Error('No se pudo identificar al usuario activo.');
      }

      const remoteProfile = await syncRemoteProfile(usuarioActivo);
      const remoteMatches = await fetchMyMatches(remoteProfile.id);

      if (requestId === requestIdRef.current) setMatches(remoteMatches);
    } catch (error) {
      if (requestId === requestIdRef.current) {
        const message = error instanceof Error
          ? error.message
          : 'No se pudieron cargar tus matches. Intenta nuevamente.';
        console.error('Error cargando Mis Matches desde Supabase:', error);
        setMatches([]);
        setErrorMessage(message);
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [usuarioActivo]);

  useFocusEffect(useCallback(() => {
    void loadMatches();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadMatches]));

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MIS MATCHES</Text>
          <Text style={styles.headerCount}>
            {matches.length} {matches.length === 1 ? 'jugador' : 'jugadores'}
          </Text>
        </View>
        <Heart color={COLORS.blue} fill={COLORS.blue} size={28} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={COLORS.blue} size="large" />
          <Text style={styles.stateText}>Cargando matches...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text selectable style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={loadMatches} style={styles.retryButton}>
            <RefreshCw color={COLORS.background} size={18} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.stateContainer}>
          <Heart color={COLORS.textSecondary} size={40} />
          <Text style={styles.emptyTitle}>Aun no tienes matches</Text>
          <Text style={styles.emptyText}>Tus proximas conexiones apareceran aqui.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          data={matches}
          keyExtractor={(match) => match.id}
          renderItem={({ item }) => <MatchListItem match={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: COLORS.glassBorder, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  headerCount: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  listContent: { gap: 12, padding: 16, paddingBottom: 28 },
  matchItem: { alignItems: 'center', backgroundColor: COLORS.cardBackground, borderColor: COLORS.glassBorder, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 14, minHeight: 118, padding: 16 },
  avatar: { borderColor: COLORS.blue, borderRadius: 38, borderWidth: 2, height: 76, width: 76 },
  avatarFallback: { alignItems: 'center', backgroundColor: COLORS.purple, justifyContent: 'center' },
  avatarInitial: { color: COLORS.textMain, fontSize: 28, fontWeight: '800' },
  matchDetails: { flex: 1, gap: 6, minWidth: 0 },
  playerName: { color: COLORS.textMain, fontSize: 17, fontWeight: '700' },
  detailRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  detailText: { color: COLORS.textSecondary, flex: 1, fontSize: 13 },
  dateText: { color: COLORS.textSecondary, fontSize: 12 },
  stateContainer: { alignItems: 'center', flex: 1, gap: 14, justifyContent: 'center', padding: 28 },
  stateText: { color: COLORS.textSecondary, fontSize: 14 },
  errorText: { color: COLORS.actionRed, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  retryButton: { alignItems: 'center', backgroundColor: COLORS.blue, borderRadius: 8, flexDirection: 'row', gap: 8, minHeight: 44, paddingHorizontal: 20 },
  retryButtonText: { color: COLORS.background, fontSize: 14, fontWeight: '800' },
  emptyTitle: { color: COLORS.textMain, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
});
