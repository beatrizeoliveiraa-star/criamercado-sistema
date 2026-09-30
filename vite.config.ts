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
  build: {
    // Duas páginas: o sistema (index.html) e a página pública da Superminas.
    rollupOptions: {
      input: {
        sistema: fileURLToPath(new URL("./index.html", import.meta.url)),
        superminas: fileURLToPath(new URL("./superminas/index.html", import.meta.url)),
      },
    },
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
      workbox: { navigateFallback: "/index.html", navigateFallbackDenylist: [/^\/superminas/] },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});
