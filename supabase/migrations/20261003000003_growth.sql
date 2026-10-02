-- TAAB · notifications, creator offers, stock alerts, abandoned checkouts, reports

-- ----------------------------------------------------------- notifications
-- Push a message to ntfy.sh (free, no account) when an order or a contact
-- message arrives. The topic name acts as the password and lives in the
-- settings table (key "notifications"), never in this file.
create extension if not exists pg_net with schema extensions;

create or replace function public.ntfy_topic() returns text language sql stable security definer set search_path = public as $$
  select nullif(value->>'ntfy_topic', '') from public.settings where key = 'notifications';
$$;

create or replace function public.notify_new_order() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_topic text := public.ntfy_topic();
  v_items text;
  v_body  text;
begin
  if v_topic is null then return new; end if;
  select string_agg(quantity || ' × ' || name || coalesce(' (' || variant_name || ')', ''), E'\n' order by id)
    into v_items from public.order_items where order_id = new.id;
  v_body := format(E'Rs. %s · %s\n%s\n%s, %s\n%s\n\n%s',
    to_char(new.total, 'FM999,999,999'),
    case new.payment_method when 'cod' then 'Cash on delivery' when 'bank' then 'Bank transfer (awaiting receipt)' else 'Card' end,
    coalesce(new.customer->>'name', ''),
    coalesce(new.customer->>'city', ''), coalesce(new.phone, ''),
    coalesce(new.customer->>'address', ''),
    coalesce(v_items, ''));
  perform net.http_post(
    url := 'https://ntfy.sh',
    body := jsonb_build_object(
      'topic', v_topic,
      'title', 'New order ' || new.id,
      'message', v_body,
      'priority', 4,
      'tags', jsonb_build_array('shopping_bags'),
      'click', 'https://supabase.com/dashboard/project/' || current_setting('app.settings.project_ref', true) || '/editor'
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  return new; -- notifications must never block an order
end $$;

-- Deferred so order_items exist when the message is built.
drop trigger if exists orders_notify on public.orders;
create constraint trigger orders_notify
  after insert on public.orders
  deferrable initially deferred
  for each row execute function public.notify_new_order();

create or replace function public.notify_new_message() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v_topic text := public.ntfy_topic();
begin
  if v_topic is null then return new; end if;
  perform net.http_post(
    url := 'https://ntfy.sh',
    body := jsonb_build_object(
      'topic', v_topic,
      'title', 'New message: ' || coalesce(new.topic, 'Contact'),
      'message', format(E'%s · %s\n%s\n\n%s', new.name, new.email, coalesce(new.phone, ''), left(new.message, 500)),
      'priority', 3,
      'tags', jsonb_build_array('envelope')
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  return new;
end $$;
drop trigger if exists messages_notify on public.contact_messages;
create trigger messages_notify after insert on public.contact_messages for each row execute function public.notify_new_message();

-- ---------------------------------------------------------- creator offers
-- Visitors arriving with ?ref=<creator> see that creator's coupon.
create or replace function public.creator_offer(p_ref text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', code, 'description', description, 'type', type, 'value', value, 'minOrder', min_order, 'creatorId', creator_id)
    from public.coupons
   where lower(creator_id) = lower(trim(coalesce(p_ref, '')))
     and active
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at >= now())
     and (usage_limit is null or used_count < usage_limit)
   order by value desc
   limit 1;
$$;
grant execute on function public.creator_offer(text) to anon, authenticated;

-- ------------------------------------------------------------ stock alerts
create table if not exists public.stock_alerts (
  id          bigserial primary key,
  product_id  text not null references public.products(id) on delete cascade,
  variant_id  text,
  contact     text not null,
  channel     text not null check (channel in ('phone', 'email')),
  created_at  timestamptz not null default now(),
  notified_at timestamptz
);
create index if not exists stock_alerts_product_idx on public.stock_alerts(product_id) where notified_at is null;
alter table public.stock_alerts enable row level security;
drop policy if exists "public add stock alert" on public.stock_alerts;
drop policy if exists "admin manage stock alerts" on public.stock_alerts;
create policy "public add stock alert" on public.stock_alerts for insert with check (true);
create policy "admin manage stock alerts" on public.stock_alerts for all using (public.is_admin()) with check (public.is_admin());
grant insert on public.stock_alerts to anon, authenticated;
grant usage, select on sequence public.stock_alerts_id_seq to anon, authenticated;
grant select, update, delete on public.stock_alerts to authenticated;

-- ------------------------------------------------------ abandoned checkouts
create table if not exists public.checkout_sessions (
  session_id  text primary key,
  phone       text,
  name        text,
  email       text,
  city        text,
  lines       jsonb not null default '[]',
  subtotal    int  not null default 0,
  attribution jsonb,
  converted   boolean not null default false,
  order_id    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.checkout_sessions enable row level security;
drop policy if exists "admin manage checkout sessions" on public.checkout_sessions;
create policy "admin manage checkout sessions" on public.checkout_sessions for all using (public.is_admin()) with check (public.is_admin());
grant select, update, delete on public.checkout_sessions to authenticated;

create or replace function public.save_checkout(p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_session text := nullif(trim(coalesce(p_payload->>'sessionId', '')), '');
begin
  if v_session is null then return; end if;
  insert into public.checkout_sessions (session_id, phone, name, email, city, lines, subtotal, attribution, converted, order_id, updated_at)
  values (
    v_session,
    nullif(regexp_replace(coalesce(p_payload->>'phone', ''), '\D', '', 'g'), ''),
    nullif(p_payload->>'name', ''),
    nullif(p_payload->>'email', ''),
    nullif(p_payload->>'city', ''),
    coalesce(p_payload->'lines', '[]'::jsonb),
    coalesce((p_payload->>'subtotal')::int, 0),
    p_payload->'attribution',
    coalesce((p_payload->>'converted')::boolean, false),
    nullif(p_payload->>'orderId', ''),
    now()
  )
  on conflict (session_id) do update set
    phone = coalesce(excluded.phone, public.checkout_sessions.phone),
    name = coalesce(excluded.name, public.checkout_sessions.name),
    email = coalesce(excluded.email, public.checkout_sessions.email),
    city = coalesce(excluded.city, public.checkout_sessions.city),
    lines = case when jsonb_array_length(excluded.lines) > 0 then excluded.lines else public.checkout_sessions.lines end,
    subtotal = case when excluded.subtotal > 0 then excluded.subtotal else public.checkout_sessions.subtotal end,
    attribution = coalesce(excluded.attribution, public.checkout_sessions.attribution),
    converted = public.checkout_sessions.converted or excluded.converted,
    order_id = coalesce(excluded.order_id, public.checkout_sessions.order_id),
    updated_at = now();
end $$;
grant execute on function public.save_checkout(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- reports
-- Read these in the Supabase dashboard (Table editor → Views) until an admin UI exists.
create or replace view public.report_daily_sales with (security_invoker = true) as
  select (created_at at time zone 'Asia/Karachi')::date as day,
         count(*) as orders,
         sum(total) as revenue,
         sum(discount) as discounts,
         sum(shipping) as shipping_collected,
         round(avg(total)) as average_order,
         count(*) filter (where payment_method = 'cod') as cod_orders,
         count(*) filter (where payment_method = 'bank') as bank_orders,
         count(*) filter (where status = 'delivered') as delivered,
         count(*) filter (where status in ('cancelled','failed','returned','refunded')) as lost
    from public.orders
   group by 1
   order by 1 desc;

create or replace view public.report_product_performance with (security_invoker = true) as
  with ev as (
    select e.event, i->>'item_id' as sku
      from public.events e, jsonb_array_elements(coalesce(e.items, '[]'::jsonb)) i
     where e.event in ('view_item', 'add_to_cart')
  ),
  sales as (
    select i.sku, sum(i.quantity) as units, sum(i.line_total) as revenue, count(distinct i.order_id) as orders
      from public.order_items i join public.orders o on o.id = i.order_id
     where o.status not in ('cancelled', 'failed')
     group by i.sku
  )
  select p.sku, p.name, p.price, p.stock, p.active,
         coalesce((select count(*) from ev where ev.event = 'view_item' and ev.sku = p.sku), 0) as views,
         coalesce((select count(*) from ev where ev.event = 'add_to_cart' and ev.sku = p.sku), 0) as add_to_carts,
         coalesce(s.orders, 0) as orders,
         coalesce(s.units, 0) as units_sold,
         coalesce(s.revenue, 0) as revenue,
         coalesce(s.revenue, 0) - coalesce(s.units, 0) * coalesce(p.cost, 0) as gross_profit,
         (select count(*) from public.stock_alerts a where a.product_id = p.id and a.notified_at is null) as waiting_for_stock
    from public.products p
    left join sales s on s.sku = p.sku
   order by revenue desc, views desc;

create or replace view public.report_sources with (security_invoker = true) as
  select coalesce(attribution->'lastTouch'->>'source', 'direct') as source,
         coalesce(attribution->'lastTouch'->>'utm_campaign', '') as campaign,
         coalesce(attribution->'lastTouch'->>'utm_content', '') as ad_content,
         coalesce(attribution->>'creatorRef', coalesce(creator_id, '')) as creator,
         count(*) as orders,
         sum(total) as revenue,
         round(avg(total)) as average_order,
         min(created_at) as first_order,
         max(created_at) as last_order
    from public.orders
   where status not in ('cancelled', 'failed')
   group by 1, 2, 3, 4
   order by revenue desc;

create or replace view public.report_funnel_daily with (security_invoker = true) as
  select (created_at at time zone 'Asia/Karachi')::date as day,
         count(distinct session_id) as sessions,
         count(*) filter (where event = 'page_view') as page_views,
         count(*) filter (where event = 'view_item') as product_views,
         count(*) filter (where event = 'add_to_cart') as add_to_carts,
         count(*) filter (where event = 'begin_checkout') as checkouts_started,
         count(*) filter (where event = 'purchase') as purchases,
         count(*) filter (where event = 'whatsapp_click') as whatsapp_clicks,
         count(*) filter (where event = 'search') as searches
    from public.events
   group by 1
   order by 1 desc;

create or replace view public.report_customers with (security_invoker = true) as
  select phone, name, email, city, orders_count, total_spent, first_order_at, last_order_at,
         case
           when orders_count = 0 then 'new'
           when orders_count = 1 and last_order_at > now() - interval '120 days' then 'first_time'
           when last_order_at < now() - interval '120 days' then 'inactive'
           when total_spent >= 20000 then 'high_value'
           else 'repeat'
         end as segment
    from public.customers
   order by total_spent desc;

create or replace view public.report_abandoned_checkouts with (security_invoker = true) as
  select session_id, phone, name, city, subtotal, lines,
         attribution->'lastTouch'->>'source' as source,
         updated_at as last_seen
    from public.checkout_sessions
   where not converted and phone is not null
   order by updated_at desc;

grant select on public.report_daily_sales, public.report_product_performance, public.report_sources,
                public.report_funnel_daily, public.report_customers, public.report_abandoned_checkouts to authenticated;
