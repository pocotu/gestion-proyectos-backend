/**
 * Middleware para logging automático de actividades
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja el logging de actividades
 * - Open/Closed: Abierto para extensión (nuevos tipos de logging)
 * - Liskov Substitution: Puede ser sustituido por otros middlewares de logging
 * - Interface Segregation: Métodos específicos para diferentes tipos de logging
 * - Dependency Inversion: Depende de abstracciones (LogActivityRepository)
 */

const LogActivityRepository = require('../repositories/LogActivityRepository');

class ActivityLoggerMiddleware {
  constructor() {
    this.logRepository = new LogActivityRepository();
  }

  /**
   * Middleware para logging automático de operaciones CRUD
   */
  logCRUDOperation(entityType) {
    return async (req, res, next) => {
      // Guardar el método original de res.json para interceptar la respuesta
      const originalJson = res.json;
      
      res.json = async function(data) {
        try {
          const userId = req.user?.id;
          const method = req.method;
          const entityId = req.params.id || data?.data?.id;
          const ip_address = req.ip || req.connection.remoteAddress;
          const user_agent = req.get('User-Agent');

          if (userId) {
            let accion;
            let descripcion;
            let datos_nuevos = null;
            let datos_anteriores = null;

            switch (method) {
              case 'POST':
                accion = 'crear';
                descripcion = `Se creó ${entityType} con ID ${entityId}`;
                datos_nuevos = data?.data;
                break;
              case 'PUT':
              case 'PATCH':
                accion = 'actualizar';
                descripcion = `Se actualizó ${entityType} con ID ${entityId}`;
                datos_anteriores = req.originalData; // Debe ser establecido por el controlador
                datos_nuevos = data?.data;
                break;
              case 'DELETE':
                accion = 'eliminar';
                descripcion = `Se eliminó ${entityType} con ID ${entityId}`;
                datos_anteriores = req.originalData; // Debe ser establecido por el controlador
                break;
              default:
                // No loggear operaciones GET
                return originalJson.call(this, data);
            }

            await this.logRepository.logActivity({
              usuario_id: userId,
              accion,
              entidad_tipo: entityType,
              entidad_id: entityId,
              descripcion,
              datos_anteriores,
              datos_nuevos,
              ip_address,
              user_agent
            });
          }
        } catch (error) {
          console.error('Error logging activity:', error);
          // No fallar la operación principal por errores de logging
        }

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Middleware para logging de autenticación
   */
  logAuth() {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(data) {
        try {
          const ip_address = req.ip || req.connection.remoteAddress;
          const user_agent = req.get('User-Agent');
          const path = req.path;

          if (data?.success && data?.user) {
            const userId = data.user.id;
            let accion;
            let descripcion;

            if (path.includes('login')) {
              accion = 'login';
              descripcion = 'Usuario inició sesión';
            } else if (path.includes('register')) {
              accion = 'crear';
              descripcion = 'Usuario se registró en el sistema';
            } else if (path.includes('logout')) {
              accion = 'logout';
              descripcion = 'Usuario cerró sesión';
            }

            if (accion) {
              await this.logRepository.logActivity({
                usuario_id: userId,
                accion,
                entidad_tipo: 'usuario',
                entidad_id: userId,
                descripcion,
                ip_address,
                user_agent
              });
            }
          }
        } catch (error) {
          console.error('Error logging auth activity:', error);
        }

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Middleware para logging de cambios de estado
   */
  logStatusChange(entityType) {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(data) {
        try {
          const userId = req.user?.id;
          const entityId = req.params.id;
          const ip_address = req.ip || req.connection.remoteAddress;
          const user_agent = req.get('User-Agent');
          const newStatus = req.body.estado || data?.data?.estado;
          const oldStatus = req.originalData?.estado;

          if (userId && newStatus && oldStatus !== newStatus) {
            await this.logRepository.logActivity({
              usuario_id: userId,
              accion: 'actualizar',
              entidad_tipo: entityType,
              entidad_id: entityId,
              descripcion: `Cambió el estado de ${entityType} de "${oldStatus}" a "${newStatus}"`,
              datos_anteriores: { estado: oldStatus },
              datos_nuevos: { estado: newStatus },
              ip_address,
              user_agent
            });
          }
        } catch (error) {
          console.error('Error logging status change:', error);
        }

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Middleware para logging de asignaciones
   */
  logAssignment(entityType) {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(data) {
        try {
          const userId = req.user?.id;
          const entityId = req.params.id;
          const assignedUserId = req.body.usuario_asignado_id || req.body.userId;
          const ip_address = req.ip || req.connection.remoteAddress;
          const user_agent = req.get('User-Agent');

          if (userId && assignedUserId) {
            await this.logRepository.logActivity({
              usuario_id: userId,
              accion: 'asignar',
              entidad_tipo: entityType,
              entidad_id: entityId,
              descripcion: `Asignó ${entityType} al usuario ID ${assignedUserId}`,
              datos_nuevos: { usuario_asignado_id: assignedUserId },
              ip_address,
              user_agent
            });
          }
        } catch (error) {
          console.error('Error logging assignment:', error);
        }

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Método estático para crear instancia del middleware
   */
  static create() {
    return new ActivityLoggerMiddleware();
  }
}

module.exports = ActivityLoggerMiddleware;