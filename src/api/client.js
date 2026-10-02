/*
 * Supabase client. When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
 * the app runs in "live" mode against the database; otherwise every API
 * module falls back to the mock data in src/data so the site still works.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLive = Boolean(url && anonKey);

export const supabase = isLive
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { headers: { "x-client-info": "taab-web" } },
    })
  : null;

/* Normalises Supabase/PostgREST errors into plain Error objects with readable messages. */
export function toError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return new Error(fallback);
  const message = error.message || error.error_description || fallback;
  const cleaned = message.replace(/^P\d{4}:\s*/, "");
  return new Error(cleaned);
}
