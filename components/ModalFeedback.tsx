import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { guardarFeedback } from '../src/database/db';

// 1. Definimos la interfaz con los tipos de datos que recibirá el modal
interface ModalFeedbackProps {
  visible: boolean;
  onClose: () => void;
  db: any; // Si tienes el tipo de Expo SQLite exportado, puedes cambiar 'any' por ese tipo
  usuarioId: number;
}

export default function ModalFeedback({ visible, onClose, db, usuarioId }: ModalFeedbackProps) {
  // 2. Tipamos los estados como números (number)
  const [estrellasMatches, setEstrellasMatches] = useState<number>(0);
  const [estrellasFiltros, setEstrellasFiltros] = useState<number>(0);

  const enviar = async () => {
    if (estrellasMatches === 0 || estrellasFiltros === 0) {
      Alert.alert("Aviso", "Por favor califica ambas opciones.");
      return;
    }
    try {
      await guardarFeedback(db, usuarioId, estrellasMatches, estrellasFiltros);
      Alert.alert("¡Éxito!", "Gracias por tu feedback.");
      onClose(); // Cierra el modal
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la reseña.");
    }
  };

  // 3. Tipamos las props del subcomponente interno de las estrellas
  const Estrellas = ({ valorActual, setValor }: { valorActual: number, setValor: (valor: number) => void }) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((num) => (
        <TouchableOpacity key={num} onPress={() => setValor(num)}>
          <FontAwesome 
            name={num <= valorActual ? "star" : "star-o"} 
            size={32} 
            color="#FFD700" 
            style={{ marginHorizontal: 5 }} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Evalúa tu experiencia</Text>
          
          <Text style={styles.text}>Evalúa tu nivel de satisfacción con los jugadores que el algoritmo seleccionó para ti.</Text>
          <Estrellas valorActual={estrellasMatches} setValor={setEstrellasMatches} />

          <Text style={styles.text}>Califica la utilidad de los filtros para encontrar rápidamente jugadores compatibles con tu estilo.</Text>
          <Estrellas valorActual={estrellasFiltros} setValor={setEstrellasFiltros} />

          <View style={styles.buttons}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: 'gray', padding: 10 }}>Quizás luego</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={enviar} style={styles.btnSubmit}>
              <Text style={{ color: 'white' }}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modal: { 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 10, 
    width: '80%' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  text: { 
    fontSize: 14, 
    marginTop: 10, 
    marginBottom: 5 
  },
  starsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 10 
  },
  buttons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20 
  },
  btnSubmit: { 
    backgroundColor: '#4CAF50', 
    padding: 10, 
    borderRadius: 5 
  }
});