const request = require('supertest');
const app = require('./src/app');
const DatabaseHelper = require('./tests/utils/DatabaseHelper');
const AuthHelper = require('./tests/utils/AuthHelper');

async function testAuthAndProjects() {
  console.log('🔍 Probando autenticación y endpoint de proyectos...');
  
  let dbHelper, authHelper, adminToken;
  
  try {
    // Configurar entorno de test
    dbHelper = new DatabaseHelper();
    await dbHelper.initialize();
    console.log('✅ Conexión a base de datos establecida');

    authHelper = new AuthHelper();
    
    // Crear usuario admin de test
    const adminAuth = await authHelper.createAdminAndGetToken();
    
    adminToken = adminAuth.token;
    console.log('✅ Usuario admin creado y token obtenido');

    // Test 1: Verificar token directamente
    console.log('\n🔐 Test 1: Verificando token JWT...');
    const jwt = require('jsonwebtoken');
    const config = require('./src/config/config');
    
    try {
      const decoded = jwt.verify(adminToken, config.JWT_SECRET);
      console.log('✅ Token válido, usuario ID:', decoded.id);
    } catch (error) {
      console.error('❌ Token inválido:', error.message);
      return;
    }

    // Test 2: Probar endpoint con autenticación
    console.log('\n📋 Test 2: GET /api/projects con autenticación...');
    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`);
    
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Test 2 PASÓ - Endpoint funcionando correctamente');
    } else {
      console.log('❌ Test 2 FALLÓ - Status:', response.status);
    }

    // Test 3: Probar sin token
    console.log('\n🚫 Test 3: GET /api/projects sin token...');
    const responseNoAuth = await request(app)
      .get('/api/projects');
    
    console.log('Status sin auth:', responseNoAuth.status);
    if (responseNoAuth.status === 401) {
      console.log('✅ Test 3 PASÓ - Correctamente rechaza sin token');
    } else {
      console.log('❌ Test 3 FALLÓ - Debería rechazar sin token');
    }

  } catch (error) {
    console.error('❌ Error en tests:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    if (dbHelper) {
      await dbHelper.close();
      console.log('🔒 Conexión a base de datos cerrada');
    }
  }
  
  process.exit(0);
}

testAuthAndProjects();