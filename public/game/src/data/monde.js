// =====================================================================
//  LE MONDE DU JEU · tout ce qui n'est pas dans le corpus
//  ---------------------------------------------------------------
//  Le materiel du studio, les petits boulots, les salles, les campagnes,
//  les niveaux du personnage, les personnages de la scene et le plan de
//  la ville. Les disques et les artistes connus viennent de catalogue.js,
//  engendre depuis le corpus de l'atlas.
// =====================================================================

// ---------------------------------------------------------------------
// LE MATERIEL, dans l'ordre ou on le construit. Chaque piece exige la
// precedente : on ne branche pas une deuxieme platine avant la premiere,
// et rien ne sonne tant qu'il n'y a ni cable ni enceinte.
//   role : 'dj' (indispensable pour jouer), 'prod' (indispensable pour
//   produire), 'bonus' (ameliore), 'vie' (la vie quotidienne)
//   skill : bonus de talent, prod : bonus de qualite de production
// ---------------------------------------------------------------------
export const MATERIEL = [
  { id:'casque',     nom:'Casque de DJ',              prix:120,   role:'dj',    skill:1,  prod:0,
    desc:'Une oreille sur chaque disque. Sans lui, tu cales à l’aveugle.', icone:'🎧' },
  { id:'platine1',   nom:'Une platine',               prix:380,   role:'dj',    skill:2,  prod:0,
    desc:'D’occasion, le plateau tourne encore rond. Il manque la cellule.', icone:'💿' },
  { id:'aiguille',   nom:'Cellule et aiguille',       prix:60,    role:'dj',    skill:1,  prod:0,
    desc:'Sans elle, la platine tourne dans le silence.', icone:'📍' },
  { id:'platine2',   nom:'Deuxième platine',          prix:380,   role:'dj',    skill:2,  prod:0,
    desc:'Deux disques, un seul tempo : le mix commence ici.', icone:'💿' },
  { id:'table',      nom:'Table de mixage',           prix:260,   role:'dj',    skill:2,  prod:0,
    desc:'Deux voies, un crossfader, un égaliseur qui crache un peu.', icone:'🎚️' },
  { id:'cables',     nom:'Câbles et alimentation',    prix:45,    role:'dj',    skill:0,  prod:0,
    desc:'Personne n’en parle, et rien ne marche sans.', icone:'🔌' },
  { id:'enceintes',  nom:'Deux enceintes',            prix:320,   role:'dj',    skill:1,  prod:1,
    desc:'Tu entends enfin ce que tu fais. Les voisins aussi.', icone:'🔊' },
  { id:'casque_pro', nom:'Casque pro',                prix:260,   role:'bonus', skill:2,  prod:1,
    desc:'Isolé, précis. Le calage devient un réflexe.', icone:'🎧' },
  { id:'moniteurs',  nom:'Moniteurs de studio',       prix:700,   role:'bonus', skill:1,  prod:3,
    desc:'Des basses justes, pour la première fois.', icone:'🔈' },
  { id:'laptop',     nom:'Laptop et logiciel',        prix:1100,  role:'prod',  skill:0,  prod:4,
    desc:'La base. Tes propres morceaux, enfin.', icone:'💻' },
  { id:'controleur', nom:'Contrôleur MIDI',           prix:350,   role:'bonus', skill:0,  prod:2,
    desc:'Des touches sous les doigts au lieu d’une souris.', icone:'🎹' },
  { id:'boite',      nom:'Boîte à rythmes',           prix:1400,  role:'bonus', skill:0,  prod:4,
    desc:'Le kick qui a fait Détroit. Ou une bonne copie.', icone:'🥁' },
  { id:'synthe',     nom:'Synthé analogique',         prix:1900,  role:'bonus', skill:0,  prod:5,
    desc:'Des nappes en chorus, direct au cœur.', icone:'🎛️' },
  { id:'carte_son',  nom:'Interface audio',           prix:900,   role:'bonus', skill:1,  prod:3,
    desc:'Fini le souffle. Tout rentre propre.', icone:'🎚️' },
  { id:'cdj',        nom:'Lecteurs numériques',       prix:3800,  role:'bonus', skill:4,  prod:0,
    desc:'Ce que les grandes cabines attendent de toi.', icone:'📀' },
  { id:'acoustique', nom:'Traitement acoustique',     prix:2600,  role:'bonus', skill:0,  prod:5,
    desc:'La pièce arrête de mentir.', icone:'🧱' },
  { id:'modulaire',  nom:'Système modulaire',         prix:6500,  role:'bonus', skill:0,  prod:7,
    desc:'Tu vas y passer tes nuits.', icone:'🧩' },
  { id:'console',    nom:'Console de mixage',         prix:14000, role:'bonus', skill:2,  prod:9,
    desc:'Summing, saturation, statut.', icone:'🎛️' },
  { id:'mastering',  nom:'Suite de mastering',        prix:32000, role:'bonus', skill:0,  prod:12,
    desc:'Plus besoin d’envoyer à l’extérieur.', icone:'💎' },
];
export const materielParId = (id) => MATERIEL.find((m) => m.id === id);
/* Les sept pieces sans lesquelles on ne joue nulle part. */
export const KIT_DJ = MATERIEL.filter((m) => m.role === 'dj').map((m) => m.id);

