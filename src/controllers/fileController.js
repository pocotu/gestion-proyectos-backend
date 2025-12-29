const FileService = require('../services/fileService');
const CloudinaryService = require('../services/cloudinaryService');
const config = require('../config/config');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

/**
 * FileController - Controlador para gestión de archivos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja requests HTTP de archivos
 * - Open/Closed: Abierto para extensión (nuevos endpoints)
 * - Liskov Substitution: Puede ser sustituido por otros controladores
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (FileService)
 */
class FileController {
  constructor() {
    this.fileService = new FileService();
    this.cloudinaryService = new CloudinaryService();
    this.setupMulter();
  }

  /**
   * Extraer tipo de archivo desde el nombre (SRP - Single Responsibility)
   * @param {string} filename - Nombre del archivo
   * @returns {string} - Tipo en mayúsculas (PDF, DOCX, TXT, etc.)
   */
  getFileTypeFromFilename(filename) {
    const extension = path.extname(filename).toLowerCase().replace('.', '');
    return extension.toUpperCase();
  }

  /**
   * Configurar multer para upload de archivos
   * Usando memoryStorage para Cloudinary (archivos en RAM temporalmente)
   */
  setupMulter() {
    // Usar memoryStorage en lugar de diskStorage para Cloudinary
    const storage = multer.memoryStorage();

    const fileFilter = (req, file, cb) => {
      // Tipos de archivo permitidos
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-rar-compressed'
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no permitido'), false);
      }
    };

