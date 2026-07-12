import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite is the "build tool" — it's what turns your .jsx files (which
// browsers can't read directly) into plain JS the browser understands,
// and it runs a fast local dev server with live-reload while you work.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