// ---------------------------------------------------------------------
// LA VIE QUOTIDIENNE · ce qui s'achete en dehors du studio
// ---------------------------------------------------------------------
export const VIE = [
  { id:'velo',     nom:'Vélo d’occasion',   prix:90,   desc:'Cadre tordu, mais il roule. Ouvre la livraison.', icone:'🚲' },
  { id:'sac',      nom:'Sac à disques',     prix:70,   desc:'Trente disques sur le dos sans se casser.', icone:'🎒' },
  { id:'scooter',  nom:'Scooter',           prix:1200, desc:'Les livraisons paient double, et tu arrives à l’heure.', icone:'🛵' },
];

// ---------------------------------------------------------------------
// LES PETITS BOULOTS · avant la musique, il faut manger
//   heures : ce que ca prend, energie : ce que ca coute
//   besoin : condition d'acces
// ---------------------------------------------------------------------
export const BOULOTS = [
  { id:'plonge',    lieu:'snack', nom:'Plongeur',            paie:54,  heures:4, energie:24, besoin:null,
    desc:'Les mains dans l’eau grasse. Personne ne te parle.', icone:'🍽️' },
  { id:'livraison', lieu:'snack', nom:'Livreur à vélo',      paie:96,  heures:4, energie:30, besoin:{ vie:'velo' },
    desc:'Payé à la course. Il te faut un vélo.', icone:'🚲' },
  { id:'commis',    lieu:'snack', nom:'Commis de cuisine',   paie:145, heures:5, energie:28, besoin:{ quarts:6 },
    desc:'Tu tiens un service sans tout brûler.', icone:'🔪' },
  { id:'scooter',   lieu:'snack', nom:'Livreur en scooter',  paie:210, heures:4, energie:22, besoin:{ vie:'scooter' },
    desc:'Le double des courses, la moitié de la sueur.', icone:'🛵' },
  { id:'barman',    lieu:'bar',   nom:'Barman au Sous-Sol',  paie:190, heures:5, energie:26, besoin:{ niveau:5 },
    desc:'Tu vois passer tous les DJ de la ville. Et tu écoutes.', icone:'🍺' },
  { id:'vendeur',   lieu:'disquaire', nom:'Vendeur au disquaire', paie:170, heures:4, energie:18, besoin:{ disques:10 },
    desc:'Payé pour ranger des bacs. Et pour écouter toute la journée.', icone:'📦' },
];

export const NOURRITURE = [
  { id:'cafe',     nom:'Café double',    prix:4,  energie:14, desc:'Le vrai secret de la scène.', icone:'☕' },
  { id:'sandwich', nom:'Sandwich',       prix:9,  energie:22, desc:'Correct.', icone:'🥪' },
  { id:'poutine',  nom:'Poutine',        prix:14, energie:34, desc:'Le carburant national.', icone:'🍟' },
  { id:'bagel',    nom:'Bagel et smoked',prix:16, energie:40, desc:'Montréal dans une bouchée.', icone:'🥯' },
  { id:'biere',    nom:'Une bière',      prix:9,  energie:-4, hype:1, desc:'Des rumeurs et un peu de hype.', icone:'🍺', lieu:'bar' },
];

