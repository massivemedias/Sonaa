// =====================================================================
//  LA VILLE EN VOLUME · Three.js + assets CC0
//  ---------------------------------------------------------------
//  Meme ville, meme plan, memes dix-sept batiments : city.js n'a pas
//  bouge d'une ligne. Ce qui change, c'est qu'on ne dessine plus, on
//  eclaire.
//
//  ELLE NE DECIDE DE RIEN. Le jeu vit dans main.js : c'est lui qui tient
//  le joueur, l'heure, les passants et l'interface, et qui appelle ici
//  pour dire ou tout se trouve. La ville sait afficher, rien d'autre :
//  c'est ce qui a permis de la poser sous une logique ecrite pour un
//  canvas 2D sans y toucher.
//
//  LES ASSETS SONT EN CC0, les deux, licence lue dans les fichiers livres
//  avec les paquets et recopiee a cote des modeles :
//    - KayKit City Builder Bits, Kay Lousberg
//    - City Kit Suburban, Kenney
//  Le pack voxel de monogon est en CC BY-ND : il n'est pas ici, et il n'y
//  sera pas tant que son auteur n'aura pas repondu sur la conversion.
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { GRASS, PATH, LUSH, CLEARING, FOREST, WATER, SAND } from '../src/world/city.js';

const COULEUR = {
  [GRASS]: 0x6cc24a, [LUSH]: 0x4da537, [CLEARING]: 0x8ad46a,
  [PATH]: 0xbfa678, [SAND]: 0xe0cd96, [WATER]: 0x3f86c4, [FOREST]: 0x2f7a28,
};

const MODELE = {
  d_techno:  'kaykit/building_F',   d_house:   'kenney/house_type03',
  d_electro: 'kenney/house_type05', d_acid:    'kenney/house_type09',
  d_idm:     'kenney/house_type12', promo:     'kaykit/building_C',
  home:      'kenney/house_type07', bar:       'kaykit/building_B',
  gear:      'kenney/house_type14', snack:     'kenney/house_type02',
  studio:    'kenney/house_type17', label:     'kaykit/building_D',
  press:     'kaykit/building_E',   store:     'kenney/house_type19',
  club:      'kaykit/building_H',   d_ambient: 'kenney/house_type04',
  major:     'kaykit/building_A',
};

const CORPS = [0xf2cf4c, 0xe88f4a, 0xe8709a, 0x7fb8f0, 0xb98fe8, 0x8fe0a8];

/* LES HEURES ET LEUR LUMIERE. Six paliers, et l'on interpole entre eux :
   c'est le meme decoupage que la version canvas, transpose de teintes plates
   a des couleurs de lampe. Le ciel, le soleil et le brouillard bougent
   ensemble, sans quoi on obtient un coucher de soleil sous un ciel de midi. */
const PALIERS = [
  { h: 0,  ciel: 0x121a33, sol: 0x1b2545, dir: 0x6f86c9, i: 0.35, amb: 0.55 },
  { h: 6,  ciel: 0x6f7fae, sol: 0x4a5570, dir: 0xffb27a, i: 1.1,  amb: 1.1 },
  { h: 9,  ciel: 0x9fd4ef, sol: 0x6b7a52, dir: 0xfff3d8, i: 2.3,  amb: 2.1 },
  { h: 15, ciel: 0xa8dcf2, sol: 0x6b7a52, dir: 0xfff6e2, i: 2.4,  amb: 2.2 },
  { h: 19, ciel: 0xe8a06a, sol: 0x6b5a52, dir: 0xffb066, i: 1.5,  amb: 1.4 },
  { h: 22, ciel: 0x1d2647, sol: 0x1f2a4a, dir: 0x7a90d6, i: 0.5,  amb: 0.7 },
];

export class Ville {
  constructor(hote, city) {
    this.hote = hote;
    this.city = city;
    this.pret = false;
    this.batiments = new Map();   // id -> { modele, chantier }
    this.passants = [];
    /* ONZE MONTRAIT LE QUARTIER, PAS LA RUE : le heros y etait un point
       jaune de six pixels. A neuf, on le voit marcher, et l'on distingue
       encore les quatre batiments voisins. */
    this.d = 9;
  }

