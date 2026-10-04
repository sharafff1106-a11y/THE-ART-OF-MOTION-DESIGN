import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SINGLE_FILE=1 bundles everything (including the lazy 3D scenes) into one chunk,
// so scripts/inline.mjs can produce a single shareable HTML file.
const single = !!process.env.SINGLE_FILE;

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: single ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 1200,
    rollupOptions: single ? { output: { inlineDynamicImports: true } } : {},
  },
});
