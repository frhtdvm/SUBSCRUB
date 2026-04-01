module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [
      'babel-preset-expo',
      // NativeWind v4 uses react-native-css-interop/babel which is a preset, not a plugin.
      // Excluded from test env as it rewrites JSX and requires native modules.
      ...(isTest ? [] : ['nativewind/babel']),
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@api': './src/api',
            '@components': './src/components',
            '@constants': './src/constants',
            '@data': './src/data',
            '@db': './src/db',
            '@engine': './src/engine',
            '@hooks': './src/hooks',
            '@navigation': './src/navigation',
            '@screens': './src/screens',
            '@store': './src/store',
            '@types': './src/types',
            '@utils': './src/utils',
          },
        },
      ],
    ],
  };
};
