import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'recharts', '@neondatabase/serverless']
  },
  server: {
    port: 5554,
    strictPort: true,
  }
})
