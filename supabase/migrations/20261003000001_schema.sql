-- TAAB · initial schema
-- Catalogue, reviews, content, coupons, customers, orders, analytics events.
-- Public (anon) access is read-only on the catalogue and insert-only on
-- events/forms/reviews; orders go through SECURITY DEFINER functions so
-- prices, stock and coupons are always validated server-side.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- settings
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------- catalogue
create table if not exists public.categories (
  id            text primary key,              -- slug, e.g. 'makeup'
  name          text not null,
  tagline       text,
  description   text,
  image         text,
  subcategories text[] not null default '{}',
  sort_order    int  not null default 0,
  active        boolean not null default true
);

create table if not exists public.brands (
  id          text primary key,
  name        text not null unique,
  tagline     text,
  description text,
  featured    boolean not null default false,
  active      boolean not null default true
);

create table if not exists public.concerns (
  id          text primary key,
  name        text not null,
  description text,
  image       text,
  sort_order  int not null default 0
);

create table if not exists public.products (
  id                  text primary key,
  sku                 text not null unique,
  name                text not null,
  slug                text not null unique,
  brand_id            text references public.brands(id),
  category_id         text references public.categories(id),
  subcategory         text,
  price               int  not null check (price >= 0),
  compare_at_price    int  check (compare_at_price is null or compare_at_price > price),
  cost                int,                              -- for profit reporting
  images              text[] not null default '{}',
  description         text,
  benefits            text[] not null default '{}',
  ingredients         text[] not null default '{}',
  how_to_use          text,
  size                text,
  stock               int  not null default 0 check (stock >= 0),
  low_stock_threshold int  not null default 5,
  rating              numeric(2,1) not null default 0,
  review_count        int  not null default 0,
  tags                text[] not null default '{}',
  concerns            text[] not null default '{}',
  variants            jsonb,                            -- {label, options:[{id,name,hex,stock}]}
  featured            boolean not null default false,
  best_seller         boolean not null default false,
  new_arrival         boolean not null default false,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id) where active;
create index if not exists products_flags_idx on public.products(featured, best_seller, new_arrival) where active;

