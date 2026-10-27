/* LES STATISTIQUES : celles du site, pour la moderation, et celles de ses
 * mixtapes, pour chaque artiste.
 *
 * Mika, le 27 octobre 2026 : « je veux des stats completes de consultation
 * du site dans mon interface admin, fais-moi un onglet pour ca », et pour qui
 * depose une mixtape « des stats completes : combien de listens, d'ou
 * viennent ses listeners, toutes les infos pour lui ».
 *
 * La mesure est decrite dans lib/mesure.ts, les chiffres viennent de
 * lib/statistiques.ts. Ici, seulement les dessiner :
 *   - des tuiles pour les totaux, avec l'ecart a la periode d'avant ;
 *   - une colonne de barres par jour (une seule teinte, l'accent), avec
 *     l'infobulle au survol et le tableau des valeurs pour les lecteurs
 *     d'ecran ;
 *   - des classements en barres horizontales (pays, villes, sources...).
 * Les chiffres sont ecrits dans l'encre du texte, jamais dans la teinte des
 * barres. */

import { useEffect, useMemo, useState } from 'react';
import { mmss, setsPublics } from '../lib/sets.ts';
import { usePresence } from '../lib/presence.ts';
import {
  nomDeSource,
  regrouper,
  statsMesMixtapes,
  statsSite,
  type StatsArtiste,
  type StatsSite as Donnees,
} from '../lib/statistiques.ts';
import { langue, t } from '../langue/langue.ts';
import './stats.css';

const PERIODES = [7, 30, 90, 365] as const;
const NOMBRE = new Intl.NumberFormat(langue === 'fr' ? 'fr-CA' : 'en-CA');
const JOUR = new Intl.DateTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const PAYS = (() => {
  try {
    return new Intl.DisplayNames([langue === 'fr' ? 'fr' : 'en'], { type: 'region' });
  } catch {
    return null;
  }
})();
const nomDuPays = (code: string): string => (code ? (PAYS?.of(code.toUpperCase()) ?? code) : t.statsInconnu);
const nomDAppareil = (a: string): string =>
  a === 'mobile' ? t.statsMobile : a === 'tablette' ? t.statsTablette : a === 'ordinateur' ? t.statsOrdinateur : t.statsInconnu;

/* ═══ LES PIECES ═══ */

function Periode({ jours, onJours }: { jours: number; onJours: (j: number) => void }) {
  return (
    <div className="st-periode" role="tablist" aria-label={t.statsPeriode}>
      {PERIODES.map((p) => (
        <button key={p} type="button" role="tab" aria-selected={jours === p} className="st-periode-choix" onClick={() => onJours(p)}>
          {p === 365 ? t.statsUnAn : t.statsNJours(p)}
        </button>
      ))}
    </div>
  );
}

function Tuile({ libelle, valeur, avant }: { libelle: string; valeur: string; avant?: { maintenant: number; avant: number } }) {
  let ecart: string | null = null;
  if (avant && avant.avant > 0) {
    const p = Math.round(((avant.maintenant - avant.avant) / avant.avant) * 100);
    ecart = `${p > 0 ? '+' : ''}${p} % ${t.statsVsAvant}`;
  }
  return (
    <div className="st-tuile">
      <span className="st-tuile-libelle">{libelle}</span>
      <span className="st-tuile-valeur">{valeur}</span>
      {ecart && <span className="st-tuile-ecart">{ecart}</span>}
    </div>
  );
}

interface Point {
  readonly cle: string;
  readonly etiquette: string;
  readonly valeur: number;
  readonly detail: string;
}

