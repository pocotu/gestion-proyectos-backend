/**
 * Script para ejecutar tests de proyectos con manejo de errores detallado - VERSIÓN CORREGIDA
 */

const request = require('supertest');
const app = require('./src/app');
const DatabaseHelper = require('./tests/utils/DatabaseHelper');
const TestLogger = require('./tests/utils/TestLogger');
const AuthHelper = require('./tests/utils/AuthHelper');

async function runProjectTests() {
  let db;
  let logger;
  let authHelper;
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;

  console.log('🧪 Iniciando tests de integración de proyectos...\n');

  try {
    // Setup global para todos los tests
    logger = new TestLogger({ prefix: '[PROJECTS-TESTS]' });
    authHelper = new AuthHelper();
    
    logger.testStart('Configurando entorno de tests de proyectos MVP');
    
    // Inicializar helper de base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear usuarios usando AuthHelper
    const adminAuth = await authHelper.createAdminAndGetToken();
    const userAuth = await authHelper.createUserWithRoleAndGetToken('responsable_proyecto');
    
    adminToken = adminAuth.token;
    userToken = userAuth.token;
    adminUser = adminAuth.user;
    regularUser = userAuth.user;
    
    logger.success('Setup completado');
    console.log('✅ Usuario admin creado:', adminUser.nombre);
    console.log('✅ Usuario regular creado:', regularUser.nombre);

    // Test 1: GET /api/projects - Obtener todos los proyectos
    console.log('\n📋 Test 1: GET /api/projects - Obtener todos los proyectos');
    try {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      console.log('✅ Status:', response.status);
      console.log('✅ Proyectos encontrados:', response.body.projects?.length || 0);
      console.log('✅ Test 1 PASÓ');
    } catch (error) {
      console.error('❌ Test 1 FALLÓ:', error.message);
    }

    // Test 2: POST /api/projects - Crear nuevo proyecto
    console.log('\n➕ Test 2: POST /api/projects - Crear nuevo proyecto');
    try {
      const newProject = {
        titulo: 'Proyecto de Test Automatizado',
        descripcion: 'Proyecto creado durante test automatizado',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31',
        estado: 'planificacion'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProject)
        .expect(201);
      
      console.log('✅ Status:', response.status);
      console.log('✅ Proyecto creado con ID:', response.body.data?.id);
      console.log('✅ Test 2 PASÓ');
    } catch (error) {
      console.error('❌ Test 2 FALLÓ:', error.message);
    }

    // Test 3: GET /api/projects/:id - Obtener proyecto específico
    console.log('\n🔍 Test 3: GET /api/projects/:id - Obtener proyecto específico');
    try {
      const response = await request(app)
        .get('/api/projects/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      console.log('✅ Status:', response.status);
      console.log('✅ Proyecto encontrado:', response.body.data?.titulo);
      console.log('✅ Test 3 PASÓ');
    } catch (error) {
      console.error('❌ Test 3 FALLÓ:', error.message);
    }

    // Test 4: PUT /api/projects/:id - Actualizar proyecto
    console.log('\n✏️ Test 4: PUT /api/projects/:id - Actualizar proyecto');
    try {
      const updateData = {
        titulo: 'Proyecto Actualizado por Test',
        descripcion: 'Descripción actualizada durante test'
      };

      const response = await request(app)
        .put('/api/projects/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
      
      console.log('✅ Status:', response.status);
      console.log('✅ Proyecto actualizado');
      console.log('✅ Test 4 PASÓ');
    } catch (error) {
      console.error('❌ Test 4 FALLÓ:', error.message);
    }

    // Pausa breve antes del Test 5 para evitar problemas de concurrencia
    console.log('\n⏳ Esperando 1 segundo antes del Test 5...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Verificar permisos con usuario no admin - CON NUEVA INSTANCIA
    console.log('\n🔒 Test 5: Verificar permisos con usuario no admin');
    try {
      // Crear una nueva instancia de AuthHelper para evitar conflictos de estado
      const freshAuthHelper = new AuthHelper();
      const freshUserAuth = await freshAuthHelper.createUserWithRoleAndGetToken('responsable_proyecto');
      
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${freshUserAuth.token}`)
        .expect(200);
      
      console.log('✅ Status:', response.status);
      console.log('✅ Usuario con rol puede acceder a proyectos');
      console.log('✅ Test 5 PASÓ');
    } catch (error) {
      console.error('❌ Test 5 FALLÓ:', error.message);
      console.error('Error completo:', error);
    }

    console.log('\n🎉 Todos los tests de proyectos completados');

  } catch (error) {
    console.error('\n❌ Error general en tests:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cleanup
    if (db) {
      try {
        await db.close();
        console.log('\n🔒 Conexión a base de datos cerrada');
      } catch (error) {
        console.error('Error cerrando DB:', error.message);
      }
    }
  }
}

// Ejecutar tests
runProjectTests();