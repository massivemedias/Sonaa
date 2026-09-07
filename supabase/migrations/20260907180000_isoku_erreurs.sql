-- Journal des erreurs du jeu Isoku, envoye par la page (cle publique) pour diagnostiquer Safari mobile
create table if not exists public.isoku_erreurs (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  version text, mode text, vue text, ua text, message text, source text,
  ligne integer, colonne integer, pile text, contexte text,
  etranger boolean not null default false
);
alter table public.isoku_erreurs enable row level security;
create policy "isoku_erreurs_insert_anon" on public.isoku_erreurs
  for insert to anon, authenticated with check (length(coalesce(message,'')) < 2000 and length(coalesce(pile,'')) < 6000);
revoke select on public.isoku_erreurs from anon, authenticated;
grant insert on public.isoku_erreurs to anon, authenticated;
create index if not exists isoku_erreurs_cree_le on public.isoku_erreurs (cree_le desc);
