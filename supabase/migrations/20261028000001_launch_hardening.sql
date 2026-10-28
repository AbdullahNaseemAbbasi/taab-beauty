-- Naz & CO · launch hardening.
-- Owner role, stock held by an order and released exactly once, auto-cancel of
-- unpaid orders, stricter order limits, notifications without customer details,
-- throttled order lookups, narrower public inserts, storage limits and indexes.

-- ------------------------------------------------------------------- helpers
-- Whole numbers from settings; anything else falls back to the default.
create or replace function public.setting_int(p_value text, p_default int) returns int
language sql immutable set search_path = public as $$
  select case when trim(coalesce(p_value, '')) ~ '^-?\d{1,9}$' then trim(p_value)::int else p_default end;
$$;

-- A short fingerprint of the caller's IP (from the API gateway), used only for rate limits.
create or replace function public.request_ip_hash() returns text
language plpgsql stable security definer set search_path = public as $$
declare v_ip text;
begin
  v_ip := trim(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1));
  if v_ip = '' then return null; end if;
  return md5('naz-ip:' || v_ip);
exception when others then
  return null;
end $$;
revoke execute on function public.request_ip_hash() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = public;

-- ---------------------------------------------------------------- owner role
-- One owner runs the store; staff can do everything except manage the team,
-- payment accounts and notification settings.
alter table public.admins add column if not exists role text not null default 'staff';
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('owner', 'staff'));
update public.admins set role = 'owner'
 where user_id = (select user_id from public.admins where user_id is not null order by created_at limit 1)
   and not exists (select 1 from public.admins where role = 'owner');
create unique index if not exists admins_single_owner on public.admins (role) where role = 'owner';

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.admins where user_id = auth.uid() and role = 'owner');
$$;
revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