// ---------------------------------------------------------------------
// LES SALLES · ou l'on joue. Chaque soir, la ville propose des dates.
//   niveau : niveau du personnage requis, cachet : fourchette en dollars
//   courbe : l'energie que la salle attend, disque apres disque (1 a 5)
// ---------------------------------------------------------------------
export const SALLES = [
  { id:'soussol',   nom:'Le Sous-Sol',         lieu:'bar',      niveau:1,  cachet:[60, 120],     jauge:60,     courbe:[2, 3, 3, 4], fans:1.0,
    desc:'Un bar, une cave, trente personnes qui te tournent le dos au début.' },
  { id:'after',     nom:'After clandestin',    lieu:'after',    niveau:3,  cachet:[150, 280],    jauge:200,    courbe:[3, 4, 4, 5], fans:1.3,
    desc:'Une adresse par texto à 3 h du matin. Ça tape.' },
  { id:'bunker',    nom:'Le Bunker',           lieu:'club',     niveau:6,  cachet:[400, 900],    jauge:600,    courbe:[2, 3, 4, 5], fans:1.6,
    desc:'Le club de la ville. Le son est énorme, la cabine est haute.' },
  { id:'piknic',    nom:'Piknic au parc',      lieu:'parc',     niveau:9,  cachet:[1500, 3200],  jauge:3000,   courbe:[2, 3, 4, 4], fans:2.0,
    desc:'Dimanche, plein soleil, une foule qui danse sur l’herbe.' },
  { id:'warehouse', nom:'Warehouse',           lieu:'club',     niveau:12, cachet:[4000, 8500],  jauge:6000,   courbe:[3, 4, 5, 5], fans:2.5,
    desc:'Un entrepôt, un mur d’enceintes, huit heures de nuit.' },
  { id:'festival',  nom:'Grande scène du festival', lieu:'parc', niveau:16, cachet:[15000, 32000], jauge:25000, courbe:[3, 4, 4, 5], fans:3.2,
    desc:'Ton nom en gros sur l’affiche. Ne te rate pas.' },
  { id:'stade',     nom:'Stade · closing set', lieu:'stade',    niveau:22, cachet:[60000, 140000], jauge:90000, courbe:[3, 4, 5, 5], fans:4.0,
    desc:'Cent mille personnes. La fin du voyage, ou son début.' },
];
export const salleParId = (id) => SALLES.find((s) => s.id === id);

// ---------------------------------------------------------------------
// LES CAMPAGNES DE PROMO · de la hype et des fans, etales sur des jours
// ---------------------------------------------------------------------
export const CAMPAGNES = [
  { id:'flyers',  nom:'Flyers au dépanneur',       prix:40,    niveau:1,  hype:5,  fans:30,     jours:2, icone:'📄', desc:'Old school, mais ça marche encore.' },
  { id:'radio',   nom:'Mix pour la radio étudiante', prix:150, niveau:3,  hype:10, fans:180,    jours:3, icone:'📻', desc:'2 h du matin, mais de vrais auditeurs.' },
  { id:'blog',    nom:'Premiere sur un blog',      prix:500,   niveau:5,  hype:18, fans:800,    jours:4, icone:'📰', desc:'Un lien, un commentaire, une carrière.' },
  { id:'reseaux', nom:'Campagne réseaux',          prix:1800,  niveau:8,  hype:28, fans:4000,   jours:5, icone:'📱', desc:'Ciblage : 18-34 ans, aime les sous-sols.' },
  { id:'video',   nom:'Set filmé en direct',       prix:7000,  niveau:11, hype:50, fans:28000,  jours:7, icone:'🎥', desc:'Une caméra, des amis qui dansent mal.' },
  { id:'mag',     nom:'Couverture de magazine',    prix:20000, niveau:15, hype:70, fans:100000, jours:9, icone:'🗞️', desc:'La photo en noir et blanc obligatoire.' },
  { id:'sync',    nom:'Sync pub et série',         prix:70000, niveau:20, hype:90, fans:400000, jours:12, icone:'📺', desc:'Ta nappe sur une pub de char électrique.' },
];

