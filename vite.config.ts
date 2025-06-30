import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'clsx'],
          supabase: ['@supabase/supabase-js'],
          // File processing libraries will be loaded dynamically
          // so they don't need to be in manual chunks
        }
      }
    },
    // Enable code splitting
    chunkSizeWarningLimit: 1000,
  },
  // Improve development performance
  server: {
    hmr: {
      overlay: false
    }
  }
});