drop function if exists public.list_admins();
create function public.list_admins()
returns table (user_id uuid, email text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select a.user_id, a.email, a.role, a.created_at, u.last_sign_in_at
    from public.admins a left join auth.users u on u.id = a.user_id
   where public.is_admin()
   order by a.role = 'owner' desc, a.created_at;
$$;

create or replace function public.grant_admin(p_email text) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid; v_email text;
begin
  if not public.is_owner() then raise exception 'Only the store owner can manage the team.'; end if;
  select id, email into v_id, v_email from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if v_id is null then raise exception 'No account with that email. Ask them to create an account on the website first.'; end if;
  if exists (select 1 from public.admins where user_id = v_id) then raise exception 'That account already has admin access.'; end if;
  insert into public.admins (email, user_id, role) values (lower(v_email), v_id, 'staff')
  on conflict (email) do update set user_id = excluded.user_id, role = 'staff';
  return jsonb_build_object('email', lower(v_email), 'user_id', v_id, 'role', 'staff');
end $$;

drop function if exists public.revoke_admin(uuid);
create function public.revoke_admin(p_user_id uuid default null, p_email text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_row public.admins%rowtype;
begin
  if not public.is_owner() then raise exception 'Only the store owner can manage the team.'; end if;
  if p_user_id is not null then
    select * into v_row from public.admins where user_id = p_user_id;
  else
    select * into v_row from public.admins where email = lower(trim(coalesce(p_email, '')));
  end if;
  if not found then raise exception 'That person is not on the team.'; end if;
  if v_row.user_id = auth.uid() then raise exception 'You cannot remove your own admin access.'; end if;
  if v_row.role = 'owner' then raise exception 'The store owner cannot be removed.'; end if;
  delete from public.admins where email = v_row.email;
end $$;

revoke execute on function public.list_admins(), public.grant_admin(text), public.revoke_admin(uuid, text) from public, anon;
grant execute on function public.list_admins(), public.grant_admin(text), public.revoke_admin(uuid, text) to authenticated;

-- Payment accounts and notification settings belong to the owner.
drop policy if exists "admin manage settings" on public.settings;
drop policy if exists "admin read settings"   on public.settings;
drop policy if exists "admin add settings"    on public.settings;
drop policy if exists "admin change settings" on public.settings;
drop policy if exists "owner remove settings" on public.settings;
create policy "admin read settings"   on public.settings for select using (public.is_admin());
create policy "admin add settings"    on public.settings for insert
  with check (public.is_admin() and (key not in ('payments', 'notifications') or public.is_owner()));
create policy "admin change settings" on public.settings for update
  using (public.is_admin() and (key not in ('payments', 'notifications') or public.is_owner()))
  with check (public.is_admin() and (key not in ('payments', 'notifications') or public.is_owner()));
create policy "owner remove settings" on public.settings for delete using (public.is_owner());

-- ------------------------------------------------------- stock held by orders
-- An order holds its stock, its coupon use and its share of the customer's
-- totals until it is cancelled, returned, refunded or fails. They are released
-- once, and taken again if the order is reopened.
alter table public.orders add column if not exists stock_held boolean not null default true;
alter table public.orders add column if not exists ip_hash text;
update public.orders set stock_held = false where status in ('cancelled', 'returned') and stock_held;

create or replace function public.order_move_stock(p_order_id text, p_take boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_item    record;
  v_product public.products%rowtype;
  v_idx     int;
  v_stock   int;
  v_sign    int := case when p_take then -1 else 1 end;
begin
  for v_item in select * from public.order_items where order_id = p_order_id order by product_id, id loop
    select * into v_product from public.products where id = v_item.product_id for update;
    if not found then continue; end if;
    v_idx := null;
    if v_item.variant_id is not null then
      select (ord - 1)::int, coalesce((opt->>'stock')::int, 0) into v_idx, v_stock
        from jsonb_array_elements(coalesce(v_product.variants->'options', '[]'::jsonb)) with ordinality as t(opt, ord)
       where opt->>'id' = v_item.variant_id;
    end if;
    if v_idx is not null then
      if p_take and v_stock < v_item.quantity then
        raise exception 'Not enough stock to reopen this order: % (%).', v_item.name, coalesce(v_item.variant_name, v_item.variant_id);
      end if;
      update public.products
         set variants = jsonb_set(variants, array['options', v_idx::text, 'stock'], to_jsonb(v_stock + v_sign * v_item.quantity)),
             stock = greatest(stock + v_sign * v_item.quantity, 0)
       where id = v_product.id;
    else
      if p_take and v_product.stock < v_item.quantity then
        raise exception 'Not enough stock to reopen this order: %.', v_item.name;
      end if;
      update public.products set stock = greatest(stock + v_sign * v_item.quantity, 0) where id = v_product.id;
    end if;
  end loop;
end $$;

create or replace function public.order_set_held(p_order public.orders, p_hold boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_sign int := case when p_hold then 1 else -1 end;
begin
  if p_order.stock_held = p_hold then return; end if;
  perform public.order_move_stock(p_order.id, p_hold);
  if p_order.coupon_code is not null then
    update public.coupons set used_count = greatest(used_count + v_sign, 0) where upper(code) = upper(p_order.coupon_code);
  end if;
  if p_order.customer_id is not null then
    update public.customers
       set orders_count = greatest(orders_count + v_sign, 0),
           total_spent = greatest(total_spent + v_sign * p_order.total, 0)
     where id = p_order.customer_id;
  end if;
  update public.orders set stock_held = p_hold where id = p_order.id;
end $$;
revoke execute on function public.order_move_stock(text, boolean), public.order_set_held(public.orders, boolean) from public, anon, authenticated;

-- Status changes. Any move is allowed; stock and totals follow the rules above,
-- and a call that changes nothing leaves the timeline alone.
create or replace function public.update_order_status(
  p_order_id text,
  p_status text,
  p_note text default null,
  p_courier text default null,
  p_tracking text default null,
  p_payment_status text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o          public.orders%rowtype;
  v_old      text;
  v_new      text;
  v_pay      text;
  v_label    text;
  v_note     text := nullif(trim(coalesce(p_note, '')), '');
  v_courier  text;
  v_tracking text;
  v_released constant text[] := array['cancelled', 'returned', 'refunded', 'failed'];
begin
  if not public.is_admin() then raise exception 'Not authorised.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;

  if p_status is not null and p_status not in ('created','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','failed','returned','refunded') then
    raise exception 'Unknown status %.', p_status;
  end if;
  if p_payment_status is not null and p_payment_status not in ('pending','advance_paid','paid','failed','refunded') then
    raise exception 'Unknown payment status %.', p_payment_status;
  end if;

  v_old := o.status;
  v_new := coalesce(p_status, v_old);
  -- Delivered means the courier collected the balance; refunded means the money went back.
  v_pay := coalesce(p_payment_status,
             case when v_new = 'delivered' and v_old <> 'delivered' and o.payment_status = 'advance_paid' then 'paid'
                  when v_new = 'refunded' then 'refunded'
                  else o.payment_status end);
  -- '' clears the courier or tracking number, null keeps it.
  v_courier  := case when p_courier is null then o.courier else nullif(trim(p_courier), '') end;
  v_tracking := case when p_tracking is null then o.tracking_code else nullif(trim(p_tracking), '') end;

  if v_new = v_old and v_pay = o.payment_status and v_note is null
     and v_courier is not distinct from o.courier and v_tracking is not distinct from o.tracking_code then
    return public.order_to_json(o);
  end if;

  if v_new = any(v_released) and o.stock_held then
    perform public.order_set_held(o, false);
  elsif not (v_new = any(v_released)) and not o.stock_held then
    perform public.order_set_held(o, true);
  end if;

  v_label := case
    when v_new = v_old and v_pay <> o.payment_status then case v_pay
      when 'advance_paid' then 'Advance payment received'
      when 'paid' then 'Full payment received'
      when 'refunded' then 'Payment refunded'
      when 'pending' then 'Payment marked as pending'
      when 'failed' then 'Payment failed'
      else 'Payment updated' end
    else case v_new
      when 'created' then 'Awaiting advance payment'
      when 'confirmed' then case when v_pay in ('advance_paid', 'paid') and o.payment_status = 'pending' then 'Advance received, order confirmed' else 'Order confirmed' end
      when 'processing' then 'Processing'
      when 'packed' then 'Packed'
      when 'shipped' then 'Shipped' || coalesce(' with ' || v_courier, '')
      when 'out_for_delivery' then 'Out for delivery'
      when 'delivered' then 'Delivered'
      when 'cancelled' then 'Cancelled'
      when 'failed' then 'Payment failed'
      when 'returned' then 'Returned'
      when 'refunded' then 'Refunded'
      else v_new end
  end;
  if v_old = any(v_released) and not (v_new = any(v_released)) then
    v_label := 'Order reopened: ' || v_label;
  end if;

  update public.orders set
    status = v_new,
    courier = v_courier,
    tracking_code = v_tracking,
    payment_status = v_pay,
    timeline = timeline || jsonb_strip_nulls(jsonb_build_object(
      'status', v_new, 'label', v_label, 'at', now(), 'note', v_note,
      'tracking', case when p_tracking is not null or v_new = 'shipped' then v_tracking end
    ))
  where id = p_order_id
  returning * into o;

  return public.order_to_json(o);
end $$;

-- ---------------------------------------------------- unpaid order auto-cancel
-- Orders still waiting for the advance after payments.hold_hours (default 48)
-- are cancelled and their stock goes back on the shelf.
update public.settings set value = value || '{"hold_hours": 48}'::jsonb
 where key = 'payments' and not (value ? 'hold_hours');

create or replace function public.cancel_unpaid_orders() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_hours int;
  v_count int := 0;
  o       public.orders%rowtype;
begin
  select least(168, greatest(12, public.setting_int(value->>'hold_hours', 48))) into v_hours from public.settings where key = 'payments';
  v_hours := coalesce(v_hours, 48);
  for o in select * from public.orders
            where status = 'created' and payment_status = 'pending'
              and created_at < now() - make_interval(hours => v_hours)
            order by created_at
            for update skip locked loop
    perform public.order_set_held(o, false);
    update public.orders
       set status = 'cancelled',
           timeline = timeline || jsonb_build_object('status', 'cancelled', 'label', 'Cancelled: advance not received in time', 'at', now())
     where id = o.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke execute on function public.cancel_unpaid_orders() from public, anon, authenticated;

-- ------------------------------------------------------------ order lookups
create table if not exists public.order_lookups (
  id      bigserial primary key,
  ip_hash text not null,
  at      timestamptz not null default now()
);
create index if not exists order_lookups_ip_idx on public.order_lookups (ip_hash, at desc);
alter table public.order_lookups enable row level security;
revoke all on public.order_lookups from anon, authenticated;

-- Track-order lookup: the order number and the phone must both match, and
-- repeated misses from one connection are slowed down.
create or replace function public.get_order(p_order_id text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o       public.orders%rowtype;
  v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  v_ip    text := public.request_ip_hash();
begin
  if v_ip is not null and (select count(*) from public.order_lookups where ip_hash = v_ip and at > now() - interval '15 minutes') >= 15 then
    raise exception 'Too many attempts. Please wait 15 minutes and try again.';
  end if;
  if length(v_phone) < 10 then return null; end if;
  select * into o from public.orders where id = upper(trim(coalesce(p_order_id, ''))) and right(phone, 10) = v_phone;
  if not found then
    if v_ip is not null then insert into public.order_lookups (ip_hash) values (v_ip); end if;
    return null;
  end if;
  return public.order_to_json(o);
end $$;
grant execute on function public.get_order(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- place order
-- Prices, stock, coupon and delivery fee are worked out here, never trusted from the browser.
create or replace function public.place_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_lines        jsonb := p_payload->'lines';
  v_line         jsonb;
  v_customer     jsonb := coalesce(p_payload->'customer', '{}'::jsonb);
  v_phone        text;
  v_payment      text := coalesce(nullif(p_payload->>'payment', ''), 'bank');
  v_payments     jsonb;
  v_shipping_cfg jsonb;
  v_method       jsonb;
  v_percent      int;
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
  v_threshold    int;
  v_fee          int;
  v_total        int;
  v_items        jsonb := '[]'::jsonb;
  v_item         jsonb;
  v_order_id     text;
  v_timeline     jsonb;
  v_customer_id  uuid;
  o              public.orders%rowtype;
begin
  -- Release stock held by long-unpaid orders first (the scheduled job does this too).
  begin
    perform public.cancel_unpaid_orders();
  exception when others then
    null;
  end;

  if v_lines is null or jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then
    raise exception 'Your bag is empty.';
  end if;
  if jsonb_array_length(v_lines) > 20 then raise exception 'Please place orders of up to 20 different items, or contact us for bigger orders.'; end if;
  if jsonb_typeof(v_customer) <> 'object' or octet_length(v_customer::text) > 2000
     or octet_length(coalesce(p_payload->>'notes', '')) > 1000 or octet_length(coalesce(p_payload->'attribution', 'null'::jsonb)::text) > 4000 then
    raise exception 'Some of the order details are too long.';
  end if;

  -- Pakistani mobile numbers only, stored as 03xxxxxxxxx.
  v_phone := regexp_replace(coalesce(v_customer->>'phone', ''), '\D', '', 'g');
  v_phone := case
    when v_phone ~ '^03\d{9}$' then v_phone
    when v_phone ~ '^923\d{9}$' then '0' || substr(v_phone, 3)
    when v_phone ~ '^00923\d{9}$' then '0' || substr(v_phone, 5)
    when v_phone ~ '^3\d{9}$' then '0' || v_phone
    else null end;
  if v_phone is null then raise exception 'Please enter a Pakistani mobile number, like 0300 1234567.'; end if;
  if length(trim(coalesce(v_customer->>'name', ''))) < 3 then raise exception 'Please enter your full name.'; end if;
  if length(trim(coalesce(v_customer->>'address', ''))) < 10 then raise exception 'Please enter your complete street address.'; end if;

  -- The payment method must be switched on and have a real account number.
  select value into v_payments from public.settings where key = 'payments';
  v_percent := least(100, greatest(0, public.setting_int(v_payments->>'advance_percent', 50)));
  select m into v_method from jsonb_array_elements(coalesce(v_payments->'methods', '[]'::jsonb)) m
   where m->>'id' = v_payment
     and coalesce((m->>'enabled')::boolean, false)
     and length(trim(coalesce(m->>'account_number', ''))) > 0
     and upper(regexp_replace(m->>'account_number', '\s', '', 'g')) !~ '(00000000|1234567|DEMO)';
  if v_method is null then raise exception 'That payment method is not available right now.'; end if;

  -- Lines are locked in a fixed order so two orders for the same items cannot deadlock.
  for v_line in select value from jsonb_array_elements(v_lines) order by value->>'productId', value->>'variantId' loop
    v_qty := public.setting_int(v_line->>'quantity', 1);
    if v_qty < 1 then v_qty := 1; end if;
    if v_qty > 10 then raise exception 'You can order up to 10 of each item. For bigger orders please contact us.'; end if;
    v_variant_id := nullif(v_line->>'variantId', '');
    v_variant := null;
    v_variant_idx := null;
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
       and (usage_limit is null or used_count < usage_limit)
     for update;
    if not found then raise exception 'That discount code is not valid.'; end if;
    if v_subtotal < v_coupon.min_order then raise exception 'This code needs a minimum order of Rs. %.', v_coupon.min_order; end if;
    v_coupon_type := v_coupon.type;
    v_creator := v_coupon.creator_id;
    if v_coupon_type = 'percent' then v_discount := round(v_subtotal * least(greatest(v_coupon.value, 0), 100) / 100.0);
    elsif v_coupon_type = 'fixed' then v_discount := least(greatest(v_coupon.value, 0), v_subtotal);
    end if;
    update public.coupons set used_count = used_count + 1 where code = v_coupon.code;
  end if;

  select value into v_shipping_cfg from public.settings where key = 'shipping';
  v_threshold := public.setting_int(v_shipping_cfg->>'free_shipping_threshold', 7000);
  v_fee := greatest(0, public.setting_int(v_shipping_cfg->>'shipping_fee', 250));
  if (v_subtotal - v_discount) >= v_threshold or v_coupon_type = 'shipping' then v_shipping := 0; else v_shipping := v_fee; end if;
  v_total := greatest(v_subtotal - v_discount + v_shipping, 0);
  v_advance := ceil(v_total * v_percent / 100.0)::int;

  loop
    v_order_id := 'NZ-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    exit when not exists (select 1 from public.orders where id = v_order_id);
  end loop;

  -- Orders wait for the advance; an admin confirms them once it arrives.
  v_timeline := jsonb_build_array(jsonb_build_object('status', 'created', 'label', 'Order placed, awaiting advance payment', 'at', now()));

  insert into public.customers (phone, name, email, city, orders_count, total_spent, first_order_at, last_order_at)
  values (v_phone, trim(v_customer->>'name'), nullif(trim(coalesce(v_customer->>'email', '')), ''), v_customer->>'city', 1, v_total, now(), now())
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
                             coupon_code, creator_id, notes, attribution, timeline, stock_held, ip_hash)
  values (v_order_id, v_customer_id, auth.uid(), 'created', v_payment, 'pending', v_percent, v_advance,
          v_customer || jsonb_build_object('phone', v_phone), v_phone,
          v_subtotal, v_discount, v_shipping, v_total, v_coupon_code, v_creator, nullif(trim(coalesce(p_payload->>'notes', '')), ''),
          p_payload->'attribution', v_timeline, true, public.request_ip_hash());

  for v_item in select * from jsonb_array_elements(v_items) loop
    insert into public.order_items (order_id, product_id, sku, name, slug, variant_id, variant_name, quantity, unit_price, line_total)
    values (v_order_id, v_item->>'product_id', v_item->>'sku', v_item->>'name', v_item->>'slug', v_item->>'variant_id', v_item->>'variant_name',
            (v_item->>'quantity')::int, (v_item->>'unit_price')::int, (v_item->>'line_total')::int);
  end loop;

  select * into o from public.orders where id = v_order_id;
  return public.order_to_json(o);
end $$;

-- Coupon check shown in the bag, matching the rules in place_order.
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
  if c.type = 'percent' then v_discount := round(p_subtotal * least(greatest(c.value, 0), 100) / 100.0);
  elsif c.type = 'fixed' then v_discount := least(greatest(c.value, 0), p_subtotal);
  end if;
  return jsonb_build_object(
    'valid', true, 'code', c.code, 'type', c.type, 'value', c.value,
    'minOrder', c.min_order, 'discount', v_discount, 'creatorId', c.creator_id,
    'description', c.description
  );
end $$;

-- ---------------------------------------------------------------- abuse limits
-- Per number: 5 orders an hour and 3 waiting for the advance. Per connection:
-- 10 orders an hour. Store-wide: a burst brake against scripted orders.
create or replace function public.orders_rate_limit() returns trigger
language plpgsql set search_path = public as $$
declare v_phone text := right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10);
begin
  if (select count(*) from public.orders where right(phone, 10) = v_phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many orders from this number in the last hour. Please contact us on WhatsApp.';
  end if;
  if (select count(*) from public.orders where right(phone, 10) = v_phone and status = 'created' and payment_status = 'pending') >= 3 then
    raise exception 'This number already has 3 orders waiting for the advance payment. Please pay for those first or contact us on WhatsApp.';
  end if;
  if new.ip_hash is not null
     and (select count(*) from public.orders where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many orders from your connection in the last hour. Please try again later or contact us on WhatsApp.';
  end if;
  if (select count(*) from public.orders where status = 'created' and created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'We are receiving a lot of orders right now. Please try again in a few minutes.';
  end if;
  return new;
end $$;

-- --------------------------------------------------------------- notifications
-- Push messages go through the public ntfy.sh service, so they carry no names,
-- phone numbers or addresses: the full order opens in the admin panel.
create or replace function public.notify_new_order() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_topic   text;
  v_base    text;
  v_items   text;
  v_body    text;
  v_payload jsonb;
begin
  select nullif(value->>'ntfy_topic', ''), nullif(rtrim(value->>'admin_url', '/'), '')
    into v_topic, v_base from public.settings where key = 'notifications';
  if v_topic is null then return new; end if;

  select string_agg(quantity || ' × ' || name || coalesce(' (' || variant_name || ')', ''), E'\n' order by id)
    into v_items from public.order_items where order_id = new.id;
  v_body := format(E'Rs. %s · %s\nAdvance due: Rs. %s (%s%%)\nCity: %s\n\n%s',
    to_char(new.total, 'FM999,999,999'),
    case new.payment_method when 'bank' then 'Bank transfer' when 'easypaisa' then 'Easypaisa' when 'jazzcash' then 'JazzCash' else new.payment_method end,
    to_char(new.advance_amount, 'FM999,999,999'), new.advance_percent,
    coalesce(nullif(new.customer->>'city', ''), 'not given'),
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

create or replace function public.notify_new_message() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_topic   text;
  v_base    text;
  v_payload jsonb;
begin
  select nullif(value->>'ntfy_topic', ''), nullif(rtrim(value->>'admin_url', '/'), '')
    into v_topic, v_base from public.settings where key = 'notifications';
  if v_topic is null then return new; end if;
  v_payload := jsonb_build_object(
    'topic', v_topic,
    'title', 'New message: ' || coalesce(nullif(new.topic, ''), 'Contact'),
    'message', 'Open the inbox in the admin panel to read and reply.',
    'priority', 3,
    'tags', jsonb_build_array('envelope')
  );
  if v_base is not null then
    v_payload := v_payload || jsonb_build_object('click', v_base || '/admin/inbox');
  end if;
  perform net.http_post(url := 'https://ntfy.sh', body := v_payload, headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
exception when others then
  return new;
end $$;

-- Lets an admin check that order alerts reach their phone.
create or replace function public.admin_test_notification() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_topic   text;
  v_base    text;
  v_payload jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorised.'; end if;
  select nullif(value->>'ntfy_topic', ''), nullif(rtrim(value->>'admin_url', '/'), '')
    into v_topic, v_base from public.settings where key = 'notifications';
  if v_topic is null then return jsonb_build_object('sent', false, 'reason', 'no-topic'); end if;
  v_payload := jsonb_build_object(
    'topic', v_topic,
    'title', 'Test notification',
    'message', 'New orders and messages from your store will arrive like this.',
    'priority', 3,
    'tags', jsonb_build_array('white_check_mark')
  );
  if v_base is not null then
    v_payload := v_payload || jsonb_build_object('click', v_base || '/admin');
  end if;
  perform net.http_post(url := 'https://ntfy.sh', body := v_payload, headers := '{"Content-Type": "application/json"}'::jsonb);
  return jsonb_build_object('sent', true);
end $$;
revoke execute on function public.admin_test_notification() from public, anon;
grant execute on function public.admin_test_notification() to authenticated;

drop function if exists public.ntfy_topic();

-- ------------------------------------------------------------- public inserts
-- Visitors may only fill in the content columns; ids, timestamps, statuses and
-- moderation flags are set by the database.
revoke insert on public.events, public.contact_messages, public.newsletter_subscribers, public.stock_alerts, public.reviews from anon, authenticated;
grant insert (event, session_id, page_path, source, campaign, ad_content, creator_ref, device, value, currency, items, payload, created_at)
  on public.events to anon, authenticated;
grant insert (name, email, phone, topic, message) on public.contact_messages to anon, authenticated;
grant insert (email, source) on public.newsletter_subscribers to anon, authenticated;
grant insert (product_id, variant_id, contact, channel) on public.stock_alerts to anon, authenticated;
grant insert (product_id, author, city, rating, title, body) on public.reviews to anon, authenticated;

create or replace function public.events_server_time() returns trigger
language plpgsql set search_path = public as $$
begin
  new.created_at := now();
  return new;
end $$;
drop trigger if exists events_server_time on public.events;
create trigger events_server_time before insert on public.events for each row execute function public.events_server_time();

-- Size limits (existing rows are not re-checked).
alter table public.events drop constraint if exists events_size_check;
alter table public.events add constraint events_size_check check (
  length(event) <= 60 and length(coalesce(page_path, '')) <= 500
  and octet_length(coalesce(items::text, '')) + octet_length(coalesce(payload::text, '')) <= 20000) not valid;
alter table public.contact_messages drop constraint if exists contact_messages_size_check;
alter table public.contact_messages add constraint contact_messages_size_check check (
  length(name) <= 120 and length(email) <= 200 and length(coalesce(phone, '')) <= 30
  and length(coalesce(topic, '')) <= 80 and length(message) <= 5000) not valid;
alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_size_check;
alter table public.newsletter_subscribers add constraint newsletter_subscribers_size_check check (
  length(email) <= 200 and length(coalesce(source, '')) <= 60) not valid;
alter table public.stock_alerts drop constraint if exists stock_alerts_size_check;
alter table public.stock_alerts add constraint stock_alerts_size_check check (
  length(contact) <= 200 and length(coalesce(variant_id, '')) <= 80) not valid;
alter table public.reviews drop constraint if exists reviews_size_check;
alter table public.reviews add constraint reviews_size_check check (
  length(author) <= 80 and length(coalesce(city, '')) <= 80
  and length(coalesce(title, '')) <= 200 and length(body) <= 3000) not valid;
alter table public.orders drop constraint if exists orders_total_check;
alter table public.orders add constraint orders_total_check check (total >= 0 and subtotal >= 0 and discount >= 0 and shipping >= 0) not valid;
alter table public.coupons drop constraint if exists coupons_value_check;
alter table public.coupons add constraint coupons_value_check check (
  value >= 0 and (type <> 'percent' or value between 1 and 100)) not valid;

-- ------------------------------------------------------------------- reviews
-- Reviews from visitors start pending; admins and the service role are trusted.
create or replace function public.reviews_force_pending() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), 'anon') in ('anon', 'authenticated') and not public.is_admin() then
    new.status := 'pending';
    new.verified := false;
    new.helpful := 0;
  end if;
  return new;
end $$;

create or replace function public.refresh_product_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_product text;
begin
  foreach v_product in array array_remove(array[
    case when tg_op <> 'INSERT' then old.product_id end,
    case when tg_op <> 'DELETE' then new.product_id end], null) loop
    update public.products p
       set rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where product_id = v_product and status = 'approved'), 0),
           review_count = (select count(*) from public.reviews where product_id = v_product and status = 'approved')
     where p.id = v_product;
  end loop;
  return null;
end $$;
drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update of status, rating, product_id or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- ----------------------------------------------------------------- reporting
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
        select id, name, sku, stock from public.products where active and stock <= low_stock_threshold order by stock limit 12) l), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'orders', c, 'revenue', r) order by d) from (
        select (created_at at time zone 'Asia/Karachi')::date d, count(*) c, sum(total) r
          from public.orders where created_at >= since and not (status = any(lost)) group by 1) dd), '[]'::jsonb)
  ) into result;
  return result;
