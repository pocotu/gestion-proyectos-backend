/**
 * Debug script para ejecutar tests de proyectos directamente
 * Sin Jest para identificar problemas
 */

const request = require('supertest');
const app = require('./src/app');
const DatabaseHelper = require('./tests/utils/DatabaseHelper');
const TestLogger = require('./tests/utils/TestLogger');
const AuthHelper = require('./tests/utils/AuthHelper');

async function runProjectsTest() {
  let db;
  let logger;
  let authHelper;
  let adminToken;
  let adminUser;

  console.log('🧪 Iniciando debug de tests de proyectos...\n');

  try {
    // Setup
    logger = new TestLogger({ prefix: '[PROJECTS-DEBUG]' });
    authHelper = new AuthHelper();
    
    logger.testStart('Configurando entorno de debug');
    
    // Inicializar helper de base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear usuario admin
    const adminAuth = await authHelper.createAdminAndGetToken();
    adminToken = adminAuth.token;
    adminUser = adminAuth.user;
    
    logger.success('Setup completado');
    console.log('✅ Usuario admin creado:', adminUser.nombre);

    // Test 1: POST /api/projects - Crear proyecto
    console.log('\n📝 Test 1: POST /api/projects - Crear proyecto');
    try {
      const projectData = {
        titulo: `Proyecto Debug ${Date.now()}`,
        descripcion: 'Descripción del proyecto debug',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData);
      
      console.log('✅ Status:', response.status);
      console.log('✅ Response body:', JSON.stringify(response.body, null, 2));
      
      if (response.status !== 201) {
        throw new Error(`Expected status 201, got ${response.status}`);
      }

      const createdProject = response.body.project;
      if (!createdProject || !createdProject.id) {
        throw new Error('No se devolvió el proyecto creado');
      }

      console.log('✅ Proyecto creado exitosamente:', createdProject.titulo);

      // Test 2: GET /api/projects - Listar proyectos
      console.log('\n📋 Test 2: GET /api/projects - Listar proyectos');
      const listResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);
      
      console.log('✅ Status:', listResponse.status);
      console.log('✅ Proyectos encontrados:', listResponse.body.projects?.length || 0);
      
      if (listResponse.status !== 200) {
        throw new Error(`Expected status 200, got ${listResponse.status}`);
      }

      // Test 3: GET /api/projects/:id - Obtener proyecto específico
      console.log('\n🔍 Test 3: GET /api/projects/:id - Obtener proyecto específico');
      const getResponse = await request(app)
        .get(`/api/projects/${createdProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      console.log('✅ Status:', getResponse.status);
      console.log('✅ Proyecto obtenido:', getResponse.body.project?.titulo || 'N/A');
      
      if (getResponse.status !== 200) {
        throw new Error(`Expected status 200, got ${getResponse.status}`);
      }

      // Test 4: PUT /api/projects/:id - Actualizar proyecto
      console.log('\n✏️ Test 4: PUT /api/projects/:id - Actualizar proyecto');
      const updateData = {
        titulo: `Proyecto Debug Actualizado ${Date.now()}`,
        descripcion: 'Descripción actualizada',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      };

      const updateResponse = await request(app)
        .put(`/api/projects/${createdProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);
      
      console.log('✅ Status:', updateResponse.status);
      console.log('✅ Proyecto actualizado:', updateResponse.body.project?.titulo || 'N/A');
      
      if (updateResponse.status !== 200) {
        throw new Error(`Expected status 200, got ${updateResponse.status}`);
      }

      // Test 5: DELETE /api/projects/:id - Eliminar proyecto
      console.log('\n🗑️ Test 5: DELETE /api/projects/:id - Eliminar proyecto');
      const deleteResponse = await request(app)
        .delete(`/api/projects/${createdProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      console.log('✅ Status:', deleteResponse.status);
      
      if (deleteResponse.status !== 200) {
        throw new Error(`Expected status 200, got ${deleteResponse.status}`);
      }

      console.log('\n🎉 ¡Todos los tests de proyectos pasaron exitosamente!');

    } catch (error) {
      console.error('\n❌ Error en test:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response body:', error.response.body);
      }
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Error general:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (db) {
      try {
        await db.cleanup();
        await db.close();
        console.log('\n🧹 Cleanup completado');
      } catch (cleanupError) {
        console.error('Error en cleanup:', cleanupError.message);
      }
    }
  }
}

// Ejecutar el debug
runProjectsTest();