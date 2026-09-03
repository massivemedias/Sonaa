// =====================================================================
//  QUÊTES — la colonne vertébrale du jeu
//  Du premier disque fouillé jusqu'à la tour du major. Chaque étape dit
//  quoi faire, où aller, et récompense quand elle tombe.
// =====================================================================
export const STEPS = [
  // ------------------------------------------------- acte 1 : la galere
  {
    id: 'first_job',
    goal: 'Trouve du travail au casse-croûte',
    hint: 'Quarante-cinq dollars en poche, pas de matos. On commence par la plonge.',
    target: 'snack',
    reward: { cash: 0 },
    toast: 'Premier quart fini. Le dos casse, mais la poche pleine.',
  },
  {
    id: 'buy_casque',
    goal: 'Économise et achète un vrai casque de DJ',
    hint: '190 $. Enchaîne les quarts au casse-croûte, achète un vélo pour livrer, ça paie mieux.',
    target: 'gear',
    reward: { hype: 1 },
    toast: 'Un vrai casque. Tu entends enfin ce que tu fais.',
  },
  {
    id: 'buy_platines',
    goal: 'Achète deux platines et une table de mixage',
    hint: '1 150 $ d’occasion. C’est long, mais sans elles tu ne joueras nulle part.',
    target: 'gear',
    reward: { hype: 3 },
    toast: 'Des platines a toi. La chambre devient une cabine.',
  },
  // -------------------------------------------- acte 2 : les disques
  {
    id: 'go_shop',
    goal: 'Va au Bunker Techno chercher ton premier disque',
    hint: 'La cabane techno est en haut a gauche de la clairiere.',
    target: 'd_techno',
  },
  {
    id: 'dig',
    goal: 'Fouille les bacs — écoute, compare, choisis',
    hint: 'Chaque disque fouillé prend quelques minutes. Prends ton temps.',
    target: 'd_techno',
  },
  {
    id: 'find_garnier',
    goal: 'Trouve « I Was in Ecstasy » de Laurent Garnier (F Communications)',
    hint: 'Il est quelque part dans le bac techno. Continue de fouiller.',
    target: 'd_techno',
  },
  {
    id: 'listen',
    goal: 'Rentre chez toi et pose-le sur la platine',
    hint: 'Chez toi → onglet « vie » → Écouter des disques.',
    target: 'home',
  },
  // ------------------------------------------------ acte 3 : le DJ
  {
    id: 'first_set',
    goal: 'Joue ton premier set au Sous-Sol',
    hint: 'Il te faut quatre disques. Choisis-les pour qu’ils montent en énergie.',
    target: 'bar',
    reward: { cash: 120, hype: 3 },
    toast: 'Premier cachet de DJ. Le barman retient ton nom.',
  },
  // ------------------------------------------ acte 4 : le producteur
  {
    id: 'buy_machine',
    goal: 'Achète de quoi produire : un laptop ou une boîte à rythmes',
    hint: 'Jouer les disques des autres, c’est bien. Faire les tiens, c’est mieux.',
    target: 'gear',
    reward: { hype: 4 },
    toast: 'Le studio existe. Reste a s’en servir.',
  },
  {
    id: 'first_track',
    goal: 'Produis ton premier morceau',
    hint: 'Chez toi → onglet « studio ». Il faut de l’énergie et de l’inspiration.',
    target: 'home',
    reward: { cash: 100, hype: 2 },
    toast: 'Un morceau a toi. Il ne demande qu’a sortir.',
  },
  {
    id: 'first_press',
    goal: 'Sors-le : direction le pressage',
    hint: 'Commence en numérique, ça ne coûte presque rien et ça vend tous les jours.',
    target: 'press',
    reward: { hype: 8 },
    toast: 'Ta premiere sortie est dans les bacs des autres.',
  },
  {
    id: 'first_promo',
    goal: 'Fais-en parler : lance une campagne à la Radio',
    hint: 'Les flyers au dépanneur suffisent pour commencer.',
    target: 'promo',
    reward: { cash: 200, hype: 5 },
    toast: 'On commence a te reconnaitre dans la file.',
  },
  // -------------------------------------------- acte 5 : le label
  {
    id: 'become_label',
    goal: 'Fais monter ton label jusqu’au palier « Label indé »',
    hint: 'Enchaîne les sets, les sorties et les campagnes. La valeur monte toute seule.',
    target: null,
    reward: { cash: 2000, hype: 10 },
    toast: 'Ton label a un nom, un logo, et des dettes. C’est bon signe.',
  },
  {
    id: 'first_artist',
    goal: 'Signe ton premier artiste au bureau du label',
    hint: 'Commence petit : un voisin qui fait des jams vaut mieux qu’une légende hors de prix.',
    target: 'label',
    reward: { hype: 12 },
    toast: 'Tu n’es plus seul sur le catalogue.',
  },
  // ------------------------------------------- acte 6 : l'empire
  {
    id: 'open_store',
    goal: 'Ouvre ta propre boutique de disques',
    hint: 'Des revenus tous les jours, sans rien faire. Il faut juste la payer.',
    target: 'store',
    reward: { cash: 5000, hype: 8 },
    toast: 'Ta boutique a pignon sur clairiere.',
  },
  {
    id: 'the_major',
    goal: 'Atteins le sommet : ton propre immeuble',
    hint: 'Il faut un empire entier derriere toi pour que les portes s’ouvrent.',
    target: 'major',
  },
  {
    id: 'done',
    goal: 'Le label tourne tout seul. À toi de voir jusqu’où.',
    hint: '',
    target: null,
  },
];

