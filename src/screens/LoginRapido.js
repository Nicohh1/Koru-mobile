import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
// Importamos la conexión a tu base de datos y sus funciones de autenticación
import { iniciarBaseDeDatos, iniciarSesion, registrarUsuario } from '../database/db';

const COLORES = { 
  fondo: '#0F172A', 
  cards: '#1E293B', 
  botonPrincipal: '#7C3AED', 
  textoPrincipal: '#FFFFFF', 
  textoSecundario: '#94A3B8',
  inputs: '#0F172A'
};

const LoginRapido = () => {
  // Estados para el flujo de la vista
  const [modo, setModo] = useState('login'); // Puede ser: 'login', 'registro', 'rapido'
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { setUsuarioActivo } = useContext(AuthContext); 

  // Estados para los formularios de texto
  const [inputUsuario, setInputUsuario] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [inputNombre, setInputNombre] = useState('');

  // Carga inicial de perfiles de prueba en caso de usar el modo rápido
  const cargarPerfiles = async () => {
    try {
      const db = await iniciarBaseDeDatos();
      const datos = await db.getAllAsync('SELECT * FROM Perfil');
      setPerfiles(datos);
    } catch (error) {
      console.error("Error al cargar perfiles en la vista: ", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPerfiles();
  }, []);

  // LÓGICA: Procesar el inicio de sesión con las credenciales ingresadas
  const manejarLogin = async () => {
    if (!inputUsuario.trim() || !inputPassword.trim()) {
      Alert.alert("Campos incompletos", "Por favor ingresa tu usuario y contraseña.");
      return;
    }

    try {
      const db = await iniciarBaseDeDatos();
      const perfilEncontrado = await iniciarSesion(db, inputUsuario.trim(), inputPassword.trim());

      if (perfilEncontrado) {
        setUsuarioActivo(perfilEncontrado); // Da acceso al sistema
      } else {
        Alert.alert("Error de autenticación", "El usuario o la contraseña son incorrectos.");
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un problema al intentar iniciar sesión.");
    }
  };

  // LÓGICA: Procesar el registro de un nuevo jugador
  const manejarRegistro = async () => {
    if (!inputUsuario.trim() || !inputPassword.trim() || !inputNombre.trim()) {
      Alert.alert("Campos incompletos", "Todos los campos son obligatorios para registrarse.");
      return;
    }

    try {
      const db = await iniciarBaseDeDatos();
      // Registra en la tabla Perfil usando la función de tu db.js
      await registrarUsuario(db, inputUsuario.trim(), inputPassword.trim(), inputNombre.trim());
      
      Alert.alert("¡Registro Exitoso!", "Tu cuenta ha sido creada. Ya puedes iniciar sesión.");
      
      // Limpiamos los inputs y volvemos a la vista de login
      setInputNombre('');
      setInputPassword('');
      setInputUsuario('');
      await cargarPerfiles(); // Actualiza la lista interna por si usan el modo rápido
      setModo('login');
    } catch (error) {
      // Captura el error de restricción UNIQUE si el nickname ya existe
      Alert.alert("Registro fallido", error.message || "No se pudo crear el usuario.");
    }
  };

  if (cargando) {
    return (
      <View style={styles.contenedor}>
        <ActivityIndicator size="large" color={COLORES.botonPrincipal} />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Image
        source={require('../../assets/images/iconoRedondeado.png')}
        style={{ width: 100, height: 100, marginBottom: 20, resizeMode: 'contain' }}
      />
      <Text style={styles.titulo}>KORU E-Sports</Text>

      {/* ======================================================== */}
      {/* VISTA 1: FORMULARIO DE INICIO DE SESIÓN                  */}
      {/* ======================================================== */}
      {modo === 'login' && (
        <View style={styles.formulario}>
          <Text style={styles.subtitulo}>Ingresa tus credenciales gamer</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario / Nickname"
            placeholderTextColor={COLORES.textoSecundario}
            value={inputUsuario}
            onChangeText={setInputUsuario}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={COLORES.textoSecundario}
            secureTextEntry
            value={inputPassword}
            onChangeText={setInputPassword}
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.botonFormulario} onPress={manejarLogin}>
            <Text style={styles.textoBoton}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.enlaceAlternativo} onPress={() => setModo('registro')}>
            <Text style={styles.textoEnlace}>¿No tienes cuenta? Regístrate aquí</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.enlaceAlternativo, { marginTop: 20 }]} onPress={() => setModo('rapido')}>
            <Text style={[styles.textoEnlace, { color: COLORES.botonPrincipal }]}>⚙️ Usar modo de prueba rápido</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: FORMULARIO DE REGISTRO                          */}
      {/* ======================================================== */}
      {modo === 'registro' && (
        <View style={styles.formulario}>
          <Text style={styles.subtitulo}>Crea tu identidad en la plataforma</Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre Completo / Apodo"
            placeholderTextColor={COLORES.textoSecundario}
            value={inputNombre}
            onChangeText={setInputNombre}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Elige tu nombre de usuario único"
            placeholderTextColor={COLORES.textoSecundario}
            value={inputUsuario}
            onChangeText={setInputUsuario}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña de seguridad"
            placeholderTextColor={COLORES.textoSecundario}
            secureTextEntry
            value={inputPassword}
            onChangeText={setInputPassword}
            autoCapitalize="none"
          />

          <TouchableOpacity style={[styles.botonFormulario, { backgroundColor: '#10B981' }]} onPress={manejarRegistro}>
            <Text style={styles.textoBoton}>Crear Cuenta Gamer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.enlaceAlternativo} onPress={() => setModo('login')}>
            <Text style={styles.textoEnlace}>¿Ya tienes una cuenta? Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ======================================================== */}
      {/* VISTA 3: SELECTOR RÁPIDO ORIGINAL (MOCK DATA)            */}
      {/* ======================================================== */}
      {modo === 'rapido' && (
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Text style={styles.subtitulo}>Selecciona un perfil para probar</Text>

          {perfiles.map((perfil) => (
            <TouchableOpacity key={perfil.id} style={styles.botonPerfil} onPress={() => setUsuarioActivo(perfil)} >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-circle" size={40} color={COLORES.textoPrincipal} style={{ marginRight: 15 }} />
                <View>
                  <Text style={styles.textoNombre}>{perfil.nombre}</Text>
                  <Text style={styles.textoRol}>Rol: {perfil.rolPrimario || 'No asignado'}</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={24} color={COLORES.textoSecundario} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.enlaceAlternativo} onPress={() => setModo('login')}>
            <Text style={styles.textoEnlace}>⬅️ Volver al Login normal</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center', padding: 20 },
  titulo: { color: COLORES.textoPrincipal, fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitulo: { color: COLORES.textoSecundario, fontSize: 16, textAlign: 'center', marginBottom: 30 },
  formulario: { width: '100%', paddingHorizontal: 10 },
  input: {
    backgroundColor: COLORES.cards,
    color: COLORES.textoPrincipal,
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 16
  },
  botonFormulario: {
    backgroundColor: COLORES.botonPrincipal,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORES.botonPrincipal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  textoBoton: { color: COLORES.textoPrincipal, fontSize: 16, fontWeight: 'bold' },
  enlaceAlternativo: { marginTop: 15, alignItems: 'center' },
  textoEnlace: { color: COLORES.textoSecundario, fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
  botonPerfil: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORES.cards, width: '100%', padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  textoNombre: { color: COLORES.textoPrincipal, fontSize: 18, fontWeight: 'bold' },
  textoRol: { color: COLORES.botonPrincipal, fontSize: 14, marginTop: 4, fontWeight: '600' }
});

export default LoginRapido;