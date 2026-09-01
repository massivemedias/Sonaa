// =====================================================================
//  QUÊTES — pour l'instant : le premier disque, la découverte
// =====================================================================
export const STEPS = [
  {
    id: 'go_shop',
    goal: 'Va au Vinyl Cave chercher ton premier disque',
    hint: 'Le disquaire est au nord-est de la place.',
    target: 'records',
  },
  {
    id: 'dig',
    goal: 'Fouille les bacs — écoute, compare, choisis',
    hint: 'Chaque disque fouillé prend quelques minutes. Prends ton temps.',
    target: 'records',
  },
  {
    id: 'find_garnier',
    goal: 'Trouve « I Was in Ecstasy » de Laurent Garnier (F Communications)',
    hint: 'Il est quelque part dans le bac. Continue de fouiller.',
    target: 'records',
  },
  {
    id: 'listen',
    goal: 'Rentre chez toi et pose-le sur la platine',
    hint: 'Chez toi → onglet « vie » → Écouter des disques.',
    target: 'home',
  },
  {
    id: 'done',
    goal: 'Fais-toi un nom : joue, produis, monte ton label',
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

  advanceTo(id) {
    const i = STEPS.findIndex(x => x.id === id);
    if (i > this.s.step) {
      this.s.step = i;
      this.game.emit('quest', STEPS[i]);
    }
  }
  // appelé quand le joueur entre quelque part
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
      this.advanceTo('done');
      return true;   // déclenche la scène de découverte
    }
    return false;
  }
}
