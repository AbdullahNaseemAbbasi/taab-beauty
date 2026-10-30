/*
 * Supabase client. The store's data lives in the database, so without
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY it opens empty and takes no orders.
 */
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLive = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isLive
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { "x-client-info": "naz-web" } },
    })
  : null;

/* Normalises Supabase/PostgREST errors into plain Error objects with readable messages. */
export function toError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return new Error(fallback);
  const message = error.message || error.error_description || fallback;
  const cleaned = message.replace(/^P\d{4}:\s*/, "");
  return new Error(cleaned);
}
