const express = require('express');
const UserController = require('../controllers/userController');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { 
  requirePermission, 
  requireUserManagement,
  requireOwnershipOrPermission,
  attachPermissions 
} = require('../middleware/permissionMiddleware');

const router = express.Router();
const userController = new UserController();
const authController = new AuthController();

/**
 * Rutas de usuarios con permisos granulares
 * Siguiendo principios SOLID y arquitectura RESTful
 */

// Middleware para todas las rutas de usuarios
router.use(authenticate);
router.use(attachPermissions());

/**
 * Rutas públicas para usuarios autenticados
 */

// Obtener perfil del usuario actual
// GET /api/users/profile
router.get('/profile', userController.getProfile.bind(userController));

// Actualizar perfil del usuario actual
// PUT /api/users/profile
router.put('/profile', userController.updateProfile.bind(userController));

// Cambiar contraseña del usuario actual
// PUT /api/users/change-password
router.put('/change-password', authController.changePassword.bind(authController));

// Obtener configuraciones del usuario actual
// GET /api/users/settings
router.get('/settings', userController.getUserSettings.bind(userController));

// Actualizar configuraciones del usuario actual
// PUT /api/users/settings
router.put('/settings', userController.updateUserSettings.bind(userController));

// Restablecer configuraciones a valores por defecto
// POST /api/users/settings/reset
router.post('/settings/reset', userController.resetUserSettings.bind(userController));

/**
 * Rutas estáticas (DEBEN IR ANTES QUE LAS DINÁMICAS)
 */

// Buscar usuarios
// GET /api/users/search
// Permisos: Admin o usuarios con permiso de lectura de usuarios
router.get('/search', 
  requirePermission('users', 'read'),
  userController.searchUsers.bind(userController)
);

// Obtener estadísticas de usuarios
// GET /api/users/stats/overview
// Permisos: Admin o usuarios con permiso de lectura de usuarios
router.get('/stats/overview', 
  requirePermission('users', 'read'),
  userController.getUserStats.bind(userController)
);

/**
 * Rutas que requieren permisos de gestión de usuarios
 */

// Listar todos los usuarios
// GET /api/users
// Permisos: Admin o usuarios con permiso de lectura de usuarios
router.get('/', 
  requirePermission('users:read'),
  userController.getAllUsers.bind(userController)
);

// Crear nuevo usuario
// POST /api/users
// Permisos: Solo Admin
router.post('/', 
  requireUserManagement(),
  authController.register.bind(authController)
);

// Obtener usuario por ID
// GET /api/users/:id
// Permisos: Admin, o el propio usuario
router.get('/:id', 
  requireOwnershipOrPermission('users', 'read'),
  userController.getUserById.bind(userController)
);

// Actualizar usuario por ID
// PUT /api/users/:id
// Permisos: Admin, o el propio usuario (con limitaciones)
router.put('/:id', 
  requireOwnershipOrPermission('users', 'update'),
  userController.updateUser.bind(userController)
);

// Eliminar usuario
// DELETE /api/users/:id
// Permisos: Solo Admin
router.delete('/:id', 
  requireUserManagement(),
  userController.deleteUser.bind(userController)
);

// Activar/Desactivar usuario
// PATCH /api/users/:id/status
// Permisos: Solo Admin
router.patch('/:id/status', 
  requireUserManagement(),
  userController.changeUserStatus.bind(userController)
);

/**
 * Rutas de gestión de roles
 */

// Asignar rol a usuario
// POST /api/users/:id/roles
// Permisos: Solo Admin
router.post('/:id/roles', 
  requireUserManagement(),
  userController.assignRole.bind(userController)
);

// Remover rol de usuario
// DELETE /api/users/:id/roles/:roleId
// Permisos: Solo Admin
router.delete('/:id/roles/:roleId', 
  requireUserManagement(),
  userController.removeRole.bind(userController)
);

// Obtener roles de usuario
// GET /api/users/:id/roles
// Permisos: Admin, o el propio usuario
router.get('/:id/roles', 
  requireOwnershipOrPermission('users', 'read'),
  userController.getUserRoles.bind(userController)
);

/**
 * Rutas específicas para responsables de proyecto
 */

// Obtener usuarios disponibles para asignar a proyectos
// GET /api/users/available-for-projects
// Permisos: Admin o Responsable de Proyecto
router.get('/available-for-projects', 
  requirePermission('projects', 'update'),
  userController.getAvailableUsersForProjects.bind(userController)
);

// Obtener usuarios disponibles para asignar a tareas
// GET /api/users/available-for-tasks
// Permisos: Admin, Responsable de Proyecto, o Responsable de Tarea
router.get('/available-for-tasks', 
  (req, res, next) => {
    // Verificar si tiene permisos de proyecto o tarea
    const hasProjectPermission = req.userPermissions?.projects?.includes('update');
    const hasTaskPermission = req.userPermissions?.tasks?.includes('update');
    
    if (req.user.es_administrador || hasProjectPermission || hasTaskPermission) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para acceder a esta información'
    });
  },
  userController.getAvailableUsersForTasks.bind(userController)
);

module.exports = router;
