/**
 * Tests de Integración - Proyectos
 * Valida todos los endpoints de proyectos requeridos por el frontend
 * Siguiendo principios SOLID y mejores prácticas de testing
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const AuthHelper = require('../utils/AuthHelper');
const TestLogger = require('../utils/TestLogger');
const { getTestConfig } = require('../utils/TestConfig');

describe('Projects Integration Tests', () => {
  let db;
  let authHelper;
  let logger;
  let config;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[PROJECTS-TESTS]' });
    config = getTestConfig();
    
    logger.testStart('Configurando entorno de tests de proyectos');
    
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
    logger.testEnd('Finalizando tests de proyectos');
    await db.close();
  });

  describe('GET /api/projects', () => {
    test('Debe listar proyectos como administrador', async () => {
      const projectsEndpoint = config.getEndpoint('projects', 'list');
      logger.info('Test: Listar proyectos como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear algunos proyectos de prueba
      await createTestProjects(3);

      const response = await request(app)
        .get(projectsEndpoint)
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          projects: expect.any(Array),
          pagination: expect.any(Object)
        }
      });

      expect(response.body.data.projects.length).toBeGreaterThan(0);
      
      logger.success('Lista de proyectos obtenida correctamente');
    });

    test('Debe listar solo proyectos accesibles para usuario regular', async () => {
      logger.info('Test: Listar proyectos como usuario regular');
      
      const { user, headers } = await authHelper.createUserAndGetToken();
      
      // Crear proyecto donde el usuario es responsable
      const projectData = getTestProjectData();
      const project = await createTestProject(projectData, user.id);

      const response = await request(app)
        .get(projectsEndpoint)
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          projects: expect.any(Array)
        }
      });
      
      logger.success('Filtrado de proyectos por permisos funcionando');
    });

    test('Debe soportar paginación', async () => {
      logger.info('Test: Paginación de proyectos');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear varios proyectos
      await createTestProjects(5);

      const response = await request(app)
        .get(`${projectsEndpoint}?page=1&limit=3`)
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

    test('Debe soportar filtros por estado', async () => {
      logger.info('Test: Filtros por estado');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto con estado específico
      await createTestProject({
        ...getTestProjectData(),
        estado: 'en_progreso'
      });

      const response = await request(app)
        .get(`${projectsEndpoint}?estado=en_progreso`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      logger.success('Filtros por estado funcionando');
    });

    test('Debe soportar búsqueda por texto', async () => {
      logger.info('Test: Búsqueda por texto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto con título específico
      await createTestProject({
        ...getTestProjectData(),
        titulo: 'Proyecto Buscable Único'
      });

      const response = await request(app)
        .get(`${projectsEndpoint}?search=Buscable`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      logger.success('Búsqueda por texto funcionando');
    });
  });

  describe('POST /api/projects', () => {
    test('Debe crear proyecto exitosamente como admin', async () => {
      const projectsEndpoint = config.getEndpoint('projects', 'create');
      logger.info('Test: Crear proyecto como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      const projectData = getTestProjectData();

      const response = await request(app)
        .post(projectsEndpoint)
        .set(adminHeaders)
        .send(projectData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('creado'),
        data: {
          project: {
            titulo: projectData.titulo,
            descripcion: projectData.descripcion,
            estado: 'planificacion'
          }
        }
      });
      
      logger.success('Proyecto creado correctamente');
    });

    test('Debe crear proyecto como responsable de proyecto', async () => {
      logger.info('Test: Crear proyecto como responsable');
      
      const { headers } = await authHelper.createUserWithRoleAndGetToken('responsable_proyecto');
      
      const projectData = getTestProjectData();

      const response = await request(app)
        .post(projectsEndpoint)
        .set(headers)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      logger.success('Proyecto creado por responsable correctamente');
    });

    test('Debe fallar con datos incompletos', async () => {
      logger.info('Test: Validación de datos requeridos');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      const incompleteData = {
        titulo: 'Solo título'
        // Faltan descripcion, fecha_inicio, fecha_fin
      };

      const response = await request(app)
        .post(projectsEndpoint)
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
      
      const invalidDateData = {
        titulo: 'Proyecto Test',
        descripcion: 'Descripción test',
        fecha_inicio: '2024-12-31',
        fecha_fin: '2024-01-01' // Fecha fin anterior a inicio
      };

      const response = await request(app)
        .post(projectsEndpoint)
        .set(adminHeaders)
        .send(invalidDateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('fecha de fin debe ser posterior')
      });
      
      logger.success('Validación de fechas funcionando');
    });

    test('Debe fallar como usuario sin permisos', async () => {
      logger.info('Test: Usuario sin permisos no puede crear');
      
      const { headers } = await authHelper.createUserAndGetToken();
      
      const projectData = getTestProjectData();

      const response = await request(app)
        .post(projectsEndpoint)
        .set(headers)
        .send(projectData)
        .expect(403);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de permisos funcionando');
    });
  });

  describe('GET /api/projects/:id', () => {
    const getProjectEndpoint = (id) => config.getFullEndpointUrl('projects', 'detail', { id });

    test('Debe obtener proyecto específico', async () => {
      logger.info('Test: Obtener proyecto específico');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .get(getProjectEndpoint(project.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          project: {
            id: project.id,
            titulo: project.titulo,
            descripcion: project.descripcion
          }
        }
      });
      
      logger.success('Proyecto específico obtenido correctamente');
    });

    test('Debe fallar con proyecto inexistente', async () => {
      logger.info('Test: Proyecto inexistente');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();

      const response = await request(app)
        .get(getProjectEndpoint(99999))
        .set(adminHeaders)
        .expect(404);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de proyecto existente funcionando');
    });

    test('Debe fallar sin permisos de acceso', async () => {
      logger.info('Test: Sin permisos de acceso al proyecto');
      
      const { headers } = await authHelper.createUserAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .get(getProjectEndpoint(project.id))
        .set(headers)
        .expect(403);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de acceso a proyectos funcionando');
    });
  });

  describe('PUT /api/projects/:id', () => {
    const updateProjectEndpoint = (id) => config.getFullEndpointUrl('projects', 'update', { id });

    test('Debe actualizar proyecto como admin', async () => {
      logger.info('Test: Actualizar proyecto como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const updateData = {
        titulo: 'Proyecto Actualizado',
        descripcion: 'Descripción actualizada'
      };

      const response = await request(app)
        .put(updateProjectEndpoint(project.id))
        .set(adminHeaders)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('actualizado'),
        data: {
          project: {
            titulo: updateData.titulo,
            descripcion: updateData.descripcion
          }
        }
      });
      
      logger.success('Proyecto actualizado correctamente');
    });

    test('Debe fallar actualizando con fechas inválidas', async () => {
      logger.info('Test: Validación de fechas en actualización');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const invalidUpdate = {
        fecha_inicio: '2024-12-31',
        fecha_fin: '2024-01-01'
      };

      const response = await request(app)
        .put(updateProjectEndpoint(project.id))
        .set(adminHeaders)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de fechas en actualización funcionando');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    const deleteProjectEndpoint = (id) => config.getFullEndpointUrl('projects', 'delete', { id });

    test('Debe eliminar proyecto como admin', async () => {
      logger.info('Test: Eliminar proyecto como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .delete(deleteProjectEndpoint(project.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('eliminado')
      });
      
      logger.success('Proyecto eliminado correctamente');
    });

    test('Debe fallar eliminando proyecto con tareas', async () => {
      logger.info('Test: No eliminar proyecto con tareas');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());
      
      // Crear tarea asociada al proyecto
      await createTestTask(project.id);

      const response = await request(app)
        .delete(deleteProjectEndpoint(project.id))
        .set(adminHeaders)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('tareas')
      });
      
      logger.success('Protección de eliminación con tareas funcionando');
    });
  });

  describe('PUT /api/projects/:id/status', () => {
    const changeStatusEndpoint = (id) => `/api/projects/${id}/status`;

    test('Debe cambiar estado del proyecto', async () => {
      logger.info('Test: Cambiar estado del proyecto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .put(changeStatusEndpoint(project.id))
        .set(adminHeaders)
        .send({ estado: 'en_progreso' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('estado'),
        data: {
          project: {
            estado: 'en_progreso'
          }
        }
      });
      
      logger.success('Estado del proyecto cambiado correctamente');
    });

    test('Debe fallar con estado inválido', async () => {
      logger.info('Test: Estado inválido');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .put(changeStatusEndpoint(project.id))
        .set(adminHeaders)
        .send({ estado: 'estado_inexistente' })
        .expect(400);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de estado funcionando');
    });
  });

  describe('GET /api/projects/:id/responsibles', () => {
    const responsiblesEndpoint = (id) => `/api/projects/${id}/responsibles`;

    test('Debe obtener responsables del proyecto', async () => {
      logger.info('Test: Obtener responsables del proyecto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .get(responsiblesEndpoint(project.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          responsibles: expect.any(Array)
        }
      });
      
      logger.success('Responsables obtenidos correctamente');
    });
  });

  describe('POST /api/projects/:id/responsibles', () => {
    const assignResponsibleEndpoint = (id) => `/api/projects/${id}/responsibles`;

    test('Debe asignar responsable al proyecto', async () => {
      logger.info('Test: Asignar responsable al proyecto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());
      const user = await authHelper.createTestUser();

      const response = await request(app)
        .post(assignResponsibleEndpoint(project.id))
        .set(adminHeaders)
        .send({ userId: user.id })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('asignado')
      });
      
      logger.success('Responsable asignado correctamente');
    });

    test('Debe fallar asignando usuario inexistente', async () => {
      logger.info('Test: Usuario inexistente como responsable');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .post(assignResponsibleEndpoint(project.id))
        .set(adminHeaders)
        .send({ userId: 99999 })
        .expect(404);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de usuario existente funcionando');
    });
  });

  describe('DELETE /api/projects/:id/responsibles/:userId', () => {
    const removeResponsibleEndpoint = (projectId, userId) => 
      `/api/projects/${projectId}/responsibles/${userId}`;

    test('Debe remover responsable del proyecto', async () => {
      logger.info('Test: Remover responsable del proyecto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());
      const user = await authHelper.createTestUser();

      // Primero asignar responsable
      await request(app)
        .post(`/api/projects/${project.id}/responsibles`)
        .set(adminHeaders)
        .send({ userId: user.id });

      // Luego remover
      const response = await request(app)
        .delete(removeResponsibleEndpoint(project.id, user.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('removido')
      });
      
      logger.success('Responsable removido correctamente');
    });
  });

  describe('GET /api/projects/:id/tasks', () => {
    const projectTasksEndpoint = (id) => `/api/projects/${id}/tasks`;

    test('Debe obtener tareas del proyecto', async () => {
      logger.info('Test: Obtener tareas del proyecto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .get(projectTasksEndpoint(project.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          tasks: expect.any(Array)
        }
      });
      
      logger.success('Tareas del proyecto obtenidas correctamente');
    });
  });

  describe('GET /api/projects/:id/stats', () => {
    const projectStatsEndpoint = (id) => `/api/projects/${id}/stats`;

    test('Debe obtener estadísticas del proyecto', async () => {
      logger.info('Test: Obtener estadísticas del proyecto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .get(projectStatsEndpoint(project.id))
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          stats: expect.any(Object)
        }
      });
      
      logger.success('Estadísticas del proyecto obtenidas correctamente');
    });
  });

  describe('GET /api/projects/my', () => {
    const myProjectsEndpoint = '/api/projects/my';

    test('Debe obtener proyectos del usuario', async () => {
      logger.info('Test: Obtener mis proyectos');
      
      const { user, headers } = await authHelper.createUserAndGetToken();
      
      // Crear proyecto donde el usuario es responsable
      await createTestProject(getTestProjectData(), user.id);

      const response = await request(app)
        .get(myProjectsEndpoint)
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          projects: expect.any(Array)
        }
      });
      
      logger.success('Mis proyectos obtenidos correctamente');
    });
  });

  describe('GET /api/projects/search', () => {
    const searchProjectsEndpoint = '/api/projects/search';

    test('Debe buscar proyectos por término', async () => {
      logger.info('Test: Búsqueda de proyectos');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto con título específico
      await createTestProject({
        ...getTestProjectData(),
        titulo: 'Proyecto Búsqueda Específica'
      });

      const response = await request(app)
        .get(`${searchProjectsEndpoint}?q=Búsqueda`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          projects: expect.any(Array)
        }
      });
      
      logger.success('Búsqueda de proyectos funcionando');
    });
  });

  describe('Flujo completo de gestión de proyectos', () => {
    test('Debe completar flujo: crear -> obtener -> actualizar -> cambiar estado -> eliminar', async () => {
      logger.info('Test: Flujo completo de gestión de proyectos');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();

      // 1. Crear proyecto
      logger.debug('Paso 1: Crear proyecto');
      const projectData = getTestProjectData();
      const createResponse = await request(app)
        .post(config.getEndpoint('projects', 'create'))
        .set(adminHeaders)
        .send(projectData)
        .expect(201);

      const projectId = createResponse.body.data.project.id;

      // 2. Obtener proyecto
      logger.debug('Paso 2: Obtener proyecto');
      const getResponse = await request(app)
        .get(config.getFullEndpointUrl('projects', 'detail', { id: projectId }))
        .set(adminHeaders)
        .expect(200);

      expect(getResponse.body.data.project.id).toBe(projectId);

      // 3. Actualizar proyecto
      logger.debug('Paso 3: Actualizar proyecto');
      const updateResponse = await request(app)
        .put(config.getFullEndpointUrl('projects', 'update', { id: projectId }))
        .set(adminHeaders)
        .send({
          titulo: 'Proyecto Flujo Actualizado',
          descripcion: 'Descripción actualizada en flujo'
        })
        .expect(200);

      expect(updateResponse.body.data.project.titulo).toBe('Proyecto Flujo Actualizado');

      // 4. Cambiar estado
      logger.debug('Paso 4: Cambiar estado');
      const statusResponse = await request(app)
        .put(`/api/projects/${projectId}/status`)
        .set(adminHeaders)
        .send({ estado: 'en_progreso' })
        .expect(200);

      expect(statusResponse.body.data.project.estado).toBe('en_progreso');

      // 5. Eliminar proyecto
      logger.debug('Paso 5: Eliminar proyecto');
      const deleteResponse = await request(app)
        .delete(config.getFullEndpointUrl('projects', 'delete', { id: projectId }))
        .set(adminHeaders)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      
      logger.success('Flujo completo de gestión de proyectos exitoso');
    });
  });

  // Funciones auxiliares para tests
  function getTestProjectData() {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días después

    return {
      titulo: 'Proyecto Test',
      descripcion: 'Descripción del proyecto de prueba',
      fecha_inicio: now.toISOString().split('T')[0],
      fecha_fin: futureDate.toISOString().split('T')[0]
    };
  }

  async function createTestProject(projectData, createdBy = null) {
    const query = `
      INSERT INTO proyectos (titulo, descripcion, fecha_inicio, fecha_fin, creado_por, estado)
      VALUES (?, ?, ?, ?, ?, 'planificacion')
    `;
    
    const result = await db.query(query, [
      projectData.titulo,
      projectData.descripcion,
      projectData.fecha_inicio,
      projectData.fecha_fin,
      createdBy || 1
    ]);

    return {
      id: result.insertId,
      ...projectData,
      creado_por: createdBy || 1,
      estado: 'planificacion'
    };
  }

  async function createTestProjects(count) {
    const projects = [];
    for (let i = 0; i < count; i++) {
      const projectData = {
        ...getTestProjectData(),
        titulo: `Proyecto Test ${i + 1}`
      };
      const project = await createTestProject(projectData);
      projects.push(project);
    }
    return projects;
  }

  async function createTestTask(projectId) {
    const query = `
      INSERT INTO tareas (titulo, descripcion, proyecto_id, estado, prioridad)
      VALUES ('Tarea Test', 'Descripción tarea test', ?, 'pendiente', 'media')
    `;
    
    const result = await db.query(query, [projectId]);
    return { id: result.insertId, proyecto_id: projectId };
  }
});