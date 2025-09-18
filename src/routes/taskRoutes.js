const express = require('express');
const TaskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');
const { 
  requirePermission, 
  requireTaskManagement,
  requireOwnershipOrPermission,
  attachPermissions 
} = require('../middleware/permissionMiddleware');
const { requireTaskAccess } = require('../middleware/granularAccessMiddleware');

const router = express.Router();
const taskController = new TaskController();

/**
 * Rutas de tareas con permisos granulares
 * Siguiendo principios SOLID y arquitectura RESTful
 */

// Middleware para todas las rutas de tareas
router.use(authenticate());
router.use(attachPermissions());

/**
 * Rutas principales de tareas
 */

// Listar tareas
// GET /api/tasks
// Permisos: Admin ve todas, Responsables ven según su acceso
router.get('/', 
  taskController.getAllTasks.bind(taskController)
);

// Crear nueva tarea
// POST /api/tasks
// Permisos: Solo responsables del proyecto y admin
router.post('/', 
  requireTaskAccess('create'),
  taskController.createTask.bind(taskController)
);

// Obtener tarea por ID
// GET /api/tasks/:id
// Permisos: Solo asignados, responsables del proyecto y admin
router.get('/:id', 
  requireTaskAccess('read'),
  taskController.getTaskById.bind(taskController)
);

// Actualizar tarea
// PUT /api/tasks/:id
// Permisos: Solo asignados, responsables del proyecto y admin
router.put('/:id', 
  requireTaskAccess('update'),
  taskController.updateTask.bind(taskController)
);

// Eliminar tarea
// DELETE /api/tasks/:id
// Permisos: Solo responsables del proyecto y admin
router.delete('/:id', 
  requireTaskAccess('delete'),
  taskController.deleteTask.bind(taskController)
);

/**
 * Rutas de gestión de estado de tareas
 */

// Cambiar estado de la tarea
// PATCH /api/tasks/:id/status
// Permisos: Solo asignados, responsables del proyecto y admin
router.patch('/:id/status', 
  requireTaskAccess('update'),
  taskController.changeTaskStatus.bind(taskController)
);

// Marcar tarea como en progreso
// PATCH /api/tasks/:id/start
// Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
router.patch('/:id/start', 
  requireTaskManagement,
  (req, res, next) => {
    req.body = { estado: 'en_progreso' };
    next();
  },
  taskController.changeTaskStatus.bind(taskController)
);

// Marcar tarea como completada
// PATCH /api/tasks/:id/complete
// Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
router.patch('/:id/complete', 
  requireTaskManagement,
  (req, res, next) => {
    req.body = { estado: 'completada' };
    next();
  },
  taskController.changeTaskStatus.bind(taskController)
);

// Marcar tarea como cancelada
// PATCH /api/tasks/:id/cancel
// Permisos: Admin o Responsable del proyecto
router.patch('/:id/cancel', 
  requirePermission('tasks', 'update'),
  (req, res, next) => {
    req.body = { estado: 'cancelada' };
    next();
  },
  taskController.changeTaskStatus.bind(taskController)
);

/**
 * Rutas de asignación de tareas
 */

// Asignar tarea a usuario
// PATCH /api/tasks/:id/assign
// Permisos: Admin o Responsable del proyecto
router.patch('/:id/assign', 
  requirePermission('tasks', 'update'),
  taskController.assignTask.bind(taskController)
);

// Desasignar tarea
// PATCH /api/tasks/:id/unassign
// Permisos: Admin o Responsable del proyecto
router.patch('/:id/unassign', 
  requirePermission('tasks', 'update'),
  (req, res, next) => {
    req.body = { usuario_asignado_id: null };
    next();
  },
  taskController.assignTask.bind(taskController)
);

/**
 * Rutas de archivos de tareas
 */

// Obtener archivos de la tarea
// GET /api/tasks/:id/files
// Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
router.get('/:id/files', 
  taskController.getTaskFiles.bind(taskController)
);

/**
 * Rutas específicas para usuarios
 */

