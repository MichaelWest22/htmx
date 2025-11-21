import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.js',
      name: 'htmxBundle',
      fileName: 'bundle'
    }
  },
  resolve: {
    alias: {
      'htmx.org': path.resolve(__dirname, '../../../dist/htmx.esm.js'),
      'htmx-preload': path.resolve(__dirname, '../../../src/ext/hx-preload.js')
    }
  }
});
