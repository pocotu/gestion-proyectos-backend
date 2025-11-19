const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/config');
const { UserModel } = require('../models');
const UserRoleRepository = require('../repositories/UserRoleRepository');
const LogActivityRepository = require('../repositories/LogActivityRepository');
const { pool } = require('../config/db');

/**
 * AuthService - Servicio de autenticación con refresh tokens
 * - Single Responsibility: Solo maneja autenticación y gestión de tokens
 * - Open/Closed: Extensible para futuras funcionalidades
 * - Dependency Inversion: Depende de abstracciones (UserModel, Repositories)
 */
class AuthService {
  constructor() {
    this.userModel = UserModel;
    this.logActivityRepository = new LogActivityRepository();
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
   * @param {string} ipAddress - IP del cliente (opcional)
   * @param {string} userAgent - User agent del navegador (opcional)
   * @returns {Object} Usuario autenticado, access token y refresh token
   */
  async login(email, contraseña, ipAddress = null, userAgent = null) {
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

      // Generar access token (JWT)
      const accessToken = this.generateJWT(user);

      // Generar refresh token - DESHABILITADO EN MVP
      // const refreshToken = await this._generateRefreshToken(user.id, ipAddress, userAgent);

      // Registrar login en logs de actividad
      try {
        await this.logActivityRepository.logLogin(user.id, ipAddress, userAgent);
      } catch (error) {
        console.warn('Error registrando login en logs:', error.message);
      }

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
        token: accessToken
        // refreshToken: refreshToken // DESHABILITADO EN MVP
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

  // ========================================
  // MÉTODOS DE REFRESH TOKEN
  // ========================================

  /**
   * Refresca un access token usando un refresh token
   * @param {string} refreshToken - Refresh token a validar
   * @param {string} ipAddress - IP del cliente (opcional)
   * @param {string} userAgent - User agent del navegador (opcional)
   * @returns {Object} Nuevos access token y refresh token
   */
  async refreshToken(refreshToken, ipAddress = null, userAgent = null) {
    try {
      // Validar que se proporcione el refresh token
      if (!refreshToken) {
        throw new Error('Refresh token es requerido');
      }

      // Buscar el refresh token en la base de datos
      const [tokenData] = await pool.execute(
        `SELECT * FROM refresh_tokens 
         WHERE token = ? AND revoked = FALSE AND expires_at > NOW()`,
        [refreshToken]
      );

      if (!tokenData || tokenData.length === 0) {
        throw new Error('Refresh token inválido o expirado');
      }

      const storedToken = tokenData[0];

      // Verificar que el usuario aún existe y está activo
      const user = await this.userModel.findById(storedToken.usuario_id);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!user.estado) {
        throw new Error('Usuario inactivo');
      }

      // Generar nuevo access token
      const newAccessToken = this.generateJWT(user);

      // Generar nuevo refresh token (rotación)
      const newRefreshToken = await this._generateRefreshToken(
        user.id, 
        ipAddress, 
        userAgent
      );

      // Revocar el refresh token anterior y marcar con qué token fue reemplazado
      await pool.execute(
        `UPDATE refresh_tokens 
         SET revoked = TRUE, revoked_at = NOW(), replaced_by_token = ?
         WHERE token = ?`,
        [newRefreshToken, refreshToken]
      );

      // Obtener información actualizada del usuario
      const userInfo = await this.getUserInfo(user.id);

      // Registrar en logs de actividad
      try {
        await this.logActivityRepository.logActivity({
          usuario_id: user.id,
          accion: 'actualizar',
          entidad_tipo: 'usuario',
          entidad_id: user.id,
          descripcion: 'Token refrescado exitosamente',
          ip_address: ipAddress,
          user_agent: userAgent
        });
      } catch (error) {
        console.warn('Error registrando refresh en logs:', error.message);
      }

      return {
        success: true,
        user: userInfo,
        token: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('Error refrescando token:', error);
      throw error;
    }
  }

  /**
   * Genera un nuevo refresh token y lo almacena en la base de datos
   * @private
   * @param {number} userId - ID del usuario
   * @param {string} ipAddress - IP del cliente
   * @param {string} userAgent - User agent del navegador
   * @returns {string} Refresh token generado
   */
  async _generateRefreshToken(userId, ipAddress = null, userAgent = null) {
    try {
      // Generar token aleatorio seguro
      const token = crypto.randomBytes(64).toString('hex');

      // Calcular fecha de expiración (30 días por defecto)
      const expiryDays = config.REFRESH_TOKEN_EXPIRY_DAYS || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Almacenar en la base de datos
      await pool.execute(
        `INSERT INTO refresh_tokens 
         (token, usuario_id, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
        [token, userId, expiresAt, ipAddress, userAgent]
      );

      return token;
    } catch (error) {
      console.error('Error generando refresh token:', error);
      throw new Error('Error al generar refresh token');
    }
  }

  /**
   * Revoca un refresh token específico
   * @param {string} refreshToken - Token a revocar
   * @returns {boolean} True si se revocó exitosamente
   */
  async revokeRefreshToken(refreshToken) {
    try {
      const [result] = await pool.execute(
        `UPDATE refresh_tokens 
         SET revoked = TRUE, revoked_at = NOW()
         WHERE token = ? AND revoked = FALSE`,
        [refreshToken]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error revocando refresh token:', error);
      throw new Error('Error al revocar refresh token');
    }
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   * @param {number} userId - ID del usuario
   * @returns {number} Cantidad de tokens revocados
   */
  async revokeAllUserTokens(userId) {
    try {
      const [result] = await pool.execute(
        `UPDATE refresh_tokens 
         SET revoked = TRUE, revoked_at = NOW()
         WHERE usuario_id = ? AND revoked = FALSE`,
        [userId]
      );

      return result.affectedRows;
    } catch (error) {
      console.error('Error revocando todos los tokens del usuario:', error);
      throw new Error('Error al revocar tokens del usuario');
    }
  }

  /**
   * Logout del usuario con revocación de tokens
   * @param {string} accessToken - Access token actual (opcional)
   * @param {string} refreshToken - Refresh token a revocar
   * @param {number} userId - ID del usuario
   * @param {string} ipAddress - IP del cliente (opcional)
   * @returns {Object} Resultado del logout
   */
  async logout(accessToken, refreshToken, userId, ipAddress = null) {
    try {
      // Revocar el refresh token si se proporcionó
      if (refreshToken) {
        await this.revokeRefreshToken(refreshToken);
      }

      // Registrar logout en logs de actividad
      try {
        await this.logActivityRepository.logLogout(userId, ipAddress);
      } catch (error) {
        console.warn('Error registrando logout en logs:', error.message);
      }

      return {
        success: true,
        message: 'Logout exitoso'
      };
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  }

  /**
   * Logout de todas las sesiones del usuario
   * @param {number} userId - ID del usuario
   * @param {string} ipAddress - IP del cliente (opcional)
   * @returns {Object} Resultado del logout global
   */
  async logoutAll(userId, ipAddress = null) {
    try {
      // Revocar todos los refresh tokens del usuario
      const revokedCount = await this.revokeAllUserTokens(userId);

      // Registrar logout global en logs de actividad
      try {
        await this.logActivityRepository.logActivity({
          usuario_id: userId,
          accion: 'logout',
          entidad_tipo: 'usuario',
          entidad_id: userId,
          descripcion: `Logout de todas las sesiones (${revokedCount} tokens revocados)`,
          ip_address: ipAddress
        });
      } catch (error) {
        console.warn('Error registrando logout global en logs:', error.message);
      }

      return {
        success: true,
        message: `Se cerraron todas las sesiones (${revokedCount} sesiones activas)`,
        revokedTokens: revokedCount
      };
    } catch (error) {
      console.error('Error en logout global:', error);
      throw error;
    }
  }

  /**
   * Limpia refresh tokens expirados
   * @returns {number} Cantidad de tokens eliminados
   */
  async cleanupExpiredTokens() {
    try {
      const [result] = await pool.execute(
        `DELETE FROM refresh_tokens 
         WHERE expires_at < NOW() OR (revoked = TRUE AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY))`
      );

      console.log(`🧹 Limpieza de tokens: ${result.affectedRows} tokens eliminados`);
      return result.affectedRows;
    } catch (error) {
      console.error('Error limpiando tokens expirados:', error);
      throw new Error('Error al limpiar tokens expirados');
    }
  }
}

module.exports = AuthService;