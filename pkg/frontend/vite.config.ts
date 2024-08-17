import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import pluginRewriteAll from 'vite-plugin-rewrite-all';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode}) => {
    if (command === 'serve') {
      return {
        // dev specific config
        plugins: [react(), pluginRewriteAll()],
        build: {
            sourcemap: true,
        },
        server: {
            proxy: {
                '/api': {
                target: 'http://localhost:8090', 
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, '')
                },
            }
            },
      }
    } else {
      // command === 'build'
      return {
        // build specific config
        plugins: [react(), pluginRewriteAll()],
        build: {
            sourcemap: true,
        },
      }
    }
  })