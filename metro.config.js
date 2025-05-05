const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push("cjs");

// Add this line
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;
