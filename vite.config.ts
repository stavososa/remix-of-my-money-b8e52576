import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Avisa se chunk individual ultrapassar 600kB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Divide vendor libs em chunks separados para melhor cache no browser
        manualChunks: (id) => {
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-recharts";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-tanstack";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
        },
      },
    },
  },
}));
