const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const BaseRepository = require('../repositories/BaseRepository');

/**
 * RefreshTokenService - Servicio para manejo de refresh tokens
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja refresh tokens
 * - Open/Closed: Abierto para extensión (nuevos tipos de tokens)
 * - Liskov Substitution: Puede ser sustituido por otros servicios de tokens
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones de base de datos
 */
class RefreshTokenService {
  constructor() {
    this.baseRepository = new BaseRepository();
  }

  /**
   * Genera un nuevo refresh token para un usuario
   */
  async generateRefreshToken(userId) {
    try {
      // Generar token único
      const token = crypto.randomBytes(64).toString('hex');
      
      // Configurar expiración (configurable)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.REFRESH_TOKEN_EXPIRY_DAYS);

      // Usar conexión directa para evitar problemas con el query builder
      const { pool } = require('../config/db');
      await pool.execute(
        'INSERT INTO refresh_tokens (token, usuario_id, expires_at, created_at) VALUES (?, ?, ?, NOW())',
        [token, userId, expiresAt]
      );

      return token;

    } catch (error) {
      throw new Error(`Error generando refresh token: ${error.message}`);
    }
  }

  /**
   * Valida un refresh token
   */
  async validateRefreshToken(token) {
    try {
      if (!token) {
        throw new Error('Token de refresco requerido');
      }

      // Usar conexión directa para evitar problemas con el query builder
      const { pool } = require('../config/db');
      const [rows] = await pool.execute(
        'SELECT * FROM refresh_tokens WHERE token = ? AND is_revoked = 0 AND expires_at > NOW()',
        [token]
      );

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
   */
  async revokeRefreshToken(token) {
    try {
      // Usar conexión directa para evitar problemas con el query builder
      const { pool } = require('../config/db');
      const [result] = await pool.execute(
        'UPDATE refresh_tokens SET is_revoked = 1, updated_at = NOW() WHERE token = ?',
        [token]
      );

      return result.affectedRows > 0;

    } catch (error) {
      throw new Error(`Error revocando refresh token: ${error.message}`);
    }
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   */
  async revokeAllUserRefreshTokens(userId) {
    try {
      // Marcar todos los tokens del usuario como revocados usando query builder
      const result = await this.baseRepository.db('refresh_tokens')
        .where('usuario_id', userId)
        .update({ revoked: true });

      return result;

    } catch (error) {
      throw new Error(`Error revocando tokens del usuario: ${error.message}`);
    }
  }

  /**
   * Añade un JWT a la blacklist
   */
  async blacklistJWT(token, userId) {
    try {
      // Decodificar el token para obtener información
      const decoded = jwt.decode(token);
      const jti = decoded?.jti || crypto.randomUUID();
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + config.JWT_BLACKLIST_FALLBACK_HOURS * 60 * 60 * 1000);

      // Usar conexión directa para evitar problemas con el query builder
      const { pool } = require('../config/db');
      await pool.execute(`
        INSERT INTO token_blacklist (token_jti, usuario_id, expires_at, created_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        usuario_id = VALUES(usuario_id),
        expires_at = VALUES(expires_at)
      `, [jti, userId, expiresAt]);

    } catch (error) {
      throw new Error(`Error añadiendo token a blacklist: ${error.message}`);
    }
  }

  /**
   * Verifica si un JWT está en la blacklist
   */
  async isJWTBlacklisted(token) {
    try {
      const decoded = jwt.decode(token);
      const jti = decoded?.jti;

      if (!jti) {
        return false;
      }

      // Usar conexión directa para evitar problemas con el query builder
      const { pool } = require('../config/db');
      const [rows] = await pool.execute(
        'SELECT 1 FROM token_blacklist WHERE token_jti = ? AND expires_at > NOW()',
        [jti]
      );

      return rows.length > 0;

    } catch (error) {
      console.error('Error verificando blacklist:', error);
      return false;
    }
  }

  /**
   * Limpia tokens expirados de la base de datos
   */
  async cleanExpiredTokens() {
    try {
      // Usar conexión directa para evitar problemas con el query builder
      const { pool } = require('../config/db');
      
      // Limpiar refresh tokens expirados
      const [refreshResult] = await pool.execute(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
      );

      // Limpiar tokens blacklisteados expirados
      const [blacklistResult] = await pool.execute(
        'DELETE FROM token_blacklist WHERE expires_at < NOW()'
      );

      return {
        refreshTokensDeleted: refreshResult.affectedRows,
        blacklistedTokensDeleted: blacklistResult.affectedRows
      };

    } catch (error) {
      throw new Error(`Error limpiando tokens expirados: ${error.message}`);
    }
  }

  /**
   * Revoca todos los refresh tokens de un usuario (método interno)
   */
  async _revokeUserRefreshTokens(userId) {
    try {
      // Usar conexión directa para evitar problemas con el query builder
      const { pool } = require('../config/db');
      await pool.execute(
        'UPDATE refresh_tokens SET is_revoked = 1, updated_at = NOW() WHERE usuario_id = ?',
        [userId]
      );

    } catch (error) {
      throw new Error(`Error revocando tokens del usuario: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de tokens de un usuario
   */
  async getUserTokenStats(userId) {
    try {
      // Obtener estadísticas usando query builder
      const [stats] = await this.baseRepository.db('refresh_tokens')
        .select(
          this.baseRepository.db.raw('COUNT(*) as total'),
          this.baseRepository.db.raw('SUM(CASE WHEN revoked = false AND expires_at > NOW() THEN 1 ELSE 0 END) as active'),
          this.baseRepository.db.raw('SUM(CASE WHEN revoked = true THEN 1 ELSE 0 END) as revoked'),
          this.baseRepository.db.raw('SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired')
        )
        .where('usuario_id', userId);

      return stats;

    } catch (error) {
      throw new Error(`Error obteniendo estadísticas de tokens: ${error.message}`);
    }
  }
}

module.exports = RefreshTokenService;