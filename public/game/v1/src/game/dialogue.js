// =====================================================================
//  LES CONVERSATIONS
//  ---------------------------------------------------------------
//  On croise quelqu'un, on appuie sur espace, on lui parle. Ce qu'il dit
//  depend de qui il est, de ou en est le joueur, et de son classement
//  dans la scene. Les rivaux ont un ton qui change selon qu'ils sont
//  devant ou derriere.
//  Les vrais DJ ne parlent pas ici : on ne leur fait pas dire ce qu'ils
//  n'ont jamais dit. Ils sont cites dans les rumeurs, c'est tout.
// =====================================================================
import { RIVALS } from './rivals.js';
import { RECORDS } from '../data/content.js';

const pick = a => a[Math.random() * a.length | 0];

// ---------------------------------------------------------- les habitants
export const HABITANTS = [
  { id:'h_disquaire', nom:'Le disquaire',        role:'Tient le bac depuis vingt ans' },
  { id:'h_habitue',   nom:'Un habitué du bar',   role:'Connaît toutes les rumeurs' },
  { id:'h_voisine',   nom:'La voisine du dessus',role:'Entend tout ce que tu fais' },
  { id:'h_livreur',   nom:'Un livreur',          role:'Fait les mêmes tournées que toi' },
  { id:'h_gamin',     nom:'Un gamin au casque',  role:'Te regarde comme si tu savais tout' },
  { id:'h_patron',    nom:'Le patron du Sous-Sol', role:'Décide qui joue et quand' },
];

export const toutLeMonde = () =>
  [...RIVALS.map(r => ({ ...r, nom: r.name, rival: true })),
   ...HABITANTS.map(h => ({ ...h, rival: false }))];

export const parId = id => toutLeMonde().find(p => p.id === id);

// --------------------------------------------------------- petites aides
function rumeurDisque(game) {
  const inconnus = RECORDS.filter(r => !game.s.collection.includes(r.id) && r.rarity >= 4);
  if (!inconnus.length) return null;
  const d = pick(inconnus);
  return `On dit qu’un ${d.artist} traîne encore dans un bac. Le ${d.title}, sur ${d.label}.`;
}

function etatDuJoueur(game) {
  const q = game.quest.step.id;
  if (['first_job', 'buy_casque', 'buy_platines'].includes(q)) return 'debut';
  if (['go_shop', 'dig', 'find_garnier', 'listen'].includes(q)) return 'disques';
  if (q === 'first_set') return 'avant_set';
  if (['buy_machine', 'first_track', 'first_press', 'first_promo'].includes(q)) return 'producteur';
  return 'etabli';
}

// =====================================================================
//  L'arbre de dialogue. Chaque noeud : une replique et des choix.
//  Un choix peut mener a un autre noeud, appliquer un effet, ou fermer.
// =====================================================================
export function conversation(game, pnj) {
  return pnj.rival ? dialogueRival(game, pnj) : dialogueHabitant(game, pnj);
}

// ------------------------------------------------------------ les rivaux
function dialogueRival(game, r) {
  const sc = game.scene;
  const saHype = sc.hypeDe(r.id), maHype = game.s.hype;
  const jeDomine = maHype > saHype * 1.15;
  const ilDomine = saHype > maHype * 1.15;

  const ouverture = jeDomine
    ? pick([
        `Alors c’est toi qu’on programme partout en ce moment. Profite, ça tourne vite.`,
        `J’ai entendu ton set. C’était bien. Ça m’embête de le dire.`,
      ])
    : ilDomine
    ? pick([
        `Tu es le nouveau, c’est ça ? Reviens me voir quand tu auras joué ailleurs qu’au Sous-Sol.`,
        `Je ne vais pas te mentir : je ne t’ai jamais entendu.`,
      ])
    : pick([
        `On se croise partout ces temps-ci. C’est mauvais signe pour l’un de nous deux.`,
        `Toi et moi on vise la même date, tu le sais ça ?`,
      ]);

  const choix = [
    {
      label: 'Le prendre de haut',
      suite: {
        texte: ilDomine
          ? `${r.name} sourit sans répondre. Ça ne joue clairement pas en ta faveur.`
          : `Il encaisse. La prochaine fois qu’un booker demandera, ton nom sortira avant le sien.`,
        effet: g => {
          if (ilDomine) { g.need('social', -8); return 'Tu t’es fait petit sans le vouloir.'; }
          g.s.hype += 2; g.s.cred += 1;
          return 'La scène retiendra que tu ne baisses pas les yeux.';
        },
      },
    },
    {
      label: 'Lui demander conseil',
      suite: {
        texte: pick([
          `« Joue moins de disques et plus longtemps. Personne ne compte tes transitions. »`,
          `« Achète moins, écoute plus. Tu as trente disques que tu n’as jamais passés. »`,
          `« Le cachet se négocie avant, jamais après. Note-le quelque part. »`,
        ]),
        effet: g => { g.s.skill += 0.6; g.need('social', 6); return 'Tu as appris quelque chose.'; },
      },
    },
    {
      label: 'Lui proposer un B2B',
      suite: {
        texte: jeDomine
          ? `« Pourquoi pas. Trouve la date, j’amène mes disques. »`
          : `« Quand tu auras un nom, on en reparlera. »`,
        effet: g => {
          if (!jeDomine) { g.need('social', -4); return 'Refusé, poliment.'; }
          g.s.hype += 5; g.s.cred += 2; g.need('social', 12);
          return 'Un B2B avec lui, ça se saura.';
        },
      },
    },
  ];
  return { titre: r.name, sousTitre: r.bio, texte: ouverture, choix };
}

