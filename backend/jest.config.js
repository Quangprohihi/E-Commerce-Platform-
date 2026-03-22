/** Jest config for backend test-cases (folder is gitignored). */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test-cases/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  forceExit: true,
};
