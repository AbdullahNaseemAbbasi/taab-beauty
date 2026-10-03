import { Link } from "react-router-dom";
import Overlay from "../ui/Modal.jsx";
import Logo from "../Logo.jsx";
import { departmentLinks } from "./MegaMenu.jsx";
import { ChevronRightIcon, HeartIcon, PackageIcon, UserIcon, WhatsAppIcon } from "../ui/Icons.jsx";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { site } from "../../config/site.js";
import { useStore } from "../../store/StoreProvider.jsx";
import { ecommerce } from "../../analytics/ecommerce.js";

export default function MobileMenu() {
  const { ui, setUI } = useStore();
  const { departments, categories, collections } = useCatalog();
  const close = () => setUI({ menuOpen: false });

  return (
    <Overlay open={ui.menuOpen} onClose={close} side="left" title="Menu">
      <div className="flex-1 overflow-y-auto">
        <nav aria-label="Mobile" className="px-2 py-3">
          <div className="divide-y divide-line">
            <Link to="/shop" onClick={close} className="block px-3 py-3.5 text-[16px] font-semibold text-navy">
              All Products
            </Link>
            {departments.map((department) => (
              <details key={department.id} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3.5 text-[16px] font-semibold text-navy [&::-webkit-details-marker]:hidden">
                  {department.name}
                  <ChevronRightIcon className="size-5 text-ink-light transition-transform group-open:rotate-90" />
                </summary>
                <ul className="pb-3 pl-6">
                  <li>
                    <Link to={`/department/${department.id}`} onClick={close} className="block py-2 text-[15px] font-semibold text-teal">
                      All {department.name}
                    </Link>
                  </li>
                  {departmentLinks(department, categories).map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} onClick={close} className="block py-2 text-[15px] text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {Object.values(collections).map((collection) => (
              <Link key={collection.slug} to={`/${collection.slug}`} onClick={close} className="block px-3 py-3.5 text-[16px] font-semibold text-navy">
                {collection.name}
              </Link>
            ))}
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
