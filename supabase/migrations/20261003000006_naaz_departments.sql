-- Naaz & CO · store renamed from TAAB; departments (beauty, electronics, kitchen);
-- product specifications and warranty for non-beauty items.

alter table public.categories add column if not exists department text not null default 'beauty';
alter table public.products   add column if not exists specs jsonb not null default '[]'::jsonb;   -- [{label, value}]
alter table public.products   add column if not exists warranty text;

-- New orders are numbered NZ-YYMMDD-NNNN. The live place_order body is patched
-- in place so this file does not have to repeat the whole function.
do $$
declare
  v_def text;
begin
  for v_def in
    select pg_get_functiondef(p.oid)
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'place_order'
  loop
    execute replace(v_def, '''TB-''', '''NZ-''');
  end loop;
end $$;

comment on column public.orders.id is 'NZ-YYMMDD-NNNN (orders placed before the rename keep their TB- number)';

update public.settings set value = jsonb_set(value, '{name}', '"Naaz & CO"') where key = 'store';

-- The house brand changes id and name; products follow it.
insert into public.brands (id, name, tagline, description, featured)
values ('naaz-co', 'Naaz & CO', 'The house line', 'Our own makeup, tools and everyday essentials.', true)
on conflict (id) do nothing;
update public.products set brand_id = 'naaz-co' where brand_id = 'taab';
delete from public.brands where id = 'taab';

-- Demo rows that carried the old name (re-created under the new one by the seed script).
delete from public.coupons where code = 'TAAB500';
delete from public.orders  where id in ('TB-240912-0148', 'TB-241001-0211');
