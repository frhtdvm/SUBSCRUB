const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Web shims: redirect native-only modules to lightweight stubs
config.resolver = config.resolver ?? {};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'expo-sqlite') {
      return {
        filePath: path.resolve(__dirname, 'src/shims/expo-sqlite.web.ts'),
        type: 'sourceFile',
      };
    }
    if (
      moduleName === 'react-native-purchases' ||
      moduleName === 'expo-secure-store'
    ) {
      return {
        filePath: path.resolve(__dirname, 'src/shims/empty.web.ts'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });

