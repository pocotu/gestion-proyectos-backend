const AuthService = require('../services/authService');
const RefreshTokenService = require('../services/RefreshTokenService');

/**
 * AuthMiddleware - Middleware de autenticación JWT
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja autenticación de requests
 * - Open/Closed: Abierto para extensión (nuevos tipos de auth)
 * - Liskov Substitution: Puede ser sustituido por otros middlewares
 * - Interface Segregation: Métodos específicos para diferentes niveles de auth
 * - Dependency Inversion: Depende de abstracciones (AuthService)
 */
class AuthMiddleware {
  constructor() {
    this.authService = new AuthService();
    this.refreshTokenService = new RefreshTokenService();
  }

  /**
   * Middleware para verificar autenticación JWT con blacklist
   * Verifica que el usuario esté autenticado y el token no esté en blacklist
   */
  authenticate() {
    return async (req, res, next) => {
      try {
        // Extraer token del header Authorization
        const token = this._extractToken(req);
        
        if (!token) {
          return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido'
          });
        }

        // Verificar si el token está en blacklist
        const isBlacklisted = await this.refreshTokenService.isJWTBlacklisted(token);
        if (isBlacklisted) {
          return res.status(401).json({
            success: false,
            message: 'Token inválido o revocado'
          });
        }

        // Verificar token y obtener usuario
        const user = await this.authService.verifyToken(token);
        
        // Agregar usuario al request para uso posterior
        req.user = user;
        req.token = token;

        next();

      } catch (error) {
        console.error('Error en autenticación:', error);

        if (error.message.includes('Token inválido') || 
            error.message.includes('Token expirado') ||
            error.message.includes('Usuario no válido')) {
          return res.status(401).json({
            success: false,
            message: error.message
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware para verificar que el usuario sea administrador
   * Debe usarse después del middleware authenticate()
   */
  requireAdmin() {
    return (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Verificar que sea administrador
        if (!req.user.es_administrador) {
          return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requieren permisos de administrador'
          });
        }

        next();

      } catch (error) {
        console.error('Error verificando permisos de admin:', error);

        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware para verificar que el usuario sea el propietario del recurso o administrador
   * @param {string} paramName - Nombre del parámetro que contiene el ID del usuario
   */
  requireOwnershipOrAdmin(paramName = 'userId') {
    return (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        const resourceUserId = parseInt(req.params[paramName]);
        const currentUserId = req.user.id;

        // Permitir si es administrador o propietario del recurso
        if (req.user.es_administrador || currentUserId === resourceUserId) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Solo puedes acceder a tus propios recursos'
        });

      } catch (error) {
        console.error('Error verificando propiedad:', error);

        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware opcional de autenticación
   * No falla si no hay token, pero si hay token lo verifica
   */
  optionalAuth() {
    return async (req, res, next) => {
      try {
        const token = this._extractToken(req);

        if (!token) {
          // No hay token, continuar sin usuario
          req.user = null;
          req.token = null;
          return next();
        }

        // Hay token, verificarlo
        try {
          const user = await this.authService.verifyToken(token);
          req.user = user;
          req.token = token;
        } catch (error) {
          // Token inválido, continuar sin usuario
          req.user = null;
          req.token = null;
        }

        next();

      } catch (error) {
        console.error('Error en autenticación opcional:', error);
        
        // En caso de error, continuar sin usuario
        req.user = null;
        req.token = null;
        next();
      }
    };
  }

  /**
   * Middleware para verificar que el usuario esté activo
   * Debe usarse después del middleware authenticate()
   */
  requireActiveUser() {
    return (req, res, next) => {
      try {
        // Verificar que el usuario esté autenticado
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Verificar que el usuario esté activo
        if (req.user.estado !== 'activo') {
          return res.status(403).json({
            success: false,
            message: 'Cuenta de usuario inactiva'
          });
        }

        next();

      } catch (error) {
        console.error('Error verificando estado del usuario:', error);

        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware para rate limiting por usuario autenticado
   * @param {number} maxRequests - Máximo número de requests
   * @param {number} windowMs - Ventana de tiempo en milisegundos
   */
  rateLimitByUser(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const userRequests = new Map();

    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        const userId = req.user.id;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Obtener requests del usuario
        if (!userRequests.has(userId)) {
          userRequests.set(userId, []);
        }

        const requests = userRequests.get(userId);
        
        // Filtrar requests dentro de la ventana de tiempo
        const recentRequests = requests.filter(time => time > windowStart);
        
        // Verificar límite
        if (recentRequests.length >= maxRequests) {
          return res.status(429).json({
            success: false,
            message: 'Demasiadas solicitudes. Intenta de nuevo más tarde'
          });
        }

        // Agregar request actual
        recentRequests.push(now);
        userRequests.set(userId, recentRequests);

        next();

      } catch (error) {
        console.error('Error en rate limiting:', error);

        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  // Métodos privados

  /**
   * Extrae el token JWT del header Authorization
   * @private
   */
  _extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

// Exportar instancia singleton
const authMiddleware = new AuthMiddleware();

module.exports = {
  authenticate: authMiddleware.authenticate.bind(authMiddleware),
  requireAdmin: authMiddleware.requireAdmin.bind(authMiddleware),
  requireOwnershipOrAdmin: authMiddleware.requireOwnershipOrAdmin.bind(authMiddleware),
  optionalAuth: authMiddleware.optionalAuth.bind(authMiddleware),
  requireActiveUser: authMiddleware.requireActiveUser.bind(authMiddleware),
  rateLimitByUser: authMiddleware.rateLimitByUser.bind(authMiddleware)
};