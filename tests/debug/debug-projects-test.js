/**
 * Debug script para probar los tests de proyectos de forma aislada
 */

const request = require('supertest');
const app = require('./src/app');
const DatabaseHelper = require('./tests/utils/DatabaseHelper');
const AuthHelper = require('./tests/utils/AuthHelper');

async function debugProjectsTest() {
  console.log('🔍 Iniciando debug de tests de proyectos...');
  
  const db = new DatabaseHelper();
  const authHelper = new AuthHelper();
  
  try {
    // Inicializar base de datos
    await db.initialize();
    console.log('✅ Base de datos inicializada');
    
    // Crear usuario administrador
    const adminAuth = await authHelper.createAdminAndGetToken();
    console.log('✅ Usuario admin creado:', {
      id: adminAuth.user.id,
      email: adminAuth.user.email,
      token: adminAuth.token ? 'Presente' : 'Ausente'
    });
    
    // Probar crear proyecto
    const projectData = {
      titulo: 'Proyecto Debug Test',
      descripcion: 'Descripción del proyecto debug',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-12-31'
    };
    
    console.log('🔍 Enviando request para crear proyecto...');
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminAuth.token}`)
      .send(projectData);
    
    console.log('📊 Respuesta del servidor:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 201) {
      console.log('✅ Proyecto creado exitosamente');
    } else {
      console.log('❌ Error al crear proyecto');
    }
    
  } catch (error) {
    console.error('❌ Error en debug:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cleanup
    try {
      await db.connection.execute('DELETE FROM proyectos WHERE titulo LIKE "%Debug%"');
      await db.close();
      console.log('✅ Cleanup completado');
    } catch (cleanupError) {
      console.error('❌ Error en cleanup:', cleanupError.message);
    }
  }
}

// Ejecutar debug
debugProjectsTest()
  .then(() => {
    console.log('🎉 Debug completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });