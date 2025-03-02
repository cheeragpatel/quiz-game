export default {
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,

  // Test coverage settings
  collectCoverage: true,
  coverageDirectory: "coverage",
  
  // An array of file extensions your modules use
  moduleFileExtensions: [
    "js",
    "json"
  ],

  // A list of paths to directories that Jest should use to search for files in
  roots: [
    "<rootDir>/tests"
  ],

  // The test environment that will be used for testing
  testEnvironment: "node",

  // ESM compatibility
  transform: {},
  
  // Fix moduleNameMapper regex - the one we had was causing issues
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },

  // Setup files to run before tests
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"]
};