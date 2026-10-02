/*
 * Creates (or resets the password of) an admin user for /admin.
 *   node scripts/create-admin.mjs <email> [password]
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env. If no password is
 * given a strong one is generated and printed once.
 */
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env")) {
  readFileSync(".env", "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  });
}

const [email, givenPassword] = process.argv.slice(2);
if (!email) {
  console.error("Usage: node scripts/create-admin.mjs <email> [password]");
  process.exit(1);
}
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const password = givenPassword || randomBytes(12).toString("base64url");
const admin = createClient(url, key, { auth: { persistSession: false } });

const normalised = email.trim().toLowerCase();
const { data: created, error: createError } = await admin.auth.admin.createUser({ email: normalised, password, email_confirm: true });
if (createError) {
  if (!/already|exists|registered/i.test(createError.message)) {
    console.error("createUser failed:", createError.message);
    process.exit(1);
  }
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((user) => user.email?.toLowerCase() === normalised);
  if (!existing) throw new Error("User exists but could not be found.");
  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  if (updateError) throw updateError;
  console.log(`Updated password for existing user ${normalised}`);
} else {
  console.log(`Created auth user ${created.user.email}`);
}

const { error: adminError } = await admin.from("admins").upsert({ email: normalised }, { onConflict: "email" });
if (adminError) throw adminError;
console.log(`Granted admin access to ${normalised}`);
if (!givenPassword) console.log(`Password: ${password}`);
