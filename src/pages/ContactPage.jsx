import { useState } from "react";
import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select, Textarea } from "../components/ui/Form.jsx";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "../components/ui/Icons.jsx";
import { PageHero } from "../components/sections/Sections.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { site } from "../config/site.js";
import { images } from "../data/images.js";
import { sendContactMessage } from "../api/forms.js";
import { track } from "../analytics/tracking.js";
import { EVENTS } from "../analytics/events.js";
import { ecommerce } from "../analytics/ecommerce.js";

const topics = ["Order status", "Product recommendation", "Returns or exchange", "Wholesale or partnership", "Press", "Something else"];

export default function ContactPage() {
  useSeo({ title: "Contact Us", description: "Reach Naaz & CO on WhatsApp, email or phone. Replies within one business day.", path: "/contact" });
  const [status, setStatus] = useState("idle");

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus("sending");
    try {
      await sendContactMessage({ name: data.name, email: data.email, phone: data.phone, topic: data.topic, message: data.message });
      track(EVENTS.CONTACT_FORM_SUBMIT, { topic: data.topic });
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to a real person." description="Product questions, order updates, returns and warranty: WhatsApp is fastest, but every channel below is answered within one business day." image={images.hero.contact} imageAlt="Beauty products flatlay" compact primary={{ label: "Chat on WhatsApp", href: whatsappLink("Hi Naaz & CO, I have a question.") }} secondary={{ label: "Read the FAQ", to: "/faq" }} />

      <section className="wrap grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <h2 className="font-display text-[26px] font-extrabold text-navy">Ways to reach us</h2>
          <ul className="mt-6 space-y-5 text-[15px]">
            <li className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#25D366]/15 text-[#128C4A]"><WhatsAppIcon className="size-6" /></span>
              <span><span className="block font-semibold text-navy">WhatsApp</span><a href={whatsappLink("Hi Naaz & CO, I have a question.")} target="_blank" rel="noreferrer" onClick={() => ecommerce.whatsapp("contact_page")} className="text-teal hover:underline">{site.contact.phone}</a><span className="block text-[13px] text-ink">Fastest. Typical reply under 15 minutes in business hours.</span></span>
            </li>
            <li className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-mint text-navy"><MailIcon className="size-6" /></span>
              <span><span className="block font-semibold text-navy">Email</span><a href={`mailto:${site.contact.email}`} className="text-teal hover:underline">{site.contact.email}</a></span>
            </li>
            <li className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sky text-navy"><PhoneIcon className="size-6" /></span>
              <span><span className="block font-semibold text-navy">Phone</span><a href={`tel:${site.contact.phone}`} className="text-teal hover:underline">{site.contact.phone}</a></span>
            </li>
            <li className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-coral-100 text-navy"><ClockIcon className="size-6" /></span>
              <span><span className="block font-semibold text-navy">Hours</span><span className="text-ink">{site.contact.hours}</span></span>
            </li>
            <li className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lavender text-navy"><PinIcon className="size-6" /></span>
              <span><span className="block font-semibold text-navy">Office</span><span className="text-ink">{site.contact.address}</span><span className="block text-[13px] text-ink-light">Online only; no walk-in store yet.</span></span>
            </li>
          </ul>
          <p className="mt-8 rounded-2xl bg-tint p-4 text-[14px] text-navy">
            Looking for an order? <Link to="/track-order" className="font-semibold text-teal hover:underline">Track it here</Link> with your order number and phone.
          </p>
        </div>

        <form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submit} className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <input type="hidden" name="form-name" value="contact" />
          <p className="hidden"><label>Leave empty: <input name="bot-field" /></label></p>
          <h2 className="font-display text-[24px] font-extrabold text-navy">Send a message</h2>
          <p className="mt-1 text-[14px] text-ink">We reply by email or WhatsApp within one business day.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Name" required><Input name="name" required autoComplete="name" /></Field>
            <Field label="Email" required><Input name="email" type="email" required autoComplete="email" /></Field>
            <Field label="Phone"><Input name="phone" type="tel" autoComplete="tel" /></Field>
            <Field label="Topic" required>
              <Select name="topic" defaultValue={topics[0]}>
                {topics.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </Select>
            </Field>
            <Field label="Message" required className="sm:col-span-2"><Textarea name="message" rows={5} required /></Field>
          </div>
          <Button type="submit" variant="navy" className="mt-6 w-full" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send message"}
          </Button>
          {status === "sent" && <p role="status" className="mt-4 rounded-xl bg-mint/40 px-4 py-3 text-[14px] text-navy">Thanks, your message is in. Expect a reply within one business day.</p>}
          {status === "error" && <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">Could not send right now. Please WhatsApp us at {site.contact.phone}.</p>}
        </form>
      </section>
    </>
  );
}
