import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
    },
    // WSL doesn't deliver filesystem change events for files on Windows-mounted
    // drives (/mnt/c/...), so Vite's watcher silently misses edits without this.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
