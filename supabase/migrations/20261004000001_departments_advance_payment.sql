-- Naz & CO · departments managed in the database, advance payment instead of
-- cash on delivery, store details and payment accounts in settings, realtime.

-- ---------------------------------------------------------------- departments
create table if not exists public.departments (
  id          text primary key,                      -- slug, e.g. 'beauty'
  name        text not null,
  tagline     text,
  description text,
  image       text,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.departments enable row level security;
drop policy if exists "public read departments" on public.departments;
drop policy if exists "admin manage departments" on public.departments;
create policy "public read departments"  on public.departments for select using (active);
create policy "admin manage departments" on public.departments for all using (public.is_admin()) with check (public.is_admin());

insert into public.departments (id, name, tagline, description, sort_order) values
  ('beauty',     'Beauty',     'Makeup, skincare, haircare and fragrance.', 'Makeup, skincare, haircare, fragrance and tools chosen for Pakistani skin tones and Pakistani weather.', 0),
  ('appliances', 'Appliances', 'Gadgets and home essentials that just work.', 'Audio, wearables, chargers, gadgets and kitchen essentials, checked before dispatch.', 1),
  ('clothes',    'Clothes',    'Everyday style for the whole family.', 'Easy, well-made clothing and accessories for women and men.', 2)
on conflict (id) do nothing;

-- Electronics and kitchen now sit under Appliances.
update public.categories set department = 'appliances' where department in ('electronics', 'kitchen');
update public.categories set department = 'beauty' where department not in (select id from public.departments);
alter table public.categories drop constraint if exists categories_department_fkey;
alter table public.categories add constraint categories_department_fkey
  foreign key (department) references public.departments(id) on update cascade;

-- ------------------------------------------------------------------- settings
-- Store details and payment accounts are edited in Admin → Settings and read by the storefront.
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (key in ('shipping', 'store', 'payments', 'contact'));

update public.settings set value = jsonb_set(value - 'cod_enabled' - 'bank_transfer_enabled', '{name}', '"Naz & CO"') where key = 'store';

insert into public.settings (key, value) values
  ('payments', jsonb_build_object(
     'advance_percent', 50,
     'methods', jsonb_build_array(
       jsonb_build_object('id', 'bank',      'label', 'Bank Transfer', 'enabled', true,  'bank', 'Meezan Bank', 'account_title', 'Naz & CO', 'account_number', 'PK00 MEZN 0000 0000 0000 0000'),
       jsonb_build_object('id', 'easypaisa', 'label', 'Easypaisa',     'enabled', false, 'bank', '',            'account_title', '',         'account_number', ''),
       jsonb_build_object('id', 'jazzcash',  'label', 'JazzCash',      'enabled', false, 'bank', '',            'account_title', '',         'account_number', '')
     ))),
  ('contact', jsonb_build_object(
     'phone', '+92 300 1234567', 'whatsapp', '923001234567', 'email', 'hello@nazandco.com',
     'hours', 'Mon to Sat, 10am to 8pm PKT', 'address', 'Suite 4, Bukhari Commercial, DHA Phase 6, Karachi, Pakistan',
     'instagram', 'https://instagram.com/nazandco', 'facebook', 'https://facebook.com/nazandco',
     'tiktok', 'https://tiktok.com/@nazandco', 'youtube', 'https://youtube.com/@nazandco',
     'announcement', 'Free delivery on orders over Rs. 7,000. Pay 50% in advance, the rest on delivery.'))
on conflict (key) do nothing;

-- The house brand follows the new spelling.
insert into public.brands (id, name, tagline, description, featured)
values ('naz-co', 'Naz & CO', 'The house line', 'Our own makeup, tools and everyday essentials.', true)
on conflict (id) do nothing;
update public.products set brand_id = 'naz-co' where brand_id = 'naaz-co';
delete from public.brands where id = 'naaz-co';
delete from public.coupons where code = 'NAAZ500';

-- ------------------------------------------------------------------- payments
-- No cash on delivery: every order is confirmed by an advance payment, and the
-- balance is collected on delivery. 'cod' stays in the check only so that old rows remain valid.
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('bank', 'easypaisa', 'jazzcash', 'card', 'cod'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending', 'advance_paid', 'paid', 'failed', 'refunded'));
alter table public.orders add column if not exists advance_percent int not null default 0;
alter table public.orders add column if not exists advance_amount  int not null default 0;

-- Demo orders from the cash-on-delivery days are re-created by the seed script.
delete from public.orders where id in ('NZ-240912-0148', 'NZ-241001-0211');

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
    'advance', jsonb_build_object('percent', p_order.advance_percent, 'amount', p_order.advance_amount, 'balance', p_order.total - p_order.advance_amount),
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

create or replace function public.place_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_lines        jsonb := p_payload->'lines';
  v_line         jsonb;
  v_customer     jsonb := coalesce(p_payload->'customer', '{}'::jsonb);
  v_phone        text;
  v_payment      text := coalesce(nullif(p_payload->>'payment', ''), 'bank');
  v_payments     jsonb;
  v_method       jsonb;
  v_percent      int := 50;
  v_advance      int;
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

  -- The payment method must be one the store has switched on and given an account for.
  select value into v_payments from public.settings where key = 'payments';
  v_percent := least(100, greatest(0, coalesce((v_payments->>'advance_percent')::int, 50)));
  select m into v_method from jsonb_array_elements(coalesce(v_payments->'methods', '[]'::jsonb)) m
   where m->>'id' = v_payment and coalesce((m->>'enabled')::boolean, false) and length(trim(coalesce(m->>'account_number', ''))) > 0;
  if v_method is null then raise exception 'That payment method is not available right now.'; end if;

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
      if v_variant is null then raise exception 'The selected option of % is not available.', v_product.name; end if;
      v_stock := coalesce((v_variant->>'stock')::int, 0);
      if v_stock < v_qty then raise exception 'Only % left of % (%).', v_stock, v_product.name, v_variant->>'name'; end if;
      update public.products
         set variants = jsonb_set(variants, array['options', v_variant_idx::text, 'stock'], to_jsonb(v_stock - v_qty)),
             stock = greatest(stock - v_qty, 0)
       where id = v_product.id;
    else
      if v_product.variants is not null and jsonb_array_length(coalesce(v_product.variants->'options', '[]'::jsonb)) > 0 then
        raise exception 'Please choose an option for %.', v_product.name;
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
  v_advance := ceil(v_total * v_percent / 100.0)::int;

  loop
    v_order_id := 'NZ-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    exit when not exists (select 1 from public.orders where id = v_order_id);
  end loop;

  -- Orders wait for the advance; an admin confirms them once it arrives.
  v_timeline := jsonb_build_array(jsonb_build_object('status', 'created', 'label', 'Order placed, awaiting advance payment', 'at', now()));

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

  insert into public.orders (id, customer_id, user_id, status, payment_method, payment_status, advance_percent, advance_amount,
                             customer, phone, subtotal, discount, shipping, total,
                             coupon_code, creator_id, notes, attribution, timeline)
  values (v_order_id, v_customer_id, auth.uid(), 'created', v_payment, 'pending', v_percent, v_advance,
          v_customer || jsonb_build_object('phone', v_phone), v_phone,
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

-- Status changes. A payment change is written to the timeline too, so the
-- customer can see when the advance and the balance were received.
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
  v_new     text;
  v_pay     text;
  v_label   text;
  v_item    record;
  v_idx     int;
  v_stock   int;
begin
  if not public.is_admin() then raise exception 'Not authorised.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  v_old := o.status;
  v_new := coalesce(p_status, v_old);

  if p_status is not null and p_status not in ('created','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','failed','returned','refunded') then
    raise exception 'Unknown status %.', p_status;
  end if;
  if p_payment_status is not null and p_payment_status not in ('pending','advance_paid','paid','failed','refunded') then
    raise exception 'Unknown payment status %.', p_payment_status;
  end if;

  -- Delivered means the courier collected the balance; refunded means the money went back.
  v_pay := coalesce(p_payment_status,
             case when v_new = 'delivered' and o.payment_status = 'advance_paid' then 'paid'
                  when v_new = 'refunded' then 'refunded'
                  else o.payment_status end);

  v_label := case
    when p_status is null and p_payment_status = 'advance_paid' then 'Advance payment received'
    when p_status is null and p_payment_status = 'paid' then 'Full payment received'
    when p_status is null and p_payment_status = 'refunded' then 'Payment refunded'
    when p_status is null and p_payment_status = 'pending' then 'Payment marked as pending'
    when p_status is null and p_payment_status = 'failed' then 'Payment failed'
    else case v_new
      when 'created' then 'Order placed'
      when 'confirmed' then case when v_pay in ('advance_paid', 'paid') and o.payment_status = 'pending' then 'Advance received, order confirmed' else 'Order confirmed' end
      when 'processing' then 'Processing'
      when 'packed' then 'Packed'
      when 'shipped' then 'Shipped' || coalesce(' with ' || coalesce(p_courier, o.courier), '')
      when 'out_for_delivery' then 'Out for delivery'
      when 'delivered' then 'Delivered'
      when 'cancelled' then 'Cancelled'
      when 'failed' then 'Payment failed'
      when 'returned' then 'Returned'
      when 'refunded' then 'Refunded'
      else v_new end
  end;

  update public.orders set
    status = v_new,
    courier = coalesce(p_courier, courier),
    tracking_code = coalesce(p_tracking, tracking_code),
    payment_status = v_pay,
    timeline = timeline || jsonb_strip_nulls(jsonb_build_object(
      'status', v_new, 'label', v_label, 'at', now(), 'note', p_note,
      'tracking', coalesce(p_tracking, case when v_new = 'shipped' then tracking_code end)
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

-- ------------------------------------------------------------------ reporting
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
    'awaiting_payment', (select count(*) from public.orders where payment_status = 'pending' and status not in ('cancelled','failed','returned','refunded')),
    'advance_collected', (select coalesce(sum(case when payment_status = 'paid' then total else advance_amount end), 0) from public.orders
                           where created_at >= since and payment_status in ('advance_paid','paid') and status not in ('cancelled','failed','refunded')),
    'balance_due', (select coalesce(sum(total - advance_amount), 0) from public.orders
                     where payment_status = 'advance_paid' and status not in ('cancelled','failed','returned','refunded','delivered')),
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

drop view if exists public.report_daily_sales;
create view public.report_daily_sales with (security_invoker = true) as
  select (created_at at time zone 'Asia/Karachi')::date as day,
         count(*) as orders,
         sum(total) as revenue,
         sum(discount) as discounts,
         sum(shipping) as shipping_collected,
         round(avg(total)) as average_order,
         count(*) filter (where payment_status = 'pending' and status not in ('cancelled','failed')) as awaiting_advance,
         coalesce(sum(case when payment_status = 'paid' then total when payment_status = 'advance_paid' then advance_amount else 0 end), 0) as payments_received,
         count(*) filter (where status = 'delivered') as delivered,
         count(*) filter (where status in ('cancelled','failed','returned','refunded')) as lost
    from public.orders
   group by 1
   order by 1 desc;

-- -------------------------------------------------------------- notifications
create or replace function public.notify_new_order() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_topic text;
  v_base  text;
  v_items text;
  v_body  text;
  v_payload jsonb;
begin
  select nullif(value->>'ntfy_topic', ''), nullif(rtrim(value->>'admin_url', '/'), '')
    into v_topic, v_base from public.settings where key = 'notifications';
  if v_topic is null then return new; end if;

  select string_agg(quantity || ' × ' || name || coalesce(' (' || variant_name || ')', ''), E'\n' order by id)
    into v_items from public.order_items where order_id = new.id;
  v_body := format(E'Rs. %s · %s\nAdvance due: Rs. %s (%s%%)\n%s\n%s, %s\n%s\n\n%s',
    to_char(new.total, 'FM999,999,999'),
    case new.payment_method when 'bank' then 'Bank transfer' when 'easypaisa' then 'Easypaisa' when 'jazzcash' then 'JazzCash' when 'card' then 'Card' else new.payment_method end,
    to_char(new.advance_amount, 'FM999,999,999'), new.advance_percent,
    coalesce(new.customer->>'name', ''),
    coalesce(new.customer->>'city', ''), coalesce(new.phone, ''),
    coalesce(new.customer->>'address', ''),
    coalesce(v_items, ''));

  v_payload := jsonb_build_object(
    'topic', v_topic,
    'title', 'New order ' || new.id,
    'message', v_body,
    'priority', 4,
    'tags', jsonb_build_array('shopping_bags')
  );
  if v_base is not null then
    v_payload := v_payload || jsonb_build_object('click', v_base || '/admin/orders?order=' || new.id);
  end if;

  perform net.http_post(url := 'https://ntfy.sh', body := v_payload, headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
exception when others then
  return new; -- notifications must never block an order
end $$;

-- ------------------------------------------------------------------- realtime
-- The storefront and the admin panel refresh themselves when these tables change.
do $$
declare t text;
begin
  foreach t in array array['products','categories','departments','brands','settings','orders','reviews','contact_messages'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
