const FileRepository = require('../repositories/FileRepository');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * FileService - Servicio para gestión de archivos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja lógica de negocio de archivos
 * - Open/Closed: Abierto para extensión (nuevos métodos)
 * - Liskov Substitution: Puede ser sustituido por otros servicios
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (FileRepository)
 */
class FileService {
  constructor() {
    this.fileRepository = new FileRepository();
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB por defecto
    this.allowedExtensions = process.env.ALLOWED_EXTENSIONS?.split(',') || [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar'
    ];
  }

  /**
   * Obtener todos los archivos con paginación y filtros
   */
  async getAllFiles({ page = 1, limit = 10, filters = {}, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const files = await this.fileRepository.findAll({
        limit,
        offset,
        filters,
        userId,
        isAdmin
      });

      const total = await this.fileRepository.count(filters, userId, isAdmin);

      return {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en FileService.getAllFiles:', error);
      throw new Error('Error obteniendo archivos');
    }
  }

  /**
   * Obtener archivo por ID
   */
  async getFileById(id, userId = null, isAdmin = false) {
    try {
      const file = await this.fileRepository.findById(id);
      
      if (!file) {
        throw new Error('Archivo no encontrado');
      }

      // Verificar acceso si no es admin
      if (!isAdmin && userId) {
        const hasAccess = await this.fileRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes acceso a este archivo');
        }
      }

      return file;
    } catch (error) {
      console.error('Error en FileService.getFileById:', error);
      throw error;
    }
  }

  /**
   * Subir archivo
   */
  async uploadFile(fileData, uploadedBy, projectId = null, taskId = null) {
    try {
      // Validar tamaño del archivo
      if (fileData.size > this.maxFileSize) {
        throw new Error(`El archivo excede el tamaño máximo permitido (${this.maxFileSize / 1024 / 1024}MB)`);
      }

      // Validar extensión
      const fileExtension = path.extname(fileData.originalname).toLowerCase();
      if (!this.allowedExtensions.includes(fileExtension)) {
        throw new Error(`Tipo de archivo no permitido. Extensiones permitidas: ${this.allowedExtensions.join(', ')}`);
      }

      // Generar nombre único para el archivo
      const uniqueName = this.generateUniqueFileName(fileData.originalname);
      const filePath = path.join(this.uploadPath, uniqueName);

      // Asegurar que el directorio de uploads existe
      await this.ensureUploadDirectory();

      // Mover el archivo al directorio de uploads
      await fs.writeFile(filePath, fileData.buffer);

      // Calcular hash del archivo para detectar duplicados
      const fileHash = await this.calculateFileHash(filePath);

      // Verificar si ya existe un archivo con el mismo hash
      const existingFile = await this.fileRepository.findByHash(fileHash);
      if (existingFile) {
        // Eliminar el archivo duplicado
        await fs.unlink(filePath);
        throw new Error('Ya existe un archivo idéntico en el sistema');
      }

      // Guardar información del archivo en la base de datos
      const newFile = await this.fileRepository.create({
        nombre_original: fileData.originalname,
        nombre_archivo: uniqueName,
        ruta_archivo: filePath,
        tipo_mime: fileData.mimetype,
        tamaño: fileData.size,
        hash_archivo: fileHash,
        subido_por: uploadedBy,
        proyecto_id: projectId,
        tarea_id: taskId
      });

      return newFile;
    } catch (error) {
      console.error('Error en FileService.uploadFile:', error);
      throw error;
    }
  }

  /**
   * Descargar archivo
   */
  async downloadFile(id, userId = null, isAdmin = false) {
    try {
      const file = await this.getFileById(id, userId, isAdmin);

      // Verificar que el archivo físico existe
      const fileExists = await this.fileExists(file.ruta_archivo);
      if (!fileExists) {
        throw new Error('El archivo físico no existe en el servidor');
      }

      // Registrar la descarga
      await this.fileRepository.recordDownload(id, userId);

      return {
        filePath: file.ruta_archivo,
        originalName: file.nombre_original,
        mimeType: file.tipo_mime
      };
    } catch (error) {
      console.error('Error en FileService.downloadFile:', error);
      throw error;
    }
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(id, userId, isAdmin = false) {
    try {
      const file = await this.fileRepository.findById(id);
      if (!file) {
        throw new Error('Archivo no encontrado');
      }

      // Verificar permisos
      if (!isAdmin && file.subido_por !== userId) {
        // Verificar si tiene acceso al proyecto/tarea asociada
        const hasAccess = await this.fileRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para eliminar este archivo');
        }
      }

      // Eliminar archivo físico
      const fileExists = await this.fileExists(file.ruta_archivo);
      if (fileExists) {
        await fs.unlink(file.ruta_archivo);
      }

      // Eliminar registro de la base de datos
      await this.fileRepository.delete(id);

      return { message: 'Archivo eliminado correctamente' };
    } catch (error) {
      console.error('Error en FileService.deleteFile:', error);
      throw error;
    }
  }

