// =====================================================================
//  ÉTAT DU JEU + SIMULATION ÉCONOMIQUE
// =====================================================================
import { RECORDS, ARTISTS, GEAR, TIERS, CAMPAIGNS, recordById, artistById, gearById } from '../data/content.js';
import { Quest } from './quest.js';

export const SAVE_KEY = 'sonaa.save.v1';
export const MIN_PER_SEC = 2.5;      // minutes de jeu par seconde réelle
export const DAY_END = 26 * 60;      // on se couche au plus tard à 2h du matin

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const money = n => (Math.round(n)).toLocaleString('fr-CA') + ' $';
export const big = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' M'
  : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + ' k' : String(Math.round(n));

export function newState() {
  return {
    v: 1, day: 1, minutes: 8 * 60,
    cash: 260,
    needs: { energy: 90, food: 80, drink: 75, social: 62 },
    fans: 0, hype: 2, skill: 4, insp: 40, cred: 0,
    collection: [], gear: ['g01'], tracks: [], releases: [], roster: [], campaigns: [],
    dig: null, quest: { step: 0, digs: 0, seen: false },
    stats: { shows: 0, tracks: 0, sold: 0, digs: 0, days: 1 },
    seenTier: 0, ended: false, storeLevel: 0,
    // couche financière
    finance: { price: 1, marketing: 0, debt: 0 },
    history: [],
    today: { gigs: 0, sales: 0, digital: 0, store: 0, other: 0 },
  };
}

export class Game {
  constructor(state) {
    this.s = state || newState();
    this.listeners = { toast: [], change: [], end: [] };
    this.acc = 0;
    this.quest = new Quest(this);
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return this; }
  emit(ev, ...a) { for (const f of (this.listeners[ev] || [])) f(...a); }
  toast(msg, kind = '') { this.emit('toast', msg, kind); }

  // ------------------------------------------------------------ temps
  tick(dtSeconds) {
    this.advance(dtSeconds * MIN_PER_SEC, false);
  }
  advance(mins, instant = true) {
    const s = this.s;
    let left = mins;
    while (left > 0) {
      const step = Math.min(left, 30);
      left -= step;
      s.minutes += step;
      const h = step / 60;
      s.needs.energy = clamp(s.needs.energy - 2.6 * h, 0, 100);
      s.needs.food = clamp(s.needs.food - 4.2 * h, 0, 100);
      s.needs.drink = clamp(s.needs.drink - 5.0 * h, 0, 100);
      s.needs.social = clamp(s.needs.social - 1.9 * h, 0, 100);
      s.insp = clamp(s.insp + 0.5 * h, 0, 100);
      if (s.minutes >= 24 * 60) { s.minutes -= 24 * 60; this.endOfDay(); }
    }
    this.emit('change');
  }
  get clock() {
    const h = Math.floor(this.s.minutes / 60) % 24, m = Math.floor(this.s.minutes % 60);
    return `J${this.s.day} ${String(h).padStart(2, '0')}:${String(m / 10 | 0)}${m % 10}`;
  }
  get hour() { return this.s.minutes / 60; }
  get isNight() { const h = this.hour; return h >= 20 || h < 6.5; }

  sleep() {
    const s = this.s;
    const target = s.minutes < 7 * 60 ? 7 * 60 : 24 * 60 + 7 * 60;
    this.advance(target - s.minutes);
    s.needs.energy = clamp(s.needs.energy + 78, 0, 100);
    s.insp = clamp(s.insp + 14, 0, 100);
    this.toast('Tu te réveilles frais. Nouvelle journée.', 'good');
  }

