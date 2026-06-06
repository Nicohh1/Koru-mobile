import { useFocusEffect } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const COLORES = { fondo: '#0B1120', cards: '#1E293B', botonPrincipal: '#8B5CF6', interactivo: '#06B6D4', textoPrincipal: '#F8FAFC', textoSecundario: '#CBD5E1', estadoReclutando: '#10B981', estadoCerrado: '#EF4444' };

const VistaJugador = ({ misEquipos = [], limiteAlcanzado = false }) => {
  const { usuarioActivo } = useContext(AuthContext); 
  const [filtroActivo, setFiltroActivo] = useState('Todos');
  const [equiposBD, setEquiposBD] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [misPostulaciones, setMisPostulaciones] = useState([]); 

  useFocusEffect(
    useCallback(() => {
      const cargarDatos = async () => {
        try {
          const db = await SQLite.openDatabaseAsync('koru.db');
          const query = `SELECT Equipo.*, Perfil.nombre AS capitan_nombre FROM Equipo LEFT JOIN Perfil ON Equipo.capitan_id = Perfil.id`;
          const equipos = await db.getAllAsync(query);
          setEquiposBD(equipos);

          const postulacionesBD = await db.getAllAsync(`
            SELECT p.*, e.nombre as equipo_nombre 
            FROM Postulacion p JOIN Equipo e ON p.equipo_id = e.id WHERE p.usuario_id = ?
          `, [usuarioActivo.id]);
          
          setMisPostulaciones(postulacionesBD);
        } catch (error) {
          console.error(error);
        } finally {
          setCargando(false);
        }
      };
      cargarDatos();
    }, [usuarioActivo.id])
  );

  const equiposFiltrados = equiposBD.filter(equipo => filtroActivo === 'Todos' ? true : equipo.juego === filtroActivo);

  const postularAlEquipo = async (equipo) => {
    if (!usuarioActivo.rolPrimario) return Alert.alert("Falta información", "Ve a tu Perfil y selecciona un Rol Primario antes de postular.");

    Alert.alert("Confirmar Postulación", `¿Quieres postular a ${equipo.tag} como ${usuarioActivo.rolPrimario}?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Enviar", onPress: async () => {
            try {
              const db = await SQLite.openDatabaseAsync('koru.db');
              const pendiente = await db.getFirstAsync("SELECT * FROM Postulacion WHERE usuario_id = ? AND equipo_id = ? AND estado = 'Pendiente'", [usuarioActivo.id, equipo.id]);
              if (pendiente) return Alert.alert("Aviso", "Ya tienes una postulación pendiente en este equipo.");

              const rechazada = await db.getFirstAsync("SELECT * FROM Postulacion WHERE usuario_id = ? AND equipo_id = ? AND estado = 'Rechazada'", [usuarioActivo.id, equipo.id]);
              if (rechazada) {
                await db.runAsync("UPDATE Postulacion SET estado = 'Pendiente', rol_postulado = ? WHERE id = ?", [usuarioActivo.rolPrimario, rechazada.id]);
              } else {
                await db.runAsync('INSERT INTO Postulacion (usuario_id, equipo_id, rol_postulado) VALUES (?, ?, ?)', [usuarioActivo.id, equipo.id, usuarioActivo.rolPrimario]);
              }
              
              Alert.alert("¡Éxito!", "Postulación enviada al capitán.");
              const actualizadas = await db.getAllAsync(`SELECT p.*, e.nombre as equipo_nombre FROM Postulacion p JOIN Equipo e ON p.equipo_id = e.id WHERE p.usuario_id = ?`, [usuarioActivo.id]);
              setMisPostulaciones(actualizadas);
            } catch (error) {
              Alert.alert("Error", "No se pudo enviar la postulación.");
            }
          } 
        }
      ]
    );
  };

  if (cargando) return <View style={[styles.contenedor, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORES.botonPrincipal} /></View>;

  return (
    <ScrollView style={styles.contenedor}>
      <View style={styles.headerBuscador}>
        <Text style={styles.tituloPantalla}>Buscar Equipo</Text>
      </View>

      {misPostulaciones.length > 0 && (
        <View style={styles.seccionResultados}>
          <Text style={styles.subtituloResultados}>Mis Postulaciones</Text>
          {misPostulaciones.map(post => (
            <View key={post.id} style={styles.filaPostulacion}>
              <Text style={{color: 'white', fontWeight: 'bold'}}>{post.equipo_nombre}</Text>
              <View style={[styles.badgeEstado, { backgroundColor: post.estado === 'Pendiente' ? '#F59E0B' : post.estado === 'Rechazada' ? '#EF4444' : '#10B981' }]}>
                <Text style={{color: 'white', fontSize: 11, fontWeight: 'bold'}}>{post.estado}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.seccionResultados}>
        <Text style={styles.subtituloResultados}>Equipos Disponibles ({equiposFiltrados.length})</Text>

        {equiposFiltrados.map((equipo) => {
          const estaReclutando = equipo.reclutamientoAbierto === 1;
          const colorEstado = estaReclutando ? COLORES.estadoReclutando : COLORES.estadoCerrado;
          
          const miPostulacion = misPostulaciones.find(p => p.equipo_id === equipo.id);
          const esMiEquipo = misEquipos.some(eq => eq.id === equipo.id);
          
          // NUEVA VALIDACIÓN: Saber si soy el líder absoluto
          const soyLider = equipo.capitan_id === usuarioActivo.id;

          let textoBoton = 'Postular al Equipo';
          let disabled = false;

          if (soyLider) {
            textoBoton = 'Eres líder de este equipo';
            disabled = true;
          } else if (esMiEquipo) {
            textoBoton = 'Ya eres parte de este equipo';
            disabled = true;
          } else if (limiteAlcanzado) {
            textoBoton = 'Límite de equipos alcanzado';
            disabled = true;
          } else if (miPostulacion && miPostulacion.estado === 'Pendiente') {
            textoBoton = 'Postulación en espera';
            disabled = true;
          } else if (!estaReclutando) {
            textoBoton = 'Reclutamiento Cerrado';
            disabled = true;
          }

          return (
            <View key={equipo.id} style={styles.cardEquipo}>
              <View style={styles.cardHeader}>
                <View style={styles.infoPrincipalHeader}>
                  <View style={styles.logoMini}><Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>{equipo.tag || '???'}</Text></View>
                  <View>
                    <Text style={styles.nombreEquipo}>{equipo.nombre}</Text>
                    <Text style={styles.juegoEquipo}>{equipo.juego}</Text>
                  </View>
                </View>
                <View style={[styles.badgeEstado, { backgroundColor: estaReclutando ? '#064E3B' : '#450A0A' }]}>
                  <View style={[styles.puntoEstado, { backgroundColor: colorEstado }]} />
                  <Text style={[styles.textoEstado, { color: colorEstado }]}>{estaReclutando ? 'Reclutando' : 'Cerrado'}</Text>
                </View>
              </View>

              <Text style={styles.descripcionEquipo}>{equipo.descripcion}</Text>

              <TouchableOpacity 
                style={[styles.botonPostular, disabled && {backgroundColor: '#334155'}]}
                disabled={disabled}
                onPress={() => postularAlEquipo(equipo)}
              >
                <Text style={[styles.textoBotonPostular, disabled && {color: COLORES.textoSecundario}]}>
                  {textoBoton}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  headerBuscador: { padding: 20, paddingTop: 40, backgroundColor: COLORES.cards },
  tituloPantalla: { color: COLORES.textoPrincipal, fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  seccionResultados: { padding: 20, paddingTop: 0 },
  subtituloResultados: { color: COLORES.textoPrincipal, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  filaPostulacion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORES.cards, padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  cardEquipo: { backgroundColor: COLORES.cards, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  infoPrincipalHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoMini: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#334155' },
  nombreEquipo: { color: COLORES.textoPrincipal, fontSize: 18, fontWeight: 'bold' },
  juegoEquipo: { color: COLORES.interactivo, fontSize: 14, fontWeight: '600' },
  badgeEstado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  puntoEstado: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  textoEstado: { fontSize: 11, fontWeight: 'bold' },
  descripcionEquipo: { color: COLORES.textoSecundario, fontSize: 14, marginBottom: 15, lineHeight: 20 },
  botonPostular: { backgroundColor: COLORES.botonPrincipal, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  textoBotonPostular: { color: COLORES.textoPrincipal, fontWeight: 'bold', fontSize: 16 }
});

export default VistaJugador;