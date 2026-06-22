begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admin update teams" on public.teams;
create policy "Admin update teams" on public.teams for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin insert team results" on public.team_results;
create policy "Admin insert team results" on public.team_results for insert to authenticated
with check (public.is_admin());
drop policy if exists "Admin update team results" on public.team_results;
create policy "Admin update team results" on public.team_results for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admin delete team results" on public.team_results;
create policy "Admin delete team results" on public.team_results for delete to authenticated
using (public.is_admin());

grant update (elimination_phase) on public.teams to authenticated;
grant insert, update, delete on public.team_results to authenticated;
grant usage, select on sequence public.team_results_id_seq to authenticated;

create or replace function public.save_team_results(
  p_team_id bigint,
  p_elimination_phase text,
  p_results jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  item jsonb;
  result_label text;
  result_points numeric(8,2);
  result_category text;
  result_sort_order integer;
begin
  if not public.is_admin() then
    raise exception 'Operazione riservata agli amministratori' using errcode = '42501';
  end if;

  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Squadra non trovata' using errcode = 'P0002';
  end if;

  if nullif(trim(p_elimination_phase), '') is not null
    and p_elimination_phase not in ('Girone', 'Sedicesimi', 'Ottavi', 'Quarti', 'Semifinale', 'Finale') then
    raise exception 'Fase eliminazione non valida' using errcode = '22023';
  end if;

  update public.teams
  set elimination_phase = nullif(trim(p_elimination_phase), '')
  where id = p_team_id;

  delete from public.team_results where team_id = p_team_id;

  for item in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb))
  loop
    result_label := item ->> 'label';
    result_points := (item ->> 'points')::numeric;
    result_category := null;

    select category, sort_order into result_category, result_sort_order
    from (values
      ('Punti Girone', 'group', 1),
      ('Qualificazione Girone', 'groupQualification', 2),
      ('Sedicesimi', 'knockout', 3),
      ('Ottavi', 'knockout', 4),
      ('Quarti', 'knockout', 5),
      ('Semifinale', 'knockout', 6),
      ('Finale', 'knockout', 7)
    ) as allowed(label, category, sort_order)
    where label = result_label;

    if result_category is null or result_points < 0 then
      raise exception 'Risultato non valido per %', coalesce(result_label, '?') using errcode = '22023';
    end if;

    insert into public.team_results (team_id, label, points, display_value, category, sort_order)
    values (p_team_id, result_label, result_points, result_points::text, result_category, result_sort_order);
  end loop;
end;
$$;

revoke all on function public.save_team_results(bigint, text, jsonb) from public, anon;
grant execute on function public.save_team_results(bigint, text, jsonb) to authenticated;

commit;
