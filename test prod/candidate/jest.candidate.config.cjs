module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/unit/**/*.test.js',
    '<rootDir>/integration/**/*.test.js',
    '<rootDir>/api/**/*.test.js',
    '<rootDir>/security/**/*.test.js',
  ],
  testTimeout: 30000,
  verbose: true,
  rootDir: '.',
};
