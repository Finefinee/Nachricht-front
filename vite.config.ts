import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    host: true, // 모든 네트워크 인터페이스에서 접근 허용
    allowedHosts: ['671b1818a6d0.ngrok-free.app', 'cb7179cb6ed6.ngrok-free.app', 'localhost'], // ngrok 호스트 허용
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/messages': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/ws-chat': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false,
        timeout: 60000 // 타임아웃 60초로 설정
      }
    }
  }
})
