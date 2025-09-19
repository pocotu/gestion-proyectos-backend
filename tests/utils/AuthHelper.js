/**
 * AuthHelper - Clase para manejo de autenticación en tests de integración
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja operaciones de autenticación para tests
 * - Open/Closed: Extensible para nuevos tipos de autenticación
 * - Dependency Inversion: Depende de abstracciones (supertest, jwt)
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const TestLogger = require('./TestLogger');

class AuthHelper {
  constructor(app, databaseHelper) {
    this.app = app;
    this.db = databaseHelper;
    this.logger = new TestLogger({ prefix: '[AUTH-HELPER]' });
    this.testUsers = new Map(); // Cache de usuarios de prueba
    this.testTokens = new Map(); // Cache de tokens de prueba
  }

  /**
   * Crear usuario de prueba
   */
  async createTestUser(userData = {}) {
    try {
      const defaultUser = {
        nombre: 'Usuario Test',
        email: 'test@example.com',
        contraseña: 'password123',
        telefono: '1234567890',
        es_administrador: false,
        estado: true
      };

      const user = { ...defaultUser, ...userData };
      
      this.logger.info('Creando usuario de prueba', { email: user.email });

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(user.contraseña, 10);

      // Insertar usuario en base de datos
      const [result] = await this.db.connection.execute(
        `INSERT INTO usuarios (nombre, email, contraseña, telefono, es_administrador, estado) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.nombre, user.email, hashedPassword, user.telefono, user.es_administrador, user.estado]
      );

      const userId = result.insertId;
      const createdUser = {
        id: userId,
        ...user,
        contraseña: hashedPassword // Guardamos el hash para verificaciones
      };

      // Guardar en cache
      this.testUsers.set(user.email, createdUser);

      this.logger.success('Usuario de prueba creado', { 
        id: userId, 
        email: user.email,
        es_administrador: user.es_administrador 
      });

      return createdUser;

    } catch (error) {
      this.logger.error('Error al crear usuario de prueba', error);
      throw error;
    }
  }

  /**
   * Crear usuario administrador de prueba
   */
  async createTestAdmin(userData = {}) {
    const adminData = {
      nombre: 'Admin Test',
      email: 'admin@example.com',
      contraseña: 'admin123',
      es_administrador: true,
      ...userData
    };

    return await this.createTestUser(adminData);
  }

  /**
   * Generar token JWT para usuario
   */
  generateToken(user, expiresIn = '1h') {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        es_administrador: user.es_administrador,
        iat: Math.floor(Date.now() / 1000)
      };

      console.log('🔐 [AUTH-HELPER] Generando token para usuario:', { 
        id: user.id, 
        email: user.email, 
        es_administrador: user.es_administrador 
      });
      console.log('🔐 [AUTH-HELPER] JWT_SECRET usado:', process.env.JWT_SECRET);

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', {
        expiresIn,
        issuer: 'gestion-proyectos-test'
      });

      console.log('🔐 [AUTH-HELPER] Token generado exitosamente:', token.substring(0, 50) + '...');

      this.logger.debug('Token generado', { userId: user.id, expiresIn });
      return token;

    } catch (error) {
      console.log('❌ [AUTH-HELPER] Error al generar token:', error);
      this.logger.error('Error al generar token', error);
      throw error;
    }
  }

  /**
   * Realizar login y obtener token
   */
  async loginUser(email, password) {
    try {
      this.logger.info('Realizando login de usuario', { email });

      const user = await this.db.getUserByEmail(email);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.contraseña);
      if (!isValidPassword) {
        throw new Error('Contraseña incorrecta');
      }

      // Generar token
      const token = this.generateToken(user);
      
      // Guardar en cache
      this.testTokens.set(email, token);

      this.logger.success('Login exitoso', { email, userId: user.id });

      return {
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          es_administrador: user.es_administrador
        },
        token
      };

    } catch (error) {
      this.logger.error('Error en login', error);
      throw error;
    }
  }

  /**
   * Obtener headers de autorización para requests
   */
  getAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Crear usuario y obtener token en un solo paso
   */
  async createUserAndGetToken(userData = {}) {
    try {
      const user = await this.createTestUser(userData);
      const token = this.generateToken(user);
      
      this.testTokens.set(user.email, token);

      return {
        user,
        token,
        headers: this.getAuthHeaders(token)
      };

    } catch (error) {
      this.logger.error('Error al crear usuario y token', error);
      throw error;
    }
  }

  /**
   * Crear admin y obtener token en un solo paso
   */
  async createAdminAndGetToken(userData = {}) {
    try {
      const admin = await this.createTestAdmin(userData);
      const token = this.generateToken(admin);
      
      this.testTokens.set(admin.email, token);

      return {
        user: admin,
        token,
        headers: this.getAuthHeaders(token)
      };

    } catch (error) {
      this.logger.error('Error al crear admin y token', error);
      throw error;
    }
  }

  /**
   * Verificar si un token es válido
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      this.logger.debug('Token verificado', { userId: decoded.id });
      return decoded;
    } catch (error) {
      this.logger.error('Token inválido', error);
      throw error;
    }
  }

  /**
   * Crear múltiples usuarios de prueba
   */
  async createMultipleTestUsers(count = 3) {
    try {
      this.logger.info(`Creando ${count} usuarios de prueba`);
      
      const users = [];
      for (let i = 1; i <= count; i++) {
        const user = await this.createTestUser({
          nombre: `Usuario Test ${i}`,
          email: `test${i}@example.com`,
          contraseña: `password${i}23`
        });
        users.push(user);
      }

      this.logger.success(`${count} usuarios de prueba creados exitosamente`);
      return users;

    } catch (error) {
      this.logger.error('Error al crear múltiples usuarios', error);
      throw error;
    }
  }

  /**
   * Asignar rol a usuario
   */
  async assignRoleToUser(userId, roleName) {
    try {
      this.logger.info('Asignando rol a usuario', { userId, roleName });

      // Obtener ID del rol
      const [roles] = await this.db.connection.execute(
        'SELECT id FROM roles WHERE nombre = ?',
        [roleName]
      );

      if (roles.length === 0) {
        throw new Error(`Rol '${roleName}' no encontrado`);
      }

      const rolId = roles[0].id;

      // Asignar rol al usuario
      await this.db.connection.execute(
        `INSERT INTO usuario_roles (usuario_id, rol_id, activo) 
         VALUES (?, ?, TRUE) 
         ON DUPLICATE KEY UPDATE activo = TRUE`,
        [userId, rolId]
      );

      this.logger.success('Rol asignado exitosamente', { userId, roleName });

    } catch (error) {
      this.logger.error('Error al asignar rol', error);
      throw error;
    }
  }

  /**
   * Limpiar datos de prueba de autenticación
   */
  async cleanupTestData() {
    try {
      this.logger.info('Limpiando datos de prueba de autenticación');
      
      // Limpiar cache
      this.testUsers.clear();
      this.testTokens.clear();
      
      this.logger.success('Datos de prueba de autenticación limpiados');
    } catch (error) {
      this.logger.error('Error limpiando datos de prueba de autenticación', error);
      throw error;
    }
  }

  /**
   * Limpiar datos de prueba (alias para compatibilidad)
   */
  async cleanup() {
    return await this.cleanupTestData();
  }

  /**
   * Obtener usuario de prueba del cache
   */
  getTestUser(email) {
    return this.testUsers.get(email);
  }

  /**
   * Obtener token de prueba del cache
   */
  getTestToken(email) {
    return this.testTokens.get(email);
  }

  /**
   * Crear token expirado para tests de expiración
   */
  generateExpiredToken(user) {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        es_administrador: user.es_administrador,
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hora atrás
        exp: Math.floor(Date.now() / 1000) - 1800  // Expirado hace 30 minutos
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test_secret');
      
      this.logger.debug('Token expirado generado para pruebas', { userId: user.id });
      return token;

    } catch (error) {
      this.logger.error('Error al generar token expirado', error);
      throw error;
    }
  }

  /**
   * Crear token con payload malformado para tests de seguridad
   */
  generateMalformedToken() {
    try {
      const payload = {
        invalid: 'payload',
        missing: 'required_fields'
      };

      const token = jwt.sign(payload, 'wrong_secret');
      
      this.logger.debug('Token malformado generado para pruebas');
      return token;

    } catch (error) {
      this.logger.error('Error al generar token malformado', error);
      throw error;
    }
  }
}

module.exports = AuthHelper;