import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SONAA est un site 100% statique servi depuis GitHub Pages sur /Sonaa/.
// Ce projet n'a ni backend, ni clé d'API, ni variable d'environnement.
// Rien n'est injecté dans le bundle au build : il n'y a aucun secret à injecter.
export default defineConfig({
  base: '/Sonaa/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2022',
    // Budget de 250 Ko gzip hors données (ARCHITECTURE.md ADR-013).
    chunkSizeWarningLimit: 800
  }
});
