/**
 * Test completo de funcionalidades de proyectos
 * Incluye autenticación y CRUD completo
 */

const request = require('supertest');
const app = require('./src/app');
const mysql = require('mysql2/promise');

// Configuración de base de datos de test
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'kali',
  database: process.env.DB_NAME || 'gestion_proyectos'
};

let connection;
let adminToken;
let adminUser;
let testProjectId;

async function setupDatabase() {
  console.log('🔧 Configurando base de datos...');
  connection = await mysql.createConnection(dbConfig);
  
  // Limpiar datos de test previos
  await connection.execute('DELETE FROM tareas WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%test%")');
  await connection.execute('DELETE FROM proyectos WHERE titulo LIKE "%test%"');
  await connection.execute('DELETE FROM usuarios WHERE email LIKE "%test%"');
  
  console.log('✅ Base de datos configurada');
}

async function createTestUser() {
  console.log('👤 Creando usuario de test...');
  
  // Registrar usuario admin
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      nombre: 'Admin Test',
      email: 'admin.test@example.com',
      contraseña: 'password123',
      telefono: '1234567890'
    });
    
  if (registerResponse.status !== 201) {
    throw new Error(`Error registrando usuario: ${registerResponse.status} - ${JSON.stringify(registerResponse.body)}`);
  }
  
  // Login para obtener token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin.test@example.com',
      contraseña: 'password123'
    });
    
  if (loginResponse.status !== 200) {
    throw new Error(`Error en login: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`);
  }
  
  adminToken = loginResponse.body.token;
  adminUser = loginResponse.body.user;
  
  console.log('✅ Usuario de test creado y autenticado');
}

async function testCreateProject() {
  console.log('\n📝 Test: Crear proyecto...');
  
  const projectData = {
    nombre: 'Proyecto Test',
    descripcion: 'Descripción del proyecto test',
    fecha_inicio: '2024-01-01',
    fecha_fin: '2024-12-31',
    estado: 'activo'
  };
  
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(projectData);
    
  console.log('Response status:', response.status);
  console.log('Response body:', JSON.stringify(response.body, null, 2));
  
  if (response.status !== 201) {
    throw new Error(`Error creando proyecto: ${response.status}`);
  }
  
  testProjectId = response.body.project.id;
  console.log('✅ Proyecto creado exitosamente con ID:', testProjectId);
}

async function testGetProjects() {
  console.log('\n📋 Test: Listar proyectos...');
  
  const response = await request(app)
    .get('/api/projects')
    .set('Authorization', `Bearer ${adminToken}`);
    
  console.log('Response status:', response.status);
  console.log('Número de proyectos:', response.body.projects?.length || 0);
  
  if (response.status !== 200) {
    throw new Error(`Error listando proyectos: ${response.status}`);
  }
  
  console.log('✅ Proyectos listados exitosamente');
}

async function testGetProject() {
  console.log('\n🔍 Test: Obtener proyecto específico...');
  
  const response = await request(app)
    .get(`/api/projects/${testProjectId}`)
    .set('Authorization', `Bearer ${adminToken}`);
    
  console.log('Response status:', response.status);
  console.log('Proyecto obtenido:', response.body.project?.titulo);
  
  if (response.status !== 200) {
    throw new Error(`Error obteniendo proyecto: ${response.status}`);
  }
  
  console.log('✅ Proyecto obtenido exitosamente');
}

async function testUpdateProject() {
  console.log('\n✏️ Test: Actualizar proyecto...');
  
  const updateData = {
    titulo: 'Proyecto Test Actualizado',
    descripcion: 'Descripción actualizada del proyecto'
  };
  
  const response = await request(app)
    .put(`/api/projects/${testProjectId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(updateData);
    
  console.log('Response status:', response.status);
  
  if (response.status !== 200) {
    throw new Error(`Error actualizando proyecto: ${response.status}`);
  }
  
  console.log('✅ Proyecto actualizado exitosamente');
}

async function testDeleteProject() {
  console.log('\n🗑️ Test: Eliminar proyecto...');
  
  const response = await request(app)
    .delete(`/api/projects/${testProjectId}`)
    .set('Authorization', `Bearer ${adminToken}`);
    
  console.log('Response status:', response.status);
  
  if (response.status !== 200) {
    throw new Error(`Error eliminando proyecto: ${response.status}`);
  }
  
  console.log('✅ Proyecto eliminado exitosamente');
}

async function cleanup() {
  console.log('\n🧹 Limpiando datos de test...');
  
  if (connection) {
    await connection.execute('DELETE FROM tareas WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%test%")');
    await connection.execute('DELETE FROM proyectos WHERE titulo LIKE "%test%"');
    await connection.execute('DELETE FROM usuarios WHERE email LIKE "%test%"');
    await connection.end();
  }
  
  console.log('✅ Limpieza completada');
}

async function runTests() {
  console.log('🚀 Iniciando tests completos de proyectos...\n');
  
  try {
    await setupDatabase();
    await createTestUser();
    await testCreateProject();
    await testGetProjects();
    await testGetProject();
    await testUpdateProject();
    await testDeleteProject();
    
    console.log('\n🎉 ¡Todos los tests de proyectos pasaron exitosamente!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error en tests:', error.message);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

runTests();