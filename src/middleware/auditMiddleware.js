const LogActivityModel = require('../models/logActivityModel');

/**
 * AuditMiddleware - Middleware para auditoría de cambios de roles y permisos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja auditoría de cambios de roles
 * - Open/Closed: Abierto para extensión (nuevos tipos de auditoría)
 * - Liskov Substitution: Puede ser sustituido por otros middlewares de auditoría
 * - Interface Segregation: Métodos específicos para diferentes tipos de auditoría
 * - Dependency Inversion: Depende de abstracciones (LogActivityModel)
 */
class AuditMiddleware {
  /**
   * Middleware para auditar asignación de roles
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  static auditRoleAssignment() {
    return async (req, res, next) => {
      try {
        // Guardar el método original de res.json para interceptar la respuesta
        const originalJson = res.json;
        
        res.json = function(data) {
          // Solo auditar si la operación fue exitosa
          if (data && data.success) {
            // Ejecutar auditoría de forma asíncrona para no bloquear la respuesta
            setImmediate(async () => {
              try {
                await AuditMiddleware._logRoleAssignment(req, data);
              } catch (error) {
                console.error('Error en auditoría de asignación de rol:', error);
              }
            });
          }
          
          // Llamar al método original
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        console.error('Error en middleware de auditoría:', error);
        next(); // Continuar sin bloquear la operación
      }
    };
  }

  /**
   * Middleware para auditar remoción de roles
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  static auditRoleRemoval() {
    return async (req, res, next) => {
      try {
        // Guardar el método original de res.json para interceptar la respuesta
        const originalJson = res.json;
        
        res.json = function(data) {
          // Solo auditar si la operación fue exitosa
          if (data && data.success) {
            // Ejecutar auditoría de forma asíncrona para no bloquear la respuesta
            setImmediate(async () => {
              try {
                await AuditMiddleware._logRoleRemoval(req, data);
              } catch (error) {
                console.error('Error en auditoría de remoción de rol:', error);
              }
            });
          }
          
          // Llamar al método original
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        console.error('Error en middleware de auditoría:', error);
        next(); // Continuar sin bloquear la operación
      }
    };
  }

  /**
   * Middleware para auditar sincronización de roles
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  static auditRoleSync() {
    return async (req, res, next) => {
      try {
        // Guardar el método original de res.json para interceptar la respuesta
        const originalJson = res.json;
        
        res.json = function(data) {
          // Solo auditar si la operación fue exitosa
          if (data && data.success) {
            // Ejecutar auditoría de forma asíncrona para no bloquear la respuesta
            setImmediate(async () => {
              try {
                await AuditMiddleware._logRoleSync(req, data);
              } catch (error) {
                console.error('Error en auditoría de sincronización de roles:', error);
              }
            });
          }
          
          // Llamar al método original
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        console.error('Error en middleware de auditoría:', error);
        next(); // Continuar sin bloquear la operación
      }
    };
  }

  /**
   * Middleware para auditar cambios de permisos de usuario (admin flag)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  static auditPermissionChange() {
    return async (req, res, next) => {
      try {
        // Capturar datos anteriores si es una actualización
        if (req.params.id && req.body.hasOwnProperty('es_administrador')) {
          try {
            const UserRepository = require('../repositories/UserRepository');
            const userRepository = new UserRepository();
            const previousData = await userRepository.findById(req.params.id);
            req.previousUserData = previousData;
          } catch (error) {
            console.error('Error al obtener datos anteriores del usuario:', error);
          }
        }

        // Guardar el método original de res.json para interceptar la respuesta
        const originalJson = res.json;
        
        res.json = function(data) {
          // Solo auditar si la operación fue exitosa y hay cambio de permisos
          if (data && data.success && req.body.hasOwnProperty('es_administrador')) {
            // Ejecutar auditoría de forma asíncrona para no bloquear la respuesta
            setImmediate(async () => {
              try {
                await AuditMiddleware._logPermissionChange(req, data);
              } catch (error) {
                console.error('Error en auditoría de cambio de permisos:', error);
              }
            });
          }
          
          // Llamar al método original
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        console.error('Error en middleware de auditoría:', error);
        next(); // Continuar sin bloquear la operación
      }
    };
  }

  /**
   * Registra la asignación de un rol en los logs de auditoría
   * @private
   */
  static async _logRoleAssignment(req, responseData) {
    const { userId, roleIdentifier } = req.body;
    const assignedBy = req.user?.id;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');

    // Determinar si es asignación simple o múltiple
    const isMultiple = Array.isArray(roleIdentifier) || Array.isArray(req.body.roleIdentifiers);
    const roles = isMultiple ? (req.body.roleIdentifiers || roleIdentifier) : [roleIdentifier];

    await LogActivityModel.log({
      usuario_id: assignedBy,
      accion: 'asignar',
      entidad_tipo: 'rol',
      entidad_id: userId,
      descripcion: isMultiple 
        ? `Asignación múltiple de roles: ${roles.join(', ')} al usuario ID ${userId}`
        : `Asignación de rol: ${roleIdentifier} al usuario ID ${userId}`,
      datos_anteriores: null,
      datos_nuevos: {
        targetUserId: userId,
        roles: roles,
        assignedBy: assignedBy,
        timestamp: new Date().toISOString(),
        operation: isMultiple ? 'assign_multiple_roles' : 'assign_role'
      },
      ip_address,
      user_agent
    });
  }

