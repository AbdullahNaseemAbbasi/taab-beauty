import { Link } from "react-router-dom";
import Button from "../ui/Button.jsx";
import RatingStars from "../ui/RatingStars.jsx";
import { Badge, Eyebrow, SectionHeading } from "../ui/Typography.jsx";
import { trustIcons, InstagramIcon, ClockIcon, ArrowIcon } from "../ui/Icons.jsx";
import { imageProps } from "../../lib/images.js";
import { formatDate } from "../../lib/format.js";
import { site } from "../../config/site.js";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { testimonials } from "../../data/reviews.js";
import { instagramPosts } from "../../data/misc.js";
import { journalTopics } from "../../data/journal.js";
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
        <div className={`max-w-[560px] ${compact ? "py-10 lg:py-12" : "py-10 lg:py-14"}`}>
          {eyebrow && <Eyebrow tone="navy">{eyebrow}</Eyebrow>}
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

/* ---------- Trust signals ---------- */
export function TrustSignals({ compact = false }) {
  return (
    <ul className={`grid gap-3 sm:gap-4 ${compact ? "grid-cols-2" : "grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4"}`}>
      {site.trustSignals.map((item) => {
        const Icon = trustIcons[item.icon];
        return (
          <li key={item.title} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
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

/* ---------- Categories ---------- */
export function CategoryGrid() {
  const { categories } = useCatalog();
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {categories.map((category, index) => (
        <Link
          key={category.slug}
          to={`/shop/${category.slug}`}
          onClick={() => track(EVENTS.SELECT_CATEGORY, { category: category.slug, placement: "home_grid" })}
          className={`group relative overflow-hidden rounded-2xl bg-tint ${index === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-[4/5] lg:aspect-auto lg:min-h-[220px]"}`}
        >
          <img {...imageProps(category.image, { width: 900, sizes: "(min-width: 1024px) 40vw, 50vw", alt: category.name })} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 via-navy/30 to-transparent p-4 text-white sm:p-5">
            <span className="block font-display text-[18px] font-extrabold sm:text-[22px]">{category.name}</span>
            <span className="mt-0.5 block text-[13px] text-white/85">{category.tagline}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ---------- Concerns ---------- */
export function ConcernGrid() {
  const { concerns } = useCatalog();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {concerns.map((concern) => (
        <Link key={concern.id} to={`/shop?concern=${concern.id}`} onClick={() => track(EVENTS.SELECT_CATEGORY, { concern: concern.id, placement: "home_concerns" })} className="group text-center">
          <span className="mx-auto block aspect-square w-full max-w-[160px] overflow-hidden rounded-full border-4 border-white bg-tint shadow-card">
            <img {...imageProps(concern.image, { width: 400, sizes: "160px", alt: concern.name })} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </span>
          <span className="mt-3 block font-display text-[15px] font-extrabold text-navy group-hover:text-coral">{concern.name}</span>
          <span className="block text-[12px] text-ink">{concern.description}</span>
        </Link>
      ))}
    </div>
  );
}

/* ---------- Brands ---------- */
export function BrandStrip() {
  const { brands } = useCatalog();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {brands.map((brand) => (
        <Link key={brand.id} to={`/shop?brand=${encodeURIComponent(brand.name)}`} className="group rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-float">
          <span className="block font-display text-[20px] font-extrabold tracking-wide text-navy group-hover:text-coral">{brand.name}</span>
          <span className="mt-1 block text-[13px] font-semibold text-teal">{brand.tagline}</span>
          <span className="mt-2 block text-[13px] leading-[1.6] text-ink">{brand.description}</span>
        </Link>
      ))}
    </div>
  );
}

/* ---------- Promo banner ---------- */
export function PromoBanner({ eyebrow, title, text, image, cta, align = "left", tone = "dark" }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-navy text-white">
      <img {...imageProps(image, { width: 1600, sizes: "100vw", alt: "" })} className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className={`absolute inset-0 ${tone === "dark" ? "bg-gradient-to-r from-navy/90 via-navy/60 to-transparent" : "bg-gradient-to-r from-coral/90 via-coral/60 to-transparent"} ${align === "right" ? "rotate-180" : ""}`} />
      <div className={`relative px-6 py-14 sm:px-12 sm:py-20 ${align === "right" ? "ml-auto text-right" : ""} max-w-xl`}>
        <Eyebrow tone="cyan">{eyebrow}</Eyebrow>
        <h2 className="mt-3 font-display text-[30px] font-extrabold leading-[1.1] sm:text-[42px]">{title}</h2>
        <p className="mt-4 text-[16px] text-white/85">{text}</p>
        <Button to={cta.to} arrow className="mt-7" onClick={() => track(EVENTS.PROMO_CLICK, { promotion_name: cta.id || title })}>
          {cta.label}
        </Button>
      </div>
    </section>
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

/* ---------- Instagram ---------- */
export function InstagramFeed() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {instagramPosts.map((post) => (
          <a key={post.id} href={post.url} target="_blank" rel="noreferrer" onClick={() => track(EVENTS.SOCIAL_CLICK, { network: "instagram", placement: "home_feed" })} className="group relative aspect-square overflow-hidden rounded-xl bg-tint">
            <img {...imageProps(post.image, { width: 480, sizes: "(min-width: 1024px) 16vw, 33vw", alt: post.caption })} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 flex items-end bg-navy/0 p-3 text-[12px] text-white opacity-0 transition-all group-hover:bg-navy/60 group-hover:opacity-100">
              {post.caption}
            </span>
          </a>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Button href={site.social.instagram} target="_blank" rel="noreferrer" variant="outline" onClick={() => track(EVENTS.SOCIAL_CLICK, { network: "instagram", placement: "home_feed_cta" })}>
          <InstagramIcon className="size-5" /> Follow @taab.beauty
        </Button>
      </div>
    </div>
  );
}

/* ---------- Journal cards ---------- */
export function JournalCard({ article, featured = false }) {
  const topic = journalTopics.find((entry) => entry.id === article.topic);
  return (
    <article className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-white ${featured ? "lg:flex-row" : ""}`}>
      <Link to={`/journal/${article.slug}`} className={`block overflow-hidden ${featured ? "lg:w-1/2" : ""}`}>
        <img {...imageProps(article.image, { width: 900, sizes: "(min-width: 1024px) 33vw, 100vw", alt: article.title })} className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${featured ? "aspect-[4/3] lg:h-full" : "aspect-[16/10]"}`} />
      </Link>
      <div className={`flex flex-1 flex-col p-5 ${featured ? "lg:p-8" : ""}`}>
        <div className="flex items-center gap-3 text-[12px] text-ink-light">
          <Badge tone="mint">{topic?.name}</Badge>
          <span className="flex items-center gap-1"><ClockIcon className="size-3.5" /> {article.readTime} min read</span>
        </div>
        <h3 className={`mt-3 font-display font-extrabold leading-snug text-navy ${featured ? "text-[24px] sm:text-[28px]" : "text-[18px]"}`}>
          <Link to={`/journal/${article.slug}`} className="hover:text-coral">{article.title}</Link>
        </h3>
        <p className={`mt-2 text-[14px] leading-[1.65] text-ink ${featured ? "" : "line-clamp-3"}`}>{article.excerpt}</p>
        <div className="mt-auto flex items-center justify-between pt-4 text-[13px] text-ink-light">
          <span>{article.author.split(",")[0]} · {formatDate(article.date)}</span>
          <Link to={`/journal/${article.slug}`} className="flex items-center gap-1 font-semibold text-teal">Read <ArrowIcon className="size-4" /></Link>
        </div>
      </div>
    </article>
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
