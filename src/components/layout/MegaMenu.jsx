import { Link } from "react-router-dom";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { departments } from "../../config/site.js";
import { images } from "../../data/images.js";
import { imageProps } from "../../lib/images.js";
import { ArrowIcon } from "../ui/Icons.jsx";

/* One column per department: Beauty lists its categories, the others list their product types. */
export default function MegaMenu({ open, onClose }) {
  const { categories } = useCatalog();
  if (!open) return null;
  return (
    <div className="absolute top-full left-1/2 z-40 w-[880px] -translate-x-1/2 pt-5" onMouseLeave={onClose}>
      <div className="grid grid-cols-[repeat(3,1fr)_220px] gap-7 rounded-2xl border border-line bg-white p-7 shadow-float">
        {departments.map((department) => {
          const own = categories.filter((category) => category.department === department.id);
          const links =
            own.length > 1
              ? own.map((category) => ({ label: category.name, to: `/shop/${category.slug}` }))
              : (own[0]?.subcategories || []).map((sub) => ({ label: sub, to: `/shop/${own[0].slug}?sub=${encodeURIComponent(sub)}` }));
          return (
            <div key={department.id}>
              <Link to={department.to} onClick={onClose} className="font-display text-[16px] font-extrabold text-navy hover:text-coral">
                {department.name}
              </Link>
              <p className="mt-1 text-[12px] leading-snug text-ink-light">{department.tagline}</p>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} onClick={onClose} className="text-[14px] text-ink hover:text-navy">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to={department.to} onClick={onClose} className="text-[14px] font-semibold text-teal hover:underline">
                    All {department.name}
                  </Link>
                </li>
              </ul>
            </div>
          );
        })}
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
