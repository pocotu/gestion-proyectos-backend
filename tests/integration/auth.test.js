/**
 * Tests de Integración - Autenticación MVP
 * Valida endpoints de autenticación básicos para MVP
 * Simplificado sin refresh tokens ni blacklist
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const TestLogger = require('../utils/TestLogger');

describe('Auth Integration Tests - MVP', () => {
  let db;
  let logger;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[AUTH-TESTS]' });
    
    logger.testStart('Configurando entorno de tests de autenticación MVP');
    
    // Inicializar helper de base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    logger.success('Entorno de tests configurado exitosamente');
  }, 30000);

  // Cleanup después de cada test
  afterEach(async () => {
    await db.cleanTestData();
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
        user: {
          id: expect.any(Number),
          nombre: userData.nombre,
          email: userData.email,
          telefono: userData.telefono,
          es_administrador: false
        },
        token: expect.any(String)
      });
      
      logger.success('Usuario registrado correctamente');
    });

    test('Debe fallar al registrar usuario con email duplicado', async () => {
      const userData = {
        nombre: 'Test User',
        email: 'duplicate@example.com',
        contraseña: 'password123',
        telefono: '1234567890'
      };
      
      // Registrar usuario por primera vez
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Intentar registrar con el mismo email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ya existe');
      
      logger.success('Validación de email duplicado funcionando');
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
          token: expect.any(String)
        }
      });
      
      logger.success('Login exitoso con token válido');
    });

    test('Debe fallar con credenciales inválidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'noexiste@example.com',
          contraseña: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credenciales inválidas');
      
      logger.success('Validación de credenciales funcionando');
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
      
      // Crear usuario
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Autenticar usuario
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          contraseña: userData.contraseña
        });

      console.log('Login response:', JSON.stringify(loginResponse.body, null, 2));
      
      // Usar el token del registro si el login falla
      const token = loginResponse.body.data?.token || 
                   loginResponse.body.token || 
                   registerResponse.body.token;

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

    test('Debe fallar sin token de autorización', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
      
      logger.success('Validación de autorización funcionando');
    });
  });
});