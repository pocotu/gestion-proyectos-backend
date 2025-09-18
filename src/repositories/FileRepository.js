const BaseRepository = require('./BaseRepository');

/**
 * FileRepository - Repositorio para operaciones de archivos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones específicas de archivos
 * - Open/Closed: Extiende BaseRepository sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseRepository
 * - Interface Segregation: Métodos específicos para archivos
 * - Dependency Inversion: Depende de BaseRepository (abstracción)
 */
class FileRepository extends BaseRepository {
  constructor() {
    super('archivos');
  }

  /**
   * Crea un nuevo registro de archivo
   */
  async createFile(fileData) {
    const {
      proyecto_id = null,
      tarea_id = null,
      nombre_archivo,
      nombre_original,
      tipo = null,
      tamano_bytes = null,
      ruta_archivo,
      subido_por = null
    } = fileData;

    // Validaciones básicas
    if (!nombre_archivo || !nombre_original || !ruta_archivo) {
      throw new Error('Los campos nombre_archivo, nombre_original y ruta_archivo son obligatorios');
    }

    if (!proyecto_id && !tarea_id) {
      throw new Error('El archivo debe estar asociado a un proyecto o a una tarea');
    }

    return await this.insert({
      proyecto_id,
      tarea_id,
      nombre_archivo,
      nombre_original,
      tipo,
      tamano_bytes,
      ruta_archivo,
      subido_por,
      created_at: new Date()
    });
  }

  /**
   * Busca un archivo por ID con información relacionada
   */
  async findByIdWithDetails(id) {
    return await this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre,
        usuarios.email as subido_por_email
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .where('archivos.id', id)
      .first();
  }

  /**
   * Obtiene todos los archivos de un proyecto
   */
  async findByProject(proyecto_id) {
    return await this
      .select(`
        archivos.*,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre,
        usuarios.email as subido_por_email
      `)
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .where('archivos.proyecto_id', proyecto_id)
      .orderBy('archivos.created_at', 'DESC')
      .get();
  }

  /**
   * Obtiene todos los archivos de una tarea
   */
  async findByTask(tarea_id) {
    return await this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        usuarios.nombre as subido_por_nombre,
        usuarios.email as subido_por_email
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .where('archivos.tarea_id', tarea_id)
      .orderBy('archivos.created_at', 'DESC')
      .get();
  }

  /**
   * Obtiene archivos subidos por un usuario
   */
  async findByUser(usuario_id) {
    return await this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .where('archivos.subido_por', usuario_id)
      .orderBy('archivos.created_at', 'DESC')
      .get();
  }

