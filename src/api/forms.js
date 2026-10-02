/* Newsletter and contact submissions. Live: Supabase tables. Mock: Netlify Forms. */
import { supabase, isLive, toError } from "./client.js";

async function postNetlifyForm(name, fields) {
  const body = new URLSearchParams({ "form-name": name, ...fields }).toString();
  const response = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok && import.meta.env.PROD) throw new Error(`Form submission failed: ${response.status}`);
}

export async function subscribeNewsletter(email, source = "footer") {
  if (!isLive) return postNetlifyForm("newsletter", { email, source });
  const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase(), source });
  // 23505 = already subscribed; treat as success so the form never shames a returning reader.
  if (error && error.code !== "23505") throw toError(error, "Could not subscribe right now.");
}

export async function sendContactMessage({ name, email, phone, topic, message }) {
  if (!isLive) return postNetlifyForm("contact", { name, email, phone: phone || "", topic, message });
  const { error } = await supabase.from("contact_messages").insert({ name, email, phone: phone || null, topic, message });
  if (error) throw toError(error, "Could not send your message right now.");
}
