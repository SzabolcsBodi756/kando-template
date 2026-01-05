import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/OSZTV_sajat/', // <-- IDE a repo neve per jellel
})