// ---------------------------------------------------------------------
// LE LABEL · ses paliers. Chaque palier ouvre des artistes plus connus.
// ---------------------------------------------------------------------
export const LABEL = [
  { niveau:1, nom:'Label de chambre',  prix:2500,   artistes:2,  desc:'Un nom, un logo fait la nuit, deux amis signés.' },
  { niveau:2, nom:'Label indé',        prix:12000,  artistes:4,  desc:'Une distribution, un bureau qui sent le café.' },
  { niveau:3, nom:'Label établi',      prix:45000,  artistes:7,  desc:'Des sorties tous les mois, des artistes qui appellent.' },
  { niveau:4, nom:'Groupe indépendant',prix:180000, artistes:12, desc:'Boutique, studio, tourneur maison.' },
  { niveau:5, nom:'Major',             prix:900000, artistes:20, desc:'La tour de verre. Tout le monde veut signer chez toi.' },
];

// ---------------------------------------------------------------------
// LES ARTISTES DE LA SCENE LOCALE · inventes, donc les premiers signes
// ---------------------------------------------------------------------
export const ARTISTES_LOCAUX = [
  { id:'loc_modular',  name:'Lil Modular',    real:false, family:'techno',   tier:1, advance:350,  fee:0.35, quality:44, reach:900,
    bio:'Voisin du 3e. Fait des jams sur un Volca dans sa cuisine.' },
  { id:'loc_cassette', name:'Cassette Ghost', real:false, family:'ambient',  tier:1, advance:500,  fee:0.35, quality:48, reach:1400,
    bio:'Dépose des K7 anonymes dans les boîtes aux lettres.' },
  { id:'loc_poutine',  name:'DJ Poutine',     real:false, family:'breaks',   tier:1, advance:650,  fee:0.4,  quality:51, reach:2200,
    bio:'Résident du after de la rue Marquette. Increvable.' },
  { id:'loc_soeur',    name:'Sœur Machine',   real:false, family:'electro',  tier:2, advance:1500, fee:0.4,  quality:58, reach:6000,
    bio:'Live 100 % machines, zéro laptop, zéro pitié.' },
  { id:'loc_vitrine',  name:'Vitrine Acide',  real:false, family:'techno',   tier:2, advance:2200, fee:0.4,  quality:61, reach:9000,
    bio:'Trois 303 et un problème avec les limiteurs.' },
];

// ---------------------------------------------------------------------
// LES RIVAUX · ils montent sans toi, raflent les disques, tiennent les
// salles. Noms fictifs a dessein : eux doivent pouvoir perdre.
// ---------------------------------------------------------------------
export const RIVAUX = [
  { id:'v_sylex', name:'DJ Sylex',       family:'techno',   hype:16, mordant:0.75, trait:'bacs',  corps:'#7fb8f0', short:'#d9564a',
    bio:'Arrive au disquaire avant l’ouverture. Toujours.' },
  { id:'v_vanta', name:'Vanta',          family:'house',    hype:26, mordant:0.5,  trait:'clubs', corps:'#e8709a', short:'#4a86d9',
    bio:'Résidente quelque part depuis si longtemps qu’on a oublié qui l’a bookée.' },
  { id:'v_kzero', name:'Kilomètre Zéro', family:'electro',  hype:11, mordant:0.95, trait:'signe', corps:'#8fe0a8', short:'#e8a93a',
    bio:'Signe tout ce qui bouge et trie après. Ça marche plus souvent qu’on croit.' },
  { id:'v_ondes', name:'Madame Ondes',   family:'ambient',  hype:33, mordant:0.35, trait:'presse',corps:'#b98fe8', short:'#4ac9a8',
    bio:'La presse l’adore, le dancefloor beaucoup moins.' },
  { id:'v_kiosq', name:'Brutal Kiosque', family:'hardcore', hype:7,  mordant:1.0,  trait:'clubs', corps:'#e88f4a', short:'#8f5fc9',
    bio:'Joue plus fort que tout le monde. Ce n’est pas une métaphore.' },
  { id:'v_aphel', name:'Aphélie',        family:'minimal',  hype:44, mordant:0.55, trait:'signe', corps:'#f0a8c0', short:'#4a86d9',
    bio:'Le label le plus respecté de la ville. Elle le sait.' },
];

