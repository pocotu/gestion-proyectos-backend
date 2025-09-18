const { pool } = require('../config/db');

/**
 * UserSettingsModel - Modelo para configuraciones de usuario
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja configuraciones de usuario
 * - Open/Closed: Abierto para extensión (nuevas configuraciones)
 * - Liskov Substitution: Puede ser sustituido por otros modelos
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (database)
 */
class UserSettingsModel {
  constructor() {
    this.tableName = 'configuraciones_usuario';
  }

  /**
   * Obtener configuraciones de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} Configuraciones del usuario
   */
  async getByUserId(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM ${this.tableName} WHERE usuario_id = ?`,
        [userId]
      );

      if (rows.length === 0) {
        // Retornar configuraciones por defecto si no existen
        return this._getDefaultSettings();
      }

      return this._parseSettings(rows[0]);
    } catch (error) {
      throw new Error(`Error obteniendo configuraciones: ${error.message}`);
    }
  }

  /**
   * Crear o actualizar configuraciones de usuario
   * @param {number} userId - ID del usuario
   * @param {Object} settings - Configuraciones a guardar
   * @returns {Object} Configuraciones actualizadas
   */
  async upsert(userId, settings) {
    try {
      const settingsJson = JSON.stringify(settings);
      
      const [result] = await pool.execute(
        `INSERT INTO ${this.tableName} (usuario_id, configuraciones, updated_at) 
         VALUES (?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE 
         configuraciones = VALUES(configuraciones), 
         updated_at = NOW()`,
        [userId, settingsJson]
      );

      return await this.getByUserId(userId);
    } catch (error) {
      throw new Error(`Error guardando configuraciones: ${error.message}`);
    }
  }

  /**
   * Actualizar configuración específica
   * @param {number} userId - ID del usuario
   * @param {string} key - Clave de la configuración
   * @param {*} value - Valor de la configuración
   * @returns {Object} Configuraciones actualizadas
   */
  async updateSetting(userId, key, value) {
    try {
      const currentSettings = await this.getByUserId(userId);
      currentSettings[key] = value;
      
      return await this.upsert(userId, currentSettings);
    } catch (error) {
      throw new Error(`Error actualizando configuración: ${error.message}`);
    }
  }

  /**
   * Eliminar configuraciones de usuario
   * @param {number} userId - ID del usuario
   * @returns {boolean} Éxito de la operación
   */
  async deleteByUserId(userId) {
    try {
      const [result] = await pool.execute(
        `DELETE FROM ${this.tableName} WHERE usuario_id = ?`,
        [userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error eliminando configuraciones: ${error.message}`);
    }
  }

  /**
   * Configuraciones por defecto
   * @private
   */
  _getDefaultSettings() {
    return {
      theme: 'light',
      language: 'es',
      notifications: {
        email: true,
        push: true,
        taskReminders: true,
        projectUpdates: true
      },
      dashboard: {
        showCompletedTasks: false,
        tasksPerPage: 10,
        defaultView: 'list'
      },
      privacy: {
        profileVisible: true,
        showEmail: false,
        showPhone: false
      }
    };
  }

  /**
   * Parsear configuraciones desde JSON
   * @private
   */
  _parseSettings(row) {
    try {
      const settings = JSON.parse(row.configuraciones);
      return {
        ...this._getDefaultSettings(),
        ...settings,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error parseando configuraciones:', error);
      return this._getDefaultSettings();
    }
  }
}

module.exports = UserSettingsModel;