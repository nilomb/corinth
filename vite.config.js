import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages uses /corinth/; Cloudflare Pages private deploy uses /
  base: process.env.VITE_BASE || "/corinth/",
  server: {
    port: 5173,
    host: "127.0.0.1",
    open: true,
    fs: { allow: ["."] },
  },
});
