import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served from https://rohin999.github.io/sweepstake/ in production, so assets
// need the "/sweepstake/" base. Local dev stays at root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/sweepstake/" : "/",
  plugins: [react(), tailwindcss()],
}));