  /**
   * Registra la remoción de un rol en los logs de auditoría
   * @private
   */
  static async _logRoleRemoval(req, responseData) {
    const { userId, roleIdentifier } = req.body;
    const removedBy = req.user?.id;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');

    // Determinar si es remoción simple o múltiple
    const isMultiple = Array.isArray(roleIdentifier) || Array.isArray(req.body.roleIdentifiers);
    const roles = isMultiple ? (req.body.roleIdentifiers || roleIdentifier) : [roleIdentifier];

    await LogActivityModel.log({
      usuario_id: removedBy,
      accion: 'eliminar',
      entidad_tipo: 'rol',
      entidad_id: userId,
      descripcion: isMultiple 
        ? `Remoción múltiple de roles: ${roles.join(', ')} del usuario ID ${userId}`
        : `Remoción de rol: ${roleIdentifier} del usuario ID ${userId}`,
      datos_anteriores: {
        targetUserId: userId,
        roles: roles
      },
      datos_nuevos: null,
      ip_address,
      user_agent
    });
  }

  /**
   * Registra la sincronización de roles en los logs de auditoría
   * @private
   */
  static async _logRoleSync(req, responseData) {
    const { userId, roleIdentifiers } = req.body;
    const syncedBy = req.user?.id;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');

    await LogActivityModel.log({
      usuario_id: syncedBy,
      accion: 'actualizar',
      entidad_tipo: 'rol',
      entidad_id: userId,
      descripcion: `Sincronización de roles del usuario ID ${userId}. Nuevos roles: ${roleIdentifiers.join(', ')}`,
      datos_anteriores: responseData.data?.previousRoles || null,
      datos_nuevos: {
        targetUserId: userId,
        newRoles: roleIdentifiers,
        syncedBy: syncedBy,
        timestamp: new Date().toISOString(),
        operation: 'sync_roles'
      },
      ip_address,
      user_agent
    });
  }

  /**
   * Registra cambios en permisos de administrador
   * @private
   */
  static async _logPermissionChange(req, responseData) {
    const userId = req.params.id;
    const changedBy = req.user?.id;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');
    const newAdminStatus = req.body.es_administrador;
    const previousAdminStatus = req.previousUserData?.es_administrador;

    // Solo registrar si realmente hubo un cambio
    if (previousAdminStatus !== newAdminStatus) {
      await LogActivityModel.log({
        usuario_id: changedBy,
        accion: 'actualizar',
        entidad_tipo: 'usuario',
        entidad_id: parseInt(userId),
        descripcion: `Cambio de permisos de administrador del usuario ID ${userId}: ${previousAdminStatus ? 'Admin' : 'Usuario'} → ${newAdminStatus ? 'Admin' : 'Usuario'}`,
        datos_anteriores: {
          es_administrador: previousAdminStatus,
          userId: parseInt(userId)
        },
        datos_nuevos: {
          es_administrador: newAdminStatus,
          userId: parseInt(userId),
          changedBy: changedBy,
          timestamp: new Date().toISOString(),
          operation: 'change_admin_permission'
        },
        ip_address,
        user_agent
      });
    }
  }
}

module.exports = AuditMiddleware;