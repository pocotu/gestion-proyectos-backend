/**
 * Setup global para Jest - se ejecuta antes de todos los tests
 * Configura la base de datos de pruebas y utilidades globales
 */

const mysql = require('mysql2/promise');
const DatabaseHelper = require('./DatabaseHelper');
const TestLogger = require('./TestLogger');

// Configuración global de timeouts para tests de integración
jest.setTimeout(30000);

// Variables globales para compartir entre tests
global.testDatabase = null;
global.testLogger = new TestLogger();

/**
 * Setup que se ejecuta una vez antes de todos los tests
 */
beforeAll(async () => {
  global.testLogger.info('🚀 Iniciando setup global de tests de integración');
  
  try {
    // Inicializar helper de base de datos
    global.testDatabase = new DatabaseHelper();
    await global.testDatabase.initialize();
    
    global.testLogger.success('✅ Setup global completado exitosamente');
  } catch (error) {
    global.testLogger.error('❌ Error en setup global', error);
    throw error;
  }
});

/**
 * Cleanup que se ejecuta una vez después de todos los tests
 */
afterAll(async () => {
  global.testLogger.info('🧹 Iniciando cleanup global de tests');
  
  try {
    if (global.testDatabase) {
      await global.testDatabase.cleanup();
      await global.testDatabase.close();
    }
    
    global.testLogger.success('✅ Cleanup global completado exitosamente');
  } catch (error) {
    global.testLogger.error('❌ Error en cleanup global', error);
  }
});

/**
 * Cleanup que se ejecuta antes de cada test individual
 * Comentado para evitar eliminar usuarios creados en beforeAll
 */
beforeEach(async () => {
  // Limpiar datos de prueba antes de cada test para aislamiento
  // COMENTADO: Esto elimina usuarios creados en beforeAll
  // if (global.testDatabase) {
  //   await global.testDatabase.cleanTestData();
  // }
});

/**
 * Cleanup que se ejecuta después de cada test individual
 */
afterEach(async () => {
  // Cleanup adicional si es necesario
  // Por ahora no necesitamos cleanup específico después de cada test
});