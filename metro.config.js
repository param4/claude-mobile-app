// The shared protocol lives in the sibling claude-mobile-be repo (../claude-mobile-be/protocol).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const protocol = path.resolve(__dirname, '../claude-mobile-be/protocol');

config.watchFolders = [...(config.watchFolders ?? []), protocol];
// Let files under protocol/ resolve packages (zod) from this app's node_modules.
config.resolver.nodeModulesPaths = [...(config.resolver.nodeModulesPaths ?? []), path.resolve(__dirname, 'node_modules')];

module.exports = config;
