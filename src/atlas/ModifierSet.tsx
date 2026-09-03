/* MODIFIER UN SET DEJA DEPOSE.

   CE QUI MANQUAIT. On pouvait publier, depublier et supprimer, mais pas
   corriger. Une faute dans un titre obligeait a tout redeposer, c'est-a-dire
   a renvoyer un gigaoctet pour une lettre.

   LE BOUTON D'ENREGISTREMENT NE S'ALLUME QUE SI QUELQUE CHOSE A CHANGE. Un
   bouton toujours actif ne dit pas s'il reste du travail a valider ; celui-ci
   repond a la question « ai-je oublie d'enregistrer » sans qu'on ait a la
   poser. On compare aux valeurs d'origine, pas a un drapeau leve a la
   premiere frappe : revenir soi-meme au texte de depart eteint le bouton,
   ce qui est la verite.

   LE FICHIER AUDIO NE SE REMPLACE PAS ICI. Changer l'audio changerait la
   duree, la forme d'onde et le compte d'ecoutes : ce n'est plus une
   modification, c'est un autre set. */

import { useState } from 'react';
import {
  FORMATS_IMAGE,
  GENRES_MAX,
  compresserPochette,
  deposerPochette,
  modifierSet,
  urlPochette,
  type SetDJ,
} from '../lib/sets.ts';
import { ChoixStyles } from './ChoixStyles.tsx';
import { ZoneDepot } from './ZoneDepot.tsx';
import { t } from '../langue/langue.ts';

interface Props {
  readonly set: SetDJ;
  readonly onFini: () => void;
  readonly onAnnuler: () => void;
}

const memesListes = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export function ModifierSet({ set, onFini, onAnnuler }: Props) {
  const [titre, setTitre] = useState(set.titre);
  const [description, setDescription] = useState(set.description ?? '');
  const [genres, setGenres] = useState<string[]>([...(set.genre_ids ?? [])]);
  const [pochette, setPochette] = useState<{ fichier: File; apercu: string } | null>(null);
  const [pochetteRetiree, setPochetteRetiree] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const change =
    titre.trim() !== set.titre ||
    description.trim() !== (set.description ?? '') ||
    !memesListes(genres, set.genre_ids ?? []) ||
    pochette !== null ||
    pochetteRetiree;

  const apercuCourant = pochette?.apercu ?? (pochetteRetiree ? null : urlPochette(set.cover_path));

  const choisirPochette = async (f: File): Promise<void> => {
    setMessage(null);
    if (!f.type.startsWith('image/')) {
      setMessage(t.formatImageRefuse);
      return;
    }
    try {
      const petite = await compresserPochette(f);
      if (pochette) URL.revokeObjectURL(pochette.apercu);
      setPochette({ fichier: petite, apercu: URL.createObjectURL(petite) });
      setPochetteRetiree(false);
    } catch {
      setMessage(t.formatImageRefuse);
    }
  };

  const enregistrer = async (): Promise<void> => {
    if (!titre.trim()) {
      setMessage(t.titreRequis);
      return;
    }
    setOccupe(true);
    setMessage(null);
    try {
      const cover = pochette
        ? await deposerPochette(pochette.fichier)
        : pochetteRetiree
          ? null
          : set.cover_path;
      await modifierSet(
        set.id,
        {
          titre: titre.trim(),
          description: description.trim() || null,
          genre_ids: genres.length > 0 ? genres : null,
          cover_path: cover,
        },
        set.cover_path
      );
      if (pochette) URL.revokeObjectURL(pochette.apercu);
      onFini();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="sp-modif sp-formulaire">
      <label className="sp-label">
        {t.titreDuSet}
        <input
          type="text"
          maxLength={120}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
        />
      </label>

      <div>
        <p className="sp-label">{t.pochette}</p>
        <ZoneDepot
          className="zd-pochette"
          accept={FORMATS_IMAGE}
          onFichier={(f) => void choisirPochette(f)}
          disabled={occupe}
        >
          {apercuCourant ? (
            <img className="zd-apercu" src={apercuCourant} alt="" />
          ) : (
            <>
              <p className="zd-titre">{t.deposerUnePochette}</p>
              <p className="zd-aide">{t.pochetteAide}</p>
            </>
          )}
        </ZoneDepot>
        {apercuCourant && (
          <button
            type="button"
            className="sp-lien"
            onClick={() => {
              if (pochette) URL.revokeObjectURL(pochette.apercu);
              setPochette(null);
              setPochetteRetiree(true);
            }}
          >
            {t.retirerLaPochette}
          </button>
        )}
      </div>

      <ChoixStyles choisis={genres} onChange={setGenres} max={GENRES_MAX} />

      <label className="sp-label">
        {t.descriptionFacultative}
        <textarea
          maxLength={2000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="sp-modif-actions">
        <button className="sp-action" disabled={!change || occupe} onClick={() => void enregistrer()}>
          {occupe ? t.etapeLigne : t.enregistrer}
        </button>
        <button className="sp-lien" onClick={onAnnuler}>
          {t.annuler}
        </button>
        {change && !occupe && <span className="sp-aide">{t.changementsNonEnregistres}</span>}
      </div>

      {message && <p className="sp-message">{message}</p>}
    </div>
  );
}
