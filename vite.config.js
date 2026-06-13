import { defineConfig } from 'vite';

// Spike config. The legacy single-file site (index.legacy.html) is kept out of
// the build and serves as the static fallback / content source.
export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
    port: 5180,
  },
});
