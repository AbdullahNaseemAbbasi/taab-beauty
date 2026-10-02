import { useState } from "react";
import RatingStars, { RatingInput } from "../ui/RatingStars.jsx";
import Button from "../ui/Button.jsx";
import { Field, Input, Textarea } from "../ui/Form.jsx";
import { Badge } from "../ui/Typography.jsx";
import { CheckIcon } from "../ui/Icons.jsx";
import { imageProps } from "../../lib/images.js";
import { formatDate } from "../../lib/format.js";
import { reviewsForProduct, ratingBreakdown } from "../../data/reviews.js";
import { useStore } from "../../store/StoreProvider.jsx";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";

function ReviewCard({ review }) {
  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars rating={review.rating} size="size-4" />
        <span className="text-[14px] font-semibold text-navy">{review.author}</span>
        <span className="text-[13px] text-ink-light">{review.city}</span>
        {review.verified && (
          <Badge tone="success" className="gap-1">
            <CheckIcon className="size-3" /> Verified purchase
          </Badge>
        )}
        <span className="ml-auto text-[13px] text-ink-light">{formatDate(review.date)}</span>
      </div>
      <h4 className="mt-2 font-display text-[16px] font-extrabold text-navy">{review.title}</h4>
      <p className="mt-1.5 text-[15px] leading-[1.65] text-ink">{review.body}</p>
      {review.photo && <img {...imageProps(review.photo, { width: 240, sizes: "96px", alt: `Photo from ${review.author}` })} className="mt-3 size-24 rounded-xl object-cover" />}
      {review.helpful != null && <p className="mt-3 text-[12px] text-ink-light">{review.helpful} people found this helpful</p>}
    </li>
  );
}

export default function ReviewSection({ product }) {
  const { toast } = useStore();
  const [reviews, setReviews] = useState(() => reviewsForProduct(product.id));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 5, name: "", title: "", body: "" });
  const breakdown = ratingBreakdown(product.id);

  function submit(event) {
    event.preventDefault();
    const review = { id: `local-${Date.now()}`, productId: product.id, author: form.name, city: "", rating: form.rating, date: new Date().toISOString(), verified: false, title: form.title, body: form.body, helpful: 0 };
    setReviews((current) => [review, ...current]);
    track(EVENTS.REVIEW_SUBMIT, { item_id: product.sku, rating: form.rating });
    toast("Thanks! Your review is awaiting moderation.");
    setShowForm(false);
    setForm({ rating: 5, name: "", title: "", body: "" });
  }

  return (
    <section id="reviews" className="mt-16">
      <div className="grid gap-8 rounded-2xl border border-line bg-white p-6 sm:p-8 lg:grid-cols-[280px_1fr]">
        <div>
          <p className="font-display text-[48px] font-extrabold leading-none text-navy">{product.rating.toFixed(1)}</p>
          <RatingStars rating={product.rating} size="size-5" className="mt-2" />
          <p className="mt-1 text-[14px] text-ink">Based on {product.reviewCount} reviews</p>
          <ul className="mt-5 space-y-2">
            {breakdown.counts.map(({ stars, count }) => {
              const width = breakdown.total ? Math.round((count / breakdown.total) * 100) : 0;
              return (
                <li key={stars} className="flex items-center gap-3 text-[13px] text-ink">
                  <span className="w-8">{stars}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-tint">
                    <span className="block h-full rounded-full bg-gold" style={{ width: `${width}%` }} />
                  </span>
                  <span className="w-6 text-right">{count}</span>
                </li>
              );
            })}
          </ul>
          <Button variant="outline" className="mt-6 w-full" onClick={() => setShowForm((value) => !value)}>
            Write a review
          </Button>
        </div>

        <div>
          {showForm && (
            <form onSubmit={submit} className="mb-6 rounded-2xl bg-tint p-5">
              <p className="text-[14px] font-semibold text-navy">Your rating</p>
              <RatingInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Name" required>
                  <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </Field>
                <Field label="Review title" required>
                  <Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                </Field>
              </div>
              <Field label="Your review" required className="mt-4">
                <Textarea required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
              </Field>
              <div className="mt-4 flex gap-3">
                <Button type="submit" size="sm">
                  Submit review
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
          {reviews.length ? (
            <ul className="divide-y divide-line">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-[15px] text-ink">No written reviews yet. Be the first to share your experience.</p>
          )}
        </div>
      </div>
    </section>
  );
}
