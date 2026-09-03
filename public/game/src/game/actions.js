// =====================================================================
//  ACTIONS DE JEU — la logique derrière chaque bouton
// =====================================================================
import {
  RECORDS, ARTISTS, GEAR, CAMPAIGNS, GIGS, FOOD, DRINKS,
  recordById, artistById, gearById
} from '../data/content.js';
import { money, randomTitle } from './state.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.random() * arr.length | 0];

// ------------------------------------------------------------ DISQUAIRE
// Un bac : on fouille disque par disque, on choisit. Renouvelé chaque jour.
const QUEST_REC = 'rq1';

export function crateOf(game, b) {
  const s = game.s;
  const key = (b && b.id) || 'any';
  const genre = b && b.genre;
  s.digs = s.digs || {};
  const cur = s.digs[key];
  if (cur && cur.day === s.day) return cur;

  const owned = new Set(s.collection);
  const free = RECORDS.filter(r => !owned.has(r.id) && r.id !== QUEST_REC);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // la cabane est specialisee dans son genre, avec quelques intrus au fond du bac
  let pool;
  if (genre) {
    const mine = shuffle(free.filter(r => r.genre === genre));
    const others = shuffle(free.filter(r => r.genre !== genre));
    pool = mine.concat(others.slice(0, Math.max(0, 10 - mine.length)));
  } else {
    pool = shuffle(free.slice());
  }
  const deck = pool.slice(0, 12).map(r => ({
    id: r.id,
    price: Math.max(4, Math.round(r.price * (Math.random() < 0.18 ? rnd(0.35, 0.62) : rnd(0.82, 1.25)))),
    deal: false,
  }));
  deck.forEach(e => { const r = recordById(e.id); e.deal = e.price < r.price * 0.7; });

  // le disque de la quete dort dans le bac du genre qui lui correspond
  const qr = recordById(QUEST_REC);
  if (!owned.has(QUEST_REC) && (!genre || (qr && qr.genre === genre))) {
    const at = Math.min(deck.length, 3 + (Math.random() * 4 | 0));
    deck.splice(at, 0, { id: QUEST_REC, price: qr.price, deal: false, quest: true });
  }
  s.digs[key] = { day: s.day, deck, i: 0, bought: [] };
  return s.digs[key];
}

export function currentCard(game, b) {
  const c = crateOf(game, b);
  return c.i < c.deck.length ? c.deck[c.i] : null;
}

export function digDeeper(game, b) {
  const c = crateOf(game, b);
  if (c.i >= c.deck.length - 1) { c.i = c.deck.length; game.advance(6); game.emit('change'); return null; }
  c.i++;
  game.advance(6);
  game.need('energy', -0.6);
  game.quest.onDig();
  game.emit('change');
  return currentCard(game, b);
}

export function buyRecord(game, entry, b) {
  if (!entry) return false;
  const r = recordById(entry.id);
  if (!game.spend(entry.price, 'disques')) return false;
  game.s.collection.push(r.id);
  const c = crateOf(game, b);
  c.deck = c.deck.filter(e => e.id !== entry.id);
  if (c.i >= c.deck.length) c.i = Math.max(0, c.deck.length - 1);
  game.s.stats.digs++;
  game.s.insp = clamp(game.s.insp + 4 + r.rarity, 0, 100);
  game.advance(10);
  game.quest.onBuy(r.id);
  game.toast(`${r.artist} — ${r.title} : dans le sac.`, 'good');
  return true;
}

export function sellRecord(game, id) {
  const r = recordById(id);
  const i = game.s.collection.indexOf(id);
  if (i < 0) return false;
  game.s.collection.splice(i, 1);
  const price = Math.round(r.price * rnd(0.45, 0.7));
  game.earn(price, 'other');
  game.advance(15);
  game.toast(`Revendu ${r.title} pour ${money(price)}.`, '');
  return true;
}

// compat : ancien nom utilisé par le simulateur d'équilibrage
export function digStock(game, b) {
  const c = crateOf(game, b);
  return c.deck.slice(c.i, c.i + 6);
}

// ---------------------------------------------------------------- BOUFFE
export function consume(game, item) {
  if (!game.spend(item.price, 'vie')) return false;
  if (item.food) game.need('food', item.food);
  if (item.drink) game.need('drink', item.drink);
  if (item.energy) game.need('energy', item.energy);
  if (item.social) game.need('social', item.social);
  if (item.hype) game.s.hype += item.hype;
  game.advance(item.social ? 45 : 25);
  game.toast(`${item.name} — ça fait du bien.`, 'good');
  return true;
}

