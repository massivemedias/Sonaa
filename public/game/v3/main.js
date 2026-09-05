// =====================================================================
//  SONAA 3D · point d'entree
//  ---------------------------------------------------------------
//  C'est le main.js de la version canvas, avec le rendu remplace. Tout ce
//  qui n'est pas de l'affichage est importe tel quel de ../src :
//  l'etat, l'economie, les quetes, les rivaux, les dialogues, la vie de
//  la clairiere, l'interface. Aucun de ces fichiers n'a ete touche.
//
//  CE QUI A DU ETRE REECRIT, ET SEULEMENT CELA :
//   - le rendu, evidemment ;
//   - la conversion ecran vers monde, qui etait une inversion de matrice
//     isometrique et devient un lancer de rayon sur le sol ;
//   - les etiquettes de porte et d'enseigne, qui passent du canevas au
//     DOM : en volume elles n'ont plus de place fixe a l'ecran, et le DOM
//     les rend en Nunito net a n'importe quelle distance.
// =====================================================================
import { City, START } from '../src/world/city.js';
import { Player } from '../src/game/player.js';
import { Game, newState } from '../src/game/state.js';
import { UI } from '../src/ui/ui.js';
import { Music } from '../src/audio/music.js';
import { Life, passantProche } from '../src/world/life.js';
import { Input } from '../src/core/input.js';
import { Ville } from './ville.js';

const $ = s => document.querySelector(s);

const city = new City();
const ville = new Ville($('#ville'), city);
const music = new Music();
const life = new Life(city);
let musicWasOn = false;

let game = new Game(newState());
let player = new Player(START.x, START.y);

const ui = new UI(game, {
  goto: id => walkTo(city.buildings.find(x => x.id === id)),
  buildings: () => city.buildings,
  music: () => music.toggle(),
  musicOn: () => music.on,
  duck: on => { if (on) { musicWasOn = music.on; music.stop(); } else if (musicWasOn) music.start(); },
  newGame: () => startGame(newState(), true),
});

let goal = null;

function walkTo(b) {
  if (!b) return;
  if (player.goTo(b.door.x + 0.5, b.door.y + 0.5, city)) {
    goal = b;
    game.toast(`En route vers ${b.name}…`, '');
  } else {
    openBuilding(b);
  }
}

/* LE STICK ET LE TAP SONT CEUX DU JEU, INCHANGES. Input attend un objet
   qui sache convertir un point d'ecran en point du monde et changer de
   zoom : la ville sait faire les deux, on la lui passe telle quelle. */
const input = new Input($('#stick'), $('#stick-knob'), ville.hote, {
  cam: { unproject: (px, py) => ville.versLeMonde(px, py) },
  zoomer: sens => ville.zoomer(sens),
});
input.onTap((px, py) => {
  if (ui.isOpen || !ville.pret) return;
  const w = ville.versLeMonde(px, py);
  let b = city.buildingAt(w.x | 0, w.y | 0);
  if (!b) b = city.nearestDoor(w.x, w.y, 1.2);
  if (b) {
    if (Math.hypot(player.x - (b.door.x + .5), player.y - (b.door.y + .5)) < 1.4) openBuilding(b);
    else walkTo(b);
  } else {
    goal = null;
    player.goTo(w.x, w.y, city);
  }
});

$('#quest').addEventListener('click', () => {
  const t = game.quest && game.quest.step && game.quest.step.target;
  if (t) walkTo(city.buildings.find(b => b.id === t));
});

// ------------------------------------------------------------ bouton action
let nearBuilding = null, nearPnj = null;
const actionBtn = $('#btn-action'), actionLabel = $('#btn-action-label');

function agir() {
  if (nearPnj) { ui.ouvrirDialogue(nearPnj.identite); return; }
  if (nearBuilding) openBuilding(nearBuilding);
}
actionBtn.addEventListener('click', agir);
window.addEventListener('keydown', e => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  const c = e.target;
  if (c && /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(c.tagName)) return;
  e.preventDefault();
  if (ui.isOpen) return;
  agir();
});
$('#btn-menu').addEventListener('click', () => ui.open('menu'));
$('#btn-map').addEventListener('click', () => ui.open('map'));
$('#btn-fin').addEventListener('click', () => ui.open('finance'));
$('#btn-scene').addEventListener('click', () => ui.open('scene'));
$('#needs').addEventListener('click', () => ui.open('etat'));

function checkArrival() {
  if (!goal || player.path) return;
  const d = Math.hypot(player.x - (goal.door.x + .5), player.y - (goal.door.y + .5));
  const g2 = goal; goal = null;
  if (d < 1.6) openBuilding(g2);
}
function openBuilding(b) {
  if (!game.unlocked(b)) { ui.open('locked', b); return; }
  ui.open(b.kind, b);
}

// -------------------------------------------------------------- etiquettes
/* LES NOMS VIVENT DANS LE DOM, PAS DANS LA SCENE.

   En 2D ils etaient peints sur le canevas, a une taille connue d'avance. En
   volume, un panneau colle sur un batiment tourne avec lui et devient
   illisible de trois quarts ; un panneau face camera dans la scene demande
   une texture par nom, refaite a chaque changement de zoom. Le DOM resout
   les deux : on projette le point du monde, on pose l'etiquette dessus, et
   Nunito reste net a toutes les distances. */
