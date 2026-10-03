import { Checkbox, Input } from "../ui/Form.jsx";
import { ChevronDownIcon } from "../ui/Icons.jsx";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { facetCounts } from "../../lib/catalog.js";
import { site } from "../../config/site.js";

function Group({ title, children }) {
  return (
    <details open className="group border-b border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-bold uppercase tracking-wide text-navy [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon className="size-4 text-ink-light transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

export default function FilterSidebar({ baseProducts, filters, onChange, showCategory = true, category, categoryOptions }) {
  const catalog = useCatalog();
  const categories = categoryOptions || catalog.categories;
  const brandCounts = facetCounts(baseProducts, "brand");
  const concernCounts = facetCounts(baseProducts, "concerns");
  const subCounts = facetCounts(baseProducts, "subcategory");
  const activeCategory = catalog.categories.find((entry) => entry.slug === (category || filters.category));
  /* Only offer brands and concerns that exist in this list (plus any already ticked). */
  const brands = catalog.brands.filter((brand) => brandCounts[brand.name] || filters.brands?.includes(brand.name));
  const concerns = catalog.concerns.filter((concern) => concernCounts[concern.id] || filters.concerns?.includes(concern.id));

  const toggle = (key, value) => {
    const list = filters[key] || [];
    onChange({ ...filters, [key]: list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value] });
  };

  const activeCount =
    (filters.subcategories?.length || 0) + (filters.brands?.length || 0) + (filters.concerns?.length || 0) + (filters.minPrice != null ? 1 : 0) + (filters.maxPrice != null ? 1 : 0) + (filters.inStock ? 1 : 0) + (filters.onSale ? 1 : 0) + (filters.minRating ? 1 : 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display text-[18px] font-extrabold text-navy">Filters {activeCount > 0 && <span className="ml-1 rounded-full bg-coral px-2 py-0.5 text-[11px] text-white">{activeCount}</span>}</p>
        {activeCount > 0 && (
          <button type="button" onClick={() => onChange({ category: filters.category })} className="text-[13px] font-semibold text-teal hover:underline">
            Clear all
          </button>
        )}
      </div>

      {showCategory && (
        <Group title="Category">
          {categories.map((entry) => (
            <label key={entry.slug} className="flex cursor-pointer items-center gap-3 text-[14px] text-navy">
              <input type="radio" name="category" className="size-4 accent-coral" checked={filters.category === entry.slug} onChange={() => onChange({ ...filters, category: entry.slug, subcategories: [] })} />
              {entry.name}
            </label>
          ))}
          {filters.category && (
            <button type="button" onClick={() => onChange({ ...filters, category: null, subcategories: [] })} className="text-[13px] font-semibold text-teal hover:underline">
              All categories
            </button>
          )}
        </Group>
      )}

      {activeCategory && (
        <Group title="Type">
          {activeCategory.subcategories.map((sub) => (
            <Checkbox key={sub} label={`${sub} (${subCounts[sub] || 0})`} checked={filters.subcategories?.includes(sub) || false} onChange={() => toggle("subcategories", sub)} />
          ))}
        </Group>
      )}

      {brands.length > 0 && (
        <Group title="Brand">
          {brands.map((brand) => (
            <Checkbox key={brand.id} label={`${brand.name} (${brandCounts[brand.name] || 0})`} checked={filters.brands?.includes(brand.name) || false} onChange={() => toggle("brands", brand.name)} />
          ))}
        </Group>
      )}

      {concerns.length > 0 && (
        <Group title="Concern">
          {concerns.map((concern) => (
            <Checkbox key={concern.id} label={`${concern.name} (${concernCounts[concern.id] || 0})`} checked={filters.concerns?.includes(concern.id) || false} onChange={() => toggle("concerns", concern.id)} />
          ))}
        </Group>
      )}

      <Group title={`Price (${site.currency.symbol})`}>
        <div className="flex items-center gap-2">
          <Input type="number" min="0" placeholder="Min" aria-label="Minimum price" value={filters.minPrice ?? ""} onChange={(event) => onChange({ ...filters, minPrice: event.target.value ? Number(event.target.value) : null })} />
          <span className="text-ink-light">to</span>
          <Input type="number" min="0" placeholder="Max" aria-label="Maximum price" value={filters.maxPrice ?? ""} onChange={(event) => onChange({ ...filters, maxPrice: event.target.value ? Number(event.target.value) : null })} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            ["Under 2,000", null, 2000],
            ["2,000 to 5,000", 2000, 5000],
            ["5,000 to 10,000", 5000, 10000],
            ["Over 10,000", 10000, null],
          ].map(([label, min, max]) => (
            <button key={label} type="button" onClick={() => onChange({ ...filters, minPrice: min, maxPrice: max })} className="rounded-full border border-line px-3 py-1 text-[12px] text-navy hover:border-navy">
              {label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="More">
        <Checkbox label="In stock only" checked={filters.inStock || false} onChange={() => onChange({ ...filters, inStock: !filters.inStock })} />
        <Checkbox label="On sale" checked={filters.onSale || false} onChange={() => onChange({ ...filters, onSale: !filters.onSale })} />
        <Checkbox label="Rated 4.5 and up" checked={filters.minRating === 4.5} onChange={() => onChange({ ...filters, minRating: filters.minRating === 4.5 ? 0 : 4.5 })} />
      </Group>
    </div>
  );
}
