// =====================================================================
//  LA VILLE EN VOLUME · Three.js + assets CC0
//  ---------------------------------------------------------------
//  Meme ville, meme plan, memes dix-sept batiments : city.js n'a pas
//  bouge d'une ligne. Ce qui change, c'est qu'on ne dessine plus, on
//  eclaire. La difference entre les deux versions est entierement la :
//  un mur plat le reste tant qu'aucune lumiere ne tombe dessus.
//
//  LES ASSETS SONT EN CC0, les deux, licence lue dans les fichiers
//  livres avec les paquets et recopiee a cote des modeles :
//    - KayKit City Builder Bits, Kay Lousberg
//    - City Kit Suburban, Kenney
//  Ni credit obligatoire, ni restriction d'usage. Le pack voxel de
//  monogon, lui, est en CC BY-ND : il n'est pas ici, et il n'y sera pas
//  tant que son auteur n'aura pas repondu sur la conversion de format.
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { City, START, GRASS, PATH, LUSH, CLEARING, FOREST, WATER, SAND } from '../src/world/city.js';

/* Une tuile du jeu vaut une unite de monde. Les modeles n'ont aucune
   raison d'etre a cette echelle : on mesure leur boite au chargement et
   on les met a la taille de leur emprise. C'est plus sur que de coder en
   dur une echelle par paquet, qui casserait au premier modele ajoute. */
const TUILE = 1;

