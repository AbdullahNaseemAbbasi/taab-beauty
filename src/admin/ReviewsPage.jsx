import { useState } from "react";
import { Link } from "react-router-dom";
import RatingStars from "../components/ui/RatingStars.jsx";
import { fetchReviews, setReviewStatus, deleteReview } from "../api/admin.js";
import { formatDate } from "../lib/format.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Chips, PageTitle, useAsync } from "./ui.jsx";

const tabs = [
  { id: "pending", label: "Waiting for approval" },
  { id: "approved", label: "Published" },
  { id: "rejected", label: "Rejected" },
];

export default function ReviewsPage() {
  const [status, setStatus] = useState("pending");
  const reviews = useAsync(() => fetchReviews(status), [status]);
  const { toast } = useStore();
  const { reload } = useCatalog();

  async function act(action, message) {
    try {
      await action();
      toast(message);
      reviews.reload();
      reload();
    } catch (error) {
      toast(error.message, { type: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Reviews" subtitle="Customer reviews appear in the store only after you approve them." />
      <Chips options={tabs} value={status} onChange={setStatus} />

      <Async state={reviews} rows={3}>
        {(rows) =>
          rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center text-[15px] text-ink">{status === "pending" ? "No reviews are waiting. New ones show up here." : "Nothing in this list."}</p>
          ) : (
            <ul className="grid gap-4 xl:grid-cols-2">
              {rows.map((review) => (
                <li key={review.id} className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <RatingStars rating={review.rating} size="size-4" />
                    <span className="text-[14px] font-semibold text-navy">{review.author}</span>
                    {review.city && <span className="text-[13px] text-ink-light">{review.city}</span>}
                    <span className="ml-auto text-[13px] text-ink-light">{formatDate(review.created_at)}</span>
                  </div>
                  <Link to={`/product/${review.products?.slug}`} target="_blank" className="mt-2 inline-block text-[13px] font-semibold text-teal hover:underline">
                    {review.products?.name}
                  </Link>
                  {review.title && <p className="mt-2 font-display text-[16px] font-extrabold text-navy">{review.title}</p>}
                  <p className="mt-1 text-[15px] leading-[1.6] text-ink">{review.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {status !== "approved" && (
                      <button type="button" onClick={() => act(() => setReviewStatus(review.id, "approved"), "Review published.")} className="h-10 rounded-full bg-navy px-5 text-[14px] font-semibold text-white hover:bg-navy-800">
                        Approve
                      </button>
                    )}
                    {status !== "rejected" && (
                      <button type="button" onClick={() => act(() => setReviewStatus(review.id, "rejected"), "Review rejected.")} className="h-10 rounded-full border border-line px-5 text-[14px] font-semibold text-navy hover:border-navy">
                        {status === "approved" ? "Unpublish" : "Reject"}
                      </button>
                    )}
                    <button type="button" onClick={() => window.confirm("Delete this review permanently?") && act(() => deleteReview(review.id), "Review deleted.")} className="h-10 rounded-full px-4 text-[14px] font-semibold text-danger hover:bg-coral-50">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </Async>
    </div>
  );
}
