// =====================================================================
//  CONTENU DU JEU — artistes, disques, matos, campagnes
//  ---------------------------------------------------------------
//  NOTE JURIDIQUE : tous les noms réels sont regroupés ICI. Pour une
//  version commerciale, remplace simplement ce fichier par des noms
//  parodiques (ex. "Geoff Mills" -> "Jeff Milz") : rien d'autre dans
//  le code ne dépend de ces chaînes.
// =====================================================================

export const GENRES = ['Techno', 'Deep House', 'Electro', 'IDM', 'Acid', 'Ambient', 'Breakbeat', 'Minimal'];

// ---------------------------------------------------------------------
// DISQUES — le crate digging. energy 1..5, rarity 1..5
// ---------------------------------------------------------------------
export const RECORDS = [
  { id:'r01', artist:'Jeff Mills',        title:'The Bells',              label:'Purpose Maker', year:1997, genre:'Techno',     bpm:135, energy:5, rarity:4, price:48 },
  { id:'r02', artist:'Laurent Garnier',   title:'Crispy Bacon',           label:'F Communications', year:1997, genre:'Techno',  bpm:137, energy:5, rarity:3, price:34 },
  { id:'rq1', artist:'Laurent Garnier',   title:'I Was in Ecstasy',       label:'F Communications', year:1997, genre:'Techno',  bpm:130, energy:4, rarity:5, price:65, quest:true,
    note:'Le disque qui a tout changé. Neuf minutes qui ouvrent une porte.' },
  { id:'r03', artist:'Aphex Twin',        title:'Xtal',                   label:'R&S',           year:1992, genre:'Ambient',    bpm:105, energy:2, rarity:4, price:52 },
  { id:'r04', artist:'Aphex Twin',        title:'Windowlicker',           label:'Warp',          year:1999, genre:'IDM',        bpm:120, energy:3, rarity:5, price:78 },
  { id:'r05', artist:'Richie Hawtin',     title:'Spastik',                label:'Plus 8',        year:1993, genre:'Minimal',    bpm:133, energy:5, rarity:4, price:44 },
  { id:'r06', artist:'Carl Craig',        title:'At Les',                 label:'Planet E',      year:1997, genre:'Techno',     bpm:126, energy:4, rarity:4, price:56 },
  { id:'r07', artist:'Robert Hood',       title:'Minus',                  label:'M-Plant',       year:1994, genre:'Minimal',    bpm:132, energy:4, rarity:4, price:46 },
  { id:'r08', artist:'Derrick May',       title:'Strings of Life',        label:'Transmat',      year:1987, genre:'Techno',     bpm:122, energy:4, rarity:5, price:95 },
  { id:'r09', artist:'Juan Atkins',       title:'No UFOs',                label:'Metroplex',     year:1985, genre:'Electro',    bpm:118, energy:3, rarity:5, price:110 },
  { id:'r10', artist:'Kevin Saunderson',  title:'Big Fun',                label:'KMS',           year:1988, genre:'Deep House', bpm:120, energy:3, rarity:4, price:62 },
  { id:'r11', artist:'Underground Resistance', title:'Jaguar',            label:'UR',            year:1999, genre:'Techno',     bpm:134, energy:5, rarity:5, price:88 },
  { id:'r12', artist:'Drexciya',          title:'Bubble Metropolis',      label:'Underground Resistance', year:1993, genre:'Electro', bpm:128, energy:4, rarity:5, price:120 },
  { id:'r13', artist:'DJ Stingray 313',   title:'Kern Vol. 3',            label:'Tresor',        year:2016, genre:'Electro',    bpm:140, energy:5, rarity:2, price:26 },
  { id:'r14', artist:'Larry Heard',       title:'Can You Feel It',        label:'Trax',          year:1986, genre:'Deep House', bpm:118, energy:3, rarity:5, price:84 },
  { id:'r15', artist:'Moodymann',         title:'Shades of Jae',          label:'KDJ',           year:2000, genre:'Deep House', bpm:120, energy:3, rarity:4, price:58 },
  { id:'r16', artist:'Theo Parrish',      title:'Falling Up',             label:'Sound Signature', year:2004, genre:'Deep House', bpm:122, energy:4, rarity:4, price:52 },
  { id:'r17', artist:'Nina Kraviz',       title:'Ghetto Kraviz',          label:'Rekids',        year:2012, genre:'Techno',     bpm:126, energy:4, rarity:2, price:24 },
  { id:'r18', artist:'Helena Hauff',      title:'Sworn to Secrecy',       label:'Werkdiscs',     year:2015, genre:'Electro',    bpm:132, energy:4, rarity:2, price:28 },
  { id:'r19', artist:'Marcel Dettmann',   title:'Seduction',              label:'Ostgut Ton',    year:2010, genre:'Techno',     bpm:130, energy:5, rarity:3, price:32 },
  { id:'r20', artist:'Ben Klock',         title:'Subzero',                label:'Ostgut Ton',    year:2009, genre:'Techno',     bpm:128, energy:5, rarity:3, price:33 },
  { id:'r21', artist:'Floating Points',   title:'Silhouettes',            label:'Eglo',          year:2011, genre:'Deep House', bpm:120, energy:3, rarity:3, price:38 },
  { id:'r22', artist:'Four Tet',          title:'Angel Echoes',           label:'Domino',        year:2010, genre:'IDM',        bpm:118, energy:2, rarity:2, price:26 },
  { id:'r23', artist:'Boards of Canada',  title:'Roygbiv',                label:'Warp',          year:1998, genre:'IDM',        bpm:96,  energy:2, rarity:4, price:64 },
  { id:'r24', artist:'Autechre',          title:'Basscadet',              label:'Warp',          year:1994, genre:'IDM',        bpm:112, energy:3, rarity:4, price:58 },
  { id:'r25', artist:'Squarepusher',      title:'Come On My Selector',    label:'Warp',          year:1997, genre:'Breakbeat',  bpm:160, energy:5, rarity:3, price:42 },
  { id:'r26', artist:'Plastikman',        title:'Consumed',               label:'M_nus',         year:1998, genre:'Minimal',    bpm:125, energy:2, rarity:4, price:66 },
  { id:'r27', artist:'Ricardo Villalobos',title:'Dexter',                 label:'Perlon',        year:2003, genre:'Minimal',    bpm:124, energy:3, rarity:4, price:54 },
  { id:'r28', artist:'Green Velvet',      title:'Flash',                  label:'Relief',        year:1995, genre:'Acid',       bpm:130, energy:5, rarity:3, price:36 },
  { id:'r29', artist:'Hardfloor',         title:'Acperience 1',           label:'Harthouse',     year:1992, genre:'Acid',       bpm:132, energy:5, rarity:4, price:47 },
  { id:'r30', artist:'Phuture',           title:'Acid Tracks',            label:'Trax',          year:1987, genre:'Acid',       bpm:124, energy:4, rarity:5, price:105 },
  { id:'r31', artist:'Surgeon',           title:'Badger Bite',            label:'Dynamic Tension', year:1997, genre:'Techno',   bpm:138, energy:5, rarity:3, price:40 },
  { id:'r32', artist:'Blawan',            title:'Why They Hide',          label:'Hinge Finger',  year:2012, genre:'Techno',     bpm:132, energy:5, rarity:3, price:44 },
  { id:'r33', artist:'Objekt',            title:'Ganzfeld',               label:'PAN',           year:2014, genre:'Breakbeat',  bpm:130, energy:4, rarity:3, price:38 },
  { id:'r34', artist:'Skee Mask',         title:'Rev8617',                label:'Ilian Tape',    year:2018, genre:'Breakbeat',  bpm:140, energy:4, rarity:2, price:30 },
  { id:'r35', artist:'Bicep',             title:'Glue',                   label:'Ninja Tune',    year:2017, genre:'Breakbeat',  bpm:126, energy:4, rarity:1, price:22 },
  { id:'r36', artist:'Jon Hopkins',       title:'Open Eye Signal',        label:'Domino',        year:2013, genre:'Techno',     bpm:124, energy:4, rarity:2, price:27 },
  { id:'r37', artist:'Moderat',           title:'A New Error',            label:'BPitch',        year:2009, genre:'IDM',        bpm:118, energy:3, rarity:2, price:29 },
  { id:'r38', artist:'Âme',               title:'Rej',                    label:'Innervisions',  year:2005, genre:'Deep House', bpm:124, energy:4, rarity:3, price:41 },
  { id:'r39', artist:'Dixon',             title:'Temporary Ghosts',       label:'Innervisions',  year:2010, genre:'Deep House', bpm:122, energy:3, rarity:3, price:37 },
  { id:'r40', artist:'Charlotte de Witte',title:'Sgadi Li Mi',            label:'KNTXT',         year:2019, genre:'Techno',     bpm:140, energy:5, rarity:1, price:20 },
  { id:'r41', artist:'I Hate Models',     title:'Daydream',               label:'ARTS',          year:2018, genre:'Techno',     bpm:145, energy:5, rarity:2, price:25 },
  { id:'r42', artist:'Peggy Gou',         title:'It Makes You Forget',    label:'Ninja Tune',    year:2018, genre:'Deep House', bpm:122, energy:3, rarity:1, price:21 },
  { id:'r43', artist:'Honey Dijon',       title:'Downtown',               label:'Classic',       year:2017, genre:'Deep House', bpm:124, energy:4, rarity:2, price:28 },
  { id:'r44', artist:'Donato Dozzy',      title:'K',                      label:'Spazio Disponibile', year:2016, genre:'Ambient', bpm:120, energy:2, rarity:3, price:39 },
  { id:'r45', artist:'Sven Väth',         title:'L\'Esperanza',           label:'Eye Q',         year:1993, genre:'Techno',     bpm:128, energy:4, rarity:4, price:57 },
  { id:'r46', artist:'Daft Punk',         title:'Da Funk',                label:'Soma',          year:1995, genre:'Deep House', bpm:110, energy:4, rarity:5, price:130 },
];

