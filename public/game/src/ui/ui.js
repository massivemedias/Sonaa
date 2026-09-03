// =====================================================================
//  INTERFACE — HUD, panneaux, mini-jeu de set
// =====================================================================
import {
  RECORDS, ARTISTS, GEAR, CAMPAIGNS, GIGS, FOOD, DRINKS, TIERS, JOBS,
  recordById, artistById, gearById
} from '../data/content.js';
import { money, big } from '../game/state.js';
import * as A from '../game/actions.js';
import * as COV from '../data/covers.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class UI {
  constructor(game, hooks = {}) {
    this.game = game;
    this.hooks = hooks;
    this.sheet = $('#overlay');
    this.body = $('#sheet-body');
    this.titleEl = $('#sheet-title');
    this.subEl = $('#sheet-sub');
    this.current = null;
    this.temp = {};

    $('#sheet-close').addEventListener('click', () => this.close());
    this.sheet.addEventListener('click', e => { if (e.target === this.sheet) this.close(); });
    this.body.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      this.dispatch(el.dataset.act, el.dataset.arg);
    });

    COV.onAudio(() => { if (this.current) this.render(); });
    game.on('toast', (m, k) => this.toast(m, k));
    game.on('change', () => this.hud());
    game.on('tierup', t => this.tierUp(t));
    game.on('end', () => this.ending());
  }

  // ------------------------------------------------------------- HUD
  hud() {
    const g = this.game, s = g.s;
    $('#hud-cash').textContent = money(s.cash);
    $('#hud-fans').textContent = big(s.fans);
    $('#hud-hype').textContent = Math.round(s.hype);
    $('#hud-clock').textContent = g.clock;
    $('#hud-tier').textContent = TIERS[g.tier].name;
    $('#hud-tier-fill').style.width = (g.tierProgress * 100).toFixed(1) + '%';
    document.querySelectorAll('.need').forEach(el => {
      const v = s.needs[el.dataset.need];
      el.querySelector('i').style.width = v + '%';
      const val = el.querySelector('.nval');
      if (val) val.textContent = Math.round(v) + '%';
      el.classList.toggle('low', v < 25);
      el.classList.toggle('mid', v >= 25 && v < 55);
    });
    // objectif courant
    const q = g.quest, st = q.step;
    const banner = $('#quest');
    if (st && st.id !== 'done') {
      banner.classList.remove('hidden');
      $('#quest-goal').textContent = st.goal;
      $('#quest-hint').textContent = st.hint || '';
      const ct = $('#quest-count');
      if (ct) ct.textContent = Math.min(q.index + 1, q.total) + '/' + q.total;
    } else banner.classList.add('hidden');

    if (this.current) this.render();
  }

  toast(msg, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  tierUp(t) {
    this.toast(`Nouveau palier : ${t.name} — ${t.blurb}`, 'gold');
  }

  // ---------------------------------------------------------- panneaux
  open(kind, building) {
    if (this.game.quest) this.game.quest.onEnter(kind);
    this.current = { kind, building };
    this.temp = {};
    this.sheet.classList.remove('hidden');
    this.render();
  }
  close() {
    if (COV.playing()) { COV.stopPreview(); if (this.hooks.duck) this.hooks.duck(false); }
    this.current = null;
    this.sheet.classList.add('hidden');
  }
  get isOpen() { return !!this.current; }

  needCover(rec) {
    const info = COV.cover(rec);
    if (info || COV.isMissed(rec) || COV.isPending(rec)) return info;
    COV.fetchCover(rec).then(() => { if (this.current) this.render(); });
    return null;
  }

  render() {
    const { kind, building } = this.current;
    const p = PANELS[kind] ? PANELS[kind](this, this.game) : { title: '???', sub: '', html: '' };
    this.titleEl.textContent = p.title || (building && building.name) || '';
    this.subEl.textContent = p.sub || '';
    const y = this.body.scrollTop;
    this.body.innerHTML = p.html;
    this.body.scrollTop = y;
  }

  dispatch(act, arg) {
    const g = this.game;
    const A_ = A;
    switch (act) {
      case 'close': this.close(); break;
      case 'tab': this.temp.tab = arg; this.render(); break;

      case 'buyRec': { const bd = this.current && this.current.building;
        A_.buyRecord(g, A_.digStock(g, bd).find(e => e.id === arg), bd); break; }
      case 'sellRec': A_.sellRecord(g, arg); break;
      case 'eat': A_.consume(g, FOOD.find(f => f.id === arg)); break;
      case 'drink': A_.consume(g, DRINKS.find(d => d.id === arg)); break;
      case 'network': A_.network(g); break;
      case 'oddjob': A_.oddJob(g); break;
      case 'work': { const j = JOBS.find(x => x.id === arg); if (j) A_.workShift(g, j); break; }
      case 'sleep': g.sleep(); this.close(); break;
      case 'listen': {
        const r = A_.listenRecords(g, arg || null);
        if (r && r.revelation) { this.revelation(r.record); return; }
        break;
      }
      case 'dig': A_.digDeeper(g, this.current && this.current.building); break;
      case 'buyCard': { const bd = this.current && this.current.building;
        A_.buyRecord(g, A_.currentCard(g, bd), bd); break; }
      case 'produce': A_.produce(g); break;
      case 'gear': A_.buyGear(g, gearById(arg)); break;
      case 'campaign': A_.launchCampaign(g, CAMPAIGNS.find(c => c.id === arg)); break;
      case 'sign': A_.signArtist(g, artistById(arg)); break;
      case 'boost': A_.boostMorale(g, g.s.roster.find(m => m.artistId === arg)); break;
      case 'drop': A_.dropArtist(g, g.s.roster.find(m => m.artistId === arg)); break;
      case 'store': A_.upgradeStore(g); break;
      case 'price': g.fin.price = parseFloat(arg); this.toast('Prix de vente ajusté.', ''); break;
      case 'mkt': g.fin.marketing = parseFloat(arg); this.toast('Budget marketing mis à jour.', ''); break;
      case 'borrow': g.borrow(parseFloat(arg)); break;
      case 'repay': g.repay(arg === 'all' ? g.fin.debt : g.s.cash * 0.25); break;
      case 'save': g.save(); this.toast('Partie sauvegardée.', 'good'); break;

      case 'pressPick': this.temp.track = arg; this.render(); break;
      case 'press': {
        const t = g.s.tracks.find(x => x.id === this.temp.track);
        const o = A_.PRESS_OPTIONS.find(x => x.id === arg);
        if (t && o) { A_.pressTrack(g, t, o); this.temp.track = null; }
        break;
      }
      case 'gig': this.temp.gig = arg; this.temp.set = []; this.render(); break;
      case 'pickRec': {
        const set = this.temp.set || (this.temp.set = []);
        const i = set.indexOf(arg);
        if (i >= 0) set.splice(i, 1); else if (set.length < 4) set.push(arg);
        this.render(); break;
      }
      case 'playShow': {
        const gig = GIGS.find(x => x.id === this.temp.gig);
        const r = A_.playShow(g, gig, this.temp.set);
        this.temp.result = r; this.temp.gig = null; this.render();
        break;
      }
      case 'endgame': this.ending(); break;
      case 'preview': {
        const r = recordById(arg);
        const info = COV.cover(r);
        if (!info || !info.preview) { this.toast('Pas d’extrait disponible pour celui-là.', 'bad'); break; }
        const started = COV.togglePreview(r, info);
        if (this.hooks.duck) this.hooks.duck(started);
        this.render();
        break;
      }
      case 'youtube': {
        const r = recordById(arg);
        window.open(COV.youtubeLink(r), '_blank', 'noopener');
        break;
      }
      case 'clearResult': this.temp.result = null; this.temp.gig = null; this.temp.set = []; this.render(); break;
      case 'goto': this.hooks.goto && this.hooks.goto(arg); this.close(); break;
      case 'music': this.hooks.music && this.hooks.music(); this.render(); break;
      case 'newgame': if (confirm('Recommencer une partie ? La sauvegarde actuelle sera perdue.')) this.hooks.newGame && this.hooks.newGame(); break;
    }
    g.save();
    this.hud();
  }

  revelation(r) {
    const g = this.game;
    g.s.insp = 100; g.s.skill += 2.5; g.s.hype += 3;
    g.need('social', 8);
    this.current = { kind: 'reveal' };
    this.sheet.classList.remove('hidden');
    this.titleEl.textContent = 'Neuf minutes';
    this.subEl.textContent = `${r.artist} — ${r.title}`;
    this.body.innerHTML = `
      <div class="reveal">
        <div class="big-disc"></div>
        <p class="who">${esc(r.label)} · ${r.year}</p>
        <p>Tu poses le diamant. Un souffle, puis une boîte à rythmes qui ne s’excuse
        de rien. Ça monte pendant deux minutes sans rien donner, et quand la nappe
        arrive enfin tu comprends que ce n’était pas de la musique de fond.</p>
        <p>Tu réécoutes la face B. Puis encore la face A. Il est trois heures.
        Quelque chose vient de s’ouvrir et ça ne se refermera plus.</p>
        <p class="who">Inspiration au maximum · skill +2.5</p>
      </div>
      <button class="btn wide gold" data-act="close">Et maintenant ?</button>`;
    g.toast('Tu viens de découvrir la techno. Va falloir en faire quelque chose.', 'gold');
    g.save();
  }

  ending() {
    const g = this.game, s = g.s;
    this.current = { kind: 'ending' };
    this.sheet.classList.remove('hidden');
    this.titleEl.textContent = 'La tour de verre';
    this.subEl.textContent = 'Fin du voyage';
    this.body.innerHTML = `
      <p class="note">Tu signes le bail du 41e étage. Le hall sent le café à 6 $ et le contrat
      de distribution mondiale. Quelque part sous tes pieds, un gamin dépose une cassette
      dans une boîte aux lettres.</p>
      <div class="stat-grid">
        <div class="stat"><b>${money(s.cash)}</b><span>en banque</span></div>
        <div class="stat"><b>${big(s.fans)}</b><span>fans</span></div>
        <div class="stat"><b>${s.roster.length}</b><span>artistes</span></div>
        <div class="stat"><b>${s.releases.length}</b><span>sorties</span></div>
        <div class="stat"><b>${s.stats.shows}</b><span>shows joués</span></div>
        <div class="stat"><b>${s.collection.length}</b><span>disques</span></div>
        <div class="stat"><b>${s.stats.days}</b><span>jours</span></div>
        <div class="stat"><b>${big(s.stats.sold)}</b><span>disques vendus</span></div>
      </div>
      <button class="btn wide gold" data-act="close">Continuer à régner</button>`;
  }
}

