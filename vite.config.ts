import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ***** この設定を追加または修正 *****
  server: {
    // 0.0.0.0 に設定することで、コンテナ外部からのアクセスを許可
    host: '0.0.0.0', 
    // ホットリロードのためのポーリング監視設定（WSL2/Docker環境で推奨）
    watch: {
      usePolling: true,
    },
  },
  // **********************************
})
