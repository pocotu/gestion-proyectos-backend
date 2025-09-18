const { 
  ROLES, 
  PERMISSIONS, 
  userHasPermission, 
  canAccessResource,
  getUserPermissions 
} = require('../utils/permissions');
const UserRoleRepository = require('../repositories/UserRoleRepository');

/**
 * PermissionMiddleware - Middleware de permisos granulares por rol
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja autorización basada en permisos específicos
 * - Open/Closed: Abierto para extensión (nuevos tipos de permisos)
 * - Liskov Substitution: Puede ser sustituido por otros middlewares de permisos
 * - Interface Segregation: Métodos específicos para diferentes tipos de validación
 * - Dependency Inversion: Depende de abstracciones (UserRoleRepository, permissions)
 */
class PermissionMiddleware {
  constructor() {
    this.userRoleRepository = new UserRoleRepository();
  }

  /**
   * Middleware para verificar que el usuario tenga un permiso específico
   * @param {string} permission - Permiso requerido (ej: 'users:create')
   * @returns {Function} Middleware function
   */
  requirePermission(permission) {
    return async (req, res, next) => {
      try {
        console.log('requirePermission - Iniciando verificación para:', permission);
        
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        console.log('requirePermission - Usuario autenticado:', req.user.id, 'es_administrador:', req.user.es_administrador);

        // Admin siempre tiene todos los permisos
        if (req.user.es_administrador) {
          console.log('requirePermission - Usuario es admin, acceso permitido');
          next();
          return;
        }

        // Obtener roles del usuario usando método estático
        console.log('requirePermission - Obteniendo roles del usuario');
        const userRoles = await UserRoleRepository.getUserRolesStatic(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);
        
        console.log('requirePermission - Roles del usuario:', userRoleNames);

        // Verificar si el usuario tiene el permiso
        const hasPermission = userHasPermission(userRoleNames, permission);
        console.log('requirePermission - ¿Tiene permiso?', hasPermission);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Acceso denegado. Se requiere el permiso: ${permission}`,
            userRoles: userRoleNames,
            requiredPermission: permission
          });
        }

        // Adjuntar información de roles y permisos al request
        req.userRoles = userRoleNames;
        req.userPermissions = getUserPermissions(userRoleNames);
        req.hasPermission = (perm) => userHasPermission(userRoleNames, perm);

        console.log('requirePermission - Acceso permitido');
        next();

      } catch (error) {
        console.error('requirePermission - Error completo:', error);
        console.error('requirePermission - Stack:', error.stack);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware para verificar acceso a recursos específicos con contexto
   * @param {string} resource - Tipo de recurso (projects, tasks, files)
   * @param {string} action - Acción a realizar (create, read, update, delete)
   * @param {Function} contextProvider - Función que proporciona contexto adicional
   * @returns {Function} Middleware function
   */
  requireResourceAccess(resource, action, contextProvider = null) {
    return async (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Admin siempre tiene acceso
        if (req.user.es_administrador) {
          next();
          return;
        }

        // Obtener roles del usuario
        const userRoles = await this.userRoleRepository.getUserRoles(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);

        // Obtener contexto adicional si se proporciona
        let context = {};
        if (contextProvider && typeof contextProvider === 'function') {
          context = await contextProvider(req, userRoleNames);
        }

        // Verificar acceso al recurso
        if (!canAccessResource(userRoleNames, resource, action, context)) {
          return res.status(403).json({
            success: false,
            message: `Acceso denegado al recurso ${resource} para la acción ${action}`,
            userRoles: userRoleNames,
            resource,
            action,
            context
          });
        }

        // Adjuntar información al request
        req.userRoles = userRoleNames;
        req.userPermissions = getUserPermissions(userRoleNames);
        req.resourceContext = context;

        next();

      } catch (error) {
        console.error('Error verificando acceso a recurso:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware específico para gestión de usuarios
   * Admin: Acceso total, gestión de usuarios y roles
   */
  requireUserManagement() {
    return this.requirePermission(PERMISSIONS.USERS.MANAGE_ROLES);
  }

  /**
   * Middleware específico para gestión de proyectos
   * Admin: Acceso total
   * Responsable Proyecto: Gestión de proyectos asignados
   */
  requireProjectManagement(action = 'read') {
    return this.requireResourceAccess('projects', action, async (req, userRoles) => {
      // Contexto para verificar si el usuario es responsable del proyecto
      const projectId = req.params.projectId || req.params.id;
      
      if (!projectId) {
        return { isAssignedToProject: true }; // Para creación de proyectos
      }

      // Aquí se verificaría en la base de datos si el usuario es responsable del proyecto
      // Por ahora, asumimos que los responsables de proyecto pueden gestionar proyectos asignados
      return {
        isAssignedToProject: userRoles.includes(ROLES.RESPONSABLE_PROYECTO),
        projectId: parseInt(projectId)
      };
    });
  }

  /**
   * Middleware específico para gestión de tareas
   * Admin: Acceso total
   * Responsable Proyecto: Gestión de tareas de sus proyectos
   * Responsable Tarea: Gestión de tareas asignadas
   */
  requireTaskManagement(action = 'read') {
    return this.requireResourceAccess('tasks', action, async (req, userRoles) => {
      const taskId = req.params.taskId || req.params.id;
      const userId = req.user.id;

      // Contexto para verificar acceso a la tarea
      return {
        isAssignedToTask: userRoles.includes(ROLES.RESPONSABLE_TAREA),
        isProjectResponsible: userRoles.includes(ROLES.RESPONSABLE_PROYECTO),
        taskId: taskId ? parseInt(taskId) : null,
        userId
      };
    });
  }

  /**
   * Middleware específico para gestión de archivos
   * Admin: Acceso total
   * Responsable Proyecto: Archivos de sus proyectos
   * Responsable Tarea: Upload de archivos en tareas asignadas
   */
  requireFileManagement(action = 'upload') {
    return this.requireResourceAccess('files', action, async (req, userRoles) => {
      const userId = req.user.id;
      const fileId = req.params.fileId || req.params.id;

      return {
        isOwner: true, // Se verificaría en la base de datos
        hasProjectAccess: userRoles.includes(ROLES.RESPONSABLE_PROYECTO),
        hasTaskAccess: userRoles.includes(ROLES.RESPONSABLE_TAREA),
        fileId: fileId ? parseInt(fileId) : null,
        userId
      };
    });
  }

  /**
   * Middleware para verificar propiedad de recurso o permisos administrativos
   * @param {string} resourceType - Tipo de recurso (user, project, task, file)
   * @param {string} ownerField - Campo que contiene el ID del propietario
   * @returns {Function} Middleware function
   */
  requireOwnershipOrPermission(resourceType, ownerField = 'userId') {
    return async (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Admin siempre tiene acceso
        if (req.user.es_administrador) {
          next();
          return;
        }

        const resourceOwnerId = parseInt(req.params[ownerField]);
        const currentUserId = req.user.id;

        // Verificar propiedad del recurso
        if (currentUserId === resourceOwnerId) {
          next();
          return;
        }

        // Obtener roles del usuario para verificar permisos adicionales
        const userRoles = await this.userRoleRepository.getUserRoles(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);

        // Verificar permisos basados en el tipo de recurso
        let hasPermission = false;
        switch (resourceType) {
          case 'user':
            hasPermission = userHasPermission(userRoleNames, PERMISSIONS.USERS.UPDATE);
            break;
          case 'project':
            hasPermission = userHasPermission(userRoleNames, PERMISSIONS.PROJECTS.UPDATE);
            break;
          case 'task':
            hasPermission = userHasPermission(userRoleNames, PERMISSIONS.TASKS.UPDATE);
            break;
          case 'file':
            hasPermission = userHasPermission(userRoleNames, PERMISSIONS.FILES.DELETE);
            break;
        }

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Acceso denegado. Solo puedes gestionar tus propios ${resourceType}s o necesitas permisos adicionales`,
            userRoles: userRoleNames
          });
        }