  /**
   * Busca archivos por tipo
   */
  async findByType(tipo, proyecto_id = null) {
    let query = this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .where('archivos.tipo', tipo);

    if (proyecto_id) {
      query = query.where('archivos.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('archivos.created_at', 'DESC')
      .get();
  }

  /**
   * Busca archivos por nombre
   */
  async searchByName(searchTerm, proyecto_id = null) {
    let query = this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .where(function() {
        this.where('archivos.nombre_archivo', 'LIKE', `%${searchTerm}%`)
            .orWhere('archivos.nombre_original', 'LIKE', `%${searchTerm}%`);
      });

    if (proyecto_id) {
      query = query.where('archivos.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('archivos.created_at', 'DESC')
      .get();
  }

  /**
   * Obtiene archivos por rango de tamaño
   */
  async findBySizeRange(minSize = null, maxSize = null, proyecto_id = null) {
    let query = this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id');

    if (minSize !== null) {
      query = query.where('archivos.tamano_bytes', '>=', minSize);
    }

    if (maxSize !== null) {
      query = query.where('archivos.tamano_bytes', '<=', maxSize);
    }

    if (proyecto_id) {
      query = query.where('archivos.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('archivos.tamano_bytes', 'DESC')
      .get();
  }

  /**
   * Obtiene archivos por rango de fechas
   */
  async findByDateRange(startDate, endDate, proyecto_id = null) {
    let query = this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .whereBetween('archivos.created_at', [startDate, endDate]);

    if (proyecto_id) {
      query = query.where('archivos.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('archivos.created_at', 'DESC')
      .get();
  }

  /**
   * Obtiene estadísticas de archivos de un proyecto
   */
  async getProjectFileStats(proyecto_id) {
    const totalFiles = await this.where('proyecto_id', proyecto_id).count();
    
    const byType = await this.raw(`
      SELECT tipo, COUNT(*) as count, SUM(tamano_bytes) as total_size
      FROM archivos
      WHERE proyecto_id = ? AND tipo IS NOT NULL
      GROUP BY tipo
      ORDER BY count DESC
    `, [proyecto_id]);

    const sizeStats = await this.raw(`
      SELECT 
        COUNT(*) as total_files,
        SUM(tamano_bytes) as total_size,
        AVG(tamano_bytes) as avg_size,
        MAX(tamano_bytes) as max_size,
        MIN(tamano_bytes) as min_size
      FROM archivos
      WHERE proyecto_id = ? AND tamano_bytes IS NOT NULL
    `, [proyecto_id]);

    const recentFiles = await this
      .select('archivos.*, usuarios.nombre as subido_por_nombre')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .where('archivos.proyecto_id', proyecto_id)
      .orderBy('archivos.created_at', 'DESC')
      .limit(5)
      .get();

    return {
      totalFiles,
      byType: byType.map(item => ({
        tipo: item.tipo,
        count: item.count,
        totalSize: item.total_size || 0
      })),
      sizeStats: sizeStats[0] || {
        total_files: 0,
        total_size: 0,
        avg_size: 0,
        max_size: 0,
        min_size: 0
      },
      recentFiles
    };
  }

  /**
   * Obtiene estadísticas de archivos de un usuario
   */
  async getUserFileStats(usuario_id) {
    const totalFiles = await this.where('subido_por', usuario_id).count();
    
    const byType = await this.raw(`
      SELECT tipo, COUNT(*) as count, SUM(tamano_bytes) as total_size
      FROM archivos
      WHERE subido_por = ? AND tipo IS NOT NULL
      GROUP BY tipo
      ORDER BY count DESC
    `, [usuario_id]);

    const sizeStats = await this.raw(`
      SELECT 
        SUM(tamano_bytes) as total_size,
        AVG(tamano_bytes) as avg_size
      FROM archivos
      WHERE subido_por = ? AND tamano_bytes IS NOT NULL
    `, [usuario_id]);

    const projectDistribution = await this.raw(`
      SELECT p.titulo, COUNT(a.id) as file_count
      FROM archivos a
      INNER JOIN proyectos p ON a.proyecto_id = p.id
      WHERE a.subido_por = ?
      GROUP BY a.proyecto_id, p.titulo
      ORDER BY file_count DESC
      LIMIT 10
    `, [usuario_id]);

    return {
      totalFiles,
      byType: byType.map(item => ({
        tipo: item.tipo,
        count: item.count,
        totalSize: item.total_size || 0
      })),
      totalSize: sizeStats[0]?.total_size || 0,
      averageSize: sizeStats[0]?.avg_size || 0,
      projectDistribution
    };
  }

  /**
   * Obtiene los archivos más grandes
   */
  async getLargestFiles(limit = 10, proyecto_id = null) {
    let query = this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .whereNotNull('archivos.tamano_bytes');

    if (proyecto_id) {
      query = query.where('archivos.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('archivos.tamano_bytes', 'DESC')
      .limit(limit)
      .get();
  }

  /**
   * Obtiene archivos duplicados por nombre
   */
  async findDuplicateFiles(proyecto_id = null) {
    let baseQuery = `
      SELECT nombre_original, COUNT(*) as count, GROUP_CONCAT(id) as file_ids
      FROM archivos
    `;
    
    let params = [];
    if (proyecto_id) {
      baseQuery += ' WHERE proyecto_id = ?';
      params.push(proyecto_id);
    }
    
    baseQuery += `
      GROUP BY nombre_original
      HAVING count > 1
      ORDER BY count DESC
    `;

    return await this.raw(baseQuery, params);
  }

  /**
   * Mueve archivos de una tarea a otra
   */
  async moveFilesToTask(fileIds, newTaskId) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new Error('Se requiere un array de IDs de archivos');
    }

    return await this.whereIn('id', fileIds).update({
      tarea_id: newTaskId
    });
  }

  /**
   * Mueve archivos de un proyecto a otro
   */
  async moveFilesToProject(fileIds, newProjectId) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new Error('Se requiere un array de IDs de archivos');
    }

    return await this.whereIn('id', fileIds).update({
      proyecto_id: newProjectId,
      tarea_id: null // Limpiar la tarea al mover a otro proyecto
    });
  }

  /**
   * Actualiza la información de un archivo
   */
  async updateFileInfo(id, updateData) {
    const allowedFields = ['nombre_original', 'tipo', 'tamano_bytes'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    return await this.where('id', id).update(filteredData);
  }

  /**
   * Obtiene archivos huérfanos (sin proyecto ni tarea)
   */
  async findOrphanFiles() {
    return await this
      .select(`
        archivos.*,
        usuarios.nombre as subido_por_nombre
      `)
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .whereNull('archivos.proyecto_id')
      .whereNull('archivos.tarea_id')
      .orderBy('archivos.created_at', 'DESC')
      .get();
  }

  /**
   * Limpia archivos huérfanos antiguos
   */
  async cleanupOrphanFiles(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this
      .whereNull('proyecto_id')
      .whereNull('tarea_id')
      .where('created_at', '<', cutoffDate)
      .delete();
  }

  /**
   * Obtiene el uso de almacenamiento por proyecto
   */
  async getStorageUsageByProject() {
    return await this.raw(`
      SELECT 
        p.id,
        p.titulo,
        COUNT(a.id) as file_count,
        COALESCE(SUM(a.tamano_bytes), 0) as total_size
      FROM proyectos p
      LEFT JOIN archivos a ON p.id = a.proyecto_id
      GROUP BY p.id, p.titulo
      ORDER BY total_size DESC
    `);
  }

  /**
   * Obtiene archivos por extensión
   */
  async findByExtension(extension, proyecto_id = null) {
    // Normalizar la extensión
    const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
    
    let query = this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id')
      .where('archivos.nombre_original', 'LIKE', `%${normalizedExt}`);

    if (proyecto_id) {
      query = query.where('archivos.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('archivos.created_at', 'DESC')
      .get();
  }

  /**
   * Obtiene estadísticas generales de archivos
   */
  async getGeneralStatistics() {
    const totalFiles = await this.count();
    
    const sizeStats = await this.raw(`
      SELECT 
        COUNT(*) as files_with_size,
        SUM(tamano_bytes) as total_size,
        AVG(tamano_bytes) as avg_size,
        MAX(tamano_bytes) as max_size
      FROM archivos
      WHERE tamano_bytes IS NOT NULL
    `);

    const typeDistribution = await this.raw(`
      SELECT tipo, COUNT(*) as count
      FROM archivos
      WHERE tipo IS NOT NULL
      GROUP BY tipo
      ORDER BY count DESC
      LIMIT 10
    `);

    const uploadTrend = await this.raw(`
      SELECT 
        DATE(created_at) as upload_date,
        COUNT(*) as files_uploaded
      FROM archivos
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY upload_date DESC
    `);

    const topUploaders = await this.raw(`
      SELECT 
        u.nombre,
        u.email,
        COUNT(a.id) as files_uploaded,
        SUM(a.tamano_bytes) as total_size
      FROM usuarios u
      INNER JOIN archivos a ON u.id = a.subido_por
      GROUP BY u.id, u.nombre, u.email
      ORDER BY files_uploaded DESC
      LIMIT 10
    `);

    return {
      totalFiles,
      sizeStats: sizeStats[0] || {
        files_with_size: 0,
        total_size: 0,
        avg_size: 0,
        max_size: 0
      },
      typeDistribution,
      uploadTrend,
      topUploaders
    };
  }

  /**
   * Verifica si un archivo existe por ruta
   */
  async existsByPath(ruta_archivo) {
    return await this.where('ruta_archivo', ruta_archivo).exists();
  }

  /**
   * Obtiene archivos recientes
   */
  async getRecentFiles(limit = 20, proyecto_id = null) {
    let query = this
      .select(`
        archivos.*,
        proyectos.titulo as proyecto_titulo,
        tareas.titulo as tarea_titulo,
        usuarios.nombre as subido_por_nombre
      `)
      .leftJoin('proyectos', 'archivos.proyecto_id', 'proyectos.id')
      .leftJoin('tareas', 'archivos.tarea_id', 'tareas.id')
      .leftJoin('usuarios', 'archivos.subido_por', 'usuarios.id');

    if (proyecto_id) {
      query = query.where('archivos.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('archivos.created_at', 'DESC')
      .limit(limit)
      .get();
  }
}

module.exports = FileRepository;