import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import RatingStars from "../components/ui/RatingStars.jsx";
import { ProductGrid, ProductCarousel } from "../components/product/ProductGrid.jsx";
import { Section, TrustSignals, DepartmentGrid, CategoryGrid, ConcernGrid, BrandStrip, PromoBanner, Testimonials, InstagramFeed, JournalCard } from "../components/sections/Sections.jsx";
import { CashIcon, TruckIcon } from "../components/ui/Icons.jsx";
import { imageProps } from "../lib/images.js";
import { formatPrice } from "../lib/format.js";
import { images } from "../data/images.js";
import { site } from "../config/site.js";
import { sortProducts, interleaveBy } from "../lib/catalog.js";
import { organizationSchema, websiteSchema } from "../lib/schema.js";
import { useVariant } from "../analytics/experiments.js";
import { useStore } from "../store/StoreProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";

function Hero({ threshold }) {
  const variant = useVariant("heroHeadline");
  const headline = variant === "B" ? ["Beauty, tech", "and kitchen."] : ["Good things,", "delivered home."];
  return (
    <section className="relative overflow-hidden bg-tint">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[60%] max-w-[1000px] lg:block" aria-hidden="true">
        <img {...imageProps(images.hero.home, { width: 1600, sizes: "60vw", alt: "", eager: true })} className="h-full w-full object-cover object-right [mask-image:linear-gradient(to_right,transparent,black_16%)]" />
      </div>
      <div className="wrap relative">
        <div className="max-w-[560px] py-8 sm:py-9 lg:py-10 xl:py-12">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.24em] text-navy sm:text-[14px]">Beauty · Electronics · Kitchen</p>
          <h1 className="mt-3 font-display text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] text-navy min-[400px]:text-[42px] sm:text-[56px] xl:text-[66px]">
            {headline[0]}
            <br />
            <span className="text-coral">{headline[1]}</span>
          </h1>
          <p className="mt-5 max-w-[480px] text-[16px] leading-[1.65] text-ink sm:mt-6 sm:text-[17px]">
            Makeup and skincare, everyday electronics and kitchenware, chosen with care and checked before they ship. Delivered to your door, cash on delivery, in 2 to 4 days.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
            <Button to="/best-sellers" arrow>
              Shop best sellers
            </Button>
            <Button to="/shop" variant="outline">
              Browse everything
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[14px] text-[#33506B] sm:mt-8">
            <span className="flex items-center gap-2">
              <RatingStars rating={4.8} size="size-4" /> <strong className="text-navy">4.8/5</strong> from 2,100+ reviews
            </span>
            <span className="flex items-center gap-2"><CashIcon className="size-4 text-teal" /> Cash on delivery</span>
            <span className="flex items-center gap-2"><TruckIcon className="size-4 text-teal" /> Free delivery over {threshold}</span>
          </div>
        </div>
        <img {...imageProps(images.hero.home, { width: 900, sizes: "100vw", alt: images.hero.homeAlt, eager: true })} className="mb-8 aspect-[4/3] w-full rounded-2xl object-cover lg:hidden" />
      </div>
    </section>
  );
}

