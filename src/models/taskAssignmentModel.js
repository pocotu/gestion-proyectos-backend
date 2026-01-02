const { pool } = require('../config/db');
const logger = require('../config/logger');

/**
 * TaskAssignmentModel - Modelo para asignaciones de tareas
 * Tabla intermedia para relación muchos-a-muchos entre tareas y usuarios
 */
class TaskAssignmentModel {
  /**
   * Crea la tabla tarea_asignaciones si no existe
   */
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS tarea_asignaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tarea_id INT NOT NULL,
        usuario_id INT NOT NULL,
        rol_asignacion ENUM('responsable_principal', 'colaborador', 'revisor') DEFAULT 'colaborador',
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        asignado_por INT,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
        UNIQUE KEY unique_tarea_usuario (tarea_id, usuario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    try {
      console.log('🔧 [TASK-ASSIGNMENT-MODEL] Ejecutando CREATE TABLE tarea_asignaciones...');
      await pool.execute(sql);
      console.log('✅ [TASK-ASSIGNMENT-MODEL] Tabla tarea_asignaciones creada/verificada');
      logger.info('Table tarea_asignaciones created/verified successfully');
    } catch (error) {
      console.error('❌ [TASK-ASSIGNMENT-MODEL] Error creando tabla tarea_asignaciones:', error.message);
      logger.error('Error creating tarea_asignaciones table:', error);
      throw error;
    }
  }

  /**
   * Crea índices para la tabla
   */
  static async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tarea_asignaciones_tarea ON tarea_asignaciones(tarea_id)',
      'CREATE INDEX IF NOT EXISTS idx_tarea_asignaciones_usuario ON tarea_asignaciones(usuario_id)'
    ];

    try {
      for (const indexSql of indexes) {
        await pool.execute(indexSql);
      }
      console.log('✅ [TASK-ASSIGNMENT-MODEL] Índices creados');
      logger.info('Indexes for tarea_asignaciones created successfully');
    } catch (error) {
      console.error('❌ [TASK-ASSIGNMENT-MODEL] Error creando índices:', error.message);
      logger.error('Error creating indexes for tarea_asignaciones:', error);
      // No lanzar error, los índices no son críticos
    }
  }
}

module.exports = TaskAssignmentModel;