export const HABITANTS = [
  { id:'h_disquaire', nom:'Le disquaire',          role:'Tient le bac depuis vingt ans',   corps:'#f2cf4c', short:'#8f5fc9' },
  { id:'h_habitue',   nom:'Un habitué du bar',     role:'Connaît toutes les rumeurs',      corps:'#e88f4a', short:'#4a86d9' },
  { id:'h_voisine',   nom:'La voisine du dessus',  role:'Entend tout ce que tu fais',      corps:'#f0a8c0', short:'#4ac9a8' },
  { id:'h_livreur',   nom:'Un livreur',            role:'Fait les mêmes tournées que toi', corps:'#7fb8f0', short:'#e8a93a' },
  { id:'h_gamin',     nom:'Un gamin au casque',    role:'Te regarde comme si tu savais tout', corps:'#8fe0a8', short:'#d9564a' },
  { id:'h_patron',    nom:'Le patron du Sous-Sol', role:'Décide qui joue et quand',        corps:'#b98fe8', short:'#4a86d9' },
];

// ---------------------------------------------------------------------
// LES NIVEAUX DU PERSONNAGE · l'experience monte, les portes s'ouvrent
// ---------------------------------------------------------------------
export const xpPour = (niveau) => Math.round(70 * Math.pow(niveau, 1.55));
export const TITRES = [
  [1, 'Sans le sou'], [2, 'Apprenti'], [4, 'DJ de chambre'], [6, 'Résident'], [8, 'Boss de label'],
  [10, 'Headliner'], [13, 'Producteur'], [16, 'Tête d’affiche'], [20, 'Icône'], [25, 'Légende SONAA'],
];
export const titrePour = (niveau) => {
  let t = TITRES[0][1];
  for (const [n, nom] of TITRES) if (niveau >= n) t = nom;
  return t;
};
/* Ce que chaque niveau debloque, en clair : c'est ce que le joueur lit
   sur la barre d'experience, et c'est ce qui le fait continuer. */
export const PALIERS = {
  2: 'Livraison à vélo',
  3: 'After clandestin · disquaire Breaks & Bass · radio étudiante',
  4: 'Disquaire Nuage (ambient et downtempo)',
  5: 'Barman au Sous-Sol · disquaire Electro et Hardcore · premiere blog',
  6: 'Le Bunker t’ouvre sa cabine',
  7: 'Disquaire Trance et Psy',
  8: 'Ouvrir ton label · campagne réseaux',
  9: 'Piknic au parc',
  11: 'Set filmé en direct',
  12: 'Warehouse',
  15: 'Couverture de magazine',
  16: 'Grande scène du festival',
  20: 'Sync pub et série',
  22: 'Le stade',
};

// ---------------------------------------------------------------------
// LES DISQUAIRES · un par paire de familles de l'atlas
// ---------------------------------------------------------------------
export const DISQUAIRES = [
  { id:'dq_disco',   nom:'Vinyl Cave',      familles:['disco', 'roots'],       niveau:1, couleur:'#ff8a3d', enseigne:'DISCO · ROOTS' },
  { id:'dq_house',   nom:'House Nation',    familles:['house', 'minimal'],     niveau:1, couleur:'#ff5cb4', enseigne:'HOUSE · MINIMAL' },
  { id:'dq_techno',  nom:'Bunker Techno',   familles:['techno', 'industrial'], niveau:1, couleur:'#6c8cff', enseigne:'TECHNO · INDUS' },
  { id:'dq_breaks',  nom:'Breaks & Bass',   familles:['breaks', 'bass'],       niveau:3, couleur:'#b56cff', enseigne:'BREAKS · BASS' },
  { id:'dq_nuage',   nom:'Le Nuage',        familles:['ambient', 'downtempo'], niveau:4, couleur:'#5fd6c8', enseigne:'AMBIENT · DOWNTEMPO' },
  { id:'dq_electro', nom:'Circuit Electro', familles:['electro', 'hardcore'],  niveau:5, couleur:'#ffd23d', enseigne:'ELECTRO · HARDCORE' },
  { id:'dq_trance',  nom:'Temple Trance',   familles:['trance', 'psy'],        niveau:7, couleur:'#4fe08a', enseigne:'TRANCE · PSY' },
];

