import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { WhatsAppIcon } from "../components/ui/Icons.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { ProductGrid, ProductCarousel } from "../components/product/ProductGrid.jsx";
import { Section, HeroCarousel, TrustSignals, CategoryCollage, DepartmentGrid, BrandStrip, Testimonials, InstagramFeed } from "../components/sections/Sections.jsx";
import { images } from "../data/images.js";
import { site } from "../config/site.js";
import { sortProducts, interleaveBy } from "../lib/catalog.js";
import { organizationSchema, websiteSchema } from "../lib/schema.js";
import { useStore } from "../store/StoreProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";

const FEED_STEP = 12;

/* "Clothing, Beauty and Appliances" from the department names. */
function listNames(names) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default function HomePage() {
  useSeo({ path: "/", jsonLd: [organizationSchema(), websiteSchema()] });
  const { recent } = useStore();
  const { products, brands, departments, departmentOf, settings } = useCatalog();
  const [feedSize, setFeedSize] = useState(FEED_STEP);
  const percent = settings.payments.advancePercent;
  const names = departments.map((department) => department.name);
  const order = departments.map((department) => department.id);
  /* Departments with products, so the section backgrounds keep alternating when one is empty. */
  const stocked = departments.filter((department) => products.some((product) => departmentOf(product) === department.id));
  const hasBestSellers = products.some((product) => product.bestSeller);
  const hasNewArrivals = products.some((product) => product.newArrival);
  const showBrands = brands.some((brand) => brand.featured && products.some((product) => product.brand === brand.name));
  const whatsapp = whatsappLink(`Hi ${site.name}, I am looking for something. Can you help?`);

  /* The first slide introduces the store; then every department gets its own slide. */
  const slides = useMemo(
    () => [
      {
        id: "store",
        label: site.name,
        eyebrow: names.join(" · "),
        title: "Good things,",
        accent: "delivered home.",
        text: `${listNames(names)}, chosen with care and checked before they ship. ${percent >= 100 ? "Pay in advance to confirm your order." : percent <= 0 ? "Pay when your order arrives." : `Pay ${percent}% in advance and the rest when your order arrives.`}`,
        image: images.hero.home,
        imageAlt: images.hero.homeAlt,
        primary: hasBestSellers ? { label: "Shop best sellers", to: "/best-sellers" } : products.length ? { label: "Shop all products", to: "/shop" } : { label: "Contact us", to: "/contact" },
        secondary: hasBestSellers ? { label: "Browse everything", to: "/shop" } : undefined,
      },
      ...departments.map((department) => ({
        id: department.id,
        label: department.name,
        eyebrow: `Shop ${department.name}`,
        title: department.tagline || department.name,
        text: department.description,
        image: department.image,
        imageAlt: department.name,
        primary: { label: `${stocked.includes(department) ? "Shop" : "Explore"} ${department.name}`, to: `/department/${department.id}` },
        secondary: hasNewArrivals ? { label: "New arrivals", to: "/new-arrivals" } : undefined,
      })),
    ],
    [departments, percent, products]
  );

  /* Short lists take turns between departments so the page shows a bit of everything. */
  const bestSellers = interleaveBy(sortProducts(products.filter((product) => product.bestSeller), "rating"), departmentOf, order).slice(0, 12);
  const newArrivals = interleaveBy(sortProducts(products.filter((product) => product.newArrival), "newest"), departmentOf, order).slice(0, 8);
  const feed = useMemo(() => interleaveBy(sortProducts(products, "featured"), departmentOf, order), [products, departmentOf, order.join()]);

  return (
    <>
      <HeroCarousel slides={slides} />

      <section className="bg-white py-6 sm:py-8">
        <div className="wrap">
          <TrustSignals />
        </div>
      </section>

      {products.length > 0 ? (
        <Section eyebrow="Shop by category" title="Everything we carry, at a glance." subtitle="Tap a category to see all of it." bg="white" className="!pt-8 lg:!pt-10">
          <CategoryCollage />
        </Section>
      ) : (
        <Section eyebrow="Coming soon" title="Our products are on their way." subtitle="We are adding them to the store now. Message us if you are looking for something, or subscribe below to hear when they arrive." bg="tint">
          <div className="flex flex-wrap justify-center gap-3">
            {whatsapp && (
              <Button href={whatsapp} target="_blank" rel="noreferrer" variant="whatsapp">
                <WhatsAppIcon className="size-5" /> Chat on WhatsApp
              </Button>
            )}
            <Button to="/contact" variant={whatsapp ? "ghost" : "navy"}>
              Contact us
            </Button>
          </div>
        </Section>
      )}

      <Section eyebrow="Shop by department" title="Many departments, one checkout." subtitle={`${listNames(names)} in a single order, with one delivery fee and one parcel to track.`} bg={products.length ? "tint" : "white"}>
        <DepartmentGrid />
      </Section>

      {bestSellers.length > 0 && (
        <Section eyebrow="Best sellers" title="Our most popular picks." action={{ label: "View all best sellers", to: "/best-sellers" }} align="left" bg="white">
          <ProductCarousel products={bestSellers} listName="home_best_sellers" />
        </Section>
      )}

      {stocked.map((department, index) => {
        const own = products.filter((product) => departmentOf(product) === department.id);
        const picks = interleaveBy(sortProducts(own, "featured"), (product) => product.category).slice(0, 10);
        return (
          <Section key={department.id} eyebrow={department.name} title={department.tagline || department.name} action={{ label: `All ${department.name}`, to: `/department/${department.id}` }} align="left" bg={index % 2 === 0 ? "tint" : "white"}>
            <ProductCarousel products={picks} listName={`home_${department.id}`} />
          </Section>
        );
      })}

      {newArrivals.length > 0 && (
        <Section eyebrow="New arrivals" title="Fresh this month." action={{ label: "See all new arrivals", to: "/new-arrivals" }} align="left" bg={stocked.length % 2 === 0 ? "tint" : "white"}>
          <ProductGrid products={newArrivals} listName="home_new_arrivals" />
        </Section>
      )}

      {recent.length > 0 && (
        <Section eyebrow="Still thinking about this?" title="Recently viewed." bg="tint" align="left">
          <ProductCarousel products={recent} listName="home_recently_viewed" />
        </Section>
      )}

      {feed.length > 0 && (
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
      )}

      {showBrands && (
        <Section eyebrow="Featured brands" title="Curated lines, one checkout." subtitle="The brands we carry." bg="tint">
          <BrandStrip />
        </Section>
      )}

      <Testimonials bg="white" />

      {site.social.instagram && (
        <Section eyebrow="Instagram" title="Follow along on Instagram." bg="tint">
          <InstagramFeed />
        </Section>
      )}

      {products.length > 0 && (
        <section className="border-t border-line bg-tint py-12">
          <div className="wrap flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
            <div>
              <h2 className="font-display text-[26px] font-extrabold text-navy sm:text-[30px]">Not sure what to pick?</h2>
              <p className="mt-2 text-[16px] text-ink">{site.contact.whatsapp ? "Message us on WhatsApp" : "Send us a message"} and a real person will help you choose. Free, no pressure.</p>
            </div>
            <Link to="/contact" className="inline-flex h-[52px] shrink-0 items-center gap-2 rounded-full bg-navy px-7 text-[15px] font-semibold text-white hover:bg-navy-800">
              Get a free recommendation
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
