// Centralized configuration module
// Loads environment variables and provides typed defaults
const dotenv = require('dotenv');
dotenv.config();

const toInt = (v, fallback) => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
};

const toBool = (v, fallback) => {
  if (v === undefined || v === null || v === '') return fallback;
  return v === 'true' || v === '1';
};

const config = {
  PORT: toInt(process.env.PORT, 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: toInt(process.env.DB_PORT, 3306),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'gestion_proyectos',
  DB_CONNECTION_LIMIT: toInt(process.env.DB_CONNECTION_LIMIT, 10),
  DB_QUEUE_LIMIT: toInt(process.env.DB_QUEUE_LIMIT, 0),

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Uploads & File handling
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  MAX_FILE_SIZE: toInt(process.env.MAX_FILE_SIZE, 10485760), // 10MB default
  ALLOWED_EXTENSIONS: process.env.ALLOWED_EXTENSIONS?.split(',') || [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar'
  ],
  ALLOWED_MIME_TYPES: process.env.ALLOWED_MIME_TYPES?.split(',') || [
    'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv', 'application/zip', 'application/x-rar-compressed'
  ],

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: toInt(process.env.RATE_LIMIT_WINDOW_MS, 900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: toInt(process.env.RATE_LIMIT_MAX_REQUESTS, 1000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: toInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 5),
  AUTH_RATE_LIMIT_WINDOW_MS: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 900000),
  USER_RATE_LIMIT_MAX_REQUESTS: toInt(process.env.USER_RATE_LIMIT_MAX_REQUESTS, 100),
  USER_RATE_LIMIT_WINDOW_MS: toInt(process.env.USER_RATE_LIMIT_WINDOW_MS, 900000),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_ERROR_FILE: process.env.LOG_ERROR_FILE || 'logs/error.log',
  LOG_COMBINED_FILE: process.env.LOG_COMBINED_FILE || 'logs/combined.log',

  // Request handling
  REQUEST_TIMEOUT: toInt(process.env.REQUEST_TIMEOUT, 10000),

  // Database setup
  SETUP_DB: toBool(process.env.SETUP_DB, false),

  // Security
  BCRYPT_SALT_ROUNDS: process.env.NODE_ENV === 'test' ? 4 : toInt(process.env.BCRYPT_SALT_ROUNDS, 12),
  REFRESH_TOKEN_EXPIRY_DAYS: toInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS, 30),
  JWT_BLACKLIST_FALLBACK_HOURS: toInt(process.env.JWT_BLACKLIST_FALLBACK_HOURS, 24),
// Pagination
  DEFAULT_PAGINATION_LIMIT: toInt(process.env.DEFAULT_PAGINATION_LIMIT, 10),
  AUDIT_PAGINATION_LIMIT: toInt(process.env.AUDIT_PAGINATION_LIMIT, 50),

  // Testing configuration
  TEST_BASE_URL: process.env.TEST_BASE_URL || `http://localhost:${toInt(process.env.PORT, 3000)}/api`,
  TEST_DB_HOST: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  TEST_DB_USER: process.env.TEST_DB_USER || process.env.DB_USER || 'root',
  TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'kali',
  TEST_DB_NAME: process.env.TEST_DB_NAME || process.env.DB_NAME || 'gestion_proyectos',
  TEST_USER_NAME: process.env.TEST_USER_NAME || 'Usuario Test Admin',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'password123',
  TEST_USER_PHONE: process.env.TEST_USER_PHONE || '1234567890',
  TEST_PROJECT_DESCRIPTION: process.env.TEST_PROJECT_DESCRIPTION || 'Descripción del proyecto de prueba',
  TEST_PROJECT_START_DATE: process.env.TEST_PROJECT_START_DATE || '2025-01-15',
  TEST_PROJECT_END_DATE: process.env.TEST_PROJECT_END_DATE || '2025-12-31',
  TEST_TASK_DESCRIPTION: process.env.TEST_TASK_DESCRIPTION || 'Descripción de la tarea de prueba',
  TEST_TASK_START_DATE: process.env.TEST_TASK_START_DATE || '2025-01-01',
  TEST_TASK_END_DATE: process.env.TEST_TASK_END_DATE || '2025-12-31',
  TEST_TASK_PRIORITY: process.env.TEST_TASK_PRIORITY || 'alta',
};

module.exports = config;
