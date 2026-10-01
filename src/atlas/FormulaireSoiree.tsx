/* AJOUTER UNE SOIREE : LE LIEN D'ABORD, LA FICHE ENSUITE.
 *
 * Mika, le 1er octobre 2026 : « que ce soit simple et clair pour les gens
 * de rajouter quelque chose. Si quelqu'un passe un lien Facebook, ca va
 * chercher toutes les infos et complete par defaut, et l'utilisateur peut
 * modifier bien sur. »
 *
 * Le formulaire commence donc par UNE case : le lien. « Remplir » le fait
 * lire par la passerelle (voir src/lib/lire-soiree.ts), et la fiche s'ouvre
 * deja remplie, affiche comprise. Ce que la page n'a pas donne reste vide et
 * le dit (« a completer ») : Facebook, par exemple, ne donne jamais l'heure.
 * Sans lien, « Remplir a la main » ouvre la meme fiche, vide.
 *
 * LE MEME FORMULAIRE VIT A DEUX ENDROITS : dans le profil, a plat, et dans
 * la feuille « Ajouter » du calendrier (AjouterSoiree.tsx). Une seule
 * ecriture, pour que les deux ne divergent pas.
 *
 * Ce qui est verrouille l'est par la base, pas par l'ecran : un membre ne
 * peut deposer qu'une soiree « membre » a son nom, vingt par jour au plus.
 * Voir la migration soirees_des_membres.
 *
 * L'HEURE EST CELLE DE LA SALLE : la date est construite dans le fuseau de
 * la ville choisie (instantLocal), jamais par `new Date('...T22:00')`. */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toutesLesVilles } from '../lib/villes.ts';
import type { Ville } from '../lib/ville-active.ts';
import { ajouterSoiree, lireSoireeDuLien, type SoireeLueReponse, type SoireeManuelle } from '../lib/soirees-manuelles.ts';
import { compresserPochette, deposerPochette, urlPochette } from '../lib/sets.ts';
import { instantLocal } from '../lib/heure-locale.ts';
import { t } from '../langue/langue.ts';
import './formulaire-soiree.css';

interface Props {
  /** La ville proposee d'office ; celle de la page, ou Montreal. */
  readonly villeInitiale: Ville | null;
  readonly onAjoutee: (s: SoireeManuelle) => void;
  /** Present dans la feuille du calendrier, qui se ferme. */
  readonly onAnnuler?: () => void;
}

const VIDE = {
  titre: '',
  jour: '',
  heure: '',
  lieu: '',
  adresse: '',
  artistes: '',
  genres: '',
  lien: '',
  description: '',
  prix: '',
  organisateur: '',
};
type Champs = typeof VIDE;

const NOM_DE_SOURCE: Record<string, string> = {
  facebook: 'Facebook',
  ra: 'Resident Advisor',
  eventbrite: 'Eventbrite',
  lepointdevente: 'Lepointdevente',
  ticketmaster: 'Ticketmaster',
  shotgun: 'Shotgun',
};

