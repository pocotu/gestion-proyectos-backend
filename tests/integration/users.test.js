/**
 * Tests de Integración - Usuarios
 * Valida todos los endpoints de usuarios requeridos por el frontend
 * Siguiendo principios SOLID y mejores prácticas de testing
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const AuthHelper = require('../utils/AuthHelper');
const TestLogger = require('../utils/TestLogger');
const { getTestConfig } = require('../utils/TestConfig');

describe('Users Integration Tests', () => {
  let db;
  let authHelper;
  let logger;
  let config;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[USERS-TESTS]' });
    config = getTestConfig();
    
    logger.testStart('Configurando entorno de tests de usuarios');
    
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
    logger.testEnd('Finalizando tests de usuarios');
    await db.close();
  });

  describe('GET /api/users/profile', () => {
    test('Debe obtener perfil del usuario autenticado', async () => {
      const profileEndpoint = config.getEndpoint('users', 'profile');
      logger.info('Test: Obtener perfil propio');
      
      const userData = config.getTestData('users', 'regular');
      const { user, headers } = await authHelper.createUserAndGetToken(userData);

      const response = await request(app)
        .get(profileEndpoint)
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: user.id,
            nombre: userData.nombre,
            email: userData.email,
            telefono: userData.telefono,
            es_administrador: userData.es_administrador
          }
        }
      });
      
      logger.success('Perfil obtenido correctamente');
    });

    test('Debe fallar sin autenticación', async () => {
      logger.info('Test: Acceso sin autenticación');
      
      const response = await request(app)
        .get(profileEndpoint)
        .expect(401);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de endpoint funcionando');
    });

    test('Debe fallar con token inválido', async () => {
      logger.info('Test: Token inválido');
      
      const response = await request(app)
        .get(profileEndpoint)
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de token funcionando');
    });
  });

  describe('PUT /api/users/profile', () => {
    test('Debe actualizar perfil exitosamente', async () => {
      const profileEndpoint = config.getEndpoint('users', 'profile');
      logger.info('Test: Actualización de perfil exitosa');
      
      const { headers } = await authHelper.createUserAndGetToken();
      
      const updateData = {
        nombre: 'Nombre Actualizado',
        telefono: '9876543210'
      };

      const response = await request(app)
        .put(profileEndpoint)
        .set(headers)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          user: {
            nombre: updateData.nombre,
            telefono: updateData.telefono
          }
        }
      });
      
      logger.success('Perfil actualizado correctamente');
    });

    test('Debe fallar con nombre vacío', async () => {
      logger.info('Test: Validación de nombre requerido');
      
      const { headers } = await authHelper.createUserAndGetToken();
      
      const invalidData = {
        nombre: '',
        telefono: '1234567890'
      };

      const response = await request(app)
        .put(profileEndpoint)
        .set(headers)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'El nombre es requerido'
      });
      
      logger.success('Validación de nombre funcionando');
    });

    test('Debe actualizar solo nombre (teléfono opcional)', async () => {
      logger.info('Test: Actualización solo nombre');
      
      const { headers } = await authHelper.createUserAndGetToken();
      
      const updateData = {
        nombre: 'Solo Nombre Nuevo'
      };

      const response = await request(app)
        .put(profileEndpoint)
        .set(headers)
        .send(updateData)
        .expect(200);

      expect(response.body.data.user.nombre).toBe(updateData.nombre);
      
      logger.success('Actualización parcial funcionando');
    });
  });

  describe('GET /api/users', () => {
    test('Debe listar usuarios como administrador', async () => {
      const usersEndpoint = config.getEndpoint('users', 'list');
      logger.info('Test: Listar usuarios como admin');
      
      // Crear admin
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear algunos usuarios de prueba
      await authHelper.createMultipleTestUsers(3);

      const response = await request(app)
        .get(usersEndpoint)
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          users: expect.any(Array),
          pagination: expect.any(Object)
        }
      });

      expect(response.body.data.users.length).toBeGreaterThan(0);
      
      logger.success('Lista de usuarios obtenida correctamente');
    });

    test('Debe fallar como usuario regular', async () => {
      logger.info('Test: Acceso denegado para usuario regular');
      
      const { headers } = await authHelper.createUserAndGetToken();

      const response = await request(app)
        .get(usersEndpoint)
        .set(headers)
        .expect(403);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de endpoint administrativo funcionando');
    });

    test('Debe soportar paginación', async () => {
      logger.info('Test: Paginación de usuarios');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear varios usuarios
      await authHelper.createMultipleTestUsers(5);

      const response = await request(app)
        .get(`${usersEndpoint}?page=1&limit=3`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data.pagination).toMatchObject({
        currentPage: expect.any(Number),
        totalPages: expect.any(Number),
        totalItems: expect.any(Number),
        itemsPerPage: expect.any(Number)
      });
      
      logger.success('Paginación funcionando correctamente');
    });
  });

  describe('GET /api/users/:id', () => {
    const getUserEndpoint = (id) => config.getFullEndpointUrl('users', 'update', { id });

    test('Debe obtener usuario específico como admin', async () => {
      logger.info('Test: Obtener usuario específico como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const testUser = await authHelper.createTestUser();

      const response = await request(app)
        .get(getUserEndpoint(testUser.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: testUser.id,
            nombre: testUser.nombre,
            email: testUser.email
          }
        }
      });
      
      logger.success('Usuario específico obtenido correctamente');
    });

    test('Debe fallar con usuario inexistente', async () => {
      logger.info('Test: Usuario inexistente');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();

      const response = await request(app)
        .get(getUserEndpoint(99999))
        .set(adminHeaders)
        .expect(404);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de usuario existente funcionando');
    });
  });

  describe('PUT /api/users/:id', () => {
    const updateUserEndpoint = (id) => config.getFullEndpointUrl('users', 'update', { id });

    test('Debe actualizar usuario como admin', async () => {
      logger.info('Test: Actualizar usuario como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const testUser = await authHelper.createTestUser();

      const updateData = {
        nombre: 'Nombre Actualizado por Admin',
        telefono: '5555555555'
      };

      const response = await request(app)
        .put(updateUserEndpoint(testUser.id))
        .set(adminHeaders)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('actualizado'),
        data: {
          user: {
            nombre: updateData.nombre,
            telefono: updateData.telefono
          }
        }
      });
      
      logger.success('Usuario actualizado por admin correctamente');
    });

    test('Debe fallar como usuario regular actualizando otro usuario', async () => {
      logger.info('Test: Usuario regular no puede actualizar otros');
      
      const { headers } = await authHelper.createUserAndGetToken();
      const otherUser = await authHelper.createTestUser({
        email: 'otro@test.com'
      });

      const response = await request(app)
        .put(updateUserEndpoint(otherUser.id))
        .set(headers)
        .send({ nombre: 'Intento de actualización' })
        .expect(403);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de actualización funcionando');
    });
  });

  describe('DELETE /api/users/:id', () => {
    const deleteUserEndpoint = (id) => config.getFullEndpointUrl('users', 'delete', { id });

    test('Debe eliminar usuario como admin', async () => {
      logger.info('Test: Eliminar usuario como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const testUser = await authHelper.createTestUser();

      const response = await request(app)
        .delete(deleteUserEndpoint(testUser.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('eliminado')
      });

      // Verificar que el usuario fue eliminado
      const deletedUser = await db.getUserByEmail(testUser.email);
      expect(deletedUser).toBeNull();
      
      logger.success('Usuario eliminado correctamente');
    });

    test('Debe fallar eliminando usuario inexistente', async () => {
      logger.info('Test: Eliminar usuario inexistente');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();

      const response = await request(app)
        .delete(deleteUserEndpoint(99999))
        .set(adminHeaders)
        .expect(404);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de usuario existente en eliminación funcionando');
    });

    test('Debe fallar como usuario regular', async () => {
      logger.info('Test: Usuario regular no puede eliminar');
      
      const { headers } = await authHelper.createUserAndGetToken();
      const otherUser = await authHelper.createTestUser({
        email: 'otro@test.com'
      });

      const response = await request(app)
        .delete(deleteUserEndpoint(otherUser.id))
        .set(headers)
        .expect(403);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de eliminación funcionando');
    });
  });

  describe('GET /api/users/settings', () => {
    const settingsEndpoint = '/api/users/settings';

    test('Debe obtener configuraciones del usuario', async () => {
      logger.info('Test: Obtener configuraciones de usuario');
      
      const { headers } = await authHelper.createUserAndGetToken();

      const response = await request(app)
        .get(settingsEndpoint)
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          settings: expect.any(Object)
        }
      });
      
      logger.success('Configuraciones obtenidas correctamente');
    });
  });

  describe('PUT /api/users/settings', () => {
    const settingsEndpoint = '/api/users/settings';

    test('Debe actualizar configuraciones del usuario', async () => {
      logger.info('Test: Actualizar configuraciones de usuario');
      
      const { headers } = await authHelper.createUserAndGetToken();

      const settingsData = {
        theme: 'dark',
        notifications: true,
        language: 'es'
      };

      const response = await request(app)
        .put(settingsEndpoint)
        .set(headers)
        .send(settingsData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('configuraciones')
      });
      
      logger.success('Configuraciones actualizadas correctamente');
    });
  });

  describe('GET /api/users/search', () => {
    const searchEndpoint = '/api/users/search';

    test('Debe buscar usuarios como admin', async () => {
      logger.info('Test: Búsqueda de usuarios como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear usuario con nombre específico
      await authHelper.createTestUser({
        nombre: 'Usuario Buscable',
        email: 'buscable@test.com'
      });

      const response = await request(app)
        .get(`${searchEndpoint}?q=Buscable`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          users: expect.any(Array)
        }
      });

      expect(response.body.data.users.length).toBeGreaterThan(0);
      
      logger.success('Búsqueda de usuarios funcionando');
    });
  });

  describe('Gestión de roles', () => {
    describe('GET /api/users/:id/roles', () => {
      test('Debe obtener roles de usuario como admin', async () => {
        logger.info('Test: Obtener roles de usuario');
        
        const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
        const testUser = await authHelper.createTestUser();

        const rolesEndpoint = config.getFullEndpointUrl('users', 'roles', { id: testUser.id });

        const response = await request(app)
          .get(rolesEndpoint)
          .set(adminHeaders)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            roles: expect.any(Array)
          }
        });
        
        logger.success('Roles de usuario obtenidos correctamente');
      });
    });

    describe('POST /api/users/:id/roles', () => {
      test('Debe asignar rol a usuario como admin', async () => {
        logger.info('Test: Asignar rol a usuario');
        
        const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
        const testUser = await authHelper.createTestUser();

        const rolesEndpoint = config.getFullEndpointUrl('users', 'roles', { id: testUser.id });

        const response = await request(app)
          .post(rolesEndpoint)
          .set(adminHeaders)
          .send({ roleName: 'responsable_proyecto' })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('rol asignado')
        });
        
        logger.success('Rol asignado correctamente');
      });
    });
  });

  describe('Flujo completo de gestión de usuarios', () => {
    test('Debe completar flujo: crear -> listar -> actualizar -> obtener -> eliminar', async () => {
      logger.info('Test: Flujo completo de gestión de usuarios');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();

      // 1. Crear usuario (ya está creado el admin)
      logger.debug('Paso 1: Usuario admin creado');

      // 2. Listar usuarios
      logger.debug('Paso 2: Listar usuarios');
      const listResponse = await request(app)
        .get(config.getEndpoint('users', 'list'))
        .set(adminHeaders)
        .expect(200);

      expect(listResponse.body.data.users.length).toBeGreaterThan(0);

      // 3. Crear usuario de prueba
      logger.debug('Paso 3: Crear usuario de prueba');
      const testUser = await authHelper.createTestUser({
        nombre: 'Usuario Flujo Test',
        email: 'flujo.user@test.com'
      });

      // 4. Obtener usuario específico
      logger.debug('Paso 4: Obtener usuario específico');
      const getUserResponse = await request(app)
        .get(config.getFullEndpointUrl('users', 'update', { id: testUser.id }))
        .set(adminHeaders)
        .expect(200);

      expect(getUserResponse.body.data.user.id).toBe(testUser.id);

      // 5. Actualizar usuario
      logger.debug('Paso 5: Actualizar usuario');
      const updateResponse = await request(app)
        .put(config.getFullEndpointUrl('users', 'update', { id: testUser.id }))
        .set(adminHeaders)
        .send({
          nombre: 'Usuario Flujo Actualizado',
          telefono: '1111111111'
        })
        .expect(200);

      expect(updateResponse.body.data.user.nombre).toBe('Usuario Flujo Actualizado');

      // 6. Eliminar usuario
      logger.debug('Paso 6: Eliminar usuario');
      const deleteResponse = await request(app)
        .delete(config.getFullEndpointUrl('users', 'delete', { id: testUser.id }))
        .set(adminHeaders)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      
      logger.success('Flujo completo de gestión de usuarios exitoso');
    });
  });
});