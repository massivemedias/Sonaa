// =====================================================================
//  SONAA · DJ Tycoon · point d'entree
//  ---------------------------------------------------------------
//  Phaser affiche la ville (WebGL). L'interface est en DOM par-dessus.
//  Le Jeu est un objet d'etat qui ne sait rien de l'un ni de l'autre.
// =====================================================================
import { Carte } from './world/carte.js';
import { Ville } from './scenes/ville.js';
import { Jeu, nouvelEtat } from './game/etat.js';
import { UI } from './ui/ui.js';
import { cuirePoses, cuireBatiment, dessinerPersonnage, versEcran, cube, ENCRE } from './world/dessin.js';
import { BATIMENTS } from './data/monde.js';

const $ = (s) => document.querySelector(s);
const carte = new Carte();
let jeu = new Jeu(nouvelEtat());
let phaser = null;
let ville = null;

const ui = new UI(jeu, {
  allerA: (id) => { const b = carte.batiments.find((x) => x.id === id); if (b && ville) ville.allerA(b); },
  entrer: (b) => entrer(b),
  heros: () => (ville ? ville.positionEcranHeros() : { x: window.innerWidth / 2, y: window.innerHeight / 2 }),
  scene: () => ville,
  nouvellePartie: () => { Jeu.effacer(); demarrer(nouvelEtat()); },
});

function entrer(b) {
  if (!jeu.ouvert(b)) { ui.ouvrir('verrou', b); return; }
  ui.ouvrir(b.kind, b);
}

function demarrer(etat) {
  jeu = new Jeu(etat);
  ui.brancher(jeu);
  $('#titre').classList.add('cache');
  $('#hud').classList.remove('cache');
  $('#barre').classList.remove('cache');
  const ctx = { carte, jeu, ui, surEntrer: (b) => entrer(b), surPorte: (b) => ui.boutonAction(b), surScene: (sc) => { ville = sc; } };
  if (!phaser) {
    phaser = new Phaser.Game({
      type: Phaser.AUTO, parent: 'jeu', backgroundColor: '#5fb8ff',
      antialias: true, roundPixels: false,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
      input: { activePointers: 2 },
      scene: [],
    });
    phaser.scene.add('ville', Ville, true, ctx);
  } else {
    phaser.scene.stop('ville');
    phaser.scene.start('ville', ctx);
  }
  ville = phaser.scene.getScene('ville') || ville;
  ui.boutonAction(null);
  ui.hud();
  if (etat.jour === 1 && etat.stats.quarts === 0) {
    setTimeout(() => ui.toast('Tape sur un lieu pour t’y rendre. Commence par le casse-croûte.', 'or'), 600);
  }
}

// ------------------------------------------------------------ ecran titre
const sauvegarde = Jeu.charger();
if (sauvegarde) $('#btn-continuer').classList.remove('cache');
$('#btn-nouvelle').addEventListener('click', () => { if (!sauvegarde || confirm('Une partie existe. Recommencer ?')) { Jeu.effacer(); demarrer(nouvelEtat()); } else demarrer(sauvegarde); });
$('#btn-continuer').addEventListener('click', () => demarrer(Jeu.charger() || nouvelEtat()));

/* Le diorama du titre : la maison, le heros et une caisse de disques. */
(function titre() {
  const c = $('#titre-art'), g = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = 360 * dpr; c.height = 220 * dpr;
  const heros = cuirePoses({ corps: '#f2b33d', short: '#4a86d9', casque: true }).poses;
  const maison = BATIMENTS.find((b) => b.id === 'home');
  const bat = cuireBatiment({ ...maison, x: 0, y: 0 }, true);
  const club = cuireBatiment({ ...BATIMENTS.find((b) => b.id === 'club'), x: 0, y: 0, w: 3, d: 3 }, true);
  let t = 0;
  const cadre = () => {
    if ($('#titre').classList.contains('cache')) return;
    t += 1 / 60;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, 360, 220);
    // l'ile
    g.save(); g.translate(180, 120);
    const P = versEcran;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const p = [P(x - 3, y - 3), P(x - 2, y - 3), P(x - 2, y - 2), P(x - 3, y - 2)]; g.fillStyle = (x + y) % 2 ? '#7ed957' : '#84df5d'; g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < 4; i++) g.lineTo(p[i].x, p[i].y); g.closePath(); g.fill(); }
    const a = P(3, -3), b = P(3, 3), cc = P(-3, 3);
    g.fillStyle = '#a3773f'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(b.x, b.y + 26); g.lineTo(a.x, a.y + 26); g.closePath(); g.fill();
    g.fillStyle = '#7a5533'; g.beginPath(); g.moveTo(cc.x, cc.y); g.lineTo(b.x, b.y); g.lineTo(b.x, b.y + 26); g.lineTo(cc.x, cc.y + 26); g.closePath(); g.fill();
    g.strokeStyle = ENCRE; g.lineWidth = 4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(cc.x, cc.y); g.moveTo(a.x, a.y + 26); g.lineTo(b.x, b.y + 26); g.lineTo(cc.x, cc.y + 26); g.moveTo(b.x, b.y); g.lineTo(b.x, b.y + 26); g.stroke();
    // les batiments, decales sur l'ile
    g.save(); g.translate(P(-2.6, -2.6).x, P(-2.6, -2.6).y); g.drawImage(bat.canvas, bat.dx, bat.dy); g.restore();
    g.save(); g.translate(P(0.4, -2.2).x, P(0.4, -2.2).y); g.scale(0.85, 0.85); g.drawImage(club.canvas, club.dx, club.dy); g.restore();
    cube(g, -1.2, 1.2, 0, 0.8, 0.6, 0.5, '#c9924e');
    // le heros qui danse
    const f = Math.floor(t * 8) % 4;
    const pose = heros['marche_d_' + f];
    const ph = P(0.6, 1.4);
    g.drawImage(pose, ph.x - 48, ph.y - 100 + Math.round(Math.sin(t * 8) * 2));
    g.restore();
    requestAnimationFrame(cadre);
  };
  requestAnimationFrame(cadre);
})();

/* La date de la copie qui tourne, lue sur ce fichier meme. */
(async () => {
  try {
    const r = await fetch('src/main.js', { method: 'HEAD' });
    const lm = r.headers.get('last-modified'); if (!lm) return;
    const d = new Date(lm); if (isNaN(d)) return;
    const e = document.createElement('div'); e.className = 'logo-ver';
    e.textContent = 'version du ' + d.toLocaleString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    $('.titre-aide').insertAdjacentElement('afterend', e);
  } catch (e) { /* hors ligne */ }
})();

window.addEventListener('beforeunload', () => jeu && jeu.sauver());
document.addEventListener('visibilitychange', () => { if (document.hidden && jeu) jeu.sauver(); });
window.__sonaa = { get jeu() { return jeu; }, get ville() { return ville; }, ui, carte, demarrer };
