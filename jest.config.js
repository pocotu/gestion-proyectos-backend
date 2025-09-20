module.exports = {
  // Entorno de test
  testEnvironment: 'node',
  
  // Archivos de configuración
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.js'],
  
  // Patrones de archivos de test
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Directorios a ignorar
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Timeout para tests - aumentado para evitar ETIMEDOUT
  testTimeout: 30000,
  
  // Extensiones de módulos
  moduleFileExtensions: ['js', 'json'],
  
  // Limpiar mocks automáticamente
  clearMocks: true,
  
  // Configuración de workers - ejecutar en serie
  maxWorkers: 1,
  
  // Verbose para debugging
  verbose: true,
  
  // Configuración de debugging - mejorada para evitar timeouts
  detectOpenHandles: true,
  forceExit: true,
  
  // Configuración de coverage
  collectCoverage: false,
  
  // Configuración de bail (detener en primer fallo)
  bail: false,
  
  // Configuración de transformación
  transform: {},
  
  // Configuración de módulos
  moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>/tests'],
  
  // Configuración de silent para reducir output
  silent: false,
  
  // Configuración adicional para evitar problemas de timeout
  slowTestThreshold: 10
};