import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native'; // Importamos componentes visuales
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '../src/context/AuthContext';
import { crearPerfilesDePrueba, iniciarBaseDeDatos } from '../src/database/db';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // NUEVO ESTADO: ¿La base de datos está lista?
  const [dbLista, setDbLista] = useState(false);

  useEffect(() => {
    async function prepararBD() {
      const db = await iniciarBaseDeDatos();
      if (db) {
        await crearPerfilesDePrueba(db);
      }
      // Cuando termina todo el proceso, avisamos que está lista
      setDbLista(true);
    }
    prepararBD();
  }, []);

  // EL PORTERO DE LA BASE DE DATOS: 
  // Mientras se crea, mostramos una pantalla de carga
  if (!dbLista) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // Si ya cargó, mostramos la app normalmente
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}