module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/property/**/*.test.js'],
  testTimeout: 10000,
  maxWorkers: 1,
  verbose: true,
  detectOpenHandles: false,
  forceExit: true,
  clearMocks: true,
  collectCoverage: false,
  bail: false,
  // Do NOT use setupFilesAfterEnv for property tests (no database needed)
  globals: {
    'jest': true
  }
};
