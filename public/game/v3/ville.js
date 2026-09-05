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

/* PLUS VIF, PARCE QUE LA 3D MANGE LA COULEUR. En pixel art, la teinte que
   l'on pose est celle que l'on voit. Ici chaque face est multipliee par sa
   lumiere : un vert deja sombre devient boueux des que le soleil baisse. On
   remonte donc la saturation d'un cran a la source. */
const COULEUR = {
  [GRASS]: 0x7ad34f, [LUSH]: 0x57bd3c, [CLEARING]: 0x9ae06f,
  [PATH]: 0xd2b17c, [SAND]: 0xf0dda4, [WATER]: 0x3f9ad8, [FOREST]: 0x3a9130,
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

    this.uVent = { value: 0 };
    this.ambiante = new THREE.HemisphereLight(0xdfefff, 0x6b7a52, 2.1);
    sc.add(this.ambiante);
    const s = this.soleil = new THREE.DirectionalLight(0xfff3d8, 2.3);
    s.castShadow = true;
    s.shadow.mapSize.set(2048, 2048);
    const o = s.shadow.camera;
    o.left = -26; o.right = 26; o.top = 26; o.bottom = -26; o.near = 1; o.far = 120;
    s.shadow.bias = -0.0012;
    sc.add(s, s.target);
    // le brouillard commence apres la clairiere et efface la ville au loin
    sc.fog = new THREE.Fog(0x9fd4ef, 34, 135);
    sc.background = new THREE.Color(0x9fd4ef);

    this.poserLeSol();
    this.poserLaVille();
    this.heros = this.bonhomme({ corps: 0xf2b33d, culotte: 0x4a86d9, sacoche: true, casque: true });

    /* ON LE VOIT A TRAVERS LES MURS QUAND IL PASSE DERRIERE.

       « Quand le personnage passe derriere on le voit plus. » En vue
       isometrique c'est inevitable : un batiment de quatre etages cache tout
       ce qui est derriere lui, et le joueur perd son propre personnage.

       La solution habituelle est de rendre le batiment transparent, ce qui
       oblige a trier les transparences et abime l'image de toute la scene.
       On fait l'inverse : une COPIE du heros, en aplat, dessinee sans test
       de profondeur et donc toujours par-dessus. Elle n'apparait que
       lorsqu'un rayon parti de la camera rencontre quelque chose avant lui,
       et elle disparait des qu'il ressort. Un seul rayon par image. */
    this.spectre = this.bonhomme({ corps: 0xf2b33d, culotte: 0x4a86d9, sacoche: true, casque: true });
    this.spectre.traverse(n => {
      if (!n.isMesh) return;
      n.castShadow = false; n.receiveShadow = false;
      n.material = new THREE.MeshBasicMaterial({
        color: n.material.color, transparent: true, opacity: 0.55, depthTest: false,
      });
      n.renderOrder = 999;
    });
    this.spectre.visible = false;
    sc.add(this.heros);
    sc.add(this.spectre);
    await this.poserLeBati();

    /* UN ResizeObserver SUR LE CONTENEUR, PAS SEULEMENT L'EVENEMENT DE
       FENETRE. Le panneau d'apercu, une barre d'outils qui apparait, un
       clavier logiciel qui monte : tout cela change la taille utile sans
       toujours declencher `resize`. On observe donc la boite elle-meme. */
    addEventListener('resize', () => this.redimensionner());
    new ResizeObserver(() => this.redimensionner()).observe(this.hote);
    this.redimensionner();
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

  /* LA GRANDE VILLE, AUTOUR.

     « Eventuellement dans une grande ville. » Refaire le plan en quartier
     dense reviendrait a jeter city.js, l'economie et les quetes qui s'y
     accrochent. On garde donc la clairiere telle quelle et on la POSE DANS
     une ville : une couronne de tours derriere les arbres, de plus en plus
     hautes vers l'exterieur, avec le brouillard qui les efface au loin.

     Elles ne sont ni cliquables ni atteignables, et c'est assume : ce sont
     un decor de fond, comme les collines peintes derriere un plateau. Ce
     qu'elles changent est considerable pour ce qu'elles coutent : la
     clairiere cesse d'etre un ilot flottant dans le vide et devient un
     morceau de quartier qu'on a laisse en herbe.

     TOUT EST INSTANCIE. Deux cents tours en objets separes, ce sont deux
     cents dessins ; en une seule geometrie instanciee, un seul. Elles ne
     projettent pas d'ombre : au-dela de la lisiere, personne ne peut voir ou
     elle tomberait, et le calcul serait paye pour rien. */
  poserLaVille() {
    const c = this.city;
    const TEINTES = [0x8e9bb3, 0xa8907c, 0x7f93a8, 0xb0a08c, 0x6f7f96, 0x9d8f9f, 0xc0a48e];
    const bloc = new THREE.BoxGeometry(1, 1, 1);
    const fenetres = this.textureFenetres();
    const groupes = TEINTES.map(t => ({
      teinte: t,
      corps: [],
    }));
    const bruit = (x, y, g) => {
      let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(g, 2246822519);
      h = Math.imul(h ^ h >>> 13, 1274126177);
      return ((h ^ h >>> 16) >>> 0) / 4294967296;
    };
    const d = new THREE.Object3D();
    // six anneaux de plus en plus hauts, poses au-dela de la foret
    for (let anneau = 0; anneau < 7; anneau++) {
      /* LA PREMIERE COURONNE COMMENCE A QUATORZE TUILES DU BORD, pas a
         quatre. A quatre, une tour se posait juste derriere les arbres et
         entrait dans le champ de la camera : on avait un immeuble de bureaux
         plante au bout du pre, ce qui est exactement ce qu'un decor de fond
         ne doit pas faire. Il faut que la foret reste seule au premier plan
         et que la ville ne se lise qu'a l'horizon. */
      /* VINGT-DEUX, PAS QUATORZE. A quatorze les tours entraient dans le
         cadre des que la camera approchait d'un bord de la carte, et la
         clairiere paraissait minuscule au pied d'un centre-ville. Le decor
         doit se lire a l'horizon, pas surplomber le jeu. */
      const marge = 22 + anneau * 7;
      const hMin = 4 + anneau * 3, hMax = hMin + 5 + anneau * 3.5;
      const x0 = -marge, x1 = c.w + marge, y0 = -marge, y1 = c.h + marge;
      const pas = 3.6 + anneau * 0.9;
      for (let x = x0; x <= x1; x += pas) for (let y = y0; y <= y1; y += pas) {
        const dedans = x > -19 && x < c.w + 19 && y > -19 && y < c.h + 19;
        if (dedans) continue;
        const r = bruit(x * 13, y * 7, anneau);
        if (r < 0.42) continue;
        const h = hMin + r * (hMax - hMin);
        const l = 1.9 + bruit(x, y, anneau + 40) * 1.7;
        const p = bruit(x, y, anneau + 90) * 1.6 - 0.8;
        const q = bruit(x, y, anneau + 130) * 1.6 - 0.8;
        const gr = groupes[(bruit(x, y, anneau + 7) * groupes.length) | 0];
        d.position.set(x + p, h / 2 - 0.2, y + q);
        d.scale.set(l, h, l * (0.8 + bruit(x, y, 5) * 0.5));
        d.rotation.y = ((bruit(x, y, 11) * 4) | 0) * Math.PI / 2;
        d.updateMatrix();
        gr.corps.push(d.matrix.clone());
      }
    }
    for (const gr of groupes) {
      if (!gr.corps.length) continue;
      /* SIX MATERIAUX, PAS UN : LES TOITS N'ONT PAS DE FENETRES.

         Une seule matiere sur une boite applique la texture aux six faces,
         toit compris : vu de dessus en isometrie, chaque tour avait une
         verriere sur le dessus, ce qui se voit immediatement le jour. Une
         BoxGeometry porte six groupes ; on lui passe donc un tableau ou
         seules les quatre faces verticales portent les carreaux, et le
         dessus recoit du gravier sombre. */
      const mur = new THREE.MeshLambertMaterial({
        color: gr.teinte, map: fenetres,
        emissive: 0xffd08a, emissiveMap: fenetres, emissiveIntensity: 0,
      });
      const toit = new THREE.MeshLambertMaterial({ color: 0x4a4c54 });
      this.matVille = (this.matVille || []).concat(mur);
      // ordre des groupes d'une BoxGeometry : +x, -x, +y, -y, +z, -z
      const maille = new THREE.InstancedMesh(bloc,
        [mur, mur, toit, toit, mur, mur], gr.corps.length);
      gr.corps.forEach((m, i) => maille.setMatrixAt(i, m));
      maille.castShadow = false; maille.receiveShadow = false;
      maille.frustumCulled = false;
      this.scene.add(maille);
    }
    // un sol qui va jusqu'a l'horizon, sinon on voit le vide sous les tours
    const assise = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
      new THREE.MeshLambertMaterial({ color: 0x6b6f78 }));
    assise.rotation.x = -Math.PI / 2;
    assise.position.set(c.w / 2, -0.45, c.h / 2);
    assise.receiveShadow = false;
    this.scene.add(assise);
  }

  /* LE VENT DANS LES ARBRES, ECRIT DANS LE NUANCEUR ET NON DANS LA BOUCLE.

     « Que ca bouge un peu, les arbres par exemple. » Il y a pres de cinq
     cents arbres et buissons. Les faire osciller depuis la boucle
     demanderait cinq cents rotations par image, en JavaScript, pour un
     mouvement de trois centimetres.

     On modifie donc le nuanceur de sommets du materiau : chaque sommet est
     pousse horizontalement d'autant plus qu'il est HAUT dans le modele,
     avec un dephasage tire de la position au sol. Le tronc ne bouge pas, la
     cime bouge, chaque arbre a son propre rythme, et la carte graphique fait
     tout. Cout par image : une variable de temps a mettre a jour.

     Le seul soin a prendre est que deux arbres partageant un materiau ne
     bougent pas ensemble : le dephasage vient donc de la position du monde,
     pas de l'identifiant du modele. */
  souffler(objet) {
    objet.traverse(n => {
      if (!n.isMesh || !n.material) return;
      const m = n.material.clone();
      m.onBeforeCompile = sh => {
        sh.uniforms.tempsVent = this.uVent;
        sh.vertexShader = 'uniform float tempsVent;\n' + sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec4 racine = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
           float dephase = racine.x * 0.7 + racine.z * 1.3;
           float hauteur = max(transformed.y, 0.0);
           float force = hauteur * hauteur * 0.012;
           transformed.x += sin(tempsVent * 1.6 + dephase) * force;
           transformed.z += cos(tempsVent * 1.1 + dephase * 1.7) * force * 0.7;`
        );
      };
      m.needsUpdate = true;
      n.material = m;
    });
  }

  /* LES FENETRES DES TOURS, DESSINEES PLUTOT QUE TROUVEES.

     « Les immeubles sont juste des cubes longs, y a pas de fenetre, y a
     rien. » C'etait vrai : les tours de fond etaient des boites d'une seule
     couleur. Aucun paquet ne fournit de gratte-ciel, et poser un modele par
     tour couterait sept cents modeles.

     On peint donc une texture, une fois : une grille de carreaux sur seize
     pixels, avec une rangee sur trois un peu plus sombre pour que ce ne soit
     pas un damier regulier. Repetee sur la boite, elle donne des etages.
     La MEME image sert de carte emissive : la nuit, les carreaux s'allument
     tout seuls, et c'est le decor qui fait la ville plutot que l'inverse. */
  textureFenetres() {
    const T = 32, c = document.createElement('canvas');
    c.width = c.height = T;
    const g = c.getContext('2d');
    g.fillStyle = '#000000'; g.fillRect(0, 0, T, T);
    for (let y = 2; y < T - 2; y += 6) {
      for (let x = 2; x < T - 2; x += 5) {
        // une fenetre sur cinq reste eteinte : un immeuble entierement
        // allume n'existe pas, et c'est ce qui trahit une texture generee
        const on = ((x * 7 + y * 13) % 5) !== 0;
        g.fillStyle = on ? '#ffffff' : '#3a3a44';
        g.fillRect(x, y, 3, 3);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 3);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* LE BONHOMME.

     C'etait une capsule, une sphere et un cylindre : de loin, un pion. La
     creature de la version pixel avait une tete enorme, des yeux qui
     clignaient, des oreilles tombantes et une sacoche de disques, et c'est
     tout ce qu'on regardait. Il fallait la retrouver, pas la remplacer par
     un mannequin de vitrine.

     Aucun des deux paquets ne contient de personnage : tout est construit
     ici. Une quinzaine de primitives, et surtout DES MEMBRES SEPARES, parce
     que c'est le balancement des bras et des jambes qui fait qu'un bonhomme
     marche au lieu de glisser. Les proportions sont celles du pixel : la
     tete fait presque la moitie de la hauteur.

     Les yeux sont deux points sombres poses sur l'avant du crane. Sans eux
     on ne sait pas ou le personnage regarde, et c'est la premiere chose que
     l'oeil cherche sur une silhouette. */
  bonhomme({ corps, culotte, casque = false, sacoche = false }) {
    const g = new THREE.Group();
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    const mc = M(corps), mp = M(culotte), sombre = M(0x2b2136), blanc = M(0xffffff);

    /* TOUT EN RONDEURS, PLUS UNE SEULE BOITE.

       La version precedente etait faite de cubes : « c'est un ptit robot,
       c'est moins cool ». C'est exact, et la raison est purement
       geometrique. La creature du pixel art n'avait pas d'angles vifs, elle
       avait une grosse tete bombee et des oreilles molles. En volume, une
       boite lit tout de suite comme un objet manufacture ; une capsule et
       une sphere lisent comme un etre vivant. Il n'y a plus que des
       spheres, des capsules et un tore. */

    const jambes = [], pieds = [];
    for (const cx of [-0.085, 0.085]) {
      const j = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.11, 3, 8), mp);
      j.position.set(cx, 0.12, 0); j.castShadow = true;
      jambes.push(j); g.add(j);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 7), sombre);
      p.position.set(cx, 0.05, 0.025); p.scale.set(1, 0.7, 1.25);
      pieds.push(p); g.add(p);
    }

    const tronc = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.12, 4, 12), mc);
    tronc.position.y = 0.33; tronc.castShadow = true;
    g.add(tronc);

    const bras = [];
    for (const cx of [-0.17, 0.17]) {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.13, 3, 8), mc);
      b.position.set(cx, 0.34, 0); b.castShadow = true;
      bras.push(b); g.add(b);
    }

    /* LA TETE fait presque la moitie de la hauteur, comme en pixel art.
       Legerement aplatie et elargie : une sphere parfaite fait une bille,
       une sphere ecrasee fait un museau. */
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), mc);
    tete.position.y = 0.66; tete.scale.set(1.12, 0.98, 1);
    tete.castShadow = true;
    g.add(tete);
    const museau = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 9), mc);
    museau.position.set(0, 0.61, 0.19); museau.scale.set(1.15, 0.8, 0.9);
    g.add(museau);
    const truffe = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), sombre);
    truffe.position.set(0, 0.62, 0.27);
    g.add(truffe);

    // les oreilles tombantes, la signature de la creature
    for (const cx of [-0.22, 0.22]) {
      const o = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.11, 3, 8), mc);
      o.position.set(cx, 0.63, -0.01);
      o.rotation.z = cx < 0 ? 0.42 : -0.42;
      o.castShadow = true;
      g.add(o);
    }

    /* LES YEUX SONT BLANCS AVEC UNE PUPILLE, pas deux points sombres. Un
       point sombre sur une tete sombre disparait ; le blanc de l'oeil est ce
       qui rend un visage lisible a dix metres, et c'est la premiere chose
       que l'oeil humain cherche sur une silhouette. */
    for (const cx of [-0.093, 0.093]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), blanc);
      b.position.set(cx, 0.7, 0.17); b.scale.set(1, 1.1, 0.6);
      g.add(b);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), sombre);
      pup.position.set(cx, 0.7, 0.203); pup.scale.set(1, 1.15, 0.6);
      g.add(pup);
    }

    if (casque) {
      const arceau = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.032, 8, 16, Math.PI), sombre);
      arceau.position.y = 0.72; arceau.rotation.y = Math.PI / 2;
      arceau.castShadow = true;
      g.add(arceau);
      for (const cx of [-0.235, 0.235]) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), sombre);
        c.position.set(cx, 0.66, 0); c.scale.set(0.6, 1, 1);
        g.add(c);
      }
    }
    if (sacoche) {
      const sac = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.1, 3, 10), M(0xd97b4a));
      sac.position.set(-0.2, 0.3, 0.03); sac.rotation.z = 0.3;
      sac.castShadow = true;
      g.add(sac);
    }
    g.userData = { jambes, bras, pieds, tronc, tete, phase: Math.random() * 6 };
    return g;
  }

  /* LE PAS. Les jambes tournent autour de la hanche, les bras a contretemps,
     et le corps monte a chaque appui. La tete suit avec un temps de retard :
     c'est ce decalage qui donne le dandinement. */
  animer(f, marche, t) {
    const u = f.userData;
    if (!u || !u.jambes) return;
    const a = marche ? Math.sin(t * 9 + u.phase) : 0;
    u.jambes[0].rotation.x = a * 0.7;
    u.jambes[1].rotation.x = -a * 0.7;
    u.pieds[0].position.z = 0.025 + a * 0.11;
    u.pieds[1].position.z = 0.025 - a * 0.11;
    u.bras[0].rotation.x = -a * 0.65;
    u.bras[1].rotation.x = a * 0.65;
    const h = marche ? Math.abs(Math.sin(t * 9 + u.phase)) * 0.045 : Math.sin(t * 1.6 + u.phase) * 0.012;
    f.position.y = h;
    u.tete.rotation.z = marche ? Math.sin(t * 9 + u.phase - 0.8) * 0.09 : 0;
  }

  // compatibilite : l'ancien nom, garde le temps que tout soit converti
  figurine(corps, culotte) { return this.bonhomme({ corps, culotte }); }

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

    /* LA COULEUR VIENT DU JEU, PAS DES MODELES.

       city.js donne depuis toujours une couleur de toit a chaque batiment :
       le bleu du bunker techno, l'orange de la deep house, le cyan de
       l'electro, le violet du bar. En pixel art c'etait ce qui permettait de
       les reconnaitre a vingt metres. Les modeles KayKit et Kenney, eux,
       sont livres dans deux teintes de brique et une de beton, et la
       clairiere avait perdu son code couleur.

       On le remet par un AUVENT au-dessus de chaque porte et un bandeau sur
       le toit, tous deux a la couleur du batiment. C'est plus juste que de
       teinter le modele entier, qui virerait au bonbon, et ca met la couleur
       la ou l'oeil la cherche : a l'entree. */
    for (const b of this.city.buildings) {
      const teinte = new THREE.Color(b.roof || '#c9924e');
      const m = new THREE.MeshLambertMaterial({ color: teinte });
      const g = new THREE.Group();

      const auvent = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.62), m);
      auvent.position.set(b.door.x + 0.5, 1.28, b.y + b.d + 0.24);
      auvent.rotation.x = -0.22;
      auvent.castShadow = true;
      g.add(auvent);
      for (const dx of [-0.66, 0.66]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06),
          new THREE.MeshLambertMaterial({ color: 0x4a3324 }));
        p.position.set(b.door.x + 0.5 + dx, 0.6, b.y + b.d + 0.5);
        p.castShadow = true;
        g.add(p);
      }
      // un bandeau au pied du batiment : la couleur se lit aussi de loin
      const bande = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.08, 0.14, b.d + 0.08), m);
      bande.position.set(b.x + b.w / 2, 0.07, b.y + b.d / 2);
      bande.receiveShadow = true;
      g.add(bande);

      this.scene.add(g);
      const p = this.batiments.get(b.id);
      if (p) p.couleur = g;
    }

    /* PAS DE FENETRES ALLUMEES, ET C'EST UN CONSTAT, PAS UN OUBLI.

       Un batiment KayKit est UN maillage avec UN materiau : la fenetre n'est
       pas une piece separee qu'on pourrait rendre emissive, c'est une zone
       de l'atlas. Il faudrait deviner laquelle, et l'atlas est une palette
       de degrades ou le bleu des vitres sert aussi ailleurs. Une lumiere
       posee au juge sur une voiture ou une enseigne serait pire que pas de
       lumiere du tout. La nuit tient donc sur les lampadaires et le neon,
       qui eux sont exacts. */

    const decors = {
      tree: 'kenney/tree_large', bush: 'kaykit/bush',
      lamp: 'kaykit/streetlight', bench: 'kaykit/bench',
      crates: 'kaykit/box_A', truck: 'kaykit/car_stationwagon',
    };
    const TAILLE = { tree: 1.5, lamp: 1.15, bench: 0.8, bush: 0.8, crates: 0.62, truck: 1.6 };
    this.lampes = [];
    for (const pr of this.city.props) {
      if (pr.type === 'rock') { this.scene.add(this.caillou(pr)); continue; }
      if (pr.type === 'totem') { this.scene.add(this.totem(pr)); continue; }
      const nom = decors[pr.type];
      if (!nom) continue;
      try {
        const o = await prendre(nom);
        const t = (TAILLE[pr.type] || 0.8) * (pr.type === 'tree' ? (pr.s || 1) : 1);
        caler(o, t, t);
        o.position.x += pr.x; o.position.z += pr.y;
        o.rotation.y = ((pr.x * 7 + pr.y * 13) % 4) * Math.PI / 2;
        ombrer(o);
        this.scene.add(o);
        if (pr.type === 'lamp') this.lampes.push(o);
        if (pr.type === 'tree' || pr.type === 'bush') this.souffler(o);
        // un second cageot pose de travers : deux boites alignees font un
        // decor de catalogue, deux boites de guingois font un bac a disques
        if (pr.type === 'crates') {
          const b2 = await prendre('kaykit/box_B');
          caler(b2, 0.5, 0.5);
          b2.position.set(pr.x + 0.42, b2.position.y, pr.y + 0.16);
          b2.rotation.y = 0.6;
          ombrer(b2);
          this.scene.add(b2);
        }
      } catch (e) { /* un decor manquant n'arrete pas la ville */ }
    }

    // une benne derriere le club et une derriere le bar : ce sont les deux
    // seuls endroits de la clairiere ou l'on sort des poubelles la nuit
    for (const id of ['club', 'bar']) {
      const b = this.city.buildings.find(x => x.id === id);
      if (!b) continue;
      try {
        const o = await prendre('kaykit/dumpster');
        caler(o, 0.9, 0.9);
        o.position.x += b.x + b.w + 0.1; o.position.z += b.y + b.d - 0.6;
        ombrer(o); this.scene.add(o);
      } catch (e) { /* rien */ }
    }
    // le chateau d'eau du pressage, qui lui donne sa silhouette d'usine
    const press = this.city.buildings.find(x => x.id === 'press');
    if (press) {
      try {
        const o = await prendre('kaykit/watertower');
        caler(o, 1.4, 1.4);
        o.position.x += press.x + press.w - 0.7; o.position.z += press.y - 0.5;
        ombrer(o); this.scene.add(o);
      } catch (e) { /* rien */ }
    }
  }

  /* Aucun des deux paquets n'a de rocher. Un icosaedre a facettes plates,
     ecrase et tourne au hasard de sa position, en fait un tres correct. */
  caillou(pr) {
    const g = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3 * (pr.s || 1), 0),
      new THREE.MeshLambertMaterial({ color: 0x8d8f88, flatShading: true }));
    g.position.set(pr.x, 0.1, pr.y);
    g.scale.y = 0.7;
    g.rotation.set(pr.x % 1, pr.y % 1, (pr.x + pr.y) % 1);
    g.castShadow = true; g.receiveShadow = true;
    return g;
  }

  /* LE TOTEM DE LA PLACE : un 33 tours plante sur un socle. C'est le seul
     objet du jeu qui dise de quoi il est question, et aucun paquet de ville
     ne contient de disque. Trois primitives suffisent. */
  totem(pr) {
    const g = new THREE.Group();
    const socle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xa89a86 }));
    socle.position.y = 0.15;
    const fut = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xbdb09c }));
    fut.position.y = 0.47;
    const disque = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 28),
      new THREE.MeshLambertMaterial({ color: 0x241b33 }));
    disque.position.y = 1.28; disque.rotation.x = Math.PI / 2;
    const pastille = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 20),
      new THREE.MeshLambertMaterial({ color: 0xff5cb4 }));
    pastille.position.y = 1.28; pastille.rotation.x = Math.PI / 2;
    for (const m of [socle, fut, disque, pastille]) { m.castShadow = true; m.receiveShadow = true; }
    g.add(socle, fut, disque, pastille);
    g.position.set(pr.x, 0, pr.y);
    return g;
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
      if (p.couleur) p.couleur.visible = ouvert;
      p.chantier.visible = !ouvert;
    }
  }

  majPassants(life) {
    if (!life) return;
    const CULOTTES = [0x4a86d9, 0xd9564a, 0x4ac9a8, 0xe8a93a, 0x8f5fc9, 0x2f6ea8];
    while (this.passants.length < life.walkers.length) {
      const i = this.passants.length;
      const f = this.bonhomme({
        corps: CORPS[i % CORPS.length],
        culotte: CULOTTES[(i * 3) % CULOTTES.length],
        casque: i % 3 === 0, sacoche: i % 4 === 1,
      });
      this.scene.add(f);
      this.passants.push(f);
    }
    const t = performance.now() / 1000;
    life.walkers.forEach((w, i) => {
      const f = this.passants[i];
      const dx = w.x - (f.userData.px ?? w.x), dy = w.y - (f.userData.py ?? w.y);
      f.position.x = w.x; f.position.z = w.y;
      if (Math.abs(dx) + Math.abs(dy) > 1e-4) f.rotation.y = Math.atan2(dx, dy);
      this.animer(f, w.moving, t);
      f.userData.px = w.x; f.userData.py = w.y;
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
    for (const m of this.matVille || []) m.emissiveIntensity = nuit ? 0.85 : 0;
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
    this.heros.position.x = p.x; this.heros.position.z = p.y;
    if (p.vx || p.vy) this.heros.rotation.y = Math.atan2(p.vx, p.vy);
    this.animer(this.heros, p.moving, performance.now() / 1000);

    // la copie suit exactement, et ne s'affiche que s'il est masque
    const sp = this.spectre;
    sp.position.copy(this.heros.position);
    sp.rotation.copy(this.heros.rotation);
    this.animer(sp, p.moving, performance.now() / 1000);
    sp.visible = this.estCache(p);
  }

  /** Un rayon de la camera vers la tete du heros : rencontre-t-il un
      batiment avant d'arriver ? Les decors et le sol ne comptent pas, on ne
      passe pas derriere un buisson. */
  estCache(p) {
    if (!this.occulteurs) {
      this.occulteurs = [];
      for (const [, b] of this.batiments) if (b.modele) this.occulteurs.push(b.modele);
    }
    const cible = new THREE.Vector3(p.x, 0.6, p.y);
    const dir = cible.clone().sub(this.cam.position).normalize();
    const r = new THREE.Raycaster(this.cam.position, dir, 0.1,
      this.cam.position.distanceTo(cible) - 0.4);
    return r.intersectObjects(this.occulteurs, true).length > 0;
  }

  zoomer(sens) {
    this.d = Math.max(6, Math.min(20, this.d + (sens > 0 ? -2 : 2)));
    this.redimensionner();
  }

  redimensionner() {
    const r = this.hote.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const a = w / h;
    this.cam.left = -this.d * a; this.cam.right = this.d * a;
    this.cam.top = this.d; this.cam.bottom = -this.d;
    this.cam.updateProjectionMatrix();
    this.rendu.setSize(w, h);
    this.taille = { w, h };
  }

  /* DU PIXEL D'ECRAN VERS LA TUILE. C'est l'equivalent exact de
     cam.unproject() de la version canvas : on tire un rayon depuis le point
     touche et on regarde ou il coupe le sol. */
  versLeMonde(px, py) {
    const t = this.taille || { w: innerWidth, h: innerHeight };
    const r = new THREE.Raycaster();
    r.setFromCamera(new THREE.Vector2((px / t.w) * 2 - 1, -(py / t.h) * 2 + 1), this.cam);
    const p = new THREE.Vector3();
    r.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
    return { x: p.x, y: p.z };
  }

  /** Le point d'ecran, en pixels CSS, d'un point du monde. Sert aux
      etiquettes : elles vivent dans le DOM, donc en Nunito net. */
  versLEcran(x, y, z = 0) {
    const t = this.taille || { w: innerWidth, h: innerHeight };
    const v = new THREE.Vector3(x, z, y).project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * t.w, y: (-v.y * 0.5 + 0.5) * t.h, devant: v.z < 1 };
  }

  /* UN BALAYAGE, DE TEMPS EN TEMPS.

     « Des fois une lumiere qui bouge, pas tout le temps, juste des fois. »
     C'est la contrainte qui compte : une lumiere qui tourne en permanence
     devient un papier peint qu'on cesse de voir au bout d'une minute, et
     elle fatigue. Celle-ci ne s'allume qu'une nuit sur deux minutes, pendant
     douze secondes, et elle balaie lentement le ciel au-dessus du club. Le
     reste du temps elle n'existe pas, ce qui est precisement ce qui la rend
     remarquable quand elle revient. */
  majBalayage(t) {
    if (!this.faisceau) {
      const club = this.city.buildings.find(b => b.club);
      if (!club) return;
      const f = new THREE.SpotLight(0xff8ed8, 0, 46, 0.13, 0.55, 1.2);
      f.position.set(club.x + club.w / 2, 2.4, club.y + club.d / 2);
      f.target.position.set(club.x, 14, club.y);
      this.scene.add(f, f.target);
      this.faisceau = f;
    }
    const cycle = 120, duree = 12;
    const phase = t % cycle;
    const actif = this.nuit && phase < duree;
    const bord = Math.min(phase, duree - phase);          // fondu aux deux bouts
    this.faisceau.intensity = actif ? 220 * Math.min(1, bord / 2) : 0;
    if (actif) {
      const a = (phase / duree) * Math.PI * 2;
      const c = this.faisceau.position;
      this.faisceau.target.position.set(c.x + Math.cos(a) * 26, 11, c.z + Math.sin(a) * 26);
      this.faisceau.target.updateMatrixWorld();
    }
  }

  image(cible) {
    const c = new THREE.Vector3(cible.x, 0, cible.y);
    this.cam.position.lerp(c.clone().add(new THREE.Vector3(20, 22, 20)), 0.14);
    this.cam.lookAt(c);
    this.soleil.position.copy(c).add(new THREE.Vector3(20, 34, 10));
    this.soleil.target.position.copy(c);
    this.soleil.target.updateMatrixWorld();
    const t = performance.now() / 1000;
    this.uVent.value = t;
    this.majBalayage(t);
    this.rendu.render(this.scene, this.cam);
  }
}
