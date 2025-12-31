import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  // Base path for GitHub Pages deployment
  // Set to repo name when deploying to https://<user>.github.io/<repo>/
  // Leave as '/' for root domain or local development
  base: process.env['GITHUB_ACTIONS']
    ? "/elden-ring-timeline-constraint-solver/"
    : "/",
});
