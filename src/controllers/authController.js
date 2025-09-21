const AuthService = require('../services/authService');

/**
 * AuthController - Controlador de autenticación
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja requests HTTP de autenticación
 * - Open/Closed: Abierto para extensión (nuevos endpoints)
 * - Liskov Substitution: Puede ser sustituido por otros controladores
 * - Interface Segregation: Métodos específicos para cada endpoint
 * - Dependency Inversion: Depende de abstracciones (AuthService)
 */
class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Registra un nuevo usuario
   * POST /api/auth/register
   */
  async register(req, res) {
    console.log('🎯 [AUTH-CONTROLLER] register - INICIANDO CONTROLADOR');
    console.log('🎯 [AUTH-CONTROLLER] register - req.body:', req.body);
    
    try {
      const { nombre, email, contraseña, telefono, es_administrador } = req.body;

      // Validar datos requeridos
      if (!nombre || !email || !contraseña) {
        console.log('🎯 [AUTH-CONTROLLER] register - Datos faltantes');
        return res.status(400).json({
          success: false,
          message: 'Nombre, email y contraseña son requeridos'
        });
      }

      console.log('🎯 [AUTH-CONTROLLER] register - Llamando authService.register');
      const user = await this.authService.register({
        nombre,
        email,
        contraseña,
        telefono,
        es_administrador
      });

      console.log('🎯 [AUTH-CONTROLLER] register - Usuario creado exitosamente');
      res.status(201).json(user);
      console.log('🎯 [AUTH-CONTROLLER] register - Respuesta enviada');

    } catch (error) {
      console.error('🎯 [AUTH-CONTROLLER] register - Error:', error.message);
      console.error('🎯 [AUTH-CONTROLLER] register - Stack:', error.stack);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Autentica un usuario
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, contraseña } = req.body;

      // Validar datos requeridos
      if (!email || !contraseña) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      const result = await this.authService.login(
        email.toLowerCase().trim(), 
        contraseña
      );

      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: result
      });

    } catch (error) {
      console.error('Error en login:', error);

      // Manejar errores específicos
      if (error.message.includes('Credenciales inválidas') || 
          error.message.includes('Usuario inactivo')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verifica el token JWT actual
   * GET /api/auth/verify
   */
  async verifyToken(req, res) {
    try {
      const token = this._extractToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token no proporcionado'
        });
      }

      const user = await this.authService.verifyToken(token);

      res.status(200).json({
        success: true,
        message: 'Token válido',
        data: {
          user
        }
      });

    } catch (error) {
      console.error('Error verificando token:', error);

      if (error.message.includes('Token inválido') || 
          error.message.includes('Token expirado') ||
          error.message.includes('Usuario no válido')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Refresca un access token usando refresh token
   * POST /api/auth/refresh-token
   */
  async refreshAccessToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token es requerido'
        });
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: result.success,
        message: result.message,
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });

    } catch (error) {
      console.error('Error refrescando access token:', error);

      if (error.message.includes('Token de refresco inválido') || 
          error.message.includes('expirado') ||
          error.message.includes('Usuario no válido')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Refresca un token JWT (método legacy)
   * POST /api/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      const token = this._extractToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token no proporcionado'
        });
      }

      const result = await this.authService.refreshToken(token);

      res.status(200).json({
        success: true,
        message: 'Token refrescado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error refrescando token:', error);

      if (error.message.includes('Token inválido') || 
          error.message.includes('Token expirado') ||
          error.message.includes('Usuario no válido')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambia la contraseña del usuario autenticado
   * PUT /api/auth/change-password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      // Validar datos requeridos
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual y nueva contraseña son requeridas'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      await this.authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });

    } catch (error) {
      console.error('Error cambiando contraseña:', error);

      if (error.message.includes('Usuario no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Contraseña actual incorrecta')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Contraseña debe')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado
   * GET /api/auth/profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // El usuario ya está disponible en req.user gracias al middleware
      res.status(200).json({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: {
          user: req.user
        }
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Logout del usuario con revocación de tokens
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      const accessToken = this._extractToken(req);
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const result = await this.authService.logout(accessToken, refreshToken, userId);

      res.status(200).json(result);

    } catch (error) {
      console.error('Error en logout:', error);

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Logout de todas las sesiones del usuario
   * POST /api/auth/logout-all
   */
  async logoutAll(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const result = await this.authService.logoutAll(userId);

      res.status(200).json(result);

    } catch (error) {
      console.error('Error en logout global:', error);

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
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

module.exports = AuthController;