// ---------------------------------------------------------------------
// ARTISTES SIGNABLES — tier = niveau de label requis pour les approcher
// ---------------------------------------------------------------------
export const ARTISTS = [
  { id:'a01', name:'Lil Modular',    real:false, genre:'Techno',     tier:1, advance:400,   fee:0.35, quality:42, reach:900,     bio:'Voisin du 3e. Fait des jams sur un Volca dans sa cuisine.' },
  { id:'a02', name:'Cassette Ghost', real:false, genre:'Ambient',    tier:1, advance:550,   fee:0.35, quality:47, reach:1400,    bio:'Dépose des K7 anonymes dans les boîtes aux lettres.' },
  { id:'a03', name:'DJ Poutine',     real:false, genre:'Breakbeat',  tier:1, advance:700,   fee:0.4,  quality:50, reach:2200,    bio:'Résident du after de la rue Marquette. Increvable.' },
  { id:'a04', name:'Sœur Machine',   real:false, genre:'Electro',    tier:2, advance:1600,  fee:0.4,  quality:58, reach:6000,    bio:'Live 100% hardware, zéro laptop, zéro pitié.' },
  { id:'a05', name:'Vitrine Acide',  real:false, genre:'Acid',       tier:2, advance:2400,  fee:0.4,  quality:61, reach:9000,    bio:'Trois 303 et un problème avec les limiteurs.' },
  { id:'a06', name:'Helena Hauff',   real:true,  genre:'Electro',    tier:3, advance:9000,  fee:0.45, quality:78, reach:120000,  bio:'Hambourg. Vinyle only, EBM et acide brute.' },
  { id:'a07', name:'DJ Stingray 313',real:true,  genre:'Electro',    tier:3, advance:11000, fee:0.45, quality:80, reach:140000,  bio:'Détroit. Cagoule, 145 BPM, transmissions cryptées.' },
  { id:'a08', name:'Skee Mask',      real:true,  genre:'Breakbeat',  tier:3, advance:12000, fee:0.45, quality:82, reach:180000,  bio:'Munich. Breaks brumeux, sort quand ça lui chante.' },
  { id:'a09', name:'Nina Kraviz',    real:true,  genre:'Techno',     tier:4, advance:26000, fee:0.5,  quality:84, reach:900000,  bio:'Sibérie. Trip Records, chaos assumé.' },
  { id:'a10', name:'Marcel Dettmann',real:true,  genre:'Techno',     tier:4, advance:30000, fee:0.5,  quality:86, reach:800000,  bio:'Berlin. Le son du béton armé.' },
  { id:'a11', name:'Robert Hood',    real:true,  genre:'Minimal',    tier:4, advance:34000, fee:0.5,  quality:88, reach:700000,  bio:'Détroit. Le minimalisme comme religion.' },
  { id:'a12', name:'Floating Points',real:true,  genre:'Deep House', tier:4, advance:38000, fee:0.5,  quality:88, reach:1100000, bio:'Londres. Neuroscientifique et modulaire.' },
  { id:'a13', name:'Carl Craig',     real:true,  genre:'Techno',     tier:5, advance:70000, fee:0.55, quality:92, reach:1500000, bio:'Planet E. Le jazz de Détroit en machine.' },
  { id:'a14', name:'Laurent Garnier',real:true,  genre:'Techno',     tier:5, advance:90000, fee:0.55, quality:94, reach:2000000, bio:'F Comm. Le boss. Sets de 8 heures.' },
  { id:'a15', name:'Jeff Mills',     real:true,  genre:'Techno',     tier:5, advance:120000,fee:0.55, quality:96, reach:2400000, bio:'The Wizard. Trois platines et une 909.' },
  { id:'a16', name:'Aphex Twin',     real:true,  genre:'IDM',        tier:6, advance:220000,fee:0.6,  quality:99, reach:4000000, bio:'Cornouailles. Ne répond jamais aux courriels.' },
];

