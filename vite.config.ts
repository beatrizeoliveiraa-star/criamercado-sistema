/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icone.svg", "marca/*.svg"],
      manifest: {
        name: "CRIAMERCADO",
        short_name: "CRIAMERCADO",
        description: "Clientes, projetos, pedidos e entregas da CRIAMERCADO.",
        lang: "pt-BR",
        start_url: "/",
        display: "standalone",
        background_color: "#F8F8F8",
        theme_color: "#009E3D",
        icons: [{ src: "/icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: { navigateFallback: "/index.html" },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});
