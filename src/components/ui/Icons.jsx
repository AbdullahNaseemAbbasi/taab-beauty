const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

function S({ className = "size-5", children, ...rest }) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

function F({ className = "size-5", children }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

export const ArrowIcon = (p) => <S {...p}><path d="M4 12h15M13 6l6 6-6 6" /></S>;
export const ArrowLeftIcon = (p) => <S {...p}><path d="M20 12H5M11 6l-6 6 6 6" /></S>;
export const ChevronDownIcon = (p) => <S {...p}><path d="M6 9l6 6 6-6" /></S>;
export const ChevronRightIcon = (p) => <S {...p}><path d="M9 6l6 6-6 6" /></S>;
export const ChevronLeftIcon = (p) => <S {...p}><path d="M15 6l-6 6 6 6" /></S>;
export const MenuIcon = (p) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>;
export const CloseIcon = (p) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const SearchIcon = (p) => <S {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></S>;
export const BagIcon = (p) => <S {...p}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></S>;
export const HeartIcon = ({ filled, ...p }) => (
  <S {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" fill={filled ? "currentColor" : "none"} /></S>
);
export const UserIcon = (p) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></S>;
export const StarIcon = (p) => <F {...p}><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></F>;
export const CheckIcon = (p) => <S {...p} strokeWidth="2.5"><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const PlusIcon = (p) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const MinusIcon = (p) => <S {...p}><path d="M5 12h14" /></S>;
export const TrashIcon = (p) => <S {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></S>;
export const TruckIcon = (p) => <S {...p}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></S>;
export const ShieldIcon = (p) => <S {...p}><path d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5C8 19.2 5 15.5 5 11V6l7-3z" /><path d="M9.5 12l1.8 1.8L15 10" /></S>;
export const CashIcon = (p) => <S {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.8" /><path d="M6 12h.01M18 12h.01" /></S>;
export const RefreshIcon = (p) => <S {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></S>;
export const WhatsAppIcon = (p) => (
  <F {...p}><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.1.7a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.2-.2-.2-.5-.3z" /></F>
);
export const InstagramIcon = (p) => (
  <F {...p}><path fillRule="evenodd" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-3.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" /></F>
);
export const FacebookIcon = (p) => <F {...p}><path d="M12 2a10 10 0 0 0-1.6 19.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 12 2z" /></F>;
export const TikTokIcon = (p) => <F {...p}><path d="M16.5 3c.3 2.2 1.6 3.6 3.8 3.8v3.3c-1.4 0-2.7-.4-3.8-1.2v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.4a2.3 2.3 0 1 0 1.4 2.1V3h3.3z" /></F>;
export const YouTubeIcon = (p) => <F {...p}><path d="M23 7.2a2.9 2.9 0 0 0-2-2C19.2 4.7 12 4.7 12 4.7s-7.2 0-9 .5a2.9 2.9 0 0 0-2 2C.5 9 .5 12 .5 12s0 3 .5 4.8a2.9 2.9 0 0 0 2 2c1.8.5 9 .5 9 .5s7.2 0 9-.5a2.9 2.9 0 0 0 2-2c.5-1.8.5-4.8.5-4.8s0-3-.5-4.8zM9.7 15.5v-7l6.3 3.5-6.3 3.5z" /></F>;
export const RedditIcon = (p) => <F {...p}><path d="M22 12.1a2.2 2.2 0 0 0-3.7-1.6 10.8 10.8 0 0 0-5.8-1.8l1-4.6 3.2.7a1.5 1.5 0 1 0 .2-1l-3.6-.8a.5.5 0 0 0-.6.4l-1.1 5.3a10.8 10.8 0 0 0-5.9 1.8A2.2 2.2 0 1 0 3.3 14c0 .3-.1.5-.1.8 0 3.3 3.9 6 8.7 6s8.7-2.7 8.7-6v-.8a2.2 2.2 0 0 0 1.4-1.9zM7 13.6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm8.5 4.1a5.7 5.7 0 0 1-3.6 1.1 5.7 5.7 0 0 1-3.6-1.1.4.4 0 0 1 .6-.6 4.9 4.9 0 0 0 3 .9 4.9 4.9 0 0 0 3-.9.4.4 0 0 1 .6.6zm-.3-2.6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" /></F>;
export const MailIcon = (p) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></S>;
export const PhoneIcon = (p) => <S {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></S>;
export const PinIcon = (p) => <S {...p}><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></S>;
export const ClockIcon = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
export const ShareIcon = (p) => <S {...p}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></S>;
export const CompareIcon = (p) => <S {...p}><path d="M9 4v16M15 4v16M4 9h5M15 9h5M4 15h5M15 15h5" /></S>;
export const FilterIcon = (p) => <S {...p}><path d="M4 6h16M7 12h10M10 18h4" /></S>;
export const EyeIcon = (p) => <S {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></S>;
export const InfoIcon = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></S>;
export const SparkleIcon = (p) => <S {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></S>;
export const GiftIcon = (p) => <S {...p}><rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z" /></S>;
export const PackageIcon = (p) => <S {...p}><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></S>;
export const TagIcon = (p) => <S {...p}><path d="M3 12V4h8l9 9-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></S>;
export const LeafIcon = (p) => <S {...p}><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path d="M5 19c3-4 6-7 10-9" /></S>;
export const SunIcon = (p) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>;
export const ZapIcon = (p) => <S {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></S>;
export const ExternalIcon = (p) => <S {...p}><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></S>;

export const LayersIcon = (p) => <S {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></S>;
export const GridIcon = (p) => <S {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></S>;
export const ChartBarIcon = (p) => <S {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></S>;
export const CogIcon = (p) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></S>;
export const LogoutIcon = (p) => <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></S>;
export const UploadIcon = (p) => <S {...p}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></S>;
export const StoreIcon = (p) => <S {...p}><path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6" /></S>;

export const trustIcons = { shield: ShieldIcon, truck: TruckIcon, cash: CashIcon, refresh: RefreshIcon };
export const socialIcons = { instagram: InstagramIcon, facebook: FacebookIcon, tiktok: TikTokIcon, youtube: YouTubeIcon, reddit: RedditIcon, whatsapp: WhatsAppIcon };
