/* LE PANNEAU DES SOIREES AJOUTEES A LA MAIN.
 *
 * ═══ POURQUOI UN PANNEAU ET PAS UN BOUTON « SYNCHRONISER » ═══
 *
 * Mika demandait un bouton de synchronisation dans son profil. Il ne peut pas
 * exister sous cette forme, et la raison est technique, pas une reticence :
 * ce qui manque au calendrier vit sur Facebook, dont l'API d'evenements est
 * fermee depuis 2018, dont les pages exigent une session connectee, et que le
 * navigateur ne peut de toute facon pas interroger depuis sonaa.ca. Un bouton
 * dans cette page n'aurait rien a appeler.
 *
 * CE QUI PEUT ETRE AUTOMATISE L'EST DEJA : Resident Advisor est interroge en
 * direct a chaque ouverture du calendrier, avec un cache d'une heure. Il n'y
 * a rien a synchroniser de ce cote, la page est toujours a jour.
 *
 * CE QUI RESTE EST UN TRAVAIL DE LECTURE. Comparer Facebook et RA demande de
 * juger si « AME @ AWAKEN » est une soiree electronique ou un atelier de
 * bien-etre, si « technoland » est un club ou un salon professionnel. Cette
 * page est donc l'endroit ou DEPOSER le resultat de cette lecture, faite par
 * Mika ou par moi qui pilote son navigateur, et non un bouton qui pretendrait
 * s'en charger seul.
 *
 * ═══ RESERVE AUX MODERATEURS, ET LA BASE LE SAIT ═══
 *
 * L'affichage ne protege rien : ce sont les politiques RLS qui refusent
 * l'ecriture a qui n'est pas moderateur. Cacher le formulaire est une
 * commodite, pas une serrure, et c'est pourquoi il n'y a aucune verification
 * de droit ici en dehors de celle qui decide d'afficher.
 */

import { useCallback, useEffect, useState } from 'react';
import { SelecteurVille } from './SelecteurVille.tsx';
import { toutesLesVilles } from '../lib/villes.ts';
import type { Ville } from '../lib/ville-active.ts';
import {
  ajouterSoiree,
  supprimerSoiree,
  toutesLesSoireesManuelles,
  type SoireeManuelle,
} from '../lib/soirees-manuelles.ts';

const VIDE = {
  titre: '',
  jour: '',
  heure: '22:00',
  lieu: '',
  artistes: '',
  genres: '',
  lien: '',
};

