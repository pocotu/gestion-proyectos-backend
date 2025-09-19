const request = require('supertest');
const app = require('./src/app');
const AuthHelper = require('./tests/utils/AuthHelper');
const DatabaseHelper = require('./tests/utils/DatabaseHelper');

async function debugTest() {
  let dbHelper = null;
  
  try {
    console.log('🔍 Iniciando test de debug...');
    
    // Inicializar base de datos
    console.log('🔍 Inicializando base de datos...');
    dbHelper = new DatabaseHelper();
    await dbHelper.initialize();
    
    // Limpiar datos de prueba previos manualmente
    console.log('🔍 Limpiando datos de prueba previos...');
    await dbHelper.connection.execute('DELETE FROM usuarios WHERE email LIKE "%@example.com"');
    
    const authHelper = new AuthHelper(app, dbHelper);
    
    console.log('🔍 Creando admin y obteniendo token...');
    const { user, headers } = await authHelper.createAdminAndGetToken();
    
    console.log('🔍 Usuario creado:', { id: user.id, email: user.email, es_administrador: user.es_administrador });
    console.log('🔍 Headers:', headers);
    
    console.log('🔍 Haciendo request a /api/projects/my...');
    
    const response = await request(app)
      .get('/api/projects/my')
      .set(headers);
    
    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response body:', JSON.stringify(response.body, null, 2));
    
    if (response.status !== 200) {
      console.log('🔍 Error response - Text:', response.text);
    }
    
  } catch (error) {
    console.error('🔍 Error en debug test:', error.message);
    console.error('🔍 Stack:', error.stack);
  } finally {
    // Limpiar conexión de base de datos
    if (dbHelper && dbHelper.connection) {
      await dbHelper.connection.end();
    }
  }
}

debugTest();