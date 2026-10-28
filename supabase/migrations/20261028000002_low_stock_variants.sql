-- Naz & CO · the dashboard's low-stock list also shows products with a sold-out
-- size or colour, and the stats say how many orders the revenue covers.

create or replace function public.admin_stats(p_days int default 7)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since  timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 7), 1));
  lost   constant text[] := array['cancelled', 'failed', 'returned', 'refunded'];
  result jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorised.'; end if;
  select jsonb_build_object(
    'days', p_days,
    'orders', (select count(*) from public.orders where created_at >= since and not (status = any(lost))),
    'revenue_orders', (select count(*) from public.orders where created_at >= since and not (status = any(lost))),
    'revenue', (select coalesce(sum(total), 0) from public.orders where created_at >= since and not (status = any(lost))),
    'pending', (select count(*) from public.orders where status in ('created','confirmed','processing','packed')),
    'awaiting_payment', (select count(*) from public.orders where status = 'created' and payment_status = 'pending'),
    'advance_collected', (select coalesce(sum(case when payment_status = 'paid' then total else advance_amount end), 0) from public.orders
                           where created_at >= since and payment_status in ('advance_paid','paid') and status not in ('cancelled','failed','refunded')),
    'balance_due', (select coalesce(sum(total - advance_amount), 0) from public.orders
                     where payment_status = 'advance_paid' and not (status = any(lost)) and status <> 'delivered'),
    'new_customers', (select count(*) from public.customers where created_at >= since),
    'repeat_customers', (select count(*) from public.customers where orders_count >= 2),
    'pending_reviews', (select count(*) from public.reviews where status = 'pending'),
    'new_messages', (select count(*) from public.contact_messages where status = 'new'),
    'subscribers', (select count(*) from public.newsletter_subscribers),
    'funnel', coalesce((select jsonb_object_agg(event, c) from (
        select event, count(*) c from public.events
         where created_at >= since and event in ('page_view','view_item','add_to_cart','begin_checkout','add_payment_info','purchase','whatsapp_click','search')
         group by event) f), '{}'::jsonb),
    'sessions', (select count(distinct session_id) from public.events where created_at >= since and session_id is not null),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'orders', c, 'revenue', r) order by r desc) from (
        select coalesce(attribution->'lastTouch'->>'source', 'direct') source, count(*) c, sum(total) r
          from public.orders where created_at >= since and not (status = any(lost)) group by 1) s), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'slug', slug, 'units', u, 'revenue', r) order by r desc) from (
        select i.name, i.slug, sum(i.quantity) u, sum(i.line_total) r
          from public.order_items i join public.orders o on o.id = i.order_id
         where o.created_at >= since and not (o.status = any(lost))
         group by i.name, i.slug order by r desc limit 8) t), '[]'::jsonb),
    'low_stock', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'sku', sku, 'stock', stock) order by stock) from (
        select id, name, sku, stock from public.products p
         where active and (stock <= low_stock_threshold
               or exists (select 1 from jsonb_array_elements(coalesce(p.variants->'options', '[]'::jsonb)) o where public.setting_int(o->>'stock', 0) <= 0))
         order by stock limit 12) l), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'orders', c, 'revenue', r) order by d) from (
        select (created_at at time zone 'Asia/Karachi')::date d, count(*) c, sum(total) r
          from public.orders where created_at >= since and not (status = any(lost)) group by 1) dd), '[]'::jsonb)
  ) into result;
  return result;
end $$;
