/**
 * Test de diagnóstico simple para proyectos
 * Sin Jest - usando Node.js puro
 */

const request = require('supertest');
const app = require('./src/app');

async function testProjects() {
  console.log('🚀 Iniciando test de diagnóstico de proyectos...');
  
  try {
    // Test 1: Verificar que el servidor responde
    console.log('\n1. Verificando servidor...');
    const healthResponse = await request(app)
      .get('/api/projects')
      .expect(401); // Esperamos 401 porque no hay auth
    console.log('✅ Servidor funcionando');
    
    // Test 2: Intentar crear proyecto sin auth (debe fallar)
    console.log('\n2. Probando creación sin auth...');
    const noAuthResponse = await request(app)
      .post('/api/projects')
      .send({
        titulo: 'Test Project',
        descripcion: 'Test Description'
      });
    
    if (noAuthResponse.status === 401) {
      console.log('✅ Validación de auth funcionando');
    } else {
      console.log('❌ Problema con validación de auth:', noAuthResponse.status);
    }
    
    console.log('\n✅ Test de diagnóstico completado');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    process.exit(1);
  }
}

testProjects();