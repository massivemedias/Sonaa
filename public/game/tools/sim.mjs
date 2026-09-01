import { Game, newState, money } from '../src/game/state.js';
import * as A from '../src/game/actions.js';
import { GEAR, CAMPAIGNS, ARTISTS, GIGS, FOOD, TIERS, recordById } from '../src/data/content.js';

const g = new Game(newState());
g.on('toast', () => {});
const marks = [];
let lastTier = 0;

for (let day = 0; day < 400 && !g.s.ended; ) {
  const s = g.s;
  // besoins
  if (s.needs.food < 45) A.consume(g, FOOD[0]);
  if (s.needs.drink < 45) A.consume(g, FOOD[3]);
  if (s.needs.energy < 30 || g.hour > 22) { g.sleep(); }
  // digging
  const stock = A.digStock(g);
  for (const e of stock.slice()) {
    if (s.collection.length < 26 && (s.collection.length < 8 ? s.cash > e.price + 40 : s.cash > e.price * 4)) A.buyRecord(g, e);
  }
  if (s.cash < 60 && s.needs.energy > 30) A.oddJob(g);
  // matos
  for (const it of GEAR) if (!s.gear.includes(it.id) && g.tier >= it.tier && s.cash > it.price * 2.2) A.buyGear(g, it);
  // production
  if (s.insp > 45 && s.needs.energy > 35) A.produce(g);
  // pressage
  for (const t of s.tracks.slice()) {
    const opts = A.PRESS_OPTIONS.filter(o => s.cash > o.cost * 3);
    const o = opts[opts.length - 1] || A.PRESS_OPTIONS[0];
    if (s.cash > o.cost) A.pressTrack(g, t, o);
  }
  // promo
  for (const c of CAMPAIGNS) if (g.tier >= c.tier && s.cash > c.price * 3 && s.campaigns.length < 2) A.launchCampaign(g, c);
  // signatures
  for (const a of ARTISTS) if (!s.roster.some(m => m.artistId === a.id) && g.tier >= a.tier && s.cash > a.advance * 2.5) A.signArtist(g, a);
  // boutique
  if (s.storeLevel < 3 && s.cash > 600000) A.upgradeStore(g);
  // show
  const gigs = A.gigList(g).filter(x => x.ok);
  const gig = gigs[gigs.length - 1];
  if (gig && s.needs.energy > 40 && s.collection.length >= 1) {
    const want = A.crowdWants(gig);
    const set = want.map(w => {
      const pool = s.collection.map(recordById).sort((a, b) => Math.abs(a.energy - w) - Math.abs(b.energy - w));
      return pool[0].id;
    });
    A.playShow(g, gig, set);
  }
  if (s.needs.energy < 25) g.sleep();
  if (g.hour < 22) g.advance((22 - g.hour) * 60);
  else g.sleep();

  if (g.tier > lastTier) { lastTier = g.tier; marks.push(`J${s.day}: ${TIERS[g.tier].name} (${money(s.cash)}, ${s.fans} fans, hype ${Math.round(s.hype)})`); }
  if (s.day % 25 === 0 && day !== s.day) marks.push(`  J${s.day}: ${money(s.cash)} · ${s.fans} fans · hype ${Math.round(s.hype)} · empire ${Math.round(g.empire)} · ${s.roster.length} artistes · ${s.releases.length} sorties`);
  day = s.day;
}
console.log(marks.join('\n'));
console.log('FIN au jour', g.s.day, '| tier', g.tier, '| ended', g.s.ended);
