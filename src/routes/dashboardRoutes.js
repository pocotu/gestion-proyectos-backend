/**
 * Rutas del Dashboard - Estadísticas y resúmenes
 * Siguiendo principios SOLID
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireAnyRole } = require('../middleware/roleMiddleware');
const DashboardController = require('../controllers/dashboardController');

// Instancia del controlador
const dashboardController = new DashboardController();

/**
 * Obtener resumen completo del dashboard
 * GET /api/dashboard/summary
 * Permisos: Usuario autenticado
 */
router.get('/summary', 
  authenticate,
  dashboardController.getDashboardSummary.bind(dashboardController)
);

/**
 * Estadísticas de proyectos
 */

// Obtener estadísticas de proyectos
// GET /api/dashboard/projects/stats
// Permisos: Usuario autenticado
router.get('/projects/stats', 
  authenticate,
  dashboardController.getProjectStats.bind(dashboardController)
);

// Obtener proyectos recientes
// GET /api/dashboard/projects/recent
// Permisos: Usuario autenticado
router.get('/projects/recent', 
  authenticate,
  dashboardController.getRecentProjects.bind(dashboardController)
);

/**
 * Estadísticas de tareas
 */

// Obtener estadísticas de tareas
// GET /api/dashboard/tasks/stats
// Permisos: Usuario autenticado
router.get('/tasks/stats', 
  authenticate,
  dashboardController.getTaskStats.bind(dashboardController)
);

// Obtener tareas recientes
// GET /api/dashboard/tasks/recent
// Permisos: Usuario autenticado
router.get('/tasks/recent', 
  authenticate,
  dashboardController.getRecentTasks.bind(dashboardController)
);

// Obtener tareas pendientes
// GET /api/dashboard/tasks/pending
// Permisos: Usuario autenticado
router.get('/tasks/pending', 
  authenticate,
  dashboardController.getPendingTasks.bind(dashboardController)
);

/**
 * Estadísticas administrativas
 */

// Obtener estadísticas administrativas completas
// GET /api/dashboard/admin/stats
// Permisos: Solo administradores
router.get('/admin/stats', 
  authenticate,
  requireAnyRole(['admin']),
  dashboardController.getAdminStats.bind(dashboardController)
);

// Obtener actividad reciente del sistema
// GET /api/dashboard/admin/activity
// Permisos: Solo administradores
router.get('/admin/activity', 
  authenticate,
  requireAnyRole(['admin']),
  dashboardController.getRecentActivity.bind(dashboardController)
);

module.exports = router;
