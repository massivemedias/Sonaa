-- SONAA — 0020 : deux gigaoctets par compte, sans limite pour l'auteur.
--
-- APPLIQUÉE.
--
-- POURQUOI UNE TABLE ET NON UNE CONSTANTE DANS LE CODE. L'exception de Mika
-- est une DONNEE, pas une regle : demain il y aura des comptes payants, et
-- chacun aura son plafond. Une exception ecrite en dur dans une fonction
-- devrait etre redeployee a chaque nouvel abonne.
--
-- LA VERIFICATION EST UN DECLENCHEUR, PAS UN CONTROLE DANS LE FORMULAIRE. Une
-- limite qui ne vit que dans le navigateur se contourne avec la console.
-- Celle-ci refuse l'ecriture de la ligne, quel que soit le chemin emprunte.
-- Verifie : un premier set de 1,5 Go passe, un second de 1 Go est refuse avec
-- « quota depasse : 2684354560 octets utilises sur 2147483648 autorises », un
-- second de 300 Mo passe. Le compte de l'auteur rend NULL, sans limite. Un
-- compte ne peut pas s'octroyer un plafond : 403.
--
-- ELLE PORTE SUR LA LIGNE ET NON SUR LE FICHIER, faiblesse assumee : le
-- fichier part sur R2 avant que la ligne s'ecrive, donc un depassement laisse
-- un objet orphelin. Le formulaire verifie deja la place avant l'envoi ; cette
-- barriere est la pour le cas ou on l'aurait contournee, et un orphelin est
-- alors le moindre mal.

create table if not exists public.quotas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  octets_max bigint check (octets_max is null or octets_max > 0),
  note text,
  created_at timestamptz not null default now()
);

comment on table public.quotas is
  'Plafond de stockage par compte. octets_max a NULL signifie SANS LIMITE. Un compte absent de cette table prend le plafond par defaut de 2 Go.';

alter table public.quotas enable row level security;

create policy "quota : je lis le mien"
  on public.quotas for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.quotas from anon, authenticated;

create or replace function public.quota_octets(compte uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.quotas q where q.user_id = compte)
      then (select q.octets_max from public.quotas q where q.user_id = compte)
    else 2147483648::bigint
  end;
$$;

create or replace function public.stockage_utilise(compte uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(taille_o), 0)::bigint from public.dj_sets where user_id = compte;
$$;

grant execute on function public.quota_octets(uuid) to authenticated;
grant execute on function public.stockage_utilise(uuid) to authenticated;

create or replace function public.verifier_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  plafond bigint;
  utilise bigint;
begin
  plafond := public.quota_octets(new.user_id);
  if plafond is null then
    return new;
  end if;
  select coalesce(sum(taille_o), 0) into utilise
    from public.dj_sets where user_id = new.user_id and id <> new.id;
  if utilise + coalesce(new.taille_o, 0) > plafond then
    raise exception 'quota depasse : % octets utilises sur % autorises',
      utilise + coalesce(new.taille_o, 0), plafond using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists dj_sets_quota on public.dj_sets;
create trigger dj_sets_quota
  before insert or update of taille_o on public.dj_sets
  for each row execute function public.verifier_quota();

-- L'exception de l'auteur, posee comme une donnee.
insert into public.quotas (user_id, octets_max, note)
select id, null, 'Auteur du site : sans limite.'
from auth.users where email = 'mauditemachine@gmail.com'
on conflict (user_id) do update set octets_max = null, note = excluded.note;
