// =====================================================================
//  L'ETAT DU JEU ET SON ECONOMIE
//  ---------------------------------------------------------------
//  Un seul objet `s`, sauvegarde tel quel. Tout ce qui change l'etat
//  passe par la classe Jeu, qui emet des evenements : l'interface ecoute,
//  elle ne calcule rien.
//
//  L'ARGENT EST LE MOTEUR. On travaille pour acheter le materiel, le
//  materiel permet de jouer, jouer paie mieux que travailler, la hype
//  fait monter les cachets, les cachets paient le label, le label rapporte
//  sans qu'on joue. Chaque boucle est plus large que la precedente.
// =====================================================================
import { DISQUES, ARTISTES, FAMILLES, disqueParId, artisteParId, familleParId } from '../data/catalogue.js';
import {
  MATERIEL, KIT_DJ, VIE, BOULOTS, NOURRITURE, SALLES, CAMPAGNES, LABEL, ARTISTES_LOCAUX, RIVAUX,
  materielParId, salleParId, xpPour, titrePour, QUETE, DISQUAIRES, BATIMENTS,
} from '../data/monde.js';

export const CLE = 'sonaa.tycoon.v1';
export const MIN_PAR_SEC = 1.2;         // minutes de jeu par seconde reelle, quand on marche
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const argent = (n) => Math.round(n).toLocaleString('fr-CA') + ' $';
export const court = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' M'
  : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + ' k' : String(Math.round(n));

/* Un hasard deterministe par jour et par cle : le bac d'un disquaire est le
   meme si l'on recharge la page, et differe d'un jour a l'autre. */
