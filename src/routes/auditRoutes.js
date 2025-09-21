/**
 * Rutas para consultar logs de auditoría
 * Siguiendo principios SOLID
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireAnyRole } = require('../middleware/roleMiddleware');
const AuditController = require('../controllers/auditController');

// Instancia del controlador
const auditController = new AuditController();

/**
 * Obtiene todos los logs de auditoría de roles
 * GET /api/audit/roles
 * Query params: page, limit, startDate, endDate, userId, action
 * Acceso: solo admin
 */
router.get('/roles', 
  authenticate,
  requireAnyRole(['admin']),
  auditController.getRoleAuditLogs.bind(auditController)
);

/**
 * Obtiene logs de auditoría por usuario específico
 * GET /api/audit/roles/user/:userId
 * Query params: page, limit, startDate, endDate, action
 * Acceso: solo admin
 */
router.get('/roles/user/:userId', 
  authenticate,
  requireAnyRole(['admin']),
  auditController.getUserRoleAuditLogs.bind(auditController)
);

/**
 * Obtiene logs de auditoría por acción específica
 * GET /api/audit/roles/action/:action
 * Query params: page, limit, startDate, endDate, userId
 * Acceso: solo admin
 */
router.get('/roles/action/:action', 
  authenticate,
  requireAnyRole(['admin']),
  auditController.getRoleAuditLogsByAction.bind(auditController)
);

/**
 * Obtiene resumen de auditoría de roles
 * GET /api/audit/roles/summary
 * Query params: startDate, endDate
 * Acceso: solo admin
 */
router.get('/roles/summary', 
  authenticate,
  requireAnyRole(['admin']),
  auditController.getRoleAuditSummary.bind(auditController)
);

module.exports = router;
