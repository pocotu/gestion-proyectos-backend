const UserRoleRepository = require('../repositories/UserRoleRepository');
const RoleRepository = require('../repositories/RoleRepository');
const UserRepository = require('../repositories/UserRepository');

/**
 * RoleService - Servicio para gestión de roles en sistema muchos-a-muchos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja lógica de negocio relacionada con roles
 * - Open/Closed: Abierto para extensión (nuevos métodos de gestión)
 * - Liskov Substitution: Puede ser sustituido por otros servicios de roles
 * - Interface Segregation: Métodos específicos para diferentes operaciones
 * - Dependency Inversion: Depende de abstracciones (Repositories)
 */
class RoleService {
  constructor() {
    this.userRoleRepository = new UserRoleRepository();
    this.roleRepository = new RoleRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Asigna un rol a un usuario
   * @param {number} userId - ID del usuario
   * @param {number|string} roleIdentifier - ID o nombre del rol
   * @param {number} assignedBy - ID del usuario que asigna el rol
   * @returns {Object} Resultado de la asignación
   */
  async assignRole(userId, roleIdentifier, assignedBy = null) {
    try {
      // Validar que el usuario existe
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Obtener el rol por ID o nombre
      const role = await this._getRoleByIdentifier(roleIdentifier);
      if (!role) {
        throw new Error('Rol no encontrado');
      }

      // Verificar si el usuario ya tiene el rol
      const hasRole = await this.userRoleRepository.hasRole(userId, role.id);
      if (hasRole) {
        return {
          success: true,
          message: 'El usuario ya tiene este rol asignado',
          data: { userId, roleId: role.id, roleName: role.nombre }
        };
      }

      // Asignar el rol
      const result = await this.userRoleRepository.assignRole(userId, role.id, assignedBy);

      return {
        success: true,
        message: 'Rol asignado exitosamente',
        data: {
          userId,
          roleId: role.id,
          roleName: role.nombre,
          assignedBy,
          result
        }
      };

    } catch (error) {
      throw new Error(`Error al asignar rol: ${error.message}`);
    }
  }

  /**
   * Remueve un rol de un usuario
   * @param {number} userId - ID del usuario
   * @param {number|string} roleIdentifier - ID o nombre del rol
   * @returns {Object} Resultado de la remoción
   */
  async removeRole(userId, roleIdentifier) {
    try {
      // Validar que el usuario existe
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Obtener el rol por ID o nombre
      const role = await this._getRoleByIdentifier(roleIdentifier);
      if (!role) {
        throw new Error('Rol no encontrado');
      }

      // Verificar si el usuario tiene el rol
      const hasRole = await this.userRoleRepository.hasRole(userId, role.id);
      if (!hasRole) {
        return {
          success: true,
          message: 'El usuario no tiene este rol asignado',
          data: { userId, roleId: role.id, roleName: role.nombre }
        };
      }

      // Remover el rol
      const result = await this.userRoleRepository.removeRole(userId, role.id);

      return {
        success: true,
        message: 'Rol removido exitosamente',
        data: {
          userId,
          roleId: role.id,
          roleName: role.nombre,
          result
        }
      };

    } catch (error) {
      throw new Error(`Error al remover rol: ${error.message}`);
    }
  }

  /**
   * Asigna múltiples roles a un usuario
   * @param {number} userId - ID del usuario
   * @param {Array<number|string>} roleIdentifiers - Array de IDs o nombres de roles
   * @param {number} assignedBy - ID del usuario que asigna los roles
   * @returns {Object} Resultado de las asignaciones
   */
  async assignMultipleRoles(userId, roleIdentifiers, assignedBy = null) {
    try {
      // Validar que el usuario existe
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!Array.isArray(roleIdentifiers) || roleIdentifiers.length === 0) {
        throw new Error('Se debe proporcionar al menos un rol');
      }

      const results = [];
      const errors = [];

      for (const roleIdentifier of roleIdentifiers) {
        try {
          const result = await this.assignRole(userId, roleIdentifier, assignedBy);
          results.push({
            roleIdentifier,
            success: true,
            ...result
          });
        } catch (error) {
          errors.push({
            roleIdentifier,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? 'Todos los roles asignados exitosamente' 
          : `${results.length} roles asignados, ${errors.length} errores`,
        data: {
          userId,
          successful: results,
          errors: errors,
          totalProcessed: roleIdentifiers.length,
          successCount: results.length,
          errorCount: errors.length
        }
      };

    } catch (error) {
      throw new Error(`Error al asignar múltiples roles: ${error.message}`);
    }
  }

  /**
   * Remueve múltiples roles de un usuario
   * @param {number} userId - ID del usuario
   * @param {Array<number|string>} roleIdentifiers - Array de IDs o nombres de roles
   * @returns {Object} Resultado de las remociones
   */
  async removeMultipleRoles(userId, roleIdentifiers) {
    try {
      // Validar que el usuario existe
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!Array.isArray(roleIdentifiers) || roleIdentifiers.length === 0) {
        throw new Error('Se debe proporcionar al menos un rol');
      }

      const results = [];
      const errors = [];

      for (const roleIdentifier of roleIdentifiers) {
        try {
          const result = await this.removeRole(userId, roleIdentifier);
          results.push({
            roleIdentifier,
            success: true,
            ...result
          });
        } catch (error) {
          errors.push({
            roleIdentifier,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? 'Todos los roles removidos exitosamente' 
          : `${results.length} roles removidos, ${errors.length} errores`,
        data: {
          userId,
          successful: results,
          errors: errors,
          totalProcessed: roleIdentifiers.length,
          successCount: results.length,
          errorCount: errors.length
        }
      };

    } catch (error) {
      throw new Error(`Error al remover múltiples roles: ${error.message}`);
    }
  }

  /**
   * Sincroniza los roles de un usuario (reemplaza todos los roles actuales)
   * @param {number} userId - ID del usuario
   * @param {Array<number|string>} roleIdentifiers - Array de IDs o nombres de roles
   * @param {number} assignedBy - ID del usuario que asigna los roles
   * @returns {Object} Resultado de la sincronización
   */
  async syncUserRoles(userId, roleIdentifiers, assignedBy = null) {
    try {
      // Validar que el usuario existe
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Convertir identificadores a IDs de roles
      const roleIds = [];
      for (const identifier of roleIdentifiers) {
        const role = await this._getRoleByIdentifier(identifier);
        if (role) {
          roleIds.push(role.id);
        }
      }

      // Usar el método de sincronización del repositorio
      const result = await this.userRoleRepository.syncUserRoles(userId, roleIds, assignedBy);

      // Obtener los roles actualizados
      const updatedRoles = await this.getUserRoles(userId);

      return {
        success: true,
        message: 'Roles sincronizados exitosamente',
        data: {
          userId,
          syncResult: result,
          currentRoles: updatedRoles.data
        }
      };

    } catch (error) {
      throw new Error(`Error al sincronizar roles: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los roles de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} Roles del usuario
   */
  async getUserRoles(userId) {
    try {
      console.log('getUserRoles - Iniciando con userId:', userId);
      
      // Verificar que el usuario existe usando el repositorio base
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      
      console.log('getUserRoles - Usuario encontrado:', user.nombre);

      // Usar método estático para evitar cualquier conflicto de instanciación
      const roles = await UserRoleRepository.getUserRolesStatic(userId);

      console.log('getUserRoles - Roles obtenidos:', roles.length);

      return roles.map(role => ({
        id: role.id,
        usuario_id: role.usuario_id,
        rol_id: role.rol_id,
        nombre: role.rol_nombre, // Usar 'nombre' para consistencia con el test
        rol_nombre: role.rol_nombre, // Mantener también rol_nombre para compatibilidad
        created_at: role.created_at
      }));

    } catch (error) {
      console.error('getUserRoles - Error completo:', error);
      throw new Error(`Error al obtener roles del usuario: ${error.message}`);
    }
  }

  /**
   * Verifica si un usuario tiene un rol específico
   * @param {number} userId - ID del usuario
   * @param {number|string} roleIdentifier - ID o nombre del rol
   * @returns {Object} Resultado de la verificación
   */
  async userHasRole(userId, roleIdentifier) {
    try {
      // Validar que el usuario existe
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Obtener el rol por ID o nombre
      const role = await this._getRoleByIdentifier(roleIdentifier);
      if (!role) {
        throw new Error('Rol no encontrado');
      }

      const hasRole = await this.userRoleRepository.hasRole(userId, role.id);

      return {
        success: true,
        message: hasRole ? 'El usuario tiene el rol' : 'El usuario no tiene el rol',
        data: {
          userId,
          roleId: role.id,
          roleName: role.nombre,
          hasRole
        }
      };

    } catch (error) {
      throw new Error(`Error al verificar rol del usuario: ${error.message}`);
    }
  }

  /**
   * Verifica si un usuario tiene alguno de los roles especificados
   * @param {number} userId - ID del usuario
   * @param {Array<number|string>} roleIdentifiers - Array de IDs o nombres de roles
   * @returns {Object} Resultado de la verificación
   */
  async userHasAnyRole(userId, roleIdentifiers) {
    try {
      if (!Array.isArray(roleIdentifiers) || roleIdentifiers.length === 0) {
        return {
          success: true,
          message: 'No se especificaron roles para verificar',
          data: { userId, hasAnyRole: false, matchingRoles: [] }
        };
      }

      const userRoles = await this.getUserRoles(userId);
      const userRoleNames = userRoles.data.roleNames;

      const matchingRoles = [];
      for (const identifier of roleIdentifiers) {
        const role = await this._getRoleByIdentifier(identifier);
        if (role && userRoleNames.includes(role.nombre)) {
          matchingRoles.push({
            id: role.id,
            name: role.nombre
          });
        }
      }

      return {
        success: true,
        message: matchingRoles.length > 0 
          ? `El usuario tiene ${matchingRoles.length} de los roles especificados`
          : 'El usuario no tiene ninguno de los roles especificados',
        data: {
          userId,
          hasAnyRole: matchingRoles.length > 0,
          matchingRoles,
          userRoles: userRoleNames,
          checkedRoles: roleIdentifiers
        }
      };

    } catch (error) {
      throw new Error(`Error al verificar roles del usuario: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los usuarios que tienen un rol específico
   * @param {number|string} roleIdentifier - ID o nombre del rol
   * @returns {Object} Usuarios con el rol
   */
  async getUsersByRole(roleIdentifier) {
    try {
      // Obtener el rol por ID o nombre
      const role = await this._getRoleByIdentifier(roleIdentifier);
      if (!role) {
        throw new Error('Rol no encontrado');
      }

      const users = await this.userRoleRepository.getUsersByRole(role.id);

      return {
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: {
          roleId: role.id,
          roleName: role.nombre,
          users: users.map(user => ({
            id: user.usuario_id,
            name: user.usuario_nombre,
            email: user.email,
            assignedAt: user.fecha_asignacion,
            assignedBy: user.asignado_por
          })),
          userCount: users.length
        }
      };

    } catch (error) {
      throw new Error(`Error al obtener usuarios por rol: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas del sistema de roles
   * @returns {Object} Estadísticas
   */
  async getRoleStatistics() {
    try {
      const userRoleStats = await this.userRoleRepository.getStatistics();
      const roleStats = await this.roleRepository.getStatistics();

      return {
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          totalActiveAssignments: userRoleStats.totalActiveAssignments,
          totalRoles: roleStats.total,
          rolesWithUsers: roleStats.withUsers,
          rolesWithoutUsers: roleStats.withoutUsers,
          mostAssignedRole: userRoleStats.mostAssignedRole,
          userWithMostRoles: userRoleStats.userWithMostRoles,
          rolesDistribution: userRoleStats.rolesDistribution
        }
      };

    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Método privado para obtener un rol por ID o nombre
   * @param {number|string} identifier - ID o nombre del rol
   * @returns {Object|null} Rol encontrado o null
   */
  async _getRoleByIdentifier(identifier) {
    if (typeof identifier === 'number') {
      return await this.roleRepository.findById(identifier);
    } else if (typeof identifier === 'string') {
      return await this.roleRepository.findByName(identifier);
    }
    return null;
  }

  /**
   * Valida que los datos de entrada sean correctos
   * @param {*} userId - ID del usuario
   * @param {*} roleIdentifier - Identificador del rol
   */
  _validateInputs(userId, roleIdentifier) {
    if (!userId || (typeof userId !== 'number' && !Number.isInteger(Number(userId)))) {
      throw new Error('ID de usuario inválido');
    }

    if (!roleIdentifier || (typeof roleIdentifier !== 'number' && typeof roleIdentifier !== 'string')) {
      throw new Error('Identificador de rol inválido');
    }
  }
}

module.exports = RoleService;