import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  /* A production build without the database keys would quietly run on sample data and keep
     orders only in the shopper's browser, so it stops instead. VITE_ALLOW_DEMO=true builds a demo on purpose. */
  const env = loadEnv(mode, process.cwd(), "");
  if (command === "build" && mode === "production" && env.VITE_ALLOW_DEMO !== "true" && !(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Add them to the site's environment variables (or set VITE_ALLOW_DEMO=true for a demo build).");
  }
  /* Canonical links and share images need the full address: the domain when one is set,
     otherwise the address Netlify gives the site during its build (URL). */
  process.env.VITE_SITE_URL = (env.VITE_SITE_URL || process.env.URL || "").replace(/\/+$/, "");
  return {
    plugins: [react(), tailwindcss()],
  };
});
