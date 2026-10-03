import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import NotFoundPage from "./NotFoundPage.jsx";
import Button from "../components/ui/Button.jsx";
import RatingStars from "../components/ui/RatingStars.jsx";
import { Price, Badge } from "../components/ui/Typography.jsx";
import { Breadcrumbs, QuantityStepper, Accordion } from "../components/ui/Navigation.jsx";
import { HeartIcon, ShareIcon, WhatsAppIcon, TruckIcon, ShieldIcon, RefreshIcon, CompareIcon, CheckIcon } from "../components/ui/Icons.jsx";
import ProductGallery from "../components/product/ProductGallery.jsx";
import ReviewSection from "../components/product/ReviewSection.jsx";
import StockAlertForm from "../components/product/StockAlertForm.jsx";
import DispatchCountdown from "../components/commerce/DispatchCountdown.jsx";
import ProductCard from "../components/product/ProductCard.jsx";
import { ProductCarousel } from "../components/product/ProductGrid.jsx";
import { Section } from "../components/sections/Sections.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { fetchProductBySlug } from "../api/catalog.js";
import { isLive } from "../api/client.js";
import { site } from "../config/site.js";
import { formatPrice } from "../lib/format.js";
import { img } from "../lib/images.js";
import { variantStock, relatedProducts, frequentlyBoughtTogether, reviewsForProduct } from "../lib/catalog.js";
import { productSchema, breadcrumbSchema } from "../lib/schema.js";
import { useStore } from "../store/StoreProvider.jsx";
import { ecommerce } from "../analytics/ecommerce.js";
import { track } from "../analytics/tracking.js";
import { EVENTS } from "../analytics/events.js";

