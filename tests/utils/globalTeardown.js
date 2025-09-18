/**
 * Teardown global para tests de integración
 * Se ejecuta una vez después de todos los tests
 */

module.exports = async () => {
  console.log('🧹 Iniciando teardown global de tests...');
  
  try {
    // Limpiar cualquier recurso global si es necesario
    // Por ejemplo, cerrar conexiones persistentes, limpiar archivos temporales, etc.
    
    // Dar tiempo para que las conexiones se cierren correctamente
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Teardown global completado');
    
  } catch (error) {
    console.error('❌ Error en teardown global:', error.message);
  }
};