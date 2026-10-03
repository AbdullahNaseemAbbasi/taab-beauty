import { Link } from "react-router-dom";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { images } from "../../data/images.js";
import { imageProps } from "../../lib/images.js";
import { ArrowIcon } from "../ui/Icons.jsx";

/* Links listed under a department: its categories, or the product types when it has a single category. */
export function departmentLinks(department, categories) {
  const own = categories.filter((category) => category.department === department.id);
  if (own.length === 1) return own[0].subcategories.map((sub) => ({ label: sub, to: `/shop/${own[0].slug}?sub=${encodeURIComponent(sub)}` }));
  return own.map((category) => ({ label: category.name, to: `/shop/${category.slug}` }));
}

/* One column per department, straight from the database. */
export default function MegaMenu({ open, onClose }) {
  const { departments, categories } = useCatalog();
  if (!open) return null;
  const columns = Math.min(Math.max(departments.length, 1), 5);
  return (
    <div className="absolute top-full left-0 z-40 w-max max-w-[min(1100px,90vw)] pt-5" onMouseLeave={onClose}>
      <div className="grid gap-7 rounded-2xl border border-line bg-white p-7 shadow-float" style={{ gridTemplateColumns: `repeat(${columns}, minmax(150px, 1fr)) 220px` }}>
        {departments.map((department) => (
          <div key={department.id}>
            <Link to={`/department/${department.id}`} onClick={onClose} className="font-display text-[16px] font-extrabold text-navy hover:text-coral">
              {department.name}
            </Link>
            <ul className="mt-3 space-y-2">
              {departmentLinks(department, categories).map((link) => (
                <li key={link.to}>
                  <Link to={link.to} onClick={onClose} className="text-[14px] text-ink hover:text-navy">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={`/department/${department.id}`} onClick={onClose} className="text-[14px] font-semibold text-teal hover:underline">
                  All {department.name}
                </Link>
              </li>
            </ul>
          </div>
        ))}
        <Link to="/new-arrivals" onClick={onClose} className="group relative min-h-[200px] overflow-hidden rounded-xl bg-tint" style={{ gridColumn: "-2 / -1", gridRow: "1 / span 3" }}>
          <img {...imageProps(images.promo.pink, { width: 480, sizes: "220px", alt: "New arrivals" })} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
