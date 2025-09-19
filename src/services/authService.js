const UserRepository = require('../repositories/UserRepository');
const RefreshTokenService = require('./RefreshTokenService');
const config = require('../config/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * AuthService - Servicio de autenticación
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja lógica de autenticación
 * - Open/Closed: Abierto para extensión (nuevos métodos de auth)
 * - Liskov Substitution: Puede ser sustituido por otros servicios de auth
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (UserRepository)
 */
class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.refreshTokenService = new RefreshTokenService();
    this.saltRounds = config.BCRYPT_SALT_ROUNDS;
  }

  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.nombre - Nombre del usuario
   * @param {string} userData.email - Email del usuario
   * @param {string} userData.contraseña - Contraseña del usuario
   * @param {string} userData.telefono - Teléfono del usuario (opcional)
   * @param {boolean} userData.es_administrador - Si es administrador (opcional)
   * @returns {Object} Usuario creado sin contraseña
   */
  async register(userData) {
    try {
      // Validar que el email no exista
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('El email ya está registrado');
      }

      // Validar datos requeridos
      this._validateUserData(userData);

      // Crear usuario (UserRepository se encarga del hash de la contraseña)
      const newUserData = {
        ...userData,
        es_administrador: userData.es_administrador || false
      };

      const result = await this.userRepository.create(newUserData);
      
      // Obtener usuario creado sin contraseña
      const createdUser = await this.userRepository.findById(result.id);
      return this._sanitizeUser(createdUser);

    } catch (error) {
      throw new Error(`Error en registro: ${error.message}`);
    }
  }

  /**
   * Autentica un usuario y genera JWT
   * @param {string} email - Email del usuario
   * @param {string} contraseña - Contraseña del usuario
   * @returns {Object} Token JWT y datos del usuario
   */
  async login(email, contraseña) {
    try {
      // Validar datos de entrada
      if (!email || !contraseña) {
        throw new Error('Email y contraseña son requeridos');
      }

      // Buscar usuario por email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar que el usuario esté activo
      if (user.estado !== 1) {
        throw new Error('Usuario inactivo');
      }

      // Verificar contraseña
      const isValidPassword = await this._verifyPassword(contraseña, user.contraseña);
      if (!isValidPassword) {
        throw new Error('Credenciales inválidas');
      }

      // Actualizar último acceso
      await this.userRepository.updateLastAccess(user.id);

      // Generar tokens
      const accessToken = this._generateToken(user);
      console.log('AccessToken generado:', !!accessToken);
      
      const refreshToken = await this.refreshTokenService.generateRefreshToken(user.id);
      console.log('RefreshToken generado:', !!refreshToken);

      // Obtener roles del usuario
      const userWithRoles = await this.userRepository.findWithRoles(user.id);

      const result = {
        success: true,
        message: 'Login exitoso',
        user: this._sanitizeUser(user),
        accessToken,
        refreshToken,
        roles: userWithRoles.roles || [],
        // Mantener compatibilidad con versión anterior
        token: accessToken
      };
      
      console.log('Resultado del login:', JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      throw new Error(`Error en login: ${error.message}`);
    }
  }

  /**
   * Verifica y decodifica un token JWT
   * @param {string} token - Token JWT
   * @returns {Object} Datos del usuario decodificados
   */
  async verifyToken(token) {
    try {
      console.log('🔐 [AUTH-SERVICE] Verificando token...');
      console.log('🔐 [AUTH-SERVICE] JWT_SECRET:', config.JWT_SECRET ? 'Presente' : 'Ausente');
      
      // Verificar y decodificar el token
      const decoded = jwt.verify(token, config.JWT_SECRET);
      console.log('🔐 [AUTH-SERVICE] Token decodificado:', { id: decoded.id, email: decoded.email, es_administrador: decoded.es_administrador });
      
      // Buscar el usuario en la base de datos usando id (no userId)
      const user = await this.userRepository.findById(decoded.id);
      console.log('🔐 [AUTH-SERVICE] Usuario encontrado:', user ? { id: user.id, email: user.email, es_administrador: user.es_administrador, estado: user.estado } : 'No encontrado');
      
      if (!user) {
        console.log('🔐 [AUTH-SERVICE] Error: Usuario no encontrado');
        throw new Error('Usuario no encontrado');
      }

      if (user.estado !== 1) {
        console.log('🔐 [AUTH-SERVICE] Error: Usuario no válido, estado:', user.estado);
        throw new Error('Usuario no válido');
      }

      console.log('🔐 [AUTH-SERVICE] Usuario verificado exitosamente');
      return user;
    } catch (error) {
      console.log('🔐 [AUTH-SERVICE] Error verificando token:', error.message);
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      } else {
        throw new Error(`Error verificando token: ${error.message}`);
      }
    }
  }

  /**
   * Refresca un access token usando un refresh token válido
   * @param {string} refreshToken - Token de refresco
   * @returns {Promise<Object>} Nuevo access token y datos del usuario
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Validar refresh token
      const tokenData = await this.refreshTokenService.validateRefreshToken(refreshToken);
      
      // Obtener usuario actualizado
      const user = await this.userRepository.findById(tokenData.user_id);
      if (!user || user.estado !== 1) {
        throw new Error('Usuario no válido o inactivo');
      }

      // Generar nuevo access token
      const newAccessToken = this._generateToken(user);

      return {
        success: true,
        message: 'Token refrescado exitosamente',
        accessToken: newAccessToken,
        user: this._sanitizeUser(user)
      };

    } catch (error) {
      throw new Error(`Error refrescando token: ${error.message}`);
    }
  }

  /**
   * Cierra sesión del usuario revocando tokens
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - Token de refresco
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Resultado del logout
   */
  async logout(accessToken, refreshToken, userId) {
    try {
      const results = {
        accessTokenBlacklisted: false,
        refreshTokenRevoked: false
      };

      // Agregar access token a blacklist si se proporciona
      if (accessToken) {
        results.accessTokenBlacklisted = await this.refreshTokenService.blacklistJWT(accessToken, userId);
      }

      // Revocar refresh token si se proporciona
      if (refreshToken) {
        results.refreshTokenRevoked = await this.refreshTokenService.revokeRefreshToken(refreshToken);
      }

      return {
        success: true,
        message: 'Logout exitoso',
        details: results
      };

    } catch (error) {
      throw new Error(`Error en logout: ${error.message}`);
    }
  }

  /**
   * Cierra todas las sesiones del usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Resultado del logout global
   */
  async logoutAll(userId) {
    try {
      const revoked = await this.refreshTokenService.revokeAllUserRefreshTokens(userId);

      return {
        success: true,
        message: 'Todas las sesiones cerradas exitosamente',
        tokensRevoked: revoked
      };

    } catch (error) {
      throw new Error(`Error cerrando todas las sesiones: ${error.message}`);
    }
  }

  /**
   * Refresca un token JWT (método legacy - mantener compatibilidad)
   * @param {string} token - Token JWT actual
   * @returns {Object} Nuevo token JWT
   */
  async refreshToken(token) {
    try {
      const user = await this.verifyToken(token);
      const newToken = this._generateToken(user);
      
      return {
        token: newToken,
        user: this._sanitizeUser(user)
      };

    } catch (error) {
      throw new Error(`Error refrescando token: ${error.message}`);
    }
  }

  /**
   * Cambia la contraseña de un usuario
   * @param {number} userId - ID del usuario
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {boolean} Éxito de la operación
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Obtener usuario
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isValidPassword = await this._verifyPassword(currentPassword, user.contraseña);
      if (!isValidPassword) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Validar nueva contraseña
      this._validatePassword(newPassword);

      // Hashear nueva contraseña
      const hashedPassword = await this._hashPassword(newPassword);

      // Actualizar contraseña
      await this.userRepository.updateById(userId, { contraseña: hashedPassword });

      return true;

    } catch (error) {
      throw new Error(`Error cambiando contraseña: ${error.message}`);
    }
  }

  // Métodos privados

  /**
   * Valida los datos del usuario
   * @private
   */
  _validateUserData(userData) {
    if (!userData.nombre || userData.nombre.trim().length < 2) {
      throw new Error('Nombre debe tener al menos 2 caracteres');
    }

    if (!userData.email || !this._isValidEmail(userData.email)) {
      throw new Error('Email inválido');
    }

    this._validatePassword(userData.contraseña);
  }

  /**
   * Valida el formato del email
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida la contraseña
   * @private
   */
  _validatePassword(password) {
    if (!password || password.length < 6) {
      throw new Error('Contraseña debe tener al menos 6 caracteres');
    }

    // Validar que tenga al menos una letra y un número
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasLetter || !hasNumber) {
      throw new Error('Contraseña debe contener al menos una letra y un número');
    }
  }

  /**
   * Hashea una contraseña
   * @private
   */
  async _hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verifica una contraseña
   * @private
   */
  async _verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Genera un token JWT
   * @private
   */
  _generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      es_administrador: user.es_administrador
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    });
  }

  /**
   * Remueve datos sensibles del usuario
   * @private
   */
  _sanitizeUser(user) {
    if (!user) {
      return null;
    }
    const { contraseña, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

module.exports = AuthService;