  async demarrer() {
    const sc = this.scene = new THREE.Scene();
    const r = this.rendu = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.hote.appendChild(r.domElement);

    /* LA CAMERA ORTHOGRAPHIQUE, ET C'EST ELLE QUI FAIT LE GENRE. Une
       perspective donnerait une maquette vue de pres ; l'orthographique
       donne le jouet pose sur la table. */
    const a = innerWidth / innerHeight;
    this.cam = new THREE.OrthographicCamera(-this.d * a, this.d * a, this.d, -this.d, -300, 500);
    this.cam.position.set(22, 24, 22);

    this.ambiante = new THREE.HemisphereLight(0xdfefff, 0x6b7a52, 2.1);
    sc.add(this.ambiante);
    const s = this.soleil = new THREE.DirectionalLight(0xfff3d8, 2.3);
    s.castShadow = true;
    s.shadow.mapSize.set(2048, 2048);
    const o = s.shadow.camera;
    o.left = -26; o.right = 26; o.top = 26; o.bottom = -26; o.near = 1; o.far = 120;
    s.shadow.bias = -0.0012;
    sc.add(s, s.target);
    sc.fog = new THREE.Fog(0x9fd4ef, 40, 86);
    sc.background = new THREE.Color(0x9fd4ef);

    this.poserLeSol();
    this.heros = this.figurine(0xf2b33d, 0x4a86d9);
    sc.add(this.heros);
    await this.poserLeBati();

    addEventListener('resize', () => this.redimensionner());
    this.pret = true;
  }

