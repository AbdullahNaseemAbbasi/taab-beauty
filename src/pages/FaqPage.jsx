import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Accordion } from "../components/ui/Navigation.jsx";
import { WhatsAppIcon } from "../components/ui/Icons.jsx";
import { PageHeader } from "../components/sections/Sections.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { faqSchema } from "../lib/schema.js";
import { useStoreText } from "../lib/storeText.js";
import { site } from "../config/site.js";
import { ecommerce } from "../analytics/ecommerce.js";

export default function FaqPage() {
  const { faqs } = useCatalog();
  const fill = useStoreText();
  /* Answers quote the live settings (advance, delivery fee) through placeholders. */
  const groups = faqs.map((group) => ({ ...group, items: group.items.map((item) => ({ question: fill(item.question), answer: fill(item.answer) })) }));
  useSeo({ title: "Frequently Asked Questions", description: `Payment, delivery times, returns, warranty and product help at ${site.name}.`, path: "/faq", jsonLd: [faqSchema(groups.flatMap((group) => group.items))] });

  return (
    <>
      <PageHeader title="Frequently asked questions" description="Payment, delivery, products and returns. If your question is not here, WhatsApp us." />
      <section className="wrap grid gap-10 py-8 sm:py-12 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-10">
          {groups.map((group) => (
            <div key={group.category}>
              <h2 className="font-display text-[22px] font-extrabold text-navy">{group.category}</h2>
              <Accordion className="mt-4" items={group.items.map((item) => ({ title: item.question, content: <p>{item.answer}</p> }))} />
            </div>
          ))}
        </div>
        <aside className="rounded-2xl bg-tint p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-[20px] font-extrabold text-navy">Still stuck?</h2>
          <p className="mt-2 text-[14px] text-ink">A real person answers WhatsApp {site.contact.hours}.</p>
          <Button href={whatsappLink(`Hi ${site.name}, I have a question that is not in the FAQ.`)} target="_blank" rel="noreferrer" variant="whatsapp" className="mt-4 w-full" onClick={() => ecommerce.whatsapp("faq_page")}>
            <WhatsAppIcon className="size-5" /> Chat on WhatsApp
          </Button>
          <Button to="/contact" variant="ghost" className="mt-2 w-full">
            Other ways to contact us
          </Button>
        </aside>
      </section>
    </>
  );
}
