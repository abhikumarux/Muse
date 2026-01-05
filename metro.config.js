const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// libraries that rely on "exports" (AWS v3 + @smithy/*)
config.resolver.unstable_enablePackageExports = true;

// Expo provides async dynamic import shim used by @smithy/core
config.server = config.server || {};
// config.server.experimentalImportBundleSupport = true;

module.exports = config;