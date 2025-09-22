/**
 * Script de debug para probar creación de usuarios por admin
 */

const app = require('./src/app');
const request = require('supertest');

async function testAdminUserCreation() {
  try {
    console.log('🔍 Iniciando test de creación de usuarios por admin...');

    // Registrar admin
    const adminData = {
      nombre: 'Test Admin',
      email: 'testadmin@test.com',
      contraseña: 'password123',
      telefono: '1234567890',
      es_administrador: true
    };

    console.log('📝 Registrando admin...');
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);

    console.log('Register status:', registerResponse.status);
    
    if (registerResponse.status !== 201) {
      console.log('❌ Register error:', registerResponse.body);
      return;
    }

    console.log('✅ Admin registrado exitosamente');

    // Login
    console.log('🔐 Haciendo login...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminData.email,
        contraseña: adminData.contraseña
      });

    console.log('Login status:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login error:', loginResponse.body);
      return;
    }

    const token = loginResponse.body.data?.token || loginResponse.body.token;
    console.log('Token obtenido:', token ? 'Sí' : 'No');
    console.log('✅ Login exitoso');

    // Test crear usuario
    console.log('👤 Intentando crear usuario...');
    const testUserData = {
      nombre: 'Test User',
      email: 'testuser@test.com',
      contraseña: 'password123',
      telefono: '0987654321'
    };

    const createUserResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send(testUserData);

    console.log('Create user status:', createUserResponse.status);
    console.log('Create user response:', JSON.stringify(createUserResponse.body, null, 2));

    if (createUserResponse.status === 201) {
      console.log('✅ Usuario creado exitosamente');
    } else {
      console.log('❌ Error creando usuario');
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

testAdminUserCreation();