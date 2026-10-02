import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Eyebrow } from "../components/ui/Typography.jsx";
import { LeafIcon, ShieldIcon, SunIcon, ZapIcon } from "../components/ui/Icons.jsx";
import { PageHero, Section, Testimonials } from "../components/sections/Sections.jsx";
import { imageProps } from "../lib/images.js";
import { images } from "../data/images.js";
import { organizationSchema } from "../lib/schema.js";

const values = [
  { Icon: SunIcon, tone: "bg-mint", title: "Made for our weather", text: "Every formula is tested in Karachi humidity and Lahore winters before it goes on sale." },
  { Icon: ShieldIcon, tone: "bg-sky", title: "Authentic, always", text: "Direct sourcing, sealed products and batch codes we will show you on request." },
  { Icon: LeafIcon, tone: "bg-coral-100", title: "Honest ingredients", text: "Full ingredient lists on every page. No vague “herbal blend” and no hidden fragrance." },
  { Icon: ZapIcon, tone: "bg-lavender", title: "Fast, friendly delivery", text: "Same-day dispatch, next-day in Karachi, and a real human on WhatsApp when you need one." },
];

const stats = [
  { value: "12,000+", label: "Orders delivered" },
  { value: "4.8/5", label: "Average rating" },
  { value: "38", label: "Cities served" },
  { value: "92%", label: "Customers who reorder" },
];

export default function AboutPage() {
  useSeo({ title: "About TAAB", description: "TAAB is a Karachi beauty house building makeup, skincare, haircare and fragrance for Pakistani skin and weather.", path: "/about", jsonLd: [organizationSchema()] });

  return (
    <>
      <PageHero
        eyebrow="About TAAB"
        title="Beauty, built in Karachi for all of Pakistan."
        description="TAAB means radiance. We started in 2026 with one question: why is it so hard to find premium beauty products that actually suit our skin tones and our weather?"
        image={images.hero.about}
        imageAlt="A makeup artist applying lipstick"
        primary={{ label: "Shop best sellers", to: "/best-sellers" }}
        secondary={{ label: "Read the Journal", to: "/journal" }}
      />

      <section className="bg-white py-14 lg:py-20">
        <div className="wrap grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Our story</Eyebrow>
            <h2 className="mt-3 font-display text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] text-navy sm:text-[36px]">Too many foundations looked orange. Too many serums stung. We decided to fix that.</h2>
            <p className="mt-5 text-[16px] leading-[1.7] text-ink">Our founders spent two years testing imported products with makeup artists and dermatologists in Karachi. The result was a short list of what works here, and a longer list of what does not. TAAB sells only the first list.</p>
            <p className="mt-4 text-[16px] leading-[1.7] text-ink">Today we carry our own house line plus four Pakistani brands we would use ourselves. Every product page tells you exactly what is inside, how to use it and what it costs, with cash on delivery so you can try without risk.</p>
          </div>
          <img {...imageProps(images.about[1], { width: 1000, sizes: "(min-width: 1024px) 50vw, 100vw", alt: "Beauty products flatlay" })} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-float" />
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
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-[40px] font-extrabold leading-none text-cyan lg:text-[48px]">{stat.value}</p>
              <p className="mt-2 text-[15px] text-white/85">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <Section eyebrow="How we choose products" title="Three tests before anything goes on sale." bg="white">
        <ol className="grid gap-6 lg:grid-cols-3">
          {[
            ["01", "Weather test", "Two weeks of wear in 35°C and 80% humidity. If a foundation slides or a serum pills, it is out."],
            ["02", "Skin-tone test", "Swatched on a panel of 40 customers from fair to deep. Shades that disappear on only half the panel are reformulated."],
            ["03", "Ingredient review", "A dermatologist checks every list for irritants and unverified claims. If we cannot explain an ingredient, we do not sell it."],
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
          <h2 className="font-display text-[28px] font-extrabold text-navy sm:text-[34px]">Ready to try TAAB?</h2>
          <p className="max-w-xl text-[16px] text-ink">Start with the Skincare Starter Set or a single Velvet Matte, and pay when it arrives.</p>
          <Button to="/shop" arrow>
            Shop all products
          </Button>
        </div>
      </section>
    </>
  );
}
