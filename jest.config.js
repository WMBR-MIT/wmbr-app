module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    // Transform react-native packages and vector-icons (which ships as TypeScript/ESM)
    'node_modules/(?!(react-native|@react-native|@react-navigation).*/)',
  ],
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
