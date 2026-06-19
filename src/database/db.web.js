const webProfiles = [
  { id: 1, usuario: 'capitan', password: '1234', nombre: 'Kurochi (Capitan)', rolPrimario: 'Jungla', rolSecundario: 'Top', juegoPrincipal: 'League of Legends' },
  { id: 2, usuario: 'jugador', password: '1234', nombre: 'Martin (SoloQ)', rolPrimario: 'Soporte', rolSecundario: 'Iniciador', juegoPrincipal: 'Valorant' },
  { id: 3, usuario: 'faker', password: '1234', nombre: 'Faker (Mid)', rolPrimario: 'Mid', rolSecundario: 'Top', juegoPrincipal: 'League of Legends' },
  { id: 4, usuario: 'deft', password: '1234', nombre: 'Deft (ADC)', rolPrimario: 'ADC', rolSecundario: 'Soporte', juegoPrincipal: 'League of Legends' },
  { id: 5, usuario: 'zeus', password: '1234', nombre: 'Zeus (Top)', rolPrimario: 'Top', rolSecundario: 'Jungla', juegoPrincipal: 'League of Legends' },
];

let nextProfileId = webProfiles.length + 1;

const normalizeSql = (query = '') => query
  .replace(/["']/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const cloneProfile = (profile) => ({ ...profile });

const unsupportedWebDatabaseOperation = () => new Error(
  'Esta operacion usa SQLite local y no esta disponible en la version web.',
);

const webDatabase = {
  execAsync: async () => undefined,

  getAllAsync: async (query, params = []) => {
    const sql = normalizeSql(query);

    if (!sql.includes('FROM PERFIL')) return [];

    if (sql.includes('NOMBRE LIKE ?')) {
      const search = String(params[0] ?? '').replace(/%/g, '').toLowerCase();
      const game = params[1];
      return webProfiles
        .filter((profile) => profile.nombre.toLowerCase().includes(search))
        .filter((profile) => !game || profile.juegoPrincipal === game)
        .map(cloneProfile);
    }

    return webProfiles.map(cloneProfile);
  },

  getFirstAsync: async (query, params = []) => {
    const sql = normalizeSql(query);

    if (sql.includes('FROM PERFIL') && sql.includes('USUARIO = ?') && sql.includes('PASSWORD = ?')) {
      const profile = webProfiles.find(
        (item) => item.usuario === params[0] && item.password === params[1],
      );
      return profile ? cloneProfile(profile) : null;
    }

    if (sql.includes('FROM PERFIL') && sql.includes('LIMIT 1')) {
      return webProfiles[0] ? cloneProfile(webProfiles[0]) : null;
    }

    if (sql.includes('FROM FEEDBACK_APP')) {
      return { promedio_matches: 0, promedio_filtros: 0, total_respuestas: 0 };
    }

    return null;
  },

  runAsync: async (query, params = []) => {
    const sql = normalizeSql(query);

    if (sql.startsWith('UPDATE PERFIL SET NOMBRE = ?')) {
      const [nombre, rolPrimario, rolSecundario, juegoPrincipal, id] = params;
      const profile = webProfiles.find((item) => item.id === id);

      if (!profile) return { changes: 0, lastInsertRowId: 0 };

      Object.assign(profile, { nombre, rolPrimario, rolSecundario, juegoPrincipal });
      return { changes: 1, lastInsertRowId: 0 };
    }

    console.warn(unsupportedWebDatabaseOperation().message);
    return { changes: 0, lastInsertRowId: 0 };
  },
};

export const iniciarBaseDeDatos = async () => webDatabase;

export const registrarUsuario = async (_db, usuario, contrasena, nombre) => {
  if (webProfiles.some((profile) => profile.usuario === usuario)) {
    throw new Error('El nombre de usuario ya esta registrado por otro jugador.');
  }

  const profile = {
    id: nextProfileId++,
    usuario,
    password: contrasena,
    nombre,
    rolPrimario: null,
    rolSecundario: null,
    juegoPrincipal: null,
  };
  webProfiles.push(profile);
  return profile.id;
};

export const iniciarSesion = async (_db, usuario, contrasena) => {
  const profile = webProfiles.find(
    (item) => item.usuario === usuario && item.password === contrasena,
  );
  return profile ? cloneProfile(profile) : null;
};

export const crearPerfilesDePrueba = async () => undefined;
export const obtenerPerfiles = async () => webProfiles.map(cloneProfile);
export const obtenerEquiposDisponibles = async () => [];
export const iniciarTablaFeedback = async () => undefined;
export const guardarFeedback = async () => {
  throw unsupportedWebDatabaseOperation();
};
export const obtenerMetricasFeedback = async () => ({
  promedio_matches: 0,
  promedio_filtros: 0,
  total_respuestas: 0,
});
