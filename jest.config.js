module.exports = {
  // Entorno de test
  testEnvironment: 'node',
  
  // Configurar variables de entorno para tests
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.js'],
  
  // Patrones de archivos de test
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Directorios a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Timeout para tests
  testTimeout: 30000,
  
  // Configuración de módulos
  moduleFileExtensions: ['js', 'json'],
  
  // Limpiar mocks automáticamente
  clearMocks: true,
  
  // Configuración de variables de entorno
  setupFiles: ['<rootDir>/tests/utils/env.js'],
  
  // Configuración para tests de integración
  globalSetup: '<rootDir>/tests/utils/globalSetup.js',
  globalTeardown: '<rootDir>/tests/utils/globalTeardown.js',
  
  // Configuración para tests secuenciales (importante para DB)
  maxWorkers: 1,
  
  // Verbose para ver detalles
  verbose: true,
  
  // Configuración adicional para debugging
  silent: false,
  detectOpenHandles: false,
  forceExit: true
};