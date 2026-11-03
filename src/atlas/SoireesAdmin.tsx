/* LE PANNEAU DES SOIREES AJOUTEES A LA MAIN, dans l'administration.
 *
 * ═══ POURQUOI UN PANNEAU ET PAS UN BOUTON « SYNCHRONISER » ═══
 *
 * Mika demandait un bouton de synchronisation dans son profil. Il ne peut pas
 * exister sous cette forme : ce qui manque au calendrier vit sur Facebook,
 * dont l'API d'evenements est fermee depuis 2018. Resident Advisor, lui, est
 * deja interroge en direct. Ce panneau est l'endroit ou DEPOSER ce qu'on a
 * lu ailleurs.
 *
 * ═══ LE MEME FORMULAIRE QUE PARTOUT, A COTE DE LA LISTE ═══
 *
 * Mika, le 1er octobre 2026, devant l'ancien formulaire de huit champs bruts
 * colle a gauche : « je ne sais pas ou ajouter la soiree, et en desktop
 * c'est mal foutu, tout est a gauche alors qu'on a la place ». Le panneau
 * prend donc le formulaire commun, qui commence par le lien a coller
 * (FormulaireSoiree.tsx), et l'ecran se partage : ajouter a gauche, la liste
 * a droite, avec une recherche. Sur telephone, l'un sous l'autre.
 *
 * ═══ RESERVE AUX MODERATEURS, ET LA BASE LE SAIT ═══
 *
 * L'affichage ne protege rien : ce sont les politiques RLS qui refusent a qui
 * n'est pas moderateur de retirer la soiree d'un autre. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormulaireSoiree } from "./FormulaireSoiree.tsx";
import { listerMembres } from "../lib/admin.ts";
import { toutesLesVilles } from "../lib/villes.ts";
import type { Ville } from "../lib/ville-active.ts";
import { quandEnLettres } from "../lib/affiche-insta.ts";
import { langue, t } from "../langue/langue.ts";
import {
  supprimerSoiree,
  toutesLesSoireesManuelles,
  type SoireeManuelle,
} from "../lib/soirees-manuelles.ts";
import "./formulaire-soiree.css";

const NOM_DE_SOURCE: Record<string, string> = {
  facebook: "Facebook",
  eventbrite: "Eventbrite",
  lepointdevente: "Lepointdevente",
  ticketmaster: "Ticketmaster",
  shotgun: "Shotgun",
  membre: t.sourceMembre,
  main: t.sourceMain,
};

type Provenance = "toutes" | "membres" | "passes";

const estDeMembre = (s: SoireeManuelle): boolean =>
  Boolean(s.ajoutee_par) || s.source === "membre";

const sansAccents = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function SoireesAdmin() {
  const [villes, setVilles] = useState<Ville[]>([]);
  /* `null` designe « Toutes les villes », pour voir d'un coup d'oeil ce que
     les membres ont depose hors de Montreal. Par defaut : Montreal. */
  const [ville, setVille] = useState<Ville | null>(null);
  const [toutesVilles, setToutesVilles] = useState(false);
  const [provenance, setProvenance] = useState<Provenance>("toutes");
  const [liste, setListe] = useState<SoireeManuelle[]>([]);
  const [nomsMembres, setNomsMembres] = useState<ReadonlyMap<string, string>>(new Map());
  const [terme, setTerme] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void toutesLesVilles().then((v) => {
      setVilles(v);
      /* Montreal par defaut : c'est la ville de Mika, et celle dont il a
         constate les manques. */
      setVille(v.find((x) => x.slug === "montreal-ca") ?? v[0] ?? null);
    });
    void listerMembres()
      .then((membres) => {
        setNomsMembres(
          new Map(membres.map((m) => [m.user_id, m.artiste_nom ?? m.courriel])),
        );
      })
      .catch(() => undefined);
  }, []);

  const recharger = useCallback(() => {
    if (!toutesVilles && !ville) return;
    void toutesLesSoireesManuelles(toutesVilles ? null : ville?.id)
      .then(setListe)
      .catch((e: unknown) =>
        setMessage(e instanceof Error ? e.message : t.lectureImpossible),
      );
  }, [ville, toutesVilles]);

  useEffect(recharger, [recharger]);

  const villesParId = useMemo(
    () => new Map(villes.map((v) => [v.id, v])),
    [villes],
  );

  const aVenirBrut = useMemo(() => {
    const maintenant = Date.now();
    const cherche = sansAccents(terme.trim());
    return liste
      .filter((s) => new Date(s.debut).getTime() >= maintenant)
      .filter(
        (s) =>
          !cherche ||
          sansAccents(`${s.titre} ${s.lieu ?? ""} ${s.note ?? ""}`).includes(cherche),
      );
  }, [liste, terme]);

  const nMembres = useMemo(
    () => aVenirBrut.filter(estDeMembre).length,
    [aVenirBrut],
  );
  const nPasses = aVenirBrut.length - nMembres;

  const aVenir = useMemo(() => {
    if (provenance === "membres") return aVenirBrut.filter(estDeMembre);
    if (provenance === "passes") return aVenirBrut.filter((s) => !estDeMembre(s));
    return aVenirBrut;
  }, [aVenirBrut, provenance]);

  const origineDe = (s: SoireeManuelle): string => {
    if (estDeMembre(s)) {
      const qui = s.ajoutee_par ? (nomsMembres.get(s.ajoutee_par) ?? null) : null;
      return t.ajouteeParMembre(qui);
    }
    const base = t.ajouteeParPasse(NOM_DE_SOURCE[s.source] ?? s.source);
    return s.note ? `${base} (${s.note.replace(/\.$/, "")})` : base;
  };

  const retirer = (s: SoireeManuelle): void => {
    setMessage(null);
    void supprimerSoiree(s.id)
      .then(recharger)
      .catch((e: unknown) =>
        setMessage(e instanceof Error ? e.message : t.enregistrementImpossible),
      );
  };

  return (
    <div className="ev-colonnes">
      <section className="sets-bloc ev-bloc">
        <h2>{t.ajouterUneSoiree}</h2>
        <p className="ev-intro">{t.soireesAdminIntro}</p>
        <FormulaireSoiree
          villeInitiale={ville}
          onAjoutee={() => {
            setMessage(t.soireeAjoutee);
            recharger();
          }}
        />
        {message && (
          <p className="fs-bilan ev-ajoutee" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="sets-bloc ev-bloc">
        <h2>
          {t.soireesAjouteesMain}
          {aVenir.length > 0 && (
            <span className="ev-compte">{aVenir.length}</span>
          )}
        </h2>
        <div className="ev-filtres">
          <label className="fs-champ">
            <span>{t.villeLibelle}</span>
            <select
              value={toutesVilles ? "toutes" : (ville?.id ?? "")}
              onChange={(e) => {
                if (e.target.value === "toutes") {
                  setToutesVilles(true);
                } else {
                  setToutesVilles(false);
                  setVille(villes.find((v) => v.id === e.target.value) ?? null);
                }
              }}
            >
              <option value="toutes">{t.toutesLesVilles}</option>
              {villes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fs-champ">
            <span>{t.provenanceLibelle}</span>
            <select
              value={provenance}
              onChange={(e) => {
                const p = e.target.value as Provenance;
                setProvenance(p);
                /* Si on filtre les membres et qu'il n'y en a aucun dans la
                   ville choisie, on elargit a toutes les villes. */
                if (p === "membres" && nMembres === 0 && !toutesVilles) {
                  setToutesVilles(true);
                }
              }}
            >
              <option value="toutes">{t.provenanceToutes(aVenirBrut.length)}</option>
              <option value="membres">{t.provenanceMembres(nMembres)}</option>
              <option value="passes">{t.provenancePasses(nPasses)}</option>
            </select>
          </label>
          <label className="fs-champ">
            <span>{t.chercherUneSoiree}</span>
            <input
              type="search"
              value={terme}
              onChange={(e) => setTerme(e.target.value)}
            />
          </label>
        </div>
        {aVenir.length === 0 ? (
          <p className="ev-vide">{t.aucuneSoireeDansLaVille}</p>
        ) : (
          <ul className="ev-rangees">
            {aVenir.map((s) => {
              const villeSoiree = villesParId.get(s.ville_id);
              return (
                <li key={s.id} className="ev-rangee">
                  {s.affiche ? (
                    <img
                      className="ev-rangee-affiche"
                      src={s.affiche}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="ev-rangee-affiche" aria-hidden="true" />
                  )}
                  <div className="ev-texte">
                    <span className="ev-quand">
                      {quandEnLettres(
                        s.debut,
                        villeSoiree?.timezone ?? ville?.timezone ?? "America/Toronto",
                        langue,
                      )}
                    </span>
                    <strong className="ev-titre">{s.titre}</strong>
                    <span className="ev-ou">
                      {[
                        toutesVilles ? villeSoiree?.name : null,
                        s.lieu,
                        origineDe(s),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {!s.publiee && <> · {t.soireeDepubliee}</>}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="fs-secondaire ev-retirer"
                    onClick={() => retirer(s)}
                  >
                    {t.retirerCourt}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