function hache(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
const pick = (a) => a[Math.random() * a.length | 0];
const idNeuf = (p) => p + Math.random().toString(36).slice(2, 8);

export const tousLesArtistes = () => [...ARTISTES_LOCAUX, ...ARTISTES];
export const artisteQuelconque = (id) => ARTISTES_LOCAUX.find((a) => a.id === id) || artisteParId(id);

export function nouvelEtat() {
  const graine = Math.random().toString(36).slice(2, 8);
  return {
    v: 1, graine, jour: 1, minutes: 9 * 60,
    cash: 40, energie: 100,
    xp: 0, niveau: 1,
    hype: 2, fans: 0,
    materiel: [], vie: [], collection: [],
    morceaux: [],          // { id, titre, qualite, jour, sorti, ventes }
    offres: [],            // dates proposees : { id, salle, famille, cachet, soir, hypeMin }
    agenda: [],            // dates acceptees, memes champs + jouee
    campagnes: [],         // { id, reste }
    label: { niveau: 0 },
    roster: [],            // { artisteId, real, moral, prochaineSortie }
    sorties: [],           // { id, titre, artisteId, qualite, jour, ventes, stock }
    rafles: [],            // disques pris par un rival avant nous, ce jour
    stats: { quarts: 0, sets: 0, bonsSets: 0, campagnes: 0, salles: [], achats: 0, jours: 1, ventes: 0 },
    serie: 0,              // sets reussis d'affilee
    quete: 0,
    historique: [],
    aujourdhui: { recettes: 0, depenses: 0 },
    scene: { hype: Object.fromEntries(RIVAUX.map((r) => [r.id, r.hype])), residences: { after: 'v_vanta' }, signes: {}, journal: [] },
    fini: false,
  };
}

export class Jeu {
  constructor(etat) {
    this.s = etat || nouvelEtat();
    this.ecouteurs = {};
    this.genererOffres();
  }
  on(ev, fn) { (this.ecouteurs[ev] ||= []).push(fn); return this; }
  emit(ev, ...a) { for (const f of this.ecouteurs[ev] || []) f(...a); }
  toast(msg, genre = '') { this.emit('toast', msg, genre); }
  change() { this.verifierQuete(); this.emit('change'); }

  // ------------------------------------------------------------ temps
  get heure() { return this.s.minutes / 60; }
  get horloge() {
    const h = Math.floor(this.s.minutes / 60) % 24, m = Math.floor(this.s.minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  get nuit() { const h = this.heure % 24; return h >= 20 || h < 6.5; }
  tick(dt) { this.avancer(dt * MIN_PAR_SEC, true); }
  avancer(mins, silencieux = false) {
    const s = this.s;
    s.minutes += mins;
    /* A trois heures du matin on s'ecroule : la journee finit d'elle-meme. */
    if (s.minutes >= 27 * 60) { this.dormir(true); return; }
    if (!silencieux) this.change();
  }

  // -------------------------------------------------------- argent, xp
  gagner(n, source = 'autre') {
    n = Math.round(n);
    if (n <= 0) return;
    this.s.cash += n;
    this.s.aujourdhui.recettes += n;
    this.emit('gain', n, source);
    this.change();
  }
  depenser(n) {
    if (this.s.cash < n) { this.toast('Pas assez d’argent.', 'mauvais'); return false; }
    this.s.cash -= n;
    this.s.aujourdhui.depenses += n;
    this.emit('depense', n);
    this.change();
    return true;
  }
  xpGain(n) {
    const s = this.s;
    s.xp += Math.round(n);
    while (s.xp >= xpPour(s.niveau)) {
      s.xp -= xpPour(s.niveau);
      s.niveau += 1;
      this.emit('niveau', s.niveau, titrePour(s.niveau));
      this.genererOffres();
    }
  }
  get progresNiveau() { return clamp(this.s.xp / xpPour(this.s.niveau), 0, 1); }
  get titre() { return titrePour(this.s.niveau); }

  // ------------------------------------------------------------ derives
  get kitComplet() { return KIT_DJ.every((id) => this.s.materiel.includes(id)); }
  get prochainePiece() { return MATERIEL.find((m) => !this.s.materiel.includes(m.id)) || null; }
  get peutProduire() { return this.s.materiel.includes('laptop'); }
  get bonusMateriel() {
    let skill = 0, prod = 0;
    for (const id of this.s.materiel) { const m = materielParId(id); if (m) { skill += m.skill; prod += m.prod; } }
    return { skill, prod };
  }
  /* Le talent : le niveau, le materiel, l'experience des sets et la
     culture de la collection. Plafonne pour que le jeu reste un jeu. */
  get talent() {
    const s = this.s;
    const familles = new Set(s.collection.map((id) => disqueParId(id)?.family));
    return clamp(s.niveau * 1.6 + this.bonusMateriel.skill * 1.2 + Math.min(20, s.stats.sets * 0.8)
      + familles.size * 1.5 + Math.min(12, s.collection.length * 0.25), 0, 100);
  }
  get qualiteProd() {
    const s = this.s;
    return clamp(18 + this.talent * 0.5 + this.bonusMateriel.prod * 1.6 + Math.min(15, s.morceaux.length * 1.2), 5, 100);
  }
  get valeur() {
    const s = this.s;
    const matos = s.materiel.reduce((a, id) => a + (materielParId(id)?.prix || 0), 0);
    return Math.max(0, s.cash) + matos * 0.6 + s.fans * 2 + s.hype * 40 + s.collection.length * 25
      + s.roster.length * 4000 + s.label.niveau * 8000;
  }
  ouvert(b) { return this.s.niveau >= (b.niveau || 1); }
  chantierProche() {
    /* Le prochain lieu qui s'ouvre : c'est ce que le joueur regarde
       pousser. */
    return BATIMENTS.filter((b) => !this.ouvert(b)).sort((a, b) => a.niveau - b.niveau)[0] || null;
  }

  // ------------------------------------------------------------- quete
  get etape() { return QUETE[Math.min(this.s.quete, QUETE.length - 1)]; }
  verifierQuete() {
    let garde = 0;
    while (garde++ < 5) {
      const e = this.etape;
      if (!e.test || !e.test(this.s)) break;
      if (e.xp) this.xpGain(e.xp);
      this.s.quete += 1;
      this.emit('quete', this.etape, e);
    }
  }

  // ---------------------------------------------------------- boulots
  boulotsDisponibles(lieu) {
    return BOULOTS.filter((b) => b.lieu === lieu).map((b) => ({ ...b, ok: this.boulotOuvert(b) }));
  }
  boulotOuvert(b) {
    const s = this.s, n = b.besoin;
    if (!n) return true;
    if (n.vie && !s.vie.includes(n.vie)) return false;
    if (n.quarts && s.stats.quarts < n.quarts) return false;
    if (n.niveau && s.niveau < n.niveau) return false;
    if (n.disques && s.collection.length < n.disques) return false;
    return true;
  }
  travailler(id) {
    const b = BOULOTS.find((x) => x.id === id);
    if (!b || !this.boulotOuvert(b)) return false;
    if (this.s.energie < b.energie) { this.toast('Trop fatigué. Mange, ou dors.', 'mauvais'); return false; }
    this.s.energie -= b.energie;
    this.s.stats.quarts += 1;
    /* Un pourboire au hasard : la petite variance qui fait retaper. */
    const pourboire = Math.random() < 0.3 ? Math.round(b.paie * (0.1 + Math.random() * 0.3)) : 0;
    this.avancer(b.heures * 60, true);
    this.gagner(b.paie + pourboire, 'boulot');
    this.xpGain(8 + b.heures * 2);
    if (pourboire) this.toast(`Pourboire : +${argent(pourboire)}`, 'or');
    this.change();
    return { paie: b.paie, pourboire };
  }
  manger(id) {
    const n = NOURRITURE.find((x) => x.id === id);
    if (!n || !this.depenser(n.prix)) return false;
    this.s.energie = clamp(this.s.energie + n.energie, 0, 100);
    if (n.hype) this.s.hype += n.hype;
    this.avancer(n.lieu === 'bar' ? 45 : 20, true);
    this.change();
    return true;
  }

  // ------------------------------------------------------------ achats
  acheterMateriel(id) {
    const m = materielParId(id);
    if (!m || this.s.materiel.includes(id)) return false;
    /* L'ordre est impose : la piece precedente d'abord. */
    const i = MATERIEL.indexOf(m);
    if (i > 0 && !this.s.materiel.includes(MATERIEL[i - 1].id)) {
      this.toast(`Il te faut d’abord : ${MATERIEL[i - 1].nom}.`, 'mauvais'); return false;
    }
    if (!this.depenser(m.prix)) return false;
    this.s.materiel.push(id);
    this.xpGain(10 + Math.sqrt(m.prix));
    this.emit('materiel', m);
    if (this.kitComplet && KIT_DJ[KIT_DJ.length - 1] === id) this.toast('Le kit est complet. Tu peux jouer !', 'or');
    this.change();
    return true;
  }
  acheterVie(id) {
    const v = VIE.find((x) => x.id === id);
    if (!v || this.s.vie.includes(id) || !this.depenser(v.prix)) return false;
    this.s.vie.push(id);
    this.change();
    return true;
  }

  // ------------------------------------------------------- disquaires
  /* LE BAC DU JOUR : huit disques tires des familles du disquaire, les
     rares moins souvent. Deterministe par jour et par boutique. */
  bac(dqId) {
    const dq = DISQUAIRES.find((d) => d.id === dqId);
    if (!dq) return [];
    const s = this.s;
    const cle = `${s.graine}:${dqId}:${s.jour}:${(s.fouilles || {})[dqId] || 0}`;
    const stock = DISQUES.filter((d) => dq.familles.includes(d.family) && !s.collection.includes(d.id) && !s.rafles.includes(d.id));
    const notes = stock.map((d) => ({ d, n: hache(cle + d.id) * [1.0, 0.85, 0.6, 0.35, 0.18][d.rarity - 1] }));
    notes.sort((a, b) => b.n - a.n);
    return notes.slice(0, 8).map((x) => x.d);
  }
  fouiller(dqId) {
    /* Trente minutes de plus dans les bacs : un autre tirage. */
    const s = this.s;
    s.fouilles ||= {};
    s.fouilles[dqId] = (s.fouilles[dqId] || 0) + 1;
    this.avancer(30, true);
    this.xpGain(3);
    this.change();
  }
  prixDisque(d) {
    /* La hype d'un rival rafleur fait monter les prix des raretes. */
    return Math.round(d.price * (1 + (this.s.niveau > 10 ? 0.3 : 0)));
  }
  acheterDisque(id) {
    const d = disqueParId(id);
    if (!d || this.s.collection.includes(id)) return false;
    if (!this.depenser(this.prixDisque(d))) return false;
    this.s.collection.push(id);
    this.s.stats.achats += 1;
    this.xpGain(4 + d.rarity * 3);
    this.avancer(10, true);
    this.emit('disque', d);
    this.change();
    return true;
  }
  vendreDisque(id) {
    const d = disqueParId(id);
    const i = this.s.collection.indexOf(id);
    if (!d || i < 0) return false;
    this.s.collection.splice(i, 1);
    this.gagner(Math.round(d.price * 0.55), 'disque');
    return true;
  }

  // ------------------------------------------------------------- dates
  /* LES OFFRES. Trois par jour, parmi les salles ouvertes au niveau du
     joueur, avec une famille demandee. Les familles dont le joueur a des
     disques reviennent plus souvent : on propose ce qu'il peut jouer. */
  genererOffres() {
    const s = this.s;
    const salles = SALLES.filter((v) => s.niveau >= v.niveau);
    if (!salles.length) return;
    const mienne = {};
    for (const id of s.collection) { const d = disqueParId(id); if (d) mienne[d.family] = (mienne[d.family] || 0) + 1; }
    const familles = FAMILLES.map((f) => f.id);
    const dejaSoirs = new Set(s.agenda.filter((a) => !a.jouee).map((a) => a.soir));
    s.offres = [];
    const n = 3;
    for (let i = 0; i < n; i++) {
      /* Les salles les plus hautes sont proposees moins souvent : on les
         merite en montant, on ne les recoit pas toutes les semaines. */
      const poids = salles.map((v, k) => 1 / (1 + k * 0.35));
      const tot = poids.reduce((a, b) => a + b, 0);
      let r = Math.random() * tot, salle = salles[0];
      for (let k = 0; k < salles.length; k++) { r -= poids[k]; if (r <= 0) { salle = salles[k]; break; } }
      const candidates = familles.filter((f) => (mienne[f] || 0) >= 2);
      const famille = Math.random() < 0.7 && candidates.length ? pick(candidates) : pick(familles);
      const base = salle.cachet[0] + Math.random() * (salle.cachet[1] - salle.cachet[0]);
      const soir = s.jour + (Math.random() < 0.55 ? 0 : 1);
      s.offres.push({
        id: idNeuf('o'), salle: salle.id, famille,
        cachet: Math.round(base * (1 + Math.min(1.5, s.hype / 120))),
        soir, hypeMin: Math.round(Math.max(0, (SALLES.indexOf(salle) - 1) * 12)),
        prise: dejaSoirs.has(soir),
      });
    }
    s.offres.sort((a, b) => a.soir - b.soir || b.cachet - a.cachet);
  }
  accepterDate(offreId) {
    const s = this.s;
    const o = s.offres.find((x) => x.id === offreId);
    if (!o) return false;
    if (!this.kitComplet) { this.toast('Sans platines, personne ne te booke. Finis ton kit.', 'mauvais'); return false; }
    if (s.hype < o.hypeMin) { this.toast(`Il te faut ${o.hypeMin} de hype pour cette salle.`, 'mauvais'); return false; }
    if (s.agenda.some((a) => !a.jouee && a.soir === o.soir)) { this.toast('Tu joues déjà ce soir-là.', 'mauvais'); return false; }
    s.offres = s.offres.filter((x) => x.id !== offreId);
    s.agenda.push({ ...o, jouee: false });
    for (const x of s.offres) if (x.soir === o.soir) x.prise = true;
    this.toast(`Date acceptée : ${salleParId(o.salle).nom}, ${o.soir === s.jour ? 'ce soir' : 'demain'}.`, 'or');
    this.change();
    return true;
  }
  get dateCeSoir() { return this.s.agenda.find((a) => !a.jouee && a.soir === this.s.jour) || null; }
  get dateDemain() { return this.s.agenda.find((a) => !a.jouee && a.soir === this.s.jour + 1) || null; }

  /* LE SET. Quatre disques ; la salle attend une famille et une montee
     d'energie. Le score dit combien la salle a danse. */
  evaluerSet(date, ids) {
    const salle = salleParId(date.salle);
    const disques = ids.map(disqueParId).filter(Boolean);
    if (disques.length < 4) return null;
    let famille = 0, energie = 0, tempo = 0, rarete = 0;
    for (let i = 0; i < 4; i++) {
      const d = disques[i];
      if (d.family === date.famille) famille += 1;
      energie += 1 - Math.abs(d.energy - salle.courbe[i]) / 4;
      rarete += d.rarity / 5;
      if (i > 0) tempo += 1 - Math.min(1, Math.abs(d.bpm - disques[i - 1].bpm) / 14);
    }
    famille /= 4; energie /= 4; tempo /= 3; rarete /= 4;
    const talent = Math.min(1, this.talent / 45);
    const score = clamp(0.32 * famille + 0.3 * energie + 0.18 * tempo + 0.12 * talent + 0.08 * rarete, 0, 1);
    return { score, famille, energie, tempo, talent, rarete };
  }
  jouerSet(dateId, ids) {
    const s = this.s;
    const date = s.agenda.find((a) => a.id === dateId && !a.jouee);
    if (!date) return null;
    if (date.soir !== s.jour) { this.toast('Ce n’est pas ce soir.', 'mauvais'); return null; }
    if (s.energie < 25) { this.toast('Trop fatigué pour jouer. Mange quelque chose.', 'mauvais'); return null; }
    const ev = this.evaluerSet(date, ids);
    if (!ev) return null;
    const salle = salleParId(date.salle);
    const rang = SALLES.indexOf(salle);
    /* Un rival qui tient la salle garde une part du cachet. */
    const tenant = s.scene.residences[salle.id];
    const part = tenant && s.hype < s.scene.hype[tenant] ? 0.65 : 1;
    const cachet = Math.round(date.cachet * (0.45 + ev.score * 0.85) * part);
    const fans = Math.round(salle.jauge * 0.1 * ev.score * salle.fans * (0.7 + Math.random() * 0.6));
    const hype = 2 + ev.score * (6 + rang * 3);
    const xp = Math.round(40 + ev.score * 110 * (1 + rang * 0.6));
    date.jouee = true; date.score = ev.score; date.gagne = cachet;
    s.energie = clamp(s.energie - 30, 0, 100);
    if (s.minutes < 22 * 60) s.minutes = 22 * 60;
    s.minutes += 3 * 60;
    s.stats.sets += 1;
    if (!s.stats.salles.includes(salle.id)) s.stats.salles.push(salle.id);
    if (ev.score >= 0.7) { s.stats.bonsSets += 1; s.serie += 1; } else s.serie = 0;
    const bonusSerie = s.serie >= 3 ? Math.round(cachet * 0.25) : 0;
    s.fans += fans; s.hype += hype;
    this.gagner(cachet + bonusSerie, 'set');
    this.xpGain(xp);
    /* On reprend la residence d'un rival si on l'a enterre. */
    let reprise = null;
    if (tenant && ev.score > 0.72 && s.hype >= s.scene.hype[tenant] * 0.9) {
      delete s.scene.residences[salle.id];
      reprise = RIVAUX.find((r) => r.id === tenant);
      this.journal(`Tu prends la résidence de ${reprise.name} au ${salle.nom}.`);
    }
    this.change();
    return { ...ev, cachet, bonusSerie, fans, hype: Math.round(hype), xp, salle, reprise, serie: s.serie };
  }

  // -------------------------------------------------------------- promo
  lancerCampagne(id) {
    const c = CAMPAGNES.find((x) => x.id === id);
    if (!c || this.s.niveau < c.niveau) return false;
    if (this.s.campagnes.some((x) => x.id === id)) { this.toast('Cette campagne tourne déjà.', 'mauvais'); return false; }
    if (!this.depenser(c.prix)) return false;
    this.s.campagnes.push({ id, reste: c.jours });
    this.s.stats.campagnes += 1;
    this.s.hype += c.hype * 0.3;
    this.xpGain(10 + c.jours * 4);
    this.avancer(45, true);
    this.change();
    return true;
  }

  // --------------------------------------------------------- production
  produire() {
    const s = this.s;
    if (!this.peutProduire) { this.toast('Il te faut un laptop.', 'mauvais'); return null; }
    if (s.energie < 30) { this.toast('Trop fatigué pour produire.', 'mauvais'); return null; }
    s.energie -= 30;
    const q = clamp(this.qualiteProd + (Math.random() * 16 - 8), 5, 100);
    const m = { id: idNeuf('m'), titre: titreAuHasard(), qualite: Math.round(q), jour: s.jour, sorti: false, ventes: 0 };
    s.morceaux.push(m);
    this.avancer(6 * 60, true);
    this.xpGain(30 + q * 0.5);
    this.change();
    return m;
  }
  sortirMorceau(id) {
    const m = this.s.morceaux.find((x) => x.id === id);
    if (!m || m.sorti) return false;
    m.sorti = true; m.jourSortie = this.s.jour;
    this.s.hype += 3 + m.qualite / 20;
    this.xpGain(25);
    this.toast(`« ${m.titre} » est en ligne.`, 'or');
    this.change();
    return true;
  }

  // -------------------------------------------------------------- label
  get palierLabel() { return LABEL[this.s.label.niveau - 1] || null; }
  get prochainPalierLabel() { return LABEL[this.s.label.niveau] || null; }
  ameliorerLabel() {
    const p = this.prochainPalierLabel;
    if (!p) return false;
    if (this.s.label.niveau === 0 && this.s.niveau < 8) { this.toast('Niveau 8 pour ouvrir un label.', 'mauvais'); return false; }
    if (!this.depenser(p.prix)) return false;
    this.s.label.niveau += 1;
    this.xpGain(80 * this.s.label.niveau);
    this.emit('label', p);
    this.change();
    return true;
  }
  artistesSignables() {
    const s = this.s;
    const palier = this.palierLabel;
    if (!palier) return [];
    const maxTier = 1 + s.label.niveau;    // palier 1 : tiers 1 et 2 ; palier 5 : tout
    return tousLesArtistes()
      .filter((a) => !s.roster.some((r) => r.artisteId === a.id))
      .filter((a) => a.tier <= maxTier)
      .map((a) => ({ ...a, pris: s.scene.signes[a.id] || null }))
      .sort((a, b) => a.tier - b.tier || a.advance - b.advance);
  }
  signer(id) {
    const s = this.s, a = artisteQuelconque(id);
    const palier = this.palierLabel;
    if (!a || !palier) return false;
    if (s.roster.length >= palier.artistes) { this.toast('Ton label est plein. Améliore-le.', 'mauvais'); return false; }
    if (s.scene.signes[a.id]) { this.toast(`${a.name} est déjà signé chez un rival.`, 'mauvais'); return false; }
    if (a.tier > 1 + s.label.niveau) { this.toast('Ce nom attend un label plus gros.', 'mauvais'); return false; }
    if (!this.depenser(a.advance)) return false;
    s.roster.push({ artisteId: a.id, real: !!a.real, moral: 70, prochaineSortie: s.jour + 4 + Math.round(Math.random() * 6) });
    s.hype += 3 + a.tier * 3;
    s.fans += Math.round(a.reach * 0.01);
    this.xpGain(40 + a.tier * 40);
    this.emit('signature', a);
    this.change();
    return true;
  }

  // --------------------------------------------------------------- jour
  journal(txt) {
    this.s.scene.journal.unshift({ jour: this.s.jour, txt });
    if (this.s.scene.journal.length > 20) this.s.scene.journal.pop();
  }
  dormir(force = false) {
    const s = this.s;
    const rapport = { jour: s.jour, lignes: [], recettes: 0, depenses: 0 };
    const ajoute = (txt, n) => { rapport.lignes.push({ txt, n }); if (n > 0) rapport.recettes += n; else rapport.depenses += -n; };

    /* Une date acceptee et pas jouee : la salle ne pardonne pas. */
    for (const d of s.agenda) if (!d.jouee && d.soir <= s.jour) {
      d.jouee = true; d.ratee = true;
      s.hype = Math.max(0, s.hype - 6);
      ajoute(`Date ratée au ${salleParId(d.salle).nom} : la hype en prend un coup`, 0);
    }
    s.agenda = s.agenda.filter((d) => !d.jouee || s.jour - d.soir < 6);

    // les sorties vendent
    const dem = 1 + Math.min(1.2, s.hype / 80);
    for (const m of s.morceaux) if (m.sorti) {
      const age = s.jour - m.jourSortie;
      const reach = (Math.sqrt(s.fans) * 0.5 + s.hype * 1.5 + 4) * Math.exp(-age / (7 + m.qualite / 8)) * (0.4 + m.qualite / 100) * dem;
      const unites = Math.max(0, Math.round(reach * (0.6 + Math.random() * 0.8)));
      if (unites) { m.ventes += unites; s.stats.ventes += unites; const g = unites * 1.4; s.cash += g; ajoute(`« ${m.titre} » · ${unites} ventes`, Math.round(g)); s.fans += Math.round(unites * 0.08); }
    }
    for (const r of s.sorties) {
      const a = artisteQuelconque(r.artisteId); if (!a) continue;
      const age = s.jour - r.jour;
      /* Racine carree des fans : sans elle, vingt artistes et un million de
         fans faisaient quarante millions en dix jours (mesure au simulateur). */
      const reach = (Math.sqrt(a.reach) * 0.9 + Math.sqrt(s.fans) * 0.6 + s.hype * 1.2) * Math.exp(-age / 10) * (0.4 + r.qualite / 100) * dem;
      const unites = Math.max(0, Math.round(reach * (0.6 + Math.random() * 0.8)));
      if (unites) {
        r.ventes += unites; s.stats.ventes += unites;
        const brut = unites * 1.8, net = brut * (1 - a.fee);
        s.cash += net; ajoute(`${a.name} · « ${r.titre} » · ${unites} ventes`, Math.round(net));
        s.fans += Math.round(unites * 0.05);
      }
    }
    s.sorties = s.sorties.filter((r) => s.jour - r.jour < 40);

    // les campagnes travaillent
    s.campagnes = s.campagnes.filter((c) => {
      const def = CAMPAGNES.find((x) => x.id === c.id); if (!def) return false;
      s.hype += def.hype / def.jours * 0.7;
      s.fans += Math.round(def.fans / def.jours * (0.8 + Math.random() * 0.5));
      c.reste -= 1;
      if (c.reste <= 0) { ajoute(`Campagne « ${def.nom} » terminée`, 0); return false; }
      return true;
    });

    // les artistes du label sortent des disques
    for (const m of s.roster) {
      const a = artisteQuelconque(m.artisteId); if (!a) continue;
      m.moral = clamp(m.moral - 1 + (s.hype > 20 ? 1 : 0) + (s.cash > a.advance ? 0.5 : -0.5), 0, 100);
      if (s.jour >= m.prochaineSortie) {
        const q = clamp(a.quality + (m.moral - 50) / 6 + (Math.random() * 10 - 5), 10, 100);
        const r = { id: idNeuf('r'), titre: titreAuHasard(), artisteId: a.id, qualite: Math.round(q), jour: s.jour, ventes: 0 };
        s.sorties.push(r);
        m.prochaineSortie = s.jour + 10 + Math.round(Math.random() * 10);
        s.fans += Math.round(a.reach * 0.006);
        s.hype += 2 + a.tier;
        ajoute(`${a.name} sort « ${r.titre} »`, 0);
      }
    }

    // le loyer, et le label qui coute
    const loyer = 12 + s.niveau * 3 + s.label.niveau * 60 + s.roster.length * 25;
    s.cash -= loyer;
    ajoute('Loyer et charges', -loyer);

    // la scene bouge
    this.jourDesRivaux(ajoute);

    /* La hype retombe d'autant plus vite qu'elle est haute : personne ne
       reste au sommet sans rien faire. */
    s.hype = Math.max(0, s.hype * (s.hype > 150 ? 0.9 : 0.94));
    s.jour += 1; s.stats.jours += 1;
    s.minutes = 8 * 60;
    s.energie = 100;
    s.rafles = [];
    s.fouilles = {};
    s.historique.push({ jour: rapport.jour, recettes: rapport.recettes + s.aujourdhui.recettes, depenses: rapport.depenses + s.aujourdhui.depenses, cash: Math.round(s.cash) });
    if (s.historique.length > 30) s.historique.shift();
    s.aujourdhui = { recettes: 0, depenses: 0 };
    this.genererOffres();
    this.xpGain(10);
    /* La dette ne tue pas, elle humilie : sous zero, on repart a zero avec
       une note. */
    if (s.cash < 0) { ajoute('Découvert épongé par ta mère. Elle s’en souviendra.', 0); s.cash = 0; }
    this.emit('jour', rapport, force);
    this.sauver();
    this.change();
    return rapport;
  }

  jourDesRivaux(ajoute) {
    const s = this.s, sc = s.scene;
    for (const r of RIVAUX) {
      const ecart = s.hype - sc.hype[r.id];
      const rattrapage = ecart > 0 ? 1 + ecart * 0.03 : 0.45;
      sc.hype[r.id] = Math.max(1, sc.hype[r.id] + r.mordant * rattrapage * (0.6 + Math.random() * 0.8) - 0.4);
    }
    // un rafleur de bacs prend une rarete avant nous
    for (const r of RIVAUX.filter((x) => x.trait === 'bacs')) {
      if (Math.random() > r.mordant * 0.5) continue;
      const dq = pick(DISQUAIRES.filter((d) => s.niveau >= d.niveau));
      const rare = this.bac(dq.id).filter((d) => d.rarity >= 4)[0];
      if (rare) { s.rafles.push(rare.id); this.journal(`${r.name} a raflé « ${rare.title} » chez ${dq.nom}.`); ajoute(`${r.name} est passé avant toi chez ${dq.nom}`, 0); }
    }
    // un signeur prend un artiste a notre portee
    if (s.label.niveau > 0) for (const r of RIVAUX.filter((x) => x.trait === 'signe')) {
      if (Math.random() > r.mordant * 0.12) continue;
      const cible = this.artistesSignables().filter((a) => !a.pris && a.tier >= 2)[0];
      if (cible) { sc.signes[cible.id] = r.id; this.journal(`${r.name} a signé ${cible.name}. Tu as trop attendu.`); ajoute(`${r.name} a signé ${cible.name}`, 0); }
    }
    // les residences changent de main
    for (const [salle, tenant] of Object.entries(sc.residences)) {
      for (const c of RIVAUX.filter((x) => x.trait === 'clubs' && x.id !== tenant)) {
        if (sc.hype[c.id] > sc.hype[tenant] * 1.25 && Math.random() < 0.2) { sc.residences[salle] = c.id; this.journal(`${c.name} prend la résidence du ${salleParId(salle)?.nom || salle}.`); }
      }
    }
  }
  classement() {
    const l = RIVAUX.map((r) => ({ id: r.id, nom: r.name, hype: this.s.scene.hype[r.id], moi: false, famille: r.family }));
    l.push({ id: 'moi', nom: 'Toi', hype: this.s.hype, moi: true, famille: null });
    return l.sort((a, b) => b.hype - a.hype);
  }
  get maPlace() { return this.classement().findIndex((x) => x.moi) + 1; }

  // --------------------------------------------------------- sauvegarde
  sauver() { try { localStorage.setItem(CLE, JSON.stringify(this.s)); } catch (e) { /* stockage plein ou prive */ } }
  static charger() {
    try {
      const brut = localStorage.getItem(CLE);
      if (!brut) return null;
      const s = JSON.parse(brut);
      return s && s.v === 1 ? s : null;
    } catch (e) { return null; }
  }
  static effacer() { try { localStorage.removeItem(CLE); } catch (e) { /* rien */ } }
}

const T1 = ['Nuit', 'Béton', 'Sous-sol', 'Fréquence', 'Machine', 'Néon', 'Orage', 'Verre', 'Signal', 'Rituel', 'Marbre', 'Cendre', 'Rivière', 'Sirène'];
const T2 = ['blanche', 'humide', 'brisée', 'nocturne', 'lente', 'acide', 'fantôme', 'sale', 'douce', 'infinie', 'froide', 'sauvage'];
export function titreAuHasard() { return pick(T1) + ' ' + pick(T2); }
export { familleParId, disqueParId };