  // -------------------------------------------------------- fin de jour
  endOfDay() {
    const s = this.s;
    s.day++; s.stats.days++;
    const L = { sales: 0, digital: 0, store: 0, gigs: 0, other: 0,
                rent: 0, advances: 0, marketing: 0, interest: 0, pressing: 0 };
    const today = s.today || {};
    L.gigs = today.gigs || 0;
    L.other = today.other || 0;
    // dépenses déjà débitées dans la journée : on les rapporte, on ne les redébite pas
    L.pressing = today.out_pressage || 0;
    L.gear = today.out_matos || 0;
    L.signing = today.out_signature || 0;
    L.living = today.out_vie || 0;
    L.promo = today.out_promo || 0;
    L.digs = today.out_disques || 0;
    const lines = [];
    const dem = this.demandFactor, price = this.fin.price;

    // ventes des sorties
    const active = s.releases.filter(r => s.day - r.day < 24).length;
    const satur = 1 / (1 + 0.3 * Math.max(0, active - 1));
    for (const r of s.releases) {
      const age = s.day - r.day;
      const decay = Math.exp(-age / (6 + r.quality / 10));
      const reach = (s.fans * 0.03 + s.hype * 5.5 + 3) * decay * (0.45 + r.quality / 110) * satur * dem;
      let units = 0, gross = 0, digitalGross = 0;
      if (r.digital) {
        units = Math.max(0, Math.round(reach * 1.15 * (0.6 + Math.random() * 0.7)));
        digitalGross = units * 2.1 * price;
      } else {
        const phys = Math.min(r.stock, Math.max(0, Math.round(reach * (0.5 + Math.random() * 0.7))));
        const dig = Math.max(0, Math.round(reach * 0.55 * (0.5 + Math.random())));
        r.stock -= phys;
        units = phys + dig;
        gross = phys * r.price * price * 0.55;
        digitalGross = dig * 2.1 * price;
      }
      let net = gross + digitalGross;
      if (r.artistId) {
        const a = artistById(r.artistId);
        if (a) { const fee = net * a.fee; net -= fee; L.advances += fee; }
      }
      L.sales += gross * (net / (gross + digitalGross || 1));
      L.digital += digitalGross * (net / (gross + digitalGross || 1));
      r.sold += units;
      s.stats.sold += units;
      s.fans += Math.round(units * 0.10 * (r.quality / 70));
    }

    // campagnes
    s.campaigns = s.campaigns.filter(c => {
      const def = CAMPAIGNS.find(x => x.id === c.id);
      if (!def) return false;
      s.hype += def.hype / def.days;
      s.fans += Math.round(def.fans / def.days * (0.8 + Math.random() * 0.5));
      c.left--;
      if (c.left <= 0) { lines.push(`Campagne « ${def.name} » terminée`); return false; }
      return true;
    });

    // artistes
    for (const m of s.roster) {
      const a = artistById(m.artistId);
      if (!a) continue;
      m.morale = clamp(m.morale - 1.5 + (s.cash > a.advance ? 1 : 0), 0, 100);
      if (s.day >= m.nextReleaseDay) {
        const q = clamp(a.quality + (m.morale - 50) / 8 + (Math.random() * 8 - 4), 10, 100);
        const rel = {
          id: 'rel' + Math.random().toString(36).slice(2, 7),
          title: randomTitle(), artistId: a.id, quality: Math.round(q),
          day: s.day, stock: Math.round(300 + a.reach / 900), sold: 0, price: 22,
        };
        s.releases.push(rel);
        m.nextReleaseDay = s.day + 14 + Math.round(Math.random() * 10);
        s.fans += Math.round(a.reach * 0.012);
        s.hype += 4;
        lines.push(`${a.name} sort « ${rel.title} »`);
      }
    }

    // boutique
    if (s.storeLevel > 0) L.store = 220 * s.storeLevel + s.fans * 0.02 * s.storeLevel;

    // marketing quotidien
    const mk = this.fin.marketing || 0;
    if (mk > 0 && s.cash > mk) {
      L.marketing = mk;
      s.hype += mk / 420;
      s.fans += Math.round(mk / 9);
    }

    // charges fixes et dette
    const t = this.tier;
    L.rent = 25 + t * 260 + s.roster.length * 90;
    if (this.fin.debt > 0) {
      L.interest = this.fin.debt * 0.005;
      this.fin.debt += L.interest;
    }

    const income = L.sales + L.digital + L.store + L.gigs + L.other;
    const dueNow = L.rent + L.marketing + L.interest;          // seules charges à débiter
    const expense = dueNow + L.pressing + L.gear + L.signing + L.living + L.promo + L.digs;
    s.hype = Math.max(0, s.hype * 0.93);
    s.cash += (L.sales + L.digital + L.store) - dueNow;

    (s.history || (s.history = [])).push({
      day: s.day - 1, income, expense, cash: s.cash, fans: s.fans,
      hype: Math.round(s.hype), debt: Math.round(this.fin.debt), L,
    });
    if (s.history.length > 45) s.history.shift();
    s.today = { gigs: 0, sales: 0, digital: 0, store: 0, other: 0 };

    this.toast(`Jour ${s.day} — ${money(income)} de recettes, ${money(expense)} de dépenses`,
      income >= expense ? 'good' : 'bad');
    for (const l of lines) this.toast(l, 'gold');

    if (this.tier > s.seenTier) { s.seenTier = this.tier; this.emit('tierup', TIERS[this.tier]); }
    if (this.tier >= 6 && !s.ended) { s.ended = true; this.emit('end'); }
    this.save();
  }

