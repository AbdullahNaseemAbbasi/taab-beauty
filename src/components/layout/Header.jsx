import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Logo from "../Logo.jsx";
import MegaMenu from "./MegaMenu.jsx";
import { IconButton } from "../ui/Button.jsx";
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "../ui/Icons.jsx";
import { site } from "../../config/site.js";
import { useStore } from "../../store/StoreProvider.jsx";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";

/* Departments shown in the bar; any beyond this are reached through the Shop menu. */
const MAX_NAV_DEPARTMENTS = 6;

const linkClass = ({ isActive }) =>
  `relative whitespace-nowrap py-1 text-[15px] font-semibold text-navy transition-colors hover:text-coral ${
    isActive ? "after:absolute after:inset-x-0 after:-bottom-1.5 after:h-[2px] after:rounded-full after:bg-coral" : ""
  }`;

export default function Header() {
  const { cart, wishlist, setUI } = useStore();
  const { departments } = useCatalog();
  const [megaOpen, setMegaOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur print:hidden">
      <div className="wrap flex h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-2 lg:hidden">
          <IconButton label="Open menu" onClick={() => setUI({ menuOpen: true })}>
            <MenuIcon className="size-6" />
          </IconButton>
        </div>

        <Link to="/" aria-label={`${site.name} home`} title={`${site.name} home`} className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex" onMouseLeave={() => setMegaOpen(false)}>
          <div className="relative" onMouseEnter={() => setMegaOpen(true)}>
            <NavLink to="/shop" end className={linkClass} aria-haspopup="true" aria-expanded={megaOpen} onFocus={() => setMegaOpen(true)}>
              Shop
            </NavLink>
            <MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />
          </div>
          {departments.slice(0, MAX_NAV_DEPARTMENTS).map((department) => (
            <NavLink key={department.id} to={`/department/${department.id}`} className={linkClass} onFocus={() => setMegaOpen(false)}>
              {department.name}
            </NavLink>
          ))}
          <NavLink to="/new-arrivals" className={linkClass} onFocus={() => setMegaOpen(false)}>
            New In
          </NavLink>
        </nav>

        <div className="flex items-center gap-1">
          <IconButton label="Search products" onClick={() => setUI({ searchOpen: true })}>
            <SearchIcon className="size-[22px]" />
          </IconButton>
          <Link to="/account" aria-label="My account" title="My account" className="hidden size-11 place-items-center rounded-full text-navy hover:bg-tint sm:grid">
            <UserIcon className="size-[22px]" />
          </Link>
          <Link to="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`} title="Wishlist" className="relative hidden size-11 place-items-center rounded-full text-navy hover:bg-tint sm:grid">
            <HeartIcon className="size-[22px]" />
            {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-[11px] font-bold text-white">{wishlist.length}</span>}
          </Link>
          <IconButton label="Your bag" badge={cart.totals.itemCount} onClick={() => setUI({ cartOpen: true })}>
            <BagIcon className="size-[22px]" />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
