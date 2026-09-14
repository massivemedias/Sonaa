-- UN SET DEPOSE EST PUBLIE. Mika, le 14 septembre 2026 : « les fichiers
-- audio uploades ne sont pas prives ! ». Alexandre avait depose son set et
-- personne ne le voyait : il restait brouillon tant qu'on n'appuyait pas sur
-- Publier, un bouton que personne ne cherche apres un depot. Le depot
-- publie ; Depublier reste la pour qui veut retirer.
alter table public.dj_sets alter column publie set default true;
update public.dj_sets set publie = true where publie = false;
