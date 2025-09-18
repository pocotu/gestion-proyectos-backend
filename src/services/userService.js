const UserRepository = require('../repositories/UserRepository');
const bcrypt = require('bcrypt');

/**
 * UserService - Servicio para gestión de usuarios
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja lógica de negocio de usuarios
 * - Open/Closed: Abierto para extensión (nuevos métodos)
 * - Liskov Substitution: Puede ser sustituido por otros servicios
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (UserRepository)
 */
class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Obtener todos los usuarios con paginación y filtros
   */
  async getAllUsers(options = {}) {
    try {
      console.log('UserService.getAllUsers - Iniciando con:', options);
      
      const { page = 1, limit = 10, filters = {} } = options;
      const offset = (page - 1) * limit;
      const repositoryOptions = { limit, offset, filters };

      console.log('UserService.getAllUsers - Llamando userRepository.findAll con:', repositoryOptions);
      const users = await this.userRepository.findAll(repositoryOptions);
      console.log('UserService.getAllUsers - Usuarios obtenidos:', users.length);

      console.log('UserService.getAllUsers - Llamando userRepository.count con:', filters);
      const total = await this.userRepository.count(filters);
      console.log('UserService.getAllUsers - Total count:', total);

      return {
        users: users.map(user => this.sanitizeUser(user)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en UserService.getAllUsers - Error completo:', error);
      console.error('Error en UserService.getAllUsers - Stack:', error.stack);
      throw error; // Propagar el error original en lugar de crear uno nuevo
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(id) {
    try {
      const user = await this.userRepository.findById(id);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      console.error('Error en UserService.getUserById:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo usuario
   */
  async createUser(userData) {
    try {
      // Verificar si el email ya existe
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('El email ya está registrado');
      }

      // Cifrar contraseña
      const hashedPassword = await bcrypt.hash(userData.contraseña, 10);

      const newUser = await this.userRepository.create({
        ...userData,
        contraseña: hashedPassword
      });

      return this.sanitizeUser(newUser);
    } catch (error) {
      console.error('Error en UserService.createUser:', error);
      throw error;
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(id, userData) {
    try {
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw new Error('Usuario no encontrado');
      }

      // Si se está actualizando el email, verificar que no exista
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(userData.email);
        if (emailExists) {
          throw new Error('El email ya está registrado');
        }
      }

      // Si se está actualizando la contraseña, cifrarla
      if (userData.contraseña) {
        userData.contraseña = await bcrypt.hash(userData.contraseña, 10);
      }

      const updatedUser = await this.userRepository.update(id, userData);
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      console.error('Error en UserService.updateUser:', error);
      throw error;
    }
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(id) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      await this.userRepository.delete(id);
      return { message: 'Usuario eliminado correctamente' };
    } catch (error) {
      console.error('Error en UserService.deleteUser:', error);
      throw error;
    }
  }

  /**
   * Obtener perfil del usuario
   */
  async getProfile(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      console.error('Error en UserService.getProfile:', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(userId, profileData) {
    try {
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new Error('Usuario no encontrado');
      }

      // No permitir cambio de email en perfil
      delete profileData.email;
      delete profileData.es_administrador;

      const updatedUser = await this.userRepository.update(userId, profileData);
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      console.error('Error en UserService.updateProfile:', error);
      throw error;
    }
  }

  /**
   * Cambiar contraseña del usuario
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.contraseña);
      if (!isValidPassword) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Cifrar nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.userRepository.update(userId, { contraseña: hashedPassword });
      return { message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      console.error('Error en UserService.changePassword:', error);
      throw error;
    }
  }

  /**
   * Buscar usuarios
   */
  async searchUsers(query, { page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;
      
      const users = await this.userRepository.search(query, { limit, offset });
      const total = await this.userRepository.countSearch(query);

      return {
        users: users.map(user => this.sanitizeUser(user)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en UserService.searchUsers:', error);
      throw new Error('Error buscando usuarios');
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats() {
    try {
      const stats = await this.userRepository.getStats();
      return stats;
    } catch (error) {
      console.error('Error en UserService.getUserStats:', error);
      throw new Error('Error obteniendo estadísticas de usuarios');
    }
  }

  /**
   * Obtener usuarios disponibles para proyectos
   */
  async getAvailableUsersForProjects() {
    try {
      const users = await this.userRepository.findAvailableForProjects();
      return users.map(user => this.sanitizeUser(user));
    } catch (error) {
      console.error('Error en UserService.getAvailableUsersForProjects:', error);
      throw new Error('Error obteniendo usuarios disponibles');
    }
  }

  /**
   * Obtener usuarios disponibles para tareas
   */
  async getAvailableUsersForTasks() {
    try {
      const users = await this.userRepository.findAvailableForTasks();
      return users.map(user => this.sanitizeUser(user));
    } catch (error) {
      console.error('Error en UserService.getAvailableUsersForTasks:', error);
      throw new Error('Error obteniendo usuarios disponibles');
    }
  }

  /**
   * Obtener roles del usuario
   */
  async getUserRoles(userId) {
    try {
      const roles = await this.userRepository.getUserRoles(userId);
      return roles;
    } catch (error) {
      console.error('Error en UserService.getUserRoles:', error);
      throw new Error('Error obteniendo roles del usuario');
    }
  }

  /**
   * Sanitizar datos del usuario (remover información sensible)
   */
  sanitizeUser(user) {
    if (!user) return null;
    
    const { contraseña, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

module.exports = UserService;