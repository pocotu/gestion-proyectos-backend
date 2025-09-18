/**
 * Tests de Integración - Autenticación
 * Valida todos los endpoints de autenticación requeridos por el frontend
 * Siguiendo principios SOLID y mejores prácticas de testing
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const AuthHelper = require('../utils/AuthHelper');
const TestLogger = require('../utils/TestLogger');
const { getTestConfig } = require('../utils/TestConfig');

describe('Auth Integration Tests', () => {
  let db;
  let authHelper;
  let logger;
  let config;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[AUTH-TESTS]' });
    config = getTestConfig();
    
    logger.testStart('Configurando entorno de tests de autenticación');
    
    // Inicializar helpers
    db = new DatabaseHelper();
    await db.initialize();
    
    authHelper = new AuthHelper(app, db);
    
    logger.success('Entorno de tests configurado exitosamente');
  }, 30000);

  // Cleanup después de cada test
  afterEach(async () => {
    await db.cleanTestData();
    await authHelper.cleanup();
  });

  // Cleanup global
  afterAll(async () => {
    logger.testEnd('Finalizando tests de autenticación');
    await db.close();
  });

  describe('POST /api/auth/register', () => {
    test('Debe registrar un nuevo usuario exitosamente', async () => {
      const registerEndpoint = '/api/auth/register';
      logger.info('Test: Registro exitoso de usuario');
      
      const userData = {
        nombre: 'Test User',
        email: 'test@example.com',
        contraseña: 'password123',
        telefono: '1234567890'
      };
      
      const response = await request(app)
        .post(registerEndpoint)
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('registrado'),
        data: {
          user: {
            id: expect.any(Number),
            nombre: userData.nombre,
            email: userData.email
          }
        }
      });
      
      logger.success('Usuario registrado correctamente');
    });
  });

  describe('POST /api/auth/login', () => {
    test('Debe autenticar usuario exitosamente', async () => {
      const loginEndpoint = '/api/auth/login';
      logger.info('Test: Login exitoso');
      
      const userData = {
        nombre: 'Test User',
        email: 'login@example.com',
        contraseña: 'password123',
        telefono: '1234567890'
      };
      
      // Crear usuario primero
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: userData.email,
          contraseña: userData.contraseña
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: userData.email
          },
          accessToken: expect.any(String)
        }
      });
      
      logger.success('Login exitoso con token válido');
    });
  });

  describe('GET /api/auth/profile', () => {
    test('Debe obtener perfil de usuario autenticado', async () => {
      const profileEndpoint = '/api/auth/profile';
      logger.info('Test: Obtener perfil de usuario');
      
      const userData = {
        nombre: 'Profile User',
        email: 'profile@example.com',
        contraseña: 'password123',
        telefono: '1234567890'
      };
      
      // Crear y autenticar usuario
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          contraseña: userData.contraseña
        });

      const token = loginResponse.body.data.accessToken;

      const response = await request(app)
        .get(profileEndpoint)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: userData.email,
            nombre: userData.nombre
          }
        }
      });
      
      logger.success('Obtención de perfil funcionando');
    });
  });
});