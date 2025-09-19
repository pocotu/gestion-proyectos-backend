/**
 * Configuración de variables de entorno para tests
 * Este archivo se ejecuta antes de cada test para configurar el entorno
 */

const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno específicas para tests
const envPath = path.resolve(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

// Configurar NODE_ENV para tests
process.env.NODE_ENV = 'test';

// Configurar variables por defecto si no están definidas
if (!process.env.DB_NAME) {
  process.env.DB_NAME = 'gestion_proyectos';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_integration_tests_only';
}

if (!process.env.PORT) {
  process.env.PORT = '3001';
}

// Configurar timeout para operaciones de base de datos
process.env.DB_TIMEOUT = '10000';

// Deshabilitar logs durante tests
process.env.LOG_LEVEL = 'error';

console.log('🔧 Variables de entorno configuradas para tests');
console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
console.log(`🚀 Puerto: ${process.env.PORT}`);
console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? 'Configurado' : 'No configurado'}`);