  /**
   * Actualizar información del archivo
   */
  async updateFile(id, fileData, userId, isAdmin = false) {
    try {
      const existingFile = await this.fileRepository.findById(id);
      if (!existingFile) {
        throw new Error('Archivo no encontrado');
      }

      // Verificar permisos
      if (!isAdmin && existingFile.subido_por !== userId) {
        const hasAccess = await this.fileRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para actualizar este archivo');
        }
      }

      const updatedFile = await this.fileRepository.update(id, fileData);
      return updatedFile;
    } catch (error) {
      console.error('Error en FileService.updateFile:', error);
      throw error;
    }
  }

  /**
   * Obtener archivos por proyecto
   */
  async getFilesByProject(projectId, { page = 1, limit = 10, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const files = await this.fileRepository.findByProject(projectId, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.fileRepository.countByProject(projectId, userId, isAdmin);

      return {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en FileService.getFilesByProject:', error);
      throw new Error('Error obteniendo archivos del proyecto');
    }
  }

  /**
   * Obtener archivos por tarea
   */
  async getFilesByTask(taskId, { page = 1, limit = 10, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const files = await this.fileRepository.findByTask(taskId, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.fileRepository.countByTask(taskId, userId, isAdmin);

      return {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en FileService.getFilesByTask:', error);
      throw new Error('Error obteniendo archivos de la tarea');
    }
  }

  /**
   * Obtener archivos subidos por un usuario
   */
  async getFilesByUser(userId, { page = 1, limit = 10, filters = {} }) {
    try {
      const offset = (page - 1) * limit;
      
      const files = await this.fileRepository.findByUser(userId, {
        limit,
        offset,
        filters
      });

      const total = await this.fileRepository.countByUser(userId, filters);

      return {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en FileService.getFilesByUser:', error);
      throw new Error('Error obteniendo archivos del usuario');
    }
  }

  /**
   * Buscar archivos
   */
  async searchFiles(query, { page = 1, limit = 10, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const files = await this.fileRepository.search(query, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.fileRepository.countSearch(query, userId, isAdmin);

      return {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en FileService.searchFiles:', error);
      throw new Error('Error buscando archivos');
    }
  }

  /**
   * Obtener estadísticas de archivos
   */
  async getFileStats(userId = null, isAdmin = false, projectId = null) {
    try {
      const stats = await this.fileRepository.getFileStats(userId, isAdmin, projectId);
      return stats;
    } catch (error) {
      console.error('Error en FileService.getFileStats:', error);
      throw new Error('Error obteniendo estadísticas de archivos');
    }
  }

  /**
   * Obtener archivos recientes
   */
  async getRecentFiles(userId = null, isAdmin = false, limit = 10) {
    try {
      const files = await this.fileRepository.findRecent(limit, userId, isAdmin);
      return files;
    } catch (error) {
      console.error('Error en FileService.getRecentFiles:', error);
      throw new Error('Error obteniendo archivos recientes');
    }
  }

  /**
   * Obtener archivos por tipo MIME
   */
  async getFilesByType(mimeType, { page = 1, limit = 10, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const files = await this.fileRepository.findByMimeType(mimeType, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.fileRepository.countByMimeType(mimeType, userId, isAdmin);

      return {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en FileService.getFilesByType:', error);
      throw new Error('Error obteniendo archivos por tipo');
    }
  }

  /**
   * Limpiar archivos huérfanos (sin referencias en BD)
   */
  async cleanOrphanFiles() {
    try {
      const uploadFiles = await fs.readdir(this.uploadPath);
      const dbFiles = await this.fileRepository.getAllFileNames();
      
      const orphanFiles = uploadFiles.filter(file => !dbFiles.includes(file));
      
      for (const orphanFile of orphanFiles) {
        const filePath = path.join(this.uploadPath, orphanFile);
        await fs.unlink(filePath);
      }

      return {
        message: `${orphanFiles.length} archivos huérfanos eliminados`,
        deletedFiles: orphanFiles
      };
    } catch (error) {
      console.error('Error en FileService.cleanOrphanFiles:', error);
      throw new Error('Error limpiando archivos huérfanos');
    }
  }

  /**
   * Generar nombre único para el archivo
   */
  generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    return `${baseName}_${timestamp}_${randomString}${extension}`;
  }

  /**
   * Calcular hash del archivo
   */
  async calculateFileHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      console.error('Error calculando hash del archivo:', error);
      throw new Error('Error calculando hash del archivo');
    }
  }

  /**
   * Verificar si el archivo existe
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Asegurar que el directorio de uploads existe
   */
  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creando directorio de uploads:', error);
      throw new Error('Error creando directorio de uploads');
    }
  }

  /**
   * Obtener información del archivo sin contenido
   */
  async getFileInfo(id, userId = null, isAdmin = false) {
    try {
      const file = await this.getFileById(id, userId, isAdmin);
      
      // Verificar que el archivo físico existe
      const fileExists = await this.fileExists(file.ruta_archivo);
      
      return {
        ...file,
        existe_fisicamente: fileExists
      };
    } catch (error) {
      console.error('Error en FileService.getFileInfo:', error);
      throw error;
    }
  }

  /**
   * Mover archivo a proyecto/tarea
   */
  async moveFile(id, projectId = null, taskId = null, userId, isAdmin = false) {
    try {
      const file = await this.fileRepository.findById(id);
      if (!file) {
        throw new Error('Archivo no encontrado');
      }

      // Verificar permisos
      if (!isAdmin && file.subido_por !== userId) {
        const hasAccess = await this.fileRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para mover este archivo');
        }
      }

      const updatedFile = await this.fileRepository.update(id, {
        proyecto_id: projectId,
        tarea_id: taskId
      });

      return updatedFile;
    } catch (error) {
      console.error('Error en FileService.moveFile:', error);
      throw error;
    }
  }
}

module.exports = FileService;