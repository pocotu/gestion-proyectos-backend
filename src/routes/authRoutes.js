const express = require('express');
const AuthController = require('../controllers/authController');
const config = require('../config/config');
const { authenticate, requireAdmin, requireOwnershipOrAdmin } = require('../middleware/authMiddleware');

/**
 * AuthRoutes - Rutas de autenticación
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo define rutas de autenticación
 * - Open/Closed: Abierto para extensión (nuevas rutas)
 * - Liskov Substitution: Puede ser sustituido por otros routers
 * - Interface Segregation: Rutas específicas para cada funcionalidad
 * - Dependency Inversion: Depende de abstracciones (AuthController, middleware)
 */

const router = express.Router();
const authController = new AuthController();

// Rutas públicas (no requieren autenticación)

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  try {
    await authController.register(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar usuario y obtener token
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  try {
    await authController.login(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar token JWT
 * @access  Public
 */
router.get('/verify', async (req, res) => {
  await authController.verifyToken(req, res);
});

// Rutas protegidas (requieren autenticación)

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/profile', authenticate, async (req, res) => {
  await authController.getProfile(req, res);
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña del usuario autenticado
 * @access  Private
 */
router.put('/change-password', 
  authenticate, 
  async (req, res) => {
    await authController.changePassword(req, res);
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión del usuario con revocación de tokens
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  await authController.logout(req, res);
});

/**
 * @route   POST /api/auth/logout-all
 * @desc    Cerrar todas las sesiones del usuario
 * @access  Private
 */
router.post('/logout-all', authenticate, async (req, res) => {
  await authController.logoutAll(req, res);
});

// Rutas administrativas (requieren permisos de administrador)

/**
 * @route   GET /api/auth/users
 * @desc    Obtener lista de usuarios (solo administradores)
 * @access  Private/Admin
 */
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    // Esta funcionalidad podría implementarse en un UserController separado
    // Por ahora, devolvemos un mensaje indicando que está disponible
    res.status(200).json({
      success: true,
      message: 'Endpoint disponible para administradores',
      data: {
        note: 'Implementar en UserController para obtener lista de usuarios'
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   PUT /api/auth/users/:userId/status
 * @desc    Cambiar estado de usuario (solo administradores)
 * @access  Private/Admin
 */
router.put('/users/:userId/status', authenticate, requireAdmin, async (req, res) => {
  try {
    // Esta funcionalidad podría implementarse en un UserController separado
    res.status(200).json({
      success: true,
      message: 'Endpoint disponible para administradores',
      data: {
        note: 'Implementar en UserController para cambiar estado de usuario'
      }
    });
  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Middleware de manejo de errores específico para rutas de auth
router.use((error, req, res, next) => {
  console.error('Error en rutas de autenticación:', error);

  // Errores de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: error.details
    });
  }

  // Errores de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

module.exports = router;