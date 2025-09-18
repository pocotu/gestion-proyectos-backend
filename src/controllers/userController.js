const UserService = require('../services/userService');
const UserSettingsService = require('../services/userSettingsService');
const { 
  requirePermission, 
  requireUserManagement, 
  requireOwnershipOrPermission,
  attachPermissions 
} = require('../middleware/permissionMiddleware');

/**
 * UserController - Controlador para gestión de usuarios
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja requests HTTP de usuarios
 * - Open/Closed: Abierto para extensión (nuevos endpoints)
 * - Liskov Substitution: Puede ser sustituido por otros controladores
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (UserService)
 */
class UserController {
  constructor() {
    this.userService = new UserService();
    this.userSettingsService = new UserSettingsService();
  }

  /**
   * Obtener perfil del usuario actual
   * GET /api/users/profile
   * Permisos: Usuario autenticado (propio perfil)
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await this.userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar perfil del usuario actual
   * PUT /api/users/profile
   * Permisos: Usuario autenticado (propio perfil)
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { nombre, telefono } = req.body;

      // Validar datos
      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        });
      }

      const updateData = {
        nombre: nombre.trim(),
        telefono: telefono?.trim() || null
      };

      const updatedUser = await this.userService.updateUser(userId, updateData);

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: { user: updatedUser }
      });

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Listar todos los usuarios
   * GET /api/users
   * Permisos: Admin - Acceso total, gestión de usuarios y roles
   */
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, estado } = req.query;

      const filters = {};
      if (search) {
        filters.search = search.trim();
      }
      if (estado) {
        filters.estado = estado;
      }

      const result = await this.userService.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        filters
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener usuario específico por ID
   * GET /api/users/:id
   * Permisos: Admin o el propio usuario
   */
  async getUserById(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.user.id;

      // Verificar si es el propio usuario o si tiene permisos de admin
      if (userId !== currentUserId && !req.user.es_administrador && !req.hasPermission('users:read')) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este usuario'
        });
      }

      const user = await this.userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar usuario específico
   * PUT /api/users/:id
   * Permisos: Admin - Acceso total, gestión de usuarios y roles
   */
  async updateUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { nombre, telefono, estado, es_administrador } = req.body;

      // Validar datos
      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        });
      }

      const updateData = {
        nombre: nombre.trim(),
        telefono: telefono?.trim() || null
      };

      // Solo admin puede cambiar estado y permisos de administrador
      if (req.user.es_administrador) {
        if (estado !== undefined) {
          updateData.estado = estado;
        }
        if (es_administrador !== undefined) {
          updateData.es_administrador = es_administrador;
        }
      }

      const updatedUser = await this.userService.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: { user: updatedUser }
      });

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar usuario
   * DELETE /api/users/:id
   * Permisos: Admin - Acceso total, gestión de usuarios y roles
   */
  async deleteUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.user.id;

      // No permitir que un usuario se elimine a sí mismo
      if (userId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        });
      }

      const deleted = await this.userService.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener roles de un usuario
   * GET /api/users/:id/roles
   * Permisos: Admin o el propio usuario
   */
  async getUserRoles(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.user.id;

      // Verificar permisos
      if (userId !== currentUserId && !req.user.es_administrador && !req.hasPermission('users:read')) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver los roles de este usuario'
        });
      }

      const roles = await this.userService.getUserRoles(userId);

      res.json({
        success: true,
        data: { roles }
      });

    } catch (error) {
      console.error('Error obteniendo roles del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Asignar rol a usuario
   * POST /api/users/:id/roles
   * Permisos: Admin - Acceso total, gestión de usuarios y roles
   */
  async assignRole(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { roleId } = req.body;
      const assignedBy = req.user.id;

      if (!roleId) {
        return res.status(400).json({
          success: false,
          message: 'El ID del rol es requerido'
        });
      }

      const result = await this.userService.assignRoleToUser(userId, roleId, assignedBy);

      res.status(201).json({
        success: true,
        message: 'Rol asignado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error asignando rol:', error);
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Remover rol de usuario
   * DELETE /api/users/:id/roles/:roleId
   * Permisos: Admin - Acceso total, gestión de usuarios y roles
   */
  async removeRole(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const roleId = parseInt(req.params.roleId);

      const result = await this.userService.removeRoleFromUser(userId, roleId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        message: 'Rol removido exitosamente'
      });

    } catch (error) {
      console.error('Error removiendo rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado de usuario (activar/desactivar)
   * PATCH /api/users/:id/status
   * Permisos: Admin - Acceso total, gestión de usuarios y roles
   */
  async changeUserStatus(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { estado } = req.body;
      const currentUserId = req.user.id;

      // No permitir que un usuario se desactive a sí mismo
      if (userId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes cambiar tu propio estado'
        });
      }

      if (!['activo', 'inactivo'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser "activo" o "inactivo"'
        });
      }

      const updatedUser = await this.userService.updateUser(userId, { estado });

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: `Usuario ${estado === 'activo' ? 'activado' : 'desactivado'} exitosamente`,
        data: { user: updatedUser }
      });

    } catch (error) {
      console.error('Error cambiando estado del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de usuarios
   * GET /api/users/stats
   * Permisos: Admin - Acceso total, gestión de usuarios y roles
   */
  async getUserStats(req, res) {
    try {
      const stats = await this.userService.getUserStatistics();

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Buscar usuarios
   * GET /api/users/search
   * Permisos: Admin o usuarios con permiso de lectura de usuarios
   */
  async searchUsers(req, res) {
    try {
      const { query, limit = 10, offset = 0 } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un término de búsqueda'
        });
      }

      const users = await this.userService.searchUsers(query, { limit, offset });

      res.json({
        success: true,
        data: { users }
      });

    } catch (error) {
      console.error('Error buscando usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener usuarios disponibles para asignar a proyectos
   * GET /api/users/available-for-projects
   * Permisos: Admin o Responsable de Proyecto
   */
  async getAvailableUsersForProjects(req, res) {
    try {
      const users = await this.userService.getAvailableUsersForProjects();

      res.json({
        success: true,
        data: { users }
      });

    } catch (error) {
      console.error('Error obteniendo usuarios disponibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener usuarios disponibles para asignar a tareas
   * GET /api/users/available-for-tasks
   * Permisos: Admin, Responsable de Proyecto, o Responsable de Tarea
   */
  async getAvailableUsersForTasks(req, res) {
    try {
      const { projectId } = req.query;
      const users = await this.userService.getAvailableUsersForTasks(projectId);

      res.json({
        success: true,
        data: { users }
      });

    } catch (error) {
      console.error('Error obteniendo usuarios disponibles para tareas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener configuraciones del usuario actual
   * GET /api/users/settings
   * Permisos: Usuario autenticado (propias configuraciones)
   */
  async getUserSettings(req, res) {
    try {
      const userId = req.user.id;
      const settings = await this.userSettingsService.getUserSettings(userId);

      res.json({
        success: true,
        data: { settings }
      });

    } catch (error) {
      console.error('Error obteniendo configuraciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar configuraciones del usuario actual
   * PUT /api/users/settings
   * Permisos: Usuario autenticado (propias configuraciones)
   */
  async updateUserSettings(req, res) {
    try {
      const userId = req.user.id;
      const settings = req.body;

      const updatedSettings = await this.userSettingsService.updateUserSettings(userId, settings);

      res.json({
        success: true,
        message: 'Configuraciones actualizadas exitosamente',
        data: { settings: updatedSettings }
      });

    } catch (error) {
      console.error('Error actualizando configuraciones:', error);
      
      if (error.message.includes('inválido') || error.message.includes('debe ser')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Restablecer configuraciones a valores por defecto
   * POST /api/users/settings/reset
   * Permisos: Usuario autenticado (propias configuraciones)
   */
  async resetUserSettings(req, res) {
    try {
      const userId = req.user.id;
      const defaultSettings = await this.userSettingsService.resetToDefaults(userId);

      res.json({
        success: true,
        message: 'Configuraciones restablecidas a valores por defecto',
        data: { settings: defaultSettings }
      });

    } catch (error) {
      console.error('Error restableciendo configuraciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = UserController;