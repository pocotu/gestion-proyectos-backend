const UserSettingsModel = require('../models/UserSettingsModel');

/**
 * UserSettingsService - Servicio para configuraciones de usuario
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja lógica de negocio de configuraciones
 * - Open/Closed: Abierto para extensión (nuevas validaciones)
 * - Liskov Substitution: Puede ser sustituido por otros servicios
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (UserSettingsModel)
 */
class UserSettingsService {
  constructor() {
    this.userSettingsModel = new UserSettingsModel();
  }

  /**
   * Obtener configuraciones de usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} Configuraciones del usuario
   */
  async getUserSettings(userId) {
    try {
      if (!userId || userId <= 0) {
        throw new Error('ID de usuario inválido');
      }

      const settings = await this.userSettingsModel.getByUserId(userId);
      return settings;
    } catch (error) {
      console.error('Error en UserSettingsService.getUserSettings:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuraciones de usuario
   * @param {number} userId - ID del usuario
   * @param {Object} settings - Configuraciones a actualizar
   * @returns {Object} Configuraciones actualizadas
   */
  async updateUserSettings(userId, settings) {
    try {
      if (!userId || userId <= 0) {
        throw new Error('ID de usuario inválido');
      }

      // Validar configuraciones
      this._validateSettings(settings);

      // Obtener configuraciones actuales
      const currentSettings = await this.userSettingsModel.getByUserId(userId);
      
      // Fusionar configuraciones
      const mergedSettings = this._mergeSettings(currentSettings, settings);

      // Guardar configuraciones actualizadas
      const updatedSettings = await this.userSettingsModel.upsert(userId, mergedSettings);
      
      return updatedSettings;
    } catch (error) {
      console.error('Error en UserSettingsService.updateUserSettings:', error);
      throw error;
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
      if (!userId || userId <= 0) {
        throw new Error('ID de usuario inválido');
      }

      if (!key || typeof key !== 'string') {
        throw new Error('Clave de configuración inválida');
      }

      // Validar configuración específica
      this._validateSingleSetting(key, value);

      const updatedSettings = await this.userSettingsModel.updateSetting(userId, key, value);
      return updatedSettings;
    } catch (error) {
      console.error('Error en UserSettingsService.updateSetting:', error);
      throw error;
    }
  }

  /**
   * Restablecer configuraciones a valores por defecto
   * @param {number} userId - ID del usuario
   * @returns {Object} Configuraciones por defecto
   */
  async resetToDefaults(userId) {
    try {
      if (!userId || userId <= 0) {
        throw new Error('ID de usuario inválido');
      }

      // Eliminar configuraciones existentes
      await this.userSettingsModel.deleteByUserId(userId);
      
      // Obtener configuraciones por defecto
      const defaultSettings = await this.userSettingsModel.getByUserId(userId);
      
      return defaultSettings;
    } catch (error) {
      console.error('Error en UserSettingsService.resetToDefaults:', error);
      throw error;
    }
  }

  /**
   * Validar configuraciones
   * @private
   */
  _validateSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Configuraciones inválidas');
    }

    // Validar tema
    if (settings.theme && !['light', 'dark'].includes(settings.theme)) {
      throw new Error('Tema inválido. Debe ser "light" o "dark"');
    }

    // Validar idioma
    if (settings.language && !['es', 'en'].includes(settings.language)) {
      throw new Error('Idioma inválido. Debe ser "es" o "en"');
    }

    // Validar notificaciones
    if (settings.notifications) {
      this._validateNotificationSettings(settings.notifications);
    }

    // Validar dashboard
    if (settings.dashboard) {
      this._validateDashboardSettings(settings.dashboard);
    }

    // Validar privacidad
    if (settings.privacy) {
      this._validatePrivacySettings(settings.privacy);
    }
  }

  /**
   * Validar configuración específica
   * @private
   */
  _validateSingleSetting(key, value) {
    switch (key) {
      case 'theme':
        if (!['light', 'dark'].includes(value)) {
          throw new Error('Tema inválido');
        }
        break;
      case 'language':
        if (!['es', 'en'].includes(value)) {
          throw new Error('Idioma inválido');
        }
        break;
      default:
        // Permitir otras configuraciones sin validación específica
        break;
    }
  }

  /**
   * Validar configuraciones de notificaciones
   * @private
   */
  _validateNotificationSettings(notifications) {
    const validKeys = ['email', 'push', 'taskReminders', 'projectUpdates'];
    
    for (const key in notifications) {
      if (!validKeys.includes(key)) {
        throw new Error(`Configuración de notificación inválida: ${key}`);
      }
      
      if (typeof notifications[key] !== 'boolean') {
        throw new Error(`El valor de ${key} debe ser booleano`);
      }
    }
  }

  /**
   * Validar configuraciones de dashboard
   * @private
   */
  _validateDashboardSettings(dashboard) {
    if (dashboard.showCompletedTasks !== undefined && typeof dashboard.showCompletedTasks !== 'boolean') {
      throw new Error('showCompletedTasks debe ser booleano');
    }

    if (dashboard.tasksPerPage !== undefined) {
      const tasksPerPage = parseInt(dashboard.tasksPerPage);
      if (isNaN(tasksPerPage) || tasksPerPage < 5 || tasksPerPage > 100) {
        throw new Error('tasksPerPage debe ser un número entre 5 y 100');
      }
    }

    if (dashboard.defaultView && !['list', 'grid', 'kanban'].includes(dashboard.defaultView)) {
      throw new Error('defaultView debe ser "list", "grid" o "kanban"');
    }
  }

  /**
   * Validar configuraciones de privacidad
   * @private
   */
  _validatePrivacySettings(privacy) {
    const validKeys = ['profileVisible', 'showEmail', 'showPhone'];
    
    for (const key in privacy) {
      if (!validKeys.includes(key)) {
        throw new Error(`Configuración de privacidad inválida: ${key}`);
      }
      
      if (typeof privacy[key] !== 'boolean') {
        throw new Error(`El valor de ${key} debe ser booleano`);
      }
    }
  }

  /**
   * Fusionar configuraciones
   * @private
   */
  _mergeSettings(currentSettings, newSettings) {
    const merged = { ...currentSettings };

    // Fusionar configuraciones de primer nivel
    for (const key in newSettings) {
      if (typeof newSettings[key] === 'object' && newSettings[key] !== null && !Array.isArray(newSettings[key])) {
        // Fusionar objetos anidados
        merged[key] = {
          ...merged[key],
          ...newSettings[key]
        };
      } else {
        // Reemplazar valores primitivos
        merged[key] = newSettings[key];
      }
    }

    // Eliminar campos internos
    delete merged.updated_at;

    return merged;
  }
}

module.exports = UserSettingsService;