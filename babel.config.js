module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind compiles `className` into native styles.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
