import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useContext } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthContext } from '../../src/context/AuthContext'; // 1. Importamos la memoria
import LoginRapido from '../../src/screens/LoginRapido'; // 2. Importamos la pantalla

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { usuarioActivo } = useContext(AuthContext); // 3. Leemos quién es el usuario

  // 4. EL PORTERO: Si no hay usuario, mostramos el login y ESCONDEMOS las pestañas
  if (!usuarioActivo) {
    return <LoginRapido />;
  }

  // Si hay usuario, mostramos el menú inferior normalmente
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gestion"
        options={{
          title: 'Equipo',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}


import { iniciarBaseDeDatos, iniciarTablaFeedback } from '../../src/database/db'; // Ajusta la ruta

// Dentro de tu función de inicio...
const prepararApp = async () => {
  try {
    const db = await iniciarBaseDeDatos(); 
    await iniciarTablaFeedback(db); // <-- Agregas esta línea
  } catch (error) {
    console.error(error);
  }
};
