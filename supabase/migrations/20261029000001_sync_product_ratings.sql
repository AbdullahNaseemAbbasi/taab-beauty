-- Product ratings and review counts were seeded as fixed numbers, so a product card could show "(126)" while its
-- product page said "No reviews yet". The refresh_product_rating trigger keeps them in step with approved reviews
-- from now on; this brings the existing rows in line once.
update public.products p
   set rating = r.avg_rating,
       review_count = r.approved
  from (
    select pr.id,
           coalesce(round(avg(rv.rating)::numeric, 1), 0) as avg_rating,
           count(rv.id)::int as approved
      from public.products pr
      left join public.reviews rv on rv.product_id = pr.id and rv.status = 'approved'
     group by pr.id
  ) r
 where r.id = p.id
   and (p.rating is distinct from r.avg_rating or p.review_count is distinct from r.approved);