  /* LE SOL : UN MAILLAGE INSTANCIE PAR TYPE DE TUILE. Mille six cent
     trente-quatre tuiles posees une a une font autant d'objets a dessiner ;
     groupees par type, il en reste sept. */
  poserLeSol() {
    const c = this.city;
    const parType = new Map();
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const t = c.tiles[c.idx(x, y)];
      if (!parType.has(t)) parType.set(t, []);
      parType.get(t).push([x, y]);
    }
    const g = new THREE.BoxGeometry(1, 0.4, 1);
    for (const [t, liste] of parType) {
      const m = new THREE.MeshLambertMaterial({ color: COULEUR[t] ?? 0x6cc24a });
      const maille = new THREE.InstancedMesh(g, m, liste.length);
      maille.receiveShadow = true;
      const d = new THREE.Object3D();
      liste.forEach(([x, y], i) => {
        d.position.set(x + 0.5, t === WATER ? -0.34 : -0.2, y + 0.5);
        d.updateMatrix();
        maille.setMatrixAt(i, d.matrix);
      });
      this.scene.add(maille);
    }
  }

  /* Une creature faite de primitives : aucun des deux paquets ne contient
     de personnage, et en fabriquer un ici coute dix lignes. */
  figurine(corps, culotte) {
    const g = new THREE.Group();
    const mc = new THREE.MeshLambertMaterial({ color: corps });
    const tronc = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.16, 4, 10), mc);
    tronc.position.y = 0.32; tronc.castShadow = true;
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), mc);
    tete.position.y = 0.66; tete.castShadow = true;
    const bas = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.2, 10),
      new THREE.MeshLambertMaterial({ color: culotte }));
    bas.position.y = 0.12; bas.castShadow = true;
    g.add(tronc, tete, bas);
    g.userData.tete = tete;
    return g;
  }

  async poserLeBati() {
    const L = new GLTFLoader();
    const cache = new Map();
    const charger = nom => new Promise((ok, ko) => {
      const ext = nom.startsWith('kenney/') ? '.glb' : '.gltf';
      L.load(`./assets/${nom}${ext}`, g => ok(g.scene), undefined, ko);
    });
    const prendre = async nom => {
      if (!cache.has(nom)) cache.set(nom, await charger(nom));
      return cache.get(nom).clone(true);
    };
    const ombrer = o => o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    /* On met le modele a la taille de son emprise au sol, sans jamais
       l'ecraser : un batiment aplati pour entrer dans sa case n'a plus
       l'air d'un batiment. L'echelle se deduit donc du modele lui-meme, ce
       qui tiendra au premier paquet ajoute. */
    const caler = (o, larg, prof) => {
      const b = new THREE.Box3().setFromObject(o);
      const t = b.getSize(new THREE.Vector3());
      o.scale.setScalar(Math.min(larg / (t.x || 1), prof / (t.z || 1)));
      o.position.y -= new THREE.Box3().setFromObject(o).min.y;
    };
    this.caler = caler; this.ombrer = ombrer;

    for (const b of this.city.buildings) {
      const nom = MODELE[b.id];
      const paire = { modele: null, chantier: this.chantier(b) };
      this.scene.add(paire.chantier);
      if (nom) {
        try {
          const o = await prendre(nom);
          caler(o, b.w * 0.92, b.d * 0.92);
          o.position.x += b.x + b.w / 2;
          o.position.z += b.y + b.d / 2;
          ombrer(o);
          o.visible = false;
          this.scene.add(o);
          paire.modele = o;
        } catch (e) { console.warn('modele absent', nom); }
      }
      this.batiments.set(b.id, paire);
    }

    /* LE NEON DU CLUB. Les deux paquets sont des villes de jour : aucun n'a
       d'enseigne lumineuse. Une plaque emissive posee sur la facade et une
       lumiere rose au-dessus de la porte suffisent, et c'est la seule chose
       de toute la clairiere qui dise qu'on y joue de la musique la nuit. */
    const club = this.city.buildings.find(b => b.club);
    if (club) {
      const plaque = new THREE.Mesh(
        new THREE.BoxGeometry(club.w * 0.5, 0.42, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x2a1030, emissive: 0xff5cb4, emissiveIntensity: 0 }));
      plaque.position.set(club.x + club.w / 2, 1.85, club.y + club.d + 0.06);
      this.scene.add(plaque);
      this.neonMur = plaque;
      const l = new THREE.PointLight(0xff5cb4, 0, 9, 2);
      l.position.set(club.x + club.w / 2, 1.7, club.y + club.d + 0.9);
      this.scene.add(l);
      this.neon = l;
    }

    const decors = { tree: 'kenney/tree_large', bush: 'kaykit/bush', lamp: 'kaykit/streetlight', bench: 'kaykit/bench' };
    this.lampes = [];
    for (const pr of this.city.props) {
      const nom = decors[pr.type];
      if (!nom) continue;
      try {
        const o = await prendre(nom);
        const t = pr.type === 'tree' ? 1.5 * (pr.s || 1) : pr.type === 'lamp' ? 1.15 : 0.8;
        caler(o, t, t);
        o.position.x += pr.x; o.position.z += pr.y;
        o.rotation.y = ((pr.x * 7 + pr.y * 13) % 4) * Math.PI / 2;
        ombrer(o);
        this.scene.add(o);
        if (pr.type === 'lamp') this.lampes.push(o);
      } catch (e) { /* un decor manquant n'arrete pas la ville */ }
    }
  }

  /* TERRAIN PAS ENCORE DEBLOQUE : de l'herbe et trois buissons, pas un
     chantier. Un rectangle de terre battue avec une pancarte est une verrue
     dans un village ; de l'herbe ressemble a un endroit ou quelque chose
     poussera. Meme parti pris que la version canvas. */
  chantier(b) {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0x4da537 });
    for (let i = 0; i < 4; i++) {
      const r = 0.2 + ((b.x * 7 + b.y * 3 + i * 5) % 5) * 0.05;
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
      s.position.set(b.x + 0.6 + (i % 2) * (b.w - 1.2), r * 0.7, b.y + 0.6 + Math.floor(i / 2) * (b.d - 1.2));
      s.castShadow = true; s.receiveShadow = true;
      g.add(s);
    }
    return g;
  }

  // ----------------------------------------------------------- mises a jour
  majBatiments(game) {
    for (const b of this.city.buildings) {
      const p = this.batiments.get(b.id);
      if (!p) continue;
      const ouvert = game.unlocked(b);
      if (p.modele) p.modele.visible = ouvert;
      p.chantier.visible = !ouvert;
    }
  }

  majPassants(life) {
    if (!life) return;
    while (this.passants.length < life.walkers.length) {
      const i = this.passants.length;
      const f = this.figurine(CORPS[i % CORPS.length], 0x4a3c66);
      this.scene.add(f);
      this.passants.push(f);
    }
    life.walkers.forEach((w, i) => {
      const f = this.passants[i];
      f.position.set(w.x, 0, w.y);
      f.rotation.y = Math.atan2(w.flip > 0 ? 1 : -1, w.back ? -1 : 1);
    });
  }

  majLumiere(heure) {
    let a = PALIERS[0], b = PALIERS[PALIERS.length - 1];
    for (let i = 0; i < PALIERS.length - 1; i++) {
      if (heure >= PALIERS[i].h && heure <= PALIERS[i + 1].h) { a = PALIERS[i]; b = PALIERS[i + 1]; break; }
    }
    const t = b.h === a.h ? 0 : (heure - a.h) / (b.h - a.h);
    const mel = (x, y) => new THREE.Color(x).lerp(new THREE.Color(y), t);
    const ciel = mel(a.ciel, b.ciel);
    this.scene.background = ciel;
    this.scene.fog.color = ciel;
    this.ambiante.color = mel(a.ciel, b.ciel);
    this.ambiante.groundColor = mel(a.sol, b.sol);
    this.ambiante.intensity = a.amb + (b.amb - a.amb) * t;
    this.soleil.color = mel(a.dir, b.dir);
    this.soleil.intensity = a.i + (b.i - a.i) * t;
    const nuit = heure < 6.5 || heure > 19.5;
    for (const l of this.lampes) l.traverse(n => {
      if (n.isMesh && n.material) {
        n.material.emissive = new THREE.Color(nuit ? 0xffd76a : 0x000000);
        n.material.emissiveIntensity = nuit ? 0.9 : 0;
      }
    });
    this.nuit = nuit;
    if (this.neon) {
      /* Le neon du club ne s'allume pas a heure fixe : un club ouvre le
         soir. Il bat aussi, legerement, parce qu'un tube qui ne bat pas
         n'est pas un tube. */
      const bat = 0.75 + Math.sin(performance.now() / 260) * 0.25;
      this.neon.intensity = nuit ? 9 * bat : 0;
      this.neonMur.material.emissiveIntensity = nuit ? 1.4 * bat : 0;
    }
  }

  /* LES HALOS SUIVENT LE JOUEUR, ILS NE SONT PAS POSES SUR LES LAMPES.

     Il y a vingt lampadaires dans la clairiere. Vingt lumieres ponctuelles
     allumees en meme temps, c'est vingt fois le calcul d'eclairage par
     fragment, et le telephone rend les armes. On en garde SIX, et a chaque
     image on les donne aux six lampes les plus proches : celles qu'on voit.
     Les autres n'eclairent rien, et personne ne peut s'en apercevoir
     puisqu'elles sont hors du champ. */
  majHalos(x, y) {
    if (!this.halos) {
      this.halos = Array.from({ length: 6 }, () => {
        const l = new THREE.PointLight(0xffd08a, 0, 7.5, 2);
        this.scene.add(l);
        return l;
      });
    }
    if (!this.nuit) { for (const h of this.halos) h.intensity = 0; return; }
    const proches = this.lampes
      .map(l => ({ l, d: (l.position.x - x) ** 2 + (l.position.z - y) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, this.halos.length);
    this.halos.forEach((h, i) => {
      const p = proches[i];
      if (!p) { h.intensity = 0; return; }
      h.position.set(p.l.position.x, 1.9, p.l.position.z);
      h.intensity = 6;
    });
  }

  majHeros(p) {
    this.heros.position.set(p.x, p.moving ? Math.abs(Math.sin(performance.now() / 110)) * 0.08 : 0, p.y);
    if (p.vx || p.vy) this.heros.rotation.y = Math.atan2(p.vx, p.vy);
  }

  zoomer(sens) {
    this.d = Math.max(6, Math.min(20, this.d + (sens > 0 ? -2 : 2)));
    this.redimensionner();
  }

  redimensionner() {
    const a = innerWidth / innerHeight;
    this.cam.left = -this.d * a; this.cam.right = this.d * a;
    this.cam.top = this.d; this.cam.bottom = -this.d;
    this.cam.updateProjectionMatrix();
    this.rendu.setSize(innerWidth, innerHeight);
  }

  /* DU PIXEL D'ECRAN VERS LA TUILE. C'est l'equivalent exact de
     cam.unproject() de la version canvas : on tire un rayon depuis le point
     touche et on regarde ou il coupe le sol. */
  versLeMonde(px, py) {
    const r = new THREE.Raycaster();
    r.setFromCamera(new THREE.Vector2((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1), this.cam);
    const p = new THREE.Vector3();
    r.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
    return { x: p.x, y: p.z };
  }

  /** Le point d'ecran, en pixels CSS, d'un point du monde. Sert aux
      etiquettes : elles vivent dans le DOM, donc en Nunito net. */
  versLEcran(x, y, z = 0) {
    const v = new THREE.Vector3(x, z, y).project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, devant: v.z < 1 };
  }

  image(cible) {
    const c = new THREE.Vector3(cible.x, 0, cible.y);
    this.cam.position.lerp(c.clone().add(new THREE.Vector3(20, 22, 20)), 0.14);
    this.cam.lookAt(c);
    this.soleil.position.copy(c).add(new THREE.Vector3(20, 34, 10));
    this.soleil.target.position.copy(c);
    this.soleil.target.updateMatrixWorld();
    this.rendu.render(this.scene, this.cam);
  }
}