export default function HomePage() {
  useSeo({ path: "/", jsonLd: [organizationSchema(), websiteSchema()] });
  const { recent } = useStore();
  const { products, articles, settings, categoryBySlug } = useCatalog();
  const departmentOf = (product) => categoryBySlug[product.category]?.department || product.category;
  const threshold = formatPrice(settings.shipping.freeShippingThreshold);
  /* Short lists take turns between departments so the home page shows all three. */
  const bestSellers = interleaveBy(sortProducts(products.filter((product) => product.bestSeller), "rating"), departmentOf).slice(0, 10);
  const newArrivals = interleaveBy(products.filter((product) => product.newArrival), departmentOf).slice(0, 8);
  const featured = interleaveBy(products.filter((product) => product.featured), departmentOf).slice(0, 4);
  const electronics = sortProducts(products.filter((product) => product.category === "electronics"), "featured").slice(0, 8);
  const kitchen = sortProducts(products.filter((product) => product.category === "kitchen"), "featured").slice(0, 8);
  const guides = articles.slice(0, 3);

  return (
    <>
      <Hero threshold={threshold} />

      <section className="bg-white py-6 sm:py-8">
        <div className="wrap">
          <TrustSignals />
        </div>
      </section>

      <Section eyebrow="Shop by department" title="Three departments, one checkout." subtitle="Beauty, electronics and kitchen in a single order, with one delivery fee and one parcel to track." bg="white">
        <DepartmentGrid />
      </Section>

      <Section eyebrow="Best sellers" title="The products our customers reorder." subtitle="Ranked by repeat purchases over the last 90 days." action={{ label: "View all best sellers", to: "/best-sellers" }} align="left" bg="tint">
        <ProductCarousel products={bestSellers} listName="home_best_sellers" />
      </Section>

      <Section eyebrow="New arrivals" title="Fresh this month." action={{ label: "See all new arrivals", to: "/new-arrivals" }} align="left" bg="white">
        <ProductGrid products={newArrivals} listName="home_new_arrivals" />
      </Section>

      {recent.length > 0 && (
        <Section eyebrow="Still thinking about this?" title="Recently viewed." bg="tint" align="left">
          <ProductCarousel products={recent} listName="home_recently_viewed" />
        </Section>
      )}

      {electronics.length > 0 && (
        <Section eyebrow="Electronics" title="Tech for work, travel and downtime." subtitle="Checked before dispatch and covered by warranty." action={{ label: "All electronics", to: "/shop/electronics" }} align="left" bg="tint">
          <ProductCarousel products={electronics} listName="home_electronics" />
        </Section>
      )}

      <Section eyebrow="Beauty" title="Makeup, skincare, hair and fragrance." subtitle="Products that work in real Pakistani weather on real Pakistani skin." action={{ label: "All beauty", to: "/beauty" }} bg="white">
        <CategoryGrid department="beauty" />
      </Section>

      {kitchen.length > 0 && (
        <Section eyebrow="Kitchen" title="For the kitchen you actually cook in." subtitle="Cookware, tools and serveware that stand up to daily use." action={{ label: "All kitchen", to: "/shop/kitchen" }} align="left" bg="tint">
          <ProductCarousel products={kitchen} listName="home_kitchen" />
        </Section>
      )}

      <Section eyebrow="Shop beauty by concern" title="Start with what bothers you." subtitle="Tell us the skin or hair concern and we will show you only the products that address it." bg="white">
        <ConcernGrid />
      </Section>

      <Section eyebrow="Editor’s picks" title="Featured this week." action={{ label: "Shop all", to: "/shop" }} align="left" bg="tint">
        <ProductGrid products={featured} listName="home_featured" />
      </Section>

      <section className="bg-white py-14 lg:py-20">
        <div className="wrap">
          <PromoBanner
            eyebrow="Limited time"
            title="Up to 20% off across beauty, tech and kitchen."
            text="Sale prices run until stock runs out. Every item ships sealed, with the same 7-day return policy."
            image={images.promo.dark}
            cta={{ label: "Shop the sale", to: "/sale", id: "home_sale_banner" }}
          />
        </div>
      </section>

      <Section eyebrow="Featured brands" title="Curated lines, one checkout." subtitle="Our house line plus the brands we would buy ourselves." bg="tint">
        <BrandStrip />
      </Section>

      <Section eyebrow="Buying guides" title="Learn before you buy." subtitle="Honest, practical advice from people who use the products." action={{ label: "Read the Journal", to: "/journal" }} align="left" bg="white">
        <div className="grid gap-6 md:grid-cols-3">
          {guides.map((article) => (
            <JournalCard key={article.slug} article={article} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Customer reviews" title="Real customers. Real results." subtitle="Every review comes from a verified order." bg="tint">
        <Testimonials />
      </Section>

      <Section eyebrow={site.social.handle} title="Follow along on Instagram." bg="white">
        <InstagramFeed />
      </Section>

      <section className="border-t border-line bg-tint py-12">
        <div className="wrap flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
          <div>
            <h2 className="font-display text-[26px] font-extrabold text-navy sm:text-[30px]">Not sure what to pick?</h2>
            <p className="mt-2 text-[16px] text-ink">Message us on WhatsApp and a real person will help you choose, whether it is a foundation shade, a power bank or a pan. Free, no pressure.</p>
          </div>
          <Link to="/contact" className="inline-flex h-[52px] shrink-0 items-center gap-2 rounded-full bg-navy px-7 text-[15px] font-semibold text-white hover:bg-navy-800">
            Get a free recommendation
          </Link>
        </div>
      </section>
    </>
  );
}
