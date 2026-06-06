import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React, { useCallback, useContext, useState } from 'react';
import { Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

import GestionEquipo from './GestionEquipo';
import VistaJugador from './VistaJugador';

const COLORES = { 
  fondo: '#121212', cards: '#1E1E1E', botonPrincipal: '#4F46E5', 
  interactivo: '#0EA5E9', textoPrincipal: '#FFFFFF', textoSecundario: '#A1A1AA', 
  exito: '#10B981', peligro: '#EF4444', alerta: '#F59E0B', borde: '#27272A' 
};

const ControladorEquipo = () => {
  const { usuarioActivo } = useContext(AuthContext);
  const [vistaActiva, setVistaActiva] = useState('OPCIONES');
  
  const [misEquipos, setMisEquipos] = useState([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);

  const [nombreEquipo, setNombreEquipo] = useState('');
  const [tagEquipo, setTagEquipo] = useState('');
  const [juegoEquipo, setJuegoEquipo] = useState('League of Legends');
  const [descEquipo, setDescEquipo] = useState('');
  const [requisitosEquipo, setRequisitosEquipo] = useState('');
  const [nivelEquipo, setNivelEquipo] = useState('Semi competitivo');
  const [ambienteEquipo, setAmbienteEquipo] = useState('Chill');
  const [objetivoEquipo, setObjetivoEquipo] = useState('Clash');

  const cargarMisEquipos = async () => {
    // FIX 1: Si no hay usuario activo (ej. al cerrar sesión), abortamos la búsqueda
    if (!usuarioActivo?.id) return; 

    try {
      const db = await SQLite.openDatabaseAsync('koru.db');
      const data = await db.getAllAsync(`
        SELECT e.*, je.rol_equipo, je.es_capitan, je.asistencia_torneo
        FROM Equipo e JOIN Jugador_Equipo je ON e.id = je.equipo_id
        WHERE je.usuario_id = ?
      `, [usuarioActivo.id]);
      setMisEquipos(data);
    } catch (error) { console.error(error); }
  };

  // FIX 2: Usamos el signo de interrogación para que no explote si usuarioActivo es null
  useFocusEffect(useCallback(() => { cargarMisEquipos(); }, [usuarioActivo?.id]));

  // FIX 3: Evitamos renderizar cualquier interfaz si la sesión está cerrada
// FIX 3: Retornamos el fondo de la app mientras el router nos envía al Login (evita la pantalla negra)
  if (!usuarioActivo) {
    return <View style={{ flex: 1, backgroundColor: COLORES.fondo }} />;
  }

  const esTitularEnAlguno = misEquipos.some(eq => eq.rol_equipo === 'Titular');
  const limiteAlcanzado = esTitularEnAlguno || misEquipos.length >= 2;

  const registrarEquipoEnBD = async () => {
    if (nombreEquipo.trim() === '' || tagEquipo.trim() === '') return Alert.alert('Error', 'Nombre y Tag obligatorios.');
    try {
      const db = await SQLite.openDatabaseAsync('koru.db');
      const resultEquipo = await db.runAsync(
        `INSERT INTO Equipo (nombre, tag, juego, capitan_id, descripcion, objetivos, ambiente, nivel, requisitos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombreEquipo, tagEquipo.toUpperCase(), juegoEquipo, usuarioActivo.id, descEquipo, objetivoEquipo, ambienteEquipo, nivelEquipo, requisitosEquipo]
      );
      const nuevoEquipoId = resultEquipo.lastInsertRowId;
      await db.runAsync(
        `INSERT INTO Jugador_Equipo (usuario_id, equipo_id, rol_equipo, es_capitan, asistencia_torneo) VALUES (?, ?, 'Titular', 1, 'Pendiente')`,
        [usuarioActivo.id, nuevoEquipoId]
      );
      Alert.alert('¡Éxito!', `El equipo ${nombreEquipo} está listo.`);
      setVistaActiva('OPCIONES'); cargarMisEquipos();
    } catch (error) { Alert.alert('Error', 'No se pudo crear el equipo en la BD.'); }
  };

  if (vistaActiva === 'GESTION' && equipoSeleccionado) {
    return <GestionEquipo dataPuente={equipoSeleccionado} volver={() => { setEquipoSeleccionado(null); setVistaActiva('OPCIONES'); }} />
  }

  if (vistaActiva === 'CREAR_EQUIPO') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <View style={styles.headerFormulario}>
          <TouchableOpacity onPress={() => setVistaActiva('OPCIONES')} style={styles.botonAtrasForm}>
            <Ionicons name="arrow-back" size={24} color={COLORES.textoPrincipal} />
          </TouchableOpacity>
          <Text style={styles.tituloForm}>Fundar Equipo</Text>
          <View style={{width: 40}} /> 
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.cardFormulario}>
            <Text style={styles.tituloSeccionForm}>Identidad del Club</Text>
            <Text style={styles.label}>Nombre y Tag</Text>
            <View style={{flexDirection: 'row', gap: 10}}>
              <TextInput style={[styles.input, {flex: 2}]} placeholder="KORU E-Sports" placeholderTextColor={COLORES.textoSecundario} value={nombreEquipo} onChangeText={setNombreEquipo} />
              <TextInput style={[styles.input, {flex: 1, textAlign: 'center'}]} placeholder="KOR" placeholderTextColor={COLORES.textoSecundario} value={tagEquipo} onChangeText={setTagEquipo} maxLength={4} autoCapitalize="characters" />
            </View>

            <Text style={styles.label}>Título Competitivo</Text>
            <View style={styles.contenedorOpciones}>
              <TouchableOpacity style={[styles.botonOpcion, juegoEquipo === 'League of Legends' && styles.botonOpcionActivo]} onPress={() => {setJuegoEquipo('League of Legends'); Keyboard.dismiss();}}>
                <Text style={[styles.textoOpcion, juegoEquipo === 'League of Legends' && styles.textoOpcionActivo]}>League of Legends</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonOpcion, juegoEquipo === 'Valorant' && styles.botonOpcionActivo]} onPress={() => {setJuegoEquipo('Valorant'); Keyboard.dismiss();}}>
                <Text style={[styles.textoOpcion, juegoEquipo === 'Valorant' && styles.textoOpcionActivo]}>Valorant</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardFormulario}>
            <Text style={styles.tituloSeccionForm}>Enfoque y Cultura</Text>
            <Text style={styles.label}>Nivel</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
              {['Casual', 'Semi competitivo', 'Competitivo', 'Tryhard'].map(nivel => (
                <TouchableOpacity key={nivel} style={[styles.tagBoton, nivelEquipo === nivel && styles.tagBotonActivo]} onPress={() => setNivelEquipo(nivel)}>
                  <Text style={[styles.textoOpcion, nivelEquipo === nivel && styles.textoOpcionActivo]}>{nivel}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Ambiente</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
              {['Chill', 'Compañerismo', 'Flexible', 'Serio'].map(ambiente => (
                <TouchableOpacity key={ambiente} style={[styles.tagBoton, ambienteEquipo === ambiente && styles.tagBotonActivo]} onPress={() => setAmbienteEquipo(ambiente)}>
                  <Text style={[styles.textoOpcion, ambienteEquipo === ambiente && styles.textoOpcionActivo]}>{ambiente}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Objetivo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 5}}>
              {['Clash', 'Torneos', 'Scrims', 'Subir elo', 'Aprender'].map(obj => (
                <TouchableOpacity key={obj} style={[styles.tagBoton, objetivoEquipo === obj && styles.tagBotonActivo]} onPress={() => setObjetivoEquipo(obj)}>
                  <Text style={[styles.textoOpcion, objetivoEquipo === obj && styles.textoOpcionActivo]}>{obj}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.cardFormulario}>
            <Text style={styles.tituloSeccionForm}>Detalles Finales</Text>
            <Text style={styles.label}>Descripción del Equipo</Text>
            <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} placeholder="¿Qué buscan lograr juntos?" placeholderTextColor={COLORES.textoSecundario} value={descEquipo} onChangeText={setDescEquipo} multiline />
            <Text style={styles.label}>Requisitos de Ingreso</Text>
            <TextInput style={styles.input} placeholder="Ej: Diamante+, Uso de Discord..." placeholderTextColor={COLORES.textoSecundario} value={requisitosEquipo} onChangeText={setRequisitosEquipo} />
          </View>

          <TouchableOpacity style={styles.botonFundarGigante} onPress={registrarEquipoEnBD}>
            <Ionicons name="trophy-outline" size={24} color="white" style={{marginRight: 10}} />
            <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>Fundar Equipo</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (vistaActiva === 'BUSCAR') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <TouchableOpacity style={styles.botonVolverHub} onPress={() => setVistaActiva('OPCIONES')}>
          <Ionicons name="arrow-back" size={24} color={COLORES.textoPrincipal} />
          <Text style={styles.textoVolver}>Volver a Mis Equipos</Text>
        </TouchableOpacity>
        <VistaJugador misEquipos={misEquipos} limiteAlcanzado={limiteAlcanzado} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.contenedor}>
      <View style={{padding: 20, paddingTop: 40}}>
        <Text style={styles.tituloPantalla}>Mis Equipos</Text>
        <Text style={styles.subtitulo}>Titulares: Máx 1 equipo. Suplentes: Máx 2 equipos.</Text>
        
        {misEquipos.length === 0 ? (
          <View style={styles.cardVacia}>
            <Ionicons name="sad-outline" size={40} color={COLORES.textoSecundario} style={{marginBottom: 10}} />
            <Text style={{color: COLORES.textoSecundario}}>Aún no perteneces a ningún equipo.</Text>
          </View>
        ) : (
          misEquipos.map(eq => (
            <TouchableOpacity key={eq.id} style={styles.cardMiEquipo} onPress={() => { setEquipoSeleccionado(eq); setVistaActiva('GESTION'); }}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={styles.logoMini}><Text style={{color: 'white', fontWeight: 'bold'}}>{eq.tag}</Text></View>
                <View>
                  <Text style={styles.nombreMiEquipo}>{eq.nombre}</Text>
                  <Text style={{color: eq.rol_equipo === 'Titular' ? COLORES.interactivo : COLORES.alerta}}>{eq.rol_equipo} {eq.es_capitan === 1 && '👑'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORES.textoSecundario} />
            </TouchableOpacity>
          ))
        )}

        {limiteAlcanzado ? (
          <View style={styles.alertaBloqueo}>
            <Ionicons name="lock-closed" size={20} color={COLORES.alerta} style={{marginRight: 10}} />
            <Text style={{color: COLORES.textoPrincipal, flex: 1, fontSize: 13, lineHeight: 20}}>Límite de participación alcanzado. No puedes unirte ni fundar más equipos.</Text>
          </View>
        ) : (
          <View style={styles.contenedorBotones}>
            <TouchableOpacity style={styles.botonAccion} onPress={() => setVistaActiva('BUSCAR')}>
              <Ionicons name="search" size={24} color={COLORES.textoPrincipal} style={{marginBottom: 8}} />
              <Text style={styles.textoBotonSecundario}>Buscar Equipo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botonAccion, { backgroundColor: COLORES.botonPrincipal, borderColor: COLORES.botonPrincipal }]} onPress={() => setVistaActiva('CREAR_EQUIPO')}>
              <Ionicons name="add-circle-outline" size={24} color={COLORES.textoPrincipal} style={{marginBottom: 8}} />
              <Text style={{ color: COLORES.textoPrincipal, fontWeight: 'bold', textAlign: 'center' }}>Fundar Nuevo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  tituloPantalla: { color: COLORES.textoPrincipal, fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  subtitulo: { color: COLORES.textoSecundario, fontSize: 14, marginBottom: 25 },
  cardVacia: { backgroundColor: COLORES.cards, padding: 30, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORES.borde, borderStyle: 'dashed' },
  cardMiEquipo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORES.cards, padding: 15, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: COLORES.borde },
  logoMini: { width: 50, height: 50, borderRadius: 12, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: COLORES.borde },
  nombreMiEquipo: { color: COLORES.textoPrincipal, fontSize: 18, fontWeight: 'bold' },
  alertaBloqueo: { flexDirection: 'row', backgroundColor: '#451A03', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: COLORES.alerta },
  contenedorBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  botonAccion: { flex: 1, backgroundColor: COLORES.cards, padding: 20, borderRadius: 16, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: COLORES.borde },
  textoBotonSecundario: { color: COLORES.textoPrincipal, fontWeight: 'bold', textAlign: 'center', fontSize: 14 },
  
  botonVolverHub: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingTop: 50, backgroundColor: COLORES.cards, borderBottomWidth: 1, borderColor: COLORES.borde },
  textoVolver: { color: COLORES.textoPrincipal, fontSize: 16, marginLeft: 10, fontWeight: 'bold' },
  headerFormulario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: COLORES.cards, borderBottomWidth: 1, borderColor: COLORES.borde },
  botonAtrasForm: { padding: 8, backgroundColor: COLORES.fondo, borderRadius: 12, borderWidth: 1, borderColor: COLORES.borde },
  tituloForm: { color: COLORES.textoPrincipal, fontSize: 20, fontWeight: 'bold' },
  cardFormulario: { backgroundColor: COLORES.cards, padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORES.borde },
  tituloSeccionForm: { color: COLORES.interactivo, fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  label: { color: COLORES.textoSecundario, fontWeight: '600', marginBottom: 8, fontSize: 13, marginTop: 10 },
  input: { backgroundColor: COLORES.fondo, color: COLORES.textoPrincipal, padding: 15, borderRadius: 12, marginBottom: 5, borderWidth: 1, borderColor: COLORES.borde },
  contenedorOpciones: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  botonOpcion: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: COLORES.fondo, borderRadius: 12, marginHorizontal: 4, borderWidth: 1, borderColor: COLORES.borde },
  botonOpcionActivo: { backgroundColor: COLORES.botonPrincipal, borderColor: COLORES.botonPrincipal },
  textoOpcion: { color: COLORES.textoSecundario, fontWeight: '600' },
  textoOpcionActivo: { color: COLORES.textoPrincipal, fontWeight: 'bold' },
  tagBoton: { backgroundColor: COLORES.fondo, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: COLORES.borde },
  tagBotonActivo: { borderColor: COLORES.botonPrincipal, backgroundColor: COLORES.botonPrincipal },
  botonFundarGigante: { flexDirection: 'row', backgroundColor: COLORES.exito, padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 8 }
});

export default ControladorEquipo;