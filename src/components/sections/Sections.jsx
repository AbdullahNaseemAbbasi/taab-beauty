import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../ui/Button.jsx";
import RatingStars from "../ui/RatingStars.jsx";
import { SectionHeading } from "../ui/Typography.jsx";
import { trustIcons, InstagramIcon, ArrowIcon, ChevronLeftIcon, ChevronRightIcon } from "../ui/Icons.jsx";
import { departmentLinks } from "../layout/MegaMenu.jsx";
import { imageProps } from "../../lib/images.js";
import { sortProducts } from "../../lib/catalog.js";
import { site } from "../../config/site.js";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { testimonials } from "../../data/reviews.js";
import { instagramPosts } from "../../data/misc.js";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";

/* ---------- Page hero shared by inner pages ---------- */
export function PageHero({ eyebrow, title, description, image, imageAlt = "", primary, secondary, children, compact = false }) {
  return (
    <section className="relative overflow-hidden bg-tint">
      {image && (
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] max-w-[1000px] lg:block" aria-hidden="true">
          <img {...imageProps(image, { width: 1400, sizes: "58vw", alt: "", eager: true })} className="h-full w-full object-cover object-right [mask-image:linear-gradient(to_right,transparent,black_18%)]" />
        </div>
      )}
      <div className="wrap relative">
        <div className={`max-w-[560px] ${compact ? "py-8 lg:py-10" : "py-8 lg:py-12"}`}>
          {eyebrow && <p className="text-[13px] font-extrabold uppercase tracking-[0.24em] text-navy sm:text-[14px]">{eyebrow}</p>}
          <h1 className={`mt-4 font-display font-extrabold leading-[1.05] tracking-[-0.025em] text-navy ${compact ? "text-[34px] sm:text-[44px]" : "text-[38px] sm:text-[50px] lg:text-[58px]"}`}>{title}</h1>
          {description && <p className="mt-5 max-w-[480px] text-[17px] leading-[1.65] text-ink">{description}</p>}
          {(primary || secondary) && (
            <div className="mt-7 flex flex-wrap gap-3">
              {primary && (
                <Button to={primary.to} href={primary.href} arrow>
                  {primary.label}
                </Button>
              )}
              {secondary && (
                <Button to={secondary.to} variant="outline">
                  {secondary.label}
                </Button>
              )}
            </div>
          )}
          {children}
        </div>
        {image && <img {...imageProps(image, { width: 900, sizes: "100vw", alt: imageAlt })} className="mb-10 aspect-[4/3] w-full rounded-2xl object-cover lg:hidden" />}
      </div>
    </section>
  );
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="border-b border-line bg-tint">
      <div className="wrap py-8">
        {children}
        <h1 className="font-display text-[30px] font-extrabold tracking-[-0.02em] text-navy sm:text-[38px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[16px] text-ink">{description}</p>}
      </div>
    </div>
  );
}

