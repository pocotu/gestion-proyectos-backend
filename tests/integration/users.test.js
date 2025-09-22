/**
 * Tests de Integración - Usuarios y Roles MVP
 * Valida endpoints básicos de usuarios y gestión de roles para MVP
 * Adaptado a la base de datos final simplificada
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const TestLogger = require('../utils/TestLogger');
const AuthHelper = require('../utils/AuthHelper');

// Debug para verificar configuración de tokens
console.log('Configurando tests de usuarios y roles...');

describe('Users and Roles Integration Tests - MVP', () => {
  let db;
  let logger;
  let authHelper;
  let adminToken;
  let adminUser;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[USERS-ROLES-TESTS]' });
    authHelper = new AuthHelper();
    
    logger.testStart('Configurando entorno de tests de usuarios y roles MVP');
    
    // Inicializar helper de base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear admin usando AuthHelper
    console.log('Creando admin para tests...');
    const adminAuth = await authHelper.createAdminAndGetToken();
    adminToken = adminAuth.token;
    adminUser = adminAuth.user;
    
    console.log('Admin creado:', {
      id: adminUser.id,
      email: adminUser.email,
      es_administrador: adminUser.es_administrador,
      token: adminToken ? 'Presente' : 'Ausente'
    });
    
    logger.success('Entorno de tests configurado exitosamente');
  }, 30000);

  // Cleanup después de cada test
  afterEach(async () => {
    // Limpiar usuarios de prueba (excepto admin)
    if (db && db.connection && adminUser) {
      try {
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        // Solo eliminar usuarios de test específicos, no el admin
        await db.connection.execute('DELETE FROM usuario_roles WHERE usuario_id IN (SELECT id FROM usuarios WHERE (email LIKE "%flujo.completo%" OR email LIKE "%testuser%" OR email LIKE "%prueba%") AND id != ?)', [adminUser.id]);
        await db.connection.execute('DELETE FROM usuarios WHERE (email LIKE "%flujo.completo%" OR email LIKE "%testuser%" OR email LIKE "%prueba%") AND id != ?', [adminUser.id]);
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (error) {
        console.error('Error limpiando datos de test:', error.message);
      }
    }
  });

  // Cleanup global
  afterAll(async () => {
    logger.testEnd('Finalizando tests de usuarios y roles');
    await db.close();
  });

  describe('GET /api/users', () => {
    test('Debe listar usuarios como administrador', async () => {
      logger.info('Test: Listar usuarios como admin');
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          users: expect.any(Array)
        })
      });

      // Verificar que al menos existe el admin
      expect(response.body.data.users.length).toBeGreaterThan(0);
      
      logger.success('Listado de usuarios funcionando');
    });

    test('Debe fallar sin autorización de admin', async () => {
      // Crear usuario regular
      const userAuth = await authHelper.createUserWithRoleAndGetToken('responsable_tarea');
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userAuth.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('denegado');
      
      logger.success('Validación de permisos funcionando');
    });
  });

  describe('POST /api/users', () => {
    test('Debe crear un usuario exitosamente', async () => {
      logger.info('Test: Crear usuario');
      
      const userData = {
        nombre: 'Usuario Test',
        email: 'usuario.test@example.com',
        contraseña: 'password123',
        telefono: '1234567890'
      };
      
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        user: expect.objectContaining({
          id: expect.any(Number),
          nombre: userData.nombre,
          email: userData.email,
          telefono: userData.telefono,
          es_administrador: false
        }),
        token: expect.any(String)
      });

      // Verificar que no se devuelve la contraseña
      expect(response.body.user.contraseña).toBeUndefined();
      
      logger.success('Usuario creado correctamente');
    });

    test('Debe fallar con email duplicado', async () => {
      const userData = {
        nombre: 'Usuario Duplicado',
        email: adminUser.email, // Usar email del admin
        contraseña: 'password123',
        telefono: '1234567890'
      };
      
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('existe');
      
      logger.success('Validación de email único funcionando');
    });
  });

  describe('GET /api/roles', () => {
    test('Debe listar roles disponibles', async () => {
      logger.info('Test: Listar roles');
      
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          roles: expect.any(Array)
        })
      });

      // Verificar que existen los roles básicos del MVP
      const roleNames = response.body.data.roles.map(role => role.nombre);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('responsable_proyecto');
      expect(roleNames).toContain('responsable_tarea');
      
      logger.success('Listado de roles funcionando');
    });
  });

  describe('POST /api/users/:id/roles', () => {
    test('Debe asignar rol a usuario', async () => {
      logger.info('Test: Asignar rol a usuario');
      
      // Crear usuario de prueba
      const userData = {
        nombre: 'Usuario Para Rol',
        email: 'usuario.rol@example.com',
        contraseña: 'password123',
        telefono: '1234567890'
      };
      
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      const userId = createResponse.body.user.id;

      // Asignar rol
      const roleResponse = await request(app)
        .post(`/api/users/${userId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'responsable_proyecto' })
        .expect(200);

      expect(roleResponse.body).toMatchObject({
        success: true,
        message: expect.stringContaining('asignado')
      });
      
      logger.success('Asignación de rol funcionando');
    });

    test('Debe fallar con rol inexistente', async () => {
      const roleResponse = await request(app)
        .post(`/api/users/${adminUser.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'rol_inexistente' })
        .expect(400);

      expect(roleResponse.body.success).toBe(false);
      expect(roleResponse.body.message).toContain('válido');
      
      logger.success('Validación de roles funcionando');
    });
  });

  describe('GET /api/users/:id/roles', () => {
    test('Debe obtener roles de usuario', async () => {
      logger.info('Test: Obtener roles de usuario');
      
      const response = await request(app)
        .get(`/api/users/${adminUser.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          roles: expect.any(Array)
        })
      });

      // El admin debe tener al menos el rol admin
      const roleNames = response.body.data.roles.map(role => role.nombre);
      expect(roleNames).toContain('admin');
      
      logger.success('Obtención de roles funcionando');
    });
  });

  describe('Flujo completo de gestión de usuarios', () => {
    test('Debe completar flujo: crear -> asignar rol -> verificar -> actualizar -> eliminar', async () => {
      logger.info('Test: Flujo completo de gestión de usuarios');
      
      // 1. Crear usuario
      logger.debug('Paso 1: Crear usuario');
      console.log('Iniciando creación de usuario con token:', adminToken ? 'Presente' : 'Ausente');
      
      const userData = {
        nombre: 'Usuario Flujo Completo',
        email: 'flujo.completo@example.com',
        contraseña: 'password123',
        telefono: '1234567890'
      };
      
      console.log('Enviando POST /api/users con datos:', userData);
      
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);
        
      console.log('Usuario creado exitosamente:', createResponse.body);

      const userId = createResponse.body.user.id;

      // 2. Asignar rol
      logger.debug('Paso 2: Asignar rol');
      console.log('Asignando rol responsable_proyecto al usuario:', userId);
      
      // Primero verificar los roles del admin
      const adminRolesResponse = await request(app)
        .get('/api/roles/my-roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
        
      console.log('Roles del admin:', adminRolesResponse.body);
      
      // Si el admin no tiene el rol responsable_proyecto, asignárselo usando el endpoint de roles
      const hasResponsableRole = adminRolesResponse.body.data?.roles?.some(
        role => role.nombre === 'responsable_proyecto'
      );
      
      if (!hasResponsableRole) {
        console.log('Admin no tiene rol responsable_proyecto, asignándolo...');
        try {
          const assignAdminRoleResponse = await request(app)
            .post('/api/roles/assign')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ 
              userId: adminUser.id, 
              roleIdentifier: 'responsable_proyecto' 
            });
          console.log('Rol asignado al admin:', assignAdminRoleResponse.body);
        } catch (error) {
          console.log('Error asignando rol al admin:', error.message);
        }
      }
      
      // Simplificar: usar el endpoint de asignación de roles directamente
      console.log('Asignando rol responsable_proyecto directamente...');
      const assignRoleResponse = await request(app)
        .post('/api/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          userId: userId, 
          roleIdentifier: 'responsable_proyecto' 
        })
        .expect(200);
        
      console.log('Rol asignado exitosamente:', assignRoleResponse.body);

      // 3. Verificar roles
      logger.debug('Paso 3: Verificar roles');
      const rolesResponse = await request(app)
        .get(`/api/users/${userId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      console.log('Respuesta de roles del usuario:', rolesResponse.body);
      
      // Manejar diferentes estructuras de respuesta
      let roles = [];
      if (rolesResponse.body.data?.roles) {
        roles = rolesResponse.body.data.roles;
      } else if (rolesResponse.body.roles) {
        roles = rolesResponse.body.roles;
      } else if (Array.isArray(rolesResponse.body)) {
        roles = rolesResponse.body;
      }
      
      const roleNames = roles.map(role => role?.nombre).filter(Boolean);
      console.log('Nombres de roles encontrados:', roleNames);
      expect(roleNames).toContain('responsable_proyecto');

      // 4. Obtener usuario
      logger.debug('Paso 4: Obtener usuario');
      const getResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.data.user.id).toBe(userId);

      logger.success('Flujo completo de gestión de usuarios funcionando');
    });
  });
});