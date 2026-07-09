import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = env.PORT || process.env.PORT || "8787";
  const backendBaseUrl = (env.VITE_API_BASE_URL || env.API_BASE_URL || `http://127.0.0.1:${backendPort}`).replace(/\/$/, "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      watch: {
        ignored: ["**/tmp/**", "**/server/data/**", "**/*.sqlite*", "**/dev-run.*.log", "**/.tools/**"]
      },
      proxy: {
        "/api": backendBaseUrl
      }
    },
    preview: {
      host: "0.0.0.0"
    }
  };
});
