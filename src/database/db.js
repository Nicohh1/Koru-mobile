import * as SQLite from 'expo-sqlite';

// Variable global para mantener la conexión abierta y no duplicar hilos en Android
let dbInstancia = null;

/**
 * 1. INICIALIZACIÓN DE LA BASE DE DATOS
 * Abre la base de datos de forma segura. Si ya está abierta, reutiliza la conexión.
 */
export const iniciarBaseDeDatos = async () => {
  try {
    // Si la base de datos ya fue inicializada en esta sesión, la retornamos de inmediato
    if (dbInstancia !== null) {
      return dbInstancia;
    }

    const db = await SQLite.openDatabaseAsync('koru.db');

    // NOTA: Deja estos DROP TABLE comentados para que tus registros sean persistentes 
    // y no se borren solos cada vez que interactúas con la app.
    /*
    await db.execAsync('DROP TABLE IF EXISTS "Sugerencia";');
    await db.execAsync('DROP TABLE IF EXISTS "Postulacion";');
    await db.execAsync('DROP TABLE IF EXISTS "Jugador_Equipo";');
    await db.execAsync('DROP TABLE IF EXISTS "Equipo";');
    await db.execAsync('DROP TABLE IF EXISTS "Perfil";');
    */

    // Creación de la estructura base (Solo se ejecuta si las tablas no existen)
    await db.execAsync('CREATE TABLE IF NOT EXISTS "Perfil" (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT UNIQUE, password TEXT, nombre TEXT NOT NULL, rolPrimario TEXT, rolSecundario TEXT, juegoPrincipal TEXT);');
    await db.execAsync('CREATE TABLE IF NOT EXISTS "Equipo" (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, tag TEXT, juego TEXT NOT NULL, capitan_id INTEGER, descripcion TEXT, objetivos TEXT, ambiente TEXT, nivel TEXT, requisitos TEXT, privacidad TEXT, reclutamientoAbierto INTEGER);');
    await db.execAsync('CREATE TABLE IF NOT EXISTS "Jugador_Equipo" (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, equipo_id INTEGER NOT NULL, rol_equipo TEXT, es_capitan INTEGER, asistencia_torneo TEXT);');
    await db.execAsync('CREATE TABLE IF NOT EXISTS "Postulacion" (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, equipo_id INTEGER NOT NULL, rol_postulado TEXT NOT NULL, estado TEXT);');
    await db.execAsync('CREATE TABLE IF NOT EXISTS "Sugerencia" (id INTEGER PRIMARY KEY AUTOINCREMENT, equipo_id INTEGER NOT NULL, sugeridor_id INTEGER NOT NULL, sugerido_id INTEGER NOT NULL, estado TEXT);');

    // Guardamos la instancia de forma global
    dbInstancia = db;
    return db;
  } catch (error) {
    console.error("Error crítico al iniciar la BD: ", error);
    throw error;
  }
};

// ========================================================
// 2. FUNCIONES DE AUTENTICACIÓN (REALES)
// ========================================================

export const registrarUsuario = async (db, usuario, contrasena, nombre) => {
  try {
    const resultado = await db.runAsync(
      'INSERT INTO "Perfil" (usuario, password, nombre) VALUES (?, ?, ?)',
      [usuario, contrasena, nombre]
    );
    return resultado.lastInsertRowId; 
  } catch (error) {
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      throw new Error("El nombre de usuario ya está registrado por otro jugador.");
    }
    throw error;
  }
};

export const iniciarSesion = async (db, usuario, contrasena) => {
  try {
    const perfil = await db.getFirstAsync(
      'SELECT * FROM "Perfil" WHERE usuario = ? AND password = ?',
      [usuario, contrasena]
    );
    return perfil || null; 
  } catch (error) {
    console.error("Error en la consulta iniciarSesion: ", error);
    return null;
  }
};

// ========================================================
// 3. MOCK DATA Y CONSULTAS DEL EQUIPO
// ========================================================

