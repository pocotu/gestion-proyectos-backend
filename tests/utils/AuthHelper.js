/**
 * AuthHelper - Utilidades para autenticación en tests
 * Proporciona métodos para crear usuarios y obtener tokens de autenticación
 */

const request = require('supertest');
const app = require('../../src/app');

class AuthHelper {
  constructor() {
    this.testUserCounter = 0;
  }

  /**
   * Crea un usuario administrador y obtiene su token
   * @returns {Object} { user, token, headers }
   */
  async createAdminAndGetToken() {
    this.testUserCounter++;
    
    // Generar un timestamp único para evitar duplicados
    const timestamp = Date.now();
    const uniqueId = `${this.testUserCounter}_${timestamp}`;
    
    const adminData = {
      nombre: `Admin User ${uniqueId}`,
      email: `admin${uniqueId}@test.com`,
      contraseña: 'password123',
      telefono: `123456789${this.testUserCounter}`,
      es_administrador: true
    };

    // Registrar usuario administrador
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);

    console.log('Register response status:', registerResponse.status);
    console.log('Register response body:', JSON.stringify(registerResponse.body, null, 2));

    if (registerResponse.status !== 201) {
      throw new Error(`Error al registrar admin: ${JSON.stringify(registerResponse.body)}`);
    }

    // Hacer login para obtener token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminData.email,
        contraseña: adminData.contraseña
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Error al hacer login admin: ${loginResponse.body.message}`);
    }

    const token = loginResponse.body.data?.token || loginResponse.body.token || registerResponse.body.token;
    
    if (!token) {
      throw new Error('No se pudo obtener el token de autenticación');
    }

    const user = loginResponse.body.data?.user || registerResponse.body.user;
    
    // Asegurar que el usuario tenga el rol de responsable_proyecto para crear proyectos
    if (!user.es_administrador) {
      try {
        await request(app)
          .post('/api/roles/assign')
          .set('Authorization', `Bearer ${token}`)
          .send({
            usuario_id: user.id,
            rol_nombre: 'responsable_proyecto'
          });
      } catch (error) {
        // Ignorar errores de asignación de rol para admin
      }
    }

    return {
      user,
      token,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  /**
   * Crea un usuario regular y obtiene su token
   * @returns {Object} { user, token, headers }
   */
  async createUserAndGetToken() {
    this.testUserCounter++;
    
    // Generar un timestamp único para evitar duplicados
    const timestamp = Date.now();
    const uniqueId = `${this.testUserCounter}_${timestamp}`;
    
    const userData = {
      nombre: `Test User ${uniqueId}`,
      email: `user${uniqueId}@test.com`,
      contraseña: 'password123',
      telefono: `098765432${this.testUserCounter}`
    };

    // Registrar usuario
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    if (registerResponse.status !== 201) {
      throw new Error(`Error al registrar usuario: ${registerResponse.body.message}`);
    }

    // Hacer login para obtener token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        contraseña: userData.contraseña
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Error al hacer login usuario: ${loginResponse.body.message}`);
    }

    const token = loginResponse.body.data?.token || loginResponse.body.token || registerResponse.body.token;
    
    if (!token) {
      throw new Error('No se pudo obtener el token de autenticación');
    }

    return {
      user: loginResponse.body.data?.user || registerResponse.body.user,
      token,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  /**
   * Crea un usuario con un rol específico y obtiene su token
   * @param {string} role - Rol del usuario
   * @returns {Object} { user, token, headers }
   */
  async createUserWithRoleAndGetToken(role) {
    this.testUserCounter++;
    
    // Generar un timestamp único para evitar duplicados
    const timestamp = Date.now();
    const uniqueId = `${this.testUserCounter}_${timestamp}`;
    
    const userData = {
      nombre: `User ${role} ${uniqueId}`,
      email: `user${role}${uniqueId}@test.com`,
      contraseña: 'password123',
      telefono: `098765432${this.testUserCounter}`
    };

    // Registrar usuario
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    if (registerResponse.status !== 201) {
      throw new Error(`Error al registrar usuario: ${registerResponse.body.message}`);
    }

    // Hacer login para obtener token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        contraseña: userData.contraseña
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Error al hacer login usuario: ${loginResponse.body.message}`);
    }

    const token = loginResponse.body.data?.token || loginResponse.body.token || registerResponse.body.token;
    
    if (!token) {
      throw new Error('No se pudo obtener el token de autenticación');
    }

    const user = loginResponse.body.data?.user || registerResponse.body.user;

    // Crear un administrador temporal para asignar el rol
    const adminAuth = await this.createAdminAndGetToken();
    
    // Asignar el rol específico al usuario usando el token de administrador
    try {
      const roleAssignResponse = await request(app)
        .post('/api/roles/assign')
        .set('Authorization', `Bearer ${adminAuth.token}`)
        .send({
          userId: user.id,
          roleIdentifier: role
        });
        
      if (roleAssignResponse.status !== 200) {
        console.warn(`Error al asignar rol ${role}:`, roleAssignResponse.body);
      }
    } catch (error) {
      console.warn(`No se pudo asignar el rol ${role} al usuario:`, error.message);
    }
    
    // Simular que el usuario tiene el rol especificado
    user.rol = role;
    
    return {
      user,
      token,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  /**
   * Crea un usuario de prueba sin token
   * @returns {Object} user data
   */
  async createTestUser() {
    this.testUserCounter++;
    const userData = {
      nombre: `Test User ${this.testUserCounter}`,
      email: `testuser${this.testUserCounter}@test.com`,
      contraseña: 'password123',
      telefono: `555123456${this.testUserCounter}`
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    if (registerResponse.status !== 201) {
      throw new Error(`Error al crear usuario de prueba: ${registerResponse.body.message}`);
    }

    return registerResponse.body.user || userData;
  }

  /**
   * Reset del contador para tests independientes
   */
  reset() {
    this.testUserCounter = 0;
  }
}

module.exports = AuthHelper;