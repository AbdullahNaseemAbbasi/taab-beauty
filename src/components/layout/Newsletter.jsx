import { useState } from "react";
import { Input } from "../ui/Form.jsx";
import { MailIcon } from "../ui/Icons.jsx";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";

/* Submits to Netlify Forms ("newsletter"); falls back gracefully in local dev. */
export default function Newsletter({ source = "footer", compact = false }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  async function submit(event) {
    event.preventDefault();
    setStatus("sending");
    try {
      const body = new URLSearchParams({ "form-name": "newsletter", email, source }).toString();
      const response = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!response.ok && import.meta.env.PROD) throw new Error(`Newsletter signup failed: ${response.status}`);
      track(EVENTS.NEWSLETTER_SIGNUP, { source });
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-mint/40 px-4 py-3 text-[14px] font-semibold text-navy">
        <MailIcon className="size-4 text-teal" /> You are on the list. Check your inbox for a welcome code.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={`flex ${compact ? "flex-col gap-2 sm:flex-row" : "flex-col gap-3 sm:flex-row"}`}>
      <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" aria-label="Email address" autoComplete="email" />
      <button type="submit" disabled={status === "sending"} className="h-[50px] shrink-0 rounded-xl bg-coral px-6 text-[15px] font-semibold text-white hover:bg-coral-600 disabled:opacity-60">
        {status === "sending" ? "Joining…" : "Get 10% off"}
      </button>
      {status === "error" && (
        <p role="alert" className="basis-full text-[12px] text-danger">
          Could not subscribe right now. Please try again.
        </p>
      )}
    </form>
  );
}
