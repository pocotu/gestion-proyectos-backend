/**
 * Setup global para Jest - configuración inicial para tests
 */

module.exports = async () => {
  console.log('🚀 Iniciando setup global de tests...');
  
  try {
    // Configurar variables de entorno para tests
    process.env.NODE_ENV = 'test';
    
    // No creamos base de datos separada, usamos la original
    console.log('✅ Setup global completado - usando base de datos original');
  } catch (error) {
    console.error('❌ Error en setup global:', error.message);
    throw error;
  }
};