end $$;

-- Daily sales count only orders that are still going ahead; lost orders are listed separately.
drop view if exists public.report_daily_sales;
create view public.report_daily_sales with (security_invoker = true) as
  select (created_at at time zone 'Asia/Karachi')::date as day,
         count(*) filter (where status not in ('cancelled','failed','returned','refunded')) as orders,
         coalesce(sum(total) filter (where status not in ('cancelled','failed','returned','refunded')), 0) as revenue,
         coalesce(sum(discount) filter (where status not in ('cancelled','failed','returned','refunded')), 0) as discounts,
         coalesce(sum(shipping) filter (where status not in ('cancelled','failed','returned','refunded')), 0) as shipping_collected,
         round(avg(total) filter (where status not in ('cancelled','failed','returned','refunded'))) as average_order,
         count(*) filter (where status = 'created' and payment_status = 'pending') as awaiting_advance,
         coalesce(sum(case when payment_status = 'paid' then total when payment_status = 'advance_paid' then advance_amount else 0 end), 0) as payments_received,
         count(*) filter (where status = 'delivered') as delivered,
         count(*) filter (where status in ('cancelled','failed','returned','refunded')) as lost
    from public.orders
   group by 1
   order by 1 desc;
revoke all on public.report_daily_sales from anon;
grant select on public.report_daily_sales to authenticated;

