import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const COLORES = { 
  fondo: '#0B1120', cards: '#1E293B', botonPrincipal: '#8B5CF6', 
  interactivo: '#06B6D4', textoPrincipal: '#F8FAFC', textoSecundario: '#CBD5E1', 
  exito: '#10B981', peligro: '#EF4444', alerta: '#F59E0B', borde: '#334155'
};

const GestionEquipo = ({ dataPuente, volver }) => {
  const { usuarioActivo } = useContext(AuthContext);
  
  const [equipoBD, setEquipoBD] = useState(null);
  const [integrantes, setIntegrantes] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]); 
  const [sugerencias, setSugerencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reclutamientoAbierto, setReclutamientoAbierto] = useState(false);
  
  const [modoConfiguracion, setModoConfiguracion] = useState(false);
  const [verAsistencia, setVerAsistencia] = useState(false);
  const [editandoInfo, setEditandoInfo] = useState(false);
  
  const [formDesc, setFormDesc] = useState('');
  const [formNivel, setFormNivel] = useState('');
  const [formAmbiente, setFormAmbiente] = useState('');
  const [formObjetivos, setFormObjetivos] = useState('');
  const [formReq, setFormReq] = useState('');

  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  // FIX: Agregamos ?. para evitar el error 'id' of null al desmontar la vista
  const soyCapitan = dataPuente?.es_capitan === 1;
  const soyTitular = dataPuente?.rol_equipo === 'Titular';
  
  const miDatosEnEquipo = integrantes.find(i => i.jugador_id === usuarioActivo?.id);
  const miAsistencia = miDatosEnEquipo ? miDatosEnEquipo.asistencia_torneo : 'Pendiente';

  const cargarDatos = async () => {
    // FIX: Si dataPuente ya es null (porque nos estamos yendo de la pantalla), abortamos la carga
    if (!dataPuente?.id) return;

    try {
      const db = await SQLite.openDatabaseAsync('koru.db');
      await db.runAsync("UPDATE Postulacion SET estado = 'Pendiente' WHERE equipo_id = ? AND estado IS NULL", [dataPuente.id]);
      
      const equipo = await db.getFirstAsync('SELECT * FROM Equipo WHERE id = ?', [dataPuente.id]);
      if (equipo) {
        setEquipoBD(equipo);
        setReclutamientoAbierto(equipo.reclutamientoAbierto === 1);
        setFormDesc(equipo.descripcion || '');
        setFormNivel(equipo.nivel || '');
        setFormAmbiente(equipo.ambiente || '');
        setFormObjetivos(equipo.objetivos || '');
        setFormReq(equipo.requisitos || '');
      }

      const queryJugadores = `
        SELECT p.id AS jugador_id, p.nombre, p.rolPrimario, je.rol_equipo, je.es_capitan, je.asistencia_torneo 
        FROM Perfil p JOIN Jugador_Equipo je ON p.id = je.usuario_id WHERE je.equipo_id = ?
      `;
      const jugadores = await db.getAllAsync(queryJugadores, [dataPuente.id]);
      setIntegrantes(jugadores);

      if (soyCapitan) {
        const solicitudes = await db.getAllAsync(`
          SELECT p.*, u.nombre
          FROM Postulacion p
          JOIN Perfil u ON p.usuario_id = u.id
          JOIN Equipo e ON p.equipo_id = e.id
          WHERE p.equipo_id = ? AND e.capitan_id = ? AND p.estado = 'Pendiente'
        `, [dataPuente.id, usuarioActivo.id]);
        setPostulaciones(solicitudes);

        const sugs = await db.getAllAsync(`
          SELECT s.*, p.nombre as sugerido_nombre, p.rolPrimario, sgr.nombre as sugeridor_nombre 
          FROM Sugerencia s JOIN Perfil p ON s.sugerido_id = p.id JOIN Perfil sgr ON s.sugeridor_id = sgr.id 
          WHERE s.equipo_id = ? AND s.estado = 'Pendiente'
        `, [dataPuente.id]);
        setSugerencias(sugs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, [dataPuente?.id]));

  // ==========================================
  // CONFIRMACIÓN DE ASISTENCIA IRREVERSIBLE
  // ==========================================
  const confirmarAsistencia = (respuesta) => {
    Alert.alert("Acción Irreversible", `¿Estás seguro de confirmar que ${respuesta === 'Sí' ? 'SÍ' : 'NO'} asistirás? Esta decisión no se puede cambiar.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", style: "destructive", onPress: async () => {
          const db = await SQLite.openDatabaseAsync('koru.db');
          await db.runAsync('UPDATE Jugador_Equipo SET asistencia_torneo = ? WHERE usuario_id = ? AND equipo_id = ?', [respuesta, usuarioActivo.id, equipoBD.id]);
          cargarDatos();
      }}
    ]);
  };

  const guardarEdicionEquipo = async () => {
    const db = await SQLite.openDatabaseAsync('koru.db');
    await db.runAsync('UPDATE Equipo SET descripcion = ?, nivel = ?, ambiente = ?, objetivos = ?, requisitos = ? WHERE id = ?', [formDesc, formNivel, formAmbiente, formObjetivos, formReq, equipoBD.id]);
    setEditandoInfo(false); cargarDatos();
  };
  
  const toggleReclutamiento = async (valor) => { setReclutamientoAbierto(valor); const db = await SQLite.openDatabaseAsync('koru.db'); await db.runAsync('UPDATE Equipo SET reclutamientoAbierto = ? WHERE id = ?', [valor ? 1 : 0, equipoBD.id]); };
  
  const toggleRolJugador = async (idJugador, nombreJugador, rolActual) => {
    const nuevoRol = rolActual === 'Titular' ? 'Suplente' : 'Titular';
    let mensaje = `¿Pasar a ${nombreJugador} a ${nuevoRol}?`;
    if (nuevoRol === 'Titular') mensaje += `\n\nATENCIÓN: Al ascender a Titular, será expulsado de otros equipos.`;
    Alert.alert("Cambiar Rol", mensaje, [{ text: "Cancelar", style: "cancel" }, { text: "Sí", onPress: async () => {
          const db = await SQLite.openDatabaseAsync('koru.db');
          if (nuevoRol === 'Titular') await db.runAsync("DELETE FROM Jugador_Equipo WHERE usuario_id = ? AND equipo_id != ?", [idJugador, equipoBD.id]);
          await db.runAsync("UPDATE Jugador_Equipo SET rol_equipo = ? WHERE usuario_id = ? AND equipo_id = ?", [nuevoRol, idJugador, equipoBD.id]);
          cargarDatos(); 
      }}]);
  };
  
  const expulsarJugador = (idJugador, nombreJugador) => {
    Alert.alert("Expulsar", `¿Remover a ${nombreJugador}?`, [{ text: "Cancelar", style: "cancel" }, { text: "Sí", style: "destructive", onPress: async () => {
          const db = await SQLite.openDatabaseAsync('koru.db');
          await db.runAsync("DELETE FROM Jugador_Equipo WHERE usuario_id = ? AND equipo_id = ?", [idJugador, equipoBD.id]);
          await db.runAsync("DELETE FROM Postulacion WHERE usuario_id = ? AND equipo_id = ?", [idJugador, equipoBD.id]);
          cargarDatos(); 
      }}]);
  };

  const confirmarBorrarEquipo = () => { Alert.alert("Eliminar", `¿Disolver "${equipoBD?.nombre}"?`, [{ text: "Cancelar", style: "cancel" }, { text: "Sí", style: "destructive", onPress: async () => { const db = await SQLite.openDatabaseAsync('koru.db'); await db.runAsync('DELETE FROM Equipo WHERE id = ?', [equipoBD.id]); await db.runAsync('DELETE FROM Jugador_Equipo WHERE equipo_id = ?', [equipoBD.id]); volver(); }}]); };
  const aceptarJugador = async (postulacion) => { if (integrantes.length >= 5) return Alert.alert("Equipo Lleno", "Límite de 5."); const db = await SQLite.openDatabaseAsync('koru.db'); await db.runAsync("UPDATE Postulacion SET estado = 'Aceptada' WHERE id = ?", [postulacion.id]); await db.runAsync("INSERT INTO Jugador_Equipo (usuario_id, equipo_id, rol_equipo, es_capitan, asistencia_torneo) SELECT ?, ?, 'Suplente', 0, 'Pendiente' WHERE NOT EXISTS (SELECT 1 FROM Jugador_Equipo WHERE usuario_id = ? AND equipo_id = ?)", [postulacion.usuario_id, equipoBD.id, postulacion.usuario_id, equipoBD.id]); Alert.alert("Postulacion aceptada", "El jugador fue agregado al equipo como suplente."); cargarDatos(); };
  const rechazarJugador = (post) => { Alert.alert("Rechazar", `¿Rechazar a ${post.nombre}?`, [{ text: "Cancelar", style: "cancel" }, { text: "Sí", style: "destructive", onPress: async () => { const db = await SQLite.openDatabaseAsync('koru.db'); await db.runAsync("UPDATE Postulacion SET estado = 'Rechazada' WHERE id = ?", [post.id]); Alert.alert("Postulacion rechazada", "La solicitud fue rechazada correctamente."); cargarDatos(); }}]); };
  
  const buscarUsuarios = async () => { if (busquedaUsuario.trim() === '') return; const db = await SQLite.openDatabaseAsync('koru.db'); setResultadosBusqueda(await db.getAllAsync(`SELECT * FROM Perfil WHERE nombre LIKE ? AND juegoPrincipal = ? AND id NOT IN (SELECT usuario_id FROM Jugador_Equipo WHERE equipo_id = ?)`, [`%${busquedaUsuario}%`, equipoBD.juego, equipoBD.id])); };
  const sugerirJugador = async (jugador) => { Alert.alert("Sugerir", `¿Recomendar a ${jugador.nombre}?`, [{ text: "Cancelar", style: "cancel" }, { text: "Sí", onPress: async () => { const db = await SQLite.openDatabaseAsync('koru.db'); const existe = await db.getFirstAsync("SELECT * FROM Sugerencia WHERE sugerido_id = ? AND equipo_id = ? AND estado = 'Pendiente'", [jugador.id, equipoBD.id]); if (existe) return Alert.alert("Aviso", "Ya sugerido."); await db.runAsync("INSERT INTO Sugerencia (equipo_id, sugeridor_id, sugerido_id) VALUES (?, ?, ?)", [equipoBD.id, usuarioActivo.id, jugador.id]); Alert.alert("Éxito", "Sugerencia enviada."); setResultadosBusqueda([]); setBusquedaUsuario(''); }}]); };
  
  // FIX: Función real para que el capitán agregue jugadores directamente desde el buscador
  const invitarJugadorDirecto = async (jugador) => {
    if (integrantes.length >= 5) return Alert.alert("Equipo Lleno", "Límite de 5 integrantes.");
    Alert.alert("Invitar", `¿Añadir a ${jugador.nombre} como suplente?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, añadir", onPress: async () => {
          const db = await SQLite.openDatabaseAsync('koru.db');
          await db.runAsync("INSERT INTO Jugador_Equipo (usuario_id, equipo_id, rol_equipo) VALUES (?, ?, 'Suplente')", [jugador.id, equipoBD.id]);
          Alert.alert("Éxito", "Jugador añadido al equipo.");
          setResultadosBusqueda([]); setBusquedaUsuario('');
          cargarDatos();
      }}
    ]);
  };

  const responderSugerencia = async (sugerenciaId, jugadorId, accion) => { const db = await SQLite.openDatabaseAsync('koru.db'); await db.runAsync("UPDATE Sugerencia SET estado = ? WHERE id = ?", [accion === 'Aceptar' ? 'Aceptada' : 'Rechazada', sugerenciaId]); if (accion === 'Aceptar') { if (integrantes.length >= 5) return Alert.alert("Equipo Lleno", "No puedes aceptar más."); await db.runAsync("INSERT INTO Jugador_Equipo (usuario_id, equipo_id, rol_equipo) VALUES (?, ?, 'Suplente')", [jugadorId, equipoBD.id]); Alert.alert("Aceptado", "Jugador añadido como suplente."); } cargarDatos(); };

  if (cargando || !equipoBD) return <View style={styles.contenedorCentrado}><ActivityIndicator size="large" color={COLORES.botonPrincipal} /></View>;

  const asistenTodos = integrantes.length === 5 && integrantes.every(i => i.asistencia_torneo === 'Sí');

  return (
    <ScrollView style={styles.contenedor} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={volver} style={styles.botonVolver}>
        <Ionicons name="arrow-back" size={20} color="white" style={{marginRight: 10}} />
        <Text style={{color: 'white', fontWeight: 'bold'}}>Volver a Mis Equipos</Text>
      </TouchableOpacity>

      <View style={styles.cardHeader}>
        <View style={styles.headerTop}>
          <View style={styles.logoPlaceholder}><Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>{equipoBD.tag}</Text></View>
          <View style={styles.headerInfo}>
            <Text style={styles.nombreEquipo}>{equipoBD.nombre}</Text>
            <Text style={styles.juegoAsociado}>{equipoBD.juego}</Text>
          </View>
          {soyCapitan && (
            <TouchableOpacity style={styles.botonTuerca} onPress={() => setModoConfiguracion(!modoConfiguracion)}>
              <Ionicons name="settings-outline" size={24} color={modoConfiguracion ? COLORES.interactivo : COLORES.textoSecundario} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.divisor} />
        <Text style={styles.descripcionEquipo}>{equipoBD.descripcion || 'Sin descripción detallada.'}</Text>
      </View>

      <View style={[styles.cardSeccion, {borderColor: COLORES.interactivo, borderWidth: 1}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
          <Ionicons name="trophy" size={24} color={COLORES.interactivo} style={{marginRight: 10}} />
          <Text style={styles.tituloSeccion}>Próximo Compromiso</Text>
        </View>
        <Text style={{color: COLORES.textoPrincipal, fontWeight: 'bold', fontSize: 18}}>Clasificatoria KORU Fest</Text>
        
        {!soyCapitan && (
          <View style={{marginTop: 15}}>
            {miAsistencia !== 'Pendiente' ? (
              <View style={{backgroundColor: miAsistencia === 'Sí' ? COLORES.exito : COLORES.peligro, padding: 15, borderRadius: 12, alignItems: 'center'}}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>¡Has confirmado tu asistencia: {miAsistencia}!</Text>
              </View>
            ) : (
              <>
                <Text style={{color: 'white', marginBottom: 10}}>Confirma tu asistencia (Acción Irreversible):</Text>
                <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity style={[styles.botonAccion, {backgroundColor: COLORES.fondo, borderColor: COLORES.exito, flex: 1}]} onPress={() => confirmarAsistencia('Sí')}>
                    <Text style={{color: COLORES.exito, textAlign: 'center', fontWeight: 'bold'}}>Asistiré</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.botonAccion, {backgroundColor: COLORES.fondo, borderColor: COLORES.peligro, flex: 1}]} onPress={() => confirmarAsistencia('No')}>
                    <Text style={{color: COLORES.peligro, textAlign: 'center', fontWeight: 'bold'}}>No Asistiré</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {soyCapitan && (
          <View style={{marginTop: 15}}>
            <View style={styles.contenedorEstadisticas}>
              <View style={styles.cajaEstadistica}><Text style={[styles.numEstadistica, {color: COLORES.exito}]}>{integrantes.filter(i => i.asistencia_torneo === 'Sí').length}</Text><Text style={styles.labelEstadistica}>Asisten</Text></View>
              <View style={styles.cajaEstadistica}><Text style={[styles.numEstadistica, {color: COLORES.peligro}]}>{integrantes.filter(i => i.asistencia_torneo === 'No').length}</Text><Text style={styles.labelEstadistica}>No Van</Text></View>
              <View style={styles.cajaEstadistica}><Text style={[styles.numEstadistica, {color: COLORES.alerta}]}>{integrantes.filter(i => i.asistencia_torneo === 'Pendiente').length}</Text><Text style={styles.labelEstadistica}>Pendientes</Text></View>
            </View>

            {asistenTodos && (
              <View style={{backgroundColor: COLORES.exito, padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center'}}>
                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>¡Equipo completo! Es momento de entrenar 🎮</Text>
              </View>
            )}

            <TouchableOpacity style={styles.botonGeneral} onPress={() => setVerAsistencia(!verAsistencia)}>
              <Ionicons name={verAsistencia ? "eye-off-outline" : "eye-outline"} size={18} color="white" style={{marginRight: 8}} />
              <Text style={{color: 'white', fontWeight: 'bold'}}>{verAsistencia ? 'Ocultar Asistencia' : 'Ver Detalle'}</Text>
            </TouchableOpacity>
            
            {verAsistencia && (
              <View style={styles.listaAsistencia}>
                {integrantes.map(j => {
                  const estado = j.asistencia_torneo || 'Pendiente';
                  const colorPunto = estado === 'Sí' ? COLORES.exito : (estado === 'No' ? COLORES.peligro : COLORES.alerta);
                  return (
                    <View key={j.jugador_id} style={styles.filaDetalleAsistencia}>
                      <Text style={{color: COLORES.textoPrincipal, fontWeight: '500'}}>{j.nombre}</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}><View style={[styles.puntoEstado, {backgroundColor: colorPunto}]} /><Text style={{color: colorPunto, fontWeight: 'bold'}}>{estado}</Text></View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {modoConfiguracion && soyCapitan && (
        <View style={[styles.cardSeccion, {borderColor: COLORES.interactivo, borderWidth: 1}]}>
          <Text style={[styles.tituloSeccion, {color: COLORES.interactivo}]}>Panel del Capitán</Text>
          <TouchableOpacity style={[styles.botonGeneral, {marginBottom: 10}]} onPress={() => setEditandoInfo(!editandoInfo)}><Ionicons name="create-outline" size={20} color="white" style={{marginRight: 10}} /><Text style={{color: 'white', fontWeight: 'bold'}}>{editandoInfo ? 'Cerrar Edición' : 'Editar Información'}</Text></TouchableOpacity>
          {editandoInfo && (
            <View style={styles.zonaEdicion}>
              <Text style={styles.label}>Descripción</Text><TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} value={formDesc} onChangeText={setFormDesc} multiline />
              <TouchableOpacity style={styles.botonGuardar} onPress={guardarEdicionEquipo}><Text style={{color: 'white', fontWeight: 'bold'}}>Guardar Cambios</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={[styles.botonGeneral, {backgroundColor: '#450A0A', borderColor: COLORES.peligro, borderWidth: 1}]} onPress={confirmarBorrarEquipo}><Ionicons name="trash-outline" size={20} color={COLORES.peligro} style={{marginRight: 10}} /><Text style={{color: COLORES.peligro, fontWeight: 'bold'}}>Disolver Equipo</Text></TouchableOpacity>
        </View>
      )}

      {soyCapitan && sugerencias.length > 0 && (
        <View style={[styles.cardSeccion, {borderColor: COLORES.interactivo, borderWidth: 1}]}>
          <Text style={styles.tituloSeccion}>Sugerencias del Equipo ({sugerencias.length})</Text>
          {sugerencias.map(s => (
            <View key={s.id} style={styles.filaSolicitud}>
              <View><Text style={{color: 'white', fontWeight: 'bold'}}>{s.sugerido_nombre}</Text><Text style={{color: COLORES.interactivo, fontSize: 12}}>Por: {s.sugeridor_nombre}</Text></View>
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={[styles.botonAceptar, {backgroundColor: COLORES.peligro}]} onPress={() => responderSugerencia(s.id, s.sugerido_id, 'Rechazar')}><Ionicons name="close" size={20} color="white" /></TouchableOpacity>
                <TouchableOpacity style={styles.botonAceptar} onPress={() => responderSugerencia(s.id, s.sugerido_id, 'Aceptar')}><Ionicons name="checkmark" size={20} color="white" /></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {soyCapitan && postulaciones.length > 0 && (
        <View style={[styles.cardSeccion, {borderColor: COLORES.botonPrincipal, borderWidth: 1}]}>
          <Text style={styles.tituloSeccion}>Postulaciones ({postulaciones.length})</Text>
          {postulaciones.map(post => (
            <View key={post.id} style={styles.filaSolicitud}>
              <View><Text style={{color: 'white', fontWeight: 'bold'}}>{post.nombre}</Text><Text style={{color: COLORES.textoSecundario, fontSize: 12}}>Rol: {post.rol_postulado}</Text></View>
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={[styles.botonAceptar, {backgroundColor: COLORES.peligro}]} onPress={() => rechazarJugador(post)}><Ionicons name="close" size={20} color="white" /></TouchableOpacity>
                <TouchableOpacity style={styles.botonAceptar} onPress={() => aceptarJugador(post)}><Ionicons name="checkmark" size={20} color="white" /></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardSeccion}>
        <Text style={styles.tituloSeccion}>Roster del Equipo ({integrantes.length}/5)</Text>
        {integrantes.map((jugador) => (
          <View key={jugador.jugador_id} style={styles.filaJugador}>
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <View style={[styles.indicadorRol, {backgroundColor: jugador.rol_equipo === 'Titular' ? COLORES.botonPrincipal : COLORES.textoSecundario}]} />
              <View style={{flex: 1}}>
                <Text style={{color: COLORES.textoPrincipal, fontWeight: 'bold', fontSize: 16}}>{jugador.nombre} {jugador.es_capitan === 1 && '👑'}</Text>
                <Text style={{color: COLORES.textoSecundario, fontSize: 13}}>{jugador.rol_equipo} • {jugador.rolPrimario || 'Sin rol'}</Text>
              </View>
            </View>
            
            {modoConfiguracion && jugador.es_capitan === 0 && (
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={styles.botonAccionJugador} onPress={() => toggleRolJugador(jugador.jugador_id, jugador.nombre, jugador.rol_equipo)}>
                  <Ionicons name="swap-vertical" size={20} color={COLORES.interactivo} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botonAccionJugador, {backgroundColor: '#450A0A', borderColor: COLORES.peligro}]} onPress={() => expulsarJugador(jugador.jugador_id, jugador.nombre)}>
                  <Ionicons name="trash" size={20} color={COLORES.peligro} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {(soyTitular || soyCapitan) && (
          <View style={styles.zonaEdicion}>
            <Text style={styles.label}>{soyCapitan ? 'Invitar Jugador Directamente' : 'Sugerir al Capitán'}</Text>
            <View style={{flexDirection: 'row'}}>
              <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} placeholder="Buscar nombre..." placeholderTextColor={COLORES.textoSecundario} value={busquedaUsuario} onChangeText={setBusquedaUsuario} />
              <TouchableOpacity style={styles.botonBuscar} onPress={buscarUsuarios}><Ionicons name="search" size={20} color="white" /></TouchableOpacity>
            </View>
            {resultadosBusqueda.map(res => (
              <View key={res.id} style={styles.filaResultadoBusqueda}>
                <Text style={{color: COLORES.textoPrincipal}}>{res.nombre}</Text>
                <TouchableOpacity style={styles.botonAñadirMin} onPress={() => soyCapitan ? invitarJugadorDirecto(res) : sugerirJugador(res)}>
                  <Ionicons name={soyCapitan ? "add" : "paper-plane"} size={18} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {soyCapitan && (
        <View style={styles.cardSeccion}>
          <Text style={styles.tituloSeccion}>Estado de Reclutamiento</Text>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{color: COLORES.textoSecundario, flex: 1, marginRight: 10}}>{reclutamientoAbierto ? 'Abierto (Visible en buscador)' : 'Cerrado'}</Text>
            <Switch trackColor={{ false: COLORES.fondo, true: '#4C1D95' }} thumbColor={reclutamientoAbierto ? COLORES.botonPrincipal : COLORES.textoSecundario} onValueChange={toggleReclutamiento} value={reclutamientoAbierto} />
          </View>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contenedorCentrado: { flex: 1, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center' },
  contenedor: { flex: 1, backgroundColor: COLORES.fondo, padding: 15 },
  botonVolver: { padding: 15, backgroundColor: COLORES.cards, marginTop: 40, flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: COLORES.borde },
  cardHeader: { backgroundColor: COLORES.cards, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORES.borde },
  headerTop: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoPlaceholder: { width: 64, height: 64, borderRadius: 16, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: COLORES.borde },
  headerInfo: { flex: 1 },
  nombreEquipo: { color: COLORES.textoPrincipal, fontSize: 22, fontWeight: 'bold' },
  juegoAsociado: { color: COLORES.interactivo, fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  botonTuerca: { padding: 8, backgroundColor: COLORES.fondo, borderRadius: 12, borderWidth: 1, borderColor: COLORES.borde },
  divisor: { height: 1, backgroundColor: COLORES.borde, marginVertical: 15 },
  descripcionEquipo: { color: COLORES.textoSecundario, fontSize: 15, lineHeight: 22 },
  tagVisual: { backgroundColor: '#334155', color: 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 11, marginRight: 8, marginBottom: 8 },
  cardSeccion: { backgroundColor: COLORES.cards, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORES.borde },
  tituloSeccion: { color: COLORES.textoPrincipal, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  contenedorEstadisticas: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, backgroundColor: COLORES.fondo, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORES.borde },
  cajaEstadistica: { alignItems: 'center' },
  numEstadistica: { fontWeight: 'bold', fontSize: 22 },
  labelEstadistica: { color: COLORES.textoSecundario, fontSize: 12, marginTop: 4 },
  listaAsistencia: { marginTop: 15, borderTopWidth: 1, borderColor: COLORES.borde, paddingTop: 15 },
  filaDetalleAsistencia: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORES.fondo },
  puntoEstado: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  filaJugador: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORES.fondo, padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORES.borde },
  indicadorRol: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  filaSolicitud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: COLORES.borde },
  botonAceptar: { backgroundColor: COLORES.exito, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  botonGeneral: { flexDirection: 'row', backgroundColor: COLORES.borde, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  zonaEdicion: { backgroundColor: COLORES.fondo, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORES.borde, marginTop: 15 },
  label: { color: COLORES.textoPrincipal, fontWeight: 'bold', marginBottom: 10, fontSize: 14 },
  input: { backgroundColor: COLORES.cards, color: COLORES.textoPrincipal, padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORES.borde },
  botonBuscar: { backgroundColor: COLORES.botonPrincipal, padding: 15, borderRadius: 12, justifyContent: 'center', marginLeft: 10 },
  filaResultadoBusqueda: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORES.cards, padding: 12, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: COLORES.borde },
  botonAñadirMin: { backgroundColor: COLORES.botonPrincipal, padding: 8, borderRadius: 8 },
  botonAccionJugador: { backgroundColor: COLORES.cards, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORES.borde },
  botonAccion: { padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORES.borde },
  botonGuardar: { backgroundColor: COLORES.exito, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 }
});

export default GestionEquipo;
