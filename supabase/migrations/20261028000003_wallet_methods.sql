-- Naz & CO · NayaPay and SadaPay as payment methods for the advance.

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('bank', 'easypaisa', 'jazzcash', 'nayapay', 'sadapay', 'card', 'cod'));

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
    case new.payment_method when 'bank' then 'Bank transfer' when 'easypaisa' then 'Easypaisa' when 'jazzcash' then 'JazzCash'
                            when 'nayapay' then 'NayaPay' when 'sadapay' then 'SadaPay' else new.payment_method end,
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