create table if not exists public.reviews (
  id         text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
  order_id   text,
  author     text not null,
  city       text,
  rating     int  not null check (rating between 1 and 5),
  title      text,
  body       text not null,
  photo      text,
  verified   boolean not null default false,
  helpful    int not null default 0,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews(product_id) where status = 'approved';

-- ----------------------------------------------------------------- content
create table if not exists public.articles (
  slug         text primary key,
  title        text not null,
  excerpt      text,
  topic        text,
  author       text,
  published_at date not null default current_date,
  read_time    int  not null default 4,
  image        text,
  content      jsonb not null default '[]',
  active       boolean not null default true
);

create table if not exists public.faqs (
  id         serial primary key,
  category   text not null,
  question   text not null,
  answer     text not null,
  sort_order int not null default 0,
  active     boolean not null default true
);

-- ----------------------------------------------------------------- coupons
create table if not exists public.coupons (
  code        text primary key,
  type        text not null check (type in ('percent','fixed','shipping')),
  value       int  not null default 0,
  min_order   int  not null default 0,
  description text,
  creator_id  text,                       -- attribution for creator / affiliate codes
  active      boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  usage_limit int,
  used_count  int not null default 0
);

-- --------------------------------------------------------------- customers
create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  phone          text not null unique,     -- digits only
  name           text,
  email          text,
  city           text,
  orders_count   int not null default 0,
  total_spent    int not null default 0,
  first_order_at timestamptz,
  last_order_at  timestamptz,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------------ orders
create table if not exists public.orders (
  id             text primary key,                      -- TB-YYMMDD-NNNN
  customer_id    uuid references public.customers(id),
  status         text not null default 'created'
                 check (status in ('created','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','failed','returned','refunded')),
  payment_method text not null check (payment_method in ('cod','bank','card')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  customer       jsonb not null,                        -- snapshot of the delivery details
  phone          text not null,                         -- digits only, for lookups
  subtotal       int not null,
  discount       int not null default 0,
  shipping       int not null default 0,
  total          int not null,
  coupon_code    text,
  creator_id     text,
  notes          text,
  attribution    jsonb,                                 -- first/last touch, session, device
  timeline       jsonb not null default '[]',
  courier        text,
  tracking_code  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_phone_idx on public.orders(phone);
create index if not exists orders_created_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id           bigserial primary key,
  order_id     text not null references public.orders(id) on delete cascade,
  product_id   text references public.products(id),
  sku          text,
  name         text not null,
  slug         text,
  variant_id   text,
  variant_name text,
  quantity     int not null check (quantity > 0),
  unit_price   int not null,
  line_total   int not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- --------------------------------------------------------------- analytics
create table if not exists public.events (
  id          bigserial primary key,
  event       text not null,
  session_id  text,
  page_path   text,
  source      text,
  campaign    text,
  ad_content  text,
  creator_ref text,
  device      text,
  value       numeric,
  currency    text,
  items       jsonb,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists events_event_idx on public.events(event, created_at desc);
create index if not exists events_session_idx on public.events(session_id);

create table if not exists public.newsletter_subscribers (
  id         bigserial primary key,
  email      text not null unique,
  source     text,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id         bigserial primary key,
  name       text not null,
  email      text not null,
  phone      text,
  topic      text,
  message    text not null,
  status     text not null default 'new' check (status in ('new','replied','closed')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

-- Reviews submitted by the public always start as pending and unverified.
create or replace function public.reviews_force_pending() returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), 'anon') in ('anon', 'authenticated') then
    new.status := 'pending';
    new.verified := false;
    new.helpful := 0;
  end if;
  return new;
end $$;
drop trigger if exists reviews_force_pending on public.reviews;
create trigger reviews_force_pending before insert on public.reviews for each row execute function public.reviews_force_pending();

-- Low-stock report for the future admin dashboard.
create or replace view public.low_stock_products as
  select id, sku, name, stock, low_stock_threshold
  from public.products
  where active and stock <= low_stock_threshold;

-- ------------------------------------------------------------ coupon check
create or replace function public.validate_coupon(p_code text, p_subtotal int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.coupons%rowtype;
  v_discount int := 0;
begin
  select * into c from public.coupons
   where upper(code) = upper(trim(coalesce(p_code, '')))
     and active
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at >= now())
     and (usage_limit is null or used_count < usage_limit);
  if not found then
    return jsonb_build_object('valid', false, 'error', 'That code is not valid.');
  end if;
  if p_subtotal < c.min_order then
    return jsonb_build_object('valid', false, 'error', format('This code needs a minimum order of Rs. %s.', to_char(c.min_order, 'FM999,999')));
  end if;
  if c.type = 'percent' then v_discount := round(p_subtotal * c.value / 100.0);
  elsif c.type = 'fixed' then v_discount := least(c.value, p_subtotal);
  end if;
  return jsonb_build_object(
    'valid', true, 'code', c.code, 'type', c.type, 'value', c.value,
    'minOrder', c.min_order, 'description', c.description, 'creatorId', c.creator_id, 'discount', v_discount
  );
end $$;

-- ----------------------------------------------------------- order lookup
create or replace function public.order_to_json(p_order public.orders)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', p_order.id,
    'placedAt', p_order.created_at,
    'status', p_order.status,
    'payment', p_order.payment_method,
    'paymentStatus', p_order.payment_status,
    'customer', p_order.customer,
    'phone', p_order.phone,
    'notes', p_order.notes,
    'coupon', case when p_order.coupon_code is null then null else jsonb_build_object('code', p_order.coupon_code, 'creatorId', p_order.creator_id) end,
    'totals', jsonb_build_object('subtotal', p_order.subtotal, 'discount', p_order.discount, 'shipping', p_order.shipping, 'total', p_order.total),
    'timeline', p_order.timeline,
    'courier', p_order.courier,
    'trackingCode', p_order.tracking_code,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id, 'sku', i.sku, 'name', i.name, 'slug', i.slug,
        'variantId', i.variant_id, 'variant', i.variant_name,
        'quantity', i.quantity, 'unitPrice', i.unit_price, 'lineTotal', i.line_total
      ) order by i.id)
      from public.order_items i where i.order_id = p_order.id
    ), '[]'::jsonb)
  );
$$;