// ---------------------------------------------------------------------
// MATÉRIEL — bonus de production
// ---------------------------------------------------------------------
export const GEAR = [
  { id:'g01', name:'Casque cassé',      price:0,     tier:0, quality:0,  speed:0,   desc:'Une oreille sur deux. On fait avec.' },
  { id:'g02', name:'Laptop + Ableton',  price:900,   tier:0, quality:8,  speed:0.1, desc:'La base. Enfin un vrai DAW.' },
  { id:'g03', name:'Moniteurs 5"',      price:1200,  tier:0, quality:7,  speed:0,   desc:'Tu entends enfin tes basses.' },
  { id:'g04', name:'TR-909 (clone)',    price:1800,  tier:1, quality:9,  speed:0.1, desc:'Le kick qui a fait Détroit.' },
  { id:'g05', name:'TB-303 (clone)',    price:1500,  tier:1, quality:8,  speed:0.05,desc:'Acide. Incontrôlable. Parfait.' },
  { id:'g06', name:'Juno-106',          price:3400,  tier:2, quality:11, speed:0.05,desc:'Nappes en chorus, direct au cœur.' },
  { id:'g07', name:'Interface + preamp',price:2100,  tier:2, quality:9,  speed:0.15,desc:'Fini le buzz de masse.' },
  { id:'g08', name:'Modulaire 84HP',    price:7800,  tier:3, quality:15, speed:-0.1,desc:'Tu vas y passer tes nuits.' },
  { id:'g09', name:'Traitement acoustique', price:5200, tier:3, quality:14, speed:0.2, desc:'La pièce arrête de mentir.' },
  { id:'g10', name:'Console analogique',price:19000, tier:4, quality:20, speed:0.15,desc:'Summing, saturation, statut.' },
  { id:'g11', name:'Studio B complet',  price:48000, tier:5, quality:26, speed:0.35,desc:'Deuxième salle : deux prods en parallèle.' },
  { id:'g12', name:'Mastering suite',   price:95000, tier:6, quality:32, speed:0.25,desc:'Plus besoin d’envoyer à l’extérieur.' },
];