-- The creator on a validated coupon wins over the creator link in the visitor's browser.
create or replace view public.report_sources with (security_invoker = true) as
  select coalesce(attribution->'lastTouch'->>'source', 'direct') as source,
         coalesce(attribution->'lastTouch'->>'utm_campaign', '') as campaign,
         coalesce(attribution->'lastTouch'->>'utm_content', '') as ad_content,
         coalesce(nullif(creator_id, ''), attribution->>'creatorRef', '') as creator,
         count(*) as orders,
         sum(total) as revenue,
         round(avg(total)) as average_order,
         min(created_at) as first_order,
         max(created_at) as last_order
    from public.orders
   where status not in ('cancelled', 'failed', 'returned', 'refunded')
   group by 1, 2, 3, 4
   order by revenue desc;

-- Explicit grants instead of relying on default privileges.
revoke all on public.departments from anon;
grant select on public.departments to anon, authenticated;
grant insert, update, delete on public.departments to authenticated;

-- ------------------------------------------------------------------ storage
-- Images only, up to 5 MB each. Files are public by URL; only admins can list them.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
 where id = 'product-images';
drop policy if exists "public read product images" on storage.objects;
drop policy if exists "admin read product images"  on storage.objects;
create policy "admin read product images" on storage.objects for select using (bucket_id = 'product-images' and public.is_admin());

