const request = require('supertest');
const app = require('../../src/app');
const AuthHelper = require('../utils/AuthHelper');
const DatabaseHelper = require('../utils/DatabaseHelper');
const TestLogger = require('../utils/TestLogger');

const logger = new TestLogger({ prefix: '[TASKS-TEST]' });
const dbHelper = new DatabaseHelper();
const authHelper = new AuthHelper();

describe('Tasks Integration Tests - Fixed', () => {
  let adminUser, adminToken;
  let regularUser, regularToken;
  let testProject;

  beforeAll(async () => {
    logger.info('Iniciando configuración de tests de tareas');
    
    // Inicializar base de datos
    await dbHelper.initialize();
    
    // Crear admin
    const adminData = await authHelper.createTestUser({
      nombre: 'Admin Tasks',
      email: 'admin.tasks@test.com',
      password: 'password123',
      rol: 'administrador'
    });
    adminUser = adminData.user;
    adminToken = adminData.token;
    
    // Crear usuario regular
    const regularData = await authHelper.createTestUser({
      nombre: 'Regular Tasks',
      email: 'regular.tasks@test.com',
      password: 'password123',
      rol: 'usuario'
    });
    regularUser = regularData.user;
    regularToken = regularData.token;
    
    // Crear proyecto de prueba
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Proyecto Test Tasks',
        descripcion: 'Proyecto para tests de tareas',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      });
    
    testProject = projectResponse.body.data.project;
    
    logger.success('Configuración completada');
  });

  afterEach(async () => {
    // Limpiar tareas después de cada test
    await dbHelper.cleanup();
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await dbHelper.cleanup();
    
    // Cerrar conexión
    await dbHelper.close();
    logger.success('Cleanup completado');
  });

  // Helper para crear tareas
  const createTestTask = async (taskData, token) => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send(taskData);
    return response.body.data.task;
  };

  describe('POST /api/tasks', () => {
    test('Debe crear una tarea exitosamente', async () => {
      logger.info('Test: Crear tarea');
      
      const taskData = {
        titulo: 'Tarea de Prueba',
        descripcion: 'Descripción de la tarea de prueba',
        proyecto_id: testProject.id,
        usuario_asignado_id: regularUser.id,
        fecha_inicio: '2024-06-01',
        fecha_fin: '2024-06-30',
        prioridad: 'media'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          task: {
            id: expect.any(Number),
            titulo: taskData.titulo,
            descripcion: taskData.descripcion,
            proyecto_id: taskData.proyecto_id,
            usuario_asignado_id: taskData.usuario_asignado_id,
            estado: 'pendiente',
            prioridad: taskData.prioridad
          }
        }
      });
      
      logger.success('Tarea creada correctamente');
    });

    test('Debe fallar al crear tarea sin autorización', async () => {
      const taskData = {
        titulo: 'Tarea Sin Auth',
        descripcion: 'Descripción',
        proyecto_id: testProject.id,
        usuario_asignado_id: regularUser.id,
        fecha_vencimiento: '2024-06-30'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
      
      logger.success('Validación de autorización funcionando');
    });
  });

  describe('GET /api/tasks', () => {
    test('Debe listar tareas como administrador', async () => {
      logger.info('Test: Listar tareas como admin');
      
      // Crear algunas tareas de prueba
      await createTestTask({
        titulo: 'Tarea 1',
        descripcion: 'Descripción 1',
        proyecto_id: testProject.id,
        usuario_asignado_id: regularUser.id,
        fecha_inicio: '2024-06-01',
        fecha_fin: '2024-06-30',
        prioridad: 'alta'
      }, adminToken);

      await createTestTask({
        titulo: 'Tarea 2',
        descripcion: 'Descripción 2',
        proyecto_id: testProject.id,
        usuario_asignado_id: adminUser.id,
        fecha_inicio: '2024-07-01',
        fecha_fin: '2024-07-31',
        prioridad: 'baja'
      }, adminToken);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          tasks: expect.any(Array),
          pagination: expect.any(Object)
        }
      });

      expect(response.body.data.tasks.length).toBeGreaterThanOrEqual(2);
      
      logger.success('Tareas listadas correctamente');
    });
  });
});