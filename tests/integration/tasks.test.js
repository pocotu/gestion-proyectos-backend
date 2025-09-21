/**
 * Tests de Integración - Tareas MVP
 * Valida endpoints básicos de tareas para MVP
 * Simplificado sin funcionalidades complejas como subtareas
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const TestLogger = require('../utils/TestLogger');
const AuthHelper = require('../utils/AuthHelper');

describe('Tasks Integration Tests - MVP', () => {
  let db;
  let logger;
  let authHelper;
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;
  let testProject;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[TASKS-TESTS]' });
    authHelper = new AuthHelper();
    
    logger.testStart('Configurando entorno de tests de tareas MVP');
    
    // Inicializar helper de base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear usuarios de prueba
    const adminData = {
      nombre: 'Admin User',
      email: 'admin@test.com',
      contraseña: 'password123',
      telefono: '1234567890',
      es_administrador: true
    };

    const userData = {
      nombre: 'Regular User',
      email: 'user@test.com',
      contraseña: 'password123',
      telefono: '0987654321'
    };

    // Registrar usuarios
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);
    
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    adminToken = adminResponse.body.data?.token || adminResponse.body.token;
    userToken = userResponse.body.data?.token || userResponse.body.token;
    adminUser = adminResponse.body.user;
    regularUser = userResponse.body.user;

    // Crear proyecto de prueba
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        titulo: 'Proyecto de Prueba',
        descripcion: 'Proyecto para tests de tareas',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      });
    
    testProject = projectResponse.body.project;
    
    logger.success('Entorno de tests configurado exitosamente');
  }, 30000);

  // Cleanup después de cada test
  afterEach(async () => {
    // Solo limpiar tareas, no usuarios ni proyectos principales
    if (db && db.connection) {
      try {
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await db.connection.execute('DELETE FROM tareas WHERE proyecto_id = ?', [testProject.id]);
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (error) {
        console.error('Error limpiando datos de test:', error.message);
      }
    }
  });

  // Cleanup global
  afterAll(async () => {
    logger.testEnd('Finalizando tests de tareas');
    await db.close();
  });

  // Helper para crear tarea de prueba
  const createTestTask = async (taskData, token) => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send(taskData);
    // El controlador devuelve response.body.data.task, pero el test exitoso espera response.body.task
    // Verificamos ambas estructuras para compatibilidad
    return response.body.data?.task || response.body.task;
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

    test('Debe listar tareas asignadas para usuario regular', async () => {
      logger.info('Test: Listar tareas como usuario regular');
      
      // Crear tarea asignada al usuario regular
      await createTestTask({
        titulo: 'Mi Tarea',
        descripcion: 'Tarea asignada a mí',
        proyecto_id: testProject.id,
        usuario_asignado_id: regularUser.id,
        fecha_vencimiento: '2024-06-30'
      }, adminToken);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        tasks: expect.any(Array)
      });
      
      logger.success('Filtrado de tareas por usuario funcionando');
    });
  });

  describe('GET /api/tasks/:id', () => {
    test('Debe obtener detalles de una tarea específica', async () => {
      logger.info('Test: Obtener detalles de tarea');
      
      const task = await createTestTask({
        titulo: 'Tarea Detalle',
        descripcion: 'Descripción detallada',
        proyecto_id: testProject.id,
        usuario_asignado_id: regularUser.id,
        fecha_vencimiento: '2024-06-30',
        prioridad: 'alta'
      }, adminToken);

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        task: {
          id: task.id,
          titulo: 'Tarea Detalle',
          descripcion: 'Descripción detallada',
          estado: 'pendiente',
          prioridad: 'alta'
        }
      });
      
      logger.success('Detalles de tarea obtenidos correctamente');
    });

    test('Debe fallar al obtener tarea inexistente', async () => {
      const response = await request(app)
        .get('/api/tasks/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('no encontrada');
      
      logger.success('Validación de tarea inexistente funcionando');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    test('Debe actualizar una tarea exitosamente', async () => {
      logger.info('Test: Actualizar tarea');
      
      const task = await createTestTask({
        titulo: 'Tarea Original',
        descripcion: 'Descripción original',
        proyecto_id: testProject.id,
        usuario_asignado_id: regularUser.id,
        fecha_vencimiento: '2024-06-30',
        prioridad: 'baja'
      }, adminToken);

      const updateData = {
        titulo: 'Tarea Actualizada',
        descripcion: 'Descripción actualizada',
        estado: 'en_progreso',
        prioridad: 'alta'
      };

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        task: {
          id: task.id,
          titulo: updateData.titulo,
          descripcion: updateData.descripcion,
          estado: updateData.estado,
          prioridad: updateData.prioridad
        }
      });
      
      logger.success('Tarea actualizada correctamente');
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    test('Debe actualizar el estado de una tarea', async () => {
      logger.info('Test: Actualizar estado de tarea');
      
      const task = await createTestTask({
        titulo: 'Tarea Estado',
        descripcion: 'Tarea para cambiar estado',
        proyecto_id: testProject.id,
        usuario_asignado_id: regularUser.id,
        fecha_vencimiento: '2024-06-30'
      }, adminToken);

      const response = await request(app)
        .patch(`/api/tasks/${task.id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ estado: 'completada' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        task: {
          id: task.id,
          estado: 'completada'
        }
      });
      
      logger.success('Estado de tarea actualizado correctamente');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    test('Debe eliminar una tarea exitosamente', async () => {
      logger.info('Test: Eliminar tarea');
      
      const task = await createTestTask({
        titulo: 'Tarea a Eliminar',
        descripcion: 'Esta tarea será eliminada',
        proyecto_id: testProject.id,
        usuario_asignado_id: regularUser.id,
        fecha_vencimiento: '2024-06-30'
      }, adminToken);

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('eliminada')
      });
      
      // Verificar que la tarea ya no existe
      await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
      
      logger.success('Tarea eliminada correctamente');
    });
  });

  describe('Filtros y Paginación', () => {
    test('Debe soportar paginación', async () => {
      logger.info('Test: Paginación de tareas');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const tasksEndpoint = '/api/tasks';
      
      // Crear proyecto y varias tareas
      const project = await createTestProject();
      await createTestTasks(5, project.id);

      const response = await request(app)
        .get(`${tasksEndpoint}?page=1&limit=3`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data.pagination).toMatchObject({
        page: expect.any(Number),
        pages: expect.any(Number),
        total: expect.any(Number),
        limit: expect.any(Number)
      });
      
      logger.success('Paginación funcionando correctamente');
    });

    test('Debe soportar filtros por estado', async () => {
      logger.info('Test: Filtros por estado');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const tasksEndpoint = '/api/tasks';
      
      // Crear proyecto y tarea con estado específico
      const project = await createTestProject();
      await createTestTask({
        ...getTestTaskData(),
        proyecto_id: project.id,
        estado: 'en_progreso'
      });

      const response = await request(app)
        .get(`${tasksEndpoint}?estado=en_progreso`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      logger.success('Filtros por estado funcionando');
    });

    test('Debe soportar filtros por prioridad', async () => {
      logger.info('Test: Filtros por prioridad');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const tasksEndpoint = '/api/tasks';
      
      // Crear proyecto y tarea con prioridad específica
      const project = await createTestProject();
      await createTestTask({
        ...getTestTaskData(),
        proyecto_id: project.id,
        prioridad: 'alta'
      });

      const response = await request(app)
        .get(`${tasksEndpoint}?prioridad=alta`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      logger.success('Filtros por prioridad funcionando');
    });

    test('Debe soportar filtros por proyecto', async () => {
      logger.info('Test: Filtros por proyecto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const tasksEndpoint = '/api/tasks';
      
      // Crear proyecto y tarea
      const project = await createTestProject();
      await createTestTask({
        ...getTestTaskData(),
        proyecto_id: project.id
      });

      const response = await request(app)
        .get(`${tasksEndpoint}?proyecto_id=${project.id}`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      logger.success('Filtros por proyecto funcionando');
    });
  });

  describe('POST /api/tasks', () => {
    test('Debe crear nueva tarea como admin', async () => {
      logger.info('Test: Crear nueva tarea como admin');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const testUser = await authHelper.createTestUser();
      
      const taskData = {
        ...getTestTaskData(),
        proyecto_id: project.id,
        usuario_asignado_id: testUser.id
      };

      const response = await request(app)
        .post('/api/tasks')
        .set(adminHeaders)
        .send(taskData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('creada'),
        data: {
          task: {
            titulo: taskData.titulo,
            descripcion: taskData.descripcion,
            proyecto_id: project.id,
            estado: 'pendiente'
          }
        }
      });
      
      logger.success('Tarea creada correctamente');
    });

    test('Debe crear tarea como responsable de proyecto', async () => {
      logger.info('Test: Crear tarea como responsable de proyecto');
      
      const { user, headers } = await authHelper.createUserWithRoleAndGetToken('responsable_proyecto');
      const project = await createTestProject(user.id);
      
      const taskData = {
        ...getTestTaskData(),
        proyecto_id: project.id
      };

      const response = await request(app)
        .post(tasksEndpoint)
        .set(headers)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      logger.success('Tarea creada por responsable de proyecto correctamente');
    });

    test('Debe fallar con datos incompletos', async () => {
      logger.info('Test: Validación de datos requeridos');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      const incompleteData = {
        titulo: 'Solo título'
        // Faltan descripcion, fechas, proyecto_id
      };

      const response = await request(app)
        .post(tasksEndpoint)
        .set(adminHeaders)
        .send(incompleteData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('requeridos')
      });
      
      logger.success('Validación de datos requeridos funcionando');
    });

    test('Debe fallar con fechas inválidas', async () => {
      logger.info('Test: Validación de fechas');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject();
      
      const invalidDateData = {
        titulo: 'Tarea Test',
        descripcion: 'Descripción test',
        fecha_inicio: '2024-12-31',
        fecha_fin: '2024-01-01', // Fecha fin anterior a inicio
        proyecto_id: project.id
      };

      const response = await request(app)
        .post(tasksEndpoint)
        .set(adminHeaders)
        .send(invalidDateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('fecha de fin debe ser posterior')
      });
      
      logger.success('Validación de fechas funcionando');
    });

    test('Debe fallar con proyecto inexistente', async () => {
      logger.info('Test: Proyecto inexistente');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      const taskData = {
        ...getTestTaskData(),
        proyecto_id: 99999 // Proyecto inexistente
      };

      const response = await request(app)
        .post(tasksEndpoint)
        .set(adminHeaders)
        .send(taskData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('proyecto no existe')
      });
      
      logger.success('Validación de proyecto existente funcionando');
    });

    test('Debe fallar como usuario sin permisos', async () => {
      logger.info('Test: Usuario sin permisos no puede crear');
      
      const { headers } = await authHelper.createUserAndGetToken();
      const project = await createTestProject();
      
      const taskData = {
        ...getTestTaskData(),
        proyecto_id: project.id
      };

      const response = await request(app)
        .post(tasksEndpoint)
        .set(headers)
        .send(taskData)
        .expect(403);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de permisos funcionando');
    });
  });

  describe('GET /api/tasks/:id', () => {
    const getTaskEndpoint = (id) => `/api/tasks/${id}`;

    test('Debe obtener tarea específica como admin', async () => {
      logger.info('Test: Obtener tarea específica como admin');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const tasks = await createTestTasks(1, project.id, adminUser.id);
      const task = tasks[0];

      const response = await request(app)
        .get(getTaskEndpoint(task.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          task: {
            id: task.id,
            titulo: task.titulo,
            descripcion: task.descripcion,
            proyecto_id: project.id
          }
        }
      });
      
      logger.success('Tarea específica obtenida correctamente');
    });

    test('Debe fallar obteniendo tarea inexistente', async () => {
      logger.info('Test: Fallar obteniendo tarea inexistente');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();

      const response = await request(app)
        .get(getTaskEndpoint(99999))
        .set(adminHeaders)
        .expect(404);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de tarea inexistente funcionando');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    const updateTaskEndpoint = (id) => `/api/tasks/${id}`;

    test('Debe actualizar tarea como admin', async () => {
      logger.info('Test: Actualizar tarea como admin');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const task = await createTestTask({
        ...getTestTaskData(),
        proyecto_id: project.id,
        creado_por: adminUser.id
      });

      const updateData = {
        titulo: 'Tarea Actualizada',
        descripcion: 'Descripción actualizada'
      };

      const response = await request(app)
        .put(updateTaskEndpoint(task.id))
        .set(adminHeaders)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('actualizada'),
        data: {
          task: {
            titulo: updateData.titulo,
            descripcion: updateData.descripcion
          }
        }
      });
      
      logger.success('Tarea actualizada correctamente');
    });

    test('Debe fallar actualizando tarea inexistente', async () => {
      logger.info('Test: Fallar actualizando tarea inexistente');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();

      const response = await request(app)
        .put(updateTaskEndpoint(99999))
        .set(adminHeaders)
        .send({ titulo: 'Nuevo título' })
        .expect(404);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de tarea inexistente funcionando');
    });

    test('Debe fallar actualizando con datos inválidos', async () => {
      logger.info('Test: Fallar actualizando con datos inválidos');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const task = await createTestTask({
        ...getTestTaskData(),
        proyecto_id: project.id,
        creado_por: adminUser.id
      });

      const response = await request(app)
        .put(updateTaskEndpoint(task.id))
        .set(adminHeaders)
        .send({ titulo: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de datos funcionando');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    const deleteTaskEndpoint = (id) => `/api/tasks/${id}`;

    test('Debe eliminar tarea como admin', async () => {
      logger.info('Test: Eliminar tarea como admin');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const task = await createTestTask({
        ...getTestTaskData(),
        proyecto_id: project.id,
        creado_por: adminUser.id
      });

      const response = await request(app)
        .delete(deleteTaskEndpoint(task.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('eliminada')
      });
      
      logger.success('Tarea eliminada correctamente');
    });

    test('Debe fallar eliminando tarea en progreso', async () => {
      logger.info('Test: Fallar eliminando tarea en progreso');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const taskData = {
        ...getTestTaskData(),
        proyecto_id: project.id,
        estado: 'en_progreso',
        creado_por: adminUser.id
      };
      const task = await createTestTask(taskData);

      const response = await request(app)
        .delete(deleteTaskEndpoint(task.id))
        .set(adminHeaders)
        .expect(400);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de estado funcionando');
    });
  });

  describe('PUT /api/tasks/:id/status', () => {
    const changeStatusEndpoint = (id) => `/api/tasks/${id}/status`;

    test('Debe cambiar estado de la tarea', async () => {
      logger.info('Test: Cambiar estado de la tarea');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const task = await createTestTask({
        ...getTestTaskData(),
        proyecto_id: project.id
      });

      const response = await request(app)
        .put(changeStatusEndpoint(task.id))
        .set(adminHeaders)
        .send({ estado: 'en_progreso' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Estado de la tarea actualizado exitosamente',
        data: {
          task: {
            estado: 'en_progreso'
          }
        }
      });
      
      logger.success('Estado de la tarea cambiado correctamente');
    });

    test('Debe fallar con estado inválido', async () => {
      logger.info('Test: Fallar con estado inválido');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const tasks = await createTestTasks(1, project.id, adminUser.id);
      const response = await request(app)
        .put(changeStatusEndpoint(tasks[0].id))
        .set(adminHeaders)
        .send({ estado: 'estado_inexistente' })
        .expect(400);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de estado funcionando');
    });
  });

  describe('PUT /api/tasks/:id/assign', () => {
    const assignTaskEndpoint = (id) => `/api/tasks/${id}/assign`;

    test('Debe asignar tarea a usuario', async () => {
      logger.info('Test: Asignar tarea a usuario');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const testUser = await authHelper.createTestUser();
      const project = await createTestProject(adminUser.id);
      const tasks = await createTestTasks(1, project.id, adminUser.id);
      const response = await request(app)
        .put(assignTaskEndpoint(tasks[0].id))
        .set(adminHeaders)
        .send({ userId: testUser.id })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('asignada'),
        data: {
          task: {
            usuario_asignado_id: testUser.id
          }
        }
      });
      
      logger.success('Tarea asignada correctamente');
    });

    test('Debe fallar asignando a usuario inexistente', async () => {
      logger.info('Test: Fallar asignando a usuario inexistente');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const tasks = await createTestTasks(1, project.id, adminUser.id);
      const response = await request(app)
        .put(assignTaskEndpoint(tasks[0].id))
        .set(adminHeaders)
        .send({ userId: 99999 })
        .expect(404);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de usuario existente en asignación funcionando');
    });
  });

  describe('GET /api/tasks/my', () => {
    const myTasksEndpoint = '/api/tasks/my';

    test('Debe obtener tareas del usuario', async () => {
      logger.info('Test: Obtener mis tareas');
      
      const { user, headers } = await authHelper.createUserAndGetToken();
      const project = await createTestProject();
      
      // Crear tarea asignada al usuario
      await createTestTask({
        ...getTestTaskData(),
        proyecto_id: project.id,
        usuario_asignado_id: user.id
      });

      const response = await request(app)
        .get(myTasksEndpoint)
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          tasks: expect.any(Array)
        }
      });
      
      logger.success('Mis tareas obtenidas correctamente');
    });
  });

  describe('GET /api/tasks/:id/files', () => {
    const taskFilesEndpoint = (id) => `/api/tasks/${id}/files`;

    test('Debe obtener archivos de la tarea', async () => {
      logger.info('Test: Obtener archivos de la tarea');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(adminUser.id);
      const tasks = await createTestTasks(1, project.id, adminUser.id);
      const task = tasks[0];

      const response = await request(app)
        .get(taskFilesEndpoint(task.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          files: expect.any(Array)
        }
      });
      
      logger.success('Archivos de tarea obtenidos correctamente');
    });
  });

  describe('GET /api/tasks/stats', () => {
    const taskStatsEndpoint = '/api/tasks/stats';

    test('Debe obtener estadísticas de tareas', async () => {
      logger.info('Test: Obtener estadísticas de tareas');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto y algunas tareas
      const project = await createTestProject(adminUser.id);
      await createTestTasks(3, project.id);

      const response = await request(app)
        .get(taskStatsEndpoint)
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          stats: expect.any(Object)
        }
      });
      
      logger.success('Estadísticas de tareas obtenidas correctamente');
    });
  });

  describe('Flujo completo de gestión de tareas', () => {
    test('Debe completar flujo: crear -> obtener -> actualizar -> asignar -> cambiar estado -> eliminar', async () => {
      logger.info('Test: Flujo completo de gestión de tareas');
      
      const { headers: adminHeaders, user: adminUser } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto y tareas de prueba
      const project = await createTestProject(adminUser.id);
      const user = await authHelper.createTestUser();

      // 1. Crear tarea
      logger.debug('Paso 1: Crear tarea');
      const taskData = {
        ...getTestTaskData(),
        proyecto_id: project.id
      };
      const createResponse = await request(app)
        .post('/api/tasks')
        .set(adminHeaders)
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.data.task.id;

      // 2. Obtener tarea
      logger.debug('Paso 2: Obtener tarea');
      const getResponse = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set(adminHeaders)
        .expect(200);

      expect(getResponse.body.data.task.id).toBe(taskId);

      // 3. Actualizar tarea
      logger.debug('Paso 3: Actualizar tarea');
      const updateResponse = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set(adminHeaders)
        .send({
          titulo: 'Tarea Flujo Actualizada',
          descripcion: 'Descripción actualizada en flujo',
          prioridad: 'alta'
        })
        .expect(200);

      expect(updateResponse.body.data.task.titulo).toBe('Tarea Flujo Actualizada');

      // 4. Asignar tarea
      logger.debug('Paso 4: Asignar tarea');
      const assignResponse = await request(app)
        .put(`/api/tasks/${taskId}/assign`)
        .set(adminHeaders)
        .send({ userId: user.id })
        .expect(200);

      expect(assignResponse.body.data.task.usuario_asignado_id).toBe(user.id);

      // 5. Cambiar estado
      logger.debug('Paso 5: Cambiar estado');
      const statusResponse = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .set(adminHeaders)
        .send({ estado: 'en_progreso' })
        .expect(200);

      expect(statusResponse.body.data.task.estado).toBe('en_progreso');

      // 6. Cambiar estado a completada para poder eliminar
      logger.debug('Paso 6: Completar tarea');
      await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .set(adminHeaders)
        .send({ estado: 'completada' })
        .expect(200);

      // 7. Eliminar tarea
      logger.debug('Paso 7: Eliminar tarea');
      const deleteResponse = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set(adminHeaders)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      
      logger.success('Flujo completo de gestión de tareas exitoso');
    });
  });



  async function createTestProject(createdBy = null) {
    // Si no se proporciona createdBy, crear un usuario admin primero
    if (!createdBy) {
      const { user } = await authHelper.createAdminAndGetToken();
      createdBy = user.id;
    }

    // Verificar que el usuario existe antes de crear el proyecto
    const userExists = await db.query('SELECT id FROM usuarios WHERE id = ?', [createdBy]);
    if (!userExists || userExists.length === 0) {
      throw new Error(`Usuario con ID ${createdBy} no existe`);
    }

    // Usar el DatabaseHelper para crear el proyecto
    const projectData = {
      titulo: 'Proyecto Test Tasks',
      descripcion: 'Proyecto para pruebas de tareas',
      creado_por: createdBy
    };

    const project = await db.createTestProject(projectData);
    
    // Verificar que el proyecto se creó correctamente
    console.log('🧪 [TEST] Proyecto creado:', { id: project.id, titulo: project.titulo });
    
    return project;
  }

  // Helper functions
  function getTestTaskData() {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días después

    return {
      titulo: 'Tarea Test',
      descripcion: 'Descripción de la tarea de prueba',
      fecha_inicio: now.toISOString().split('T')[0],
      fecha_fin: futureDate.toISOString().split('T')[0],
      prioridad: 'media'
    };
  }

  async function createTestTasks(count, projectId, createdBy = null) {
    const tasks = [];
    
    // Si no se proporciona createdBy, crear un usuario de prueba
    let validCreatedBy = createdBy;
    if (!validCreatedBy) {
      const testUser = await authHelper.createTestUser();
      validCreatedBy = testUser.id;
    }
    
    // Obtener token de admin para crear las tareas
    const { token } = await authHelper.createAdminAndGetToken();
    
    for (let i = 0; i < count; i++) {
      const taskData = {
        ...getTestTaskData(),
        titulo: `Tarea Test ${i + 1}`,
        proyecto_id: projectId,
        creado_por: validCreatedBy
      };
      const task = await createTestTask(taskData, token);
      tasks.push(task);
    }
    return tasks;
  }
});