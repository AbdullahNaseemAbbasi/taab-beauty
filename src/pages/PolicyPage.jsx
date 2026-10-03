import useSeo from "../hooks/useSeo.js";
import { PageHeader } from "../components/sections/Sections.jsx";
import { policies } from "../data/policies.js";
import { formatDate } from "../lib/format.js";
import { useStoreText } from "../lib/storeText.js";

export default function PolicyPage({ policy }) {
  const doc = policies[policy];
  const fill = useStoreText();
  useSeo({ title: doc.title, description: fill(doc.sections[0].body[0]), path: `/${doc.slug}` });

  return (
    <>
      <PageHeader title={doc.title} description={`Last updated ${formatDate(doc.updated)}`} />
      <section className="wrap py-12">
        <div className="prose-brand mx-auto max-w-3xl">
          {doc.sections.map((section) => (
            <div key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{fill(paragraph)}</p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
