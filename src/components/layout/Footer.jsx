import { Link } from "react-router-dom";
import Logo from "../Logo.jsx";
import Newsletter from "./Newsletter.jsx";
import { socialIcons, PinIcon, MailIcon, PhoneIcon } from "../ui/Icons.jsx";
import { site, footerLinks } from "../../config/site.js";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";

const socialOrder = ["instagram", "tiktok", "facebook", "youtube", "reddit"];

function LinkColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-cyan">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="text-[14px] text-white/85 transition-colors hover:text-coral">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative bg-navy-900 text-white print:hidden">
      <svg className="absolute inset-x-0 top-0 h-5 w-full text-white" viewBox="0 0 1440 20" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0 H1440 V3 C1200 18 760 16 0 8 Z" fill="currentColor" />
      </svg>

      <div className="wrap pt-16 pb-10">
        <div className="grid gap-8 rounded-2xl bg-navy-800 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-cyan">Newsletter</p>
            <h2 className="mt-2 font-display text-[24px] font-extrabold sm:text-[28px]">Get 10% off your first order.</h2>
            <p className="mt-2 text-[15px] text-white/80">Launches, restocks and honest beauty advice. One email a week, no spam.</p>
          </div>
          <Newsletter source="footer" />
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo variant="light" />
            <p className="mt-4 max-w-sm text-[14px] leading-[1.7] text-white/80">{site.description}</p>
            <ul className="mt-5 space-y-2 text-[14px] text-white/80">
              <li className="flex items-start gap-2"><PinIcon className="mt-0.5 size-4 shrink-0 text-cyan" /> {site.contact.address}</li>
              <li className="flex items-center gap-2"><PhoneIcon className="size-4 text-cyan" /> <a href={`tel:${site.contact.phone}`} className="hover:text-coral">{site.contact.phone}</a></li>
              <li className="flex items-center gap-2"><MailIcon className="size-4 text-cyan" /> <a href={`mailto:${site.contact.email}`} className="hover:text-coral">{site.contact.email}</a></li>
            </ul>
            <ul className="mt-5 flex gap-3">
              {socialOrder.map((key) => {
                const Icon = socialIcons[key];
                return (
                  <li key={key}>
                    <a
                      href={site.social[key]}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`TAAB on ${key.charAt(0).toUpperCase() + key.slice(1)}`}
                      title={`TAAB on ${key.charAt(0).toUpperCase() + key.slice(1)}`}
                      onClick={() => track(EVENTS.SOCIAL_CLICK, { network: key, placement: "footer" })}
                      className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-coral"
                    >
                      <Icon className="size-5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
          <LinkColumn title="Shop" links={footerLinks.shop} />
          <LinkColumn title="Help" links={footerLinks.help} />
          <LinkColumn title="Company" links={footerLinks.company} />
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-[12px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.legalName} All rights reserved.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Cash on Delivery</span>
            <span>Bank Transfer</span>
            <span>Visa / Mastercard</span>
            <span>TCS · Leopards · M&P</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
