/**
 * LogsRoutes - Rutas para sistema de logs de actividad
 * 
 * NOTA: Este módulo de rutas es un ALIAS/WRAPPER de /api/activity
 * para mantener compatibilidad con el diseño original del sistema.
 * 
 * Para funcionalidad completa de logs, ver también:
 * - /api/activity/logs (logs con filtros avanzados)
 * - /api/activity/export (exportación CSV/JSON)
 * 
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo define rutas de logs
 * - Open/Closed: Abierto para extensión (nuevas rutas)
 * - Interface Segregation: Rutas específicas para cada funcionalidad
 * - Dependency Inversion: Depende de LogsController (abstracción)
 */

const express = require('express');
const router = express.Router();
const LogsController = require('../controllers/logsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAnyRole } = require('../middleware/roleMiddleware');

// Instancia del controlador
const logsController = new LogsController();

/**
 * @route   GET /api/logs
 * @desc    Obtener todos los logs de actividad con filtros opcionales
 * @query   page, limit, startDate, endDate, entityType, action
 * @access  Private/Admin
 */
router.get('/', 
  authenticate,
  requireAnyRole(['admin']),
  async (req, res) => {
    await logsController.getAllLogs(req, res);
  }
);

/**
 * @route   GET /api/logs/summary
 * @desc    Obtener resumen de actividad del sistema
 * @access  Private/Admin
 */
router.get('/summary', 
  authenticate,
  requireAnyRole(['admin']),
  async (req, res) => {
    await logsController.getActivitySummary(req, res);
  }
);

/**
 * @route   GET /api/logs/search
 * @desc    Buscar logs por descripción
 * @query   q (término de búsqueda), page, limit
 * @access  Private/Admin
 */
router.get('/search', 
  authenticate,
  requireAnyRole(['admin']),
  async (req, res) => {
    await logsController.searchLogs(req, res);
  }
);

/**
 * @route   GET /api/logs/user/:id
 * @desc    Obtener logs de un usuario específico
 * @params  id - ID del usuario
 * @query   page, limit, days
 * @access  Private (Admin o el propio usuario)
 */
router.get('/user/:id', 
  authenticate,
  async (req, res) => {
    await logsController.getUserLogs(req, res);
  }
);

/**
 * @route   GET /api/logs/project/:id
 * @desc    Obtener logs de un proyecto específico
 * @params  id - ID del proyecto
 * @query   page, limit
 * @access  Private (Admin o responsable del proyecto)
 */
router.get('/project/:id', 
  authenticate,
  async (req, res) => {
    await logsController.getProjectLogs(req, res);
  }
);

/**
 * @route   GET /api/logs/task/:id
 * @desc    Obtener logs de una tarea específica
 * @params  id - ID de la tarea
 * @query   page, limit
 * @access  Private (Admin, responsable del proyecto o asignado a la tarea)
 */
router.get('/task/:id', 
  authenticate,
  async (req, res) => {
    await logsController.getTaskLogs(req, res);
  }
);

// Middleware de manejo de errores específico para rutas de logs
router.use((error, req, res, next) => {
  console.error('Error en rutas de logs:', error);

  // Errores de autenticación
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;
