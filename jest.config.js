module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    // Transform react-native packages and vector-icons (which ships as TypeScript/ESM)
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-vector-icons).*/)',
  ],
  moduleNameMapper: {
    // Stub out binary font assets so Jest doesn't try to parse them
    '\\.ttf$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