// ------------------------------------------------------------------- BAR
const ENCOUNTERS = [
  { t: 'promoteur', txt: 'Un promoteur te refile son numéro.', hype: 6, cred: 2 },
  { t: 'journaliste', txt: 'Une journaliste veut écrire sur toi.', hype: 9, cred: 1 },
  { t: 'disquaire', txt: 'Le disquaire te promet des arrivages rares.', hype: 2, cred: 3 },
  { t: 'producteur', txt: 'Un vieux producteur te donne un conseil de mix.', hype: 1, cred: 1, skill: 1.5 },
  { t: 'personne', txt: 'Soirée tranquille. Personne d’intéressant.', hype: 0, cred: 0 },
];
export function network(game) {
  if (!game.spend(25, 'vie')) return;
  game.need('social', 22); game.need('drink', 10); game.need('energy', -8);
  game.advance(90);
  const e = Math.random() < 0.28 ? ENCOUNTERS[4] : pick(ENCOUNTERS.slice(0, 4));
  game.s.hype += e.hype; game.s.cred += e.cred || 0;
  if (e.skill) game.s.skill += e.skill;
  game.toast(e.txt, e.hype > 3 ? 'gold' : '');
}

export function oddJob(game) {
  game.need('energy', -14); game.need('social', 6); game.need('drink', -6);
  const pay = 40 + Math.round(Math.random() * 20);
  game.earn(pay, 'other');
  game.advance(180);
  game.toast(`Trois heures à laver des verres : ${money(pay)}.`, '');
}

// ---------------------------------------------------------------- STUDIO
export function produce(game, hours = 4) {
  const s = game.s;
  if (s.needs.energy < 12) { game.toast('Trop crevé pour produire.', 'bad'); return null; }
  const q = game.productionQuality() + rnd(-11, 11);
  const t = {
    id: 'tr' + Math.random().toString(36).slice(2, 7),
    name: randomTitle(),
    quality: Math.round(clamp(q, 5, 100)),
    day: s.day,
  };
  s.tracks.push(t);
  game.quest.onProduce();
  s.stats.tracks++;
  s.skill += 0.45;
  s.insp = clamp(s.insp - 22, 0, 100);
  game.need('energy', -18); game.need('food', -8); game.need('drink', -10);
  game.advance(Math.max(120, (hours * 60) * (1 - clamp(game.gearSpeed, 0, .6))));
  game.toast(`« ${t.name} » bouclé — qualité ${t.quality}.`, t.quality > 65 ? 'gold' : 'good');
  return t;
}

export function listenRecords(game, id = null) {
  const s = game.s;
  if (!s.collection.length) { game.toast('Ta collection est vide.', 'bad'); return null; }
  const r = recordById(id && s.collection.includes(id) ? id : pick(s.collection));
  s.insp = clamp(s.insp + 16 + r.rarity * 2, 0, 100);
  s.skill += 0.12;
  game.need('social', 4); game.need('energy', -4);
  game.advance(75);
  const revelation = game.quest.onListen(r.id);
  if (!revelation) game.toast(`Tu réécoutes ${r.artist} — ${r.title}. Inspiration +.`, 'good');
  return { record: r, revelation };
}

// ----------------------------------------------------------------- MATOS
export function buyGear(game, g) {
  if (game.s.gear.includes(g.id)) return;
  if (game.tier < g.tier) { game.toast('Pas encore ton niveau.', 'bad'); return; }
  if (!game.spend(g.price, 'matos')) return;
  game.s.gear.push(g.id);
  game.advance(40);
  game.quest.onGear();
  game.toast(`${g.name} installé au studio.`, 'gold');
}

// ----------------------------------------------------------------- PROMO
export function launchCampaign(game, c) {
  if (game.s.campaigns.length >= 2) { game.toast('Deux campagnes en cours, c’est le max.', 'bad'); return; }
  if (game.tier < c.tier) { game.toast('Trop gros pour toi pour l’instant.', 'bad'); return; }
  if (!game.spend(c.price, 'promo')) return;
  game.s.campaigns.push({ id: c.id, left: c.days });
  game.advance(60);
  game.quest.onCampaign();
  game.toast(`Campagne « ${c.name} » lancée.`, 'gold');
}

// -------------------------------------------------------------- PRESSAGE
export const PRESS_OPTIONS = [
  { id: 'p0', name: 'Numérique seulement', copies: 0, cost: 120, price: 0, desc: 'Zéro stock, marges faibles.' },
  { id: 'p1', name: '300 copies',  copies: 300,  cost: 1400,  price: 22, desc: 'Le classique du premier EP.' },
  { id: 'p2', name: '1 000 copies', copies: 1000, cost: 4200, price: 21, desc: 'Il faut vendre pour rentrer.' },
  { id: 'p3', name: '5 000 copies', copies: 5000, cost: 17500, price: 20, desc: 'Là, tu joues gros.' },
];
export function pressTrack(game, track, opt, artistId = null) {
  if (!game.spend(opt.cost, 'pressage')) return;
  const rel = {
    id: 'rel' + Math.random().toString(36).slice(2, 7),
    title: track.name, artistId, quality: track.quality,
    day: game.s.day, stock: opt.copies || 999999, sold: 0,
    price: opt.price || 3.2, digital: !opt.copies,
  };
  game.s.releases.push(rel);
  game.s.tracks = game.s.tracks.filter(t => t.id !== track.id);
  game.s.hype += 4 + track.quality / 14;
  game.advance(120);
  game.quest.onPress();
  game.toast(`« ${rel.title} » est en route chez les disquaires.`, 'gold');
}