    this.upload = multer({
      storage: storage,
      limits: {
        fileSize: config.MAX_FILE_SIZE,
        files: 5 // Máximo 5 archivos por request
      },
      fileFilter: fileFilter
    });
  }

  /**
   * Subir archivo a un proyecto
   * POST /api/projects/:id/files
   * Permisos: Admin o Responsable del proyecto
   */
  async uploadProjectFile(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;

      // Verificar que el proyecto existe
      const ProjectRepository = require('../repositories/ProjectRepository');
      const projectRepository = new ProjectRepository();
      const project = await projectRepository.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // Configurar almacenamiento específico para archivos de proyecto
      const path = require('path');
      const fs = require('fs').promises;
      const multer = require('multer');

      const projectStorage = multer.memoryStorage();

      const fileFilter = (req, file, cb) => {
        const allowedTypes = config.ALLOWED_MIME_TYPES || [
          'image/jpeg', 'image/png', 'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain', 'text/csv',
          'application/zip', 'application/x-rar-compressed'
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Tipo de archivo no permitido'), false);
        }
      };

      const projectUpload = multer({
        storage: projectStorage,
        limits: {
          fileSize: config.MAX_FILE_SIZE,
          files: 5
        },
        fileFilter: fileFilter
      });

      // Usar multer middleware para archivos de proyecto
      projectUpload.array('files', 5)(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                success: false,
                message: `El archivo es demasiado grande (máximo ${Math.round(config.MAX_FILE_SIZE / (1024 * 1024))}MB)`
              });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              return res.status(400).json({
                success: false,
                message: 'Demasiados archivos (máximo 5)'
              });
            }
          }
          return res.status(400).json({
            success: false,
            message: err.message || 'Error al subir archivo'
          });
        }

        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No se proporcionaron archivos'
          });
        }

        try {
          const uploadedFiles = [];
          const FileRepository = require('../repositories/FileRepository');
          const fileRepository = new FileRepository();

          for (const file of req.files) {
            // Extraer tipo inline (sin 'this' porque estamos en callback)
            const extension = path.extname(file.originalname).toLowerCase().replace('.', '');
            const tipo = extension.toUpperCase();

            // Subir a Cloudinary
            const cloudinaryResult = await this.cloudinaryService.uploadFile(file.buffer, {
              folder: `gestion-proyectos/project-${projectId}`,
              originalName: file.originalname,
              resourceType: this.cloudinaryService.getResourceType(file.mimetype)
            });

            const fileData = {
              nombre_original: file.originalname,
              nombre_archivo: cloudinaryResult.public_id, // Guardar public_id en nombre_archivo
              ruta_archivo: cloudinaryResult.url, // URL de Cloudinary
              tipo_mime: file.mimetype,
              tipo: tipo,
              tamano_bytes: file.size,
              proyecto_id: projectId,
              tarea_id: null,
              subido_por: userId
            };

            const savedFile = await fileRepository.createFile(fileData);
            uploadedFiles.push(savedFile);
          }

          res.status(201).json({
            success: true,
            message: `${uploadedFiles.length} archivo(s) subido(s) exitosamente al proyecto`,
            data: { files: uploadedFiles }
          });

        } catch (error) {
          console.error('Error guardando archivos del proyecto:', error);

          // Ya no necesitamos limpiar archivos locales (están en Cloudinary)

          res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
          });
        }
      });

    } catch (error) {
      console.error('Error en upload de archivo de proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Subir archivo a una tarea
   * POST /api/files/upload/:taskId
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async uploadFile(req, res) {
    try {
      const taskId = parseInt(req.params.taskId);
      const userId = req.user.id;

      // Verificar que la tarea existe usando TaskRepository
      const TaskRepository = require('../repositories/TaskRepository');
      const taskRepository = new TaskRepository();
      const task = await taskRepository.findById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      // Usar multer middleware
      this.upload.array('files', 5)(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                success: false,
                message: `El archivo es demasiado grande (máximo ${Math.round(config.MAX_FILE_SIZE / (1024 * 1024))}MB)`
              });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              return res.status(400).json({
                success: false,
                message: 'Demasiados archivos (máximo 5)'
              });
            }
          }
          return res.status(400).json({
            success: false,
            message: err.message || 'Error al subir archivo'
          });
        }

        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No se proporcionaron archivos'
          });
        }

        try {
          const uploadedFiles = [];
          const FileRepository = require('../repositories/FileRepository');
          const fileRepository = new FileRepository();

          for (const file of req.files) {
            // Extraer tipo inline (sin 'this' porque estamos en callback)
            const extension = path.extname(file.originalname).toLowerCase().replace('.', '');
            const tipo = extension.toUpperCase();

            // Subir a Cloudinary
            const cloudinaryResult = await this.cloudinaryService.uploadFile(file.buffer, {
              folder: `gestion-proyectos/task-${taskId}`,
              originalName: file.originalname,
              resourceType: this.cloudinaryService.getResourceType(file.mimetype)
            });

            const fileData = {
              nombre_original: file.originalname,
              nombre_archivo: cloudinaryResult.public_id, // Guardar public_id
              ruta_archivo: cloudinaryResult.url, // URL de Cloudinary
              tipo_mime: file.mimetype,
              tipo: tipo,
              tamano_bytes: file.size,
              proyecto_id: null,
              tarea_id: taskId,
              subido_por: userId
            };

            const savedFile = await fileRepository.createFile(fileData);
            uploadedFiles.push(savedFile);
          }

          res.status(201).json({
            success: true,
            message: `${uploadedFiles.length} archivo(s) subido(s) exitosamente`,
            data: { files: uploadedFiles }
          });

        } catch (error) {
          console.error('Error guardando archivos:', error);

          // Limpiar archivos subidos en caso de error
          for (const file of req.files) {
            try {
              await fs.unlink(file.path);
            } catch (unlinkError) {
              console.error('Error eliminando archivo:', unlinkError);
            }
          }

          res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
          });
        }
      });

    } catch (error) {
      console.error('Error en upload de archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener archivos de una tarea
   * GET /api/files/task/:taskId
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async getTaskFiles(req, res) {
    try {
      const taskId = parseInt(req.params.taskId);

      // El middleware ya verificó los permisos
      const FileRepository = require('../repositories/FileRepository');
      const fileRepository = new FileRepository();

      const files = await fileRepository.findByTask(taskId);

      res.json({
        success: true,
        data: { files }
      });

    } catch (error) {
      console.error('Error obteniendo archivos de la tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener todos los archivos accesibles para el usuario autenticado
   * GET /api/files
   * Permisos: Usuario autenticado (archivos filtrados por permisos)
   */
  async getAllFilesForUser(req, res) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;
      const { search, tipo, tipo_entidad, entidad_id } = req.query;

      const { pool } = require('../config/db');

      let files = [];

      // Obtener archivos de proyectos
      const projectWhereConditions = [];
      const projectParams = [];

      if (tipo) {
        projectWhereConditions.push('tipo = ?');
        projectParams.push(tipo);
      }
      if (entidad_id && tipo_entidad === 'proyecto') {
        projectWhereConditions.push('proyecto_id = ?');
        projectParams.push(entidad_id);
      }
      if (!isAdmin) {
        projectWhereConditions.push('subido_por = ?');
        projectParams.push(userId);
      }

      const projectWhere = projectWhereConditions.length > 0
        ? 'WHERE ' + projectWhereConditions.join(' AND ')
        : '';

      const [projectFiles] = await pool.execute(`
        SELECT 
          id,
          nombre_archivo,
          nombre_original,
          tipo,
          tamaño_bytes,
          ruta_archivo,
          subido_por,
          proyecto_id,
          NULL as tarea_id,
          created_at
        FROM archivos_proyecto
        ${projectWhere}
        ORDER BY created_at DESC
        LIMIT 100
      `, projectParams);

      // Obtener archivos de tareas
      const taskWhereConditions = [];
      const taskParams = [];

      if (tipo) {
        taskWhereConditions.push('tipo = ?');
        taskParams.push(tipo);
      }
      if (entidad_id && tipo_entidad === 'tarea') {
        taskWhereConditions.push('tarea_id = ?');
        taskParams.push(entidad_id);
      }
      if (!isAdmin) {
        taskWhereConditions.push('subido_por = ?');
        taskParams.push(userId);
      }

      const taskWhere = taskWhereConditions.length > 0
        ? 'WHERE ' + taskWhereConditions.join(' AND ')
        : '';

      const [taskFiles] = await pool.execute(`
        SELECT 
          id,
          nombre_archivo,
          nombre_original,
          tipo,
          tamaño_bytes,
          ruta_archivo,
          subido_por,
          NULL as proyecto_id,
          tarea_id,
          created_at
        FROM archivos_tarea
        ${taskWhere}
        ORDER BY created_at DESC
        LIMIT 100
      `, taskParams);

      // Combinar archivos
      files = [...projectFiles, ...taskFiles];

      // Ordenar por fecha (más recientes primero)
      files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Filtrar por búsqueda si se proporciona
      if (search) {
        const searchLower = search.toLowerCase();
        files = files.filter(f =>
          f.nombre_original?.toLowerCase().includes(searchLower) ||
          f.nombre_archivo?.toLowerCase().includes(searchLower)
        );
      }

      res.json({
        success: true,
        data: files,
        files: files // Compatibilidad con ambos formatos
      });

    } catch (error) {
      console.error('Error obteniendo archivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Descargar archivo
   * GET /api/files/download/:fileId
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async downloadFile(req, res) {
    try {
      const fileId = parseInt(req.params.fileId);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Buscar archivo en ambas tablas (proyecto y tarea)
      const { pool } = require('../config/db');
      let file = null;

      // Buscar en archivos_proyecto
      const [projectFiles] = await pool.execute(
        'SELECT * FROM archivos_proyecto WHERE id = ?',
        [fileId]
      );

      if (projectFiles.length > 0) {
        file = projectFiles[0];
      } else {
        // Buscar en archivos_tarea
        const [taskFiles] = await pool.execute(
          'SELECT * FROM archivos_tarea WHERE id = ?',
          [fileId]
        );

        if (taskFiles.length > 0) {
          file = taskFiles[0];
        }
      }

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      // Verificar permisos
      if (!isAdmin && file.subido_por !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este archivo'
        });
      }

      // Si ruta_archivo es URL de Cloudinary, hacer proxy streaming
      if (file.ruta_archivo && file.ruta_archivo.startsWith('http')) {
        try {
          const axios = require('axios');

          // Configurar headers antes de streamear
          res.setHeader('Content-Disposition', `attachment; filename="${file.nombre_original}"`);
          res.setHeader('Content-Type', file.tipo_mime || 'application/octet-stream');

          // Streamear desde Cloudinary al cliente
          const response = await axios({
            method: 'get',
            url: file.ruta_archivo,
            responseType: 'stream'
          });

          // Pipe el stream al response
          response.data.pipe(res);
          return;
        } catch (cloudError) {
          console.error('Error streaming from Cloudinary:', cloudError);
          return res.status(500).json({
            success: false,
            message: 'Error descargando archivo'
          });
        }
      }

      // Fallback: archivo local
      try {
        await fs.access(file.ruta_archivo);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Archivo físico no encontrado'
        });
      }

      // Configurar headers para descarga
      res.setHeader('Content-Disposition', `attachment; filename="${file.nombre_original}"`);
      res.setHeader('Content-Type', file.tipo_mime || 'application/octet-stream');

      // Enviar archivo
      res.sendFile(path.resolve(file.ruta_archivo));

    } catch (error) {
      console.error('Error descargando archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar archivo
   * DELETE /api/files/:fileId
   * Permisos: Admin, Responsable del proyecto, o usuario que subió el archivo
   */
  async deleteFile(req, res) {
    try {
      const fileId = parseInt(req.params.fileId);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const file = await this.fileService.getFileById(fileId);

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      // Verificar permisos de eliminación
      if (!isAdmin) {
        // Puede eliminar si es el usuario que subió el archivo
        if (file.subido_por === userId) {
          // Permitir eliminación
        } else {
          // O si es responsable del proyecto
          const canManageProject = await this.fileService.userCanManageTaskProject(userId, file.tarea_id);
          if (!canManageProject) {
            return res.status(403).json({
              success: false,
              message: 'No tienes permisos para eliminar este archivo'
            });
          }
        }
      }

      // Eliminar archivo físico
      try {
        await fs.unlink(file.ruta_archivo);
      } catch (error) {
        console.error('Error eliminando archivo físico:', error);
        // Continuar con la eliminación de la base de datos
      }

      // Eliminar registro de la base de datos
      const deleted = await this.fileService.deleteFile(fileId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener información de un archivo
   * GET /api/files/:fileId
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async getFileInfo(req, res) {
    try {
      const fileId = parseInt(req.params.fileId);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const file = await this.fileService.getFileById(fileId);

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      // Verificar permisos sobre la tarea del archivo
      if (!isAdmin) {
        const hasAccess = await this.fileService.userHasAccessToTask(userId, file.tarea_id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a este archivo'
          });
        }
      }

      res.json({
        success: true,
        data: { file }
      });

    } catch (error) {
      console.error('Error obteniendo información del archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener archivos subidos por el usuario actual
   * GET /api/files/my-files
   * Permisos: Usuario autenticado (sus propios archivos)
   */
  async getMyFiles(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, tarea_id } = req.query;

      const filters = { subido_por: userId };
      if (tarea_id) filters.tarea_id = parseInt(tarea_id);

      const result = await this.fileService.getFilesByUser(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error obteniendo archivos del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de archivos
   * GET /api/files/stats
   * Permisos: Admin, o estadísticas filtradas por acceso del usuario
   */
  async getFileStats(req, res) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const stats = await this.fileService.getFileStatistics(userId, isAdmin);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de archivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar información de archivo
   * PUT /api/files/:fileId
   * Permisos: Admin, Responsable del proyecto, o usuario que subió el archivo
   */
  async updateFileInfo(req, res) {
    try {
      const fileId = parseInt(req.params.fileId);
      const { descripcion } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const file = await this.fileService.getFileById(fileId);

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      // Verificar permisos de edición
      if (!isAdmin) {
        // Puede editar si es el usuario que subió el archivo
        if (file.subido_por === userId) {
          // Permitir edición
        } else {
          // O si es responsable del proyecto
          const canManageProject = await this.fileService.userCanManageTaskProject(userId, file.tarea_id);
          if (!canManageProject) {
            return res.status(403).json({
              success: false,
              message: 'No tienes permisos para editar este archivo'
            });
          }
        }
      }

      const updateData = {};
      if (descripcion !== undefined) {
        updateData.descripcion = descripcion.trim();
      }

      const updatedFile = await this.fileService.updateFile(fileId, updateData);

      res.json({
        success: true,
        message: 'Información del archivo actualizada exitosamente',
        data: { file: updatedFile }
      });

    } catch (error) {
      console.error('Error actualizando información del archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = FileController;