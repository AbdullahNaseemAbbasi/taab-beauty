import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Logo from "../Logo.jsx";
import MegaMenu from "./MegaMenu.jsx";
import { IconButton } from "../ui/Button.jsx";
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "../ui/Icons.jsx";
import { nav } from "../../config/site.js";
import { useStore } from "../../store/StoreProvider.jsx";

const linkClass = ({ isActive }, accent) =>
  `relative py-1 text-[15px] font-semibold transition-colors hover:text-coral ${accent ? "text-coral" : "text-navy"} ${
    isActive ? "after:absolute after:inset-x-0 after:-bottom-1.5 after:h-[2px] after:rounded-full after:bg-coral" : ""
  }`;

export default function Header() {
  const { cart, wishlist, setUI } = useStore();
  const [megaOpen, setMegaOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="wrap flex h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-2 lg:hidden">
          <IconButton label="Open menu" onClick={() => setUI({ menuOpen: true })}>
            <MenuIcon className="size-6" />
          </IconButton>
        </div>

        <Link to="/" aria-label="TAAB home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex" onMouseLeave={() => setMegaOpen(false)}>
          {nav.map((item) =>
            item.mega ? (
              <div key={item.to} className="relative" onMouseEnter={() => setMegaOpen(true)}>
                <NavLink to={item.to} className={(state) => linkClass(state, false)} aria-haspopup="true" aria-expanded={megaOpen} onFocus={() => setMegaOpen(true)}>
                  {item.label}
                </NavLink>
                <MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} className={(state) => linkClass(state, item.accent)} onFocus={() => setMegaOpen(false)}>
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="flex items-center gap-1">
          <IconButton label="Search" onClick={() => setUI({ searchOpen: true })}>
            <SearchIcon className="size-[22px]" />
          </IconButton>
          <Link to="/account" aria-label="My account" className="hidden size-11 place-items-center rounded-full text-navy hover:bg-tint sm:grid">
            <UserIcon className="size-[22px]" />
          </Link>
          <Link to="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`} className="relative hidden size-11 place-items-center rounded-full text-navy hover:bg-tint sm:grid">
            <HeartIcon className="size-[22px]" />
            {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-[11px] font-bold text-white">{wishlist.length}</span>}
          </Link>
          <IconButton label={`Shopping bag, ${cart.totals.itemCount} items`} badge={cart.totals.itemCount} onClick={() => setUI({ cartOpen: true })}>
            <BagIcon className="size-[22px]" />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
