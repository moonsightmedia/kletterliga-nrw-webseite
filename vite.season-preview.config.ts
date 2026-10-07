import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'season-preview'),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { host: '127.0.0.1', port: 5390, strictPort: true, fs: { allow: [__dirname] } },
  build: { outDir: path.resolve(__dirname, 'dist-season-preview'), emptyOutDir: true },
});
