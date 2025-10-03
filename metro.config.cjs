const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for .wasm files
defaultConfig.resolver.assetExts.push('wasm');

module.exports = defaultConfig;

