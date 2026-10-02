import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import RatingStars from "../components/ui/RatingStars.jsx";
import { Eyebrow } from "../components/ui/Typography.jsx";
import { ProductGrid, ProductCarousel } from "../components/product/ProductGrid.jsx";
import { Section, TrustSignals, CategoryGrid, ConcernGrid, BrandStrip, PromoBanner, Testimonials, InstagramFeed, JournalCard } from "../components/sections/Sections.jsx";
import { CashIcon, TruckIcon } from "../components/ui/Icons.jsx";
import { imageProps } from "../lib/images.js";
import { formatPrice } from "../lib/format.js";
import { images } from "../data/images.js";
import { sortProducts } from "../lib/catalog.js";
import { organizationSchema, websiteSchema } from "../lib/schema.js";
import { useVariant } from "../analytics/experiments.js";
import { useStore } from "../store/StoreProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";

function Hero({ threshold }) {
  const variant = useVariant("heroHeadline");
  const headline = variant === "B" ? ["Beauty that keeps", "up with you."] : ["Radiance,", "made simple."];
  return (
    <section className="relative overflow-hidden bg-tint">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[60%] max-w-[1000px] lg:block" aria-hidden="true">
        <img {...imageProps(images.hero.home, { width: 1600, sizes: "60vw", alt: "", eager: true })} className="h-full w-full object-cover object-right [mask-image:linear-gradient(to_right,transparent,black_16%)]" />
      </div>
      <div className="wrap relative">
        <div className="max-w-[560px] py-10 sm:py-12 lg:py-16 xl:py-20">
          <Eyebrow tone="navy">Karachi’s new beauty house</Eyebrow>
          <h1 className="mt-4 font-display text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] text-navy min-[400px]:text-[42px] sm:text-[56px] xl:text-[66px]">
            {headline[0]}
            <br />
            <span className="text-coral">{headline[1]}</span>
          </h1>
          <p className="mt-5 max-w-[480px] text-[16px] leading-[1.65] text-ink sm:mt-6 sm:text-[17px]">
            Makeup, skincare, haircare and fragrance made for Pakistani skin and Pakistani weather. Delivered to your door, cash on delivery, in 2 to 4 days.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
            <Button to="/best-sellers" arrow>
              Shop best sellers
            </Button>
            <Button to="/shop/skincare" variant="outline">
              Explore skincare
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
        <img {...imageProps(images.hero.home, { width: 900, sizes: "100vw", alt: "Makeup artist applying blush", eager: true })} className="mb-8 aspect-[4/3] w-full rounded-2xl object-cover lg:hidden" />
      </div>
    </section>
  );
}

export default function HomePage() {
  useSeo({ path: "/", jsonLd: [organizationSchema(), websiteSchema()] });
  const { recent } = useStore();
  const { products, articles, settings } = useCatalog();
  const threshold = formatPrice(settings.shipping.freeShippingThreshold);
  const bestSellers = sortProducts(products.filter((product) => product.bestSeller), "rating").slice(0, 8);
  const newArrivals = products.filter((product) => product.newArrival).slice(0, 8);
  const featured = products.filter((product) => product.featured).slice(0, 4);
  const guides = articles.slice(0, 3);

  return (
    <>
      <Hero threshold={threshold} />

      <section className="bg-white py-6 sm:py-8">
        <div className="wrap">
          <TrustSignals />
        </div>
      </section>

      <Section eyebrow="Shop by category" title="Everything beauty, under one roof." subtitle="Five categories, one standard: products that work in real Pakistani weather on real Pakistani skin." bg="white">
        <CategoryGrid />
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

      <Section eyebrow="Shop by concern" title="Start with what bothers you." subtitle="Tell us the concern and we will show you only the products that address it." bg="white">
        <ConcernGrid />
      </Section>

      <Section eyebrow="Editor’s picks" title="Featured this week." action={{ label: "Shop all", to: "/shop" }} align="left" bg="tint">
        <ProductGrid products={featured} listName="home_featured" />
      </Section>

      <section className="bg-white py-14 lg:py-20">
        <div className="wrap">
          <PromoBanner
            eyebrow="Limited time"
            title="Up to 20% off palettes, brushes and sets."
            text="Sale prices run until stock runs out. Every item ships sealed, with the same 7-day return policy."
            image={images.promo.dark}
            cta={{ label: "Shop the sale", to: "/sale", id: "home_sale_banner" }}
          />
        </div>
      </section>

      <Section eyebrow="Featured brands" title="Curated lines, one checkout." subtitle="Our house line plus four Pakistani brands we would use ourselves." bg="tint">
        <BrandStrip />
      </Section>

      <Section eyebrow="Beauty guides" title="Learn before you buy." subtitle="Honest, practical advice from our artists and dermatologists." action={{ label: "Read the Journal", to: "/journal" }} align="left" bg="white">
        <div className="grid gap-6 md:grid-cols-3">
          {guides.map((article) => (
            <JournalCard key={article.slug} article={article} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Customer reviews" title="Real customers. Real results." subtitle="Every review comes from a verified order." bg="tint">
        <Testimonials />
      </Section>

      <Section eyebrow="@taab.beauty" title="Follow along on Instagram." bg="white">
        <InstagramFeed />
      </Section>

      <section className="border-t border-line bg-tint py-12">
        <div className="wrap flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
          <div>
            <h2 className="font-display text-[26px] font-extrabold text-navy sm:text-[30px]">Not sure where to start?</h2>
            <p className="mt-2 text-[16px] text-ink">Send us a daylight selfie on WhatsApp and we will recommend a shade and a routine. Free, no pressure.</p>
          </div>
          <Link to="/contact" className="inline-flex h-[52px] items-center gap-2 rounded-full bg-navy px-7 text-[15px] font-semibold text-white hover:bg-navy-800">
            Get a free recommendation
          </Link>
        </div>
      </section>
    </>
  );
}
