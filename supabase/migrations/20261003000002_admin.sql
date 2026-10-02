-- TAAB · admin access, order management, stats and abuse limits
-- Admins sign in with Supabase Auth (email + password). A row in public.admins
-- grants access; every policy and function below checks is_admin().

create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select using (public.is_admin());

-- ------------------------------------------------------------ policies
do $$
declare t text;
begin
  foreach t in array array['products','categories','brands','concerns','articles','faqs','coupons','settings','reviews','contact_messages'] loop
    execute format('drop policy if exists "admin manage %1$s" on public.%1$I', t);
    execute format('create policy "admin manage %1$s" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "admin read orders"        on public.orders;
drop policy if exists "admin update orders"      on public.orders;
drop policy if exists "admin read order items"   on public.order_items;
drop policy if exists "admin read customers"     on public.customers;
drop policy if exists "admin update customers"   on public.customers;
drop policy if exists "admin read events"        on public.events;
drop policy if exists "admin read subscribers"   on public.newsletter_subscribers;
drop policy if exists "admin delete subscribers" on public.newsletter_subscribers;

create policy "admin read orders"        on public.orders                 for select using (public.is_admin());
create policy "admin update orders"      on public.orders                 for update using (public.is_admin()) with check (public.is_admin());
create policy "admin read order items"   on public.order_items            for select using (public.is_admin());
create policy "admin read customers"     on public.customers              for select using (public.is_admin());
create policy "admin update customers"   on public.customers              for update using (public.is_admin()) with check (public.is_admin());
create policy "admin read events"        on public.events                 for select using (public.is_admin());
create policy "admin read subscribers"   on public.newsletter_subscribers for select using (public.is_admin());
create policy "admin delete subscribers" on public.newsletter_subscribers for delete using (public.is_admin());

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- The low-stock view must respect RLS (run as the caller, not the owner).
alter view public.low_stock_products set (security_invoker = true);
grant select on public.low_stock_products to authenticated;

-- ------------------------------------------------------- abuse limits
-- At most 5 orders per phone number per hour (place_order inserts go through this trigger too).
create or replace function public.orders_rate_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.orders where phone = new.phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many orders from this number in the last hour. Please contact us on WhatsApp.';
  end if;
  return new;
end $$;
drop trigger if exists orders_rate_limit on public.orders;
create trigger orders_rate_limit before insert on public.orders for each row execute function public.orders_rate_limit();

-- ---------------------------------------------------- order management
create or replace function public.update_order_status(
  p_order_id text,
  p_status text,
  p_note text default null,
  p_courier text default null,
  p_tracking text default null,
  p_payment_status text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o         public.orders%rowtype;
  v_old     text;
  v_label   text;
  v_item    record;
  v_idx     int;
  v_stock   int;
begin
  if not public.is_admin() then raise exception 'Not authorised.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  v_old := o.status;

  if p_status is not null and p_status not in ('created','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','failed','returned','refunded') then
    raise exception 'Unknown status %.', p_status;
  end if;

  v_label := case coalesce(p_status, v_old)
    when 'created' then 'Order placed'
    when 'confirmed' then 'Payment confirmed'
    when 'processing' then 'Processing'
    when 'packed' then 'Packed'
    when 'shipped' then 'Shipped' || coalesce(' with ' || coalesce(p_courier, o.courier), '')
    when 'out_for_delivery' then 'Out for delivery'
    when 'delivered' then 'Delivered'
    when 'cancelled' then 'Cancelled'
    when 'failed' then 'Payment failed'
    when 'returned' then 'Returned'
    when 'refunded' then 'Refunded'
    else coalesce(p_status, v_old) end;

  update public.orders set
    status = coalesce(p_status, status),
    courier = coalesce(p_courier, courier),
    tracking_code = coalesce(p_tracking, tracking_code),
    payment_status = coalesce(p_payment_status,
                       case when coalesce(p_status, status) = 'delivered' and payment_method = 'cod' then 'paid'
                            when coalesce(p_status, status) in ('refunded') then 'refunded'
                            else payment_status end),
    timeline = timeline || jsonb_strip_nulls(jsonb_build_object(
      'status', coalesce(p_status, v_old), 'label', v_label, 'at', now(), 'note', p_note,
      'tracking', coalesce(p_tracking, case when coalesce(p_status, v_old) = 'shipped' then tracking_code end)
    ))
  where id = p_order_id
  returning * into o;

  -- Return stock to the shelf when an order is cancelled or returned.
  if p_status in ('cancelled', 'returned') and v_old not in ('cancelled', 'returned', 'refunded') then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      if v_item.variant_id is not null then
        select (ord - 1)::int, coalesce((opt->>'stock')::int, 0) into v_idx, v_stock
          from public.products p, jsonb_array_elements(coalesce(p.variants->'options', '[]'::jsonb)) with ordinality as t(opt, ord)
         where p.id = v_item.product_id and opt->>'id' = v_item.variant_id;
        if v_idx is not null then
          update public.products
             set variants = jsonb_set(variants, array['options', v_idx::text, 'stock'], to_jsonb(v_stock + v_item.quantity)),
                 stock = stock + v_item.quantity
           where id = v_item.product_id;
        end if;
      else
        update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
      end if;
    end loop;
  end if;

  return public.order_to_json(o);
end $$;
grant execute on function public.update_order_status(text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- stats
create or replace function public.admin_stats(p_days int default 7)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 7), 1));
  result jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorised.'; end if;
  select jsonb_build_object(
    'days', p_days,
    'orders', (select count(*) from public.orders where created_at >= since and status not in ('cancelled','failed')),
    'revenue', (select coalesce(sum(total), 0) from public.orders where created_at >= since and status not in ('cancelled','failed','returned','refunded')),
    'pending', (select count(*) from public.orders where status in ('created','confirmed','processing','packed')),
    'awaiting_payment', (select count(*) from public.orders where payment_method = 'bank' and payment_status = 'pending' and status not in ('cancelled','failed')),
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
          from public.orders where created_at >= since and status not in ('cancelled','failed') group by 1) s), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'slug', slug, 'units', u, 'revenue', r) order by r desc) from (
        select i.name, i.slug, sum(i.quantity) u, sum(i.line_total) r
          from public.order_items i join public.orders o on o.id = i.order_id
         where o.created_at >= since and o.status not in ('cancelled','failed')
         group by i.name, i.slug order by r desc limit 8) t), '[]'::jsonb),
    'low_stock', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'sku', sku, 'stock', stock) order by stock) from (
        select id, name, sku, stock from public.products where active and stock <= low_stock_threshold order by stock limit 12) l), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'orders', c, 'revenue', r) order by d) from (
        select (created_at at time zone 'Asia/Karachi')::date d, count(*) c, sum(total) r
          from public.orders where created_at >= since and status not in ('cancelled','failed') group by 1) dd), '[]'::jsonb)
  ) into result;
  return result;
end $$;
grant execute on function public.admin_stats(int) to authenticated;
