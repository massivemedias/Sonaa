/* LE COURS D'UN STYLE : comment on le produit. Voir src/lib/cours.ts pour la
   provenance des textes.

   ═══ CE QUI SE VOIT AVANT CE QUI SE LIT, DEPUIS LE 1er OCTOBRE 2026 ═══

   Mika : « Produire ce style, c'est pas attrayant du tout ! Faut mettre des
   images de machines a utiliser, des exemples, des schemas, quelque chose.
   Et arrange aussi le desktop, je trouve ca moche dans la lisibilite. »

   Le cours etait six paragraphes de 120 caracteres de large. Il garde son
   texte, et gagne trois choses qui en sont tirees :

   - LE TEMPO SUR UNE REGLE, de 60 a 200 BPM, la plage du style allumee.
   - LA BATTERIE SUR UNE GRILLE de seize pas, qu'on peut ECOUTER : une petite
     boite a rythmes la joue au tempo du cours (lib/boite-a-rythmes.ts). La
     grille a ete lue dans le texte du cours ; un cours qui ne place aucun
     coup n'en a pas.
   - LES MACHINES EN PHOTO, celles que le cours cite et dont Wikimedia
     Commons a une photo libre, avec leur credit.

   SUR ORDINATEUR, DEUX COLONNES : le texte a gauche, borne a 68 signes, la
   mesure d'une ligne qui se lit sans perdre le debut ; les schemas et les
   machines a droite. Sur telephone, les schemas passent devant le texte. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  coursDuGenre,
  motifDuGenre,
  photoDeMachine,
  tempoDuCours,
  type Cours,
  type PisteDeMotif,
} from "../lib/cours.ts";
import { jouerMotif } from "../lib/boite-a-rythmes.ts";
import { t } from "../langue/langue.ts";
import MACHINES from "../data/machines.json";
import "./cours.css";

interface Photo {
  readonly fichier: string;
  readonly auteur: string;
  readonly licence: string;
  readonly source: string;
}
const CATALOGUE = MACHINES as Record<string, Photo>;
const CLES = Object.keys(CATALOGUE);

const NOM_INSTRUMENT: Record<PisteDeMotif["id"], string> = {
  kick: t.instrKick,
  caisse: t.instrCaisse,
  clap: t.instrClap,
  rim: t.instrRim,
  charley: t.instrCharley,
  charleyOuvert: t.instrCharleyOuvert,
  ride: t.instrRide,
  perc: t.instrPerc,
};

const NOM_OUTIL: Record<string, string> = {
  machine: t.outilMachine,
  plugin: t.outilPlugin,
  daw: t.outilDaw,
  samples: t.outilSamples,
  materiel: t.outilMateriel,
};

/* ═══ LA REGLE DU TEMPO ═══ */
function RegleTempo({ tempo }: { tempo: readonly [number, number] | null }) {
  if (!tempo) {
    return (
      <div className="cours-bloc cours-tempo">
        <h3 className="cours-bloc-titre">{t.coursRegleTitre}</h3>
        <p className="cours-tempo-libre">{t.coursSansTempo}</p>
      </div>
    );
  }
  const [a, b] = tempo;
  const bas = 60;
  const haut = Math.max(200, b + 10);
  const x = (v: number): number =>
    ((Math.min(Math.max(v, bas), haut) - bas) / (haut - bas)) * 100;
  const reperes = [60, 90, 120, 150, 180].filter((v) => v < haut);
  return (
    <div className="cours-bloc cours-tempo">
      <h3 className="cours-bloc-titre">{t.coursRegleTitre}</h3>
      <p className="cours-tempo-chiffre">
        {a === b ? a : t.coursPlageBpm(a, b)}
        <span> BPM</span>
      </p>
      <div className="cours-regle" aria-hidden="true">
        <span
          className="cours-regle-plage"
          style={{ left: `${x(a)}%`, width: `${Math.max(x(b) - x(a), 1.6)}%` }}
        />
        {reperes.map((v) => (
          <span
            key={v}
            className="cours-regle-repere"
            style={{ left: `${x(v)}%` }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══ LA GRILLE, ET SON ECOUTE ═══ */
function GrilleRythmique({
  pistes,
  bpm,
}: {
  pistes: readonly PisteDeMotif[];
  bpm: number;
}) {
  const [pas, setPas] = useState(-1);
  const arret = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      arret.current?.();
      arret.current = null;
    },
    [pistes],
  );
  const longueur = pistes[0]?.pas.length ?? 16;
  const mesures = Array.from({ length: Math.ceil(longueur / 16) }, (_, m) => m);
  const joue = pas >= 0;

  return (
    <div className="cours-bloc cours-grille">
      <h3 className="cours-bloc-titre">{t.coursGrilleTitre}</h3>
      {mesures.map((m) => (
        <div className="cours-mesure" key={m}>
          {mesures.length > 1 && (
            <p className="cours-mesure-nom">{t.coursMesure(m + 1)}</p>
          )}
          <div className="cours-rangee cours-rangee-temps" aria-hidden="true">
            <span />
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="cours-temps">
                {i % 4 === 0 ? i / 4 + 1 : ""}
              </span>
            ))}
          </div>
          {pistes.map((p) => (
            <div className="cours-rangee" key={p.id}>
              <span className="cours-instrument">{NOM_INSTRUMENT[p.id]}</span>
              {Array.from(p.pas.slice(m * 16, m * 16 + 16)).map((c, i) => (
                <span
                  key={i}
                  className="cours-case"
                  data-coup={
                    c === "X"
                      ? "fort"
                      : c === "x"
                        ? "oui"
                        : c === "."
                          ? "fantome"
                          : "non"
                  }
                  data-actif={pas === m * 16 + i}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
      <div className="cours-grille-pied">
        <button
          type="button"
          className="cours-ecouter"
          aria-pressed={joue}
          onClick={() => {
            if (arret.current) {
              arret.current();
              arret.current = null;
              return;
            }
            arret.current = jouerMotif(pistes, bpm, setPas);
          }}
        >
          <span
            className="cours-ecouter-icone"
            aria-hidden="true"
            data-joue={joue}
          />
          {joue ? t.coursArreterMotif : t.coursEcouterMotif(bpm)}
        </button>
        <p className="cours-aide">{t.coursGrilleAide}</p>
      </div>
    </div>
  );
}

/* ═══ UN MORCEAU A ECOUTER ═══ « Artiste : Titre (annee) : pourquoi ». */
function Repere({ texte }: { texte: string }) {
  const [artiste, titre, ...reste] = texte.split(" : ");
  if (!artiste || !titre) return <li className="cours-repere">{texte}</li>;
  const sansAnnee = titre.replace(/\s*\(\d{4}\)\s*$/, "");
  return (
    <li className="cours-repere">
      <span className="cours-repere-titre">{titre}</span>
      <span className="cours-repere-artiste">{artiste}</span>
      {reste.length > 0 && (
        <span className="cours-repere-pourquoi">{reste.join(" : ")}</span>
      )}
      <a
        className="cours-repere-lien"
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${artiste} ${sansAnnee}`)}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        {t.coursEcouterRepere}
      </a>
    </li>
  );
}

interface Props {
  readonly genreId: string;
  /** Le tuto du corpus, quand il existe : il remplace les six rubriques. */
  readonly tuto?: readonly { readonly titre: string; readonly texte: string }[];
}

export function CoursDuStyle({ genreId, tuto = [] }: Props) {
  const [cours, setCours] = useState<Cours | null | "chargement">("chargement");
  const [motif, setMotif] = useState<readonly PisteDeMotif[] | null>(null);
  useEffect(() => {
    let vivant = true;
    setCours("chargement");
    setMotif(null);
    void coursDuGenre(genreId).then((c) => {
      if (vivant) setCours(c);
    });
    void motifDuGenre(genreId).then((m) => {
      if (vivant) setMotif(m);
    });
    return () => {
      vivant = false;
    };
  }, [genreId]);

  const tempo = useMemo(
    () => (cours && cours !== "chargement" ? tempoDuCours(cours.tempo) : null),
    [cours],
  );

  /* LES OUTILS AVEC PHOTO D'UN COTE, LES AUTRES DE L'AUTRE. Une machine sans
     photo libre et un plugin restent dans la liste, sous les photos. */
  const outils = useMemo(() => {
    if (!cours || cours === "chargement") return { photos: [], autres: [] };
    const photos: {
      nom: string;
      type: string;
      pourquoi: string;
      photo: Photo;
    }[] = [];
    const autres: { nom: string; type: string; pourquoi: string }[] = [];
    const vues = new Set<string>();
    for (const o of cours.outils ?? []) {
      const cle =
        o.type === "machine" || o.type === "materiel"
          ? photoDeMachine(o.nom, CLES)
          : null;
      const photo = cle ? CATALOGUE[cle] : undefined;
      if (photo && cle && !vues.has(cle)) {
        vues.add(cle);
        photos.push({ ...o, photo });
      } else autres.push(o);
    }
    return { photos, autres };
  }, [cours]);

  if (cours === "chargement")
    return <p className="pv-cours-note">{t.chargement}</p>;
  if (!cours && tuto.length === 0)
    return <p className="pv-cours-note">{t.coursEnPreparation}</p>;

  /* LES RUBRIQUES : celles du tuto s'il y en a, sinon les six du cours. */
  const rubriques: readonly [string, string][] =
    tuto.length > 0
      ? tuto.map((s) => [s.titre, s.texte] as [string, string])
      : cours
        ? [
            [t.coursTempo, cours.tempo],
            [t.coursRythme, cours.rythme],
            [t.coursBasse, cours.basse],
            [t.coursSons, cours.sons],
            [t.coursArrangement, cours.arrangement],
            [t.coursMix, cours.mix],
          ]
        : [];
  const bpm = tempo ? Math.round((tempo[0] + tempo[1]) / 2) : 120;

  return (
    <article className="cours">
      {cours && (
        <aside className="cours-planche">
          <RegleTempo tempo={tempo} />
          {motif && motif.length > 0 && (
            <GrilleRythmique pistes={motif} bpm={bpm} />
          )}
          {outils.photos.length > 0 && (
            <div className="cours-bloc cours-machines">
              <h3 className="cours-bloc-titre">{t.coursMachinesTitre}</h3>
              <ul className="cours-machines-liste">
                {outils.photos.map((o) => (
                  <li key={o.nom} className="cours-machine">
                    <img
                      src={`${import.meta.env.BASE_URL}${o.photo.fichier}`}
                      alt={o.nom}
                      loading="lazy"
                    />
                    <div className="cours-machine-texte">
                      <span className="cours-machine-nom">{o.nom}</span>
                      <span className="cours-machine-pourquoi">
                        {o.pourquoi}
                      </span>
                      <a
                        className="cours-machine-credit"
                        href={o.photo.source}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {o.photo.auteur} · {o.photo.licence}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}

      <div className="cours-texte">
        {tuto.length === 0 && <p className="cours-avis">{t.coursAvis}</p>}
        {rubriques.map(([titre, texte], i) => (
          <section className="cours-section" key={titre}>
            <h3 className="cours-section-titre">
              <span className="cours-numero" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {titre}
            </h3>
            {texte.split("\n\n").map((para, j) => (
              <p key={String(j)}>{para}</p>
            ))}
          </section>
        ))}

        {cours && (
          <>
            <section className="cours-section">
              <h3 className="cours-section-titre">{t.coursEtapes}</h3>
              <ol className="cours-etapes">
                {cours.etapes.map((e, i) => (
                  <li key={String(i)}>
                    <span className="cours-etape-numero" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>{e}</span>
                  </li>
                ))}
              </ol>
            </section>

            {outils.autres.length > 0 && (
              <section className="cours-section">
                <h3 className="cours-section-titre">{t.coursAutresOutils}</h3>
                <ul className="cours-outils">
                  {outils.autres.map((o) => (
                    <li key={o.nom}>
                      <span className="cours-outil-nom">{o.nom}</span>
                      <span className="cours-outil-type">
                        {NOM_OUTIL[o.type] ?? o.type}
                      </span>
                      <span className="cours-outil-pourquoi">{o.pourquoi}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="cours-section">
              <h3 className="cours-section-titre">{t.coursReperes}</h3>
              <ul className="cours-reperes">
                {cours.reperes.map((r, i) => (
                  <Repere key={String(i)} texte={r} />
                ))}
              </ul>
            </section>

            <p className="cours-sources">
              {t.coursSources} :{" "}
              {[...cours.sources, ...(cours.sourcesOutils ?? [])]
                .filter((x, i, a) => a.indexOf(x) === i)
                .join(" · ")}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