const calque = document.createElement('div');
calque.className = 'etiquettes';
document.body.appendChild(calque);
const etiquettes = new Map();
for (const b of city.buildings) {
  if (!b.sign) continue;
  const e = document.createElement('div');
  e.className = 'etiq';
  e.textContent = b.sign;
  calque.appendChild(e);
  etiquettes.set(b.id, e);
}
const bulle = document.createElement('div');
bulle.className = 'etiq etiq-porte';
calque.appendChild(bulle);

function majEtiquettes() {
  for (const b of city.buildings) {
    const e = etiquettes.get(b.id);
    if (!e) continue;
    const ouvert = game.unlocked(b);
    const d = Math.hypot(player.x - (b.x + b.w / 2), player.y - (b.y + b.d / 2));
    if (!ouvert || d > 16) { e.style.display = 'none'; continue; }
    const p = ville.versLEcran(b.x + b.w / 2, b.y + b.d / 2, 2.6);
    if (!p.devant) { e.style.display = 'none'; continue; }
    e.style.display = 'block';
    e.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`;
    e.style.opacity = d > 13 ? '0.45' : '1';
  }
  if (nearBuilding) {
    const b = nearBuilding;
    const p = ville.versLEcran(b.door.x + 0.5, b.door.y + 0.5, 1.5);
    bulle.style.display = 'block';
    bulle.textContent = game.unlocked(b) ? b.name : b.name + ' · fermé';
    bulle.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`;
  } else bulle.style.display = 'none';
}

// ------------------------------------------------------------- demarrage
function startGame(state, fresh) {
  game = new Game(state);
  player = new Player(START.x, START.y);
  ui.game = game;
  game.on('toast', (m, k) => ui.toast(m, k));
  game.on('change', () => ui.hud());
  game.on('tierup', t => ui.tierUp(t));
  game.on('quest', st => { ui.toast('Objectif : ' + st.goal, 'gold'); ui.hud(); });
  game.on('end', () => ui.ending());
  ui.close();
  $('#title').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  $('#controls').classList.remove('hidden');
  calque.classList.add('on');
  ui.hud();
  music.stop();
  goal = null;
  ville.majBatiments(game);
  if (fresh) game.toast('Tape sur un bâtiment pour t’y rendre et y entrer.', 'gold');
}

/* LA DATE DE LA COPIE QUI TOURNE.

   ELLE REGARDE PLUSIEURS FICHIERS, ET C'EST UNE CORRECTION. Elle ne lisait
   que main.js. Deux deploiements de suite n'ont touche ni main.js ni rien
   qu'il contienne : la date est restee figee pendant que le jeu changeait,
   et l'indicateur ecrit precisement pour dire quelle version tourne ne le
   disait plus. On prend donc la plus recente d'une poignee de fichiers, un
   par couche : le point d'entree, le rendu, la feuille de style.

   Le cache par defaut, surtout pas `no-store` : la reponse doit venir d'ou
   vient le code lui-meme, cache HTTP ou service worker compris, sinon on
   afficherait la date du serveur pendant qu'on joue une vieille copie. */
async function dater(fichiers) {
  let plus = null;
  for (const f of fichiers) {
    try {
      const r = await fetch(f, { method: 'HEAD' });
      const lm = r.headers.get('last-modified');
      if (!lm) continue;
      const d = new Date(lm);
      if (!isNaN(d) && (!plus || d > plus)) plus = d;
    } catch (e) { /* un fichier injoignable n'empeche pas de dater les autres */ }
  }
  return plus;
}

(async () => {
  const d = await dater(['./main.js', './ville.js', '../styles.css']);
  if (!d) return;
  const sous = document.querySelector('.logo-sub');
  if (!sous) return;
  const el = document.createElement('div');
  el.className = 'logo-ver';
  el.textContent = '3D · version du ' + d.toLocaleString('fr-CA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  sous.insertAdjacentElement('afterend', el);
})();

const saved = Game.load();
if (saved) $('#btn-continue').classList.remove('hidden');
$('#btn-new').addEventListener('click', () => startGame(newState(), true));
$('#btn-continue').addEventListener('click', () => startGame(Game.load() || newState(), false));

// ----------------------------------------------------------------- boucle
await ville.demarrer();
let last = performance.now();
let tierVu = -1;

function boucle(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const enJeu = $('#title').classList.contains('hidden');

  if (enJeu) {
    if (!ui.isOpen) {
      player.update(dt, city, input.vector());
      life.update(dt);
      game.tick(dt);
    }
    checkArrival();

    const p = passantProche(life, player.x, player.y, 1.5);
    if (p !== nearPnj) {
      nearPnj = p;
      if (p) { actionBtn.classList.remove('hidden'); actionLabel.textContent = 'Parler · ' + p.identite.nom; }
    }
    const b = city.nearestDoor(player.x, player.y, 1.4);
    if (b !== nearBuilding) {
      nearBuilding = b;
      actionBtn.classList.toggle('hidden', !b && !nearPnj);
      if (b && !nearPnj) actionLabel.textContent = game.unlocked(b) ? 'Entrer · ' + b.name : 'Fermé';
    }
    // le bati ne change qu'au passage d'un palier : inutile d'y toucher a
    // chaque image, et le comparer coute moins qu'un parcours des dix-sept.
    if (game.tier !== tierVu) { tierVu = game.tier; ville.majBatiments(game); }

    ville.majHeros(player);
    ville.majPassants(life);
    ville.majLumiere(game.hour);
    ville.majHalos(player.x, player.y);
    majEtiquettes();
  }
  ville.image(enJeu ? player : { x: city.w / 2, y: city.h / 2 });
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);

window.__sonaa3d = { get game() { return game; }, get player() { return player; }, ui, city, ville, life, input };
