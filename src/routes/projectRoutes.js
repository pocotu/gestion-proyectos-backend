const express = require('express');
const ProjectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/authMiddleware');
const { 
  requirePermission, 
  requireProjectManagement,
  requireOwnershipOrPermission,
  attachPermissions 
} = require('../middleware/permissionMiddleware');
const { requireProjectAccess } = require('../middleware/granularAccessMiddleware');

const router = express.Router();
const projectController = new ProjectController();

/**
 * Rutas de proyectos con permisos granulares
 * Siguiendo principios SOLID y arquitectura RESTful
 */

// Middleware para todas las rutas de proyectos
router.use(authenticate());
router.use(attachPermissions());

/**
 * Rutas principales de proyectos
 */

// Listar proyectos
// GET /api/projects
// Permisos: Admin ve todos, Responsables ven sus proyectos asignados
router.get('/', 
  projectController.getAllProjects.bind(projectController)
);

// Obtener mis proyectos (proyectos donde soy responsable)
// GET /api/projects/my
// Permisos: Usuario autenticado (sus propios proyectos)
router.get('/my', 
  projectController.getMyProjects.bind(projectController)
);

// Obtener mis proyectos (proyectos donde soy responsable) - alias
// GET /api/projects/my-projects
// Permisos: Usuario autenticado (sus propios proyectos)
router.get('/my-projects', 
  projectController.getMyProjects.bind(projectController)
);

// Obtener proyectos donde participo
// GET /api/projects/participating
// Permisos: Usuario autenticado (proyectos donde participa)
router.get('/participating', 
  projectController.getParticipatingProjects.bind(projectController)
);

// Crear nuevo proyecto
// POST /api/projects
// Permisos: Solo responsables de proyecto y admin
router.post('/', 
  requireProjectAccess('create'),
  projectController.createProject.bind(projectController)
);

// Obtener proyecto por ID
// GET /api/projects/:id
// Permisos: Solo responsables del proyecto y admin
router.get('/:id', 
  requireProjectAccess('read'),
  projectController.getProjectById.bind(projectController)
);

// Actualizar proyecto
// PUT /api/projects/:id
// Permisos: Solo responsables del proyecto y admin
router.put('/:id', 
  requireProjectAccess('update'),
  projectController.updateProject.bind(projectController)
);

// Eliminar proyecto
// DELETE /api/projects/:id
// Permisos: Solo responsables del proyecto y admin
router.delete('/:id', 
  requireProjectAccess('delete'),
  projectController.deleteProject.bind(projectController)
);

/**
 * Rutas de gestión de estado de proyectos
 */

// Cambiar estado del proyecto
// PATCH /api/projects/:id/status
// Permisos: Solo responsables del proyecto y admin
router.patch('/:id/status', 
  requireProjectAccess('update'),
  projectController.changeProjectStatus.bind(projectController)
);

// Iniciar proyecto
// PATCH /api/projects/:id/start
// Permisos: Solo responsables del proyecto y admin
router.patch('/:id/start', 
  requireProjectAccess('update'),
  projectController.startProject.bind(projectController)
);

// Completar proyecto
// PATCH /api/projects/:id/complete
// Permisos: Solo responsables del proyecto y admin
router.patch('/:id/complete', 
  requireProjectAccess('update'),
  projectController.completeProject.bind(projectController)
);

// Cancelar proyecto
// PATCH /api/projects/:id/cancel
// Permisos: Solo responsables del proyecto y admin
router.patch('/:id/cancel', 
  requireProjectAccess('update'),
  projectController.cancelProject.bind(projectController)
);

/**
 * Rutas de gestión de responsables
 */

// Asignar responsable al proyecto
// POST /api/projects/:id/responsibles
// Permisos: Solo Admin
router.post('/:id/responsibles', 
  requirePermission('projects', 'update'),
  projectController.assignResponsible.bind(projectController)
);

// Remover responsable del proyecto
// DELETE /api/projects/:id/responsibles/:userId
// Permisos: Solo Admin
router.delete('/:id/responsibles/:userId', 
  requirePermission('projects', 'update'),
  projectController.removeResponsible.bind(projectController)
);

// Obtener responsables del proyecto
// GET /api/projects/:id/responsibles
// Permisos: Admin, Responsable del proyecto, o miembros del equipo
router.get('/:id/responsibles', 
  projectController.getProjectResponsibles.bind(projectController)
);

/**
 * Rutas de tareas del proyecto
 */

// Obtener tareas del proyecto
// GET /api/projects/:id/tasks
// Permisos: Admin, Responsable del proyecto, o miembros del equipo
router.get('/:id/tasks', 
  projectController.getProjectTasks.bind(projectController)
);

// Crear tarea en el proyecto
// POST /api/projects/:id/tasks
// Permisos: Admin o Responsable del proyecto específico
router.post('/:id/tasks', 
  requireProjectManagement,
  projectController.createProjectTask.bind(projectController)
);

/**
 * Rutas de estadísticas y reportes
 */

// Obtener estadísticas del proyecto
// GET /api/projects/:id/stats
// Permisos: Admin, Responsable del proyecto, o miembros del equipo
router.get('/:id/stats', 
  projectController.getProjectStats.bind(projectController)
);

// Obtener estadísticas generales de proyectos
// GET /api/projects/stats/overview
// Permisos: Admin o usuarios con permiso de lectura de proyectos
router.get('/stats/overview', 
  requirePermission('projects', 'read'),
  projectController.getProjectsOverview.bind(projectController)
);

// Obtener progreso del proyecto
// GET /api/projects/:id/progress
// Permisos: Admin, Responsable del proyecto, o miembros del equipo
router.get('/:id/progress', 
  projectController.getProjectProgress.bind(projectController)
);

/**
 * Rutas de búsqueda y filtrado
 */

// Buscar proyectos por término
// GET /api/projects/search?q=termino&page=1&limit=10
// Permisos: Usuario autenticado (solo ve proyectos a los que tiene acceso)
router.get('/search', 
  projectController.searchProjects.bind(projectController)
);

// Obtener proyectos por estado
// GET /api/projects/by-status/:status
// Permisos: Filtrado según acceso del usuario
router.get('/by-status/:status', 
  projectController.getProjectsByStatus.bind(projectController)
);

/**
 * Rutas de archivos del proyecto
 */

// Obtener archivos del proyecto
// GET /api/projects/:id/files
// Permisos: Admin, Responsable del proyecto, o miembros del equipo
router.get('/:id/files', 
  projectController.getProjectFiles.bind(projectController)
);

/**
 * Rutas de timeline y actividad
 */

// Obtener timeline del proyecto
// GET /api/projects/:id/timeline
// Permisos: Admin, Responsable del proyecto, o miembros del equipo
router.get('/:id/timeline', 
  projectController.getProjectTimeline.bind(projectController)
);

// Obtener actividad reciente del proyecto
// GET /api/projects/:id/activity
// Permisos: Admin, Responsable del proyecto, o miembros del equipo
router.get('/:id/activity', 
  projectController.getProjectActivity.bind(projectController)
);

module.exports = router;