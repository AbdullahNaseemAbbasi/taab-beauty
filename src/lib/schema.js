/* JSON-LD builders for structured data (Organization, Product, Breadcrumb, Article, FAQ). */
import { site } from "../config/site.js";
import { img } from "./images.js";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: `${site.url}/favicon.svg`,
    ...(site.contact.email ? { email: site.contact.email } : {}),
    telephone: site.contact.phone,
    address: { "@type": "PostalAddress", addressLocality: "Karachi", addressCountry: "PK" },
    sameAs: [site.social.instagram, site.social.facebook, site.social.tiktok, site.social.youtube].filter(Boolean),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${site.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function productSchema(product, reviews = []) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((slug) => img(slug, 1200)),
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    aggregateRating: product.reviewCount
      ? { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount }
      : undefined,
    review: reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.author },
      datePublished: review.date,
      reviewBody: review.body,
      reviewRating: { "@type": "Rating", ratingValue: review.rating },
    })),
    offers: {
      "@type": "Offer",
      url: `${site.url}/product/${product.slug}`,
      priceCurrency: site.currency.code,
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${site.url}${item.to}`,
    })),
  };
}

export function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
