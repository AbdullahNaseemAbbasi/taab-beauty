-- TAAB · tapping an order notification opens that order in the admin panel.
-- The store URL comes from settings → notifications → admin_url (set in Admin → Settings).

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
  v_body := format(E'Rs. %s · %s\n%s\n%s, %s\n%s\n\n%s',
    to_char(new.total, 'FM999,999,999'),
    case new.payment_method when 'cod' then 'Cash on delivery' when 'bank' then 'Bank transfer (awaiting receipt)' else 'Card' end,
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

create or replace function public.notify_new_message() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_topic text;
  v_base  text;
  v_payload jsonb;
begin
  select nullif(value->>'ntfy_topic', ''), nullif(rtrim(value->>'admin_url', '/'), '')
    into v_topic, v_base from public.settings where key = 'notifications';
  if v_topic is null then return new; end if;
  v_payload := jsonb_build_object(
    'topic', v_topic,
    'title', 'New message: ' || coalesce(new.topic, 'Contact'),
    'message', format(E'%s · %s\n%s\n\n%s', new.name, new.email, coalesce(new.phone, ''), left(new.message, 500)),
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