const COULEUR = {
  [GRASS]:    0x6cc24a,
  [LUSH]:     0x4da537,
  [CLEARING]: 0x8ad46a,
  [PATH]:     0xbfa678,
  [SAND]:     0xe0cd96,
  [WATER]:    0x3f86c4,
  [FOREST]:   0x2f7a28,
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

export class Ville {
  constructor(hote) {
    this.city = new City();
    this.pos = { x: START.x, y: START.y };
    this.vit = { x: 0, y: 0 };
    this.touches = {};
    this.montrer(hote);
  }

  async montrer(hote) {
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color(0x9fd4ef);
    sc.fog = new THREE.Fog(0x9fd4ef, 46, 92);

    const r = this.rendu = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    hote.appendChild(r.domElement);

    /* LA CAMERA ORTHOGRAPHIQUE, ET C'EST ELLE QUI FAIT LE GENRE.
       Une camera en perspective donnerait une maquette vue de pres ; une
       orthographique donne le jouet pose sur la table, qui est exactement
       le regard de ces jeux-la. */
    /* QUINZE MONTRAIT LA CARTE, PAS LA VILLE. A cette ouverture on voyait
       la clairiere entiere et le personnage etait un point jaune : c'est un
       plan de situation, pas un jeu. A dix on est dans la rue. */
    this.d = 10;
    const a = innerWidth / innerHeight;
    const cam = this.cam = new THREE.OrthographicCamera(-this.d * a, this.d * a, this.d, -this.d, -200, 400);
    cam.position.set(24, 26, 24);

    sc.add(new THREE.HemisphereLight(0xdfefff, 0x6b7a52, 2.1));
    const s = this.soleil = new THREE.DirectionalLight(0xfff3d8, 2.3);
    s.position.set(28, 44, 16);
    s.castShadow = true;
    s.shadow.mapSize.set(2048, 2048);
    const o = s.shadow.camera;
    o.left = -34; o.right = 34; o.top = 34; o.bottom = -34; o.near = 1; o.far = 140;
    s.shadow.bias = -0.0012;
    sc.add(s, s.target);

    this.poserLeSol();
    this.poserLeHeros();
    await this.poserLeBati();

    addEventListener('resize', () => this.redimensionner());
    addEventListener('keydown', e => { this.touches[e.key.toLowerCase()] = true; });
    addEventListener('keyup', e => { this.touches[e.key.toLowerCase()] = false; });
    this.horloge = new THREE.Clock();
    r.setAnimationLoop(() => this.image());
    hote.dataset.pret = '1';
  }

  /* LE SOL : UN MAILLAGE INSTANCIE PAR TYPE DE TUILE.
     Mille six cent trente-quatre tuiles font mille six cent trente-quatre
     objets si on les pose une par une, et la carte graphique les dessine
     un par un. Instanciees par type, il en reste sept appels. */
  poserLeSol() {
    const c = this.city;
    const parType = new Map();
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const t = c.tiles[c.idx(x, y)];
      if (!parType.has(t)) parType.set(t, []);
      parType.get(t).push([x, y]);
    }
    const g = new THREE.BoxGeometry(TUILE, 0.4, TUILE);
    for (const [t, liste] of parType) {
      const creux = t === WATER;
      const m = new THREE.MeshLambertMaterial({ color: COULEUR[t] ?? 0x6cc24a });
      const maille = new THREE.InstancedMesh(g, m, liste.length);
      maille.receiveShadow = true;
      maille.castShadow = false;
      const d = new THREE.Object3D();
      liste.forEach(([x, y], i) => {
        d.position.set(x + 0.5, creux ? -0.32 : -0.2, y + 0.5);
        d.updateMatrix();
        maille.setMatrixAt(i, d.matrix);
      });
      this.scene.add(maille);
    }
  }

  /* Une petite creature jaune orange, faite de primitives : le pack ne
     contient aucun personnage, et en fabriquer un ici coute six lignes. */
  poserLeHeros() {
    const h = this.heros = new THREE.Group();
    const corps = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.2, 4, 12),
      new THREE.MeshLambertMaterial({ color: 0xf2b33d }));
    corps.position.y = 0.34; corps.castShadow = true;
    const tete = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0xf2b33d }));
    tete.position.y = 0.72; tete.castShadow = true;
    const sac = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.2, 0.26),
      new THREE.MeshLambertMaterial({ color: 0xd97b4a }));
    sac.position.set(-0.2, 0.4, 0); sac.castShadow = true;
    h.add(corps, tete, sac);
    this.scene.add(h);
  }

  async poserLeBati() {
    const L = new GLTFLoader();
    const charger = nom => new Promise((ok, ko) => {
      const ext = nom.startsWith('kenney/') ? '.glb' : '.gltf';
      L.load(`./assets/${nom}${ext}`, g => ok(g.scene), undefined, ko);
    });
    const cache = new Map();
    const prendre = async nom => {
      if (!cache.has(nom)) cache.set(nom, await charger(nom));
      return cache.get(nom).clone(true);
    };
    const ombrer = o => o.traverse(n => {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
    });
    /* On met le modele a la taille de son emprise au sol. Sa hauteur suit
       la meme echelle : un batiment qu'on ecrase pour le faire entrer dans
       sa case n'a plus l'air d'un batiment. */
    const caler = (o, largeur, profondeur) => {
      const b = new THREE.Box3().setFromObject(o);
      const t = b.getSize(new THREE.Vector3());
      const k = Math.min(largeur / (t.x || 1), profondeur / (t.z || 1));
      o.scale.setScalar(k);
      const b2 = new THREE.Box3().setFromObject(o);
      o.position.y -= b2.min.y;
      return k;
    };

    for (const b of this.city.buildings) {
      const nom = MODELE[b.id];
      if (!nom) continue;
      try {
        const o = await prendre(nom);
        caler(o, b.w * 0.92, b.d * 0.92);
        o.position.x += b.x + b.w / 2;
        o.position.z += b.y + b.d / 2;
        ombrer(o);
        this.scene.add(o);
      } catch (e) { console.warn('modele absent', nom, e); }
    }

    // arbres, buissons, lampadaires et bancs
    const decors = { tree: 'kenney/tree_large', bush: 'kaykit/bush', lamp: 'kaykit/streetlight', bench: 'kaykit/bench' };
    for (const pr of this.city.props) {
      const nom = decors[pr.type];
      if (!nom) continue;
      try {
        const o = await prendre(nom);
        const t = pr.type === 'tree' ? 1.5 * (pr.s || 1) : pr.type === 'lamp' ? 1.1 : 0.8;
        caler(o, t, t);
        o.position.x += pr.x; o.position.z += pr.y;
        o.rotation.y = ((pr.x * 7 + pr.y * 13) % 4) * Math.PI / 2;
        ombrer(o);
        this.scene.add(o);
      } catch (e) { /* un decor manquant ne doit pas arreter la ville */ }
    }
  }

  redimensionner() {
    const a = innerWidth / innerHeight;
    this.cam.left = -this.d * a; this.cam.right = this.d * a;
    this.cam.top = this.d; this.cam.bottom = -this.d;
    this.cam.updateProjectionMatrix();
    this.rendu.setSize(innerWidth, innerHeight);
  }

  image() {
    const dt = Math.min(0.05, this.horloge.getDelta());
    const t = this.touches;
    let dx = 0, dz = 0;
    if (t.arrowleft || t.a || t.q) dx -= 1;
    if (t.arrowright || t.d) dx += 1;
    if (t.arrowup || t.w || t.z) dz -= 1;
    if (t.arrowdown || t.s) dz += 1;
    /* Les touches sont en repere ecran, la ville en repere monde, et la
       camera est tournee de quarante-cinq degres entre les deux : sans
       cette rotation, « en haut » enverrait le personnage en diagonale. */
    const c = Math.SQRT1_2;
    let vx = (dx + dz) * c, vz = (dz - dx) * c;
    const m = Math.hypot(vx, vz);
    if (m > 0) {
      vx /= m; vz /= m;
      const pas = 5.2 * dt;
      const nx = this.pos.x + vx * pas, ny = this.pos.y + vz * pas;
      if (this.city.isWalkable(nx, this.pos.y)) this.pos.x = nx;
      if (this.city.isWalkable(this.pos.x, ny)) this.pos.y = ny;
      this.heros.rotation.y = Math.atan2(vx, vz);
    }
    const bob = m > 0 ? Math.abs(Math.sin(performance.now() / 110)) * 0.09 : 0;
    this.heros.position.set(this.pos.x, bob, this.pos.y);

    const cible = new THREE.Vector3(this.pos.x, 0, this.pos.y);
    this.cam.position.lerp(cible.clone().add(new THREE.Vector3(22, 24, 22)), 0.12);
    this.cam.lookAt(cible);
    this.soleil.position.copy(cible).add(new THREE.Vector3(24, 40, 12));
    this.soleil.target.position.copy(cible);
    this.soleil.target.updateMatrixWorld();
    this.rendu.render(this.scene, this.cam);
  }
}
