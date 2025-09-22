/**
 * Test simplificado de proyectos para debug
 */

const request = require('supertest');
const app = require('./src/app');
const DatabaseHelper = require('./tests/utils/DatabaseHelper');
const AuthHelper = require('./tests/utils/AuthHelper');

async function testProjects() {
  console.log('🧪 Iniciando test simplificado de proyectos...');
  
  let db, authHelper, adminToken;
  
  try {
    // 1. Inicializar helpers
    console.log('1. Inicializando helpers...');
    db = new DatabaseHelper();
    await db.initialize();
    
    authHelper = new AuthHelper();
    console.log('✅ Helpers inicializados');
    
    // 2. Crear usuario admin
    console.log('2. Creando usuario admin...');
    const adminAuth = await authHelper.createAdminAndGetToken();
    adminToken = adminAuth.token;
    console.log('✅ Usuario admin creado:', adminAuth.user.email);
    
    // 3. Probar GET /api/projects
    console.log('3. Probando GET /api/projects...');
    const getResponse = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`);
    
    console.log('Status:', getResponse.status);
    console.log('Body:', JSON.stringify(getResponse.body, null, 2));
    
    // 4. Probar POST /api/projects
    console.log('4. Probando POST /api/projects...');
    const projectData = {
      titulo: 'Proyecto Test Simple',
      descripcion: 'Descripción del proyecto test',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-12-31'
    };
    
    const postResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(projectData);
    
    console.log('Status:', postResponse.status);
    console.log('Body:', JSON.stringify(postResponse.body, null, 2));
    
    console.log('✅ Test completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (db) {
      await db.close();
      console.log('✅ DB cerrada');
    }
  }
}

// Ejecutar test
testProjects();