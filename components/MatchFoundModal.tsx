import { Heart, X } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '../constants/theme';
import { RemoteProfile } from '../src/services/playerMatchService';

type MatchFoundModalProps = {
  visible: boolean;
  profile: RemoteProfile | null;
  onClose: () => void;
};

export function MatchFoundModal({ visible, profile, onClose }: MatchFoundModalProps) {
  const initial = profile?.display_name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Heart color={COLORS.blue} fill={COLORS.blue} size={32} />
          </View>

          <Text style={styles.title}>{'\u00a1Hicieron Match!'}</Text>

          {profile?.avatar_url ? (
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

          <Text style={styles.playerName}>{profile?.display_name || 'Jugador'}</Text>

          <TouchableOpacity
            accessibilityLabel="Cerrar aviso de match"
            onPress={onClose}
            style={styles.closeButton}
          >
            <X color={COLORS.background} size={20} />
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderColor: COLORS.blue,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 360,
    padding: 28,
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 202, 255, 0.12)',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    marginBottom: 16,
    width: 64,
  },
  title: {
    color: COLORS.textMain,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  avatar: {
    borderColor: COLORS.purpleLight,
    borderRadius: 56,
    borderWidth: 2,
    height: 112,
    width: 112,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
  },
  avatarInitial: {
    color: COLORS.textMain,
    fontSize: 42,
    fontWeight: '800',
  },
  playerName: {
    color: COLORS.textMain,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    marginTop: 14,
    textAlign: 'center',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: COLORS.blue,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 24,
    width: '100%',
  },
  closeButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '800',
  },
});
