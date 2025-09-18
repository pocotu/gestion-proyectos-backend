const UserRoleRepository = require('../repositories/UserRoleRepository');
const RoleRepository = require('../repositories/RoleRepository');

/**
 * RoleMiddleware - Middleware de autorización por roles múltiples
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja autorización basada en roles
 * - Open/Closed: Abierto para extensión (nuevos tipos de verificación)
 * - Liskov Substitution: Puede ser sustituido por otros middlewares de autorización
 * - Interface Segregation: Métodos específicos para diferentes tipos de autorización
 * - Dependency Inversion: Depende de abstracciones (UserRoleRepository, RoleRepository)
 */
class RoleMiddleware {
  constructor() {
    // No instanciar repositorios para evitar conflictos
    // this.userRoleRepository = new UserRoleRepository();
    // this.roleRepository = new RoleRepository();
  }

  /**
   * Middleware para verificar que el usuario tenga al menos uno de los roles especificados
   * @param {string|Array<string>} roles - Rol o array de roles permitidos
   * @returns {Function} Middleware function
   */
  requireAnyRole(roles) {
    return async (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Normalizar roles a array
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (allowedRoles.length === 0) {
          return res.status(500).json({
            success: false,
            message: 'No se especificaron roles para la autorización'
          });
        }

        // Obtener roles del usuario usando método estático
        const userRoles = await UserRoleRepository.getUserRolesStatic(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);

        // Verificar si el usuario tiene al menos uno de los roles requeridos
        const hasRequiredRole = allowedRoles.some(role => userRoleNames.includes(role));

        if (!hasRequiredRole) {
          return res.status(403).json({
            success: false,
            message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
            userRoles: userRoleNames,
            requiredRoles: allowedRoles
          });
        }

        // Agregar información de roles al request para uso posterior
        req.userRoles = userRoleNames;
        req.hasRole = (roleName) => userRoleNames.includes(roleName);

        next();

      } catch (error) {
        console.error('Error en verificación de roles:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor al verificar roles'
        });
      }
    };
  }

  /**
   * Middleware para verificar que el usuario tenga TODOS los roles especificados
   * @param {string|Array<string>} roles - Rol o array de roles requeridos
   * @returns {Function} Middleware function
   */
  requireAllRoles(roles) {
    return async (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Normalizar roles a array
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        
        if (requiredRoles.length === 0) {
          return res.status(500).json({
            success: false,
            message: 'No se especificaron roles para la autorización'
          });
        }

        // Obtener roles del usuario usando método estático
        const userRoles = await UserRoleRepository.getUserRolesStatic(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);

        // Verificar si el usuario tiene TODOS los roles requeridos
        const hasAllRoles = requiredRoles.every(role => userRoleNames.includes(role));

        if (!hasAllRoles) {
          const missingRoles = requiredRoles.filter(role => !userRoleNames.includes(role));
          return res.status(403).json({
            success: false,
            message: `Acceso denegado. Se requieren todos los siguientes roles: ${requiredRoles.join(', ')}`,
            userRoles: userRoleNames,
            requiredRoles: requiredRoles,
            missingRoles: missingRoles
          });
        }

        // Agregar información de roles al request para uso posterior
        req.userRoles = userRoleNames;
        req.hasRole = (roleName) => userRoleNames.includes(roleName);

        next();

      } catch (error) {
        console.error('Error en verificación de roles:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor al verificar roles'
        });
      }
    };
  }

  /**
   * Middleware para verificar que el usuario NO tenga ninguno de los roles especificados
   * @param {string|Array<string>} roles - Rol o array de roles prohibidos
   * @returns {Function} Middleware function
   */
  requireNotRoles(roles) {
    return async (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Normalizar roles a array
        const prohibitedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (prohibitedRoles.length === 0) {
          // Si no hay roles prohibidos, permitir acceso
          next();
          return;
        }

        // Obtener roles del usuario usando método estático
        const userRoles = await UserRoleRepository.getUserRolesStatic(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);

        // Verificar si el usuario tiene alguno de los roles prohibidos
        const hasProhibitedRole = prohibitedRoles.some(role => userRoleNames.includes(role));

        if (hasProhibitedRole) {
          const conflictingRoles = prohibitedRoles.filter(role => userRoleNames.includes(role));
          return res.status(403).json({
            success: false,
            message: `Acceso denegado. Los siguientes roles no están permitidos: ${conflictingRoles.join(', ')}`,
            userRoles: userRoleNames,
            prohibitedRoles: prohibitedRoles,
            conflictingRoles: conflictingRoles
          });
        }

        // Agregar información de roles al request para uso posterior
        req.userRoles = userRoleNames;
        req.hasRole = (roleName) => userRoleNames.includes(roleName);

        next();

      } catch (error) {
        console.error('Error en verificación de roles:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor al verificar roles'
        });
      }
    };
  }

  /**
   * Middleware para verificar roles con lógica personalizada
   * @param {Function} roleChecker - Función que recibe (userRoles, req) y retorna boolean
   * @param {string} errorMessage - Mensaje de error personalizado
   * @returns {Function} Middleware function
   */
  requireCustomRole(roleChecker, errorMessage = 'Acceso denegado por roles insuficientes') {
    return async (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Verificar que roleChecker sea una función
        if (typeof roleChecker !== 'function') {
          return res.status(500).json({
            success: false,
            message: 'Configuración de autorización inválida'
          });
        }

        // Obtener roles del usuario usando método estático
        const userRoles = await UserRoleRepository.getUserRolesStatic(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);

        // Ejecutar lógica personalizada
        const hasAccess = await roleChecker(userRoleNames, req);

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: errorMessage,
            userRoles: userRoleNames
          });
        }

        // Agregar información de roles al request para uso posterior
        req.userRoles = userRoleNames;
        req.hasRole = (roleName) => userRoleNames.includes(roleName);

        next();

      } catch (error) {
        console.error('Error en verificación de roles personalizada:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor al verificar roles'
        });
      }
    };
  }

  /**
   * Middleware para verificar que el usuario sea administrador O tenga uno de los roles especificados
   * @param {string|Array<string>} roles - Rol o array de roles alternativos al admin
   * @returns {Function} Middleware function
   */
  requireAdminOrRoles(roles) {
    return async (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Si es administrador, permitir acceso inmediatamente
        if (req.user.es_administrador) {
          // Obtener roles para información adicional usando método estático
          const userRoles = await UserRoleRepository.getUserRolesStatic(req.user.id);
          const userRoleNames = userRoles.map(role => role.rol_nombre);
          
          req.userRoles = userRoleNames;
          req.hasRole = (roleName) => userRoleNames.includes(roleName);
          req.isAdmin = true;
          
          next();
          return;
        }

        // Si no es admin, verificar roles alternativos
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        const userRoles = await UserRoleRepository.getUserRolesStatic(req.user.id);
        const userRoleNames = userRoles.map(role => role.rol_nombre);

        const hasRequiredRole = allowedRoles.some(role => userRoleNames.includes(role));

        if (!hasRequiredRole) {
          return res.status(403).json({
            success: false,
            message: `Acceso denegado. Se requiere ser administrador o tener uno de los siguientes roles: ${allowedRoles.join(', ')}`,
            userRoles: userRoleNames,
            requiredRoles: allowedRoles,
            isAdmin: false
          });
        }

        // Agregar información de roles al request para uso posterior
        req.userRoles = userRoleNames;
        req.hasRole = (roleName) => userRoleNames.includes(roleName);
        req.isAdmin = false;

        next();

      } catch (error) {
        console.error('Error en verificación de admin o roles:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor al verificar roles'
        });
      }
    };
  }

  /**
   * Middleware opcional que agrega información de roles al request sin bloquear
   * Útil para endpoints que necesitan información de roles pero no requieren autorización específica
   * @returns {Function} Middleware function
   */
  attachRoles() {
    return async (req, res, next) => {
      try {
        // Solo procesar si el usuario está autenticado
        if (req.user && req.user.id) {
          const userRoles = await UserRoleRepository.getUserRolesStatic(req.user.id);
          const userRoleNames = userRoles.map(role => role.rol_nombre);
          
          req.userRoles = userRoleNames;
          req.hasRole = (roleName) => userRoleNames.includes(roleName);
          req.isAdmin = req.user.es_administrador || false;
        } else {
          req.userRoles = [];
          req.hasRole = () => false;
          req.isAdmin = false;
        }

        next();

      } catch (error) {
        console.error('Error al adjuntar roles:', error);
        // En caso de error, continuar sin roles
        req.userRoles = [];
        req.hasRole = () => false;
        req.isAdmin = false;
        next();
      }
    };
  }
}

// Crear instancia única del middleware
const roleMiddleware = new RoleMiddleware();

module.exports = {
  requireAnyRole: roleMiddleware.requireAnyRole.bind(roleMiddleware),
  requireAllRoles: roleMiddleware.requireAllRoles.bind(roleMiddleware),
  requireNotRoles: roleMiddleware.requireNotRoles.bind(roleMiddleware),
  requireCustomRole: roleMiddleware.requireCustomRole.bind(roleMiddleware),
  requireAdminOrRoles: roleMiddleware.requireAdminOrRoles.bind(roleMiddleware),
  attachRoles: roleMiddleware.attachRoles.bind(roleMiddleware)
};