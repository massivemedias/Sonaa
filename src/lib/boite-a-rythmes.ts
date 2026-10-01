/* UNE BOITE A RYTHMES DE POCHE, pour ecouter la grille d'un cours.
 *
 * Mika, le 1er octobre 2026 : des exemples dans « Produire ce style ». La
 * grille de seize pas se lit, et elle s'ecoute : chaque instrument est
 * synthetise ici, dans le navigateur, par la Web Audio API. Aucun fichier
 * son a telecharger, aucun echantillon a licencier : un kick est une
 * sinusoide qui tombe, une caisse claire un souffle filtre et un ton court.
 * Ce n'est pas une 909, c'est un schema qui sonne ; il dit OU tombent les
 * coups, pas comment le disque les fait sonner.
 *
 * LE TEMPS EST CELUI DE L'HORLOGE AUDIO, pas celui des minuteurs. Un
 * setInterval derive de plusieurs millisecondes et la grille boiterait ; on
 * programme donc chaque coup a l'avance sur l'horloge du contexte audio,
 * cent vingt millisecondes devant, et le minuteur ne sert qu'a remplir ce
 * tampon. */

import type { PisteDeMotif } from './cours.ts';

type Instrument = PisteDeMotif['id'];

/** Lance la grille en boucle et rend la fonction qui l'arrete. `surPas`
    recoit le pas joue, pour allumer la colonne, et -1 a l'arret. */
export function jouerMotif(pistes: readonly PisteDeMotif[], bpm: number, surPas: (pas: number) => void): () => void {
  const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Contexte || pistes.length === 0) return () => surPas(-1);
  const ctx = new Contexte();
  const sortie = ctx.createGain();
  sortie.gain.value = 0.5;
  sortie.connect(ctx.destination);

  const souffle = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const donnees = souffle.getChannelData(0);
  for (let i = 0; i < donnees.length; i += 1) donnees[i] = Math.random() * 2 - 1;

  const enveloppe = (quand: number, force: number, duree: number): GainNode => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(force, quand);
    g.gain.exponentialRampToValueAtTime(0.001, quand + duree);
    g.connect(sortie);
    return g;
  };
  const bruit = (quand: number, duree: number, filtre: BiquadFilterType, frequence: number, force: number, q = 0.7): void => {
    const s = ctx.createBufferSource();
    s.buffer = souffle;
    const f = ctx.createBiquadFilter();
    f.type = filtre;
    f.frequency.value = frequence;
    f.Q.value = q;
    s.connect(f).connect(enveloppe(quand, force, duree));
    s.start(quand);
    s.stop(quand + duree + 0.02);
  };
  const ton = (quand: number, type: OscillatorType, de: number, a: number, duree: number, force: number): void => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(de, quand);
    o.frequency.exponentialRampToValueAtTime(a, quand + Math.min(duree, 0.12));
    o.connect(enveloppe(quand, force, duree));
    o.start(quand);
    o.stop(quand + duree + 0.02);
  };

  const frapper = (id: Instrument, quand: number, force: number): void => {
    switch (id) {
      case 'kick':
        ton(quand, 'sine', 150, 45, 0.38, 1.1 * force);
        break;
      case 'caisse':
        bruit(quand, 0.18, 'highpass', 1200, 0.55 * force);
        ton(quand, 'triangle', 220, 180, 0.1, 0.35 * force);
        break;
      case 'clap':
        for (const d of [0, 0.011, 0.022]) bruit(quand + d, d === 0.022 ? 0.16 : 0.012, 'bandpass', 1300, 0.6 * force, 0.9);
        break;
      case 'rim':
        ton(quand, 'triangle', 1700, 1600, 0.035, 0.4 * force);
        ton(quand, 'square', 420, 400, 0.03, 0.12 * force);
        break;
      case 'charley':
        bruit(quand, 0.05, 'highpass', 7500, 0.32 * force);
        break;
      case 'charleyOuvert':
        bruit(quand, 0.32, 'highpass', 7000, 0.28 * force);
        break;
      case 'ride':
        bruit(quand, 0.55, 'bandpass', 8000, 0.18 * force, 1.4);
        ton(quand, 'square', 2900, 2900, 0.4, 0.03 * force);
        break;
      case 'perc':
        ton(quand, 'sine', 380, 300, 0.16, 0.5 * force);
        break;
    }
  };

  const longueur = Math.max(...pistes.map((p) => p.pas.length));
  const dureePas = 60 / Math.max(40, Math.min(bpm, 300)) / 4;
  let prochain = ctx.currentTime + 0.08;
  let indice = 0;
  const attentes = new Set<number>();
  const remplir = (): void => {
    while (prochain < ctx.currentTime + 0.12) {
      for (const p of pistes) {
        const c = p.pas[indice];
        if (c && c !== '-') frapper(p.id, prochain, c === 'X' ? 1 : c === 'x' ? 0.7 : 0.3);
      }
      const pas = indice;
      const attente = window.setTimeout(() => {
        attentes.delete(attente);
        surPas(pas);
      }, Math.max(0, (prochain - ctx.currentTime) * 1000));
      attentes.add(attente);
      indice = (indice + 1) % longueur;
      prochain += dureePas;
    }
  };
  remplir();
  const minuteur = window.setInterval(remplir, 25);
  return () => {
    window.clearInterval(minuteur);
    for (const a of attentes) window.clearTimeout(a);
    surPas(-1);
    void ctx.close();
  };
}