export const crearPerfilesDePrueba = async (db) => {
  try {
    const perfilExistente = await db.getFirstAsync('SELECT * FROM "Perfil" LIMIT 1');
    if (!perfilExistente) {
      const idKuro = (await db.runAsync('INSERT INTO "Perfil" (usuario, password, nombre, rolPrimario, rolSecundario, juegoPrincipal) VALUES (?, ?, ?, ?, ?, ?)', ['capitan', '1234', 'Kurochi (Capitán)', 'Jungla', 'Top', 'League of Legends'])).lastInsertRowId;
      await db.runAsync('INSERT INTO "Perfil" (usuario, password, nombre, rolPrimario, rolSecundario, juegoPrincipal) VALUES (?, ?, ?, ?, ?, ?)', ['jugador', '1234', 'Martín (SoloQ)', 'Soporte', 'Iniciador', 'Valorant']);
      await db.runAsync('INSERT INTO "Perfil" (usuario, password, nombre, rolPrimario, rolSecundario, juegoPrincipal) VALUES (?, ?, ?, ?, ?, ?)', ['faker', '1234', 'Faker (Mid)', 'Mid', 'Top', 'League of Legends']);
      await db.runAsync('INSERT INTO "Perfil" (usuario, password, nombre, rolPrimario, rolSecundario, juegoPrincipal) VALUES (?, ?, ?, ?, ?, ?)', ['deft', '1234', 'Deft (ADC)', 'ADC', 'Soporte', 'League of Legends']);
      await db.runAsync('INSERT INTO "Perfil" (usuario, password, nombre, rolPrimario, rolSecundario, juegoPrincipal) VALUES (?, ?, ?, ?, ?, ?)', ['zeus', '1234', 'Zeus (Top)', 'Top', 'Jungla', 'League of Legends']);
      
      const idEquipo = (await db.runAsync('INSERT INTO "Equipo" (nombre, tag, juego, capitan_id) VALUES (?, ?, ?, ?)', ['KORU E-Sports', 'KOR', 'League of Legends', idKuro])).lastInsertRowId;
      await db.runAsync('INSERT INTO "Jugador_Equipo" (usuario_id, equipo_id, rol_equipo, es_capitan, asistencia_torneo) VALUES (?, ?, ?, ?, ?)', [idKuro, idEquipo, 'Titular', 1, 'Pendiente']);
    }
  } catch (error) {
    console.error("Error al insertar perfiles de prueba: ", error);
  }
};

export const obtenerPerfiles = async (db) => {
  try {
    return await db.getAllAsync('SELECT * FROM "Perfil"');
  } catch (error) {
    console.error("Error al obtener perfiles: ", error);
    return [];
  }
};

export const obtenerEquiposDisponibles = async (db) => {
  try {
    const query = 'SELECT "Equipo".*, "Perfil".nombre AS capitan_nombre FROM "Equipo" LEFT JOIN "Perfil" ON "Equipo".capitan_id = "Perfil".id';
    return await db.getAllAsync(query);
  } catch (error) {
    console.error("Error al obtener equipos: ", error);
    return [];
  }
};

// ========================================================
// 4. MÓDULO DE FEEDBACK Y RESEÑAS (NUEVA FUNCIONALIDAD)
// ========================================================

/**
 * Inicializa únicamente la tabla de Feedback.
 * Debes llamar a esta función pasándole la instancia de la base de datos 
 * después de haber llamado a tu función original iniciarBaseDeDatos().
 */
export const iniciarTablaFeedback = async (db) => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS "Feedback_App" (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        usuario_id INTEGER NOT NULL, 
        estrellas_matches INTEGER CHECK(estrellas_matches >= 1 AND estrellas_matches <= 5), 
        estrellas_filtros INTEGER CHECK(estrellas_filtros >= 1 AND estrellas_filtros <= 5),
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla de Feedback verificada/creada con éxito.");
  } catch (error) {
    console.error("Error al inicializar la tabla de Feedback: ", error);
    throw error;
  }
};

/**
 * Guarda la calificación que el usuario le da a la aplicación.
 * @param {Object} db - Instancia de la base de datos
 * @param {number} usuarioId - ID del usuario que califica
 * @param {number} estrellasMatches - Puntuación de 1 a 5 para la relevancia de los matches
 * @param {number} estrellasFiltros - Puntuación de 1 a 5 para la utilidad de los filtros
 */
export const guardarFeedback = async (db, usuarioId, estrellasMatches, estrellasFiltros) => {
  try {
    const resultado = await db.runAsync(
      'INSERT INTO "Feedback_App" (usuario_id, estrellas_matches, estrellas_filtros) VALUES (?, ?, ?)',
      [usuarioId, estrellasMatches, estrellasFiltros]
    );
    return resultado.lastInsertRowId;
  } catch (error) {
    console.error("Error al guardar el feedback en la base de datos: ", error);
    throw error;
  }
};

/**
 * Obtiene el promedio de las calificaciones para validar los requerimientos del proyecto.
 * Retorna un objeto con los promedios y el total de personas que respondieron.
 */
export const obtenerMetricasFeedback = async (db) => {
  try {
    const metricas = await db.getFirstAsync(`
      SELECT 
        AVG(estrellas_matches) as promedio_matches, 
        AVG(estrellas_filtros) as promedio_filtros,
        COUNT(id) as total_respuestas
      FROM "Feedback_App"
    `);
    
    // Si la tabla está vacía, devuelve valores en 0 por defecto
    if (!metricas || metricas.total_respuestas === 0) {
      return { promedio_matches: 0, promedio_filtros: 0, total_respuestas: 0 };
    }
    
    return metricas;
  } catch (error) {
    console.error("Error al obtener las métricas de feedback: ", error);
    return { promedio_matches: 0, promedio_filtros: 0, total_respuestas: 0 };
  }
};

// ========================================================
// FIN MÓDULO DE FEEDBACK Y RESEÑAS (NUEVA FUNCIONALIDAD)
// ========================================================
