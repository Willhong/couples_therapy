const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve duplicate native modules to project's version
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force all react-native-safe-area-context imports to use project's version
  if (moduleName === 'react-native-safe-area-context') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/react-native-safe-area-context/src/index.tsx'),
      type: 'sourceFile',
    };
  }
  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
