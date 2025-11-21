const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'htmxBundle',
    libraryTarget: 'umd'
  },
  resolve: {
    alias: {
      'htmx.org': path.resolve(__dirname, '../../../dist/htmx.esm.js'),
      'htmx-preload': path.resolve(__dirname, '../../../src/ext/hx-preload.js')
    }
  }
};