/** « Montreal, QC », « Montréal » et « montreal » designent la meme ville. */
const cleDeVille = (s: string): string =>
  s
    .split(',')[0]!
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function fichierDeBase64(d: { type: string; base64: string }): File {
  const binaire = atob(d.base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
  const ext = d.type === 'image/png' ? 'png' : d.type === 'image/webp' ? 'webp' : 'jpg';
  return new File([octets], `affiche.${ext}`, { type: d.type });
}

type Lecture =
  | { readonly k: 'repos' }
  | { readonly k: 'lecture' }
  | { readonly k: 'lue'; readonly r: SoireeLueReponse }
  | { readonly k: 'echec' };

export function FormulaireSoiree({ villeInitiale, onAjoutee, onAnnuler }: Props) {
  const [villes, setVilles] = useState<Ville[]>([]);
  const [ville, setVille] = useState<Ville | null>(villeInitiale);
  const [lienColle, setLienColle] = useState('');
  const [lecture, setLecture] = useState<Lecture>({ k: 'repos' });
  const [ficheOuverte, setFicheOuverte] = useState(false);
  const [form, setForm] = useState<Champs>({ ...VIDE });
  const [details, setDetails] = useState(false);
  const [affiche, setAffiche] = useState<{ fichier: File; apercu: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const idLien = useId();
  const formLien = useRef<HTMLFormElement>(null);

  useEffect(() => {
    void toutesLesVilles().then((v) => {
      setVilles(v);
      setVille((avant) => avant ?? v.find((x) => x.slug === 'montreal-ca') ?? v[0] ?? null);
    });
  }, []);

  useEffect(
    () => () => {
      if (affiche) URL.revokeObjectURL(affiche.apercu);
    },
    [affiche]
  );

  const champ = (k: keyof Champs) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const choisirAffiche = (f: File | null): void => {
    if (!f) return;
    setAffiche({ fichier: f, apercu: URL.createObjectURL(f) });
  };

  const lire = async (): Promise<void> => {
    const lien = lienColle.trim();
    if (!lien) return;
    setLecture({ k: 'lecture' });
    setMessage(null);
    try {
      const r = await lireSoireeDuLien(lien);
      setForm({
        titre: r.titre ?? '',
        jour: r.jour ?? '',
        heure: r.heure ?? '',
        lieu: r.lieu ?? '',
        adresse: r.adresse ?? '',
        artistes: r.artistes.join(', '),
        genres: r.genres.join(', '),
        lien,
        description: r.description ?? '',
        prix: r.prix ?? '',
        organisateur: r.organisateur ?? '',
      });
      setDetails(Boolean(r.prix || r.organisateur));
      if (r.ville) {
        const trouvee = villes.find((v) => cleDeVille(v.name) === cleDeVille(r.ville ?? '') || cleDeVille(v.name_ascii) === cleDeVille(r.ville ?? ''));
        if (trouvee) setVille(trouvee);
      }
      if (r.afficheDonnees) choisirAffiche(fichierDeBase64(r.afficheDonnees));
      setLecture({ k: 'lue', r });
      setFicheOuverte(true);
    } catch {
      setLecture({ k: 'echec' });
      setForm((f) => ({ ...f, lien }));
      setFicheOuverte(true);
    }
  };

  const decouper = (x: string): string[] =>
    x
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const enregistrer = async (): Promise<void> => {
    if (!ville) return;
    if (!form.titre.trim() || !form.jour || !form.heure) {
      setMessage(t.ilFautTitreEtDate);
      return;
    }
    setOccupe(true);
    setMessage(null);
    try {
      let chemin: string | null = null;
      if (affiche) chemin = await deposerPochette(await compresserPochette(affiche.fichier));
      const debut = instantLocal(form.jour, form.heure, ville.timezone ?? 'America/Toronto');
      const s = await ajouterSoiree({
        ville_id: ville.id,
        titre: form.titre.trim(),
        debut: debut.toISOString(),
        lieu: form.lieu.trim() || null,
        adresse: form.adresse.trim() || null,
        artistes: decouper(form.artistes),
        genres: decouper(form.genres),
        lien: form.lien.trim() || null,
        affiche: urlPochette(chemin),
        description: form.description.trim() || null,
        prix: form.prix.trim() || null,
        organisateur: form.organisateur.trim() || null,
        source: 'membre',
      });
      setForm({ ...VIDE });
      setAffiche(null);
      setLienColle('');
      setLecture({ k: 'repos' });
      setFicheOuverte(false);
      setOccupe(false);
      onAjoutee(s);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.enregistrementImpossible);
      setOccupe(false);
    }
  };

  /* CE QUE LA LECTURE A DIT, en une ligne au-dessus de la fiche. */
  const bilan = useMemo((): { texte: string; ton: 'ok' | 'attention' } | null => {
    if (lecture.k === 'echec') return { texte: t.lectureImpossibleLien, ton: 'attention' };
    if (lecture.k !== 'lue') return null;
    const r = lecture.r;
    if (r.deja) return { texte: t.dejaAuCalendrier, ton: 'attention' };
    if (r.lisible === false || !r.titre) return { texte: t.pageIllisible, ton: 'attention' };
    return { texte: t.ficheRemplie(NOM_DE_SOURCE[r.source] ?? t.laPage), ton: 'ok' };
  }, [lecture]);

  const lue = lecture.k === 'lue';
  const manque = (v: string): boolean => lue && !v.trim();

  return (
    <div className="fs">
      <form
        ref={formLien}
        className="fs-lien"
        onSubmit={(e) => {
          e.preventDefault();
          void lire();
        }}
      >
        <label className="fs-lien-etiquette" htmlFor={idLien}>
          {t.collerLeLien}
        </label>
        <div className="fs-lien-rangee">
          <input
            id={idLien}
            type="url"
            inputMode="url"
            value={lienColle}
            placeholder="https://www.facebook.com/events/…"
            onChange={(e) => setLienColle(e.target.value)}
            onPaste={(e) => {
              /* COLLER SUFFIT : la lecture part toute seule, on ne demande
                 pas un second geste a qui vient de dire ce qu'il voulait. */
              const colle = e.clipboardData.getData('text').trim();
              if (/^https?:\/\//.test(colle)) {
                e.preventDefault();
                setLienColle(colle);
                window.setTimeout(() => formLien.current?.requestSubmit(), 0);
              }
            }}
          />
          <button type="submit" className="fs-principal" disabled={!lienColle.trim() || lecture.k === 'lecture'}>
            {lecture.k === 'lecture' ? t.lectureDeLaPage : t.remplir}
          </button>
        </div>
        <p className="fs-aide">{t.lienAide}</p>
        {!ficheOuverte && (
          <button type="button" className="fs-lien-main" onClick={() => setFicheOuverte(true)}>
            {t.remplirALaMain}
          </button>
        )}
      </form>

      {ficheOuverte && (
        <form
          className="fs-fiche"
          onSubmit={(e) => {
            e.preventDefault();
            void enregistrer();
          }}
        >
          {bilan && (
            <p className="fs-bilan" data-ton={bilan.ton} role="status">
              {bilan.texte}
            </p>
          )}

          <div className="fs-grille">
            {/* L'AFFICHE A GAUCHE, EN GRAND : c'est ce qui dit le plus vite si
                la lecture a pris la bonne soiree. */}
            <div className="fs-affiche">
              {affiche ? (
                <img className="fs-affiche-image" src={affiche.apercu} alt="" />
              ) : (
                <span className="fs-affiche-vide" aria-hidden="true" />
              )}
              <div className="fs-affiche-actions">
                <label className="fs-secondaire">
                  {affiche ? t.changerLAffiche : t.choisirUneAffiche}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => choisirAffiche(e.target.files?.[0] ?? null)}
                  />
                </label>
                {affiche && (
                  <button type="button" className="fs-lien-discret" onClick={() => setAffiche(null)}>
                    {t.retirerLAffiche}
                  </button>
                )}
              </div>
            </div>

            <div className="fs-champs">
              <label className="fs-champ fs-champ-titre">
                <span>{t.titreLibelle}</span>
                <input type="text" value={form.titre} maxLength={200} required onChange={champ('titre')} />
              </label>

              <div className="fs-deux">
                <label className="fs-champ">
                  <span>{t.dateLibelle}</span>
                  <input type="date" value={form.jour} required onChange={champ('jour')} />
                </label>
                <label className="fs-champ" data-manque={manque(form.heure)}>
                  <span>
                    {t.heureLibelle}
                    {manque(form.heure) && <em>{t.aCompleter}</em>}
                  </span>
                  <input type="time" value={form.heure} required onChange={champ('heure')} />
                </label>
              </div>
              {manque(form.heure) && <p className="fs-note">{t.heureAVerifier}</p>}

              <div className="fs-deux">
                <label className="fs-champ">
                  <span>{t.villeLibelle}</span>
                  <select
                    value={ville?.id ?? ''}
                    onChange={(e) => setVille(villes.find((v) => v.id === e.target.value) ?? null)}
                  >
                    {villes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fs-champ" data-manque={manque(form.lieu)}>
                  <span>
                    {t.salleLibelle}
                    {manque(form.lieu) && <em>{t.aCompleter}</em>}
                  </span>
                  <input type="text" value={form.lieu} maxLength={120} onChange={champ('lieu')} />
                </label>
              </div>

              <label className="fs-champ">
                <span>{t.adresseLibelle}</span>
                <input type="text" value={form.adresse} maxLength={200} onChange={champ('adresse')} />
              </label>

              <label className="fs-champ">
                <span>{t.artistesSepares}</span>
                <input type="text" value={form.artistes} onChange={champ('artistes')} />
              </label>

              <label className="fs-champ">
                <span>{t.stylesSepares}</span>
                <input type="text" value={form.genres} onChange={champ('genres')} />
              </label>

              <label className="fs-champ">
                <span>{t.lienBillets}</span>
                <input type="url" inputMode="url" value={form.lien} onChange={champ('lien')} />
              </label>

              <label className="fs-champ">
                <span>{t.annonceLibelle}</span>
                <textarea value={form.description} rows={4} maxLength={2000} onChange={champ('description')} />
              </label>

              <details className="fs-details" open={details} onToggle={(e) => setDetails((e.target as HTMLDetailsElement).open)}>
                <summary>{t.prixEtOrganisateur}</summary>
                <div className="fs-deux">
                  <label className="fs-champ">
                    <span>{t.prixLibelle}</span>
                    <input type="text" value={form.prix} maxLength={80} onChange={champ('prix')} />
                  </label>
                  <label className="fs-champ">
                    <span>{t.organisateurLibelle}</span>
                    <input type="text" value={form.organisateur} maxLength={160} onChange={champ('organisateur')} />
                  </label>
                </div>
              </details>
            </div>
          </div>

          <div className="fs-pied">
            <button type="submit" className="fs-principal" disabled={occupe}>
              {occupe ? t.enregistrementEnCours : t.ajouterLaSoiree}
            </button>
            <button
              type="button"
              className="fs-secondaire"
              onClick={() => {
                setFicheOuverte(false);
                setForm({ ...VIDE });
                setAffiche(null);
                setLecture({ k: 'repos' });
                onAnnuler?.();
              }}
            >
              {t.annuler}
            </button>
          </div>
          {message && (
            <p className="fs-message" role="status">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
