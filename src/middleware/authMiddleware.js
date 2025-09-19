const AuthService = require('../services/authService');
const RefreshTokenService = require('../services/RefreshTokenService');
const config = require('../config/config');

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
        console.log('🔐 [AUTH-MIDDLEWARE] Iniciando autenticación para:', req.method, req.path);
        console.log('🔐 [AUTH-MIDDLEWARE] Headers:', JSON.stringify(req.headers, null, 2));
        
        // Extraer token del header Authorization
        const token = this._extractToken(req);
        console.log('🔐 [AUTH-MIDDLEWARE] Token extraído:', token ? 'Presente' : 'Ausente');
        console.log('🔐 [AUTH-MIDDLEWARE] Token completo:', token);
        
        if (!token) {
          console.log('🔐 [AUTH-MIDDLEWARE] Error: Token no encontrado');
          return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido'
          });
        }

        // Verificar si el token está en blacklist
        console.log('🔐 [AUTH-MIDDLEWARE] Verificando blacklist...');
        const isBlacklisted = await this.refreshTokenService.isJWTBlacklisted(token);
        console.log('🔐 [AUTH-MIDDLEWARE] Token en blacklist:', isBlacklisted);
        
        if (isBlacklisted) {
          console.log('🔐 [AUTH-MIDDLEWARE] Error: Token en blacklist');
          return res.status(401).json({
            success: false,
            message: 'Token inválido o revocado'
          });
        }

        // Verificar token y obtener usuario
        console.log('🔐 [AUTH-MIDDLEWARE] Verificando token...');
        const user = await this.authService.verifyToken(token);
        console.log('🔐 [AUTH-MIDDLEWARE] Usuario verificado:', { id: user.id, email: user.email, es_administrador: user.es_administrador });
        
        // Agregar usuario al request para uso posterior
        req.user = user;
        req.token = token;

        next();

      } catch (error) {
        console.log('🔐 [AUTH-MIDDLEWARE] Error en autenticación:', error.message);
        console.log('🔐 [AUTH-MIDDLEWARE] Stack trace:', error.stack);
        
        // Determinar el tipo de error y responder apropiadamente
        if (error.message.includes('Token inválido') || 
            error.message.includes('Token expirado') ||
            error.message.includes('Usuario no encontrado') ||
            error.message.includes('Usuario no válido')) {
          return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
          });
        }

        // Error interno del servidor
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
  rateLimitByUser(maxRequests = config.USER_RATE_LIMIT_MAX_REQUESTS, windowMs = config.USER_RATE_LIMIT_WINDOW_MS) {
    const userRequests = new Map();

    return (req, res, next) => {
      const userId = req.user?.id;
      if (!userId) {
        return next();
      }

      const now = Date.now();
      const userKey = `user_${userId}`;
      
      if (!userRequests.has(userKey)) {
        userRequests.set(userKey, { count: 1, resetTime: now + windowMs });
        return next();
      }

      const userLimit = userRequests.get(userKey);
      
      if (now > userLimit.resetTime) {
        userRequests.set(userKey, { count: 1, resetTime: now + windowMs });
        return next();
      }

      if (userLimit.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests from this user',
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
        });
      }

      userLimit.count++;
      next();
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