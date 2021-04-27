module.exports = {
  collectCoverage: true,
  coverageReporters: ['text', 'html'],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 34,
      lines: 45,
      statements: 45,
    },
  },
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: ['\\.test\\.ts$'],
  testTimeout: 5000,
};
