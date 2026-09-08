/* AJOUTER UNE SOIREE, DEPUIS LE CALENDRIER, QUAND ON EST CONNECTE.
 *
 * ═══ CE QUE C'EST ═══
 *
 * Une feuille, comme la fiche d'une soiree, avec un formulaire court : le
 * titre, la date et l'heure, la salle, l'affiche, les noms, les styles, le
 * lien pour les billets, un mot d'annonce. Ce qui est depose apparait dans
 * le calendrier tout de suite, avec la pastille « membre », et la personne
 * peut ensuite en tirer l'image pour Instagram (voir PartageSoiree).
 *
 * Demande de Mika du 7 septembre 2026. Le lien de billets est un champ libre
 * pour l'instant ; une billetterie viendra plus tard, et c'est ce champ
 * qu'elle remplira.
 *
 * ═══ CE QUI EST VERROUILLE PAR LA BASE, PAS PAR L'ECRAN ═══
 *
 * Sans session, le formulaire ne s'affiche pas et propose de se connecter.
 * Mais ce n'est pas ce qui protege : la base n'accepte d'un membre qu'une
 * soiree portant la source « membre » et son propre compte, et pas plus de
 * vingt par jour. Voir la migration soirees_des_membres.
 *
 * ═══ L'HEURE EST CELLE DE LA SALLE ═══
 *
 * La date est construite composante par composante, dans le fuseau de la
 * ville, jamais par `new Date('2026-09-12T22:00')` : quelqu'un qui depose
 * depuis Paris une soiree a Montreal ecrit l'heure de Montreal.
 */

import { useEffect, useState } from 'react';
import { SelecteurVille } from './SelecteurVille.tsx';
import { toutesLesVilles } from '../lib/villes.ts';
import type { Ville } from '../lib/ville-active.ts';
import { ajouterSoiree, type SoireeManuelle } from '../lib/soirees-manuelles.ts';
import { compresserPochette, deposerPochette, urlPochette } from '../lib/sets.ts';
import { useSession } from '../lib/useSession.ts';
import { instantLocal } from '../lib/heure-locale.ts';
import { t } from '../langue/langue.ts';
import './ajouter-soiree.css';

interface Props {
  readonly ville: Ville;
  readonly onFermer: () => void;
  readonly onAjoutee: (s: SoireeManuelle) => void;
}

const VIDE = {
  titre: '',
  jour: '',
  heure: '22:00',
  lieu: '',
  artistes: '',
  genres: '',
  lien: '',
  description: '',
};