create or replace function public.get_order(p_order_id text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
begin
  if length(v_phone) < 10 then return null; end if;
  select * into o from public.orders where id = upper(trim(coalesce(p_order_id, ''))) and right(phone, 10) = v_phone;
  if not found then return null; end if;
  return public.order_to_json(o);
end $$;

-- ------------------------------------------------------------ place order
create or replace function public.place_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_lines        jsonb := p_payload->'lines';
  v_line         jsonb;
  v_customer     jsonb := coalesce(p_payload->'customer', '{}'::jsonb);
  v_phone        text;
  v_payment      text := coalesce(p_payload->>'payment', 'cod');
  v_coupon_code  text := nullif(upper(trim(coalesce(p_payload->>'couponCode', ''))), '');
  v_coupon       public.coupons%rowtype;
  v_coupon_type  text;
  v_creator      text;
  v_product      public.products%rowtype;
  v_variant      jsonb;
  v_variant_id   text;
  v_variant_idx  int;
  v_qty          int;
  v_stock        int;
  v_subtotal     int := 0;
  v_discount     int := 0;
  v_shipping     int := 0;
  v_threshold    int := 7000;
  v_fee          int := 250;
  v_total        int;
  v_items        jsonb := '[]'::jsonb;
  v_item         jsonb;
  v_order_id     text;
  v_status       text;
  v_timeline     jsonb;
  v_customer_id  uuid;
  o              public.orders%rowtype;
begin
  if v_lines is null or jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then
    raise exception 'Your bag is empty.';
  end if;
  v_phone := regexp_replace(coalesce(v_customer->>'phone', ''), '\D', '', 'g');
  if length(v_phone) < 10 then raise exception 'A valid Pakistani mobile number is required.'; end if;
  if length(coalesce(v_customer->>'name', '')) < 3 then raise exception 'Please enter your full name.'; end if;
  if length(coalesce(v_customer->>'address', '')) < 10 then raise exception 'Please enter your complete street address.'; end if;
  if v_payment not in ('cod', 'bank', 'card') then raise exception 'Unknown payment method.'; end if;

  -- Price every line from the database and reserve stock.
  for v_line in select * from jsonb_array_elements(v_lines) loop
    v_qty := greatest(1, coalesce((v_line->>'quantity')::int, 1));
    v_variant_id := nullif(v_line->>'variantId', '');
    v_variant := null;
    select * into v_product from public.products where id = v_line->>'productId' and active for update;
    if not found then raise exception 'One of the products in your bag is no longer available.'; end if;

    if v_variant_id is not null then
      select opt, (ord - 1)::int into v_variant, v_variant_idx
        from jsonb_array_elements(coalesce(v_product.variants->'options', '[]'::jsonb)) with ordinality as t(opt, ord)
       where opt->>'id' = v_variant_id;
      if v_variant is null then raise exception 'The selected shade of % is not available.', v_product.name; end if;
      v_stock := coalesce((v_variant->>'stock')::int, 0);
      if v_stock < v_qty then raise exception 'Only % left of % (%).', v_stock, v_product.name, v_variant->>'name'; end if;
      update public.products
         set variants = jsonb_set(variants, array['options', v_variant_idx::text, 'stock'], to_jsonb(v_stock - v_qty)),
             stock = greatest(stock - v_qty, 0)
       where id = v_product.id;
    else
      if v_product.stock < v_qty then raise exception 'Only % left of %.', v_product.stock, v_product.name; end if;
      update public.products set stock = stock - v_qty where id = v_product.id;
    end if;

    v_subtotal := v_subtotal + v_product.price * v_qty;
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id, 'sku', v_product.sku, 'name', v_product.name, 'slug', v_product.slug,
      'variant_id', v_variant_id, 'variant_name', v_variant->>'name',
      'quantity', v_qty, 'unit_price', v_product.price, 'line_total', v_product.price * v_qty
    );
  end loop;

  -- Coupon.
  if v_coupon_code is not null then
    select * into v_coupon from public.coupons
     where upper(code) = v_coupon_code and active
       and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
       and (usage_limit is null or used_count < usage_limit);
    if not found then raise exception 'That discount code is not valid.'; end if;
    if v_subtotal < v_coupon.min_order then raise exception 'This code needs a minimum order of Rs. %.', v_coupon.min_order; end if;
    v_coupon_type := v_coupon.type;
    v_creator := v_coupon.creator_id;
    if v_coupon_type = 'percent' then v_discount := round(v_subtotal * v_coupon.value / 100.0);
    elsif v_coupon_type = 'fixed' then v_discount := least(v_coupon.value, v_subtotal);
    end if;
    update public.coupons set used_count = used_count + 1 where code = v_coupon.code;
  end if;

  -- Shipping from settings.
  select coalesce((value->>'free_shipping_threshold')::int, v_threshold), coalesce((value->>'shipping_fee')::int, v_fee)
    into v_threshold, v_fee from public.settings where key = 'shipping';
  if (v_subtotal - v_discount) >= v_threshold or v_coupon_type = 'shipping' then v_shipping := 0; else v_shipping := v_fee; end if;
  v_total := v_subtotal - v_discount + v_shipping;

  -- Unique, human-friendly order id.
  loop
    v_order_id := 'TB-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    exit when not exists (select 1 from public.orders where id = v_order_id);
  end loop;

  v_status := case when v_payment = 'cod' then 'confirmed' else 'created' end;
  v_timeline := jsonb_build_array(jsonb_build_object('status', 'created', 'label', 'Order placed', 'at', now()));
  if v_payment = 'cod' then
    v_timeline := v_timeline || jsonb_build_object('status', 'confirmed', 'label', 'Order confirmed (cash on delivery)', 'at', now());
  end if;

  insert into public.customers (phone, name, email, city, orders_count, total_spent, first_order_at, last_order_at)
  values (v_phone, v_customer->>'name', nullif(v_customer->>'email', ''), v_customer->>'city', 1, v_total, now(), now())
  on conflict (phone) do update
     set name = excluded.name,
         email = coalesce(excluded.email, public.customers.email),
         city = coalesce(excluded.city, public.customers.city),
         orders_count = public.customers.orders_count + 1,
         total_spent = public.customers.total_spent + excluded.total_spent,
         last_order_at = now()
  returning id into v_customer_id;

  insert into public.orders (id, customer_id, status, payment_method, customer, phone, subtotal, discount, shipping, total,
                             coupon_code, creator_id, notes, attribution, timeline)
  values (v_order_id, v_customer_id, v_status, v_payment, v_customer || jsonb_build_object('phone', v_phone), v_phone,
          v_subtotal, v_discount, v_shipping, v_total, v_coupon_code, v_creator, nullif(p_payload->>'notes', ''),
          p_payload->'attribution', v_timeline);

  for v_item in select * from jsonb_array_elements(v_items) loop
    insert into public.order_items (order_id, product_id, sku, name, slug, variant_id, variant_name, quantity, unit_price, line_total)
    values (v_order_id, v_item->>'product_id', v_item->>'sku', v_item->>'name', v_item->>'slug', v_item->>'variant_id', v_item->>'variant_name',
            (v_item->>'quantity')::int, (v_item->>'unit_price')::int, (v_item->>'line_total')::int);
  end loop;

  select * into o from public.orders where id = v_order_id;
  return public.order_to_json(o);
