-- LE PLAFOND PAR DEFAUT PASSE DE 2 A 4 GO par compte. Mika, le 18 octobre
-- 2026 : « monte le plafond a 4 Go pour tout le monde ». Un membre peut ainsi
-- deposer un WAV de la taille maximale du format (voir 20261018120000).
-- Les comptes de la table quotas gardent leur reglage (NULL = sans limite).
create or replace function public.quota_octets(compte uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.quotas q where q.user_id = compte)
      then (select q.octets_max from public.quotas q where q.user_id = compte)
    else 4294967296::bigint
  end;
$$;

comment on table public.quotas is
  'Plafond de stockage par compte. octets_max a NULL signifie SANS LIMITE. Un compte absent de cette table prend le plafond par defaut de 4 Go.';
