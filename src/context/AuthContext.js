import { createContext, useState } from 'react';

// Creamos el contexto
export const AuthContext = createContext();

// Creamos el proveedor que envolverá nuestra aplicación
export const AuthProvider = ({ children }) => {
  const [usuarioActivo, setUsuarioActivo] = useState(null); // null = No ha iniciado sesión

  return (
    <AuthContext.Provider value={{ usuarioActivo, setUsuarioActivo }}>
      {children}
    </AuthContext.Provider>
  );
};