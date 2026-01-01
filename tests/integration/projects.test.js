/**
 * Tests de Integración - Proyectos MVP
 * Valida endpoints básicos de proyectos para MVP
 * Simplificado sin funcionalidades complejas
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const TestLogger = require('../utils/TestLogger');
const AuthHelper = require('../utils/AuthHelper');

describe('Projects Integration Tests - MVP', () => {
  let db;
  let logger;
  let authHelper;
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[PROJECTS-TESTS]' });
    authHelper = new AuthHelper();
    
    logger.testStart('Configurando entorno de tests de proyectos MVP');
    
    // Inicializar helper de base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear usuarios usando AuthHelper
    const adminAuth = await authHelper.createAdminAndGetToken();
    const userAuth = await authHelper.createUserWithRoleAndGetToken('responsable_proyecto');
    
    adminToken = adminAuth.token;
    userToken = userAuth.token;
    adminUser = adminAuth.user;
    regularUser = userAuth.user;
    
    logger.success('Entorno de tests configurado exitosamente');
  }, 30000);

  // Cleanup después de cada test
  afterEach(async () => {
    // Solo limpiar proyectos y tareas, NO usuarios para mantener la autenticación
    if (db && db.connection) {
      try {
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await db.connection.execute('DELETE FROM tareas WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%test%" OR titulo LIKE "%prueba%")');
        await db.connection.execute('DELETE FROM proyectos WHERE titulo LIKE "%test%" OR titulo LIKE "%prueba%"');
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (error) {
        console.error('Error limpiando datos de test:', error.message);
      }
    }
  });

  // Cleanup global
  afterAll(async () => {
    logger.testEnd('Finalizando tests de proyectos');
    
    // Solo limpiar proyectos y tareas, NO usuarios para evitar problemas con tokens
    if (db && db.connection) {
      try {
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await db.connection.execute('DELETE FROM tareas WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%test%" OR titulo LIKE "%prueba%")');
        await db.connection.execute('DELETE FROM proyectos WHERE titulo LIKE "%test%" OR titulo LIKE "%prueba%"');
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (error) {
        console.error('Error limpiando datos finales:', error.message);
      }
    }
    
    await db.close();
  });

  // Helper para crear proyecto de prueba usando la API
  const createTestProject = async (projectData, token) => {
    const data = projectData || {
      titulo: 'Proyecto Test',
      descripcion: 'Descripción del proyecto test',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-12-31',
      estado: 'activo'
    };
    
    // Si no se proporciona token, usar el token de admin global
    const authToken = token || adminToken;
    
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send(data);
    // El controlador devuelve response.body.project
    return response.body.project;
  };

  describe('POST /api/projects', () => {
    test('Debe crear un proyecto exitosamente', async () => {
      logger.info('Test: Crear proyecto');
      
      const projectData = {
        titulo: 'Proyecto de Prueba',
        descripcion: 'Descripción del proyecto de prueba',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      };
      
      console.log('Admin token:', adminToken);
      console.log('Admin user:', adminUser);
      
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData);
        
      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      
      expect(response.status).toBe(201);

      expect(response.body).toMatchObject({
        success: true,
        project: {
          id: expect.any(Number),
          titulo: projectData.titulo,
          descripcion: projectData.descripcion,
          fecha_inicio: expect.any(String),
          fecha_fin: expect.any(String),
          estado: 'planificacion',
          creado_por: adminUser.id
        }
      });
      
      logger.success('Proyecto creado correctamente');
    });

    test('Debe fallar al crear proyecto sin autorización', async () => {
      const projectData = {
        titulo: 'Proyecto Sin Auth',
        descripcion: 'Descripción',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      };
      
      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
      
      logger.success('Validación de autorización funcionando');
    });
  });

  describe('GET /api/projects', () => {
    test('Debe listar proyectos como administrador', async () => {
      logger.info('Test: Listar proyectos como admin');
      
      // Crear algunos proyectos de prueba
      await createTestProject({
        titulo: 'Proyecto 1',
        descripcion: 'Descripción 1',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-06-30'
      }, adminToken);

      await createTestProject({
        titulo: 'Proyecto 2',
        descripcion: 'Descripción 2',
        fecha_inicio: '2024-07-01',
        fecha_fin: '2024-12-31'
      }, adminToken);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        projects: expect.any(Array)
      });

      expect(response.body.projects.length).toBeGreaterThanOrEqual(2);
      
      logger.success('Lista de proyectos obtenida correctamente');
    });

    test('Debe listar proyectos accesibles para usuario regular', async () => {
      logger.info('Test: Listar proyectos como usuario regular');
      
      // Crear proyecto donde el usuario regular es creador
      await createTestProject({
        titulo: 'Mi Proyecto',
        descripcion: 'Proyecto del usuario regular',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      }, userToken);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        projects: expect.any(Array)
      });
      
      logger.success('Filtrado de proyectos por permisos funcionando');
    });
  });

  describe('GET /api/projects/:id', () => {
    test('Debe obtener detalles de un proyecto específico', async () => {
      logger.info('Test: Obtener detalles de proyecto');
      
      const project = await createTestProject({
        titulo: 'Proyecto Detalle',
        descripcion: 'Descripción detallada',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      }, adminToken);

      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        project: {
          id: project.id,
          titulo: 'Proyecto Detalle',
          descripcion: 'Descripción detallada',
          estado: 'planificacion'
        }
      });
      
      logger.success('Detalles de proyecto obtenidos correctamente');
    });

    test('Debe fallar al obtener proyecto inexistente', async () => {
      const response = await request(app)
        .get('/api/projects/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('no encontrado');
      
      logger.success('Validación de proyecto inexistente funcionando');
    });
  });

  describe('PUT /api/projects/:id', () => {
    test('Debe actualizar un proyecto exitosamente', async () => {
      logger.info('Test: Actualizar proyecto');
      
      const project = await createTestProject({
        titulo: 'Proyecto Original',
        descripcion: 'Descripción original',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      }, adminToken);

      const updateData = {
        titulo: `Proyecto Actualizado ${Date.now()}`,
        descripcion: 'Descripción actualizada',
        estado: 'en_progreso'
      };

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        project: {
          id: project.id,
          titulo: updateData.titulo,
          descripcion: updateData.descripcion,
          estado: updateData.estado
        }
      });
      
      logger.success('Proyecto actualizado correctamente');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    test('Debe eliminar un proyecto exitosamente', async () => {
      logger.info('Test: Eliminar proyecto');
      
      const project = await createTestProject({
        titulo: 'Proyecto a Eliminar',
        descripcion: 'Este proyecto será eliminado',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      }, adminToken);

      const response = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('eliminado')
      });
      
      // Verificar que el proyecto ya no existe
      await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
      
      logger.success('Proyecto eliminado correctamente');
    });
  });

  describe('Funcionalidades adicionales', () => {
    test('Debe soportar paginación', async () => {
      logger.info('Test: Paginación de proyectos');
      
      const { user: adminUser, headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      // Crear varios proyectos usando el ID del admin
      await createTestProjects(5, adminUser.id);

      const response = await request(app)
        .get('/api/projects?page=1&limit=3')
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
      
      // Crear proyecto con estado específico
      await createTestProject({
        ...getTestProjectData(),
        estado: 'en_progreso'
      });

      const response = await request(app)
        .get('/api/projects?estado=en_progreso')
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
        .get('/api/projects?search=Buscable')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      logger.success('Búsqueda por texto funcionando');
    });
  });

  describe('POST /api/projects', () => {
    test('Debe crear proyecto exitosamente como admin', async () => {
      logger.info('Test: Crear proyecto como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      
      const projectData = getTestProjectData();

      const response = await request(app)
        .post('/api/projects')
        .set(adminHeaders)
        .send(projectData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('creado'),
        project: expect.objectContaining({
          id: expect.any(Number)
        })
      });
      
      logger.success('Proyecto creado correctamente');
    });

    test('Debe crear proyecto como responsable de proyecto', async () => {
      logger.info('Test: Crear proyecto como responsable');
      
      const userWithRole = await authHelper.createUserWithRoleAndGetToken('responsable_proyecto');
      
      const projectData = getTestProjectData();

      const response = await request(app)
        .post('/api/projects')
        .set(userWithRole.headers)
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
        .post('/api/projects')
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
        .post('/api/projects')
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
        .post('/api/projects')
        .set(headers)
        .send(projectData)
        .expect(403);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de permisos funcionando');
    });
  });

  describe('GET /api/projects/:id', () => {
    test('Debe obtener proyecto específico', async () => {
      logger.info('Test: Obtener proyecto específico');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        project: expect.objectContaining({
          id: project.id,
          titulo: project.titulo,
          descripcion: project.descripcion
        })
      });
      
      logger.success('Proyecto específico obtenido correctamente');
    });

    test('Debe fallar con proyecto inexistente', async () => {
      logger.info('Test: Proyecto inexistente');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();

      const response = await request(app)
        .get('/api/projects/99999')
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
        .get(`/api/projects/${project.id}`)
        .set(headers)
        .expect(403);

      expect(response.body.success).toBe(false);
      
      logger.success('Protección de acceso a proyectos funcionando');
    });
  });

  describe('PUT /api/projects/:id', () => {
    test('Debe actualizar proyecto como admin', async () => {
      logger.info('Test: Actualizar proyecto como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const updateData = {
        titulo: `Proyecto Actualizado ${Date.now()}`,
        descripcion: 'Descripción actualizada'
      };

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set(adminHeaders)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('actualizado'),
        project: expect.objectContaining({
          titulo: updateData.titulo,
          descripcion: updateData.descripcion
        })
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
        .put(`/api/projects/${project.id}`)
        .set(adminHeaders)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      
      logger.success('Validación de fechas en actualización funcionando');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    test('Debe eliminar proyecto como admin', async () => {
      logger.info('Test: Eliminar proyecto como admin');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .delete(`/api/projects/${project.id}`)
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
        .delete(`/api/projects/${project.id}`)
        .set(adminHeaders)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
      
      logger.success('Protección de eliminación con tareas funcionando');
    });
  });

  describe('PATCH /api/projects/:id/status', () => {
    const changeStatusEndpoint = (id) => `/api/projects/${id}/status`;

    test('Debe cambiar estado del proyecto', async () => {
      logger.info('Test: Cambiar estado del proyecto');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .patch(changeStatusEndpoint(project.id))
        .set(adminHeaders)
        .send({ estado: 'en_progreso' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Estado del proyecto actualizado exitosamente",
        project: expect.objectContaining({
          estado: 'en_progreso'
        })
      });
      
      logger.success('Estado del proyecto cambiado correctamente');
    });

    test('Debe fallar con estado inválido', async () => {
      logger.info('Test: Estado inválido');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject(getTestProjectData());

      const response = await request(app)
        .patch(changeStatusEndpoint(project.id))
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
        .expect(201);

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
      
      // Usar admin para evitar problemas de permisos
      const { user, headers } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto donde el admin es responsable
      await createTestProject(getTestProjectData(), user.id);

      const response = await request(app)
        .get(myProjectsEndpoint)
        .set(headers);

      console.log('🔍 [TEST] Response status:', response.status);
      console.log('🔍 [TEST] Response body:', JSON.stringify(response.body, null, 2));
      console.log('🔍 [TEST] Response headers:', response.headers);

      if (response.status !== 200) {
        console.log('🔍 [TEST] Error response - Status:', response.status);
        console.log('🔍 [TEST] Error response - Body:', response.body);
        console.log('🔍 [TEST] Error response - Text:', response.text);
      }

      expect(response.status).toBe(200);

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
      
      const { headers: adminHeaders, token: adminToken } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto con título específico
      await createTestProject({
        ...getTestProjectData(),
        titulo: 'Proyecto Busqueda Especifica'
      }, adminToken);

      const response = await request(app)
        .get(`${searchProjectsEndpoint}?q=Busqueda`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          projects: expect.any(Array)
        }
      });
      
      logger.success('Búsqueda de proyectos funcionando');
    }, 45000);
  });

  describe('GET /api/projects/:id/details', () => {
    test('Debe obtener detalles completos del proyecto con usuario autorizado', async () => {
      logger.info('Test: Obtener detalles completos del proyecto');
      
      const { headers: adminHeaders, user: adminUser, token: adminToken } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto de prueba
      const project = await createTestProject({
        ...getTestProjectData(),
        titulo: 'Proyecto Detalles Test'
      }, adminToken);

      const response = await request(app)
        .get(`/api/projects/${project.id}/details`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          project: expect.objectContaining({
            id: project.id,
            titulo: 'Proyecto Detalles Test'
          }),
          responsibles: expect.any(Array),
          tasks: expect.any(Array),
          files: expect.any(Array),
          activityLogs: expect.any(Array),
          statistics: expect.any(Object)
        }
      });
      
      logger.success('Detalles del proyecto obtenidos correctamente');
    });

    test('Debe fallar con ID de proyecto inválido', async () => {
      logger.info('Test: Obtener detalles con ID inválido');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();

      const response = await request(app)
        .get('/api/projects/invalid/details')
        .set(adminHeaders);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
      
      logger.success('Validación de ID inválido funcionando');
    });

    test('Debe fallar con proyecto no existente', async () => {
      logger.info('Test: Obtener detalles de proyecto no existente');
      
      const { headers: adminHeaders } = await authHelper.createAdminAndGetToken();

      const response = await request(app)
        .get('/api/projects/999999/details')
        .set(adminHeaders);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
      
      logger.success('Manejo de proyecto no existente funcionando');
    });

    test('Debe fallar con usuario no autorizado', async () => {
      logger.info('Test: Obtener detalles sin autorización');
      
      // Crear proyecto con admin
      const { token: adminToken } = await authHelper.createAdminAndGetToken();
      const project = await createTestProject({
        ...getTestProjectData(),
        titulo: 'Proyecto No Autorizado Test'
      }, adminToken);

      // Intentar acceder con usuario regular no responsable
      const { headers: userHeaders } = await authHelper.createUserAndGetToken({
        email: `unauthorized-${Date.now()}@example.com`
      });

      const response = await request(app)
        .get(`/api/projects/${project.id}/details`)
        .set(userHeaders);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
      
      logger.success('Control de autorización funcionando');
    });

    test('Debe verificar estructura de respuesta completa', async () => {
      logger.info('Test: Verificar estructura de respuesta');
      
      const { headers: adminHeaders, token: adminToken } = await authHelper.createAdminAndGetToken();
      
      // Crear proyecto
      const project = await createTestProject({
        ...getTestProjectData(),
        titulo: 'Proyecto Estructura Test'
      }, adminToken);

      const response = await request(app)
        .get(`/api/projects/${project.id}/details`)
        .set(adminHeaders)
        .expect(200);

      // Verificar estructura completa
      expect(response.body.data).toHaveProperty('project');
      expect(response.body.data).toHaveProperty('responsibles');
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('activityLogs');
      expect(response.body.data).toHaveProperty('statistics');

      // Verificar estructura de project
      expect(response.body.data.project).toHaveProperty('id');
      expect(response.body.data.project).toHaveProperty('titulo');
      expect(response.body.data.project).toHaveProperty('descripcion');
      expect(response.body.data.project).toHaveProperty('estado');
      expect(response.body.data.project).toHaveProperty('creator_name');

      // Verificar estructura de statistics
      expect(response.body.data.statistics).toHaveProperty('totalTasks');
      expect(response.body.data.statistics).toHaveProperty('tasksByStatus');
      expect(response.body.data.statistics).toHaveProperty('tasksByPriority');
      expect(response.body.data.statistics).toHaveProperty('totalFiles');
      expect(response.body.data.statistics).toHaveProperty('totalResponsibles');
      
      logger.success('Estructura de respuesta verificada correctamente');
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
        .post('/api/projects')
        .set(adminHeaders)
        .send(projectData)
        .expect(201);

      const projectId = createResponse.body.project.id;

      // 2. Obtener proyecto
      logger.debug('Paso 2: Obtener proyecto');
      const getResponse = await request(app)
        .get(`/api/projects/${projectId}`)
        .set(adminHeaders)
        .expect(200);

      expect(getResponse.body.project.id).toBe(projectId);

      // 3. Actualizar proyecto
      logger.debug('Paso 3: Actualizar proyecto');
      const updateResponse = await request(app)
        .put(`/api/projects/${projectId}`)
        .set(adminHeaders)
        .send({
          titulo: 'Proyecto Flujo Actualizado',
          descripcion: 'Descripción actualizada en flujo'
        })
        .expect(200);

      expect(updateResponse.body.project.titulo).toBe('Proyecto Flujo Actualizado');

      // 4. Cambiar estado
      logger.debug('Paso 4: Cambiar estado');
      const statusResponse = await request(app)
        .patch(`/api/projects/${projectId}/status`)
        .set(adminHeaders)
        .send({ estado: 'en_progreso' })
        .expect(200);

      expect(statusResponse.body.project.estado).toBe('en_progreso');

      // 5. Eliminar proyecto
      logger.debug('Paso 5: Eliminar proyecto');
      const deleteResponse = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set(adminHeaders)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      
      logger.success('Flujo completo de gestión de proyectos exitoso');
    }, 60000);
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

  async function createTestProjects(count, createdBy = null) {
    // Si no se proporciona createdBy, crear un usuario de prueba para todos los proyectos
    let userId = createdBy;
    if (!userId) {
      const { user } = await authHelper.createUserAndGetToken({
        email: `test-projects-creator-${Date.now()}@example.com`
      });
      userId = user.id;
    }

    const projects = [];
    for (let i = 0; i < count; i++) {
      const projectData = {
        ...getTestProjectData(),
        titulo: `Proyecto Test ${i + 1}`
      };
      const project = await createTestProject(projectData, userId);
      projects.push(project);
    }
    return projects;
  }

  async function createTestTask(projectId, createdBy = null) {
    // Si no se proporciona createdBy, crear un usuario de prueba
    let validCreatedBy = createdBy;
    if (!validCreatedBy) {
      const userQuery = `
        INSERT INTO usuarios (nombre, email, contraseña, es_administrador)
        VALUES ('Usuario Test Task', 'test-task@example.com', 'hash123', false)
      `;
      const userResult = await db.query(userQuery);
      validCreatedBy = userResult.insertId;
    }

    const query = `
      INSERT INTO tareas (titulo, descripcion, proyecto_id, estado, prioridad, creado_por)
      VALUES ('Tarea Test', 'Descripción tarea test', ?, 'pendiente', 'media', ?)
    `;
    
    const result = await db.query(query, [projectId, validCreatedBy]);
    return { id: result.insertId, proyecto_id: projectId };
  }
});