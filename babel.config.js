module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@components': './src/components',
          '@context': './src/context',
          '@services': './src/services',
          '@utils': './src/utils',
          '@customTypes': './src/types',
          '@app': './src/app',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