// ---------------------------------------------------------------------
// helpers de rendu
// ---------------------------------------------------------------------
function row(opts) {
  const { title, sub, tag, btn, act, arg, disabled, cls = '' } = opts;
  return `<div class="row ${cls}${disabled ? ' locked' : ''}">
    <div class="grow"><h3>${esc(title)}${tag ? ` <span class="tag">${esc(tag)}</span>` : ''}</h3>
    ${sub ? `<p>${esc(sub)}</p>` : ''}</div>
    ${btn ? `<button class="btn ${opts.btnCls || ''}" data-act="${act}" data-arg="${arg ?? ''}"
      ${disabled ? 'disabled' : ''}>${esc(btn)}</button>` : ''}
  </div>`;
}
const title = t => `<div class="section-title">${esc(t)}</div>`;
const EQ = '<span class="eq"><i></i><i></i><i></i></span>';

// boutons d'écoute sous une pochette
function listenRow(r) {
  const info = COV.cover(r);
  const on = COV.playing() === r.id;
  const canPlay = info && info.preview;
  return `<div class="listen-row">
    <button class="btn ${on ? 'playing' : 'ghost'}" data-act="preview" data-arg="${r.id}"
      ${canPlay ? '' : 'disabled'}>${on ? EQ + 'Arrêter' : '▶ Extrait 30 s'}</button>
    <button class="btn ghost" data-act="youtube" data-arg="${r.id}">YouTube ↗</button>
  </div>`;
}

