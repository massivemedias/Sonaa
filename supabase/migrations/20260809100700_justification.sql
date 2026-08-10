-- SONAA — 0008 : la justification devient une exigence de la base.
--
-- POURQUOI EN BASE ET PAS SEULEMENT DANS LE FORMULAIRE : une règle qui ne
-- vit que dans le navigateur n'existe pas. L'API REST est publique, la clé
-- est dans le bundle, et n'importe qui peut poster une proposition sans
-- jamais ouvrir la modale. Le minimum de 40 signes demandé au formulaire
-- est donc écrit ici, où il tient vraiment.
--
-- Une justification est aussi ce qui rend la modération possible : sans
-- elle, un modérateur arbitre sur un titre et un nom d'artiste, c'est-à-dire
-- sur rien.

-- Toute proposition, quel que soit son type, porte sa justification.
alter table public.proposals add constraint proposals_justification check (
  payload ? 'justification'
  and jsonb_typeof(payload -> 'justification') = 'string'
  and char_length(payload ->> 'justification') between 40 and 1000
);

-- Les corrections de fiche ne visent que des champs qui existent. Sans
-- cette liste, « field » accepterait n'importe quel nom et la modération
-- recevrait des demandes inapplicables.
alter table public.proposals add constraint proposals_genre_edit_field check (
  kind <> 'genre_edit'
  or (payload ->> 'field') in (
    'description', 'machines', 'labelsHistoriques', 'labelsActuels',
    'artistesCles', 'aliases', 'bpm', 'note'
  )
);

comment on constraint proposals_justification on public.proposals is
  'Minimum de 40 signes. Ecrit en base parce que l''API est publique : la meme regle dans le formulaire seul serait contournable.';