export const QUEST_RECORD = 'rq1';

export class Quest {
  constructor(game) { this.game = game; }
  get s() { return this.game.s.quest || (this.game.s.quest = { step: 0, digs: 0, seen: false }); }
  get step() { return STEPS[Math.min(this.s.step, STEPS.length - 1)]; }
  get done() { return this.step.id === 'done'; }
  is(id) { return this.step.id === id; }
  get index() { return Math.min(this.s.step, STEPS.length - 1); }
  get total() { return STEPS.length - 1; }

  advanceTo(id) {
    const i = STEPS.findIndex(x => x.id === id);
    if (i <= this.s.step) return;
    // on encaisse la récompense de l'étape qu'on vient de finir
    const fini = STEPS[this.s.step];
    if (fini && fini.reward) {
      const g = this.game;
      if (fini.reward.cash) g.earn(fini.reward.cash, 'other');
      if (fini.reward.hype) g.s.hype += fini.reward.hype;
    }
    if (fini && fini.toast) this.game.toast(fini.toast, 'gold');
    this.s.step = i;
    this.game.emit('quest', STEPS[i]);
  }

  // ------------------------------------------------------------ crochets
  onEnter(kind) {
    if (kind === 'records' && this.is('go_shop')) this.advanceTo('dig');
  }
  onDig() {
    this.s.digs++;
    if (this.is('dig') && this.s.digs >= 2) this.advanceTo('find_garnier');
  }
  onBuy(recordId) {
    if (recordId === QUEST_RECORD) this.advanceTo('listen');
  }
  onListen(recordId) {
    if (recordId === QUEST_RECORD && this.is('listen')) {
      this.advanceTo('first_set');
      return true;   // déclenche la scène de découverte
    }
    return false;
  }
  onShow() { if (this.is('first_set')) this.advanceTo('buy_machine'); }
  onWork() { if (this.is('first_job')) this.advanceTo('buy_casque'); }
  onGear(id) {
    if (id === 'gd1' && this.is('buy_casque')) this.advanceTo('buy_platines');
    else if (id === 'gd2' && this.is('buy_platines')) this.advanceTo('go_shop');
    else if (this.is('buy_machine') && ['g02', 'g04', 'g05', 'g06'].includes(id)) this.advanceTo('first_track');
  }
  onProduce() { if (this.is('first_track')) this.advanceTo('first_press'); }
  onPress() { if (this.is('first_press')) this.advanceTo('first_promo'); }
  onCampaign() { if (this.is('first_promo')) this.advanceTo('become_label'); }
  onSign() { if (this.is('first_artist')) this.advanceTo('open_store'); }
  onStore() { if (this.is('open_store')) this.advanceTo('the_major'); }
  onTier(t) {
    if (t >= 3 && this.is('become_label')) this.advanceTo('first_artist');
    if (t >= 6 && this.is('the_major')) this.advanceTo('done');
  }
}