// ---------------------------------------------------------------------
// CAMPAGNES DE PROMO
// ---------------------------------------------------------------------
export const CAMPAIGNS = [
  { id:'c01', name:'Flyers au dépanneur', price:60,    tier:0, hype:6,   fans:40,     days:2, desc:'Old school mais ça marche encore.' },
  { id:'c02', name:'Mix pour une radio étudiante', price:180, tier:0, hype:12, fans:220, days:3, desc:'2h du matin, mais des vrais auditeurs.' },
  { id:'c03', name:'Premiere sur un blog',price:600,   tier:1, hype:20,  fans:900,    days:4, desc:'Un lien, un commentaire, une carrière.' },
  { id:'c04', name:'Campagne réseaux',    price:2200,  tier:2, hype:30,  fans:4500,   days:5, desc:'Ciblage : 18-34, aime les sous-sols.' },
  { id:'c05', name:'Boiler Room-like',    price:9000,  tier:3, hype:55,  fans:32000,  days:7, desc:'Une caméra, des amis qui dansent mal.' },
  { id:'c06', name:'Couverture magazine', price:26000, tier:4, hype:70,  fans:110000, days:9, desc:'La photo en noir et blanc obligatoire.' },
  { id:'c07', name:'Sync pub / série',    price:80000, tier:5, hype:85,  fans:450000, days:12,desc:'Ta nappe sur une pub de char électrique.' },
];