// ligne de disque avec vignette cliquable pour écouter
function discRow(ui, r, opts) {
  const info = ui.needCover(r);
  const on = COV.playing() === r.id;
  const pixT = info && info.art ? COV.pixelFor(r, info, 32, () => ui.render()) : null;
  const art = info && (pixT || info.thumb)
    ? `style="background-image:url('${pixT || info.thumb}')"` : '';
  return `<div class="row">
    <div class="cov ${info && info.thumb ? '' : 'empty'} ${info && info.preview ? 'play' : ''}"
      ${art} data-act="preview" data-arg="${r.id}"></div>
    <div class="grow">
      <h3>${esc(r.title)}${r.quest ? ' <span class="tag">culte</span>' : ''}</h3>
      <p>${on ? EQ : ''}${esc(r.artist)} · ${esc(r.label)} · ${r.bpm} BPM · ${'●'.repeat(r.energy)}</p>
    </div>
    <button class="btn ${opts.btnCls || ''}" data-act="${opts.act}" data-arg="${opts.arg}"
      ${opts.disabled ? 'disabled' : ''}>${esc(opts.btn)}</button>
  </div>`;
}
function hashHue(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
const note = t => `<p class="note">${t}</p>`;

// ---------------------------------------------------------------------
// PANNEAUX
// ---------------------------------------------------------------------
const DESCR = {
  home:'Dormir, écouter, produire', bar:'Boire, réseauter', snack:'Manger et boire',
  records:'Acheter et revendre des disques', gear:'Machines et studio',
  promo:'Campagnes de promo', studio:'Production sérieuse', press:'Presser tes sorties',
  label:'Signer et gérer tes artistes', club:'Jouer des shows', store:'Ta boutique de disques',
  major:'La fin du jeu',
};

// Les petits boulots, presentes la ou on les trouve. C'est la seule source
// d'argent tant qu'on ne sait pas encore jouer.
function blocTravail(g, place) {
  const liste = A.jobsFor(g, place);
  if (!liste.length) return '';
  let html = title('Travailler');
  html += liste.map(j => row({
    title: j.name,
    sub: j.ok ? `${j.desc} · ${j.hours} h · ${money(j.pay)}` : `Verrouillé : ${j.pourquoi}`,
    tag: j.ok ? null : 'bloqué',
    btn: j.ok ? money(j.pay) : '—', act: 'work', arg: j.id,
    disabled: !j.ok || g.s.needs.energy < 18,
  })).join('');
  if (g.s.needs.energy < 18) html += note('Tu es trop crevé pour prendre un quart. Va dormir.');
  return html;
}

const PANELS = {
  home(ui, g) {
    const s = g.s;
    const tab = ui.temp.tab || 'vie';
    const tabs = ['vie', 'studio', 'stats'];
    let html = `<div class="pill-row">${tabs.map(t =>
      `<button class="pill ${tab === t ? 'on' : ''}" data-act="tab" data-arg="${t}">${t}</button>`).join('')}</div>`;
    if (tab === 'vie') {
      html += note('Ton 3½ sur Marquette. Un matelas, une table, des disques partout.');
      html += row({ title: 'Dormir', sub: 'Récupère l’énergie jusqu’au matin', btn: 'Dormir', act: 'sleep' });
      html += row({ title: 'Écouter au hasard', sub: `Inspiration +  ·  ${s.collection.length} disques`, btn: '1h15', act: 'listen', disabled: !s.collection.length });
      if (s.collection.length) {
        html += title('Ta platine');
        html += s.collection.map(id => {
          const r = recordById(id);
          return discRow(ui, r, {
            btn: 'Poser sur la platine', act: 'listen', arg: id,
            btnCls: r.quest ? 'gold' : 'ghost',
          });
        }).join('');
      }
      html += row({ title: 'Sauvegarder', sub: 'La partie se sauve aussi toute seule', btn: 'Sauver', act: 'save', btnCls: 'ghost' });
    }
    if (tab === 'studio') {
      const q = Math.round(g.productionQuality());
      html += note(`Coin studio : <b>qualité estimée ${q}/100</b>. Inspiration ${Math.round(s.insp)}%.
        Matos : ${s.gear.map(id => esc(gearById(id)?.name || '')).join(', ')}.`);
      html += row({ title: 'Produire un track', sub: '≈4 h · consomme énergie et inspiration', btn: 'Produire', act: 'produce', disabled: s.needs.energy < 12 });
      html += title('Tracks non sortis');
      html += s.tracks.length
        ? s.tracks.map(t => row({ title: t.name, sub: `qualité ${t.quality} · fait le jour ${t.day}`, tag: 'démo' })).join('')
        : note('Aucun track en attente. Va au pressage une fois que tu en as.');
    }
    if (tab === 'stats') {
      html += `<div class="stat-grid">
        <div class="stat"><b>${money(s.cash)}</b><span>liquide</span></div>
        <div class="stat"><b>${big(g.empire)}</b><span>valeur du label</span></div>
        <div class="stat"><b>${big(s.fans)}</b><span>fans</span></div>
        <div class="stat"><b>${Math.round(s.hype)}</b><span>hype</span></div>
        <div class="stat"><b>${s.skill.toFixed(1)}</b><span>skill</span></div>
        <div class="stat"><b>${s.collection.length}</b><span>disques</span></div>
        <div class="stat"><b>${s.roster.length}</b><span>artistes</span></div>
        <div class="stat"><b>${s.stats.shows}</b><span>shows</span></div>
      </div>`;
      const next = TIERS[Math.min(TIERS.length - 1, g.tier + 1)];
      html += note(`Palier actuel : <b>${esc(TIERS[g.tier].name)}</b>. Prochain : <b>${esc(next.name)}</b>
        (${big(next.need)} de valeur).`);
      html += `<div class="meter"><i style="width:${(g.tierProgress * 100).toFixed(1)}%"></i></div>`;
    }
    return { title: 'Chez toi', sub: g.clock, html };
  },

  snack(ui, g) {
    let html = note('Le comptoir sent la friture et le café brûlé. Parfait.');
    html += FOOD.map(f => row({
      title: f.name, sub: `${f.desc} · +${f.food} faim`, btn: money(f.price), act: 'eat', arg: f.id,
      disabled: g.s.cash < f.price,
    })).join('');
    html += blocTravail(g, 'snack');
    return { title: 'Casse-croûte', sub: 'Manger, boire, travailler', html };
  },

  bar(ui, g) {
    let html = note('Sous-sol, néons roses, table de mix dans le coin. C’est ici que ça se décide.');
    html += DRINKS.map(d => row({
      title: d.name, sub: `+${d.social} social`, btn: money(d.price), act: 'drink', arg: d.id,
      disabled: g.s.cash < d.price,
    })).join('');
    html += title('Réseauter');
    html += row({
      title: 'Faire le tour de la place', sub: '1 h 30 · 25 $ · rencontres au hasard',
      btn: 'Y aller', act: 'network', btnCls: 'pink', disabled: g.s.cash < 25,
    });
    html += blocTravail(g, 'bar');
    html += title('Dépanner');
    html += row({
      title: 'Laver les verres', sub: '3 h · paie tout de suite, tue l’énergie',
      btn: '≈50 $', act: 'oddjob', btnCls: 'ghost', disabled: g.s.needs.energy < 16,
    });
    return { title: 'Le Sous-Sol', sub: `Social ${Math.round(g.s.needs.social)}%`, html };
  },

  records(ui, g) {
    const tab = ui.temp.tab || 'bac';
    let html = `<div class="pill-row">
      <button class="pill ${tab === 'bac' ? 'on' : ''}" data-act="tab" data-arg="bac">le bac</button>
      <button class="pill ${tab === 'coll' ? 'on' : ''}" data-act="tab" data-arg="coll">ma collection (${g.s.collection.length})</button>
    </div>`;
    if (tab === 'bac') {
      const c = A.crateOf(g, ui.current && ui.current.building);
      const card = A.currentCard(g, ui.current && ui.current.building);
      if (!card) {
        html += note('Tu as fouillé tout le bac. Le disquaire te fait un clin d’œil : « Reviens demain, j’ai des arrivages. »');
      } else {
        const r = recordById(card.id);
        const info = ui.needCover(r);
        const hue = hashHue(r.id);
        const c1 = `hsl(${hue} 62% 46%)`, c2 = `hsl(${(hue + 42) % 360} 58% 26%)`;
        const pix = info && info.art ? COV.pixelFor(r, info, 56, () => this.render()) : null;
        const bg = info && info.art
          ? `background-image:url("${pix || info.art}")`
          : `background:linear-gradient(150deg,${c1},${c2})`;
        html += `<div class="crate">
          <div class="crate-count">disque ${c.i + 1} / ${c.deck.length} du bac</div>
          <div class="sleeve-wrap">
            <div class="sleeve ${card.quest ? 'quest' : ''} ${info && info.art ? 'has-art' : ''}" style="${bg}">
              <div class="disc"></div>
              ${info && info.art ? '' : '<div class="art-mark"></div>'}
              <div class="art">
                <div class="lbl">${esc(r.label)} · ${r.year}</div>
                <div>
                  <div class="ttl">${esc(r.title)}</div>
                  <div class="lbl" style="margin-top:4px">${esc(r.artist)}</div>
                </div>
              </div>
              ${!info && COV.isPending(r) ? '<div class="loading">pochette…</div>' : ''}
            </div>
          </div>
          <div class="crate-meta">
            <span class="pill">${esc(r.genre)}</span>
            <span class="pill">${r.bpm} BPM</span>
            <span class="pill">énergie <b class="energy-dots">${'●'.repeat(r.energy)}</b></span>
            <span class="pill">${'★'.repeat(r.rarity)}</span>
            ${card.deal ? '<span class="pill on">trouvaille</span>' : ''}
          </div>
          ${listenRow(r)}
          ${r.note ? note('<i>' + esc(r.note) + '</i>') : ''}
          <div class="crate-actions">
            <button class="btn ghost" data-act="dig">Suivant →</button>
            <button class="btn" data-act="buyCard" ${g.s.cash < card.price ? 'disabled' : ''}>Acheter ${money(card.price)}</button>
          </div>
        </div>`;
        if (card.quest && g.quest.is('find_garnier'))
          html += note('Tes doigts s’arrêtent. La pochette est usée, le logo <b>F Communications</b> imprimé au dos. Tu ne sais pas encore pourquoi, mais c’est celui-là.');
      }
    } else {
      html += g.s.collection.length ? g.s.collection.map(id => {
        const r = recordById(id);
        return discRow(ui, r, {
          btn: 'Revendre', act: 'sellRec', arg: id, btnCls: 'ghost', disabled: !!r.quest,
        });
      }).join('') : note('Rien encore. Fouille le bac.');
    }
    const b = ui.current && ui.current.building;
    html += blocTravail(g, 'records');
    return {
      title: (b && b.name) || 'Disquaire',
      sub: b && b.genre ? `Bac ${b.genre}` : 'Fouille de bacs',
      html,
    };
  },

  gear(ui, g) {
    let html = note('Vitrines pleines de machines. Chaque achat améliore la qualité de tes prods.');
    html += GEAR.filter(x => x.price > 0).map(x => {
      const owned = g.s.gear.includes(x.id);
      const locked = g.tier < x.tier;
      return row({
        title: x.name, sub: `${x.desc} · qualité +${x.quality}`,
        tag: owned ? 'possédé' : locked ? `palier ${x.tier}` : null,
        btn: owned ? '✓' : money(x.price), act: 'gear', arg: x.id,
        disabled: owned || locked || g.s.cash < x.price,
      });
    }).join('');
    return { title: 'Massive Machines', sub: `Qualité studio : ${Math.round(g.productionQuality())}/100`, html };
  },

  promo(ui, g) {
    let html = note('Studio radio, murs en mousse, un vieux micro. On fabrique la hype ici.');
    if (g.s.campaigns.length) {
      html += title('En cours');
      html += g.s.campaigns.map(c => {
        const d = CAMPAIGNS.find(x => x.id === c.id);
        return row({ title: d.name, sub: `${c.left} jour(s) restant(s)`, tag: 'actif' });
      }).join('');
    }
    html += title('Campagnes');
    html += CAMPAIGNS.map(c => row({
      title: c.name, sub: `${c.desc} · +${c.hype} hype · +${big(c.fans)} fans sur ${c.days} j`,
      tag: g.tier < c.tier ? `palier ${c.tier}` : null,
      btn: money(c.price), act: 'campaign', arg: c.id,
      disabled: g.tier < c.tier || g.s.cash < c.price || g.s.campaigns.length >= 2,
    })).join('');
    return { title: 'Radio Machine', sub: `Hype ${Math.round(g.s.hype)}`, html };
  },

  studio(ui, g) {
    const q = Math.round(g.productionQuality());
    let html = note(`Vrai studio, vraie acoustique. Qualité estimée <b>${q}/100</b>,
      inspiration ${Math.round(g.s.insp)}%.`);
    html += row({ title: 'Session de production', sub: '≈4 h · énergie et inspiration', btn: 'Produire', act: 'produce', disabled: g.s.needs.energy < 12 });
    html += row({ title: 'Écouter des références', sub: 'Inspiration +', btn: '1h15', act: 'listen', btnCls: 'ghost', disabled: !g.s.collection.length });
    html += title('Tracks en attente');
    html += g.s.tracks.length ? g.s.tracks.map(t => row({
      title: t.name, sub: `qualité ${t.quality}`, tag: 'démo',
    })).join('') : note('Rien en boîte.');
    return { title: 'Studio Sonaa', sub: 'Production', html };
  },

  press(ui, g) {
    let html;
    const t = g.s.tracks.find(x => x.id === ui.temp.track);
    if (!t) {
      html = note('Usine de pressage et distributeur. Choisis un track à sortir.');
      html += g.s.tracks.length ? g.s.tracks.map(x => row({
        title: x.name, sub: `qualité ${x.quality} · fait le jour ${x.day}`,
        btn: 'Sortir', act: 'pressPick', arg: x.id,
      })).join('') : note('Aucun track prêt. Direction le studio.');
    } else {
      html = note(`<b>${esc(t.name)}</b> — qualité ${t.quality}. Choisis le tirage :`);
      html += A.PRESS_OPTIONS.map(o => row({
        title: o.name, sub: `${o.desc}${o.copies ? ` · prix de vente ${o.price} $` : ''}`,
        btn: money(o.cost), act: 'press', arg: o.id, disabled: g.s.cash < o.cost,
      })).join('');
      html += `<button class="btn wide ghost" data-act="pressPick" data-arg="">Retour</button>`;
    }
    html += title('Catalogue');
    html += g.s.releases.length ? g.s.releases.slice(-6).reverse().map(r => {
      const a = r.artistId ? artistById(r.artistId) : null;
      return row({
        title: `${a ? a.name + ' — ' : ''}${r.title}`,
        sub: `qualité ${r.quality} · vendus ${big(r.sold)}${r.digital ? ' · numérique' : ` · stock ${big(r.stock)}`}`,
      });
    }).join('') : note('Catalogue vide.');
    return { title: 'Pressage & Distro', sub: `${g.s.releases.length} sorties`, html };
  },

  label(ui, g) {
    const tab = ui.temp.tab || 'roster';
    let html = `<div class="pill-row">
      <button class="pill ${tab === 'roster' ? 'on' : ''}" data-act="tab" data-arg="roster">roster (${g.s.roster.length})</button>
      <button class="pill ${tab === 'signer' ? 'on' : ''}" data-act="tab" data-arg="signer">signer</button>
      <button class="pill ${tab === 'cat' ? 'on' : ''}" data-act="tab" data-arg="cat">catalogue</button>
    </div>`;
    if (tab === 'roster') {
      html += g.s.roster.length ? g.s.roster.map(m => {
        const a = artistById(m.artistId);
        return `<div class="row"><div class="grow">
          <h3>${esc(a.name)} <span class="tag">${esc(a.genre)}</span></h3>
          <p>moral ${Math.round(m.morale)}% · prochaine sortie J${m.nextReleaseDay}</p>
          <div class="meter"><i style="width:${m.morale}%"></i></div></div>
          <button class="btn" data-act="boost" data-arg="${a.id}">Booster</button>
          <button class="btn ghost" data-act="drop" data-arg="${a.id}">✕</button></div>`;
      }).join('') : note('Aucun artiste signé. Va en chercher dans l’onglet « signer ».');
    }
    if (tab === 'signer') {
      html += note('Plus ton label est gros, plus les gros noms répondent au téléphone.');
      html += ARTISTS.filter(a => !g.s.roster.some(m => m.artistId === a.id)).map(a => row({
        title: a.name, sub: `${a.bio} · qualité ${a.quality} · ${big(a.reach)} d’audience`,
        tag: g.tier < a.tier ? `palier ${a.tier}` : a.genre,
        btn: money(a.advance), act: 'sign', arg: a.id,
        disabled: g.tier < a.tier || g.s.cash < a.advance,
      })).join('');
    }
    if (tab === 'cat') {
      html += g.s.releases.length ? g.s.releases.slice().reverse().map(r => {
        const a = r.artistId ? artistById(r.artistId) : null;
        return row({
          title: `${a ? a.name + ' — ' : ''}${r.title}`,
          sub: `J${r.day} · qualité ${r.quality} · ${big(r.sold)} vendus`,
        });
      }).join('') : note('Catalogue vide.');
    }
    return { title: 'Sonaa Records', sub: TIERS[g.tier].name, html };
  },

  club(ui, g) {
    // 1) résultat du dernier set
    let html = '';
    if (ui.temp.result) {
      const r = ui.temp.result;
      html += `<div class="stat-grid">
        <div class="stat"><b>${Math.round(r.pct * 100)}%</b><span>réaction</span></div>
        <div class="stat"><b>${money(r.fee)}</b><span>cachet</span></div>
        <div class="stat"><b>+${big(r.fans)}</b><span>fans</span></div>
        <div class="stat"><b>${g.s.stats.shows}</b><span>shows</span></div></div>`;
      html += note(esc(r.verdict));
      html += `<button class="btn wide ghost" data-act="clearResult">Autre set</button>`;
      return { title: 'Le Bunker', sub: 'Après le set', html };
    }
    // 2) choix de la salle
    const gig = GIGS.find(x => x.id === ui.temp.gig);
    if (!gig) {
      html += note('Choisis une date. Les grosses salles demandent de la hype.');
      html += A.gigList(g).map(x => row({
        title: x.name, sub: `${big(x.cap)} personnes · cachet jusqu’à ${money(x.fee)}`,
        tag: x.ok ? null : `hype ${x.minHype}`,
        btn: 'Jouer', act: 'gig', arg: x.id, disabled: !x.ok || g.s.needs.energy < 15,
      })).join('');
      if (g.s.needs.energy < 15) html += note('Tu es trop crevé pour jouer. Va dormir.');
      return { title: 'Le Bunker', sub: `Hype ${Math.round(g.s.hype)}`, html };
    }
    // 3) construction du set
    const want = A.crowdWants(gig);
    const set = ui.temp.set || [];
    html += note(`<b>${esc(gig.name)}</b> — la salle veut une montée :
      ${want.map(w => '▮'.repeat(w)).join(' → ')}.<br>Choisis 4 disques dans l’ordre.`);
    html += `<div class="pill-row">${[0, 1, 2, 3].map(i => {
      const id = set[i];
      const r = id ? recordById(id) : null;
      return `<span class="pill ${r ? 'on' : ''}">${i + 1}. ${r ? esc(r.title) : '—'}</span>`;
    }).join('')}</div>`;
    html += g.s.collection.length ? g.s.collection.map(id => {
      const r = recordById(id);
      const i = set.indexOf(id);
      return row({
        title: `${r.artist} — ${r.title}`,
        sub: `${r.bpm} BPM · énergie ${'▮'.repeat(r.energy)}`,
        tag: i >= 0 ? `#${i + 1}` : null,
        btn: i >= 0 ? 'Retirer' : 'Ajouter', act: 'pickRec', arg: id,
        btnCls: i >= 0 ? 'ghost' : '',
      });
    }).join('') : note('Pas un seul disque. Passe voir une cabane de disquaire.');
    html += `<button class="btn wide pink" data-act="playShow" ${set.length < 1 ? 'disabled' : ''}>
      Jouer le set (5 h)${set.length < 4 ? ' — ' + set.length + '/4' : ''}</button>`;
    html += `<button class="btn wide ghost" data-act="gig" data-arg="">Changer de salle</button>`;
    return { title: 'Le Bunker', sub: gig.name, html };
  },

  store(ui, g) {
    const lvl = g.s.storeLevel;
    const cost = [45000, 120000, 400000][lvl];
    let html = note(`Ta boutique de disques. Revenus passifs chaque jour, et une vitrine
      pour tes sorties. Niveau actuel : <b>${lvl}</b>.`);
    html += row({
      title: lvl === 0 ? 'Ouvrir la boutique' : `Agrandir (niveau ${lvl + 1})`,
      sub: cost ? `Revenus quotidiens en hausse` : 'Boutique au maximum',
      btn: cost ? money(cost) : '✓', act: 'store', disabled: !cost || g.s.cash < cost,
    });
    return { title: 'Sonaa Shop', sub: 'Boutique', html };
  },

  major(ui, g) {
    return {
      title: 'Tour Major', sub: 'Le sommet',
      html: note('Les portes s’ouvrent. Le hall fait trois étages de haut.') +
        `<button class="btn wide gold" data-act="endgame">Entrer</button>`,
    };
  },

  finance(ui, g) {
    const s = g.s, f = g.fin;
    const hist = (s.history || []).slice(-14);
    const last = hist[hist.length - 1];
    const max = Math.max(1, ...hist.map(h => Math.max(h.income, h.expense)));
    const avg7 = hist.slice(-7);
    const netAvg = avg7.length ? avg7.reduce((a, h) => a + h.income - h.expense, 0) / avg7.length : 0;
    const runway = netAvg >= 0 ? '∞' : Math.max(0, Math.floor(s.cash / -netAvg)) + ' j';

    let html = `<div class="stat-grid">
      <div class="stat"><b>${money(s.cash)}</b><span>trésorerie</span></div>
      <div class="stat"><b>${money(f.debt)}</b><span>dette</span></div>
      <div class="stat"><b>${netAvg >= 0 ? '+' : ''}${money(netAvg)}</b><span>résultat / jour</span></div>
      <div class="stat"><b>${runway}</b><span>autonomie</span></div>
    </div>`;

    if (hist.length) {
      html += `<div class="fin-chart">${hist.map(h => `
        <div class="fin-day" title="J${h.day}">
          <i class="inc" style="height:${(h.income / max * 100).toFixed(0)}%"></i>
          <i class="exp" style="height:${(h.expense / max * 100).toFixed(0)}%"></i>
        </div>`).join('')}</div>
      <div class="fin-legend"><span><b style="background:#4fbf9f"></b>recettes</span>
        <span><b style="background:#ff3ea5"></b>dépenses</span>
        <span>14 derniers jours</span></div>`;
    } else {
      html += note('Aucun exercice clos. Reviens après une nuit de sommeil.');
    }

    if (last) {
      const L = last.L;
      const line = (lbl, v, cls) => v > 0.5 ? `<tr><td class="${cls}">${lbl}</td><td class="${cls}">${money(v)}</td></tr>` : '';
      html += title(`Compte de résultat — jour ${last.day}`);
      html += `<table class="pnl">
        ${line('Ventes physiques', L.sales, 'in')}
        ${line('Numérique', L.digital, 'in')}
        ${line('Boutique', L.store, 'in')}
        ${line('Cachets de shows', L.gigs, 'in')}
        ${line('Divers', L.other, 'in')}
        ${line('Loyer et charges', L.rent, 'out')}
        ${line('Marketing', L.marketing, 'out')}
        ${line('Intérêts', L.interest, 'out')}
        ${line('Pressage', L.pressing, 'out')}
        ${line('Matériel', L.gear, 'out')}
        ${line('Avances artistes', L.signing, 'out')}
        ${line('Promo', L.promo, 'out')}
        ${line('Disques achetés', L.digs, 'out')}
        ${line('Vie quotidienne', L.living, 'out')}
        <tr class="tot"><td>Résultat</td><td class="${last.income - last.expense >= 0 ? 'in' : 'out'}">
          ${last.income - last.expense >= 0 ? '+' : ''}${money(last.income - last.expense)}</td></tr>
      </table>`;
    }

    html += title('Politique de prix');
    html += note(`Baisser le prix vend plus d'exemplaires et gagne des fans ; le monter
      améliore la marge mais freine les ventes. Actuel : <b>${(f.price * 100).toFixed(0)} %</b>
      du prix conseillé, demande <b>${(g.demandFactor * 100).toFixed(0)} %</b>.`);
    html += `<div class="pill-row">${[0.7, 0.85, 1, 1.15, 1.35].map(v =>
      `<button class="pill ${Math.abs(f.price - v) < .01 ? 'on' : ''}" data-act="price" data-arg="${v}">${(v * 100) | 0} %</button>`).join('')}</div>`;

    html += title('Budget marketing quotidien');
    html += note('Un filet de hype et de fans tous les jours, tant que la caisse suit.');
    html += `<div class="pill-row">${[0, 50, 250, 1200, 6000].map(v =>
      `<button class="pill ${f.marketing === v ? 'on' : ''}" data-act="mkt" data-arg="${v}"
        ${g.tier < (v > 1000 ? 3 : v > 200 ? 1 : 0) ? 'disabled' : ''}>${v ? money(v) : 'aucun'}</button>`).join('')}</div>`;

    html += title('Financement');
    if (f.debt > 0) {
      html += note(`Dette : <b>${money(f.debt)}</b> · intérêts 0,5 % par jour (${money(f.debt * 0.005)} / jour).`);
      html += row({ title: 'Rembourser 25 % de la caisse', sub: money(s.cash * 0.25), btn: 'Payer', act: 'repay', arg: 'part', disabled: s.cash < 50 });
      html += row({ title: 'Solder la dette', sub: money(f.debt), btn: 'Solder', act: 'repay', arg: 'all', disabled: s.cash < f.debt });
    }
    for (const n of [2000, 10000, 50000]) {
      const need = n > 20000 ? 3 : n > 5000 ? 1 : 0;
      html += row({
        title: `Emprunter ${money(n)}`, sub: `5 % de frais · ${money(n * 1.05 * 0.005)} d'intérêts par jour`,
        tag: g.tier < need ? `palier ${need}` : null,
        btn: 'Signer', act: 'borrow', arg: n, btnCls: 'gold',
        disabled: g.tier < need || f.debt > n * 2,
      });
    }
    return { title: 'Finances', sub: TIERS[g.tier].name, html };
  },

  etat(ui, g) {
    const n = g.s.needs;
    const ligne = (ico, nom, v, role, quand) => `<div class="row"><div class="grow">
      <h3>${ico} ${nom} — ${Math.round(v)} %</h3>
      <p>${role}</p>
      <div class="meter"><i style="width:${Math.round(v)}%"></i></div>
      <p style="margin-top:6px">${quand}</p></div></div>`;

    let html = note('Ces quatre jauges baissent avec le temps qui passe. Elles ne te tuent pas, mais elles rabotent tout ce que tu fais.');
    html += ligne('⚡', 'Énergie', n.energy,
      'La plus importante. Sans elle, plus de quart de travail, plus de set, plus de session studio.',
      'Se recharge en dormant chez toi. Un café en dépanne.');
    html += ligne('🍜', 'Faim', n.food,
      'En dessous de 30 %, la qualité de tes productions et la réaction du public chutent.',
      'Se remplit au casse-croûte.');
    html += ligne('🥤', 'Soif', n.drink,
      'Même effet que la faim, et elle descend plus vite. Jouer un set assèche.',
      'Une bouteille d’eau coûte 2 $.');
    html += ligne('🫂', 'Social', n.social,
      'Le moral. Bas, il pénalise tes prods ; entretenu, il t’ouvre des rencontres au bar.',
      'Se remonte en buvant un verre et en réseautant au Sous-Sol.');

    html += title('Les trois compteurs du haut');
    html += row({ title: '💰 Argent', sub: 'Tout part de là : matériel, disques, pressage, avances aux artistes.' });
    html += row({ title: '🫀 Fans', sub: 'Ils achètent tes sorties tous les jours. Gagnés en jouant et en faisant de la promo.' });
    html += row({ title: '🔥 Hype', sub: 'Ta cote du moment. Elle ouvre les grosses salles et fait vendre. Elle retombe de 7 % par jour si tu ne fais rien.' });
    return { title: 'Ton état', sub: 'À quoi servent les jauges', html };
  },

  menu(ui, g) {
    let html = note('Sonaa — un simulateur de label électronique. Tout se sauvegarde tout seul.');
    html += row({ title: 'Musique de fond', sub: 'Boucle techno générée en direct — coupée par défaut, seuls les disques jouent',
      btn: ui.hooks.musicOn && ui.hooks.musicOn() ? 'Couper' : 'Jouer', act: 'music' });
    html += row({ title: 'Sauvegarder', sub: 'Forcer une sauvegarde', btn: 'Sauver', act: 'save', btnCls: 'ghost' });
    html += row({ title: 'Nouvelle partie', sub: 'Efface la progression', btn: 'Recommencer', act: 'newgame', btnCls: 'pink' });
    html += title('Comment on gagne');
    html += note(`Achète des disques → joue des sets → gagne de la hype et des fans →
      produis tes tracks → presse-les → lance des campagnes → signe des artistes →
      ouvre ta boutique → rachète le monde. Sept paliers, du 3½ à la tour du major.`);
    return { title: 'Menu', sub: TIERS[g.tier].name, html };
  },

  map(ui, g) {
    const list = ui.hooks.buildings ? ui.hooks.buildings() : [];
    let html = note('Tape un lieu pour t’y rendre automatiquement.');
    html += list.map(b => row({
      title: b.name, sub: DESCR[b.kind] || '',
      tag: g.unlocked(b) ? null : `palier ${b.tier}`,
      btn: 'Y aller', act: 'goto', arg: b.id, btnCls: 'ghost',
    })).join('');
    return { title: 'La ville', sub: 'Déplacement rapide', html };
  },

  locked(ui, g) {
    const b = ui.current.building;
    return {
      title: b.name, sub: 'Fermé',
      html: note(`Chantier en cours. Il te faut le palier <b>${esc(TIERS[b.tier].name)}</b>
        (${big(TIERS[b.tier].need)} de valeur de label) pour ouvrir ça.`),
    };
  },
};
