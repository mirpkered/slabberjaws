-- Read-only production inspection for project kewynepvspcmrujustds.
select c.relname as table_name, a.attname as column_name, format_type(a.atttypid,a.atttypmod) as column_type
from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='cards' and a.attname='grader' and a.attnum>0 and not a.attisdropped;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid='public.cards'::regclass order by conname;

select grader, count(*) as card_count from public.cards group by grader order by grader;

select indexname,indexdef from pg_indexes where schemaname='public' and tablename='cards' order by indexname;
select policyname,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='cards' order by policyname;
select relrowsecurity from pg_class where oid='public.cards'::regclass;
