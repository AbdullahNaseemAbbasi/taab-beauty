import { WhatsAppIcon } from "../ui/Icons.jsx";
import { site } from "../../config/site.js";
import { ecommerce } from "../../analytics/ecommerce.js";
import { useStore } from "../../store/StoreProvider.jsx";

export function whatsappLink(message) {
  return `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

/* Floating "Chat with us" button, tracked as an analytics event. Lifts above the mobile sticky add-to-bag bar. */
export default function WhatsAppButton() {
  const { ui } = useStore();
  return (
    <a
      href={whatsappLink("Hi TAAB, I have a question about an order.")}
      target="_blank"
      rel="noreferrer"
      onClick={() => ecommerce.whatsapp("floating_button")}
      aria-label="Chat with us on WhatsApp"
      className={`fixed left-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] py-3 pr-5 pl-4 text-[14px] font-semibold text-white shadow-float transition-transform hover:scale-105 print:hidden ${
        ui.stickyBar ? "bottom-[92px] lg:bottom-5" : "bottom-5"
      }`}
    >
      <WhatsAppIcon className="size-5" />
      <span className="hidden sm:inline">Chat with us</span>
    </a>
  );
}
