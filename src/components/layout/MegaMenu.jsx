import { Link } from "react-router-dom";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { images } from "../../data/images.js";
import { imageProps } from "../../lib/images.js";
import { ArrowIcon } from "../ui/Icons.jsx";

export default function MegaMenu({ open, onClose }) {
  const { categories } = useCatalog();
  if (!open) return null;
  return (
    <div className="absolute top-full left-1/2 z-40 w-[880px] -translate-x-1/2 pt-5" onMouseLeave={onClose}>
      <div className="grid grid-cols-[repeat(5,1fr)_220px] gap-6 rounded-2xl border border-line bg-white p-7 shadow-float">
        {categories.map((category) => (
          <div key={category.slug}>
            <Link to={`/shop/${category.slug}`} onClick={onClose} className="font-display text-[15px] font-extrabold text-navy hover:text-coral">
              {category.name}
            </Link>
            <ul className="mt-3 space-y-2">
              {category.subcategories.map((sub) => (
                <li key={sub}>
                  <Link to={`/shop/${category.slug}?sub=${encodeURIComponent(sub)}`} onClick={onClose} className="text-[14px] text-ink hover:text-navy">
                    {sub}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Link to="/new-arrivals" onClick={onClose} className="group relative overflow-hidden rounded-xl bg-tint">
          <img {...imageProps(images.promo.pink, { width: 480, sizes: "220px", alt: "New arrivals" })} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/80 to-transparent p-4 text-white">
            <span className="block text-[12px] font-bold uppercase tracking-wider text-cyan">Just in</span>
            <span className="mt-1 flex items-center gap-2 font-display text-[16px] font-extrabold">
              New arrivals <ArrowIcon className="size-4" />
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