// ---------------------------------------------------------------------
// LE PLAN DE LA VILLE · en tuiles. Les portes donnent au sud.
//   niveau : a partir duquel le lieu est ouvert ; avant, c'est un chantier
// ---------------------------------------------------------------------
export const LARGEUR = 36, HAUTEUR = 32;
export const DEPART = { x: 17.5, y: 15.5 };

export const BATIMENTS = [
  // rangee nord : trois disquaires et le magasin de matos
  { id:'dq_disco',   kind:'disquaire', x:4,  y:4,  w:4, d:3, niveau:1, mur:'#ff8a3d', toit:'#ff5b3d', style:'boutique' },
  { id:'dq_house',   kind:'disquaire', x:10, y:4,  w:4, d:3, niveau:1, mur:'#ff5cb4', toit:'#d63c8e', style:'boutique' },
  { id:'dq_techno',  kind:'disquaire', x:16, y:4,  w:4, d:3, niveau:1, mur:'#6c8cff', toit:'#4a5fd6', style:'bunker' },
  { id:'gear',       kind:'gear',      x:22, y:4,  w:4, d:3, niveau:1, mur:'#4fbf9f', toit:'#2f9a7c', style:'atelier',  nom:'Massive Machines', enseigne:'MATOS' },
  { id:'promo',      kind:'promo',     x:28, y:4,  w:3, d:3, niveau:1, mur:'#9ad0ff', toit:'#5a8fd6', style:'radio',    nom:'Radio Machine',    enseigne:'RADIO' },
  // rangee centrale : chez toi, la place, le bar, le casse-croute
  { id:'home',       kind:'home',      x:4,  y:11, w:4, d:3, niveau:1, mur:'#ffd08a', toit:'#5fa87f', style:'maison',   nom:'Chez toi',         enseigne:'STUDIO' },
  { id:'snack',      kind:'snack',     x:10, y:11, w:3, d:3, niveau:1, mur:'#ffe27a', toit:'#e0705c', style:'snack',    nom:'Casse-croûte',     enseigne:'SNACK' },
  { id:'bar',        kind:'bar',       x:22, y:11, w:4, d:3, niveau:1, mur:'#c98c4e', toit:'#8f5fc9', style:'bar',      nom:'Le Sous-Sol',      enseigne:'BAR' },
  { id:'club',       kind:'club',      x:28, y:10, w:5, d:4, niveau:6, mur:'#3a3350', toit:'#2a2440', style:'club',     nom:'Le Bunker',        enseigne:'BUNKER' },
  // rangee sud : disquaires tardifs, label, parc
  { id:'dq_breaks',  kind:'disquaire', x:4,  y:18, w:4, d:3, niveau:3, mur:'#b56cff', toit:'#7d3fd6', style:'boutique' },
  { id:'dq_nuage',   kind:'disquaire', x:10, y:18, w:3, d:3, niveau:4, mur:'#5fd6c8', toit:'#3aa89c', style:'boutique' },
  { id:'label',      kind:'label',     x:16, y:18, w:4, d:3, niveau:8, mur:'#ffb3a0', toit:'#e08a72', style:'bureau',   nom:'Bureau du label',  enseigne:'LABEL' },
  { id:'dq_electro', kind:'disquaire', x:22, y:18, w:4, d:3, niveau:5, mur:'#ffd23d', toit:'#d6a21e', style:'boutique' },
  { id:'dq_trance',  kind:'disquaire', x:28, y:18, w:4, d:3, niveau:7, mur:'#4fe08a', toit:'#2fb06a', style:'temple' },
  // tout au sud : le parc et la tour
  { id:'parc',       kind:'parc',      x:3,  y:25, w:5, d:4, niveau:9, mur:'#7ec95a', toit:'#ff5cb4', style:'scene',    nom:'Scène du parc',    enseigne:'PIKNIC' },
  { id:'major',      kind:'major',     x:28, y:24, w:5, d:5, niveau:22, mur:'#b3c8e0', toit:'#c9a24a', style:'tour',    nom:'La Tour',          enseigne:'MAJOR' },
];
for (const b of BATIMENTS) {
  b.door = { x: b.x + (b.w >> 1), y: b.y + b.d };
  const dq = DISQUAIRES.find((d) => d.id === b.id);
  if (dq) { b.nom = dq.nom; b.enseigne = dq.enseigne; b.niveau = dq.niveau; b.familles = dq.familles; }
}
export const batimentParId = (id) => BATIMENTS.find((b) => b.id === id);

