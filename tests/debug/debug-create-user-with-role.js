/**
 * Script para crear un usuario con rol de responsable_proyecto y probar la funcionalidad
 */
const request = require('supertest');
const app = require('./src/app');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'kali',
  database: process.env.DB_NAME || 'gestion_proyectos'
};

async function createUserWithRole() {
  let connection;
  
  try {
    console.log('🔧 Creando usuario con rol de responsable_proyecto');
    console.log('==================================================');

    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);

    // 1. Registrar usuario
    const uniqueEmail = `responsable${Date.now()}@example.com`;
    console.log('\n1️⃣ Registrando usuario...');
    
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Responsable Test',
        email: uniqueEmail,
        contraseña: 'password123',
        telefono: '1234567890'
      });

    console.log('Register Status:', registerResponse.status);
    
    if (registerResponse.status !== 201) {
      throw new Error('Error en registro');
    }

    const userId = registerResponse.body.user.id;
    console.log('✅ Usuario creado con ID:', userId);

    // 2. Asignar rol de responsable_proyecto
    console.log('\n2️⃣ Asignando rol de responsable_proyecto...');
    
    // Obtener el ID del rol responsable_proyecto
    const [roleRows] = await connection.execute(
      'SELECT id FROM roles WHERE nombre = ?',
      ['responsable_proyecto']
    );

    if (roleRows.length === 0) {
      throw new Error('Rol responsable_proyecto no encontrado');
    }

    const roleId = roleRows[0].id;
    console.log('Rol ID encontrado:', roleId);

    // Asignar el rol al usuario
    await connection.execute(
      'INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)',
      [userId, roleId]
    );

    console.log('✅ Rol asignado exitosamente');

    // 3. Login
    console.log('\n3️⃣ Haciendo login...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        contraseña: 'password123'
      });

    console.log('Login Status:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      throw new Error('Error en login');
    }

    const token = loginResponse.body.data.token;
    console.log('✅ Token obtenido');

    // 4. Crear proyecto
    console.log('\n4️⃣ Creando proyecto...');
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Proyecto Test con Rol',
        descripcion: 'Descripción del proyecto test con rol',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      });

    console.log('Project Status:', projectResponse.status);
    console.log('Project Response:', JSON.stringify(projectResponse.body, null, 2));

    if (projectResponse.status === 201) {
      console.log('✅ ¡Proyecto creado exitosamente!');
    } else {
      console.log('❌ Error creando proyecto');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createUserWithRole();