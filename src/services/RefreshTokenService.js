const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const config = require('../config/config');

/**
 * RefreshTokenService - Servicio para manejo de refresh tokens y blacklist
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja refresh tokens y blacklist
 * - Open/Closed: Abierto para extensión (nuevos tipos de tokens)
 * - Liskov Substitution: Puede ser sustituido por otros servicios de token
 * - Interface Segregation: Métodos específicos para refresh tokens
 * - Dependency Inversion: Depende de abstracciones (db, config)
 */
class RefreshTokenService {
  constructor() {
    this.refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
  }

  /**
   * Genera un nuevo refresh token para un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<string>} Token de refresco generado
   */
  async generateRefreshToken(userId) {
    try {
      // Generar token único y seguro
      const token = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

      // Revocar tokens anteriores del usuario (opcional: mantener solo uno activo)
      await this._revokeUserRefreshTokens(userId);

      // Guardar en base de datos
      const query = `
        INSERT INTO refresh_tokens (token, usuario_id, expires_at)
        VALUES (?, ?, ?)
      `;
      
      await pool.execute(query, [token, userId, expiresAt]);

      return token;

    } catch (error) {
      throw new Error(`Error generando refresh token: ${error.message}`);
    }
  }

  /**
   * Valida un refresh token
   * @param {string} token - Token de refresco
   * @returns {Promise<Object>} Datos del token si es válido
   */
  async validateRefreshToken(token) {
    try {
      if (!token) {
        throw new Error('Token de refresco no proporcionado');
      }

      const query = `
        SELECT rt.*, u.id as user_id, u.email, u.es_administrador, u.estado
        FROM refresh_tokens rt
        INNER JOIN usuarios u ON rt.usuario_id = u.id
        WHERE rt.token = ? 
          AND rt.expires_at > NOW() 
          AND rt.is_revoked = FALSE
          AND u.estado = 1
      `;

      const [rows] = await pool.execute(query, [token]);

      if (rows.length === 0) {
        throw new Error('Token de refresco inválido o expirado');
      }

      return rows[0];

    } catch (error) {
      throw new Error(`Error validando refresh token: ${error.message}`);
    }
  }

  /**
   * Revoca un refresh token específico
   * @param {string} token - Token de refresco a revocar
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async revokeRefreshToken(token) {
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_revoked = TRUE, updated_at = NOW()
        WHERE token = ?
      `;

      const [result] = await pool.execute(query, [token]);
      return result.affectedRows > 0;

    } catch (error) {
      throw new Error(`Error revocando refresh token: ${error.message}`);
    }
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async revokeAllUserRefreshTokens(userId) {
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_revoked = TRUE, updated_at = NOW()
        WHERE usuario_id = ? AND is_revoked = FALSE
      `;

      const [result] = await pool.execute(query, [userId]);
      return result.affectedRows >= 0;

    } catch (error) {
      throw new Error(`Error revocando tokens del usuario: ${error.message}`);
    }
  }

  /**
   * Agrega un JWT a la blacklist (para logout)
   * @param {string} token - JWT token
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async blacklistJWT(token, userId) {
    try {
      // Decodificar token para obtener JTI y expiración
      const decoded = jwt.decode(token);
      if (!decoded) {
        throw new Error('Token JWT inválido');
      }

      // Generar JTI si no existe (usando hash del token)
      const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(decoded.exp * 1000); // exp está en segundos

      const query = `
        INSERT INTO token_blacklist (token_jti, usuario_id, expires_at)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `;

      await pool.execute(query, [jti, userId, expiresAt]);
      return true;

    } catch (error) {
      throw new Error(`Error agregando token a blacklist: ${error.message}`);
    }
  }

  /**
   * Verifica si un JWT está en la blacklist
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} True si está en blacklist
   */
  async isJWTBlacklisted(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) {
        return true; // Token inválido se considera blacklisted
      }

      const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');

      const query = `
        SELECT id FROM token_blacklist 
        WHERE token_jti = ? AND expires_at > NOW()
      `;

      const [rows] = await pool.execute(query, [jti]);
      return rows.length > 0;

    } catch (error) {
      // En caso de error, considerar como blacklisted por seguridad
      return true;
    }
  }

  /**
   * Limpia tokens expirados (mantenimiento)
   * @returns {Promise<Object>} Estadísticas de limpieza
   */
  async cleanExpiredTokens() {
    try {
      // Limpiar refresh tokens expirados
      const refreshQuery = `
        DELETE FROM refresh_tokens 
        WHERE expires_at < NOW() OR is_revoked = TRUE
      `;
      const [refreshResult] = await pool.execute(refreshQuery);

      // Limpiar blacklist expirada
      const blacklistQuery = `
        DELETE FROM token_blacklist 
        WHERE expires_at < NOW()
      `;
      const [blacklistResult] = await pool.execute(blacklistQuery);

      return {
        refreshTokensDeleted: refreshResult.affectedRows,
        blacklistEntriesDeleted: blacklistResult.affectedRows
      };

    } catch (error) {
      throw new Error(`Error limpiando tokens expirados: ${error.message}`);
    }
  }

  // Métodos privados

  /**
   * Revoca todos los refresh tokens activos de un usuario
   * @private
   * @param {number} userId - ID del usuario
   */
  async _revokeUserRefreshTokens(userId) {
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_revoked = TRUE, updated_at = NOW()
        WHERE usuario_id = ? AND is_revoked = FALSE AND expires_at > NOW()
      `;

      await pool.execute(query, [userId]);

    } catch (error) {
      // No lanzar error aquí, es una operación de limpieza
      console.warn(`Advertencia revocando tokens previos: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de tokens para un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas de tokens
   */
  async getUserTokenStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_tokens,
          SUM(CASE WHEN is_revoked = FALSE AND expires_at > NOW() THEN 1 ELSE 0 END) as active_tokens,
          SUM(CASE WHEN is_revoked = TRUE THEN 1 ELSE 0 END) as revoked_tokens,
          SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired_tokens
        FROM refresh_tokens 
        WHERE usuario_id = ?
      `;

      const [rows] = await pool.execute(query, [userId]);
      return rows[0] || {
        total_tokens: 0,
        active_tokens: 0,
        revoked_tokens: 0,
        expired_tokens: 0
      };

    } catch (error) {
      throw new Error(`Error obteniendo estadísticas de tokens: ${error.message}`);
    }
  }
}

module.exports = RefreshTokenService;