import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Required for https://arjankc.github.io/QuestSloth/ (project Pages)
  base: '/QuestSloth/',
  plugins: [react(), tailwindcss()],
})
