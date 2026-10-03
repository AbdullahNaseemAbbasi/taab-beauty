import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import { ProductGrid, ProductCarousel } from "../components/product/ProductGrid.jsx";
import { Section, HeroCarousel, TrustSignals, CategoryCollage, DepartmentGrid, BrandStrip, Testimonials, InstagramFeed } from "../components/sections/Sections.jsx";
import { images } from "../data/images.js";
import { site } from "../config/site.js";
import { sortProducts, interleaveBy } from "../lib/catalog.js";
import { organizationSchema, websiteSchema } from "../lib/schema.js";
import { useStore } from "../store/StoreProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";

const FEED_STEP = 12;

/* "Beauty, Appliances and Clothes" from the department names. */
function listNames(names) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default function HomePage() {
  useSeo({ path: "/", jsonLd: [organizationSchema(), websiteSchema()] });
  const { recent } = useStore();
  const { products, departments, departmentOf, settings } = useCatalog();
  const [feedSize, setFeedSize] = useState(FEED_STEP);
  const percent = settings.payments.advancePercent;
  const names = departments.map((department) => department.name);

  /* The first slide introduces the store; then every department gets its own slide. */
  const slides = useMemo(
    () => [
      {
        id: "store",
        label: site.name,
        eyebrow: names.join(" · "),
        title: "Good things,",
        accent: "delivered home.",
        text: `${listNames(names)}, chosen with care and checked before they ship. ${percent >= 100 ? "Pay in advance to confirm your order." : `Pay ${percent}% in advance and the rest when your order arrives.`}`,
        image: images.hero.home,
        imageAlt: images.hero.homeAlt,
        primary: { label: "Shop best sellers", to: "/best-sellers" },
        secondary: { label: "Browse everything", to: "/shop" },
      },
      ...departments.map((department) => ({
        id: department.id,
        label: department.name,
        eyebrow: `Shop ${department.name}`,
        title: department.tagline || department.name,
        text: department.description,
        image: department.image,
        imageAlt: department.name,
        primary: { label: `Shop ${department.name}`, to: `/department/${department.id}` },
        secondary: { label: "New arrivals", to: "/new-arrivals" },
      })),
    ],
    [departments, percent]
  );

  /* Short lists take turns between departments so the page shows a bit of everything. */
  const bestSellers = interleaveBy(sortProducts(products.filter((product) => product.bestSeller), "rating"), departmentOf).slice(0, 12);
  const newArrivals = interleaveBy(products.filter((product) => product.newArrival), departmentOf).slice(0, 8);
  const feed = useMemo(() => interleaveBy(sortProducts(products, "featured"), departmentOf), [products, departmentOf]);

  return (
    <>
      <HeroCarousel slides={slides} />

      <section className="bg-white py-6 sm:py-8">
        <div className="wrap">
          <TrustSignals />
        </div>
      </section>

      <Section eyebrow="Shop by category" title="Everything we carry, at a glance." subtitle="Tap a category to see all of it." bg="white" className="!pt-8 lg:!pt-10">
        <CategoryCollage />
      </Section>

      <Section eyebrow="Shop by department" title="Many departments, one checkout." subtitle={`${listNames(names)} in a single order, with one delivery fee and one parcel to track.`} bg="tint">
        <DepartmentGrid />
      </Section>

      <Section eyebrow="Best sellers" title="The products our customers reorder." action={{ label: "View all best sellers", to: "/best-sellers" }} align="left" bg="white">
        <ProductCarousel products={bestSellers} listName="home_best_sellers" />
      </Section>

      {departments.map((department, index) => {
        const own = products.filter((product) => departmentOf(product) === department.id);
        if (!own.length) return null;
        const picks = interleaveBy(sortProducts(own, "featured"), (product) => product.category).slice(0, 10);
        return (
          <Section key={department.id} eyebrow={department.name} title={department.tagline || department.name} action={{ label: `All ${department.name}`, to: `/department/${department.id}` }} align="left" bg={index % 2 === 0 ? "tint" : "white"}>
            <ProductCarousel products={picks} listName={`home_${department.id}`} />
          </Section>
        );
      })}

      <Section eyebrow="New arrivals" title="Fresh this month." action={{ label: "See all new arrivals", to: "/new-arrivals" }} align="left" bg={departments.length % 2 === 0 ? "tint" : "white"}>
        <ProductGrid products={newArrivals} listName="home_new_arrivals" />
      </Section>

      {recent.length > 0 && (
        <Section eyebrow="Still thinking about this?" title="Recently viewed." bg="tint" align="left">
          <ProductCarousel products={recent} listName="home_recently_viewed" />
        </Section>
      )}

      <Section eyebrow="Explore" title="A bit of everything." subtitle="Picked from every department, mixed up." bg="white">
        <ProductGrid products={feed.slice(0, feedSize)} listName="home_feed" />
        {feedSize < feed.length && (
          <div className="mt-8 text-center">
            <button type="button" onClick={() => setFeedSize((size) => size + FEED_STEP)} className="inline-flex h-[52px] items-center rounded-full border-2 border-navy px-8 text-[15px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
              Show more products
            </button>
          </div>
        )}
      </Section>

      <Section eyebrow="Featured brands" title="Curated lines, one checkout." subtitle="Our house line plus the brands we would buy ourselves." bg="tint">
        <BrandStrip />
      </Section>

      <Section eyebrow="Customer reviews" title="Real customers. Real results." subtitle="Every review comes from a verified order." bg="white">
        <Testimonials />
      </Section>

      {site.social.instagram && (
        <Section eyebrow="Instagram" title="Follow along on Instagram." bg="tint">
          <InstagramFeed />
        </Section>
      )}

      <section className="border-t border-line bg-tint py-12">
        <div className="wrap flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
          <div>
            <h2 className="font-display text-[26px] font-extrabold text-navy sm:text-[30px]">Not sure what to pick?</h2>
            <p className="mt-2 text-[16px] text-ink">Message us on WhatsApp and a real person will help you choose, whether it is a foundation shade, a pair of earbuds or the right size. Free, no pressure.</p>
          </div>
          <Link to="/contact" className="inline-flex h-[52px] shrink-0 items-center gap-2 rounded-full bg-navy px-7 text-[15px] font-semibold text-white hover:bg-navy-800">
            Get a free recommendation
          </Link>
        </div>
      </section>
    </>
  );
}