-- ------------------------------------------------------------------ indexes
create index if not exists orders_status_created_idx on public.orders (status, created_at);
create index if not exists orders_customer_idx       on public.orders (customer_id);
create index if not exists orders_phone10_idx        on public.orders (right(phone, 10));
create index if not exists orders_ip_idx             on public.orders (ip_hash, created_at) where ip_hash is not null;
create index if not exists order_items_product_idx   on public.order_items (product_id);
create index if not exists events_created_idx        on public.events (created_at);

-- ---------------------------------------------------------------- sample data
-- The sample phone, WhatsApp, address, email and social links are cleared so
-- the site hides them until the real ones are entered in Admin → Settings.
update public.settings set value = value
  || case when value->>'phone' = '+92 300 1234567' then '{"phone": ""}'::jsonb else '{}'::jsonb end
  || case when value->>'whatsapp' = '923001234567' then '{"whatsapp": ""}'::jsonb else '{}'::jsonb end
  || case when value->>'address' = 'Suite 4, Bukhari Commercial, DHA Phase 6, Karachi, Pakistan' then '{"address": ""}'::jsonb else '{}'::jsonb end
  || case when value->>'email' = 'hello@nazandco.com' then '{"email": ""}'::jsonb else '{}'::jsonb end
  || case when value->>'instagram' = 'https://instagram.com/nazandco' then '{"instagram": ""}'::jsonb else '{}'::jsonb end
  || case when value->>'facebook' = 'https://facebook.com/nazandco' then '{"facebook": ""}'::jsonb else '{}'::jsonb end
  || case when value->>'tiktok' = 'https://tiktok.com/@nazandco' then '{"tiktok": ""}'::jsonb else '{}'::jsonb end
  || case when value->>'youtube' = 'https://youtube.com/@nazandco' then '{"youtube": ""}'::jsonb else '{}'::jsonb end
 where key = 'contact';

-- ---------------------------------------------------------------- scheduling
create or replace function public.cleanup_old_rows() returns void
language sql security definer set search_path = public as $$
  delete from public.order_lookups where at < now() - interval '1 day';
  delete from public.checkout_sessions where not converted and updated_at < now() - interval '90 days';
  delete from public.events where created_at < now() - interval '400 days';
$$;
revoke execute on function public.cleanup_old_rows() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('naz-cancel-unpaid-orders', '*/15 * * * *', 'select public.cancel_unpaid_orders()');
select cron.schedule('naz-cleanup-old-rows', '30 21 * * *', 'select public.cleanup_old_rows()');
