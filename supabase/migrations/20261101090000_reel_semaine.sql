-- LE REEL DU JEUDI (ADR-115) : ce que la semaine a fait sur SONAA.
--
-- Mika, le 31 octobre 2026 : un reel chaque jeudi avec les soirees de la
-- fin de semaine, les grosses news, les mixtapes qui marchent, et le label
-- de la semaine qui a le plus fonctionne. Les chiffres du site viennent
-- d'ici : les pages de label vues, et les mixtapes ecoutees, sur les
-- `jours` derniers jours. Reserve a la moderation, comme stats_site.

create or replace function public.reel_semaine(jours integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  depuis timestamptz := now() - make_interval(days => greatest(1, least(jours, 31)));
begin
  if not public.is_moderator() then
    raise exception 'reserve a la moderation' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'labels', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select substring(chemin from '^(?:#/|/)labels/([^/?#]+)') as slug, count(*) as vues, count(distinct visiteur) as visiteurs
        from public.mesure_visites
       where quand >= depuis and chemin ~ '^(#/|/)labels/[^/?#]+'
       group by 1 order by 2 desc limit 50) p),
    'mixtapes', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select e.set_id as id, count(*) as auditeurs, round(sum(e.secondes) / 60.0) as minutes
        from public.mesure_ecoutes e
       where e.jour >= (depuis at time zone 'America/Toronto')::date
       group by 1 order by 2 desc limit 20) p)
  );
end;
$$;

revoke all on function public.reel_semaine(integer) from public;
grant execute on function public.reel_semaine(integer) to authenticated;
