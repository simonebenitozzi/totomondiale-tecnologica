begin;

do $$
begin
  if exists (
    select 1
    from public.team_results
    where points <> trunc(points)
  ) then
    raise exception 'Esistono risultati decimali: correggerli prima di applicare la migrazione';
  end if;
end;
$$;

alter table public.team_results
alter column points type integer using points::integer;

update public.team_results
set display_value = points::text
where display_value is distinct from points::text;

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
  raw_points numeric;
  result_points integer;
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
    raw_points := (item ->> 'points')::numeric;
    result_category := null;

    if raw_points <> trunc(raw_points) then
      raise exception 'I punti devono essere numeri interi' using errcode = '22023';
    end if;
    result_points := raw_points::integer;

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
