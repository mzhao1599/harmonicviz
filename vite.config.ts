import path from "path" // You might need to run 'npm install -D @types/node' for this
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/harmonicviz/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})