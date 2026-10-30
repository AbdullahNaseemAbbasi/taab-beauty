import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  /* A production build without the database keys would be an empty store that takes no orders, so it stops instead. */
  const env = loadEnv(mode, process.cwd(), "");
  if (command === "build" && mode === "production" && !(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Add them to the site's environment variables.");
  }
  /* Canonical links and share images need the full address: the domain when one is set,
     otherwise the address Netlify gives the site during its build (URL). */
  process.env.VITE_SITE_URL = (env.VITE_SITE_URL || process.env.URL || "").replace(/\/+$/, "");
  return {
    plugins: [react(), tailwindcss()],
  };
});