// ---------------------------------------------------------------------
// SHOWS — débloqués par la hype
// ---------------------------------------------------------------------
export const GIGS = [
  { id:'v01', name:'Warm-up au Sous-Sol', minHype:0,   fee:110,     cap:60,      fansMul:1.0, energy:22 },
  { id:'v02', name:'After-hours illégal', minHype:15,  fee:220,    cap:200,     fansMul:1.2, energy:30 },
  { id:'v03', name:'Club Le Bunker',      minHype:35,  fee:700,    cap:600,     fansMul:1.4, energy:32 },
  { id:'v04', name:'Nuit blanche',        minHype:60,  fee:2400,   cap:2000,    fansMul:1.7, energy:35 },
  { id:'v05', name:'Warehouse Berlin',    minHype:100, fee:7000,   cap:5000,    fansMul:2.1, energy:40 },
  { id:'v06', name:'Festival Piknic',     minHype:160, fee:18000,  cap:15000,   fansMul:2.6, energy:45 },
  { id:'v07', name:'Main stage Dekmantel',minHype:250, fee:52000,  cap:40000,   fansMul:3.2, energy:50 },
  { id:'v08', name:'Stade — closing set', minHype:400, fee:180000, cap:120000,  fansMul:4.0, energy:60 },
];

// ---------------------------------------------------------------------
// PALIERS DE CARRIÈRE
// ---------------------------------------------------------------------
export const TIERS = [
  { id:0, name:'Bedroom DJ',        need:0,        blurb:'Un casque cassé et beaucoup d’espoir.' },
  { id:1, name:'Résident local',    need:2500,     blurb:'Le barman connaît ton nom.' },
  { id:2, name:'Producteur',        need:14000,    blurb:'Tes tracks tournent ailleurs que chez toi.' },
  { id:3, name:'Label indé',        need:70000,    blurb:'Un catalogue, un logo, des dettes.' },
  { id:4, name:'Label établi',      need:420000,   blurb:'Distribution, bookings, vrai bureau.' },
  { id:5, name:'Groupe indépendant',need:2600000,  blurb:'Magasin, studio, tourneur maison.' },
  { id:6, name:'MAJOR',             need:6000000,  blurb:'La tour de verre. La fin du voyage.' },
];

export const FOOD = [
  { id:'f01', name:'Poutine',        price:14, food:45, drink:5,  energy:6,  desc:'Le carburant national.' },
  { id:'f02', name:'Sandwich',       price:9,  food:28, drink:0,  energy:3,  desc:'Correct.' },
  { id:'f03', name:'Café double',    price:4,  food:0,  drink:18, energy:22, desc:'Le vrai secret de la scène.' },
  { id:'f04', name:'Bouteille d’eau',price:2,  food:0,  drink:38, energy:2,  desc:'Révolutionnaire.' },
  { id:'f05', name:'Bagel + smoked', price:16, food:52, drink:4,  energy:8,  desc:'Montréal dans une bouchée.' },
];

export const DRINKS = [
  { id:'d01', name:'Une bière',      price:9,  social:14, drink:16, energy:-4, hype:0.4 },
  { id:'d02', name:'Tournée générale',price:60, social:38, drink:10, energy:-8, hype:3 },
  { id:'d03', name:'Club soda',      price:4,  social:8,  drink:24, energy:2,  hype:0.1 },
];

export const recordById = id => RECORDS.find(r => r.id === id);
export const artistById = id => ARTISTS.find(a => a.id === id);
export const gearById   = id => GEAR.find(g => g.id === id);
