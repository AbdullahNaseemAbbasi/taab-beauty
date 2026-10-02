import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import RatingStars from "../components/ui/RatingStars.jsx";
import { Price } from "../components/ui/Typography.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { CompareIcon, CloseIcon } from "../components/ui/Icons.jsx";
import { PageHeader } from "../components/sections/Sections.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { imageProps } from "../lib/images.js";
import { useStore } from "../store/StoreProvider.jsx";

export default function ComparePage() {
  const { compare, toggleCompare, clearCompare, addToCart } = useStore();
  const { productById } = useCatalog();
  useSeo({ title: "Compare Products", path: "/compare", noindex: true });
  const items = compare.map((id) => productById[id]).filter(Boolean);

  const rows = [
    { label: "Price", render: (product) => <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" /> },
    { label: "Rating", render: (product) => <RatingStars rating={product.rating} count={product.reviewCount} size="size-3.5" /> },
    { label: "Brand", render: (product) => product.brand },
    { label: "Category", render: (product) => `${product.category} / ${product.subcategory}` },
    { label: "Size", render: (product) => product.size },
    { label: "Availability", render: (product) => (product.stock > 0 ? `In stock (${product.stock})` : "Out of stock") },
    { label: "Key benefits", render: (product) => <ul className="list-disc space-y-1 pl-4">{product.benefits.slice(0, 3).map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> },
    { label: "Concerns", render: (product) => (product.concerns.length ? product.concerns.join(", ") : "General") },
  ];

  return (
    <>
      <PageHeader title={`Compare (${items.length}/4)`} description="Put up to four products side by side.">
        {items.length > 0 && (
          <button type="button" onClick={clearCompare} className="mt-3 text-[13px] font-semibold text-teal hover:underline">
            Clear all
          </button>
        )}
      </PageHeader>
      <section className="wrap py-8 sm:py-10">
        {items.length === 0 ? (
          <EmptyState icon={CompareIcon} title="Nothing to compare yet" text="Use the compare icon on any product card to add it here." action={{ label: "Browse products", to: "/shop" }} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="align-top">
                  <th className="w-36 border-b border-line p-4 text-[12px] font-bold uppercase tracking-wide text-ink-light">Product</th>
                  {items.map((product) => (
                    <th key={product.id} className="border-b border-l border-line p-4 font-normal">
                      <div className="relative">
                        <button type="button" aria-label={`Remove ${product.name}`} onClick={() => toggleCompare(product)} className="absolute top-0 right-0 grid size-8 place-items-center rounded-full bg-white text-ink-light shadow-card hover:text-danger">
                          <CloseIcon className="size-4" />
                        </button>
                        <Link to={`/product/${product.slug}`}>
                          <img {...imageProps(product.images[0], { width: 400, sizes: "200px", alt: product.name })} className="aspect-square w-full rounded-xl object-cover" />
                          <span className="mt-3 block font-display text-[16px] font-extrabold text-navy hover:text-coral">{product.name}</span>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="align-top">
                    <th className="border-b border-line bg-tint/60 p-4 text-[12px] font-bold uppercase tracking-wide text-ink-light">{row.label}</th>
                    {items.map((product) => (
                      <td key={product.id} className="border-b border-l border-line p-4 text-ink">
                        {row.render(product)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th className="p-4" />
                  {items.map((product) => (
                    <td key={product.id} className="border-l border-line p-4">
                      {product.variants ? (
                        <Button to={`/product/${product.slug}`} variant="navy" size="sm" className="w-full">
                          Choose {product.variants.label.toLowerCase()}
                        </Button>
                      ) : (
                        <Button variant="navy" size="sm" className="w-full" disabled={product.stock <= 0} onClick={() => addToCart(product)}>
                          Add to bag
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
