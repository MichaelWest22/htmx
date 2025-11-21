const esbuild = require('esbuild');
const path = require('path');

esbuild.buildSync({
  entryPoints: ['./src/index.js'],
  bundle: true,
  outfile: './dist/bundle.js',
  minify: true,
  alias: {
    'htmx.org': path.resolve(__dirname, '../../../dist/htmx.esm.js'),
    'htmx-preload': path.resolve(__dirname, '../../../src/ext/hx-preload.js')
  }
});
