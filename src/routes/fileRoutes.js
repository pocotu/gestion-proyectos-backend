const express = require('express');
const FileController = require('../controllers/fileController');
const config = require('../config/config');
const { authenticate } = require('../middleware/authMiddleware');
const { 
  requirePermission, 
  requireFileManagement,
  requireOwnershipOrPermission,
  attachPermissions 
} = require('../middleware/permissionMiddleware');
const { 
  requireFileAccess, 
  requireTaskFileAccess, 
  requireProjectFileAccess 
} = require('../middleware/granularAccessMiddleware');

const router = express.Router();
const fileController = new FileController();

/**
 * Rutas de archivos con permisos granulares
 * Siguiendo principios SOLID y arquitectura RESTful
 */

// Middleware para todas las rutas de archivos
router.use(authenticate());
router.use(attachPermissions());

/**
 * Rutas principales de archivos
 */

// Subir archivo a una tarea
// POST /api/files/upload/:taskId
// Permisos: Solo asignados a la tarea, responsables del proyecto y admin
router.post('/upload/:taskId', 
  requireTaskFileAccess(),
  fileController.uploadFile.bind(fileController)
);

// Obtener archivos de una tarea
// GET /api/files/task/:taskId
// Permisos: Solo asignados a la tarea, responsables del proyecto y admin
router.get('/task/:taskId', 
  requireTaskFileAccess(),
  fileController.getTaskFiles.bind(fileController)
);

// Descargar archivo
// GET /api/files/download/:fileId
// Permisos: Solo quien subió el archivo, responsables del proyecto y admin
router.get('/download/:fileId', 
  requireFileAccess('read'),
  fileController.downloadFile.bind(fileController)
);

// Obtener información de un archivo
// GET /api/files/:fileId
// Permisos: Solo quien subió el archivo, responsables del proyecto y admin
router.get('/:fileId', 
  requireFileAccess('read'),
  fileController.getFileInfo.bind(fileController)
);

// Actualizar información de archivo
// PUT /api/files/:fileId
// Permisos: Solo quien subió el archivo, responsables del proyecto y admin
router.put('/:fileId', 
  requireFileAccess('update'),
  fileController.updateFileInfo.bind(fileController)
);

// Eliminar archivo
// DELETE /api/files/:fileId
// Permisos: Solo quien subió el archivo, responsables del proyecto y admin
router.delete('/:fileId', 
  requireFileAccess('delete'),
  fileController.deleteFile.bind(fileController)
);

/**
 * Rutas específicas para usuarios
 */

// Obtener mis archivos subidos
// GET /api/files/my-files
// Permisos: Usuario autenticado (sus propios archivos)
router.get('/my-files', 
  fileController.getMyFiles.bind(fileController)
);

/**
 * Rutas de estadísticas y reportes
 */

// Obtener estadísticas de archivos
// GET /api/files/stats/overview
// Permisos: Admin o filtrado según acceso del usuario
router.get('/stats/overview', 
  fileController.getFileStats.bind(fileController)
);

// Obtener estadísticas de mis archivos
// GET /api/files/stats/my-stats
// Permisos: Usuario autenticado (sus propias estadísticas)
router.get('/stats/my-stats', 
  (req, res, next) => {
    req.query.user_specific = 'true';
    next();
  },
  fileController.getFileStats.bind(fileController)
);

/**
 * Rutas de búsqueda y filtrado
 */

// Buscar archivos
// GET /api/files/search
// Permisos: Filtrado según acceso del usuario
router.get('/search', 
  (req, res, next) => {
    const { q, tipo_mime, tarea_id } = req.query;
    req.searchQuery = q;
    next();
  },
  fileController.getMyFiles.bind(fileController)
);

// Obtener archivos por tipo MIME
// GET /api/files/by-type/:mimeType
// Permisos: Filtrado según acceso del usuario
router.get('/by-type/:mimeType', 
  (req, res, next) => {
    req.query.tipo_mime = req.params.mimeType;
    next();
  },
  fileController.getMyFiles.bind(fileController)
);

// Obtener archivos recientes
// GET /api/files/recent
// Permisos: Filtrado según acceso del usuario
router.get('/recent', 
  (req, res, next) => {
    req.query.recent = 'true';
    req.query.limit = req.query.limit || '10';
    next();
  },
  fileController.getMyFiles.bind(fileController)
);

/**
 * Rutas administrativas
 */

// Obtener todos los archivos (solo admin)
// GET /api/files/admin/all
// Permisos: Solo Admin
router.get('/admin/all', 
  requirePermission('files', 'read'),
  (req, res, next) => {
    // Verificar que es admin
    if (!req.user.es_administrador) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Se requieren permisos de administrador'
      });
    }
    next();
  },
  fileController.getMyFiles.bind(fileController)
);

// Limpiar archivos huérfanos (sin tarea asociada)
// DELETE /api/files/admin/cleanup-orphans
// Permisos: Solo Admin
router.delete('/admin/cleanup-orphans', 
  requirePermission('files', 'delete'),
  (req, res, next) => {
    // Verificar que es admin
    if (!req.user.es_administrador) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Se requieren permisos de administrador'
      });
    }
    next();
  },
  (req, res) => {
    // Placeholder para futura implementación de limpieza
    res.json({
      success: true,
      message: 'Funcionalidad de limpieza de archivos huérfanos en desarrollo'
    });
  }
);

/**
 * Rutas de validación y utilidades
 */

// Validar archivo antes de subir
// POST /api/files/validate
// Permisos: Usuario autenticado
router.post('/validate', 
  (req, res) => {
    const { filename, size, mimetype } = req.body;
    
    if (!filename || !size || !mimetype) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos del archivo para validar'
      });
    }

    // Validaciones básicas
    const maxSize = config.MAX_FILE_SIZE;
    const allowedTypes = config.ALLOWED_MIME_TYPES;

    const errors = [];

    if (size > maxSize) {
      errors.push('El archivo es demasiado grande (máximo 10MB)');
    }

    if (!allowedTypes.includes(mimetype)) {
      errors.push('Tipo de archivo no permitido');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Archivo no válido',
        errors
      });
    }

    res.json({
      success: true,
      message: 'Archivo válido para subir'
    });
  }
);

// Obtener tipos de archivo permitidos
// GET /api/files/allowed-types
// Permisos: Usuario autenticado
router.get('/allowed-types', 
  (req, res) => {
    const allowedTypes = {
      images: ['image/jpeg', 'image/png', 'image/gif'],
      documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ],
      archives: ['application/zip', 'application/x-rar-compressed']
    };

    res.json({
      success: true,
      data: { allowedTypes }
    });
  }
);

module.exports = router;