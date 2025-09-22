const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { UserModel } = require('../models');
const UserRoleRepository = require('../repositories/UserRoleRepository');

/**
 * AuthService - Servicio de autenticación simplificado para MVP
 * - Single Responsibility: Solo maneja autenticación básica con JWT
 * - Open/Closed: Extensible para futuras funcionalidades
 * - Dependency Inversion: Depende de abstracciones (UserModel)
 */
class AuthService {
  constructor() {
    this.userModel = UserModel;
  }

  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Object} Usuario creado y token
   */
  async register({ nombre, email, contraseña, telefono, es_administrador = false }) {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.userModel.findByEmail(email);
      if (existingUser) {
        throw new Error('El usuario ya existe');
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(contraseña, 12);

      // Crear usuario
      const result = await this.userModel.create({
        nombre,
        email,
        contraseña: hashedPassword,
        telefono,
        es_administrador
      });

      // Obtener usuario creado
      const user = await this.userModel.findById(result.id);
      
      // Generar token
      const token = this.generateJWT(user);

      return {
        success: true,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono,
          es_administrador: Boolean(user.es_administrador)
        },
        token
      };
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  /**
   * Autentica un usuario
   * @param {string} email - Email del usuario
   * @param {string} contraseña - Contraseña del usuario
   * @returns {Object} Usuario autenticado y token
   */
  async login(email, contraseña) {
    try {
      // Buscar usuario por email
      const user = await this.userModel.findByEmail(email);
      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);
      if (!isValidPassword) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar que el usuario esté activo
      if (!user.estado) {
        throw new Error('Usuario inactivo');
      }

      // Obtener roles del usuario
      let userRoles = [];
      try {
        const roles = await UserRoleRepository.getUserRolesStatic(user.id);
        userRoles = roles.map(role => role.rol_nombre);
      } catch (error) {
        console.warn('Error obteniendo roles del usuario:', error.message);
        // Continuar sin roles si hay error
      }

      // Generar token
      const token = this.generateJWT(user);

      return {
        success: true,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono,
          es_administrador: user.es_administrador,
          roles: userRoles
        },
        token
      };
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  /**
   * Verifica un JWT
   * @param {string} token - Token JWT
   * @returns {Object} Payload del token
   */
  verifyJWT(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  /**
   * Verifica un token y devuelve información del usuario
   * @param {string} token - Token JWT
   * @returns {Object} Información del usuario
   */
  async verifyToken(token) {
    try {
      // Verificar el token JWT
      const payload = this.verifyJWT(token);
      
      // Obtener información actualizada del usuario
      const user = await this.getUserInfo(payload.id);
      
      return user;
    } catch (error) {
      console.error('Error verificando token:', error);
      throw error;
    }
  }

  /**
   * Genera un JWT para el usuario
   * @param {Object} user - Usuario
   * @returns {string} Token JWT
   */
  generateJWT(user) {
    const payload = {
      id: user.id,
      email: user.email,
      es_administrador: user.es_administrador
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
      issuer: 'gestion-proyectos'
    });
  }

  /**
   * Obtiene información del usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} Información del usuario
   */
  async getUserInfo(userId) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Obtener roles del usuario
      let userRoles = [];
      try {
        const roles = await UserRoleRepository.getUserRolesStatic(user.id);
        userRoles = roles.map(role => role.rol_nombre);
      } catch (error) {
        console.warn('Error obteniendo roles del usuario:', error.message);
        // Continuar sin roles si hay error
      }

      return {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        es_administrador: user.es_administrador,
        roles: userRoles
      };
    } catch (error) {
      console.error('Error obteniendo información del usuario:', error);
      throw error;
    }
  }
}

module.exports = AuthService;