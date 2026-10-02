import { useSearchParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import { PageHero, JournalCard } from "../components/sections/Sections.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { SparkleIcon } from "../components/ui/Icons.jsx";
import { articles, journalTopics } from "../data/journal.js";
import { images } from "../data/images.js";

export default function JournalPage() {
  const [params, setParams] = useSearchParams();
  const topic = params.get("topic") || "";
  const list = (topic ? articles.filter((article) => article.topic === topic) : articles).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const [featured, ...rest] = list;
  const activeTopic = journalTopics.find((entry) => entry.id === topic);

  useSeo({ title: activeTopic ? `${activeTopic.name} | Beauty Journal` : "Beauty Journal", description: "Product guides, routines, ingredient explainers and makeup tips from TAAB artists and dermatologists.", path: topic ? `/journal?topic=${topic}` : "/journal" });

  return (
    <>
      <PageHero eyebrow="Beauty Journal" title="Learn before you buy." description="Guides and tutorials written by our makeup artists and dermatologists. No fluff, no sponsored opinions." image={images.hero.journal} imageAlt="Applying makeup in a mirror" compact />
      <section className="wrap py-12">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setParams({})} className={`rounded-full px-4 py-2 text-[14px] font-semibold ${!topic ? "bg-navy text-white" : "border border-line text-navy hover:border-navy"}`}>
            All
          </button>
          {journalTopics.map((entry) => (
            <button key={entry.id} type="button" onClick={() => setParams({ topic: entry.id })} className={`rounded-full px-4 py-2 text-[14px] font-semibold ${topic === entry.id ? "bg-navy text-white" : "border border-line text-navy hover:border-navy"}`}>
              {entry.name}
            </button>
          ))}
        </div>

        {featured ? (
          <>
            <div className="mt-8">
              <JournalCard article={featured} featured />
            </div>
            {rest.length > 0 && (
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <JournalCard key={article.slug} article={article} />
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState icon={SparkleIcon} title="No articles in this topic yet" text="We publish every week. Check the other topics meanwhile." className="mt-8" />
        )}
      </section>
    </>
  );
}
