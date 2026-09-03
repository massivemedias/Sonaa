// =====================================================================
//  QUÊTES — la colonne vertébrale du jeu
//  Du premier disque fouillé jusqu'à la tour du major. Chaque étape dit
//  quoi faire, où aller, et récompense quand elle tombe.
// =====================================================================
export const STEPS = [
  // ---------------------------------------------------- la découverte
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
  // ------------------------------------------------------ devenir DJ
  {
    id: 'first_set',
    goal: 'Joue ton premier set au Sous-Sol',
    hint: 'Choisis quatre disques qui montent en énergie. Le bar prend les débutants.',
    target: 'bar',
    reward: { cash: 150, hype: 3 },
    toast: 'Premier cachet. Le barman retient ton nom.',
  },
  // ------------------------------------------------ devenir producteur
  {
    id: 'first_gear',
    goal: 'Achète ta première machine chez Massive Machines',
    hint: 'Un laptop, une boite a rythmes : n\'importe quoi vaut mieux que rien.',
    target: 'gear',
    reward: { hype: 4 },
    toast: 'Le studio existe enfin. Reste a s\'en servir.',
  },
  {
    id: 'first_track',
    goal: 'Produis ton premier morceau',
    hint: 'Chez toi → onglet « studio ». Il faut de l\'energie et de l\'inspiration.',
    target: 'home',
    reward: { cash: 100, hype: 2 },
    toast: 'Un morceau a toi. Il ne demande qu\'a sortir.',
  },
  {
    id: 'first_press',
    goal: 'Sors-le : direction le pressage',
    hint: 'Commence en numerique, ca ne coute presque rien et ca vend tous les jours.',
    target: 'press',
    reward: { hype: 8 },
    toast: 'Ta premiere sortie est dans les bacs des autres.',
  },
  {
    id: 'first_promo',
    goal: 'Fais-en parler : lance une campagne à la Radio',
    hint: 'Les flyers au depanneur suffisent pour commencer.',
    target: 'promo',
    reward: { cash: 200, hype: 5 },
    toast: 'On commence a te reconnaitre dans la file.',
  },
  // -------------------------------------------------- devenir un label
  {
    id: 'become_label',
    goal: 'Fais monter ton label jusqu\'au palier « Label indé »',
    hint: 'Enchaine les sets, les sorties et les campagnes. La valeur monte toute seule.',
    target: null,
    reward: { cash: 2000, hype: 10 },
    toast: 'Ton label a un nom, un logo, et des dettes. C\'est bon signe.',
  },
  {
    id: 'first_artist',
    goal: 'Signe ton premier artiste au bureau du label',
    hint: 'Commence petit : un voisin qui fait des jams vaut mieux qu\'une legende hors de prix.',
    target: 'label',
    reward: { hype: 12 },
    toast: 'Tu n\'es plus seul sur le catalogue.',
  },
  // ----------------------------------------------------------- empire
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
    goal: 'Atteins le sommet : la tour du major',
    hint: 'Il faut un empire entier derriere toi pour que les portes s\'ouvrent.',
    target: 'major',
  },
  {
    id: 'done',
    goal: 'Le label tourne tout seul. À toi de voir jusqu\'où.',
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
  onShow() { if (this.is('first_set')) this.advanceTo('first_gear'); }
  onGear() { if (this.is('first_gear')) this.advanceTo('first_track'); }
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
