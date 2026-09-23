-- Forward-only compatibility migration for Slabberjaws grader expansion.
-- It is deliberately fail-closed: an unexpected grader constraint is not altered.
begin;

do $$
declare
  constraint_name text;
  constraint_definition text;
begin
  if to_regclass('public.cards') is null then
    raise exception 'public.cards does not exist; refusing grader compatibility migration';
  end if;

  select conname, pg_get_constraintdef(oid)
    into constraint_name, constraint_definition
    from pg_constraint
   where conrelid = 'public.cards'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%grader%';

  if constraint_name is null then
    raise exception 'No grader CHECK constraint found on public.cards; inspect the live schema before continuing';
  end if;

  -- Do not drop a combined or otherwise unrelated CHECK constraint.
  if constraint_definition !~* '^CHECK \(\(grader (IN|= ANY)' then
    raise exception 'Unexpected grader constraint %: %; refusing to modify it', constraint_name, constraint_definition;
  end if;

  execute format('alter table public.cards drop constraint %I', constraint_name);
  alter table public.cards add constraint cards_grader_check
    check (grader in ('Degree', 'PSA', 'CGC', 'PGS', 'Collect Direct', 'GMA', 'Integrity Grading', 'CSG', 'C3G', 'SGC', 'GAS'));
end $$;

commit;
