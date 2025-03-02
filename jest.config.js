export default {
    transform: {
      '^.+\\.js$': 'babel-jest',
    },
    moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
    testEnvironment: 'node',
   // extensionsToTreatAsEsm: ['.js'],
  };