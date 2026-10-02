import { Link, useParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import NotFoundPage from "./NotFoundPage.jsx";
import ProductCard from "../components/product/ProductCard.jsx";
import { JournalCard } from "../components/sections/Sections.jsx";
import { Breadcrumbs } from "../components/ui/Navigation.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { ClockIcon, ShareIcon, SparkleIcon } from "../components/ui/Icons.jsx";
import { journalTopics } from "../data/journal.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { imageProps, img } from "../lib/images.js";
import { formatDate } from "../lib/format.js";
import { articleSchema, breadcrumbSchema } from "../lib/schema.js";
import { site } from "../config/site.js";
import { useStore } from "../store/StoreProvider.jsx";
import { track } from "../analytics/tracking.js";
import { EVENTS } from "../analytics/events.js";

function Block({ block, productBySlug }) {
  switch (block.type) {
    case "h2":
      return <h2>{block.text}</h2>;
    case "ul":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <p className="!mt-6 flex gap-3 rounded-2xl bg-mint/40 p-4 !text-navy">
          <SparkleIcon className="mt-1 size-5 shrink-0 text-teal" />
          <span><strong>Artist tip:</strong> {block.text}</span>
        </p>
      );
    case "product": {
      const product = productBySlug[block.slug];
      return product ? (
        <div className="!mt-8 max-w-xs">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Featured in this article</p>
          <div className="mt-3">
            <ProductCard product={product} listName="journal_article" />
          </div>
        </div>
      ) : null;
    }
    default:
      return <p>{block.text}</p>;
  }
}

export default function ArticlePage() {
  const { slug } = useParams();
  const { articles, articleBySlug, productBySlug } = useCatalog();
  const article = articleBySlug[slug];
  const { toast } = useStore();
  const topic = article ? journalTopics.find((entry) => entry.id === article.topic) : null;
  const crumbs = article ? [{ label: "Journal", to: "/journal" }, { label: article.title, to: `/journal/${article.slug}` }] : [];

  useSeo({ title: article?.title || "Article", description: article?.excerpt, path: `/journal/${slug}`, type: "article", image: article ? img(article.image, 1200) : undefined, jsonLd: article ? [articleSchema(article), breadcrumbSchema(crumbs)] : [] });

  if (!article) return <NotFoundPage />;

  const related = articles.filter((entry) => entry.slug !== article.slug && entry.topic === article.topic).concat(articles.filter((entry) => entry.slug !== article.slug && entry.topic !== article.topic)).slice(0, 3);

  const share = async () => {
    const url = `${site.url}/journal/${article.slug}`;
    track(EVENTS.PRODUCT_SHARE, { content_type: "article", item_id: article.slug });
    try {
      if (navigator.share) await navigator.share({ title: article.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied to clipboard.");
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <>
      <article>
        <div className="wrap pt-5 sm:pt-6">
          <Breadcrumbs items={[crumbs[0], { label: "Article" }]} />
        </div>
        <header className="wrap mt-6 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-light">
            <Badge tone="mint">{topic?.name}</Badge>
            <span className="flex items-center gap-1"><ClockIcon className="size-4" /> {article.readTime} min read</span>
            <span>{formatDate(article.date)}</span>
          </div>
          <h1 className="mt-4 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-navy sm:text-[44px]">{article.title}</h1>
          <p className="mt-4 text-[17px] leading-[1.6] text-ink sm:text-[18px]">{article.excerpt}</p>
          <div className="mt-5 flex items-center justify-between gap-4 border-y border-line py-3 text-[14px]">
            <span className="text-ink">By <strong className="text-navy">{article.author}</strong></span>
            <button type="button" onClick={share} className="inline-flex shrink-0 items-center gap-2 font-semibold text-teal hover:underline">
              <ShareIcon className="size-4" /> Share
            </button>
          </div>
        </header>
        <div className="wrap mt-8 max-w-4xl">
          <img {...imageProps(article.image, { width: 1400, sizes: "(min-width: 1024px) 896px, 100vw", alt: article.title, eager: true })} className="aspect-[16/9] w-full rounded-2xl object-cover" />
        </div>
        <div className="wrap prose-brand mt-6 max-w-3xl pb-12">
          {article.content.map((block, index) => (
            <Block key={index} block={block} productBySlug={productBySlug} />
          ))}
        </div>
      </article>

      <section className="bg-tint py-14">
        <div className="wrap">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-[26px] font-extrabold text-navy">Keep reading</h2>
            <Link to="/journal" className="text-[14px] font-semibold text-teal hover:underline">All articles</Link>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {related.map((entry) => (
              <JournalCard key={entry.slug} article={entry} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
