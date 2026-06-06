// --- INICIO NUEVA FUNCIONALIDAD (Importaciones) ---
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import ModalFeedback from '../../components/ModalFeedback';

// IMPORTANTE: Aquí agregamos 'iniciarTablaFeedback' que nos faltaba
import { iniciarBaseDeDatos, iniciarTablaFeedback, obtenerMetricasFeedback } from '../../src/database/db';
// --- FIN NUEVA FUNCIONALIDAD ---

// --- INICIO DE TU CÓDIGO ORIGINAL ---
import Perfil from '../../src/screens/Perfil';
// --- FIN DE TU CÓDIGO ORIGINAL ---

export default function PerfilRoute() {
  // --- INICIO NUEVA FUNCIONALIDAD (Lógica) ---
  const [verFeedback, setVerFeedback] = useState(false);
  const [dbReal, setDbReal] = useState(null); 
  const usuarioId = 1; 

  useEffect(() => {
    const conectarBD = async () => {
      try {
        // 1. Iniciamos tu base de datos original
        const db = await iniciarBaseDeDatos();
        
        // 2. SOLUCIÓN AL ERROR: Creamos la tabla de feedback si no existe
        await iniciarTablaFeedback(db); 
        
        // 3. Guardamos la conexión
        setDbReal(db); 
      } catch (error) {
        console.error("Error al conectar la BD:", error);
      }
    };
    conectarBD();

    // Temporizador de 10 segundos
    const temporizador = setTimeout(() => { 
      setVerFeedback(true); 
    }, 10000);

    return () => clearTimeout(temporizador);
  }, []); 

  const manejarCierreModal = async () => {
    setVerFeedback(false); 
    
    if (dbReal) {
      const metricas = await obtenerMetricasFeedback(dbReal);
      console.log("=== DATOS GUARDADOS EN SQLITE ===");
      console.log("Total de respuestas:", metricas.total_respuestas);
      console.log("Promedio Matches:", metricas.promedio_matches);
      console.log("Promedio Filtros:", metricas.promedio_filtros);
      console.log("=================================");
    }
  };
  // --- FIN NUEVA FUNCIONALIDAD ---

  return (
    <View style={{ flex: 1 }}>
      
      {/* ========================================================= */}
      {/* --- INICIO DE TU CÓDIGO ORIGINAL (Componente visual) --- */}
      <View style={{ flex: 1 }}>
        <Perfil />
      </View>
      {/* --- FIN DE TU CÓDIGO ORIGINAL --- */}
      {/* ========================================================= */}

      {/* --- INICIO NUEVA FUNCIONALIDAD (Modal) --- */}
      <ModalFeedback 
        visible={verFeedback} 
        onClose={manejarCierreModal} 
        db={dbReal} 
        usuarioId={usuarioId} 
      />
      {/* --- FIN NUEVA FUNCIONALIDAD --- */}

    </View>
  );
}