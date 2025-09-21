module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 60000,
  maxWorkers: 1,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  collectCoverage: false,
  bail: false,
  setupFilesAfterEnv: [],
  testSequencer: '<rootDir>/node_modules/@jest/test-sequencer/build/index.js'
};