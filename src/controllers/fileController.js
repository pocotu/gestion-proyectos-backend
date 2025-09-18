const FileService = require('../services/fileService');
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
    this.setupMulter();
  }

  /**
   * Configurar multer para upload de archivos
   */
  setupMulter() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'tasks');
        try {
          await fs.mkdir(uploadPath, { recursive: true });
          cb(null, uploadPath);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        cb(null, `${baseName}-${uniqueSuffix}${extension}`);
      }
    });

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
   * Subir archivo a una tarea
   * POST /api/files/upload/:taskId
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async uploadFile(req, res) {
    try {
      const taskId = parseInt(req.params.taskId);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar permisos sobre la tarea
      if (!isAdmin) {
        const hasAccess = await this.fileService.userHasAccessToTask(userId, taskId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a esta tarea'
          });
        }
      }

      // Verificar que la tarea existe
      const taskExists = await this.fileService.taskExists(taskId);
      if (!taskExists) {
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

          for (const file of req.files) {
            const fileData = {
              nombre_original: file.originalname,
              nombre_archivo: file.filename,
              ruta_archivo: file.path,
              tipo_mime: file.mimetype,
              tamaño: file.size,
              tarea_id: taskId,
              subido_por: userId
            };

            const savedFile = await this.fileService.saveFile(fileData);
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
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar permisos sobre la tarea
      if (!isAdmin) {
        const hasAccess = await this.fileService.userHasAccessToTask(userId, taskId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a esta tarea'
          });
        }
      }

      const files = await this.fileService.getFilesByTask(taskId);

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
   * Descargar archivo
   * GET /api/files/download/:fileId
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async downloadFile(req, res) {
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

      // Verificar que el archivo físico existe
      try {
        await fs.access(file.ruta_archivo);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Archivo físico no encontrado'
        });
      }

      // Registrar descarga
      await this.fileService.logFileDownload(fileId, userId);

      // Configurar headers para descarga
      res.setHeader('Content-Disposition', `attachment; filename="${file.nombre_original}"`);
      res.setHeader('Content-Type', file.tipo_mime);

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