/**
 * Script para debuggear el flujo completo de autenticación
 */
const request = require('supertest');
const app = require('./src/app');

async function debugAuthFlow() {
  console.log('🔍 Debugging Authentication Flow');
  console.log('=================================');

  try {
    // Usar un email único para evitar conflictos
    const uniqueEmail = `debug${Date.now()}@example.com`;
    
    // 1. Registrar usuario
    console.log('\n1️⃣ Registrando usuario...');
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Debug User',
        email: uniqueEmail,
        contraseña: 'password123',
        telefono: '1234567890'
      });

    console.log('Register Status:', registerResponse.status);
    console.log('Register Response:', JSON.stringify(registerResponse.body, null, 2));

    if (registerResponse.status !== 201) {
      throw new Error('Error en registro');
    }

    // 2. Login
    console.log('\n2️⃣ Haciendo login...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        contraseña: 'password123'
      });

    console.log('Login Status:', loginResponse.status);
    console.log('Login Response:', JSON.stringify(loginResponse.body, null, 2));

    if (loginResponse.status !== 200) {
      throw new Error('Error en login');
    }

    const token = loginResponse.body.data.token;
    console.log('\n🎫 Token obtenido:', token ? token.substring(0, 50) + '...' : 'null');

    // 3. Probar endpoint protegido
    console.log('\n3️⃣ Probando endpoint protegido...');
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Proyecto Debug',
        descripcion: 'Descripción debug',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31',
        estado: 'activo'
      });

    console.log('Project Status:', projectResponse.status);
    console.log('Project Response:', JSON.stringify(projectResponse.body, null, 2));

    // 4. Verificar headers
    console.log('\n4️⃣ Verificando headers enviados...');
    console.log('Authorization header:', `Bearer ${token}`.substring(0, 70) + '...');

  } catch (error) {
    console.error('❌ Error en debug:', error.message);
  }
}

debugAuthFlow();