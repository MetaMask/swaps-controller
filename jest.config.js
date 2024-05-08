module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['./src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageProvider: 'babel',
  coverageReporters: ['html', 'json-summary', 'text'],
  coverageThreshold: {
    global: {
      branches: 56.73,
      functions: 61.9,
      lines: 76.09,
      statements: 76.22,
    },
  },
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  preset: 'ts-jest',
  resetMocks: true,
  restoreMocks: true,
  testEnvironment: 'node',
  testRegex: ['\\.test\\.(ts|js)$'],
  testTimeout: 2500,
};
