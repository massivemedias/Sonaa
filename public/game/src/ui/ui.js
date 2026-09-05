// =====================================================================
//  L'INTERFACE · le HUD, les panneaux, et tout ce qui fait « ding »
//  ---------------------------------------------------------------
//  L'interface lit l'etat et appelle les actions du Jeu. Elle ne calcule
//  rien. Ce qu'elle fait de plus, c'est le plaisir : les pieces qui
//  volent vers le porte-monnaie, les chiffres qui montent, les niveaux
//  qui eclatent a l'ecran.
// =====================================================================
import { DISQUES, FAMILLES, familleParId, disqueParId, genreParId } from '../data/catalogue.js';
import { MATERIEL, VIE, BOULOTS, NOURRITURE, SALLES, CAMPAGNES, LABEL, DISQUAIRES, PALIERS, salleParId, xpPour, titrePour, materielParId } from '../data/monde.js';
import { argent, court, artisteQuelconque } from '../game/etat.js';
import { dessinerStudio } from '../world/dessin.js';

const $ = (s) => document.querySelector(s);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const echappe = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const couleurFamille = (id) => { const f = familleParId(id); return f ? `hsl(${f.hue} 70% 48%)` : '#8a7a90'; };
const nomFamille = (id) => familleParId(id)?.label || id;
const etoiles = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
const pointsEnergie = (n) => `<span class="energie-pts">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const srcPochette = (d) => d.cover ? '../' + d.cover : null;

export class UI {
  constructor(jeu, crochets) {
    this.jeu = jeu; this.crochets = crochets;
    this.panneau = null; this.batiment = null; this.onglet = null;
    this.cashAffiche = 0;
    this.selection = [];
    $('#feuille-fermer').addEventListener('click', () => this.fermer());
    $('#voile').addEventListener('click', (e) => { if (e.target === $('#voile')) this.fermer(); });
    $('#quete').addEventListener('click', () => { const c = this.jeu.etape.cible; if (c) { this.fermer(); this.crochets.allerA(c); } });
    $('#annonce-ok').addEventListener('click', () => this.fermerAnnonce());
    $('#hud-badge').addEventListener('click', () => this.ouvrir('niveau'));
    $('#hud-cash-pilule').addEventListener('click', () => this.ouvrir('bilan'));
    for (const b of document.querySelectorAll('.barre [data-panneau]')) b.addEventListener('click', () => this.ouvrir(b.dataset.panneau));
    for (const b of document.querySelectorAll('.barre [data-va]')) b.addEventListener('click', () => { this.fermer(); this.crochets.allerA(b.dataset.va); });
    $('#btn-action').addEventListener('click', () => { if (this.porte) this.crochets.entrer(this.porte); });
    $('#feuille-corps').addEventListener('click', (e) => this.clic(e));
    $('#feuille-onglets').addEventListener('click', (e) => { const o = e.target.closest('[data-onglet]'); if (o) { this.onglet = o.dataset.onglet; this.rendre(); } });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.estOuvert) this.fermer(); });
    this.fileAnnonces = [];
  }
  brancher(jeu) {
    this.jeu = jeu;
    jeu.on('toast', (m, k) => this.toast(m, k));
    jeu.on('change', () => this.hud());
    jeu.on('gain', (n, source) => this.gain(n, source));
    jeu.on('niveau', (n, titre) => this.annonce({ ico: '⭐', sur: 'NIVEAU', gros: String(n), titre, texte: PALIERS[n] ? `Débloqué : ${PALIERS[n]}` : 'Continue comme ça.' }));
    jeu.on('quete', (suivante, finie) => { this.toast(`Objectif atteint : ${finie.but}`, 'or'); this.flottant(`+${finie.xp} xp`, 'xp'); });
    jeu.on('materiel', (m) => { this.toast(`${m.icone} ${m.nom} installé chez toi.`, 'bon'); });
    jeu.on('disque', (d) => this.flottant(`+ ${d.title}`, 'xp'));
    jeu.on('label', (p) => this.annonce({ ico: '🏷️', sur: 'TON LABEL', gros: p.nom, titre: '', texte: p.desc }));
    jeu.on('signature', (a) => this.annonce({ ico: '✍️', sur: 'SIGNATURE', gros: a.name, titre: nomFamille(a.family), texte: a.bio || `${a.tracks} morceaux dans l’atlas SONAA. Sa première sortie arrive dans quelques jours.` }));
    jeu.on('jour', (rapport, force) => this.rapportJour(rapport, force));
    this.cashAffiche = jeu.s.cash;
    this.hud();
  }
  get estOuvert() { return !$('#voile').classList.contains('cache') || !$('#annonce').classList.contains('cache'); }

  // ---------------------------------------------------------------- HUD
  hud() {
    const j = this.jeu, s = j.s;
    $('#hud-niveau').textContent = s.niveau;
    $('#hud-titre').textContent = j.titre;
    const p = j.progresNiveau;
    $('#hud-xp').style.width = (p * 100) + '%';
    $('#hud-anneau').style.strokeDashoffset = String(119.4 * (1 - p));
    $('#hud-xp-texte').textContent = `${Math.round(s.xp)} / ${xpPour(s.niveau)} xp`;
    if (!this.enVol) { $('#hud-cash').textContent = argent(s.cash); this.cashAffiche = s.cash; }
    $('#hud-hype').textContent = Math.round(s.hype);
    $('#hud-fans').textContent = court(s.fans);
    $('#hud-jour').textContent = `Jour ${s.jour}`;
    $('#hud-horloge').textContent = j.horloge;
    const e = $('#hud-energie'); e.style.width = s.energie + '%'; e.classList.toggle('bas', s.energie < 30);
    const et = j.etape;
    $('#quete-but').textContent = et.but; $('#quete-aide').textContent = et.aide;
    $('#pastille-dates').classList.toggle('cache', !(j.dateCeSoir || s.offres.some((o) => !o.prise && j.kitComplet)));
    $('#serie').classList.toggle('cache', s.serie < 2); $('#serie-n').textContent = s.serie;
  }
  boutonAction(porte) {
    this.porte = porte;
    const b = $('#btn-action');
    if (!porte) { $('#btn-action-ico').textContent = '🏠'; $('#btn-action-txt').textContent = 'Studio'; b.classList.remove('ferme'); this.porte = null; b.onclick = null; return; }
    const ouvert = this.jeu.ouvert(porte);
    $('#btn-action-ico').textContent = ouvert ? '🚪' : '🚧';
    $('#btn-action-txt').textContent = ouvert ? porte.nom : `Niv. ${porte.niveau}`;
    b.classList.toggle('ferme', !ouvert);
  }
  toast(msg, genre = '') {
    const t = el(`<div class="toast ${genre}">${echappe(msg)}</div>`);
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3000);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  }

  // -------------------------------------------------------------- juice
  gain(n, source) {
    const dep = this.crochets.heros();
    const cible = $('#hud-cash-pilule').getBoundingClientRect();
    const nb = Math.min(12, 2 + Math.round(Math.sqrt(n) / 2));
    this.enVol = true;
    const depart = this.estOuvert ? { x: window.innerWidth / 2, y: window.innerHeight * 0.55 } : dep;
    this.flottant(`+${argent(n)}`, '', depart);
    for (let i = 0; i < nb; i++) {
      const c = el('<div class="piece"></div>');
      $('#pieces').appendChild(c);
      const x0 = depart.x + (Math.random() - 0.5) * 60, y0 = depart.y + (Math.random() - 0.5) * 30;
      const x1 = cible.left + cible.width * 0.3, y1 = cible.top + cible.height / 2;
      const anim = c.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${x0}px, ${y0 - 40}px) scale(1.1)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${x1}px, ${y1}px) scale(0.7)`, opacity: 1 },
      ], { duration: 650 + i * 50, delay: i * 40, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' });
      anim.onfinish = () => { c.remove(); $('#hud-cash-pilule').classList.remove('pop'); void $('#hud-cash-pilule').offsetWidth; $('#hud-cash-pilule').classList.add('pop'); };
    }
    // le compteur monte en meme temps que les pieces arrivent
    const de = this.cashAffiche, a = this.jeu.s.cash, t0 = performance.now(), duree = 700 + nb * 45;
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / duree);
      $('#hud-cash').textContent = argent(de + (a - de) * k);
      if (k < 1) requestAnimationFrame(pas); else { this.enVol = false; this.cashAffiche = a; this.hud(); }
    };
    requestAnimationFrame(pas);
  }
  flottant(txt, classe = '', pos = null) {
    const p = pos || (this.estOuvert ? { x: window.innerWidth / 2, y: window.innerHeight * 0.45 } : this.crochets.heros());
    const f = el(`<div class="flottant ${classe}">${echappe(txt)}</div>`);
    f.style.left = p.x + 'px'; f.style.top = (p.y - 20) + 'px';
    $('#flottants').appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }
  annonce(a) {
    if (!$('#annonce').classList.contains('cache')) { this.fileAnnonces.push(a); return; }
    $('#annonce-ico').textContent = a.ico; $('#annonce-sur').textContent = a.sur; $('#annonce-gros').textContent = a.gros;
    $('#annonce-titre').textContent = a.titre; $('#annonce-texte').textContent = a.texte;
    $('#annonce').classList.remove('cache');
    if (this.crochets.scene()) this.crochets.scene().celebrer();
  }
  rapportJour(r, force) { this.ouvrir('jour', null, { ...r, force }); }
  fermerAnnonce() {
    $('#annonce').classList.add('cache');
    const suivante = this.fileAnnonces.shift();
    if (suivante) setTimeout(() => this.annonce(suivante), 120);
  }

  // ------------------------------------------------------------ feuille
  ouvrir(kind, batiment = null, extra = null) {
    this.panneau = kind; this.batiment = batiment; this.extra = extra;
    if (kind !== this.dernierKind) this.onglet = null;
    this.dernierKind = kind;
    $('#voile').classList.remove('cache');
    this.rendre();
  }
  fermer() {
    $('#voile').classList.add('cache');
    this.panneau = null; this.arreterStudio();
    this.jeu.sauver();
  }
  entete(titre, sous) { $('#feuille-titre').textContent = titre; $('#feuille-sous').textContent = sous || ''; }
  onglets(liste) {
    const o = $('#feuille-onglets');
    if (!liste) { o.classList.add('cache'); o.innerHTML = ''; return null; }
    if (!this.onglet || !liste.some((x) => x.id === this.onglet)) this.onglet = liste[0].id;
    o.classList.remove('cache');
    o.innerHTML = liste.map((x) => `<button class="onglet ${x.id === this.onglet ? 'actif' : ''}" data-onglet="${x.id}">${x.nom}</button>`).join('');
    return this.onglet;
  }
  rendre() {
    if (!this.panneau) return;
    this.arreterStudio();
    const corps = $('#feuille-corps');
    corps.scrollTop = 0;
    const fn = PANNEAUX[this.panneau];
    if (!fn) { this.entete(this.panneau, ''); corps.innerHTML = ''; return; }
    corps.innerHTML = fn(this, this.jeu, this.batiment) || '';
    if (this.panneau === 'home' && this.onglet === 'studio') this.lancerStudio();
  }
  lancerStudio() {
    const c = $('#studio-canvas'); if (!c) return;
    const g = c.getContext('2d');
    const boucle = (t) => {
      if (!this.panneau || !document.body.contains(c)) return;
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(r.width * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      dessinerStudio(g, r.width, r.height, this.jeu.s.materiel, t / 1000);
      this.animStudio = requestAnimationFrame(boucle);
    };
    this.animStudio = requestAnimationFrame(boucle);
  }
  arreterStudio() { if (this.animStudio) cancelAnimationFrame(this.animStudio); this.animStudio = 0; }

  // ------------------------------------------------------------- actions
  clic(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, arg = b.dataset.arg;
    const j = this.jeu;
    const ok = this.agir(act, arg, b);
    if (ok !== 'garde') this.rendre();
  }
  agir(act, arg, b) {
    const j = this.jeu, s = j.s;
    switch (act) {
      case 'travailler': { const r = j.travailler(arg); if (r) this.flottant(`+${argent(r.paie + r.pourboire)}`); return; }
      case 'manger': j.manger(arg); return;
      case 'materiel': if (j.acheterMateriel(arg)) { this.flottant(`- ${argent(materielParId(arg).prix)}`, 'rouge'); } return;
      case 'vie': j.acheterVie(arg); return;
      case 'disque': {
        const d = disqueParId(arg);
        if (j.acheterDisque(arg)) { this.flottant(`- ${argent(j.prixDisque(d))}`, 'rouge'); if (b) { b.classList.add('choisie'); b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(0)' }], { duration: 380, easing: 'ease-in' }); } }
        return;
      }
      case 'fouiller': j.fouiller(arg); return;
      case 'accepter': j.accepterDate(arg); return;
      case 'jouer': this.selection = []; this.ouvrir('set', null, arg); return 'garde';
      case 'choisir': {
        const i = this.selection.indexOf(arg);
        if (i >= 0) this.selection.splice(i, 1); else if (this.selection.length < 4) this.selection.push(arg);
        return;
      }
      case 'lancer-set': {
        const r = j.jouerSet(this.extra, this.selection);
        if (r) { this.ouvrir('resultat', null, r); if (r.score >= 0.7 && this.crochets.scene()) this.crochets.scene().celebrer(); }
        return 'garde';
      }
      case 'campagne': j.lancerCampagne(arg); return;
      case 'produire': { const m = j.produire(); if (m) this.toast(`« ${m.titre} » est né. Qualité ${m.qualite}.`, 'or'); return; }
      case 'sortir': j.sortirMorceau(arg); return;
      case 'label': j.ameliorerLabel(); return;
      case 'signer': j.signer(arg); return;
      case 'dormir': { this.fermer(); j.dormir(); return 'garde'; }
      case 'aller': this.fermer(); this.crochets.allerA(arg); return 'garde';
      case 'ouvrir': this.onglet = null; this.ouvrir(arg, null, this.extra); return 'garde';
      case 'onglet': this.onglet = arg; return;
      case 'nouvelle': if (confirm('Effacer la partie et recommencer ?')) { this.fermer(); this.crochets.nouvellePartie(); } return 'garde';
      case 'fermer': this.fermer(); return 'garde';
      case 'vendre': j.vendreDisque(arg); return;
    }
  }
}

// =====================================================================
//  LES PANNEAUX · un par lieu, plus les ecrans transverses
// =====================================================================
function ligne({ ico, img, titre, sous, tags, bouton, classe = '' }) {
  return `<div class="carte ${classe}"><div class="ligne">
    <div class="ico">${img ? `<img src="${img}" alt="" loading="lazy">` : ico || ''}</div>
    <div class="txt"><b>${echappe(titre)}</b>${sous ? `<span>${sous}</span>` : ''}${tags ? `<div class="tags">${tags}</div>` : ''}</div>
    ${bouton || ''}</div></div>`;
}
const bouton = (txt, act, arg, classe = '', small = '') => `<button class="bouton ${classe}" data-act="${act}" data-arg="${arg ?? ''}">${txt}${small ? `<small>${small}</small>` : ''}</button>`;
const gris = (txt, small = '') => `<button class="bouton gris" disabled>${txt}${small ? `<small>${small}</small>` : ''}</button>`;
const tagFam = (id) => `<span class="tag fam" style="background:${couleurFamille(id)}">${echappe(nomFamille(id))}</span>`;

function blocBoulots(ui, j, lieu) {
  const s = j.s;
  return j.boulotsDisponibles(lieu).map((b) => {
    let raison = '';
    if (!b.ok) {
      const n = b.besoin;
      raison = n.vie ? `Il te faut : ${VIE.find((v) => v.id === n.vie).nom}` : n.quarts ? `Après ${n.quarts} quarts (${s.stats.quarts})` : n.niveau ? `Niveau ${n.niveau}` : n.disques ? `${n.disques} disques dans ta collection` : '';
    }
    const fatigue = s.energie < b.energie;
    return ligne({
      ico: b.icone, titre: b.nom, sous: b.ok ? `${b.heures} h · ${b.energie} d’énergie · ${echappe(b.desc)}` : raison,
      bouton: b.ok ? (fatigue ? gris('Fatigué', 'mange ou dors') : bouton(`+${argent(b.paie)}`, 'travailler', b.id, '', `${b.heures} h`)) : gris('🔒'),
      classe: b.ok ? '' : 'verrou',
    });
  }).join('');
}
function blocNourriture(j) {
  return `<div class="titre-section">Manger</div><div class="grille">` + NOURRITURE.filter((n) => !n.lieu).map((n) =>
    `<button class="carte" data-act="manger" data-arg="${n.id}" style="text-align:left;margin:0"><div class="ligne"><div class="ico">${n.icone}</div><div class="txt"><b>${n.nom}</b><span>+${n.energie} ⚡ · ${argent(n.prix)}</span></div></div></button>`).join('') + '</div>';
}
function carteDate(ui, j, o, agenda = false) {
  const s = j.s, salle = salleParId(o.salle);
  const quand = o.soir === s.jour ? 'Ce soir' : o.soir === s.jour + 1 ? 'Demain' : `Jour ${o.soir}`;
  let btn;
  if (agenda) btn = o.soir === s.jour ? bouton('Jouer !', 'jouer', o.id, 'rose') : gris(quand);
  else if (o.prise) btn = gris('Pris');
  else if (!j.kitComplet) btn = gris('🔒', 'kit DJ');
  else if (s.hype < o.hypeMin) btn = gris('🔒', `${o.hypeMin} hype`);
  else btn = bouton('Accepter', 'accepter', o.id, 'jaune');
  return ligne({
    ico: agenda ? '🎧' : '📅', titre: `${salle.nom} · ${argent(o.cachet)}`, sous: `${quand} · ${salle.jauge.toLocaleString('fr-CA')} personnes · veut du ${nomFamille(o.famille)}`,
    tags: tagFam(o.famille), bouton: btn, classe: agenda ? 'rose' : '',
  });
}
function blocDates(ui, j) {
  const s = j.s;
  let h = '';
  const ce = j.dateCeSoir, dem = j.dateDemain;
  if (ce || dem) { h += `<div class="titre-section">Ton agenda</div>`; if (ce) h += carteDate(ui, j, ce, true); if (dem) h += carteDate(ui, j, dem, true); }
  h += `<div class="titre-section">Le tableau des dates</div>`;
  if (!j.kitComplet) h += `<div class="note">Personne ne booke un DJ sans platines. Complète ton kit chez Massive Machines.</div>`;
  h += s.offres.map((o) => carteDate(ui, j, o)).join('') || '<div class="note">Rien aujourd’hui. Reviens demain, ou fais monter ta hype.</div>';
  h += `<div class="note">Le tableau change chaque matin. Une date acceptée et pas jouée coûte de la hype.</div>`;
  return h;
}

const PANNEAUX = {
  // ------------------------------------------------------------- chez toi
  home(ui, j) {
    const s = j.s;
    ui.entete('Chez toi', j.kitComplet ? 'Le studio' : 'La chambre. Pour l’instant.');
    const o = ui.onglets([{ id: 'studio', nom: '🎛️ Studio' }, { id: 'dates', nom: '📅 Dates' }, { id: 'prod', nom: '🎵 Produire' }, { id: 'dormir', nom: '😴 Dormir' }]);
    if (o === 'studio') {
      const p = j.prochainePiece;
      const n = MATERIEL.filter((m) => s.materiel.includes(m.id)).length;
      let h = `<div class="studio-vue"><canvas id="studio-canvas"></canvas><div class="studio-compte">${n} / ${MATERIEL.length} pièces</div></div>`;
      if (p) h += ligne({ ico: p.icone, titre: `Prochaine pièce : ${p.nom}`, sous: `${argent(p.prix)} · ${echappe(p.desc)}`, bouton: s.cash >= p.prix ? bouton('Y aller', 'aller', 'gear', 'jaune') : gris(argent(p.prix), `il manque ${argent(p.prix - s.cash)}`), classe: 'or' });
      else h += `<div class="carte or"><b>Le studio est complet.</b> Il ne reste qu’à en faire quelque chose.</div>`;
      h += `<div class="chiffres"><div class="chiffre"><b>${Math.round(j.talent)}</b><span>talent</span></div><div class="chiffre"><b>${s.collection.length}</b><span>disques</span></div><div class="chiffre"><b>${Math.round(j.qualiteProd)}</b><span>qualité prod</span></div></div>`;
      if (s.collection.length) {
        h += `<div class="titre-section">Ta collection</div><div class="pochettes">` + s.collection.slice().reverse().slice(0, 24).map((id) => { const d = disqueParId(id); return d ? pochette(d, {}) : ''; }).join('') + '</div>';
        if (s.collection.length > 24) h += `<div class="note">et ${s.collection.length - 24} autres.</div>`;
      }
      return h;
    }
    if (o === 'dates') return blocDates(ui, j);
    if (o === 'prod') {
      if (!j.peutProduire) return `<div class="carte verrou"><b>Il te faut un laptop.</b><br><span class="note">Chez Massive Machines, après les moniteurs.</span></div>` + bouton('Aller chez Massive Machines', 'aller', 'gear', 'jaune large');
      let h = `<div class="carte or"><div class="ligne"><div class="ico">💻</div><div class="txt"><b>Produire un morceau</b><span>6 h · 30 ⚡ · qualité attendue ${Math.round(j.qualiteProd)}</span></div>${s.energie >= 30 ? bouton('Produire', 'produire', '', 'rose') : gris('Fatigué')}</div></div>`;
      if (s.morceaux.length) {
        h += `<div class="titre-section">Tes morceaux</div>` + s.morceaux.slice().reverse().map((m) => ligne({ ico: m.sorti ? '📀' : '🎚️', titre: m.titre, sous: `Qualité ${m.qualite}${m.sorti ? ` · ${m.ventes} ventes` : ' · pas encore sorti'}`, bouton: m.sorti ? gris('En ligne') : bouton('Sortir', 'sortir', m.id, 'jaune') })).join('');
      }
      return h;
    }
    if (o === 'dormir') {
      const a = s.aujourdhui;
      let h = `<div class="chiffres"><div class="chiffre"><b>${argent(a.recettes)}</b><span>gagné aujourd’hui</span></div><div class="chiffre"><b>${argent(a.depenses)}</b><span>dépensé</span></div><div class="chiffre"><b>${j.horloge}</b><span>il est</span></div></div>`;
      if (j.dateCeSoir) h += `<div class="carte rose"><b>Tu joues ce soir !</b> Si tu dors maintenant, tu rates la date.</div>`;
      h += `<div class="note">Dormir termine la journée : les ventes tombent, le loyer part, les campagnes travaillent, un nouveau tableau de dates arrive.</div>`;
      h += bouton('Dormir jusqu’à demain', 'dormir', '', 'bleu large');
      return h;
    }
  },
  dates(ui, j) { ui.entete('Les dates', 'Où tu joues, et pour combien'); ui.onglets(null); return blocDates(ui, j); },

  // ------------------------------------------------------------ boulots
  snack(ui, j) {
    ui.entete('Casse-croûte', 'Les petits boulots, et de quoi manger');
    ui.onglets(null);
    return `<div class="titre-section">Travailler</div>` + blocBoulots(ui, j, 'snack') + blocNourriture(j);
  },
  bar(ui, j) {
    const s = j.s;
    ui.entete('Le Sous-Sol', 'Un bar, une cave, des débutants qui jouent');
    ui.onglets(null);
    let h = '';
    const ce = j.dateCeSoir;
    if (ce && salleParId(ce.salle).lieu === 'bar') h += carteDate(ui, j, ce, true);
    h += `<div class="titre-section">Travailler</div>` + blocBoulots(ui, j, 'bar');
    h += `<div class="titre-section">Boire un verre</div>` + ligne({ ico: '🍺', titre: 'Une bière avec les habitués', sous: 'Des rumeurs, un peu de hype, 9 $', bouton: s.cash >= 9 ? bouton('9 $', 'manger', 'biere') : gris('9 $') });
    h += `<div class="note">Les dates se prennent chez toi, sur le tableau.</div>` + bouton('Voir les dates', 'ouvrir', 'dates', 'jaune large');
    return h;
  },
  club(ui, j) {
    ui.entete('Le Bunker', 'Le club de la ville');
    ui.onglets(null);
    const ce = j.dateCeSoir;
    let h = '';
    if (ce && salleParId(ce.salle).lieu === 'club') h += carteDate(ui, j, ce, true);
    else h += `<div class="carte"><b>Rien pour toi ce soir.</b><span class="note">Le Bunker et le Warehouse passent par le tableau des dates. Plus tu as de hype, plus les cachets montent.</span></div>`;
    const tenant = j.s.scene.residences.bunker;
    if (tenant) h += `<div class="note">Résidence tenue par un rival : le cachet est amputé tant que ta hype est en dessous de la sienne.</div>`;
    h += bouton('Voir les dates', 'ouvrir', 'dates', 'jaune large');
    return h;
  },
  parc(ui, j) {
    ui.entete('Scène du parc', 'Piknic le dimanche, le festival l’été');
    ui.onglets(null);
    const ce = j.dateCeSoir;
    let h = '';
    if (ce && salleParId(ce.salle).lieu === 'parc') h += carteDate(ui, j, ce, true);
    else h += `<div class="carte"><b>La scène est vide.</b><span class="note">Les dates du parc arrivent sur le tableau à partir du niveau 9, le festival à partir du 16.</span></div>`;
    h += bouton('Voir les dates', 'ouvrir', 'dates', 'jaune large');
    return h;
  },
  major(ui, j) {
    ui.entete('La Tour', 'Le stade, le closing set');
    ui.onglets(null);
    const ce = j.dateCeSoir;
    let h = '';
    if (ce && salleParId(ce.salle).lieu === 'stade') h += carteDate(ui, j, ce, true);
    else h += `<div class="carte or"><b>Tout en haut.</b><span class="note">Le stade se joue sur le tableau des dates, au niveau 22. Cent mille personnes.</span></div>`;
    h += bouton('Voir les dates', 'ouvrir', 'dates', 'jaune large');
    return h;
  },

  // ------------------------------------------------------------ materiel
  gear(ui, j) {
    const s = j.s;
    ui.entete('Massive Machines', 'Le matériel, pièce par pièce, dans l’ordre');
    const o = ui.onglets([{ id: 'studio', nom: '🎛️ Studio' }, { id: 'vie', nom: '🚲 Vie' }]);
    if (o === 'vie') return VIE.map((v) => ligne({ ico: v.icone, titre: v.nom, sous: `${argent(v.prix)} · ${echappe(v.desc)}`, bouton: s.vie.includes(v.id) ? gris('✓') : s.cash >= v.prix ? bouton(argent(v.prix), 'vie', v.id) : gris(argent(v.prix)) })).join('');
    let h = '';
    let suivantVu = false;
    for (const m of MATERIEL) {
      const a = s.materiel.includes(m.id);
      const suivant = !a && !suivantVu; if (suivant) suivantVu = true;
      let btn;
      if (a) btn = gris('✓ Installé');
      else if (suivant) btn = s.cash >= m.prix ? bouton(argent(m.prix), 'materiel', m.id, '', 'Acheter') : gris(argent(m.prix), `manque ${argent(m.prix - s.cash)}`);
      else btn = gris(argent(m.prix), '🔒 après');
      h += ligne({ ico: m.icone, titre: m.nom, sous: echappe(m.desc), tags: m.role === 'dj' ? '<span class="tag">kit DJ</span>' : m.role === 'prod' ? '<span class="tag">production</span>' : '', bouton: btn, classe: a ? 'verrou' : suivant ? 'or' : '' });
    }
    return h;
  },

  // ---------------------------------------------------------- disquaires
  disquaire(ui, j, b) {
    const s = j.s;
    const dq = DISQUAIRES.find((d) => d.id === b.id);
    ui.entete(dq.nom, dq.familles.map(nomFamille).join(' · ') + ' · les disques de l’atlas SONAA');
    const o = ui.onglets([{ id: 'bac', nom: '📦 Le bac' }, { id: 'boulot', nom: '💼 Travailler' }]);
    if (o === 'boulot') return blocBoulots(ui, j, 'disquaire');
    const bac = j.bac(b.id);
    let h = `<div class="note">Tape une pochette pour l’acheter. ${s.cash < 9 ? 'Tu es à sec.' : `Tu as ${argent(s.cash)}.`}</div>`;
    h += `<div class="pochettes">` + bac.map((d) => pochette(d, { prix: j.prixDisque(d), act: s.cash >= j.prixDisque(d) ? 'disque' : null })).join('') + '</div>';
    h += bouton('Fouiller encore (30 min)', 'fouiller', b.id, 'jaune large');
    return h;
  },

  // ---------------------------------------------------------------- promo
  promo(ui, j) {
    const s = j.s;
    ui.entete('Radio Machine', 'Faire parler de toi');
    ui.onglets(null);
    let h = '';
    if (s.campagnes.length) h += `<div class="titre-section">En cours</div>` + s.campagnes.map((c) => { const d = CAMPAGNES.find((x) => x.id === c.id); return ligne({ ico: d.icone, titre: d.nom, sous: `Encore ${c.reste} jour${c.reste > 1 ? 's' : ''}`, bouton: gris('⏳'), classe: 'cyan' }); }).join('');
    h += `<div class="titre-section">Lancer une campagne</div>`;
    h += CAMPAGNES.map((c) => {
      const ok = s.niveau >= c.niveau, cours = s.campagnes.some((x) => x.id === c.id);
      return ligne({ ico: c.icone, titre: c.nom, sous: ok ? `+${c.hype} hype · +${court(c.fans)} fans sur ${c.jours} jours · ${echappe(c.desc)}` : `Niveau ${c.niveau}`, bouton: !ok ? gris('🔒') : cours ? gris('En cours') : s.cash >= c.prix ? bouton(argent(c.prix), 'campagne', c.id, 'bleu') : gris(argent(c.prix)), classe: ok ? '' : 'verrou' });
    }).join('');
    return h;
  },

  // ---------------------------------------------------------------- label
  label(ui, j) {
    const s = j.s;
    const p = j.palierLabel, pn = j.prochainPalierLabel;
    ui.entete(p ? p.nom : 'Bureau du label', p ? `${s.roster.length} / ${p.artistes} artistes signés` : 'Un nom, un logo, un catalogue');
    if (!p) {
      ui.onglets(null);
      return `<div class="carte or"><div class="ligne"><div class="ico">🏷️</div><div class="txt"><b>Ouvrir ton label</b><span>${argent(pn.prix)} · niveau 8 · ${echappe(pn.desc)}</span></div>${s.niveau >= 8 && s.cash >= pn.prix ? bouton('Ouvrir', 'label', '', 'rose') : gris(argent(pn.prix), s.niveau < 8 ? 'niveau 8' : `manque ${argent(pn.prix - s.cash)}`)}</div></div>
        <div class="note">Un label signe des artistes. Ils sortent des disques tout seuls, et l’argent tombe chaque nuit, que tu joues ou non. Les premiers sont ceux de la scène locale ; les grands noms de l’atlas viennent quand le label grossit.</div>`;
    }
    const o = ui.onglets([{ id: 'roster', nom: '👥 Tes artistes' }, { id: 'signer', nom: '✍️ Signer' }, { id: 'sorties', nom: '📀 Sorties' }]);
    if (o === 'roster') {
      let h = s.roster.length ? s.roster.map((r) => { const a = artisteQuelconque(r.artisteId); return ligne({ ico: a.real ? '🌍' : '🏘️', titre: a.name, sous: `${nomFamille(a.family)} · moral ${Math.round(r.moral)} % · prochaine sortie jour ${r.prochaineSortie}`, tags: tagFam(a.family) + (a.real ? '<span class="tag rare">atlas</span>' : '') }); }).join('') : `<div class="note">Personne encore. Va signer quelqu’un.</div>`;
      if (pn) h += `<div class="titre-section">Agrandir le label</div>` + ligne({ ico: '🏢', titre: pn.nom, sous: `${argent(pn.prix)} · ${pn.artistes} artistes · ${echappe(pn.desc)}`, bouton: s.cash >= pn.prix ? bouton('Agrandir', 'label', '', 'rose') : gris(argent(pn.prix)), classe: 'or' });
      return h;
    }
    if (o === 'signer') {
      const liste = j.artistesSignables();
      const plein = s.roster.length >= p.artistes;
      let h = plein ? `<div class="carte rose"><b>Ton label est plein.</b> Agrandis-le pour signer encore.</div>` : '';
      h += `<div class="note">Les artistes de l’atlas ouvrent avec la taille du label : palier ${s.label.niveau} → jusqu’au tier ${1 + s.label.niveau}.</div>`;
      h += liste.slice(0, 40).map((a) => ligne({
        ico: a.real ? '🌍' : '🏘️', titre: a.name, sous: a.bio ? echappe(a.bio) : `${a.tracks} morceaux dans l’atlas${a.depuis ? ` · depuis ${a.depuis}` : ''} · qualité ${a.quality} · ${court(a.reach)} fans`,
        tags: tagFam(a.family) + `<span class="tag">tier ${a.tier}</span>` + (a.pris ? '<span class="tag rare">signé ailleurs</span>' : ''),
        bouton: a.pris ? gris('Pris') : plein ? gris('Plein') : s.cash >= a.advance ? bouton(argent(a.advance), 'signer', a.id, 'rose', 'avance') : gris(argent(a.advance)),
        classe: a.pris ? 'verrou' : '',
      })).join('');
      return h;
    }
    if (o === 'sorties') return s.sorties.length ? s.sorties.slice().reverse().map((r) => { const a = artisteQuelconque(r.artisteId); return ligne({ ico: '📀', titre: `${a.name} · ${r.titre}`, sous: `Jour ${r.jour} · qualité ${r.qualite} · ${r.ventes} ventes` }); }).join('') : `<div class="note">Rien de sorti encore. Chaque artiste sort un disque tous les dix à vingt jours.</div>`;
  },

  // ------------------------------------------------------------ le set
  set(ui, j) {
    const s = j.s;
    const date = s.agenda.find((a) => a.id === ui.extra);
    if (!date) { ui.fermer(); return ''; }
    const salle = salleParId(date.salle);
    ui.entete(`Ce soir : ${salle.nom}`, `Cachet ${argent(date.cachet)} · la salle veut du ${nomFamille(date.famille)}`);
    ui.onglets(null);
    const sel = ui.selection;
    const ev = sel.length === 4 ? j.evaluerSet(date, sel) : null;
    let h = `<div class="carte rose"><b>Choisis quatre disques, dans l’ordre.</b><span class="note" style="margin:2px 0 0">La salle attend cette montée d’énergie :</span><div class="courbe">${salle.courbe.map((e) => `<i style="height:${e * 20}%"></i>`).join('')}</div>
      <div class="note" style="margin:0">Même famille, énergie qui colle, tempos qui s’enchaînent : c’est ça qui fait danser.</div></div>`;
    if (ev) {
      h += `<div class="carte or"><b>Le set tient ${Math.round(ev.score * 100)} %</b>
        <div class="note" style="margin:4px 0 0">Famille ${Math.round(ev.famille * 100)} % · énergie ${Math.round(ev.energie * 100)} % · enchaînements ${Math.round(ev.tempo * 100)} %</div>
        <div class="jauge"><i class="${ev.score >= 0.7 ? '' : ev.score >= 0.45 ? 'jaune' : 'rose'}" style="width:${ev.score * 100}%"></i></div>
        ${bouton('Jouer le set !', 'lancer-set', '', 'rose large')}</div>`;
    } else h += `<div class="note">${4 - sel.length} disque${4 - sel.length > 1 ? 's' : ''} à choisir.</div>`;
    const coll = s.collection.map(disqueParId).filter(Boolean).sort((a, b) => (b.family === date.famille) - (a.family === date.famille) || a.bpm - b.bpm);
    h += `<div class="pochettes">` + coll.map((d) => pochette(d, { act: 'choisir', num: sel.indexOf(d.id) + 1, choisie: sel.includes(d.id) })).join('') + '</div>';
    if (coll.length < 4) h += `<div class="carte rose"><b>Il te faut au moins quatre disques.</b></div>`;
    return h;
  },
  resultat(ui, j) {
    const r = ui.extra;
    const note = r.score >= 0.85 ? 'Ils ont hurlé.' : r.score >= 0.7 ? 'La salle a dansé jusqu’au bout.' : r.score >= 0.45 ? 'Correct. Quelques départs au bar.' : 'Le dancefloor s’est vidé. Ça arrive.';
    ui.entete(`${etoiles(Math.max(1, Math.round(r.score * 5)))}`, note);
    ui.onglets(null);
    let h = `<div class="chiffres"><div class="chiffre"><b>+${argent(r.cachet + r.bonusSerie)}</b><span>cachet</span></div><div class="chiffre"><b>+${court(r.fans)}</b><span>fans</span></div><div class="chiffre"><b>+${r.hype}</b><span>hype</span></div></div>`;
    h += `<div class="carte"><div class="note" style="margin:0">Famille ${Math.round(r.famille * 100)} % · énergie ${Math.round(r.energie * 100)} % · enchaînements ${Math.round(r.tempo * 100)} % · talent ${Math.round(r.talent * 100)} %</div></div>`;
    if (r.bonusSerie) h += `<div class="carte or"><b>🔥 Série de ${r.serie} bons sets : +${argent(r.bonusSerie)}</b></div>`;
    if (r.reprise) h += `<div class="carte cyan"><b>Tu prends la résidence de ${echappe(r.reprise.name)} !</b></div>`;
    h += `<div class="note">+${r.xp} xp. Il est tard : rentre dormir, ou va boire un verre.</div>`;
    h += bouton('Continuer', 'fermer', '', 'large');
    return h;
  },

  // -------------------------------------------------------- transverses
  verrou(ui, j, b) {
    ui.entete(b.nom, `En chantier · ouvre au niveau ${b.niveau}`);
    ui.onglets(null);
    const dq = DISQUAIRES.find((d) => d.id === b.id);
    return `<div class="carte or"><b>🚧 Niveau ${b.niveau}</b><span class="note" style="margin:4px 0 0">${dq ? `Un disquaire ${dq.familles.map(nomFamille).join(' et ')}.` : b.kind === 'club' ? 'Le club de la ville, et ses cachets.' : b.kind === 'label' ? 'Ton label : des artistes qui rapportent sans que tu joues.' : b.kind === 'parc' ? 'Les grandes scènes de plein air.' : 'Le sommet.'}</span></div>
      <div class="note">Tu es niveau ${j.s.niveau}. Travaille, achète, joue : tout donne de l’expérience.</div>`;
  },
  niveau(ui, j) {
    const s = j.s;
    ui.entete(`Niveau ${s.niveau} · ${j.titre}`, `${Math.round(s.xp)} / ${xpPour(s.niveau)} xp`);
    ui.onglets(null);
    let h = `<div class="jauge"><i class="jaune" style="width:${j.progresNiveau * 100}%"></i></div><div class="titre-section">Ce qui arrive</div>`;
    h += Object.entries(PALIERS).filter(([n]) => +n > s.niveau).slice(0, 6).map(([n, t]) => ligne({ ico: '🔒', titre: `Niveau ${n}`, sous: echappe(t) })).join('');
    return h;
  },
  bilan(ui, j) {
    const s = j.s;
    ui.entete('Le bilan', `Jour ${s.jour} · ${j.titre}`);
    const o = ui.onglets([{ id: 'compte', nom: '💰 Compte' }, { id: 'scene', nom: '🎧 La scène' }]);
    if (o === 'scene') {
      const cl = j.classement();
      let h = `<div class="note">La hype décide qui joue où. Tu es ${j.maPlace}e sur ${cl.length}.</div>`;
      h += cl.map((c, i) => ligne({ ico: c.moi ? '🫵' : ['🥇', '🥈', '🥉'][i] || '🎧', titre: c.nom, sous: c.famille ? nomFamille(c.famille) : 'toi', bouton: `<b>${Math.round(c.hype)}</b>`, classe: c.moi ? 'or' : '' })).join('');
      if (s.scene.journal.length) h += `<div class="titre-section">Le journal de la scène</div>` + s.scene.journal.slice(0, 8).map((e) => `<div class="note">J${e.jour} · ${echappe(e.txt)}</div>`).join('');
      return h;
    }
    let h = `<div class="chiffres"><div class="chiffre"><b>${argent(s.cash)}</b><span>en poche</span></div><div class="chiffre"><b>${argent(j.valeur)}</b><span>ta valeur</span></div><div class="chiffre"><b>${court(s.fans)}</b><span>fans</span></div></div>`;
    h += `<div class="chiffres"><div class="chiffre"><b>${s.stats.sets}</b><span>sets joués</span></div><div class="chiffre"><b>${s.collection.length}</b><span>disques</span></div><div class="chiffre"><b>${s.stats.ventes}</b><span>ventes</span></div></div>`;
    if (s.historique.length) {
      h += `<div class="titre-section">Les derniers jours</div>`;
      const max = Math.max(1, ...s.historique.map((x) => Math.max(x.recettes, x.depenses)));
      h += `<div class="carte">` + s.historique.slice(-8).map((x) => `<div class="note" style="margin:2px 0"><b>J${x.jour}</b> · +${argent(x.recettes)} · -${argent(x.depenses)}<div class="jauge" style="height:6px"><i style="width:${x.recettes / max * 100}%"></i></div></div>`).join('') + '</div>';
    }
    return h;
  },
  jour(ui, j) {
    const r = ui.extra;
    ui.entete(`Jour ${r.jour + 1}`, r.force ? 'Tu t’es écroulé à 3 h. La nuit est passée.' : 'Une nouvelle journée');
    ui.onglets(null);
    let h = `<div class="chiffres"><div class="chiffre"><b>+${argent(r.recettes)}</b><span>rentré cette nuit</span></div><div class="chiffre"><b>-${argent(r.depenses)}</b><span>parti cette nuit</span></div><div class="chiffre"><b>${j.s.offres.length}</b><span>dates au tableau</span></div></div>`;
    h += r.lignes.map((l) => `<div class="note" style="margin:3px 0">${l.n > 0 ? '💰' : l.n < 0 ? '📤' : '📣'} ${echappe(l.txt)}${l.n ? ` · <b>${l.n > 0 ? '+' : ''}${argent(l.n)}</b>` : ''}</div>`).join('') || '<div class="note">Une nuit calme.</div>';
    h += bouton('C’est parti', 'fermer', '', 'large');
    return h;
  },
  menu(ui, j) {
    ui.entete('Menu', 'SONAA · DJ Tycoon');
    ui.onglets(null);
    return `<div class="carte"><b>Comment jouer</b><div class="note" style="margin:4px 0 0">Tape sur un lieu pour t’y rendre. Travaille au casse-croûte, achète ton matériel dans l’ordre chez Massive Machines, remplis tes bacs chez les disquaires, accepte des dates sur le tableau chez toi, joue des sets qui montent en énergie. La hype fait monter les cachets. Au niveau 8, ouvre ton label et signe les artistes de l’atlas.</div></div>
      <div class="carte"><b>Les disques</b><div class="note" style="margin:4px 0 0">Ce sont les ${DISQUES.length} morceaux de l’atlas SONAA, dans leurs ${FAMILLES.length} familles. Les pochettes sont les vraies.</div></div>
      <a class="bouton bleu large" style="display:block;text-decoration:none;color:#fff" href="/#/parcourir">Ouvrir l’atlas SONAA</a>
      ${bouton('Recommencer une partie', 'nouvelle', '', 'gris large')}`;
  },
};

/* UNE POCHETTE : la vraie image de l'atlas, la famille en liseret de
   couleur, la rarete en etoiles, l'energie en points. */
function pochette(d, o) {
  const src = srcPochette(d);
  const genre = genreParId(d.genre);
  return `<button class="pochette ${o.choisie ? 'choisie' : ''}" ${o.act ? `data-act="${o.act}" data-arg="${d.id}"` : 'disabled'} title="${echappe(d.artist)} · ${echappe(d.title)}">
    ${src ? `<img src="${src}" alt="" loading="lazy">` : '<canvas></canvas>'}
    <div class="fam" style="background:${couleurFamille(d.family)}"></div>
    <div class="etoiles">${etoiles(d.rarity)}</div>
    ${o.prix != null ? `<div class="prix">${argent(o.prix)}</div>` : ''}
    ${o.num ? `<div class="num">${o.num}</div>` : ''}
    <div class="infos"><b>${echappe(d.title)}</b><span>${echappe(d.artist)}${d.year ? ' · ' + d.year : ''}</span><span>${echappe(genre?.label || d.genre)} · ${d.bpm} bpm ${pointsEnergie(d.energy)}</span></div>
  </button>`;
}
