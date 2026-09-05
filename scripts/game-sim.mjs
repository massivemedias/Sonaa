/* SIMULATEUR D'EQUILIBRAGE. Un joueur mecanique joue N jours avec une
   politique simple, et l'on regarde le rythme : quand le kit est complet,
   quand le label ouvre, combien de sets. Sert a regler les prix.
     node scripts/game-sim.mjs [jours] [parties] */
globalThis.window = { location: { search: '' } };
const { Jeu, nouvelEtat } = await import('../public/game/src/game/etat.js');
const { MATERIEL, BOULOTS, CAMPAGNES } = await import('../public/game/src/data/monde.js');
const { disqueParId } = await import('../public/game/src/data/catalogue.js');

const JOURS = +(process.argv[2] || 40), PARTIES = +(process.argv[3] || 3);

function journee(j) {
  const s = j.s;
  let garde = 0;
  while (garde++ < 30) {
    // 1. materiel : la prochaine piece des qu'on peut
    const p = j.prochainePiece;
    if (p && s.cash >= p.prix + 20 && (p.role !== 'bonus' || s.cash >= p.prix * 2)) { j.acheterMateriel(p.id); continue; }
    if (!s.vie.includes('velo') && s.cash >= 130 && j.prochainePiece && j.prochainePiece.id !== 'casque') { j.acheterVie('velo'); continue; }
    // 2. disques : une collection de douze quand le kit est la
    if (j.kitComplet && s.collection.length < 12 + s.niveau) {
      const bac = j.bac('dq_techno').concat(j.bac('dq_house')).filter((d) => j.prixDisque(d) <= s.cash * 0.3).sort((a, b) => a.price - b.price);
      if (bac.length && s.cash > 60) { j.acheterDisque(bac[0].id); continue; }
    }
    // 3. une date ce soir
    const offre = s.offres.filter((o) => !o.prise && o.soir === s.jour && s.hype >= o.hypeMin).sort((a, b) => b.cachet - a.cachet)[0];
    if (offre && j.kitComplet && s.collection.length >= 4 && !j.dateCeSoir) { j.accepterDate(offre.id); continue; }
    // 4. promo quand on a du gras
    const c = CAMPAGNES.filter((x) => s.niveau >= x.niveau && !s.campagnes.some((y) => y.id === x.id) && s.cash > x.prix * 4).pop();
    if (c && j.kitComplet) { j.lancerCampagne(c.id); continue; }
    // 5. label
    if (j.prochainPalierLabel && s.niveau >= 8 && s.cash > j.prochainPalierLabel.prix * 1.5) { j.ameliorerLabel(); continue; }
    if (s.label.niveau > 0) {
      const a = j.artistesSignables().filter((x) => !x.pris && s.cash > x.advance * 2)[0];
      if (a && s.roster.length < j.palierLabel.artistes) { j.signer(a.id); continue; }
    }
    // 6. produire
    if (j.peutProduire && s.energie >= 60 && s.morceaux.filter((m) => !m.sorti).length === 0 && s.minutes < 18 * 60) { const m = j.produire(); if (m) { j.sortirMorceau(m.id); continue; } }
    // 7. travailler tant qu'il reste du jour et de l'energie
    const boulots = j.boulotsDisponibles('snack').concat(j.boulotsDisponibles('bar')).filter((b) => b.ok).sort((a, b) => b.paie / b.heures - a.paie / a.heures);
    const b = boulots[0];
    if (b && s.minutes + b.heures * 60 <= 21 * 60) {
      if (s.energie < b.energie) { if (s.cash >= 14) { j.manger('poutine'); continue; } break; }
      j.travailler(b.id); continue;
    }
    break;
  }
  // le set du soir
  const d = j.dateCeSoir;
  if (d) {
    if (s.energie < 25 && s.cash >= 14) j.manger('poutine');
    const coll = s.collection.map(disqueParId).filter(Boolean);
    const memes = coll.filter((x) => x.family === d.famille), autres = coll.filter((x) => x.family !== d.famille);
    const choix = [...memes, ...autres].slice(0, 6);
    let meilleur = null, best = -1;
    for (let i = 0; i < 40; i++) {
      const c = choix.slice().sort(() => Math.random() - 0.5).slice(0, 4).map((x) => x.id);
      if (c.length < 4) break;
      const ev = j.evaluerSet(d, c);
      if (ev && ev.score > best) { best = ev.score; meilleur = c; }
    }
    if (meilleur) j.jouerSet(d.id, meilleur);
  }
  j.dormir();
}

for (let p = 0; p < PARTIES; p++) {
  const j = new Jeu(nouvelEtat());
  j.on('toast', () => {});
  const jalons = {};
  const note = (cle) => { if (!jalons[cle]) jalons[cle] = j.s.jour; };
  const lignes = [];
  for (let d = 0; d < JOURS; d++) {
    journee(j);
    const s = j.s;
    if (j.kitComplet) note('kit'); if (s.stats.sets >= 1) note('set1'); if (s.niveau >= 6) note('niv6'); if (s.label.niveau >= 1) note('label'); if (s.roster.some((r) => r.real)) note('connu'); if (s.niveau >= 12) note('niv12');
    if (d % 5 === 4 || d === JOURS - 1) lignes.push(`  J${String(s.jour).padStart(2)} · niv ${String(s.niveau).padStart(2)} · ${String(Math.round(s.cash)).padStart(7)} $ · hype ${String(Math.round(s.hype)).padStart(3)} · fans ${String(s.fans).padStart(6)} · ${s.materiel.length}/${MATERIEL.length} pieces · ${s.collection.length} disques · ${s.stats.sets} sets · label ${s.label.niveau} · roster ${s.roster.length}`);
  }
  console.log(`Partie ${p + 1} : kit J${jalons.kit || '-'} · 1er set J${jalons.set1 || '-'} · niv6 J${jalons.niv6 || '-'} · label J${jalons.label || '-'} · artiste connu J${jalons.connu || '-'} · niv12 J${jalons.niv12 || '-'}`);
  console.log(lignes.join('\n'));
}
