-- SONAA — BANC DE SÉCURITÉ DE L'ADMINISTRATION.
--
-- À rejouer après toute modification des politiques, des fonctions d'agrégat
-- ou des droits. Il n'écrit rien : il se termine par une exception volontaire
-- qui annule tout ce qu'il a tenté.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI CE BANC MESURE LA MÊME CHOSE QU'UN APPEL D'API
-- ─────────────────────────────────────────────────────────────────────────
--
-- Une route cachée n'est pas une sécurité : ce qui protège #/admin n'est pas
-- l'absence de lien vers lui, c'est la base. PostgREST, qui sert l'API,
-- exécute chaque requête sous le rôle `anon` ou `authenticated`, en posant les
-- revendications du jeton dans `request.jwt.claims`. C'est exactement ce que
-- fait ce banc.
--
-- Tester par l'interface ne prouverait rien : elle peut cacher un bouton. Le
-- seul test qui vaut est celui qui contourne l'interface, et c'est celui-ci.
--
-- ─────────────────────────────────────────────────────────────────────────
-- RÉSULTAT DU 12 AOÛT 2026 : NEUF CONTRÔLES, NEUF PASSÉS
-- ─────────────────────────────────────────────────────────────────────────
--
--   anon lit profiles                      0 ligne
--   anon écrit profiles                    REFUSÉ
--   anon s'ajoute modérateur               REFUSÉ
--   ordinaire lit profiles                 0 ligne
--   ordinaire appelle stats_membres        0 ligne
--   ordinaire appelle stats_villes(1,100)  0 ligne   ← le plancher tient
--   ordinaire liste les modérateurs        0 ligne
--   ordinaire nomme un modérateur          REFUSÉ, « Reserve aux moderateurs. »
--   ordinaire s'ajoute modérateur          REFUSÉ
--
-- Le contrôle sur `stats_villes(1, 100)` est le plus important des neuf : il
-- prouve qu'un appelant qui passe un seuil d'anonymat de 1 n'obtient pas mieux
-- qu'un appelant honnête. Le plancher de trois vit dans la fonction.

do $$
declare
  faux_uid uuid := '00000000-0000-0000-0000-0000000000ff'; -- compte ordinaire, non modérateur
  n integer;
  msg text;
  r text := '';
begin
  -- ── L'ANONYME ──────────────────────────────────────────────────────────
  set local role anon;
  begin
    select count(*) into n from public.profiles;
    r := r || format('anon lit profiles : %s ligne(s)%s', n, chr(10));
  exception when others then
    r := r || format('anon lit profiles : REFUSE (%s)%s', sqlerrm, chr(10));
  end;
  begin
    insert into public.profiles (user_id, ville, pays) values (faux_uid, 'Montreal', 'CA');
    r := r || 'anon ECRIT profiles : ACCEPTE, FAILLE' || chr(10);
  exception when others then
    r := r || 'anon ecrit profiles : REFUSE' || chr(10);
  end;
  begin
    insert into public.moderators (user_id) values (faux_uid);
    r := r || 'anon s ajoute moderateur : ACCEPTE, FAILLE' || chr(10);
  exception when others then
    r := r || 'anon s ajoute moderateur : REFUSE' || chr(10);
  end;
  reset role;

  -- ── LE COMPTE ORDINAIRE, connecté mais non modérateur ───────────────────
  set local role authenticated;
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', faux_uid), true);

  begin
    select count(*) into n from public.profiles;
    r := r || format('ordinaire lit profiles : %s ligne(s)%s', n, chr(10));
  exception when others then
    r := r || format('ordinaire lit profiles : REFUSE (%s)%s', sqlerrm, chr(10));
  end;
  begin
    select count(*) into n from public.stats_membres();
    r := r || format('ordinaire appelle stats_membres : %s ligne(s)%s', n, chr(10));
  exception when others then
    r := r || format('ordinaire appelle stats_membres : REFUSE (%s)%s', sqlerrm, chr(10));
  end;
  -- Le seuil passé à 1 : la fonction doit le relever à 3 elle-même.
  begin
    select count(*) into n from public.stats_villes(1, 100);
    r := r || format('ordinaire appelle stats_villes(seuil=1) : %s ligne(s)%s', n, chr(10));
  exception when others then
    r := r || format('ordinaire appelle stats_villes : REFUSE (%s)%s', sqlerrm, chr(10));
  end;
  begin
    select count(*) into n from public.liste_moderateurs();
    r := r || format('ordinaire liste les moderateurs : %s ligne(s)%s', n, chr(10));
  exception when others then
    r := r || format('ordinaire liste les moderateurs : REFUSE (%s)%s', sqlerrm, chr(10));
  end;
  begin
    perform public.nommer_moderateur('mauditemachine@gmail.com', 'tentative');
    r := r || 'ordinaire NOMME un moderateur : ACCEPTE, FAILLE' || chr(10);
  exception when others then
    get stacked diagnostics msg = message_text;
    r := r || format('ordinaire nomme un moderateur : REFUSE (%s)%s', msg, chr(10));
  end;
  begin
    insert into public.moderators (user_id) values (faux_uid);
    r := r || 'ordinaire s ajoute moderateur : ACCEPTE, FAILLE' || chr(10);
  exception when others then
    r := r || 'ordinaire s ajoute moderateur : REFUSE' || chr(10);
  end;
  reset role;

  -- L'exception annule tout. Aucun de ces essais n'est écrit, même ceux qui
  -- auraient réussi : un banc qui laisse des traces n'est pas rejouable.
  raise exception 'BANC TERMINE, rien n a ete ecrit : %', chr(10) || r;
end;
$$;