/** Une barre par point, une seule teinte, l'infobulle au survol. */
function Barres({ titre, points, unite }: { titre: string; points: readonly Point[]; unite: string }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.valeur));
  const actif = survol !== null ? points[survol] : null;
  return (
    <figure className="st-figure">
      <figcaption className="st-titre">{titre}</figcaption>
      <div className="st-barres-cadre">
        <span className="st-barres-max">
          {NOMBRE.format(max)} {unite}
        </span>
        <div className="st-barres" onMouseLeave={() => setSurvol(null)}>
          {points.map((p, i) => (
            <div
              key={p.cle}
              className="st-barre"
              onMouseEnter={() => setSurvol(i)}
              onFocus={() => setSurvol(i)}
              tabIndex={0}
              aria-label={`${p.etiquette} : ${p.detail}`}
            >
              <span className="st-barre-plein" style={{ height: `${Math.max(p.valeur > 0 ? 3 : 0, (p.valeur / max) * 100)}%` }} />
            </div>
          ))}
        </div>
        {actif && (
          <div className="st-infobulle" style={{ left: `${((survol ?? 0) + 0.5) * (100 / points.length)}%` }} role="status">
            <strong>{actif.etiquette}</strong>
            <span>{actif.detail}</span>
          </div>
        )}
      </div>
      <div className="st-barres-axe" aria-hidden="true">
        <span>{points[0]?.etiquette}</span>
        <span>{points[points.length - 1]?.etiquette}</span>
      </div>
      <table className="st-cache">
        <caption>{titre}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.cle}>
              <th scope="row">{p.etiquette}</th>
              <td>{p.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Un classement : le nom, la valeur, et une barre fine a la proportion du
    premier. */
function Classement({ titre, lignes, vide }: { titre: string; lignes: readonly { nom: string; valeur: number; detail?: string }[]; vide?: string }) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));
  return (
    <section className="st-classement" aria-label={titre}>
      <h3 className="st-titre">{titre}</h3>
      {lignes.length === 0 ? (
        <p className="st-vide">{vide ?? t.statsRienEncore}</p>
      ) : (
        <ol>
          {lignes.map((l) => (
            <li key={l.nom}>
              <span className="st-ligne-nom">{l.nom}</span>
              <span className="st-ligne-valeur">
                {NOMBRE.format(l.valeur)}
                {l.detail ? <span className="st-ligne-detail"> {l.detail}</span> : null}
              </span>
              <span className="st-ligne-barre" aria-hidden="true">
                <span style={{ width: `${(l.valeur / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* LE NOM D'UNE PAGE, LISIBLE. Les chemins sont ceux de l'ancre (#/news/...). */
const joli = (slug: string): string => {
  const s = slug.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
function nomDePage(chemin: string, titres: ReadonlyMap<string, string>): string {
  const p = t.pagesDuSite;
  if (chemin === '/' || chemin === '#/' || chemin === '') return p.accueil;
  const c = chemin.replace(/^#/, '');
  const mixtape = c.match(/^\/mixtapes\/([0-9a-f-]{36})$/);
  if (mixtape) return t.pageEtDetail(p.mixtape, titres.get(mixtape[1] ?? '') ?? (mixtape[1] ?? '').slice(0, 8));
  if (/^\/mixtapes\/a\//.test(c)) return p.artiste;
  if (c.startsWith('/mixtapes')) return p.mixtapes;
  const marque = c.match(/^\/news\/marques\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
  if (marque) return t.pageEtDetail(p.marques, `${joli(marque[1] ?? '')}${marque[2] ? ` ${joli(marque[2])}` : ''}`);
  if (c === '/news/marques') return p.marques;
  if (c === '/news/suivis') return p.suivis;
  if (c.startsWith('/news/lire')) return p.lecture;
  if (c.startsWith('/news')) return p.news;
  if (c.startsWith('/calendrier')) return p.calendrier;
  if (c.startsWith('/parcourir') || c.startsWith('/styles')) return p.atlas;
  const label = c.match(/^\/labels\/([a-z0-9-]+)$/);
  if (label) return t.pageEtDetail(p.labels, joli(label[1] ?? ''));
  if (c.startsWith('/labels')) return p.labels;
  if (c.startsWith('/profil')) return p.profil;
  if (c.startsWith('/admin')) return p.admin;
  if (c.startsWith('/reconnaitre')) return p.trackid;
  return chemin;
}

function useStats<T>(lire: (jours: number) => Promise<T>, jours: number): { donnees: T | null; erreur: string | null } {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    let vivant = true;
    setDonnees(null);
    setErreur(null);
    lire(jours)
      .then((d) => vivant && setDonnees(d))
      .catch((e: unknown) => vivant && setErreur(e instanceof Error ? e.message : String(e)));
    return () => {
      vivant = false;
    };
  }, [lire, jours]);
  return { donnees, erreur };
}

/* ═══ LE SITE, POUR LA MODERATION ═══ */
export function StatsSite() {
  const [jours, setJours] = useState(30);
  const { donnees: d, erreur } = useStats<Donnees>(statsSite, jours);
  const presence = usePresence();
  const [titres, setTitres] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    void setsPublics().then((x) => setTitres(new Map(x.map((s) => [s.id, s.titre]))));
  }, []);

  const sources = useMemo(() => (d ? regrouper(d.referents, (r) => nomDeSource(r.referent, t.statsDirect), (r) => r.sessions).slice(0, 12) : []), [d]);

  return (
    <div className="st">
      <div className="st-tete">
        <p className="st-direct">
          <span className="st-point" aria-hidden="true" />
          {t.statsEnCeMoment(presence.n)}
          {presence.villes.length > 0 && <span className="st-direct-villes"> · {presence.villes.slice(0, 4).map((v) => `${v.ville} (${v.n})`).join(', ')}</span>}
        </p>
        <Periode jours={jours} onJours={setJours} />
      </div>
      <p className="st-note">{t.statsNoteSite}</p>

      {erreur && <p className="st-vide">{erreur}</p>}
      {!d && !erreur && <p className="st-vide">{t.chargement}</p>}
      {d && (
        <>
          <div className="st-tuiles">
            <Tuile libelle={t.statsVisiteurs} valeur={NOMBRE.format(d.visiteurs)} avant={{ maintenant: d.visiteurs, avant: d.visiteurs_avant }} />
            <Tuile libelle={t.statsPagesVues} valeur={NOMBRE.format(d.vues)} avant={{ maintenant: d.vues, avant: d.vues_avant }} />
            <Tuile libelle={t.statsSessions} valeur={NOMBRE.format(d.sessions)} />
            <Tuile libelle={t.statsPagesParSession} valeur={d.sessions > 0 ? (d.vues / d.sessions).toFixed(1).replace('.', langue === 'fr' ? ',' : '.') : '0'} />
          </div>
          <Barres
            titre={t.statsVisiteursParJour}
            unite={t.statsVisiteursMot}
            points={d.par_jour.map((x) => ({
              cle: x.jour,
              etiquette: JOUR.format(new Date(x.jour)),
              valeur: x.visiteurs,
              detail: t.statsDetailJour(x.visiteurs, x.vues),
            }))}
          />
          <div className="st-grille">
            <Classement titre={t.statsPages} lignes={d.pages.slice(0, 15).map((p) => ({ nom: nomDePage(p.chemin, titres), valeur: p.vues }))} />
            <Classement titre={t.statsSources} lignes={sources} />
            <Classement titre={t.statsPays} lignes={d.pays.map((p) => ({ nom: nomDuPays(p.pays), valeur: p.visiteurs }))} />
            <Classement titre={t.statsVilles} lignes={d.villes.map((v) => ({ nom: `${v.ville}${v.pays ? `, ${v.pays}` : ''}`, valeur: v.visiteurs }))} />
            <Classement titre={t.statsAppareils} lignes={d.appareils.map((a) => ({ nom: nomDAppareil(a.appareil), valeur: a.visiteurs }))} />
            <Classement titre={t.statsLangues} lignes={d.langues.map((l) => ({ nom: l.langue || t.statsInconnu, valeur: l.visiteurs }))} />
            <Classement
              titre={t.statsMixtapesEcoutees}
              lignes={d.mixtapes.map((m) => ({ nom: m.titre, valeur: m.auditeurs, detail: t.statsMinutesCourt(m.minutes) }))}
            />
          </div>
          <Barres
            titre={t.statsHeures}
            unite={t.statsPagesVuesMot}
            points={Array.from({ length: 24 }, (_, h) => {
              const v = d.heures.find((x) => x.heure === h)?.vues ?? 0;
              return { cle: String(h), etiquette: `${h} h`, valeur: v, detail: t.statsDetailHeure(v) };
            })}
          />
        </>
      )}
    </div>
  );
}

/* ═══ UN ARTISTE, SUR SES MIXTAPES ═══ */
export function StatsArtiste() {
  const [jours, setJours] = useState(30);
  const { donnees: d, erreur } = useStats<StatsArtiste>(statsMesMixtapes, jours);
  const sources = useMemo(() => (d ? regrouper(d.sources, (s) => nomDeSource(s.source, t.statsDirect), (s) => s.auditeurs) : []), [d]);

  return (
    <div className="st">
      <div className="st-tete">
        <h2 className="st-grand-titre">{t.statsMesEcoutes}</h2>
        <Periode jours={jours} onJours={setJours} />
      </div>
      <p className="st-note">{t.statsNoteArtiste}</p>

      {erreur && <p className="st-vide">{erreur}</p>}
      {!d && !erreur && <p className="st-vide">{t.chargement}</p>}
      {d && (
        <>
          <div className="st-tuiles">
            <Tuile libelle={t.statsEcoutesTotal} valeur={NOMBRE.format(d.ecoutes_total)} />
            <Tuile libelle={t.statsAuditeurs} valeur={NOMBRE.format(d.auditeurs)} />
            <Tuile libelle={t.statsMinutesEcoutees} valeur={NOMBRE.format(d.minutes)} />
            <Tuile libelle={t.statsDureeMoyenne} valeur={mmss(d.moyenne_s)} />
            <Tuile libelle={t.statsEcoutesCompletes} valeur={NOMBRE.format(d.completes)} />
            <Tuile libelle={t.statsVuesDeMesPages} valeur={NOMBRE.format(d.vues_pages)} />
            <Tuile libelle={t.jAimeMot} valeur={NOMBRE.format(d.likes)} />
            <Tuile libelle={t.statsCommentaires} valeur={NOMBRE.format(d.commentaires)} />
          </div>
          <Barres
            titre={t.statsAuditeursParJour}
            unite={t.statsAuditeursMot}
            points={d.par_jour.map((x) => ({
              cle: x.jour,
              etiquette: JOUR.format(new Date(x.jour)),
              valeur: x.auditeurs,
              detail: t.statsDetailEcoute(x.auditeurs, x.minutes),
            }))}
          />
          <div className="st-grille">
            <Classement
              titre={t.statsPays}
              lignes={d.pays.map((p) => ({ nom: nomDuPays(p.pays), valeur: p.auditeurs, detail: t.statsMinutesCourt(p.minutes) }))}
            />
            <Classement titre={t.statsVilles} lignes={d.villes.map((v) => ({ nom: `${v.ville}${v.pays ? `, ${v.pays}` : ''}`, valeur: v.auditeurs }))} />
            <Classement titre={t.statsSourcesEcoute} lignes={sources} />
            <Classement titre={t.statsAppareils} lignes={d.appareils.map((a) => ({ nom: nomDAppareil(a.appareil), valeur: a.auditeurs }))} />
          </div>
          <section className="st-classement st-tableau" aria-label={t.statsParMixtape}>
            <h3 className="st-titre">{t.statsParMixtape}</h3>
            <div className="st-defile">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t.statsMixtape}</th>
                    <th scope="col">{t.statsEcoutesTotal}</th>
                    <th scope="col">{t.statsAuditeurs}</th>
                    <th scope="col">{t.statsMinutesEcoutees}</th>
                    <th scope="col">{t.statsDureeMoyenne}</th>
                    <th scope="col">{t.jAimeMot}</th>
                    <th scope="col">{t.statsCommentaires}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.mixtapes.map((m) => (
                    <tr key={m.id}>
                      <th scope="row">
                        <a href={`#/mixtapes/${m.id}`}>{m.titre}</a>
                      </th>
                      <td>{NOMBRE.format(m.ecoutes)}</td>
                      <td>{NOMBRE.format(m.auditeurs)}</td>
                      <td>{NOMBRE.format(m.minutes)}</td>
                      <td>{mmss(m.moyenne_s)}</td>
                      <td>{NOMBRE.format(m.likes)}</td>
                      <td>{NOMBRE.format(m.commentaires)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
