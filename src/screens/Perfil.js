import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

// Paleta premium alineada con el resto de la app
const COLORES = { fondo: '#0B1120', cards: '#1E293B', botonPrincipal: '#8B5CF6', interactivo: '#06B6D4', textoPrincipal: '#F8FAFC', textoSecundario: '#CBD5E1', exito: '#10B981', peligro: '#EF4444', borde: '#334155' };

const ROLES_LOL = ['Top', 'Jungla', 'Mid', 'ADC', 'Soporte'];
const ROLES_VALO = ['Duelista', 'Iniciador', 'Controlador', 'Centinela'];

const Perfil = () => {
  const { usuarioActivo, setUsuarioActivo } = useContext(AuthContext);

  const [nombre, setNombre] = useState(usuarioActivo?.nombre || '');
  const [juegoPrincipal, setJuegoPrincipal] = useState(usuarioActivo?.juegoPrincipal || 'League of Legends');
  const [rolPrimario, setRolPrimario] = useState(usuarioActivo?.rolPrimario || '');
  const [rolSecundario, setRolSecundario] = useState(usuarioActivo?.rolSecundario || '');

  useEffect(() => {
    if (usuarioActivo) {
      setNombre(usuarioActivo.nombre); setJuegoPrincipal(usuarioActivo.juegoPrincipal);
      setRolPrimario(usuarioActivo.rolPrimario); setRolSecundario(usuarioActivo.rolSecundario);
    }
  }, [usuarioActivo]);

  const cambiarJuego = (juego) => {
    setJuegoPrincipal(juego);
    setRolPrimario(''); setRolSecundario('');
  };

  // Lógica: Si eligen un primario, revisamos que no choque con el secundario
  const manejarRolPrimario = (rol) => {
    setRolPrimario(rol);
    if (rolSecundario === rol) setRolSecundario(''); 
  };

  const guardarPerfil = async () => {
    try {
      const db = await SQLite.openDatabaseAsync('koru.db');
      await db.runAsync('UPDATE Perfil SET nombre = ?, rolPrimario = ?, rolSecundario = ?, juegoPrincipal = ? WHERE id = ?', [nombre, rolPrimario, rolSecundario, juegoPrincipal, usuarioActivo.id]);
      setUsuarioActivo({ ...usuarioActivo, nombre, rolPrimario, rolSecundario, juegoPrincipal });
      Alert.alert("Éxito", "Tus preferencias se guardaron.");
    } catch (error) { Alert.alert("Error", "Problema al guardar los datos."); }
  };

  const rolesDisponibles = juegoPrincipal === 'League of Legends' ? ROLES_LOL : ROLES_VALO;
  // Filtramos el rol primario para que no aparezca en los secundarios
  const rolesSecundariosDisponibles = rolesDisponibles.filter(rol => rol !== rolPrimario);

  return (
    <ScrollView style={styles.contenedor}>
      <View style={styles.headerPerfil}>
        <View style={styles.avatarGrande}><Ionicons name="person" size={50} color={COLORES.interactivo} /></View>
        <Text style={styles.tituloHeader}>Mi Perfil KORU</Text>
      </View>

      <View style={styles.cardSeccion}>
        <Text style={styles.label}>Nombre de Invocador / Usuario</Text>
        <TextInput style={styles.input} placeholderTextColor={COLORES.textoSecundario} value={nombre} onChangeText={setNombre} />

        <Text style={styles.label}>Juego Principal</Text>
        <View style={styles.contenedorOpciones}>
          <TouchableOpacity style={[styles.botonOpcion, juegoPrincipal === 'League of Legends' && styles.botonOpcionActivo]} onPress={() => cambiarJuego('League of Legends')}><Text style={[styles.textoOpcion, juegoPrincipal === 'League of Legends' && styles.textoOpcionActivo]}>League of Legends</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.botonOpcion, juegoPrincipal === 'Valorant' && styles.botonOpcionActivo]} onPress={() => cambiarJuego('Valorant')}><Text style={[styles.textoOpcion, juegoPrincipal === 'Valorant' && styles.textoOpcionActivo]}>Valorant</Text></TouchableOpacity>
        </View>

        <Text style={styles.label}>Rol Primario</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
          {rolesDisponibles.map(rol => (
            <TouchableOpacity key={`prim-${rol}`} style={[styles.tagBoton, rolPrimario === rol && styles.tagBotonActivo]} onPress={() => manejarRolPrimario(rol)}>
              <Text style={{color: rolPrimario === rol ? 'white' : COLORES.textoSecundario, fontWeight: 'bold'}}>{rol}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Rol Secundario</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
          {rolesSecundariosDisponibles.map(rol => (
            <TouchableOpacity key={`sec-${rol}`} style={[styles.tagBoton, rolSecundario === rol && styles.tagBotonActivo]} onPress={() => setRolSecundario(rol)}>
              <Text style={{color: rolSecundario === rol ? 'white' : COLORES.textoSecundario, fontWeight: 'bold'}}>{rol}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.botonGuardar} onPress={guardarPerfil}>
          <Ionicons name="save" size={20} color="white" style={{marginRight: 10}} />
          <Text style={styles.textoBotonGuardar}>Guardar Cambios</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.botonCerrarSesion} onPress={() => setUsuarioActivo(null)}>
        <Ionicons name="log-out-outline" size={20} color={COLORES.peligro} style={{marginRight: 10}} />
        <Text style={styles.textoBotonCerrarSesion}>Cerrar Sesión</Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo, padding: 15 },
  headerPerfil: { alignItems: 'center', marginVertical: 30 },
  avatarGrande: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORES.cards, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORES.borde },
  tituloHeader: { color: COLORES.textoPrincipal, fontSize: 24, fontWeight: 'bold', marginTop: 15 },
  cardSeccion: { backgroundColor: COLORES.cards, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORES.borde },
  label: { color: COLORES.textoPrincipal, fontWeight: 'bold', marginBottom: 10, marginTop: 15, fontSize: 14 },
  input: { backgroundColor: COLORES.fondo, color: COLORES.textoPrincipal, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORES.borde, fontSize: 16 },
  contenedorOpciones: { flexDirection: 'row', justifyContent: 'space-between' },
  botonOpcion: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: COLORES.fondo, borderRadius: 12, marginHorizontal: 4, borderWidth: 1, borderColor: COLORES.borde },
  botonOpcionActivo: { backgroundColor: COLORES.botonPrincipal, borderColor: COLORES.botonPrincipal },
  textoOpcion: { color: COLORES.textoSecundario, fontWeight: '600' },
  textoOpcionActivo: { color: COLORES.textoPrincipal, fontWeight: 'bold' },
  botonGuardar: { flexDirection: 'row', backgroundColor: COLORES.exito, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  textoBotonGuardar: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  botonCerrarSesion: { flexDirection: 'row', backgroundColor: COLORES.cards, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORES.peligro },
  textoBotonCerrarSesion: { color: COLORES.peligro, fontWeight: 'bold', fontSize: 16 },
  tagBoton: { backgroundColor: COLORES.fondo, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: COLORES.borde },
  tagBotonActivo: { borderColor: COLORES.botonPrincipal, backgroundColor: COLORES.botonPrincipal }
});

export default Perfil;