        next();

      } catch (error) {
        console.error('Error verificando propiedad:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware para adjuntar información de permisos al request
   * Útil para controladores que necesitan verificar permisos dinámicamente
   */
  attachPermissions() {
    return async (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Si es admin, adjuntar todos los permisos
        if (req.user.es_administrador) {
          req.userRoles = [ROLES.ADMIN];
          req.userPermissions = Object.values(PERMISSIONS).flatMap(p => Object.values(p));
          req.hasPermission = () => true;
          req.isAdmin = true;
          next();
          return;
        }

        // Obtener roles del usuario
        const userRoles = await this.userRoleRepository.getUserRoles(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);

        // Adjuntar información al request
        req.userRoles = userRoleNames;
        req.userPermissions = getUserPermissions(userRoleNames);
        req.hasPermission = (permission) => userHasPermission(userRoleNames, permission);
        req.isAdmin = false;

        next();

      } catch (error) {
        console.error('Error adjuntando permisos:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }
}

// Crear instancia singleton
const permissionMiddleware = new PermissionMiddleware();

// Exportar métodos como funciones independientes para facilitar el uso
module.exports = {
  requirePermission: (permission) => permissionMiddleware.requirePermission(permission),
  requireResourceAccess: (resource, action, contextProvider) => 
    permissionMiddleware.requireResourceAccess(resource, action, contextProvider),
  requireUserManagement: () => permissionMiddleware.requireUserManagement(),
  requireProjectManagement: (action) => permissionMiddleware.requireProjectManagement(action),
  requireTaskManagement: (action) => permissionMiddleware.requireTaskManagement(action),
  requireFileManagement: (action) => permissionMiddleware.requireFileManagement(action),
  requireOwnershipOrPermission: (resourceType, ownerField) => 
    permissionMiddleware.requireOwnershipOrPermission(resourceType, ownerField),
  attachPermissions: () => permissionMiddleware.attachPermissions(),
  
  // Exportar la clase para casos avanzados
  PermissionMiddleware
};