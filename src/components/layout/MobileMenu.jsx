import { Link } from "react-router-dom";
import Overlay from "../ui/Modal.jsx";
import Logo from "../Logo.jsx";
import { ChevronRightIcon, HeartIcon, PackageIcon, UserIcon, WhatsAppIcon } from "../ui/Icons.jsx";
import { categories, collections } from "../../data/categories.js";
import { site } from "../../config/site.js";
import { useStore } from "../../store/StoreProvider.jsx";
import { ecommerce } from "../../analytics/ecommerce.js";

export default function MobileMenu() {
  const { ui, setUI } = useStore();
  const close = () => setUI({ menuOpen: false });

  return (
    <Overlay open={ui.menuOpen} onClose={close} side="left" title="Menu">
      <div className="flex-1 overflow-y-auto">
        <nav aria-label="Mobile" className="px-2 py-3">
          <div className="divide-y divide-line">
            {categories.map((category) => (
              <details key={category.slug} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3.5 text-[16px] font-semibold text-navy [&::-webkit-details-marker]:hidden">
                  {category.name}
                  <ChevronRightIcon className="size-5 text-ink-light transition-transform group-open:rotate-90" />
                </summary>
                <ul className="pb-3 pl-6">
                  <li>
                    <Link to={`/shop/${category.slug}`} onClick={close} className="block py-2 text-[15px] font-semibold text-teal">
                      All {category.name}
                    </Link>
                  </li>
                  {category.subcategories.map((sub) => (
                    <li key={sub}>
                      <Link to={`/shop/${category.slug}?sub=${encodeURIComponent(sub)}`} onClick={close} className="block py-2 text-[15px] text-ink">
                        {sub}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {Object.values(collections).map((collection) => (
              <Link key={collection.slug} to={`/${collection.slug}`} onClick={close} className={`block px-3 py-3.5 text-[16px] font-semibold ${collection.slug === "sale" ? "text-coral" : "text-navy"}`}>
                {collection.name}
              </Link>
            ))}
            <Link to="/journal" onClick={close} className="block px-3 py-3.5 text-[16px] font-semibold text-navy">
              Beauty Journal
            </Link>
          </div>
        </nav>

        <div className="mx-5 mt-2 grid grid-cols-3 gap-2 border-t border-line pt-5">
          {[
            { to: "/account", label: "Account", Icon: UserIcon },
            { to: "/wishlist", label: "Wishlist", Icon: HeartIcon },
            { to: "/track-order", label: "Track order", Icon: PackageIcon },
          ].map(({ to, label, Icon }) => (
            <Link key={to} to={to} onClick={close} className="flex flex-col items-center gap-1.5 rounded-xl bg-tint px-2 py-3 text-[12px] font-semibold text-navy">
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>

        <a
          href={site.social.whatsapp}
          target="_blank"
          rel="noreferrer"
          onClick={() => ecommerce.whatsapp("mobile_menu")}
          className="mx-5 mt-4 mb-6 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-[15px] font-semibold text-white"
        >
          <WhatsAppIcon className="size-5" /> Chat with us on WhatsApp
        </a>
      </div>
      <div className="border-t border-line px-5 py-4">
        <Logo compact />
      </div>
    </Overlay>
  );
}