/* ---------- Home hero: one slide per department, changing by itself ---------- */
export function HeroCarousel({ slides, interval = 6000 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef(null);
  const count = slides.length;
  const active = count ? index % count : 0;
  const go = useCallback((next) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), interval);
    return () => clearInterval(timer);
  }, [paused, count, interval]);

  if (!count) return null;

  return (
    <section
      className="relative overflow-hidden bg-tint"
      aria-roledescription="carousel"
      aria-label="Featured departments"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current == null) return;
        const moved = event.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(moved) > 50) go(active + (moved < 0 ? 1 : -1));
      }}
    >
      <div className="grid">
        {slides.map((slide, position) => {
          const current = position === active;
          const Heading = position === 0 ? "h1" : "h2";
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${position + 1} of ${count}`}
              aria-hidden={!current}
              inert={!current}
              className={`relative col-start-1 row-start-1 transition-opacity duration-700 ${current ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[60%] max-w-[1000px] lg:block" aria-hidden="true">
                <img {...imageProps(slide.image, { width: 1600, sizes: "60vw", alt: "", eager: position === 0 })} className="h-full w-full object-cover object-center [mask-image:linear-gradient(to_right,transparent,black_16%)]" />
              </div>
              <div className="wrap relative">
                <div className="flex max-w-[560px] flex-col justify-center py-8 sm:py-9 lg:min-h-[470px] lg:py-10">
                  <p className="text-[13px] font-extrabold uppercase tracking-[0.24em] text-navy sm:text-[14px]">{slide.eyebrow}</p>
                  <Heading className="mt-3 font-display text-[36px] font-extrabold leading-[1.04] tracking-[-0.03em] text-navy min-[400px]:text-[40px] sm:text-[52px] xl:text-[60px]">
                    {slide.title}
                    {slide.accent && (
                      <>
                        <br />
                        <span className="text-coral">{slide.accent}</span>
                      </>
                    )}
                  </Heading>
                  <p className="mt-5 max-w-[480px] text-[16px] leading-[1.65] text-ink sm:text-[17px]">{slide.text}</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button to={slide.primary.to} arrow onClick={() => track(EVENTS.PROMO_CLICK, { promotion_name: `hero_${slide.id}` })}>
                      {slide.primary.label}
                    </Button>
                    {slide.secondary && (
                      <Button to={slide.secondary.to} variant="outline">
                        {slide.secondary.label}
                      </Button>
                    )}
                  </div>
                </div>
                <img {...imageProps(slide.image, { width: 900, sizes: "100vw", alt: slide.imageAlt || "", eager: position === 0 })} className="mb-14 aspect-[4/3] w-full rounded-2xl object-cover lg:hidden" />
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="wrap pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-between lg:bottom-6">
          <div className="pointer-events-auto flex items-center gap-2" role="tablist" aria-label="Choose a slide">
            {slides.map((slide, position) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={position === active}
                aria-label={`Show ${slide.label}`}
                title={slide.label}
                onClick={() => go(position)}
                className={`h-2.5 rounded-full transition-all ${position === active ? "w-8 bg-coral" : "w-2.5 bg-navy/25 hover:bg-navy/50"}`}
              />
            ))}
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button type="button" aria-label="Previous slide" title="Previous" onClick={() => go(active - 1)} className="grid size-10 place-items-center rounded-full border border-line bg-white text-navy shadow-card hover:border-navy">
              <ChevronLeftIcon className="size-5" />
            </button>
            <button type="button" aria-label="Next slide" title="Next" onClick={() => go(active + 1)} className="grid size-10 place-items-center rounded-full border border-line bg-white text-navy shadow-card hover:border-navy">
              <ChevronRightIcon className="size-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Trust signals (the payment one follows the advance setting) ---------- */
export function TrustSignals({ compact = false }) {
  const { settings } = useCatalog();
  const percent = settings.payments.advancePercent;
  const items = [
    { icon: "shield", title: "100% Genuine", text: "Sourced directly, checked and sealed." },
    { icon: "truck", title: "Nationwide Delivery", text: `${settings.shipping.estimatedDays} anywhere in Pakistan.` },
    percent >= 100
      ? { icon: "cash", title: "Advance Payment", text: "Pay by transfer to confirm your order." }
      : { icon: "cash", title: `${percent}% Advance`, text: `Pay ${100 - percent}% when your order arrives.` },
    { icon: "refresh", title: "7-Day Returns", text: "Unused items in original packaging." },
  ];
  return (
    <ul className={`grid gap-3 sm:gap-4 ${compact ? "grid-cols-2" : "grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4"}`}>
      {items.map((item) => {
        const Icon = trustIcons[item.icon];
        return (
          <li key={item.icon} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-mint text-navy">
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block text-[14px] font-bold text-navy">{item.title}</span>
              {!compact && <span className="hidden text-[12px] text-ink sm:block">{item.text}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Every category at a glance: two product photos per tile ---------- */
export function CategoryCollage() {
  const { categories, products, departmentById } = useCatalog();
  const tiles = categories
    .map((category) => {
      const own = sortProducts(products.filter((product) => product.category === category.slug), "featured");
      const photos = [...new Set(own.map((product) => product.images[0]).filter(Boolean))].slice(0, 2);
      if (photos.length < 2 && category.image && !photos.includes(category.image)) photos.push(category.image);
      return { category, count: own.length, photos };
    })
    .filter((tile) => tile.count > 0 && tile.photos.length > 0);

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {tiles.map(({ category, count, photos }) => (
        <li key={category.slug}>
          <Link
            to={`/shop/${category.slug}`}
            onClick={() => track(EVENTS.SELECT_CATEGORY, { category: category.slug, placement: "home_collage" })}
            className="group block overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-float"
          >
            <span className={`grid aspect-[4/3] gap-0.5 bg-line ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {photos.map((photo) => (
                <span key={photo} className="overflow-hidden bg-tint">
                  <img {...imageProps(photo, { width: 480, sizes: "(min-width: 1024px) 12vw, 25vw", alt: "" })} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </span>
              ))}
            </span>
            <span className="block px-4 py-3">
              <span className="block font-display text-[16px] font-extrabold text-navy group-hover:text-coral">{category.name}</span>
              <span className="block text-[12px] text-ink-light">
                {departmentById[category.department]?.name} · {count} product{count === 1 ? "" : "s"}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Departments ---------- */
export function DepartmentGrid() {
  const { departments, categories, departmentOf, products } = useCatalog();
  return (
    <div className={`grid gap-4 sm:gap-5 md:grid-cols-2 ${departments.length >= 3 ? "lg:grid-cols-3" : ""}`}>
      {departments.map((department) => {
        const count = products.filter((product) => departmentOf(product) === department.id).length;
        const chips = departmentLinks(department, categories);
        const to = `/department/${department.id}`;
        return (
          <article key={department.id} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
            <Link to={to} onClick={() => track(EVENTS.SELECT_CATEGORY, { category: department.id, placement: "home_departments" })} className="relative block aspect-[16/10] overflow-hidden bg-tint">
              {department.image && <img {...imageProps(department.image, { width: 900, sizes: "(min-width: 1024px) 33vw, 100vw", alt: department.name })} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 via-navy/30 to-transparent p-5 text-white">
                <span className="block font-display text-[24px] font-extrabold sm:text-[26px]">{department.name}</span>
                <span className="mt-0.5 block text-[14px] text-white/85">{department.tagline}</span>
              </span>
            </Link>
            <div className="flex flex-1 flex-col p-5">
              <ul className="flex flex-wrap gap-2">
                {chips.slice(0, 6).map((chip) => (
                  <li key={chip.to}>
                    <Link to={chip.to} className="inline-block rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:border-navy">
                      {chip.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to={to} className="mt-auto flex items-center gap-2 pt-5 text-[14px] font-semibold text-teal hover:underline">
                Shop all {count} products <ArrowIcon className="size-4" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ---------- Brands ---------- */
export function BrandStrip() {
  const { brands, products } = useCatalog();
  const stocked = new Set(products.map((product) => product.brand));
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {brands.filter((brand) => brand.featured && stocked.has(brand.name)).map((brand) => (
        <Link key={brand.id} to={`/shop?brand=${encodeURIComponent(brand.name)}`} className="group rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-float">
          <span className="block font-display text-[20px] font-extrabold tracking-wide text-navy group-hover:text-coral">{brand.name}</span>
          <span className="mt-1 block text-[13px] font-semibold text-teal">{brand.tagline}</span>
          <span className="mt-2 block text-[13px] leading-[1.6] text-ink">{brand.description}</span>
        </Link>
      ))}
    </div>
  );
}

/* ---------- Testimonials ---------- */
export function Testimonials() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {testimonials.map((item) => (
        <figure key={item.name} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
          <RatingStars rating={item.rating} size="size-4" />
          <blockquote className="mt-3 flex-1 text-[15px] leading-[1.65] text-[#33475F]">“{item.quote}”</blockquote>
          <figcaption className="mt-4 flex items-center gap-3">
            <img {...imageProps(item.avatar, { width: 120, sizes: "48px", alt: item.name })} className="size-12 rounded-full object-cover" />
            <span>
              <span className="block text-[14px] font-bold text-navy">{item.name}</span>
              <span className="block text-[12px] text-ink-light">{item.city} · {item.product}</span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/* ---------- Instagram (shown only once a profile link is set in Admin → Settings) ---------- */
export function InstagramFeed() {
  if (!site.social.instagram) return null;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {instagramPosts.map((post) => (
          <a key={post.id} href={site.social.instagram} target="_blank" rel="noreferrer" onClick={() => track(EVENTS.SOCIAL_CLICK, { network: "instagram", placement: "home_feed" })} className="group relative aspect-square overflow-hidden rounded-xl bg-tint">
            <img {...imageProps(post.image, { width: 480, sizes: "(min-width: 1024px) 16vw, 33vw", alt: post.caption })} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 flex items-end bg-navy/0 p-3 text-[12px] text-white opacity-0 transition-all group-hover:bg-navy/60 group-hover:opacity-100">
              {post.caption}
            </span>
          </a>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Button href={site.social.instagram} target="_blank" rel="noreferrer" variant="outline" onClick={() => track(EVENTS.SOCIAL_CLICK, { network: "instagram", placement: "home_feed_cta" })}>
          <InstagramIcon className="size-5" /> Follow us on Instagram
        </Button>
      </div>
    </div>
  );
}

export function Section({ eyebrow, title, subtitle, action, align, bg = "white", children, id, className = "" }) {
  const bgClass = { white: "bg-white", tint: "bg-tint", navy: "bg-navy text-white" }[bg];
  return (
    <section id={id} className={`${bgClass} py-14 lg:py-20 ${className}`}>
      <div className="wrap">
        {title && <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} action={action} align={align} light={bg === "navy"} />}
        <div className={title ? "mt-10" : ""}>{children}</div>
      </div>
    </section>
  );
}