// Obtener mis tareas asignadas
// GET /api/tasks/my-tasks
// Permisos: Usuario autenticado (sus propias tareas)
router.get('/my-tasks', 
  taskController.getMyTasks.bind(taskController)
);

// Obtener tareas donde soy responsable (a través de proyectos)
// GET /api/tasks/managed-tasks
// Permisos: Responsables de proyecto
router.get('/managed-tasks', 
  requirePermission('projects', 'read'),
  (req, res, next) => {
    // Modificar query para obtener tareas de proyectos gestionados
    req.query.managed = 'true';
    next();
  },
  taskController.getAllTasks.bind(taskController)
);

/**
 * Rutas de búsqueda y filtrado
 */

// Buscar tareas
// GET /api/tasks/search
// Permisos: Filtrado según acceso del usuario
router.get('/search', 
  (req, res, next) => {
    // Agregar filtros de búsqueda al query
    const { q, estado, prioridad, proyecto_id } = req.query;
    req.searchQuery = q;
    next();
  },
  taskController.getAllTasks.bind(taskController)
);

// Obtener tareas por estado
// GET /api/tasks/by-status/:status
// Permisos: Filtrado según acceso del usuario
router.get('/by-status/:status', 
  (req, res, next) => {
    req.query.estado = req.params.status;
    next();
  },
  taskController.getAllTasks.bind(taskController)
);

// Obtener tareas por prioridad
// GET /api/tasks/by-priority/:priority
// Permisos: Filtrado según acceso del usuario
router.get('/by-priority/:priority', 
  (req, res, next) => {
    req.query.prioridad = req.params.priority;
    next();
  },
  taskController.getAllTasks.bind(taskController)
);

// Obtener tareas por proyecto
// GET /api/tasks/by-project/:projectId
// Permisos: Admin, Responsable del proyecto, o miembros del equipo
router.get('/by-project/:projectId', 
  (req, res, next) => {
    req.query.proyecto_id = req.params.projectId;
    next();
  },
  taskController.getAllTasks.bind(taskController)
);

/**
 * Rutas de estadísticas y reportes
 */

// Obtener estadísticas de tareas
// GET /api/tasks/stats/overview
// Permisos: Admin o filtrado según acceso del usuario
router.get('/stats/overview', 
  taskController.getTaskStats.bind(taskController)
);

// Obtener estadísticas de mis tareas
// GET /api/tasks/stats/my-stats
// Permisos: Usuario autenticado (sus propias estadísticas)
router.get('/stats/my-stats', 
  (req, res, next) => {
    req.query.user_specific = 'true';
    next();
  },
  taskController.getTaskStats.bind(taskController)
);

// Obtener tareas vencidas
// GET /api/tasks/overdue
// Permisos: Filtrado según acceso del usuario
router.get('/overdue', 
  (req, res, next) => {
    req.query.overdue = 'true';
    next();
  },
  taskController.getAllTasks.bind(taskController)
);

// Obtener tareas próximas a vencer
// GET /api/tasks/due-soon
// Permisos: Filtrado según acceso del usuario
router.get('/due-soon', 
  (req, res, next) => {
    req.query.due_soon = 'true';
    next();
  },
  taskController.getAllTasks.bind(taskController)
);

/**
 * Rutas de comentarios y actividad
 */

// Obtener comentarios de la tarea
// GET /api/tasks/:id/comments
// Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
router.get('/:id/comments', 
  (req, res) => {
    // Placeholder para futura implementación de comentarios
    res.json({
      success: true,
      data: { comments: [] },
      message: 'Funcionalidad de comentarios en desarrollo'
    });
  }
);

// Obtener historial de cambios de la tarea
// GET /api/tasks/:id/history
// Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
router.get('/:id/history', 
  (req, res) => {
    // Placeholder para futura implementación de historial
    res.json({
      success: true,
      data: { history: [] },
      message: 'Funcionalidad de historial en desarrollo'
    });
  }
);

module.exports = router;