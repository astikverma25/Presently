import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        faculty: resolve(__dirname, 'faculty.html'),
        student: resolve(__dirname, 'student.html')
      }
    }
  },
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    cors: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/*.exe', '**/*.msi', '**/.*/**']
    }
  }
});