// ---------------------------------------------------------------------
// LA QUETE · la colonne vertebrale, du premier quart de plonge au stade.
//   cible : le batiment ou aller ; test : quand l'etape est finie
// ---------------------------------------------------------------------
export const QUETE = [
  { id:'boulot',    but:'Trouve du travail au casse-croûte',            cible:'snack',     xp:20,
    aide:'Quarante dollars en poche et pas de matos. On commence par la plonge.',
    test:(s) => s.stats.quarts >= 1 },
  { id:'casque',    but:'Achète un casque chez Massive Machines',        cible:'gear',      xp:30,
    aide:'120 $. Deux quarts de plonge et un café.',
    test:(s) => s.materiel.includes('casque') },
  { id:'platine',   but:'Achète ta première platine',                    cible:'gear',      xp:40,
    aide:'380 $. C’est long. Le vélo fait payer la livraison mieux que la plonge.',
    test:(s) => s.materiel.includes('platine1') },
  { id:'kit',       but:'Complète le kit : aiguille, deuxième platine, table, câbles, enceintes', cible:'gear', xp:120,
    aide:'Rien ne sonne tant que tout n’est pas branché. Chaque pièce apparaît chez toi.',
    test:(s) => KIT_DJ.every((id) => s.materiel.includes(id)) },
  { id:'disques',   but:'Achète cinq disques chez un disquaire',         cible:'dq_techno', xp:60,
    aide:'Les bacs changent chaque jour. Regarde l’énergie et le tempo : un set se construit.',
    test:(s) => s.collection.length >= 5 },
  { id:'set',       but:'Accepte une date et joue ton premier set',      cible:'bar',       xp:100,
    aide:'Le tableau des dates est chez toi. Le Sous-Sol prend les débutants.',
    test:(s) => s.stats.sets >= 1 },
  { id:'promo',     but:'Fais-toi connaître : lance une campagne à la radio', cible:'promo', xp:80,
    aide:'Les flyers suffisent pour commencer. La hype fait monter les cachets.',
    test:(s) => s.stats.campagnes >= 1 },
  { id:'laptop',    but:'Achète un laptop et produis ton premier morceau', cible:'gear',    xp:150,
    aide:'Jouer les disques des autres, c’est bien. Faire les tiens, c’est mieux.',
    test:(s) => s.morceaux.length >= 1 },
  { id:'bunker',    but:'Joue au Bunker',                                 cible:'club',      xp:200,
    aide:'Niveau 6. Enchaîne les dates, les campagnes et les disques.',
    test:(s) => s.stats.salles.includes('bunker') },
  { id:'label',     but:'Ouvre ton label',                                cible:'label',     xp:250,
    aide:'Niveau 8 et 2 500 $. Ton catalogue commence.',
    test:(s) => s.label.niveau >= 1 },
  { id:'signe',     but:'Signe un premier artiste',                       cible:'label',     xp:200,
    aide:'Commence par la scène locale. Les grands noms attendent un label plus gros.',
    test:(s) => s.roster.length >= 1 },
  { id:'connu',     but:'Signe un artiste connu de la scène',             cible:'label',     xp:400,
    aide:'Un artiste de l’atlas. Il faut un label indé et une avance.',
    test:(s) => s.roster.some((r) => r.real) },
  { id:'festival',  but:'Joue la grande scène du festival',               cible:'parc',      xp:800,
    aide:'Niveau 16. Le tableau des dates finira par te la proposer.',
    test:(s) => s.stats.salles.includes('festival') },
  { id:'stade',     but:'Le stade. Le closing set.',                      cible:'major',     xp:2000,
    aide:'Niveau 22. Tout le monde est venu pour toi.',
    test:(s) => s.stats.salles.includes('stade') },
  { id:'fin',       but:'La ville est à toi. Continue tant que ça te chante.', cible:null, xp:0,
    aide:'', test:() => false },
];