// -------------------------------------------------------------- LE LABEL
export function signArtist(game, a) {
  if (game.s.roster.some(m => m.artistId === a.id)) return;
  if (game.tier < a.tier) { game.toast(`${a.name} ne te répondra même pas.`, 'bad'); return; }
  if (!game.spend(a.advance, 'signature')) return;
  game.s.roster.push({ artistId: a.id, signedDay: game.s.day, morale: 72, nextReleaseDay: game.s.day + 8 });
  game.s.hype += 8 + a.quality / 12;
  game.s.fans += Math.round(a.reach * 0.02);
  game.advance(120);
  game.quest.onSign();
  game.toast(`${a.name} signe chez toi. C’est officiel.`, 'gold');
}
export function boostMorale(game, m) {
  const a = artistById(m.artistId);
  const cost = Math.round(a.advance * 0.08) + 200;
  if (!game.spend(cost, 'signature')) return;
  m.morale = clamp(m.morale + 28, 0, 100);
  m.nextReleaseDay = Math.max(game.s.day + 3, m.nextReleaseDay - 3);
  game.advance(60);
  game.toast(`${a.name} est reboosté. Studio réservé.`, 'good');
}
export function dropArtist(game, m) {
  const a = artistById(m.artistId);
  game.s.roster = game.s.roster.filter(x => x !== m);
  game.s.hype = Math.max(0, game.s.hype - 6);
  game.toast(`${a.name} quitte le label.`, 'bad');
}

// ---------------------------------------------------------------- SHOWS
export function gigList(game) {
  return GIGS.map(g => ({ ...g, ok: game.s.hype >= g.minHype }));
}
export function crowdWants(gig) {
  // courbe d'énergie demandée par la salle
  const base = Math.min(5, 2 + Math.round(gig.fansMul));
  return [clamp(base - 2, 1, 5), clamp(base - 1, 1, 5), clamp(base, 1, 5), 5];
}
export function playShow(game, gig, setIds) {
  const s = game.s;
  const want = crowdWants(gig);
  let score = 0, prevBpm = null;
  want.forEach((_, i) => {
    const r = recordById(setIds[i]);
    if (!r) return;
    score += Math.max(0, 5 - Math.abs(r.energy - want[i])) * 4;
    score += r.rarity * 1.5;
    if (prevBpm !== null) score += Math.abs(r.bpm - prevBpm) <= 6 ? 6 : Math.abs(r.bpm - prevBpm) <= 12 ? 3 : 0;
    prevBpm = r.bpm;
  });
  const maxScore = 4 * 20 + 4 * 7.5 + 3 * 6;
  let pct = clamp(score / maxScore, 0, 1);
  pct = clamp(pct * (1 - game.moodPenalty / 160) + s.skill / 400, 0, 1.1);
  const fee = Math.round(gig.fee * (0.6 + pct * 0.7));
  const fans = Math.round(gig.cap * gig.fansMul * 0.16 * pct);
  const hype = gig.fansMul * 5 * pct + 2;
  game.earn(fee, 'gigs');
  s.fans += fans;
  s.hype += hype;
  s.cred += 1;
  s.skill += 0.3;
  s.stats.shows++;
  game.need('energy', -gig.energy);
  game.need('drink', -18); game.need('social', 12);
  game.advance(5 * 60);
  const verdict = pct > .85 ? 'Set monumental.' : pct > .6 ? 'Bon set, la salle a suivi.'
    : pct > .35 ? 'Set correct, sans plus.' : 'Le dancefloor s’est vidé.';
  game.quest.onShow();
  game.toast(`${verdict} ${money(fee)} · +${fans} fans`, pct > .6 ? 'gold' : pct > .35 ? 'good' : 'bad');
  return { pct, fee, fans, verdict };
}

// -------------------------------------------------------------- BOUTIQUE
export function upgradeStore(game) {
  const lvl = game.s.storeLevel;
  const cost = [45000, 120000, 400000][lvl] ?? null;
  if (cost === null) { game.toast('Boutique au maximum.', ''); return; }
  if (!game.spend(cost, 'signature')) return;
  game.s.storeLevel++;
  game.advance(180);
  game.quest.onStore();
  game.toast(`Boutique niveau ${game.s.storeLevel}.`, 'gold');
}
