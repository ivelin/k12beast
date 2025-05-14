// File path: babel.config.js
// Configures Babel for Jest to transform ESM modules
// Supports next-mdx-remote in tests

module.exports = {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
    ],
  };