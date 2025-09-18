const RoleService = require('../services/roleService');
const RoleRepository = require('../repositories/RoleRepository');

/**
 * RoleController - Controlador para gestión de roles
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja requests HTTP relacionados con roles
 * - Open/Closed: Abierto para extensión (nuevos endpoints)
 * - Liskov Substitution: Puede ser sustituido por otros controladores
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (RoleService)
 */
class RoleController {
  constructor() {
    this.roleService = new RoleService();
    this.roleRepository = new RoleRepository();
  }

  /**
   * Asigna un rol a un usuario
   * POST /api/roles/assign
   */
  async assignRole(req, res) {
    try {
      const { userId, roleIdentifier } = req.body;
      const assignedBy = req.user?.id;

      // Validar datos de entrada
      if (!userId || !roleIdentifier) {
        return res.status(400).json({
          success: false,
          message: 'userId y roleIdentifier son requeridos'
        });
      }

      const result = await this.roleService.assignRole(userId, roleIdentifier, assignedBy);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en assignRole:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Remueve un rol de un usuario
   * DELETE /api/roles/remove
   */
  async removeRole(req, res) {
    try {
      const { userId, roleIdentifier } = req.body;

      // Validar datos de entrada
      if (!userId || !roleIdentifier) {
        return res.status(400).json({
          success: false,
          message: 'userId y roleIdentifier son requeridos'
        });
      }

      const result = await this.roleService.removeRole(userId, roleIdentifier);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en removeRole:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Asigna múltiples roles a un usuario
   * POST /api/roles/assign-multiple
   */
  async assignMultipleRoles(req, res) {
    try {
      const { userId, roleIdentifiers } = req.body;
      const assignedBy = req.user?.id;

      // Validar datos de entrada
      if (!userId || !Array.isArray(roleIdentifiers) || roleIdentifiers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userId y roleIdentifiers (array) son requeridos'
        });
      }

      const result = await this.roleService.assignMultipleRoles(userId, roleIdentifiers, assignedBy);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en assignMultipleRoles:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Remueve múltiples roles de un usuario
   * DELETE /api/roles/remove-multiple
   */
  async removeMultipleRoles(req, res) {
    try {
      const { userId, roleIdentifiers } = req.body;

      // Validar datos de entrada
      if (!userId || !Array.isArray(roleIdentifiers) || roleIdentifiers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userId y roleIdentifiers (array) son requeridos'
        });
      }

      const result = await this.roleService.removeMultipleRoles(userId, roleIdentifiers);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en removeMultipleRoles:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Sincroniza los roles de un usuario (reemplaza todos los roles actuales)
   * PUT /api/roles/sync
   */
  async syncUserRoles(req, res) {
    try {
      const { userId, roleIdentifiers } = req.body;
      const assignedBy = req.user?.id;

      // Validar datos de entrada
      if (!userId || !Array.isArray(roleIdentifiers)) {
        return res.status(400).json({
          success: false,
          message: 'userId y roleIdentifiers (array) son requeridos'
        });
      }

      const result = await this.roleService.syncUserRoles(userId, roleIdentifiers, assignedBy);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en syncUserRoles:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtiene todos los roles de un usuario
   * GET /api/roles/user/:userId
   */
  async getUserRoles(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId es requerido'
        });
      }

      const result = await this.roleService.getUserRoles(parseInt(userId));

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en getUserRoles:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Verifica si un usuario tiene un rol específico
   * GET /api/roles/user/:userId/has-role
   */
  async userHasRole(req, res) {
    try {
      const { userId } = req.params;
      const { roleIdentifier } = req.query;

      if (!userId || !roleIdentifier) {
        return res.status(400).json({
          success: false,
          message: 'userId y roleIdentifier son requeridos'
        });
      }

      const result = await this.roleService.userHasRole(parseInt(userId), roleIdentifier);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en userHasRole:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Verifica si un usuario tiene alguno de los roles especificados
   * POST /api/roles/user/:userId/has-any-role
   */
  async userHasAnyRole(req, res) {
    try {
      const { userId } = req.params;
      const { roleIdentifiers } = req.body;

      if (!userId || !Array.isArray(roleIdentifiers)) {
        return res.status(400).json({
          success: false,
          message: 'userId y roleIdentifiers (array) son requeridos'
        });
      }

      const result = await this.roleService.userHasAnyRole(parseInt(userId), roleIdentifiers);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en userHasAnyRole:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtiene todos los usuarios que tienen un rol específico
   * GET /api/roles/:roleIdentifier/users
   */
  async getUsersByRole(req, res) {
    try {
      const { roleIdentifier } = req.params;

      if (!roleIdentifier) {
        return res.status(400).json({
          success: false,
          message: 'roleIdentifier es requerido'
        });
      }

      const result = await this.roleService.getUsersByRole(roleIdentifier);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en getUsersByRole:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtiene todos los roles disponibles
   * GET /api/roles
   */
  async getAllRoles(req, res) {
    try {
      const roles = await this.roleRepository.findAll();

      return res.status(200).json({
        success: true,
        message: 'Roles obtenidos exitosamente',
        data: {
          roles: roles.map(role => ({
            id: role.id,
            name: role.nombre
          })),
          count: roles.length
        }
      });

    } catch (error) {
      console.error('Error en getAllRoles:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Crea un nuevo rol
   * POST /api/roles
   */
  async createRole(req, res) {
    try {
      const { nombre } = req.body;

      if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nombre del rol es requerido y debe ser una cadena válida'
        });
      }

      const result = await this.roleRepository.create({ nombre: nombre.trim() });

      return res.status(201).json({
        success: true,
        message: 'Rol creado exitosamente',
        data: {
          id: result.id,
          nombre: nombre.trim()
        }
      });

    } catch (error) {
      console.error('Error en createRole:', error);
      
      if (error.message.includes('ya existe')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas del sistema de roles
   * GET /api/roles/statistics
   */
  async getRoleStatistics(req, res) {
    try {
      const result = await this.roleService.getRoleStatistics();

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en getRoleStatistics:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtiene los roles del usuario autenticado actual
   * GET /api/roles/my-roles
   */
  async getMyRoles(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const result = await this.roleService.getUserRoles(req.user.id);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en getMyRoles:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Verifica si el usuario autenticado actual tiene un rol específico
   * GET /api/roles/my-roles/has-role
   */
  async checkMyRole(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const { roleIdentifier } = req.query;

      if (!roleIdentifier) {
        return res.status(400).json({
          success: false,
          message: 'roleIdentifier es requerido'
        });
      }

      const result = await this.roleService.userHasRole(req.user.id, roleIdentifier);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Error en checkMyRole:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = RoleController;