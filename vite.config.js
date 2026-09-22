import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    cors: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/*.exe', '**/*.msi', '**/.*/**']
    }
  }
});