  // ------------------------------------------------------- dérivés
  get empire() {
    const s = this.s;
    const gearVal = s.gear.reduce((a, g) => a + (gearById(g)?.price || 0), 0);
    const cat = s.releases.reduce((a, r) => a + r.sold * 4 + r.quality * 8, 0);
    return Math.max(0, s.cash) + gearVal * 0.6 + s.fans * 2.2 + s.hype * 60
      + s.roster.length * 6000 + cat + s.collection.length * 40 + s.storeLevel * 30000
      - (this.s.finance ? this.s.finance.debt : 0);
  }
  get tier() {
    let t = 0;
    for (let i = 0; i < TIERS.length; i++) if (this.empire >= TIERS[i].need) t = i;
    return t;
  }
  get tierProgress() {
    const t = this.tier;
    if (t >= TIERS.length - 1) return 1;
    const a = TIERS[t].need, b = TIERS[t + 1].need;
    return clamp((this.empire - a) / (b - a), 0, 1);
  }
  get gearQuality() { return this.s.gear.reduce((a, g) => a + (gearById(g)?.quality || 0), 0); }
  get gearSpeed() { return this.s.gear.reduce((a, g) => a + (gearById(g)?.speed || 0), 0); }
  get diggingBonus() {
    // la culture musicale : diversité de la collection
    const labels = new Set(), genres = new Set();
    for (const id of this.s.collection) {
      const r = recordById(id); if (!r) continue;
      labels.add(r.label); genres.add(r.genre);
    }
    return labels.size * 1.4 + genres.size * 2.2 + this.s.collection.length * 0.35;
  }
  get moodPenalty() {
    const n = this.s.needs;
    let p = 0;
    if (n.energy < 30) p += (30 - n.energy) * 0.5;
    if (n.food < 30) p += (30 - n.food) * 0.35;
    if (n.drink < 30) p += (30 - n.drink) * 0.35;
    if (n.social < 25) p += (25 - n.social) * 0.3;
    return p;
  }
  productionQuality() {
    const s = this.s;
    return clamp(16 + s.skill * 1.5 + this.gearQuality * 1.15 + s.insp * 0.32
      + this.diggingBonus * 0.7 - this.moodPenalty, 5, 100);
  }

  // -------------------------------------------------------- utilitaires
  spend(n, kind = 'divers') {
    if (this.s.cash < n) { this.toast('Pas assez d’argent.', 'bad'); return false; }
    this.s.cash -= n;
    const t = this.s.today || (this.s.today = {});
    t['out_' + kind] = (t['out_' + kind] || 0) + n;
    this.emit('change');
    return true;
  }
  earn(n, kind = 'other') {
    this.s.cash += n;
    const t = this.s.today || (this.s.today = { gigs: 0, sales: 0, digital: 0, store: 0, other: 0 });
    t[kind] = (t[kind] || 0) + n;
    this.emit('change');
  }
  get fin() { return this.s.finance || (this.s.finance = { price: 1, marketing: 0, debt: 0 }); }
  // élasticité : baisser le prix vend plus, le monter marge plus
  get demandFactor() { return clamp(1 - (this.fin.price - 1) * 1.4, 0.2, 1.6); }
  borrow(n) {
    this.fin.debt += n * 1.05;          // 5 % de frais de dossier
    this.s.cash += n;
    this.toast(`Emprunt de ${money(n)} accordé. Les intérêts courent.`, 'gold');
    this.emit('change');
  }
  repay(n) {
    n = Math.min(n, this.fin.debt, this.s.cash);
    if (n <= 0) return;
    this.fin.debt -= n; this.s.cash -= n;
    this.toast(`${money(n)} remboursés.`, 'good');
    this.emit('change');
  }
  need(k, delta) { this.s.needs[k] = clamp(this.s.needs[k] + delta, 0, 100); }

  unlocked(b) {
    if (b.kind === 'major') return this.tier >= 6 || this.s.ended;
    return this.tier >= b.tier;
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); } catch (e) { }
  }
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== 1) return null;
      return s;
    } catch (e) { return null; }
  }
}

const T1 = ['Nuit', 'Béton', 'Sous-sol', 'Fréquence', 'Machine', 'Néon', 'Orage', 'Verre', 'Signal', 'Rituel', 'Marbre', 'Cendre'];
const T2 = ['blanche', 'humide', 'brisée', 'nocturne', 'lente', 'acide', 'fantôme', 'sale', 'douce', 'infinie'];
export function randomTitle() {
  return T1[Math.random() * T1.length | 0] + ' ' + T2[Math.random() * T2.length | 0];
}
