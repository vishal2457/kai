module.exports = function (api) {
  api.cache(true);
  const plugins = [];

  plugins.push('react-native-reanimated/plugin');
  plugins.push(["inline-import", { "extensions": [".sql"] }]);

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins,
  };
};
