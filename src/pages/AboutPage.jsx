import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Eyebrow } from "../components/ui/Typography.jsx";
import { LeafIcon, ShieldIcon, SunIcon, ZapIcon } from "../components/ui/Icons.jsx";
import { PageHero, Section, Testimonials } from "../components/sections/Sections.jsx";
import { imageProps } from "../lib/images.js";
import { formatPrice } from "../lib/format.js";
import { images } from "../data/images.js";
import { site } from "../config/site.js";
import { organizationSchema } from "../lib/schema.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";

const values = [
  { Icon: SunIcon, tone: "bg-mint", title: "Chosen for life here", text: "Makeup that holds in humidity, chargers that cope with load-shedding and cookware made for daily desi cooking." },
  { Icon: ShieldIcon, tone: "bg-sky", title: "Genuine, always", text: "Bought from the brand or its authorised distributor. Sealed beauty, boxed electronics, nothing grey-market." },
  { Icon: LeafIcon, tone: "bg-coral-100", title: "Honest details", text: "Full ingredient lists, real specifications and plain warranty terms on every product page." },
  { Icon: ZapIcon, tone: "bg-lavender", title: "Fast, friendly delivery", text: "Same-day dispatch, next-day in Karachi, and a real human on WhatsApp when you need one." },
];

export default function AboutPage() {
  const { settings } = useCatalog();
  useSeo({ title: `About ${site.name}`, description: `${site.name} is a Karachi store for beauty, electronics and kitchenware, delivered across Pakistan with cash on delivery.`, path: "/about", jsonLd: [organizationSchema()] });

  const facts = [
    { value: "3", label: "Departments, one checkout" },
    { value: "2 to 4 days", label: "Delivery across Pakistan" },
    { value: "7 days", label: "To return an unused item" },
    { value: formatPrice(settings.shipping.freeShippingThreshold), label: "Free delivery above this" },
  ];

  return (
    <>
      <PageHero
        eyebrow={`About ${site.name}`}
        title="Things you will be proud to bring home."
        description="Naaz means pride. We started in Karachi in 2026 to make it easy to buy good beauty, electronics and kitchenware from one store you can trust."
        image={images.hero.about}
        imageAlt={images.hero.aboutAlt}
        primary={{ label: "Shop best sellers", to: "/best-sellers" }}
        secondary={{ label: "Read the Journal", to: "/journal" }}
      />

      <section className="bg-white py-14 lg:py-20">
        <div className="wrap grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Our story</Eyebrow>
            <h2 className="mt-3 font-display text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] text-navy sm:text-[36px]">Shopping online should not feel like a gamble.</h2>
            <p className="mt-5 text-[16px] leading-[1.7] text-ink">Too many orders arrive as the wrong shade, a copy of the real thing or a gadget that stops working in a week. {site.name} exists to take that risk away: a short, carefully chosen range, described honestly and checked before it leaves us.</p>
            <p className="mt-4 text-[16px] leading-[1.7] text-ink">We began with beauty and now carry electronics and kitchenware too, because the same promise matters everywhere in the house. Every product page tells you exactly what you are getting and what it costs, with cash on delivery so you can order without worry.</p>
          </div>
          <img {...imageProps(images.about[1], { width: 1000, sizes: "(min-width: 1024px) 50vw, 100vw", alt: "" })} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-float" />
        </div>
      </section>

      <Section eyebrow="What we stand for" title="Four promises on every order." bg="tint">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ Icon, tone, title, text }) => (
            <li key={title} className="rounded-2xl border border-line bg-white p-6">
              <span className={`grid size-12 place-items-center rounded-full ${tone} text-navy`}>
                <Icon className="size-6" />
              </span>
              <h3 className="mt-4 font-display text-[18px] font-extrabold text-navy">{title}</h3>
              <p className="mt-2 text-[14px] leading-[1.65] text-ink">{text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <section className="relative overflow-hidden bg-navy-800 py-14 text-white lg:py-20">
        <div className="wrap grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <p className="font-display text-[34px] font-extrabold leading-none text-cyan lg:text-[42px]">{fact.value}</p>
              <p className="mt-2 text-[15px] text-white/85">{fact.label}</p>
            </div>
          ))}
        </div>
      </section>

      <Section eyebrow="How we choose products" title="Three checks before anything goes on sale." bg="white">
        <ol className="grid gap-6 lg:grid-cols-3">
          {[
            ["01", "Sourced properly", "We buy from the brand or its authorised distributor, so the warranty is real and the batch codes check out."],
            ["02", "Checked before dispatch", "Seals and expiry dates on beauty, a power-on test for electronics, and a chip-and-crack check on kitchenware."],
            ["03", "Described honestly", "Ingredients, specifications, what is in the box and what the warranty covers, written in plain words."],
          ].map(([number, title, text]) => (
            <li key={number} className="rounded-2xl bg-tint p-6">
              <span className="font-display text-[32px] font-extrabold text-coral">{number}</span>
              <h3 className="mt-2 font-display text-[20px] font-extrabold text-navy">{title}</h3>
              <p className="mt-2 text-[15px] leading-[1.65] text-ink">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Customer reviews" title="What customers say." bg="tint">
        <Testimonials />
      </Section>

      <section className="bg-white py-14">
        <div className="wrap flex flex-col items-center gap-5 text-center">
          <h2 className="font-display text-[28px] font-extrabold text-navy sm:text-[34px]">Ready to try {site.name}?</h2>
          <p className="max-w-xl text-[16px] text-ink">Start with a best seller from any department, and pay when it arrives.</p>
          <Button to="/shop" arrow>
            Shop all products
          </Button>
        </div>
      </section>
    </>
  );
}
