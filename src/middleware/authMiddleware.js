const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { UserModel } = require('../models');

/**
 * AuthMiddleware - Middleware de autenticación simplificado para MVP
 * - Single Responsibility: Solo maneja autenticación básica con JWT
 * - Open/Closed: Extensible para futuras funcionalidades
 * - Dependency Inversion: Depende de abstracciones (UserModel)
 */
class AuthMiddleware {
  constructor() {
    this.userModel = UserModel;
  }

  /**
   * Middleware para verificar JWT
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async verifyToken(req, res, next) {
    try {
      console.log('🔐 [AUTH-MIDDLEWARE] Verificando token...');
      
      // Obtener token del header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('🔐 [AUTH-MIDDLEWARE] No se encontró token Bearer');
        return res.status(401).json({
          success: false,
          message: 'Token de acceso requerido'
        });
      }

      const token = authHeader.substring(7); // Remover 'Bearer '
      console.log('🔐 [AUTH-MIDDLEWARE] Token extraído:', token ? 'Presente' : 'Ausente');

      // Verificar y decodificar el token
      const decoded = jwt.verify(token, config.JWT_SECRET);
      console.log('🔐 [AUTH-MIDDLEWARE] Token decodificado:', { id: decoded.id, email: decoded.email });

      // Buscar usuario en la base de datos
      const user = await this.userModel.findById(decoded.id);
      console.log('🔐 [AUTH-MIDDLEWARE] Usuario encontrado:', user ? {
        id: user.id,
        email: user.email,
        estado: user.estado,
        es_administrador: user.es_administrador
      } : 'null');
      
      if (!user) {
        console.log(`🔐 [AUTH-MIDDLEWARE] Usuario no encontrado para ID: ${decoded.id}`);
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar que el usuario esté activo
      if (!user.estado) {
        console.log(`🔐 [AUTH-MIDDLEWARE] Usuario inactivo: ${user.email}, estado: ${user.estado}`);
        return res.status(401).json({
          success: false,
          message: 'Usuario inactivo'
        });
      }

      // Agregar información del usuario al request
      req.user = {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        es_administrador: user.es_administrador
      };

      console.log('🔐 [AUTH-MIDDLEWARE] Usuario autenticado:', req.user.email);
      next();

    } catch (error) {
      console.error('🔐 [AUTH-MIDDLEWARE] Error verificando token:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    }
  }

  /**
   * Middleware para verificar permisos de administrador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  requireAdmin(req, res, next) {
    try {
      console.log('🔐 [AUTH-MIDDLEWARE] Verificando permisos de administrador...');
      
      if (!req.user) {
        console.log('🔐 [AUTH-MIDDLEWARE] No hay usuario en el request');
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!req.user.es_administrador) {
        console.log('🔐 [AUTH-MIDDLEWARE] Usuario no es administrador');
        return res.status(403).json({
          success: false,
          message: 'Permisos de administrador requeridos'
        });
      }

      console.log('🔐 [AUTH-MIDDLEWARE] Usuario es administrador, continuando...');
      next();

    } catch (error) {
      console.error('🔐 [AUTH-MIDDLEWARE] Error verificando permisos de admin:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Middleware para verificar que el usuario puede acceder a sus propios recursos
   * @param {string} userIdParam - Nombre del parámetro que contiene el ID del usuario
   * @returns {Function} Middleware function
   */
  requireOwnershipOrAdmin(userIdParam = 'userId') {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        const targetUserId = parseInt(req.params[userIdParam]);
        const currentUserId = req.user.id;
        const isAdmin = req.user.es_administrador;

        // Permitir si es el mismo usuario o si es administrador
        if (currentUserId === targetUserId || isAdmin) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso'
        });

      } catch (error) {
        console.error('🔐 [AUTH-MIDDLEWARE] Error verificando ownership:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware opcional - no falla si no hay token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No hay token, continuar sin usuario
        req.user = null;
        return next();
      }

      const token = authHeader.substring(7);

      // Verificar token
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await this.userModel.findById(decoded.id);

      if (user && user.estado) {
        req.user = {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          es_administrador: user.es_administrador
        };
      } else {
        req.user = null;
      }

      next();

    } catch (error) {
      // En caso de error, continuar sin usuario
      req.user = null;
      next();
    }
  }


}

// Crear instancia única del middleware
const authMiddleware = new AuthMiddleware();

// Exportar métodos como funciones middleware
module.exports = {
  authenticate: (req, res, next) => authMiddleware.verifyToken(req, res, next),
  verifyToken: (req, res, next) => authMiddleware.verifyToken(req, res, next),
  requireAdmin: (req, res, next) => authMiddleware.requireAdmin(req, res, next),
  optionalAuth: (req, res, next) => authMiddleware.optionalAuth(req, res, next),
  requireOwnershipOrAdmin: (userIdParam) => authMiddleware.requireOwnershipOrAdmin(userIdParam)
};