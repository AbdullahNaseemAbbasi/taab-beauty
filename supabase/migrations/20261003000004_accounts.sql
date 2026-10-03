-- TAAB · customer accounts, admin by user id, private costs, image storage, settings privacy

-- ------------------------------------------------------ settings privacy
-- Only the storefront settings are public; secrets such as the notification
-- topic are readable by admins only.
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (key in ('shipping', 'store'));
revoke execute on function public.ntfy_topic() from public, anon, authenticated;

-- -------------------------------------------------- admins by user id
alter table public.admins add column if not exists user_id uuid unique references auth.users(id) on delete cascade;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.list_admins()
returns table (user_id uuid, email text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.user_id, a.email, a.created_at from public.admins a where public.is_admin() order by a.created_at;
$$;

create or replace function public.grant_admin(p_email text) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid; v_email text;
begin
  if not public.is_admin() then raise exception 'Not authorised.'; end if;
  select id, email into v_id, v_email from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if v_id is null then raise exception 'No account with that email. Ask them to create an account on the website first.'; end if;
  insert into public.admins (email, user_id) values (lower(v_email), v_id)
  on conflict (email) do update set user_id = excluded.user_id;
  return jsonb_build_object('email', v_email, 'user_id', v_id);
end $$;

create or replace function public.revoke_admin(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorised.'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot remove your own admin access.'; end if;
  delete from public.admins where user_id = p_user_id;
end $$;

revoke execute on function public.list_admins(), public.grant_admin(text), public.revoke_admin(uuid) from public, anon;
grant execute on function public.list_admins(), public.grant_admin(text), public.revoke_admin(uuid) to authenticated;

-- -------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  phone      text,
  city       text,
  province   text,
  address    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "read own profile"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
grant select, insert, update on public.profiles to authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone)
  values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ------------------------------------------------- orders linked to users
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_idx on public.orders(user_id);

create or replace function public.my_orders() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.order_to_json(o) order by o.created_at desc), '[]'::jsonb)
    from public.orders o
   where auth.uid() is not null and o.user_id = auth.uid();
$$;
revoke execute on function public.my_orders() from public, anon;
grant execute on function public.my_orders() to authenticated;

-- place_order: same logic as before, now also records the signed-in user.
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
  v_cod          boolean := true;
  v_bank         boolean := true;
  v_card         boolean := false;
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

  select coalesce((value->>'cod_enabled')::boolean, true), coalesce((value->>'bank_transfer_enabled')::boolean, true), coalesce((value->>'card_enabled')::boolean, false)
    into v_cod, v_bank, v_card from public.settings where key = 'store';
  if (v_payment = 'cod' and not v_cod) or (v_payment = 'bank' and not v_bank) or (v_payment = 'card' and not v_card) then
    raise exception 'That payment method is not available right now.';
  end if;

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
      if v_product.variants is not null and jsonb_array_length(coalesce(v_product.variants->'options', '[]'::jsonb)) > 0 then
        raise exception 'Please choose a shade for %.', v_product.name;
      end if;
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

  select coalesce((value->>'free_shipping_threshold')::int, v_threshold), coalesce((value->>'shipping_fee')::int, v_fee)
    into v_threshold, v_fee from public.settings where key = 'shipping';
  if (v_subtotal - v_discount) >= v_threshold or v_coupon_type = 'shipping' then v_shipping := 0; else v_shipping := v_fee; end if;
  v_total := v_subtotal - v_discount + v_shipping;

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

  insert into public.orders (id, customer_id, user_id, status, payment_method, customer, phone, subtotal, discount, shipping, total,
                             coupon_code, creator_id, notes, attribution, timeline)
  values (v_order_id, v_customer_id, auth.uid(), v_status, v_payment, v_customer || jsonb_build_object('phone', v_phone), v_phone,
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

-- ------------------------------------------------------- private costs
-- Product cost is business-sensitive, so it lives in an admin-only table.
create table if not exists public.product_costs (
  product_id text primary key references public.products(id) on delete cascade,
  cost       int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.product_costs enable row level security;
drop policy if exists "admin manage product costs" on public.product_costs;
create policy "admin manage product costs" on public.product_costs for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.product_costs to authenticated;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'cost') then
    execute 'insert into public.product_costs (product_id, cost) select id, coalesce(cost, 0) from public.products on conflict (product_id) do nothing';
  end if;
end $$;

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
         coalesce(s.revenue, 0) - coalesce(s.units, 0) * coalesce(c.cost, 0) as gross_profit,
         (select count(*) from public.stock_alerts a where a.product_id = p.id and a.notified_at is null) as waiting_for_stock
    from public.products p
    left join sales s on s.sku = p.sku
    left join public.product_costs c on c.product_id = p.id
   order by revenue desc, views desc;

alter table public.products drop column if exists cost;

-- ------------------------------------------ review counts from real reviews
create or replace function public.refresh_product_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_product text := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where product_id = v_product and status = 'approved'), 0),
         review_count = (select count(*) from public.reviews where product_id = v_product and status = 'approved')
   where p.id = v_product;
  return null;
end $$;
drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after update of status, rating or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- -------------------------------------------------------- image storage
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read product images"  on storage.objects;
drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin update product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;
create policy "public read product images"  on storage.objects for select using (bucket_id = 'product-images');
create policy "admin upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin update product images" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
create policy "admin delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());
