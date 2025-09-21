const express = require('express');
const RoleController = require('../controllers/roleController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const { requireAnyRole, requireAdminOrRoles, attachRoles } = require('../middleware/roleMiddleware');
const AuditMiddleware = require('../middleware/auditMiddleware');

const router = express.Router();
const roleController = new RoleController();

/**
 * Rutas para gestión de roles
 * Siguiendo principios SOLID y aplicando middleware de autorización apropiado
 */

// ============================================================================
// RUTAS PÚBLICAS (solo requieren autenticación)
// ============================================================================

/**
 * Obtiene los roles del usuario autenticado actual
 * GET /api/roles/my-roles
 */
router.get('/my-roles', 
  authenticate, 
  roleController.getMyRoles.bind(roleController)
);

/**
 * Verifica si el usuario autenticado actual tiene un rol específico
 * GET /api/roles/my-roles/has-role?roleIdentifier=admin
 */
router.get('/my-roles/has-role', 
  authenticate, 
  roleController.checkMyRole.bind(roleController)
);

// ============================================================================
// RUTAS PARA CONSULTA DE ROLES (requieren roles específicos)
// ============================================================================

/**
 * Obtiene todos los roles disponibles
 * GET /api/roles
 * Acceso: admin, responsable_proyecto
 */
router.get('/', 
  authenticate,
  requireAnyRole(['admin', 'responsable_proyecto']),
  roleController.getAllRoles.bind(roleController)
);

/**
 * Obtiene todos los roles de un usuario específico
 * GET /api/roles/user/:userId
 * Acceso: admin, responsable_proyecto (solo pueden ver roles de usuarios bajo su responsabilidad)
 */
router.get('/user/:userId', 
  authenticate,
  requireAnyRole(['admin', 'responsable_proyecto']),
  roleController.getUserRoles.bind(roleController)
);

/**
 * Verifica si un usuario tiene un rol específico
 * GET /api/roles/user/:userId/has-role?roleIdentifier=admin
 * Acceso: admin, responsable_proyecto
 */
router.get('/user/:userId/has-role', 
  authenticate,
  requireAnyRole(['admin', 'responsable_proyecto']),
  roleController.userHasRole.bind(roleController)
);

/**
 * Verifica si un usuario tiene alguno de los roles especificados
 * POST /api/roles/user/:userId/has-any-role
 * Body: { roleIdentifiers: ["admin", "responsable_proyecto"] }
 * Acceso: admin, responsable_proyecto
 */
router.post('/user/:userId/has-any-role', 
  authenticate,
  requireAnyRole(['admin', 'responsable_proyecto']),
  roleController.userHasAnyRole.bind(roleController)
);

/**
 * Obtiene todos los usuarios que tienen un rol específico
 * GET /api/roles/:roleIdentifier/users
 * Acceso: admin, responsable_proyecto
 */
router.get('/:roleIdentifier/users', 
  authenticate,
  requireAnyRole(['admin', 'responsable_proyecto']),
  roleController.getUsersByRole.bind(roleController)
);

/**
 * Obtiene estadísticas del sistema de roles
 * GET /api/roles/statistics
 * Acceso: solo admin
 */
router.get('/statistics', 
  authenticate,
  requireAnyRole(['admin']),
  roleController.getRoleStatistics.bind(roleController)
);

// ============================================================================
// RUTAS PARA GESTIÓN DE ROLES (requieren permisos administrativos)
// ============================================================================

/**
 * Crea un nuevo rol
 * POST /api/roles
 * Body: { nombre: "nuevo_rol" }
 * Acceso: solo admin
 */
router.post('/', 
  authenticate,
  requireAnyRole(['admin']),
  roleController.createRole.bind(roleController)
);

/**
 * Asigna un rol a un usuario
 * POST /api/roles/assign
 * Body: { userId: 1, roleIdentifier: "admin" }
 * Acceso: admin o responsable_proyecto (con limitaciones)
 */
router.post('/assign', 
  authenticate,
  requireAdminOrRoles(['responsable_proyecto']),
  AuditMiddleware.auditRoleAssignment(),
  roleController.assignRole.bind(roleController)
);

/**
 * Remueve un rol de un usuario
 * DELETE /api/roles/remove
 * Body: { userId: 1, roleIdentifier: "admin" }
 * Acceso: admin o responsable_proyecto (con limitaciones)
 */
router.delete('/remove', 
  authenticate,
  requireAdminOrRoles(['responsable_proyecto']),
  AuditMiddleware.auditRoleRemoval(),
  roleController.removeRole.bind(roleController)
);

/**
 * Asigna múltiples roles a un usuario
 * POST /api/roles/assign-multiple
 * Body: { userId: 1, roleIdentifiers: ["admin", "responsable_proyecto"] }
 * Acceso: solo admin
 */
router.post('/assign-multiple', 
  authenticate,
  requireAnyRole(['admin']),
  AuditMiddleware.auditRoleAssignment(),
  roleController.assignMultipleRoles.bind(roleController)
);

/**
 * Remueve múltiples roles de un usuario
 * DELETE /api/roles/remove-multiple
 * Body: { userId: 1, roleIdentifiers: ["admin", "responsable_proyecto"] }
 * Acceso: solo admin
 */
router.delete('/remove-multiple', 
  authenticate,
  requireAnyRole(['admin']),
  AuditMiddleware.auditRoleRemoval(),
  roleController.removeMultipleRoles.bind(roleController)
);

/**
 * Sincroniza los roles de un usuario (reemplaza todos los roles actuales)
 * PUT /api/roles/sync
 * Body: { userId: 1, roleIdentifiers: ["admin", "responsable_proyecto"] }
 * Acceso: solo admin
 */
router.put('/sync', 
  authenticate,
  requireAnyRole(['admin']),
  AuditMiddleware.auditRoleSync(),
  roleController.syncUserRoles.bind(roleController)
);

// ============================================================================
// MIDDLEWARE DE ERROR HANDLING
// ============================================================================

/**
 * Middleware para manejar errores de rutas no encontradas
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    availableRoutes: [
      'GET /api/roles/my-roles',
      'GET /api/roles/my-roles/has-role',
      'GET /api/roles',
      'GET /api/roles/user/:userId',
      'GET /api/roles/user/:userId/has-role',
      'POST /api/roles/user/:userId/has-any-role',
      'GET /api/roles/:roleIdentifier/users',
      'GET /api/roles/statistics',
      'POST /api/roles',
      'POST /api/roles/assign',
      'DELETE /api/roles/remove',
      'POST /api/roles/assign-multiple',
      'DELETE /api/roles/remove-multiple',
      'PUT /api/roles/sync'
    ]
  });
});

/**
 * Middleware para manejar errores generales
 */
router.use((error, req, res, next) => {
  console.error('Error en rutas de roles:', error);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en rutas de roles',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;