export function SoireesAdmin() {
  const [villes, setVilles] = useState<Ville[]>([]);
  const [ville, setVille] = useState<Ville | null>(null);
  const [liste, setListe] = useState<SoireeManuelle[]>([]);
  const [form, setForm] = useState({ ...VIDE });
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    void toutesLesVilles().then((v) => {
      setVilles(v);
      /* Montreal par defaut : c'est la ville de Mika, et celle dont il a
         constate les manques. Aucune autre n'a de raison d'etre devant. */
      setVille(v.find((x) => x.slug === 'montreal-ca') ?? v[0] ?? null);
    });
  }, []);

  const recharger = useCallback(() => {
    if (!ville) return;
    void toutesLesSoireesManuelles(ville.id)
      .then(setListe)
      .catch((e: unknown) => setMessage(e instanceof Error ? e.message : 'Lecture impossible.'));
  }, [ville]);

  useEffect(recharger, [recharger]);

  const enregistrer = () => {
    if (!ville) return;
    if (!form.titre.trim() || !form.jour) {
      setMessage('Il faut au moins un titre et une date.');
      return;
    }
    setOccupe(true);
    setMessage(null);
    /* LA DATE EST CONSTRUITE COMPOSANTE PAR COMPOSANTE, jamais par
       `new Date('2026-09-12T22:00')` interprete ailleurs : l'heure saisie est
       l'heure de la salle, et c'est celle qu'on veut voir ressortir. */
    const [a, m, j] = form.jour.split('-').map(Number);
    const [h, mn] = form.heure.split(':').map(Number);
    const debut = new Date(a ?? 2026, (m ?? 1) - 1, j ?? 1, h ?? 22, mn ?? 0);

    const decouper = (x: string): string[] =>
      x
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    void ajouterSoiree({
      ville_id: ville.id,
      titre: form.titre.trim(),
      debut: debut.toISOString(),
      lieu: form.lieu.trim() || null,
      artistes: decouper(form.artistes),
      genres: decouper(form.genres),
      lien: form.lien.trim() || null,
      source: 'main',
    })
      .then(() => {
        setForm({ ...VIDE });
        setMessage('Soirée ajoutée. Elle apparaît dans le calendrier tout de suite.');
        recharger();
      })
      .catch((e: unknown) =>
        setMessage(e instanceof Error ? e.message : 'Enregistrement impossible.')
      )
      .finally(() => setOccupe(false));
  };

  const retirer = (s: SoireeManuelle) => {
    setMessage(null);
    void supprimerSoiree(s.id)
      .then(() => {
        setMessage(`« ${s.titre} » retirée.`);
        recharger();
      })
      .catch((e: unknown) => setMessage(e instanceof Error ? e.message : 'Suppression impossible.'));
  };

  const quand = (iso: string): string => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fr-CA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const aVenir = liste.filter((s) => new Date(s.debut) >= new Date());

  return (
    <section className="sets-bloc">
      <h2>Soirées ajoutées à la main</h2>
      <p className="sp-aide">
        Resident Advisor est interrogé en direct, il n&apos;y a rien à y synchroniser. Ce panneau
        sert à ce qu&apos;il ne couvre pas : une soirée qui passe de la techno sans se dire
        soirée techno, une salle hors de leur réseau, un promoteur qui ne publie que sur
        Facebook. Ce qui est déposé ici apparaît dans le calendrier immédiatement, avec la
        mention « ajoutée à la main ».
      </p>

      <SelecteurVille
        villes={villes}
        choisie={ville}
        onChoisir={setVille}
        etiquette="Ville de la soirée"
      />

      <div className="sa-formulaire">
        <label className="sp-label">
          Titre
          <input
            type="text"
            value={form.titre}
            maxLength={200}
            placeholder="NINA KRAVIZ [DAY RAVE]"
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
          />
        </label>
        <div className="sa-deux">
          <label className="sp-label">
            Date
            <input
              type="date"
              value={form.jour}
              onChange={(e) => setForm({ ...form, jour: e.target.value })}
            />
          </label>
          <label className="sp-label">
            Heure
            <input
              type="time"
              value={form.heure}
              onChange={(e) => setForm({ ...form, heure: e.target.value })}
            />
          </label>
        </div>
        <label className="sp-label">
          Salle
          <input
            type="text"
            value={form.lieu}
            maxLength={120}
            placeholder="L&apos;Olympia"
            onChange={(e) => setForm({ ...form, lieu: e.target.value })}
          />
        </label>
        <label className="sp-label">
          Artistes, séparés par des virgules
          <input
            type="text"
            value={form.artistes}
            onChange={(e) => setForm({ ...form, artistes: e.target.value })}
          />
        </label>
        <label className="sp-label">
          Styles, séparés par des virgules
          <input
            type="text"
            value={form.genres}
            placeholder="Techno, Minimal"
            onChange={(e) => setForm({ ...form, genres: e.target.value })}
          />
        </label>
        <label className="sp-label">
          Lien
          <input
            type="url"
            value={form.lien}
            placeholder="https://www.facebook.com/events/..."
            onChange={(e) => setForm({ ...form, lien: e.target.value })}
          />
        </label>
        <button className="sp-action" disabled={occupe} onClick={enregistrer}>
          {occupe ? 'Enregistrement…' : 'Ajouter la soirée'}
        </button>
        {message && <p className="sp-message">{message}</p>}
      </div>

      <h3 className="sa-titre-liste">
        {aVenir.length === 0
          ? 'Aucune soirée à venir dans ce panneau'
          : `${aVenir.length} soirée${aVenir.length > 1 ? 's' : ''} à venir`}
      </h3>
      {aVenir.length > 0 && (
        <ul className="sa-liste">
          {aVenir.map((s) => (
            <li key={s.id}>
              <span className="sa-quand">{quand(s.debut)}</span>
              <span className="sa-titre">{s.titre}</span>
              <span className="sa-lieu">{s.lieu ?? 'lieu non précisé'}</span>
              <button className="sp-action sp-action-sobre" onClick={() => retirer(s)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