function VariantSelector({ product, value, onChange }) {
  if (!product.variants) return null;
  const selected = product.variants.options.find((option) => option.id === value);
  return (
    <div>
      <p className="text-[14px] font-semibold text-navy">
        {product.variants.label}: <span className="font-normal text-ink">{selected ? selected.name : "Select"}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {product.variants.options.map((option) => {
          const out = option.stock <= 0;
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={active}
              aria-label={`${option.name}${out ? " (sold out)" : ""}`}
              title={out ? `${option.name} (sold out, tap to get notified)` : option.name}
              className={`relative size-10 rounded-full border-2 transition-transform ${active ? "scale-110 border-navy" : "border-white"} ${out ? "opacity-40" : ""} hover:scale-105 shadow-card`}
              style={{ backgroundColor: option.hex }}
            >
              {out && <span className="absolute inset-0 grid place-items-center text-white">✕</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StockStatus({ stock }) {
  if (stock <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (stock <= 5) return <Badge tone="coral">Only {stock} left</Badge>;
  return (
    <Badge tone="success" className="gap-1">
      <CheckIcon className="size-3" /> In stock
    </Badge>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products, productBySlug, categoryBySlug, reviews, settings, updateProduct } = useCatalog();
  const product = productBySlug[slug] || null;
  const { addToCart, isWishlisted, toggleWishlist, toggleCompare, isCompared, addRecent, recent, toast, setUI } = useStore();
  const [variantId, setVariantId] = useState(() => product?.variants?.options.find((option) => option.stock > 0)?.id || null);
  const [quantity, setQuantity] = useState(1);

  const category = product ? categoryBySlug[product.category] : null;
  const productReviews = product ? reviewsForProduct(reviews, product.id) : [];
  const crumbs = product ? [{ label: "Shop", to: "/shop" }, { label: category?.name || product.category, to: `/shop/${product.category}` }, { label: product.name, to: `/product/${product.slug}` }] : [];
  const threshold = formatPrice(settings.shipping.freeShippingThreshold);

  useSeo({
    title: product ? `${product.name} by ${product.brand}` : "Product",
    description: product?.description,
    path: `/product/${slug}`,
    type: "product",
    image: product ? img(product.images[0], 1200) : undefined,
    jsonLd: product ? [productSchema(product, productReviews), breadcrumbSchema(crumbs)] : [],
  });

  useEffect(() => {
    if (!product) return;
    ecommerce.viewItem(product);
    addRecent(product.id);
    setQuantity(1);
    setVariantId(product.variants?.options.find((option) => option.stock > 0)?.id || null);
    if (isLive) {
      fetchProductBySlug(product.slug)
        .then((fresh) => fresh && updateProduct(fresh))
        .catch(() => {});
    }
  }, [product?.id]);

  useEffect(() => {
    setUI({ stickyBar: true });
    return () => setUI({ stickyBar: false });
  }, [setUI]);

  const stock = product ? variantStock(product, variantId) : 0;
  const bundle = useMemo(() => (product ? frequentlyBoughtTogether(productBySlug, product) : []), [product?.id, productBySlug]);
  const related = useMemo(() => (product ? relatedProducts(products, product) : []), [product?.id, products]);
  const recentOthers = recent.filter((entry) => entry.id !== product?.id).slice(0, 4);

  if (!product) return <NotFoundPage />;

  const needsVariant = product.variants && !variantId;
  const add = (openDrawer = true) => {
    if (needsVariant) {
      toast(`Please choose a ${product.variants.label.toLowerCase()} first.`, { type: "error" });
      return false;
    }
    return addToCart(product, { quantity, variantId, openDrawer });
  };
  const buyNow = () => {
    if (add(false)) navigate("/checkout");
  };
  const share = async () => {
    const url = `${site.url}/product/${product.slug}`;
    track(EVENTS.PRODUCT_SHARE, { item_id: product.sku });
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied to clipboard.");
      }
    } catch {
      /* user cancelled */
    }
  };
  const addBundle = () => {
    if (!add(false)) return;
    bundle.forEach((item) => addToCart(item, { openDrawer: false, silent: true }));
    toast("Bundle added to your bag.", { action: { label: "View bag", to: "/cart" } });
  };
  const bundleTotal = product.price + bundle.reduce((sum, item) => sum + item.price, 0);

  /* Beauty products list ingredients; electronics and kitchen items list specifications and warranty. */
  const isBeauty = (category?.department || "beauty") === "beauty";
  const specs = product.specs || [];
  const accordion = [
    product.benefits.length > 0 && { title: isBeauty ? "Benefits" : "Highlights", content: <ul className="list-disc space-y-1.5 pl-5">{product.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> },
    product.ingredients.length > 0 && { title: "Ingredients", content: <p>{product.ingredients.join(", ")}.</p> },
    product.howToUse && { title: isBeauty ? "How to use" : "Use and care", content: <p>{product.howToUse}</p> },
    {
      title: "Specifications",
      content: (
        <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2">
          {specs.map((spec) => (
            <div key={spec.label} className="contents">
              <dt className="font-semibold text-navy">{spec.label}</dt><dd>{spec.value}</dd>
            </div>
          ))}
          {product.size && (<><dt className="font-semibold text-navy">{isBeauty ? "Size" : "In the box"}</dt><dd>{product.size}</dd></>)}
          <dt className="font-semibold text-navy">SKU</dt><dd>{product.sku}</dd>
          <dt className="font-semibold text-navy">Brand</dt><dd>{product.brand}</dd>
          <dt className="font-semibold text-navy">Category</dt><dd>{category?.name || product.category}{product.subcategory ? ` / ${product.subcategory}` : ""}</dd>
        </dl>
      ),
    },
    product.warranty && { title: "Warranty", content: <p>{product.warranty}</p> },
    {
      title: "Authenticity",
      content: isBeauty ? (
        <p>Sourced directly from {product.brand} or its authorised distributor. Every unit ships sealed with an intact batch code, and we can share the batch certificate on request.</p>
      ) : (
        <p>Sourced directly from {product.brand} or its authorised distributor. Every unit is new, checked before dispatch and shipped in its original packaging.</p>
      ),
    },
    {
      title: "Shipping & returns",
      content: (
        <p>
          Dispatched the same day on orders before 2pm. {settings.shipping.estimatedDays} across Pakistan, next business day in Karachi. Free delivery over {threshold}.{" "}
          {isBeauty ? "Unopened products can be returned within 7 days." : "Unused items in their original packaging can be returned within 7 days, and anything that arrives faulty is replaced."}
        </p>
      ),
    },
  ].filter(Boolean);

  return (
    <>
      <div className="wrap pt-5 sm:pt-6">
        <Breadcrumbs items={crumbs} />
      </div>

      <section className="wrap grid gap-8 py-6 sm:py-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery product={product} />

        <div>
          <Link to={`/shop?brand=${encodeURIComponent(product.brand)}`} className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal hover:underline">
            {product.brand}
          </Link>
          <h1 className="mt-2 font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-navy sm:text-[38px]">{product.name}</h1>
          <a href="#reviews" className="mt-3 inline-flex">
            <RatingStars rating={product.rating} count={product.reviewCount} showValue size="size-4" />
          </a>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Price price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
            <StockStatus stock={stock} />
          </div>
          <p className="mt-5 text-[16px] leading-[1.7] text-ink">{product.description}</p>

          <div className="mt-6 space-y-5">
            <VariantSelector product={product} value={variantId} onChange={setVariantId} />
            {stock <= 0 && <StockAlertForm product={product} variant={product.variants?.options.find((option) => option.id === variantId) || null} />}
            {stock > 0 && <DispatchCountdown />}
            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper value={quantity} min={1} max={Math.max(stock, 1)} onChange={setQuantity} />
              <Button variant="navy" onClick={() => add(true)} disabled={stock <= 0} className="flex-1 sm:min-w-[200px] sm:flex-none">
                {stock <= 0 ? "Sold out" : "Add to bag"}
              </Button>
              <Button onClick={buyNow} disabled={stock <= 0} className="w-full sm:w-auto sm:min-w-[160px]">
                Buy now
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => toggleWishlist(product)} aria-pressed={isWishlisted(product.id)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold ${isWishlisted(product.id) ? "border-coral text-coral" : "border-line text-navy hover:border-navy"}`}>
                <HeartIcon filled={isWishlisted(product.id)} className="size-4" /> {isWishlisted(product.id) ? "Saved" : "Save"}
              </button>
              <button type="button" onClick={() => toggleCompare(product)} aria-pressed={isCompared(product.id)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold ${isCompared(product.id) ? "border-teal text-teal" : "border-line text-navy hover:border-navy"}`}>
                <CompareIcon className="size-4" /> Compare
              </button>
              <button type="button" onClick={share} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[14px] font-semibold text-navy hover:border-navy">
                <ShareIcon className="size-4" /> Share
              </button>
              <a
                href={whatsappLink(`Hi ${site.name}, I have a question about ${product.name} (${product.sku}).`)}
                target="_blank"
                rel="noreferrer"
                onClick={() => ecommerce.whatsapp("product_page", product)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366]/10 px-4 text-[14px] font-semibold text-[#128C4A] hover:bg-[#25D366]/20"
              >
                <WhatsAppIcon className="size-4" /> Ask about this product
              </a>
            </div>
          </div>

          <ul className="mt-7 grid gap-3 rounded-2xl bg-tint p-4 text-[13px] text-navy sm:grid-cols-3">
            <li className="flex items-center gap-2"><TruckIcon className="size-5 shrink-0 text-teal" /> {settings.shipping.estimatedDays}, free over {threshold}</li>
            <li className="flex items-center gap-2"><ShieldIcon className="size-5 shrink-0 text-teal" /> {product.warranty ? "Genuine, with warranty" : "100% genuine, sealed"}</li>
            <li className="flex items-center gap-2"><RefreshIcon className="size-5 shrink-0 text-teal" /> 7-day easy returns</li>
          </ul>

          <Accordion items={accordion} className="mt-7" />
        </div>
      </section>

      {bundle.length > 0 && (
        <Section eyebrow={isBeauty ? "Complete your routine" : "Goes well with"} title="Frequently bought together." bg="tint" align="left">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ProductCard product={product} listName="fbt_anchor" />
              {bundle.map((item) => (
                <ProductCard key={item.id} product={item} listName="fbt" />
              ))}
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[14px] text-ink">Bundle price</p>
              <p className="font-display text-[28px] font-extrabold text-navy">{formatPrice(bundleTotal)}</p>
              <p className="mt-1 text-[13px] text-ink">{bundle.length + 1} items, {bundleTotal >= settings.shipping.freeShippingThreshold ? "free delivery included" : "delivery calculated at checkout"}</p>
              <Button variant="navy" className="mt-4 w-full" onClick={addBundle} disabled={stock <= 0}>
                Add all {bundle.length + 1} to bag
              </Button>
            </div>
          </div>
        </Section>
      )}

      <div className="wrap">
        <ReviewSection product={product} />
      </div>

      {related.length > 0 && (
        <Section eyebrow="You may also like" title={`More from ${category?.name || product.category}.`} action={{ label: `All ${category?.name || product.category}`, to: `/shop/${product.category}` }} align="left" bg="white">
          <ProductCarousel products={related} listName="related_products" />
        </Section>
      )}

      {recentOthers.length > 0 && (
        <Section eyebrow="Recently viewed" title="Still thinking about these?" bg="tint" align="left">
          <ProductCarousel products={recentOthers} listName="recently_viewed" />
        </Section>
      )}

      {/* Sticky add-to-cart for mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-navy">{product.name}</p>
          <p className="font-display text-[16px] font-extrabold text-navy">{formatPrice(product.price * quantity)}</p>
        </div>
        <Button variant="navy" size="sm" onClick={() => add(true)} disabled={stock <= 0}>
          {stock <= 0 ? "Sold out" : "Add to bag"}
        </Button>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </>
  );
}
