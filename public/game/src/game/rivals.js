// =====================================================================
//  LA SCÈNE — les rivaux
//  ---------------------------------------------------------------
//  L'ennemi d'une carriere musicale n'attaque pas : il prend la place.
//  Ces six-la vivent leur vie sans le joueur. Ils montent tout seuls,
//  raflent les disques rares avant lui, signent les artistes qu'il
//  hesitait a signer, et tiennent les residences des clubs.
//  Noms fictifs a dessein : eux doivent pouvoir perdre.
// =====================================================================

export const RIVALS = [
  { id:'v_sylex',  name:'DJ Sylex',      genre:'Techno',     hype:16, mordant:0.75, trait:'bacs',
    bio:'Arrive au disquaire avant l’ouverture. Toujours.' },
  { id:'v_vanta',  name:'Vanta',         genre:'Deep House', hype:26, mordant:0.5,  trait:'clubs',
    bio:'Résidente quelque part depuis si longtemps qu’on a oublié qui l’a bookée.' },
  { id:'v_kzero',  name:'Kilomètre Zéro',genre:'Electro',    hype:11, mordant:0.95, trait:'signe',
    bio:'Signe tout ce qui bouge et trie après. Ça marche plus souvent qu’on croit.' },
  { id:'v_ondes',  name:'Madame Ondes',  genre:'Ambient',    hype:33, mordant:0.35, trait:'presse',
    bio:'La presse l’adore, le dancefloor beaucoup moins.' },
  { id:'v_kiosq',  name:'Brutal Kiosque',genre:'Acid',       hype:7,  mordant:1.0,  trait:'clubs',
    bio:'Joue plus fort que tout le monde. Ce n’est pas une métaphore.' },
  { id:'v_aphel',  name:'Aphélie',       genre:'IDM',        hype:44, mordant:0.55, trait:'signe',
    bio:'Le label le plus respecté de la ville. Elle le sait.' },
];

export const rivalById = id => RIVALS.find(r => r.id === id);

// ---------------------------------------------------------------------
export class Scene {
  constructor(game) { this.game = game; }

  get s() {
    const st = this.game.s;
    if (!st.scene) {
      st.scene = {
        hype: {},            // hype courante de chaque rival
        rafles: [],          // disques rafles avant nous
        signes: {},          // artiste -> rival qui l'a signe
        residences: {},      // salle -> rival qui la tient
        journal: [],         // ce qu'ils ont fait recemment
      };
      for (const r of RIVALS) st.scene.hype[r.id] = r.hype;
      // au depart, les deux plus etablis tiennent les petites salles
      st.scene.residences['v02'] = 'v_vanta';
      st.scene.residences['v03'] = 'v_kiosq';
    }
    return st.scene;
  }

  hypeDe(id) { return this.s.hype[id] ?? 0; }

  // classement de la scene, joueur inclus
  classement() {
    const liste = RIVALS.map(r => ({
      id: r.id, nom: r.name, genre: r.genre, hype: this.hypeDe(r.id), moi: false,
    }));
    liste.push({ id: 'moi', nom: 'Toi', genre: '—', hype: this.game.s.hype, moi: true });
    liste.sort((a, b) => b.hype - a.hype);
    return liste;
  }
  get maPlace() { return this.classement().findIndex(x => x.moi) + 1; }

  note(txt) {
    this.s.journal.unshift({ jour: this.game.s.day, txt });
    if (this.s.journal.length > 18) this.s.journal.pop();
  }

  // ------------------------------------------------------- chaque matin
  // Les rivaux montent d'autant plus vite que le joueur les depasse : la
  // scene ne le laisse jamais tranquille, mais ne l'ecrase pas non plus.
  jour(ctx) {
    const s = this.s, moi = this.game.s.hype;
    for (const r of RIVALS) {
      const ecart = moi - this.hypeDe(r.id);
      const rattrapage = ecart > 0 ? 1 + ecart * 0.03 : 0.45;
      s.hype[r.id] = Math.max(1, this.hypeDe(r.id) + r.mordant * rattrapage * (0.6 + Math.random() * 0.8) - 0.4);
    }
    this.rafleDisque(ctx);
    this.rafleArtiste(ctx);
    this.disputeResidence(ctx);
  }

  // un rafleur de bacs prend le disque le plus rare encore en vente
  rafleDisque(ctx) {
    const rafleurs = RIVALS.filter(r => r.trait === 'bacs');
    for (const r of rafleurs) {
      if (Math.random() > r.mordant * 0.4) continue;
      const dispo = (ctx.stockDuJour || []).filter(e => !this.s.rafles.includes(e.id));
      if (!dispo.length) continue;
      const cible = dispo.slice().sort((a, b) => (b.rarete || 0) - (a.rarete || 0))[0];
      if (!cible || (cible.rarete || 0) < 3) continue;   // ils ne prennent que le bon
      this.s.rafles.push(cible.id);
      this.note(`${r.name} a raflé ${cible.titre} avant toi.`);
      this.game.toast(`${r.name} est passé avant toi : ${cible.titre} est parti.`, 'bad');
    }
  }

  // un signeur prend un artiste que le joueur laissait tramer
  rafleArtiste(ctx) {
    const signeurs = RIVALS.filter(r => r.trait === 'signe');
    for (const r of signeurs) {
      if (Math.random() > r.mordant * 0.16) continue;
      const libres = (ctx.artistesLibres || []).filter(a => !this.s.signes[a.id]);
      // ils visent ce qui est a la portee du joueur : c'est ca qui fait mal
      const cible = libres.filter(a => a.tier <= this.game.tier + 1)
        .sort((a, b) => b.quality - a.quality)[0];
      if (!cible) continue;
      this.s.signes[cible.id] = r.id;
      this.note(`${r.name} a signé ${cible.name}.`);
      this.game.toast(`${r.name} a signé ${cible.name}. Tu as trop attendu.`, 'bad');
    }
  }

  // les residences changent de main quand un rival depasse celui en place
  disputeResidence(ctx) {
    for (const [salle, tenant] of Object.entries(this.s.residences)) {
      const concurrents = RIVALS.filter(r => r.trait === 'clubs' && r.id !== tenant);
      for (const c of concurrents) {
        if (this.hypeDe(c.id) > this.hypeDe(tenant) * 1.25 && Math.random() < 0.2) {
          this.s.residences[salle] = c.id;
          this.note(`${c.name} prend la résidence tenue par ${rivalById(tenant).name}.`);
        }
      }
    }
  }

  // ------------------------------------------------- au moment de jouer
  // Une salle tenue par un rival paie moins : il garde la meilleure part.
  // La reprendre demande de le depasser en hype.
  residentDe(salleId) {
    const id = this.s.residences[salleId];
    return id ? rivalById(id) : null;
  }
  malusDeSalle(salleId) {
    const r = this.residentDe(salleId);
    if (!r) return 1;
    return this.game.s.hype >= this.hypeDe(r.id) ? 1 : 0.6;
  }
  // apres un bon set, on peut lui prendre la place
  tenteReprise(salleId, score) {
    const r = this.residentDe(salleId);
    if (!r) return null;
    if (score > 0.7 && this.game.s.hype >= this.hypeDe(r.id) * 0.9) {
      delete this.s.residences[salleId];
      this.note(`Tu prends la résidence de ${r.name}.`);
      return r;
    }
    return null;
  }

  artisteEstPris(id) { return !!this.s.signes[id]; }
  disqueEstRafle(id) { return this.s.rafles.includes(id); }
}