export function AjouterSoiree({ ville: villeInitiale, onFermer, onAjoutee }: Props) {
  const { session, chargement } = useSession();
  const [villes, setVilles] = useState<Ville[]>([]);
  const [ville, setVille] = useState<Ville>(villeInitiale);
  const [form, setForm] = useState({ ...VIDE });
  const [affiche, setAffiche] = useState<{ fichier: File; apercu: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    void toutesLesVilles().then(setVilles);
  }, []);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onFermer();
    };
    window.addEventListener('keydown', surTouche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', surTouche);
      document.body.style.overflow = avant;
    };
  }, [onFermer]);

  useEffect(
    () => () => {
      if (affiche) URL.revokeObjectURL(affiche.apercu);
    },
    [affiche]
  );

  const choisirAffiche = (f: File | null): void => {
    if (!f) return;
    setAffiche({ fichier: f, apercu: URL.createObjectURL(f) });
  };

  const decouper = (x: string): string[] =>
    x
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const enregistrer = async (): Promise<void> => {
    if (!form.titre.trim() || !form.jour) {
      setMessage(t.ilFautTitreEtDate);
      return;
    }
    setOccupe(true);
    setMessage(null);
    try {
      let chemin: string | null = null;
      if (affiche) {
        const petite = await compresserPochette(affiche.fichier);
        chemin = await deposerPochette(petite);
      }
      const debut = instantLocal(form.jour, form.heure, ville.timezone ?? 'America/Toronto');
      const s = await ajouterSoiree({
        ville_id: ville.id,
        titre: form.titre.trim(),
        debut: debut.toISOString(),
        lieu: form.lieu.trim() || null,
        artistes: decouper(form.artistes),
        genres: decouper(form.genres),
        lien: form.lien.trim() || null,
        affiche: urlPochette(chemin),
        description: form.description.trim() || null,
        source: 'membre',
      });
      onAjoutee(s);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.enregistrementImpossible);
      setOccupe(false);
    }
  };

  const corps = chargement ? null : !session ? (
    <div className="aj-connexion">
      <p>{t.connexionPourAjouter}</p>
      <button
        type="button"
        className="aj-principal"
        onClick={() => window.dispatchEvent(new Event('sonaa:connexion'))}
      >
        {t.seConnecter}
      </button>
    </div>
  ) : (
    <form
      className="aj-form"
      onSubmit={(e) => {
        e.preventDefault();
        void enregistrer();
      }}
    >
      <p className="aj-intro">{t.ajouterSoireeIntro}</p>

      <label className="aj-champ">
        <span>{t.titreLibelle}</span>
        <input
          type="text"
          value={form.titre}
          maxLength={200}
          required
          onChange={(e) => setForm({ ...form, titre: e.target.value })}
        />
      </label>

      <div className="aj-deux">
        <label className="aj-champ">
          <span>{t.dateLibelle}</span>
          <input
            type="date"
            value={form.jour}
            required
            onChange={(e) => setForm({ ...form, jour: e.target.value })}
          />
        </label>
        <label className="aj-champ">
          <span>{t.heureLibelle}</span>
          <input
            type="time"
            value={form.heure}
            onChange={(e) => setForm({ ...form, heure: e.target.value })}
          />
        </label>
      </div>

      {villes.length > 0 && (
        <SelecteurVille villes={villes} choisie={ville} onChoisir={setVille} etiquette={t.villeLibelle} />
      )}

      <label className="aj-champ">
        <span>{t.salleLibelle}</span>
        <input
          type="text"
          value={form.lieu}
          maxLength={120}
          onChange={(e) => setForm({ ...form, lieu: e.target.value })}
        />
      </label>

      <div className="aj-champ">
        <span>{t.afficheLibelle}</span>
        <div className="aj-affiche">
          {affiche ? (
            <img className="aj-affiche-apercu" src={affiche.apercu} alt="" />
          ) : (
            <span className="aj-affiche-vide" aria-hidden="true" />
          )}
          <div className="aj-affiche-actions">
            <label className="aj-secondaire">
              {affiche ? t.changerLAffiche : t.choisirUneAffiche}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => choisirAffiche(e.target.files?.[0] ?? null)}
              />
            </label>
            {affiche && (
              <button type="button" className="aj-secondaire" onClick={() => setAffiche(null)}>
                {t.retirerLAffiche}
              </button>
            )}
            <span className="aj-aide">{t.afficheAide}</span>
          </div>
        </div>
      </div>

      <label className="aj-champ">
        <span>{t.artistesSepares}</span>
        <input
          type="text"
          value={form.artistes}
          onChange={(e) => setForm({ ...form, artistes: e.target.value })}
        />
      </label>

      <label className="aj-champ">
        <span>{t.stylesSepares}</span>
        <input
          type="text"
          value={form.genres}
          onChange={(e) => setForm({ ...form, genres: e.target.value })}
        />
      </label>

      <label className="aj-champ">
        <span>{t.lienBillets}</span>
        <input
          type="url"
          value={form.lien}
          inputMode="url"
          onChange={(e) => setForm({ ...form, lien: e.target.value })}
        />
      </label>

      <label className="aj-champ">
        <span>{t.annonceLibelle}</span>
        <textarea
          value={form.description}
          rows={4}
          maxLength={2000}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>

      <div className="aj-pied">
        <button type="submit" className="aj-principal" disabled={occupe}>
          {occupe ? t.enregistrementEnCours : t.ajouterLaSoiree}
        </button>
        <button type="button" className="aj-secondaire" onClick={onFermer}>
          {t.annuler}
        </button>
      </div>
      {message && <p className="aj-message" role="status">{message}</p>}
    </form>
  );

  return (
    <div className="cal-voile" onClick={onFermer}>
      <div
        className="cal-feuille"
        role="dialog"
        aria-modal="true"
        aria-label={t.ajouterUneSoiree}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cal-feuille-tete">
          <span className="cal-feuille-poignee" aria-hidden="true" />
          <h3 className="cal-feuille-titre">{t.ajouterUneSoiree}</h3>
          <button type="button" className="cal-feuille-fermer" onClick={onFermer} aria-label={t.fermer}>
            ×
          </button>
        </div>
        <div className="cal-fiche">{corps}</div>
      </div>
    </div>
  );
}