end $$;

-- ------------------------------------------------------------------ RLS
alter table public.settings               enable row level security;
alter table public.categories             enable row level security;
alter table public.brands                 enable row level security;
alter table public.concerns               enable row level security;
alter table public.products               enable row level security;
alter table public.reviews                enable row level security;
alter table public.articles               enable row level security;
alter table public.faqs                   enable row level security;
alter table public.coupons                enable row level security;
alter table public.customers              enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.events                 enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages       enable row level security;

drop policy if exists "public read settings"   on public.settings;
drop policy if exists "public read categories" on public.categories;
drop policy if exists "public read brands"     on public.brands;
drop policy if exists "public read concerns"   on public.concerns;
drop policy if exists "public read products"   on public.products;
drop policy if exists "public read reviews"    on public.reviews;
drop policy if exists "public add review"      on public.reviews;
drop policy if exists "public read articles"   on public.articles;
drop policy if exists "public read faqs"       on public.faqs;
drop policy if exists "public add event"       on public.events;
drop policy if exists "public subscribe"       on public.newsletter_subscribers;
drop policy if exists "public contact"         on public.contact_messages;

create policy "public read settings"   on public.settings   for select using (true);
create policy "public read categories" on public.categories for select using (active);
create policy "public read brands"     on public.brands     for select using (active);
create policy "public read concerns"   on public.concerns   for select using (true);
create policy "public read products"   on public.products   for select using (active);
create policy "public read reviews"    on public.reviews    for select using (status = 'approved');
create policy "public add review"      on public.reviews    for insert with check (true);
create policy "public read articles"   on public.articles   for select using (active);
create policy "public read faqs"       on public.faqs       for select using (active);
create policy "public add event"       on public.events     for insert with check (true);
create policy "public subscribe"       on public.newsletter_subscribers for insert with check (true);
create policy "public contact"         on public.contact_messages      for insert with check (true);
-- coupons, customers, orders, order_items: no public policies; only the functions above touch them.

grant usage on schema public to anon, authenticated;
grant select on public.settings, public.categories, public.brands, public.concerns, public.products, public.reviews, public.articles, public.faqs to anon, authenticated;
grant insert on public.reviews, public.events, public.newsletter_subscribers, public.contact_messages to anon, authenticated;
grant usage, select on sequence public.events_id_seq, public.newsletter_subscribers_id_seq, public.contact_messages_id_seq to anon, authenticated;
grant execute on function public.validate_coupon(text, int), public.get_order(text, text), public.place_order(jsonb) to anon, authenticated;
revoke all on public.low_stock_products from anon, authenticated;

insert into public.settings (key, value) values
  ('shipping', '{"free_shipping_threshold": 7000, "shipping_fee": 250, "estimated_days": "2 to 4 business days"}'),
  ('store', '{"name": "TAAB", "currency": "PKR", "cod_enabled": true, "bank_transfer_enabled": true, "card_enabled": false}')
on conflict (key) do nothing;