// --------------------------------------------------------- les habitants
function dialogueHabitant(game, h) {
  const etat = etatDuJoueur(game);
  const rumeur = rumeurDisque(game);

  const parPersonne = {
    h_disquaire: {
      texte: etat === 'debut'
        ? `Tu regardes les bacs depuis trois jours sans rien acheter. Je te préviens : ça commence toujours comme ça.`
        : `Tu cherches quelque chose de précis, ou tu creuses au hasard ? Les deux se valent.`,
      choix: [
        { label: 'Demander un tuyau', suite: {
            texte: rumeur || `Rien de neuf cette semaine. Reviens jeudi, j’ai un carton qui arrive.`,
            effet: g => { g.s.insp = Math.min(100, g.s.insp + 8); return null; } } },
        { label: 'Parler du métier', suite: {
            texte: `« Le pire client, c’est celui qui sait déjà tout. Le meilleur, c’est celui qui écoute avant de parler. »`,
            effet: g => { g.need('social', 8); g.s.skill += 0.3; return null; } } },
      ],
    },
    h_habitue: {
      texte: `Tu veux savoir qui joue où ? Assieds-toi, j’ai que ça à faire.`,
      choix: [
        { label: 'Qui monte en ce moment ?', suite: {
            texte: (() => {
              const cl = game.scene.classement().filter(x => !x.moi).slice(0, 2);
              return `« ${cl[0].nom} tient le haut du pavé, et ${cl[1].nom} pousse fort derrière. Toi tu es ${game.scene.maPlace}e. »`;
            })(),
            effet: g => { g.need('social', 6); return null; } } },
        { label: 'Payer un verre', suite: {
            texte: `« Ah, un homme bien. Alors écoute : le patron cherche quelqu’un pour les warm-up. Il ne le dira pas lui-même. »`,
            effet: g => { if (!g.spend(9, 'vie')) return 'Tu n’as même pas de quoi payer un verre.';
              g.need('social', 16); g.s.hype += 1.5; return null; } } },
      ],
    },
    h_voisine: {
      texte: etat === 'producteur' || etat === 'etabli'
        ? `J’entends tes basses jusque dans ma cuisine. Mais bon, c’est mieux que le précédent.`
        : `Alors, ça avance ton histoire de musique ? Ton loyer avance, lui, je te le dis.`,
      choix: [
        { label: 'S’excuser pour le bruit', suite: {
            texte: `« Laisse tomber. Fais juste attention après minuit. »`,
            effet: g => { g.need('social', 10); return null; } } },
        { label: 'Lui faire écouter', suite: {
            texte: game.s.tracks.length
              ? `Elle écoute jusqu’au bout, ce que personne ne fait jamais. « C’est joli, ce passage-là. »`
              : `« Tu n’as rien à me faire écouter. Reviens quand ce sera vrai. »`,
            effet: g => { if (!g.s.tracks.length) return null;
              g.s.insp = Math.min(100, g.s.insp + 14); g.need('social', 10); return null; } } },
      ],
    },
    h_livreur: {
      texte: `Tu fais les livraisons aussi ? Je te vois passer. Fais gaffe à la côte du nord, elle tue les mollets.`,
      choix: [
        { label: 'Échanger des tuyaux', suite: {
            texte: `« Les pourboires sont meilleurs le vendredi. Et prends les commandes du casse-croûte, ils groupent les adresses. »`,
            effet: g => { g.need('social', 8); return null; } } },
        { label: 'Parler musique', suite: {
            texte: `« Moi je mets la radio. Mais vas-y, explique-moi ce que tu fais, ça m’intéresse. »`,
            effet: g => { g.need('social', 12); g.s.hype += 0.5; return null; } } },
      ],
    },
    h_gamin: {
      texte: etat === 'etabli'
        ? `« C’est toi qui as sorti le disque ? Mon frère l’écoute en boucle. »`
        : `« Tu sais mixer ? Vraiment ? Tu peux m’expliquer comment on fait ? »`,
      choix: [
        { label: 'Lui expliquer', suite: {
            texte: `Il écoute sans rien dire, puis repart en courant. Tu te souviens d’avoir été lui.`,
            effet: g => { g.need('social', 12); g.s.insp = Math.min(100, g.s.insp + 10); return null; } } },
        { label: 'Lui donner un disque', suite: {
            texte: game.s.collection.length > 3
              ? `Il le tient à deux mains comme si c’était fragile. Il le tiendra comme ça longtemps.`
              : `Tu n’en as pas assez pour en donner un.`,
            effet: g => {
              if (g.s.collection.length <= 3) return null;
              g.s.collection.pop(); g.s.hype += 3; g.need('social', 18);
              return 'Ça ne rapporte rien. Ça compte quand même.'; } } },
      ],
    },
    h_patron: {
      texte: game.canDJ
        ? `Alors, tu veux jouer chez moi ? Montre-moi ce que tu as dans le sac.`
        : `Reviens me voir quand tu auras des platines. Je ne prête pas les miennes.`,
      choix: [
        { label: 'Demander une date', suite: {
            texte: game.canDJ
              ? `« Passe en semaine, il y a moins de monde. Si ça tient, on parle du samedi. »`
              : `« Sans matériel ? Non. »`,
            effet: g => { if (!g.canDJ) return null; g.s.hype += 2; g.need('social', 8); return null; } } },
        { label: 'Parler du quartier', suite: {
            texte: `« Avant, il y avait trois clubs sur cette rue. Maintenant il y a moi. Alors je fais attention à qui je programme. »`,
            effet: g => { g.need('social', 6); return null; } } },
      ],
    },
  };

  const d = parPersonne[h.id] || { texte: '…', choix: [] };
  return { titre: h.nom, sousTitre: h.role, texte: d.texte, choix: d.choix };
}
