/* LE CALENDRIER. Route #/calendrier, et #/calendrier?city=<slug>.
 *
 * ═══ CE QU'IL REPOND ═══
 *
 * « Qu'est-ce qui se joue dans cette ville, dans les styles qui
 * m'interessent. » Rien d'autre. L'atlas raconte d'ou vient la dub techno ;
 * cette page dit ou en ecouter samedi.
 *
 * ═══ COMMENT LA VILLE EST CHOISIE, ET CE QUE CELA ENGAGE ═══
 *
 * Quatre sources, du plus explicite au plus devine, et l'ordre est ecrit une
 * fois pour toutes dans `resoudreVille`, avec ses tests :
 *
 *   1. le lien, `?city=berlin-de`, pour qu'une vue se partage ;
 *   2. le choix garde sur cette machine ;
 *   3. la ville d'attache du profil, pour qui est connecte ;
 *   4. la ville deduite de la connexion ;
 *   5. rien, et on le dit, avec le selecteur en avant.
 *
 * LA DEDUCTION EST DERNIERE, ET ELLE N'ECRIT NULLE PART. Elle remplit le
 * premier ecran de quelqu'un qui n'a rien demande, et c'est tout : le premier
 * geste la remplace, et regarder une autre ville ne modifie aucun profil. Un
 * contributeur qui voudrait la remonter dans l'ordre, ou la faire ecrire
 * quelque part, changerait la nature de la page : elle passerait de « voici
 * une proposition » a « je sais ou vous etes ». C'est la ligne a ne pas
 * franchir sans le decider.
 *
 * ═══ D'OU VIENNENT LES SOIREES ═══
 *
 * De Resident Advisor, par la passerelle, avec l'identifiant de zone que
 * porte chaque ville. Leur API n'est pas publique : elle peut fermer sans
 * preavis. La page est ecrite pour que cela SE VOIE, avec une phrase qui
 * nomme la source tombee, au lieu d'afficher une liste vide qui ressemblerait
 * a une ville sans soirees.
 *
 * Rien n'est copie, chaque soiree renvoie chez eux, le cache d'une heure vit
 * dans le Worker.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { ChoixStyles, EST_FAMILLE, LABEL_DE_STYLE } from './ChoixStyles.tsx';
import { FAMILIES, STRUCTURES } from './structures.ts';
import { resoudreVille, type Ville } from '../lib/ville-active.ts';
import {
  heureLocale,
  noterVilleDeSession,
  poserVilleDansLien,
  sigleFuseau,
  toutesLesVilles,
  villeDattache,
  villeDeSession,
  villeDuLien,
} from '../lib/villes.ts';
import { soireesManuelles, supprimerSoiree, type SoireeManuelle } from '../lib/soirees-manuelles.ts';
import { AjouterSoiree } from './AjouterSoiree.tsx';
import { PartageSoiree } from './PartageSoiree.tsx';
import { useSession } from '../lib/useSession.ts';
import {
  agenda,
  noterStyles,
  ouJeSuis,
  stylesSuivis,
  traduire,
  STYLES_MAX,
  type Soiree,
} from '../lib/agenda.ts';
import {
  cleDuJour,
  fenetreDe,
  type Vue,
  grilleDuMois,
  jourDemandable,
} from '../lib/fenetre-agenda.ts';
import './credits.css';
import './calendrier.css';
import { langue, t } from '../langue/langue.ts';

/* LES DATES SUIVENT LA LANGUE, ET C'EST LA MOITIE DU TRAVAIL DE TRADUCTION.
   Une interface anglaise qui titre « Dimanche 6 Septembre » au-dessus de ses
   cartes n'est pas traduite, elle est bilingue par accident. Le format
   canadien est garde des deux cotes : jour avant mois, ce qui est aussi ce
   que lit un anglophone d'ici. */
const LOCALE = langue === 'fr' ? 'fr-CA' : 'en-CA';

/* LE NOM D'UN PAYS DANS LA LANGUE DE LA PAGE, sans table a tenir. Trente
   lignes de correspondance code-vers-nom auraient a etre traduites deux fois
   et vieilliraient ; le navigateur les connait deja. */
const NOM_DE_PAYS = (() => {
  try {
    const noms = new Intl.DisplayNames([LOCALE], { type: 'region' });
    return (code: string): string => noms.of(code) ?? code;
  } catch {
    return (code: string): string => code;
  }
})();

/** Les villes rangees par pays, pays classes par leur nom affiche et villes
    par le leur. Vingt-trois entrees se lisent tres bien dans une liste
    deroulante a condition qu'elles soient rangees. */
function villesParPays(villes: readonly Ville[]): [string, Ville[]][] {
  const paquets = new Map<string, Ville[]>();
  for (const v of villes) {
    const deja = paquets.get(v.country_code);
    if (deja) deja.push(v);
    else paquets.set(v.country_code, [v]);
  }
  return [...paquets.entries()]
    .map(([code, liste]): [string, Ville[]] => [
      code,
      [...liste].sort((a, b) => a.name.localeCompare(b.name, LOCALE)),
    ])
    .sort((a, b) => NOM_DE_PAYS(a[0]).localeCompare(NOM_DE_PAYS(b[0]), LOCALE));
}

/* La famille d'un genre, pour pouvoir elargir a elle quand RA ne connait pas
   le style precis. Calculee une fois : STRUCTURES ne bouge pas. */
const FAMILLE_DE_GENRE = new Map<string, string>();
FAMILIES.forEach((f, i) => {
  for (const g of STRUCTURES[i]?.genres ?? []) FAMILLE_DE_GENRE.set(g.id, f.id);
});

/* CE QU'UNE PASTILLE DE SOURCE DIT, ET CE QU'ELLE NE DIT PAS. Elle nomme la
   provenance, elle ne la juge pas : « Shotgun » est un fait verifiable, pas
   une mention de qualite. Resident Advisor n'en a pas parce qu'il est le fond
   de la liste ; nommer le fond revient a le repeter trois cents fois. */
type Origine = 'main' | 'shotgun' | 'eventbrite' | 'lepointdevente' | 'ticketmaster' | 'membre';

const ORIGINE_DE_SOURCE: Record<string, Origine> = {
  main: 'main',
  facebook: 'main',
  shotgun: 'shotgun',
  eventbrite: 'eventbrite',
  lepointdevente: 'lepointdevente',
  ticketmaster: 'ticketmaster',
  /* Ce qu'un membre connecte a depose lui-meme : voir AjouterSoiree. */
  membre: 'membre',
};

const NOM_DE_SOURCE: Record<Origine, string> = {
  main: t.ajouteeALaMain,
  shotgun: 'Shotgun',
  eventbrite: 'Eventbrite',
  lepointdevente: 'Lepointdevente',
  ticketmaster: 'Ticketmaster',
  membre: t.sourceMembre,
};

/* LES TROIS QUESTIONS QU'ON SE POSE VRAIMENT.

   « Cette semaine, ce mois, trois mois » repondaient a une question que
   personne ne pose. On veut savoir ce qu'il y a CE SOIR, ce qu'il y a EN FIN
   DE SEMAINE, et sinon on cherche une date. Le reste vient apres, en vrac,
   pour qui a le temps de flaner.

   Le choix de date n'est pas un quatrieme bouton : c'est une liste
   deroulante a cote, parce qu'elle porte soixante entrees et qu'une rangee
   de soixante boutons n'est pas une rangee. */
const VUES: readonly { cle: Vue; label: string }[] = [
  { cle: 'aujourdhui', label: t.aujourdhuiOnglet },
  { cle: 'weekend', label: t.finDeSemaineOnglet },
  { cle: 'suite', label: t.joursSuivantsOnglet },
];

/* Le jour se lit AUSSI dans le fuseau du lieu : une soiree berlinoise du
   samedi a 1 h du matin est un vendredi soir a Montreal, et la ranger sous
   vendredi tromperait celui qui prepare son week-end a Berlin.

   DEUX FORMES ENTRENT ICI, ET LES CONFONDRE DECALE D'UN JOUR. Un horodatage
   complet, « 2026-09-12T23:00:00Z », qu'il faut lire dans le fuseau du lieu.
   Et une date nue, « 2026-09-12 », qui vient du choix de date et ne designe
   aucun instant : `new Date` la lit comme minuit UTC, soit le 11 a 20 h a
   Montreal. Defaut constate a l'ecran, le compteur annoncait « vendredi 11 »
   au-dessus d'une liste intitulee « samedi 12 ».

   Une date nue est donc construite composante par composante et formatee
   SANS fuseau : elle est deja locale, lui en appliquer un la redecalerait. */
const DATE_NUE = /^(\d{4})-(\d{2})-(\d{2})$/;

function jour(iso: string, fuseau: string): string {
  const nue = DATE_NUE.exec(iso);
  const d = nue
    ? new Date(Number(nue[1]), Number(nue[2]) - 1, Number(nue[3]))
    : new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(nue ? {} : { timeZone: fuseau }),
  };
  try {
    return new Intl.DateTimeFormat(LOCALE, options).format(d);
  } catch {
    return new Intl.DateTimeFormat(LOCALE, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  }
}

/* La date dans une ligne d'horaire : « sam. 5 sept. ». On coupe le nom du
   jour et le mois parce qu'ils se repetent a chaque ligne et qu'on les lit du
   coin de l'oeil, pas en entier. */
function jourCourt(iso: string, fuseau: string): string {
  const nue = DATE_NUE.exec(iso);
  const d = nue ? new Date(Number(nue[1]), Number(nue[2]) - 1, Number(nue[3])) : new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(nue ? {} : { timeZone: fuseau }),
  };
  try {
    return new Intl.DateTimeFormat(LOCALE, options).format(d);
  } catch {
    return new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  }
}


/* ═══ LA FICHE S'OUVRE PAR-DESSUS, ELLE NE POUSSE PLUS LA GRILLE ═══
 *
 * ELLE ETAIT UN ACCORDEON, ET C'ETAIT UNE ERREUR SUR TELEPHONE. Deplier une
 * fiche dans une grille ecarte tout ce qui suit de plusieurs ecrans : on perd
 * l'endroit ou l'on etait, et il faut remonter a l'aveugle pour retrouver la
 * carte suivante. Sur un ecran de telephone, ou la grille est deja en une
 * seule colonne, mille signes de description repoussent la soiree suivante
 * hors de tout.
 *
 * C'est donc une FEUILLE : elle monte du bas sur telephone, s'ouvre en
 * panneau lateral sur ordinateur, et la liste ne bouge pas d'un pixel
 * derriere elle. On la ferme, on est exactement la ou l'on avait clique.
 *
 * TROIS FACONS DE FERMER, PARCE QU'ON N'A PAS TOUS LE MEME GESTE : la croix,
 * le fond, et Echap. Une feuille qui ne se ferme que par une croix de vingt
 * pixels en haut a droite est une feuille qu'on ferme mal au pouce.
 *
 * Elle montre ce que la source annonce, sur place : le plateau entier et non
 * les six premiers, l'adresse et non le seul nom de salle, l'horaire de bout
 * en bout, le prix, et le texte de l'organisateur tel qu'il l'a ecrit.
 *
 * CE QU'ELLE NE FAIT PAS, ET C'EST DELIBERE. Elle n'invente rien quand la
 * source ne donne rien. Resident Advisor ne fournit pas de description a
 * SONAA : pour ses soirees, le panneau dit qu'il n'y a rien de plus a
 * montrer, au lieu de laisser un blanc qu'on lirait comme un defaut.
 *
 * LE TEXTE DE L'ORGANISATEUR EST RENDU EN TEXTE, pas en HTML. Il vient d'un
 * tiers, il contient des emoji, des retours a la ligne et parfois des balises
 * ; le poser dans le DOM tel quel serait une porte d'injection ouverte sur
 * une page publique. `white-space: pre-line` rend les retours a la ligne, et
 * c'est tout ce dont il a besoin.
 */
function FicheSoiree({
  soiree,
  fuseau,
  villeNom,
  moi,
  onFermer,
  onRetiree,
}: {
  soiree: Soiree;
  fuseau: string;
  villeNom: string | null;
  /** Le compte connecte, pour savoir si cette soiree est la sienne. */
  moi: string | null;
  onFermer: () => void;
  onRetiree: () => void;
}) {
  /* LA MIENNE : deposee par un membre, et ce membre est moi. C'est la seule
     condition pour l'image Instagram et le retrait ; la base l'applique
     aussi, l'ecran ne fait que ne pas proposer ce qu'elle refuserait. */
  const laMienne = soiree.origine === 'membre' && soiree.auteur !== null && soiree.auteur === moi;
  const debut = soiree.debut ? heureLocale(soiree.debut, fuseau) : null;
  const fin = soiree.fin ? heureLocale(soiree.fin, fuseau) : null;
  const rien =
    !soiree.description && !soiree.adresse && !soiree.prix && soiree.artistes.length === 0;

  /* ECHAP FERME, ET LE FOND DE PAGE NE DEFILE PLUS DERRIERE. Sans le second,
     on scrolle la liste en croyant scroller la fiche, et on ressort ailleurs. */
  useEffect(() => {
    const surTouche = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onFermer();
    };
    window.addEventListener('keydown', surTouche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', surTouche);
      document.body.style.overflow = avant;
    };
  }, [onFermer]);

  return (
    <div className="cal-voile" onClick={onFermer}>
    <div
      className="cal-feuille"
      role="dialog"
      aria-modal="true"
      aria-label={soiree.titre}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cal-feuille-tete">
        <span className="cal-feuille-poignee" aria-hidden="true" />
        <h3 className="cal-feuille-titre">{soiree.titre}</h3>
        <button type="button" className="cal-feuille-fermer" onClick={onFermer} aria-label={t.fermerLaFiche}>
          ×
        </button>
      </div>
      <div className="cal-fiche">
      {/* L'AFFICHE OUVRE LA FICHE. Sur la carte elle fait 22 rem de large et
          on la lit a peine ; ici elle a la largeur de la feuille. Pas de texte
          de remplacement : le titre est deja juste au-dessus. */}
      {soiree.affiche && (
        <img className="cal-fiche-affiche" src={soiree.affiche} alt="" loading="lazy" />
      )}
      <dl className="cal-fiche-faits">
        {soiree.artistes.length > 0 && (
          <div>
            <dt>{t.plateau}</dt>
            <dd>{soiree.artistes.join(' · ')}</dd>
          </div>
        )}
        {(soiree.lieu || soiree.adresse) && (
          <div>
            <dt>{t.ouLibelle}</dt>
            <dd>
              {soiree.lieu}
              {soiree.adresse && soiree.adresse !== soiree.lieu && (
                <span className="cal-fiche-adresse">{soiree.adresse}</span>
              )}
            </dd>
          </div>
        )}
        {debut && (
          <div>
            <dt>{t.quandLibelle}</dt>
            <dd>
              {debut}
              {fin ? ` ${t.jusqua} ${fin}` : ''}
            </dd>
          </div>
        )}
        {soiree.prix && (
          <div>
            <dt>{t.combien}</dt>
            <dd>{soiree.prix}</dd>
          </div>
        )}
        {soiree.organisateur && (
          <div>
            <dt>{t.organisePar}</dt>
            <dd>{soiree.organisateur}</dd>
          </div>
        )}
      </dl>

      {soiree.description && (
        <div className="cal-fiche-texte">
          <h4>{t.lAnnonce}</h4>
          <p>{soiree.description}</p>
        </div>
      )}

      {rien && <p className="cal-fiche-vide">{t.pasDeDetailIci}</p>}

      {soiree.lien && (
        <a className="cal-fiche-lien" href={soiree.lien} target="_blank" rel="noreferrer">
          {t.ouvrirChezLaSource}
        </a>
      )}

      {laMienne && (
        <PartageSoiree
          soiree={soiree}
          ville={villeNom}
          fuseau={fuseau}
          onRetirer={async () => {
            await supprimerSoiree(soiree.id.replace(/^main:/, ''));
            onRetiree();
          }}
        />
      )}
      </div>
    </div>
    </div>
  );
}


/* ═══ LE CHOIX DU JOUR EST UN CALENDRIER, PAS UNE LISTE ═══
 *
 * C'etait une liste deroulante de soixante entrees, « lundi 7 septembre,
 * mardi 8 septembre, … ». Elle fonctionnait et elle ne repondait a aucune des
 * questions qu'on se pose en choisissant une date : quel jour de la semaine
 * tombe le 12, combien de samedis restent, c'est dans combien de temps. Une
 * grille de mois repond aux trois d'un seul coup d'oeil, parce que la forme
 * porte l'information que la liste ecrivait en toutes lettres.
 *
 * LES JOURS HORS FENETRE RESTENT VISIBLES ET DEVIENNENT INERTES. Les cacher
 * ferait un calendrier troue ; les laisser cliquables promettrait des soirees
 * qu'aucune source n'annonce. Ils sont donc la, en retrait, et `disabled`.
 */
function ChoixDuJour({
  choisi,
  onChoisir,
}: {
  choisi: string | null;
  onChoisir: (cle: string) => void;
}) {
  const aujourdhui = new Date();
  const [ancre, setAncre] = useState(() => {
    const depart = choisi ? new Date(`${choisi}T12:00:00`) : aujourdhui;
    return new Date(depart.getFullYear(), depart.getMonth(), 1);
  });

  const semaines = grilleDuMois(ancre.getFullYear(), ancre.getMonth());
  const titreMois = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(ancre);

  /* LES INITIALES DE JOURS VIENNENT DU NAVIGATEUR, pas d'une liste ecrite a
     la main : elles doivent suivre la langue, et elles changent de casse et
     de longueur d'une langue a l'autre. On part d'un lundi connu. */
  const initiales = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(LOCALE, { weekday: 'narrow' }).format(new Date(2026, 8, 7 + i))
  );

  const glisser = (pas: number): void =>
    setAncre((m) => new Date(m.getFullYear(), m.getMonth() + pas, 1));

  return (
    <div className="cal-mois">
      <div className="cal-mois-tete">
        <button type="button" onClick={() => glisser(-1)} aria-label={t.moisPrecedent}>
          ‹
        </button>
        <strong>{titreMois}</strong>
        <button type="button" onClick={() => glisser(1)} aria-label={t.moisSuivant}>
          ›
        </button>
      </div>

      <table className="cal-mois-grille">
        <thead>
          <tr>
            {initiales.map((lettre, i) => (
              <th key={i} scope="col" abbr={lettre}>
                {lettre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semaines.map((semaine) => (
            <tr key={cleDuJour(semaine[0]!.jour)}>
              {semaine.map((c) => {
                const cle = cleDuJour(c.jour);
                const ouvert = jourDemandable(c.jour, aujourdhui);
                const estAujourdhui = cle === cleDuJour(aujourdhui);
                return (
                  <td key={cle}>
                    <button
                      type="button"
                      className={`cal-jour-case${c.duMois ? '' : ' cal-jour-voisin'}${
                        cle === choisi ? ' cal-jour-choisi' : ''
                      }${estAujourdhui ? ' cal-jour-aujourdhui' : ''}`}
                      disabled={!ouvert}
                      onClick={() => onChoisir(cle)}
                      aria-current={cle === choisi ? 'date' : undefined}
                    >
                      {c.jour.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CalendrierPage() {
  const [villes, setVilles] = useState<Ville[]>([]);
  const [slugSession, setSlugSession] = useState<string | null>(null);
  const [idProfil, setIdProfil] = useState<string | null>(null);
  const [zoneDeduite, setZoneDeduite] = useState<number | null>(null);
  /* LE NOM DEDUIT N'EST PLUS AFFICHE : la liste deroulante montre la ville
     retenue, quelle que soit la facon dont on y est arrive. On garde le
     reglage parce que la deduction sert toujours a CHOISIR la ville par
     defaut ; c'est son affichage qui etait redondant. */
  const [, setNomDeduit] = useState<string | null>(null);
  const [prete, setPrete] = useState(false);

  const [styles, setStyles] = useState<string[]>(() => stylesSuivis());
  const [styleActif, setStyleActif] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue>('aujourdhui');
  const [recherche, setRecherche] = useState('');
  /* Le terme qui declenche VRAIMENT une requete, en retard sur la frappe :
     sans cela, taper « stereo » lancerait six recherches sur trois mois. */
  const [rechercheRetardee, setRechercheRetardee] = useState('');
  const [dateChoisie, setDateChoisie] = useState<string | null>(null);

  const [soirees, setSoirees] = useState<Soiree[] | null>(null);
  /* UNE SEULE A LA FOIS, ET C'EST UN CHOIX. Plusieurs panneaux ouverts dans
     une grille de quatre colonnes poussent les cartes suivantes de plusieurs
     ecrans, et on perd l'endroit ou l'on etait. Ouvrir la suivante ferme la
     precedente : la page ne s'allonge jamais de plus d'un panneau. */
  const [depliee, setDepliee] = useState<string | null>(null);
  const [ouvrirJour, setOuvrirJour] = useState(false);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [panne, setPanne] = useState(false);
  const [ouvrirStyles, setOuvrirStyles] = useState(false);
  /* LE CHAMP DE RECHERCHE SE CACHE DERRIERE UNE LOUPE. Toujours visible, il
     prenait une rangee entiere sous la barre pour un geste qu'on fait une
     fois sur dix. La loupe est dans la rangee des vues, a droite des styles,
     et elle ouvre le champ deja focalise : un tap, on tape. Demande de Mika
     du 7 septembre 2026. */
  const [ouvrirRecherche, setOuvrirRecherche] = useState(false);
  /* AJOUTER UNE SOIREE : la feuille s'ouvre par-dessus le calendrier, comme
     la fiche d'une soiree. Demande de Mika du 7 septembre 2026. */
  const [ouvrirAjout, setOuvrirAjout] = useState(false);
  const { session } = useSession();
  const moi = session?.user.id ?? null;

  useEffect(() => {
    const t = setTimeout(() => setRechercheRetardee(recherche.trim()), 350);
    return () => clearTimeout(t);
  }, [recherche]);

  /* Le slug du lien est lu UNE FOIS, au montage : il decrit l'intention de
     celui qui a ouvert le lien, pas l'etat courant de la page, que chaque
     changement de ville va reecrire dans l'adresse. Le relire ensuite ferait
     gagner le lien contre le geste, c'est-a-dire l'inverse de la regle. */
  const [slugLien] = useState<string | null>(() => villeDuLien());

  useEffect(() => {
    setSlugSession(villeDeSession());
    void toutesLesVilles().then(setVilles);
    void villeDattache().then(setIdProfil);
    void ouJeSuis().then((ou) => {
      setNomDeduit(ou.ville);
      setZoneDeduite(ou.zone?.id ?? null);
      setPrete(true);
    });
  }, []);

  /* LA DEDUCTION REND UNE ZONE RESIDENT ADVISOR, PAS UNE DE NOS VILLES. On
     les rapproche ici, quand les deux sont arrivees, dans l'ordre ou elles
     arrivent. Une ville que RA couvre mais que SONAA ne connait pas encore ne
     donne rien : mieux vaut demander que d'afficher une ville inventee. */
  const deduite = useMemo(
    () => (zoneDeduite == null ? null : (villes.find((v) => v.ra_area_id === zoneDeduite) ?? null)),
    [villes, zoneDeduite]
  );

  const { ville } = useMemo(
    () =>
      resoudreVille({
        slugDuLien: slugLien,
        slugDeSession: slugSession,
        villeDuProfil: idProfil,
        villeDeduite: deduite,
        connues: villes,
      }),
    [slugLien, slugSession, idProfil, deduite, villes]
  );

  const styleInterroge = styleActif ?? styles[0] ?? null;
  const traduction = useMemo(() => {
    if (!styleInterroge) return null;
    /* UNE FAMILLE EST SA PROPRE FAMILLE. Le calendrier ne propose plus que
       les quatorze, mais un choix garde d'avant peut encore etre un genre :
       les deux formes passent ici, et `FAMILLE_DE_GENRE` ne connait que la
       seconde. */
    return traduire(styleInterroge, FAMILLE_DE_GENRE.get(styleInterroge) ?? styleInterroge);
  }, [styleInterroge]);

  const zoneRa = ville?.ra_area_id ?? null;

  /* ═══ CHERCHER SORT DE LA FENETRE COURANTE ═══
   *
   * Chercher « Stereo » en regardant « Aujourd'hui » ne devait pas rendre les
   * soirees de ce soir au Stereo : on cherche une salle pour savoir QUAND on
   * pourra y aller. Des qu'un terme est saisi, la fenetre devient donc les
   * trois prochains mois, et la passerelle tourne ses pages pour les rendre
   * toutes, pas les quarante premieres.
   *
   * Les boutons de vue restent affiches et redeviennent actifs des qu'on
   * efface le terme : la recherche ne les remplace pas, elle les suspend. */
  const enRecherche = rechercheRetardee !== '';

  const charger = useCallback(() => {
    if (zoneRa == null) return;
    setChargement(true);
    setPanne(false);
    const { du, au } = enRecherche
      ? fenetreDe('recherche', null, new Date())
      : fenetreDe(vue, dateChoisie, new Date());
    const deRa = agenda({
      zone: zoneRa,
      du,
      au,
      ...(traduction?.valeur ? { genre: traduction.valeur } : {}),
      /* LES JOURS SUIVANTS SE LISENT EN ENTIER, comme une recherche. A une
         page, la liste s'arretait a quarante soirees de RA, et disait « les
         89 premieres » sur 262 : le jeudi n'y etait pas quand on regardait
         le mardi. Huit pages font 320 soirees, plus que trois mois de
         Montreal ; la passerelle les garde une heure. */
      ...(enRecherche || vue === 'suite' ? { pages: 8 } : {}),
    });

    /* ═══ DEUX SOURCES, UNE SEULE LISTE ═══
     *
     * Resident Advisor et les soirees ajoutees a la main sont demandees en
     * parallele, et fusionnees par date. Elles ne partagent aucun sort : si
     * RA tombe, la page le dit et montre quand meme ce qu'on a saisi ; si
     * notre base tombe, RA continue. Faire dependre l'une de l'autre
     * reviendrait a ce qu'une panne chez nous efface une source qui, elle,
     * repond.
     *
     * L'ordre du tri est la date, pas la source : personne ne cherche « les
     * soirees de Resident Advisor », on cherche ce qui se joue mardi. */
    const laMain = ville
      ? soireesManuelles(ville.id, du, au)
      : Promise.resolve([] as SoireeManuelle[]);

    void Promise.all([deRa, laMain]).then(([r, mains]) => {
      const ajoutees: Soiree[] = mains.map((m) => ({
        id: `main:${m.id}`,
        titre: m.titre,
        date: m.debut,
        debut: m.debut,
        lieu: m.lieu,
        artistes: m.artistes,
        genres: m.genres,
        affiche: m.affiche,
        lien: m.lien ?? '',
        interesses: 0,
        /* LA PASTILLE DISAIT « AJOUTEE A LA MAIN » POUR DES LIGNES QUE
           PERSONNE N'AVAIT SAISIES. Constate a l'ecran des la premiere
           moisson Shotgun : cent trente et une soirees montpellieraines
           annoncees comme des saisies manuelles. La table sert deux sources
           depuis qu'un adaptateur y verse, et le champ `source` le dit
           depuis le debut ; il suffisait de le lire. */
        /* LA SOURCE SE LIT, ELLE NE SE DEVINE PAS. Le ternaire « shotgun, sinon
           a la main » a tenu tant qu'il n'y avait que deux sources ; la
           troisieme aurait porte la pastille de la premiere venue. On passe
           par une table fermee : une source inconnue retombe sur « a la
           main », ce qui est faux mais visible, plutot que sur une source
           qui ne l'a pas produite. */
        origine: ORIGINE_DE_SOURCE[m.source] ?? 'main',
        description: m.description,
        fin: m.fin,
        adresse: m.adresse,
        prix: m.prix,
        organisateur: m.organisateur,
        auteur: m.ajoutee_par,
      }));

      if (!r) {
        setPanne(true);
        /* Meme sans RA, ce qu'on a saisi reste affichable. */
        setSoirees(ajoutees.length > 0 ? ajoutees : null);
        setTotal(ajoutees.length);
      } else {
        const tout = [...r.soirees, ...ajoutees].sort((a, b) => a.date.localeCompare(b.date));
        setSoirees(tout);
        setTotal(r.total + ajoutees.length);
      }
      setChargement(false);
    });
  }, [zoneRa, vue, dateChoisie, traduction, enRecherche, ville]);

  useEffect(charger, [charger]);

  /* CHANGER DE VILLE ICI N'ECRIT PAS DANS LE PROFIL. Le local et l'adresse,
     rien de plus : regarder Berlin un mardi soir ne rend berlinois personne.
     Le profil ne se modifie que depuis le profil, et c'est verifie par un
     test. */
  const choisirVille = (v: Ville) => {
    setSlugSession(v.slug);
    noterVilleDeSession(v.slug);
    poserVilleDansLien(v.slug);
  };

  const changerStyles = (ids: string[]) => {
    setStyles(ids);
    noterStyles(ids);
    if (styleActif && !ids.includes(styleActif)) setStyleActif(null);
  };

  /* LA RECHERCHE PORTE SUR CE QUI EST AFFICHE, ET SUR RIEN D'AUTRE.

     Elle filtre les soirees deja chargees : le titre, la salle, les artistes
     et les genres annonces. Elle n'interroge pas Resident Advisor, parce
     qu'il n'y a rien de plus a lui demander sur une journee donnee, il rend
     tout ce qu'il annonce.

     CE QU'ELLE NE PEUT PAS FAIRE, ET IL FAUT QUE CELA SE VOIE. Chercher
     « Bain Mathieu » un soir ou il s'y joue de la techno ne rendra rien, non
     pas parce que la recherche est mauvaise, mais parce que Resident Advisor
     ne couvre pas cette soiree. Le message de resultat vide dit donc d'ou
     vient la liste : une recherche muette qui laisse croire que l'evenement
     n'existe pas serait pire que pas de recherche du tout. */
  const sansAccent = (x: string): string =>
    x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filtrees = useMemo(() => {
    const q = sansAccent(rechercheRetardee);
    if (!q) return soirees;
    return (soirees ?? []).filter((s) =>
      sansAccent(
        [s.titre, s.lieu ?? '', s.artistes.join(' '), s.genres.join(' ')].join(' ')
      ).includes(q)
    );
  }, [soirees, rechercheRetardee]);

  const parJour = useMemo(() => {
    const m = new Map<string, Soiree[]>();
    for (const s of filtrees ?? []) {
      const cle = s.date.slice(0, 10);
      const deja = m.get(cle);
      if (deja) deja.push(s);
      else m.set(cle, [s]);
    }
    return [...m.entries()];
  }, [filtrees]);

  const fuseau = ville?.timezone ?? 'America/Toronto';

  /* LE SIGLE DE FUSEAU NE S'AFFICHE QUE S'IL APPREND QUELQUE CHOSE : quand la
     ville regardee n'est pas celle d'ou l'on se connecte. Le repeter sur
     chaque ligne de sa propre ville serait du bruit. */
  const ailleurs = ville != null && deduite != null && ville.id !== deduite.id;

  /* Le nom local quand c'est une deduction, le notre sinon. Cloudflare rend
     « Montréal », notre table aussi ; RA ecrivait « Montreal ». */

  /* La phrase du compteur nomme la tranche regardee. « 77 soirees a
     Montreal » ne disait pas sur quoi : ce soir, ce week-end, ou d'ici trois
     mois. Trois nombres tres differents sous la meme phrase. */
  const quand =
    vue === 'aujourdhui'
      ? t.quandAujourdhui
      : vue === 'weekend'
        ? t.quandWeekend
        : vue === 'date' && dateChoisie
          ? `${langue === 'fr' ? 'le ' : 'on '}${jour(dateChoisie, ville?.timezone ?? 'America/Toronto')}`
          : t.quandSuite;

  const enAttente = !prete && villes.length === 0;

  return (
    <>
      <EnTeteSite />
      <main className="credits cal">
        <a className="credits-skip" href="#calendrier-contenu">
          Aller au contenu
        </a>

        <header className="credits-head">
          <h1>{t.leCalendrier}</h1>
          <p className="credits-lede">{t.ledeCalendrier}</p>
        </header>

        <div id="calendrier-contenu" className="credits-body">
          <div className="cal-barre">
            {/* ═══ LA VILLE EST LE PREMIER REGLAGE, DONC LE PREMIER CONTROLE ═══
             *
             * Elle etait un nom en gras suivi d'un lien « Changer de ville »,
             * qui depliait un champ de recherche a filtrer. Trois gestes pour
             * changer de ville, et rien qui dise qu'on POUVAIT en changer : un
             * lien de texte au milieu d'une phrase ne se lit pas comme un
             * reglage.
             *
             * Une liste deroulante native le dit d'elle-meme, en un geste, et
             * se manie au clavier et au doigt sans que nous ecrivions quoi que
             * ce soit. Vingt-trois villes tiennent dans une liste ; le champ
             * de recherche etait la reponse a un probleme qu'on n'a pas
             * encore, et il reste disponible dans le profil.
             *
             * Le pays vient de `Intl.DisplayNames`, dans la langue de la page.
             * Le nom de la region, lui, disparait : le pays suffit a lever
             * l'ambiguite, et « Occitanie, FR » a cote de « Montpellier »
             * n'apprenait rien a personne. */}
            <div className="cal-fenetres">
              <label className="cal-ville">
                <span className="cal-ville-mot">{t.villeLibelle}</span>
                <select
                  value={ville?.slug ?? ''}
                  onChange={(e) => {
                    const choisie = villes.find((v) => v.slug === e.target.value);
                    if (choisie) choisirVille(choisie);
                  }}
                >
                  {!ville && <option value="">{t.choisirTiret}</option>}
                  {villesParPays(villes).map(([code, liste]) => (
                    <optgroup key={code} label={NOM_DE_PAYS(code)}>
                      {liste.map((v) => (
                        <option key={v.slug} value={v.slug}>
                          {v.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {enAttente && <span className="cal-attente">{t.unInstant}</span>}

              {ville && (
                <>
                {VUES.map((v) => (
                  <button
                    key={v.cle}
                    className={`cal-onglet${vue === v.cle && !enRecherche ? ' cal-onglet-actif' : ''}${
                      enRecherche ? ' cal-suspendu' : ''
                    }`}
                    onClick={() => {
                      setVue(v.cle);
                      setDateChoisie(null);
                    }}
                  >
                    {v.label}
                  </button>
                ))}

                {/* CHOISIR UNE DATE EST UNE VUE, donc le bouton bascule la vue
                    en meme temps qu'il ouvre le calendrier. Le libelle porte
                    la date retenue plutot que le mot « Un jour » : le bouton
                    dit alors ce qu'on regarde, ce qui evite d'avoir a le
                    rouvrir pour s'en souvenir. */}
                <button
                  type="button"
                  className={`cal-onglet${vue === 'date' && !enRecherche ? ' cal-onglet-actif' : ''}${
                    enRecherche ? ' cal-suspendu' : ''
                  }`}
                  onClick={() => {
                    setOuvrirJour((v) => !v);
                    setOuvrirStyles(false);
                  }}
                  aria-expanded={ouvrirJour}
                >
                  {vue === 'date' && dateChoisie ? jour(dateChoisie, fuseau) : t.unJour}
                </button>

                {/* ═══ LES STYLES REJOIGNENT LA BARRE ═══
                 *
                 * Ils vivaient plus bas, sous un titre « Vos styles » et un
                 * paragraphe qui expliquait ce que veut dire n'en suivre
                 * aucun. Mika s'en moque, et il a raison : ce paragraphe
                 * occupait quatre lignes pour dire ce que le bouton dit
                 * deja, et il repoussait l'agenda sous la ligne de
                 * flottaison.
                 *
                 * Ici, le reglage est a cote des autres reglages. Le bouton
                 * porte l'etat en clair, « Tous les styles » ou le nom de
                 * celui qui filtre, ce qui remplace le paragraphe : on lit
                 * ce qui se passe au lieu de se le faire raconter.
                 *
                 * Les styles suivis restent des pastilles, mais apres le
                 * bouton et dans la meme rangee : ils servent a BASCULER
                 * entre eux, ce qui est un geste de reglage, pas une
                 * section de la page. */}
                <button
                  className={`cal-onglet cal-styles-bouton${
                    ouvrirStyles ? ' cal-onglet-actif' : ''
                  }`}
                  onClick={() => {
                    setOuvrirStyles((v) => !v);
                    setOuvrirJour(false);
                  }}
                  aria-expanded={ouvrirStyles}
                >
                  {ouvrirStyles
                    ? t.fermerCourt
                    : styles.length === 0
                      ? t.tousLesStyles
                      : t.styleAvecNombre(styles.length)}
                </button>

                {styles.map((id) => (
                  <button
                    key={id}
                    className={`cal-onglet cal-style-pastille${
                      (styleActif ?? styles[0]) === id ? ' cal-onglet-actif' : ''
                    }`}
                    onClick={() => setStyleActif(id)}
                  >
                    {LABEL_DE_STYLE[id] ?? id}
                  </button>
                ))}

                <button
                  type="button"
                  className={`cal-onglet cal-loupe${
                    ouvrirRecherche || recherche.trim() !== '' ? ' cal-onglet-actif' : ''
                  }`}
                  onClick={() => {
                    /* Refermer la loupe efface la recherche : un champ cache
                       qui filtre encore la liste serait un piege. */
                    if (ouvrirRecherche) setRecherche('');
                    setOuvrirRecherche((v) => !v);
                  }}
                  aria-expanded={ouvrirRecherche}
                  aria-label={t.chercherDansAffichees}
                >
                  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                    <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12.8 12.8 17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="cal-onglet cal-ajouter"
                  onClick={() => setOuvrirAjout(true)}
                  aria-label={t.ajouterUneSoiree}
                >
                  {t.ajouterCourt}
                </button>
                </>
              )}
            </div>
          </div>

          {/* LA FEUILLE VIT AU NIVEAU DE LA PAGE, PAS DANS LA CARTE.
              Rendue dans le `<li>`, elle heritait de la grille et il fallait
              un `:has()` et trois regles de zones pour la faire tenir sur
              toute la largeur. Rendue ici, une seule fois, elle se pose
              par-dessus tout sans rien deranger, et la liste garde sa
              position au pixel pres. */}
          {depliee &&
            (() => {
              const s = (soirees ?? []).find((x) => x.id === depliee);
              return s ? (
                <FicheSoiree
                  soiree={s}
                  fuseau={fuseau}
                  villeNom={ville?.name ?? null}
                  moi={moi}
                  onFermer={() => setDepliee(null)}
                  onRetiree={() => {
                    setDepliee(null);
                    charger();
                  }}
                />
              ) : null;
            })()}

          {ville && ouvrirAjout && (
            <AjouterSoiree
              ville={ville}
              onFermer={() => setOuvrirAjout(false)}
              onAjoutee={(s) => {
                setOuvrirAjout(false);
                charger();
                setDepliee(`main:${s.id}`);
              }}
            />
          )}

          {/* Le calendrier se deploie sous la barre, comme les styles : deux
              panneaux au meme endroit, jamais tous les deux a la fois. */}
          {ville && ouvrirJour && (
            <div className="cal-jour-panneau">
              <ChoixDuJour
                choisi={vue === 'date' ? dateChoisie : null}
                onChoisir={(cle) => {
                  setDateChoisie(cle);
                  setVue('date');
                  setOuvrirJour(false);
                }}
              />
            </div>
          )}

          {/* Le panneau de choix se deploie sous la barre, pleine largeur :
              trente familles ne tiennent pas dans une rangee. */}
          {ville && ouvrirStyles && (
            <div className="cal-styles-panneau">
              <ChoixStyles
                choisis={styles}
                onChange={changerStyles}
                max={STYLES_MAX}
                famillesSeulement
                nu
              />
            </div>
          )}

          {ville && ouvrirRecherche && (
            <div className="cal-chercher">
              {/* autoFocus est voulu : le champ n'existe que parce qu'on vient
                  d'appuyer sur la loupe, le clavier doit deja etre la. */}
              <input
                type="search"
                className="cal-chercher-champ"
                placeholder={t.chercherSalleArtisteSoiree}
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setRecherche('');
                    setOuvrirRecherche(false);
                  }
                }}
                aria-label={t.chercherDansAffichees}
                autoFocus
              />
              {recherche.trim() !== '' && (
                <>
                  <span className="cal-note">{t.surTroisMois}</span>
                  <button className="cal-lien" onClick={() => setRecherche('')}>
                    {t.effacer}
                  </button>
                </>
              )}
            </div>
          )}

          {/* TANT QU'AUCUNE VILLE N'EST CHOISIE, on dit ou se pose le choix.
              Le selecteur, lui, est deja dans la barre au-dessus : il n'a plus
              besoin d'un panneau qui s'ouvre. */}
          {!ville && !enAttente && villes.length > 0 && (
            <p className="cal-note">
              {t.sonaaConnaitNVilles(villes.length)} {t.choixSurCetteMachine}{' '}
              <a href="#/profil">{t.votreProfil}</a>.
            </p>
          )}

          {ville && (
            <>
              <>
                {/* « ELARGIE » NE SE DIT QUE D'UN GENRE. Choisir Techno et
                    s'entendre repondre que la recherche a ete elargie a
                    « techno » serait absurde : elle n'a rien elargi du tout,
                    c'est ce qu'on a demande. */}
                {traduction?.elargi && styleInterroge && !EST_FAMILLE.has(styleInterroge) && (
                  <p className="cal-note">
                    {t.raNeDistinguePas}{' '}
                    <strong>{LABEL_DE_STYLE[styleInterroge] ?? styleInterroge}</strong>
                    {t.rechercheElargieA(traduction.valeur ?? '')}
                  </p>
                )}
                {traduction && traduction.valeur === null && styleInterroge && (
                  <p className="cal-note">
                    {t.aucunEquivalentDe}{' '}
                    <strong>{LABEL_DE_STYLE[styleInterroge] ?? styleInterroge}</strong>
                    {t.chezRaVoiciTout}
                  </p>
                )}
              </>

              {zoneRa == null ? (
                <p className="cal-note">
                  {t.raNeCouvrePas(ville.name)}
                </p>
              ) : panne ? (
                <p className="cal-panne">
                  {t.raNeRepondPas}{' '}
                  <button className="cal-lien" onClick={charger}>
                    {t.reessayer}
                  </button>
                </p>
              ) : chargement ? (
                <p className="cal-attente">{t.lectureAgenda}</p>
              ) : parJour.length === 0 ? (
                <p className="cal-note">
                  {enRecherche ? (
                    <>
                      {t.rienPourLaRechercheRa(rechercheRetardee, ville.name)}{' '}
                      <strong>{t.ilsNeCouvrentPasTout}</strong> : {t.peutLeurEchapper}
                    </>
                  ) : (
                    t.rienDAnnonce(quand, ville.name, traduction?.valeur ?? null)
                  )}
                </p>
              ) : (
                <>
                  <p className="cal-total">
                    {enRecherche && filtrees
                      ? t.compteurRecherche(filtrees.length, rechercheRetardee, ville.name)
                      : t.compteurSoirees(
                          total,
                          quand,
                          ville.name,
                          soirees && total > soirees.length ? t.lesNpremieres(soirees.length) : ''
                        )}
                  </p>
                  {/* ═══ UNE RECHERCHE NE SE RANGE PAS COMME UNE JOURNEE ═══
                   *
                   * Groupees par jour, les douze dates du Salon Daome
                   * donnaient douze titres de jour portant chacun UNE carte,
                   * dans une grille de trois colonnes : deux tiers de vide a
                   * chaque rangee, et un titre de section pour une seule
                   * ligne. Le groupement par jour suppose plusieurs soirees
                   * par jour ; une recherche de salle donne l'inverse, une
                   * soiree par jour sur des semaines.
                   *
                   * En recherche, la date passe donc DANS la ligne, et les
                   * lignes s'enchainent comme un horaire. Rien ne se perd :
                   * on lit la meme chose, en un tiers de la hauteur. */}
                  {enRecherche ? (
                    <ul className="cal-horaire">
                      {(filtrees ?? []).map((s) => {
                        const h = s.debut ? heureLocale(s.debut, fuseau) : null;
                        const sigle = ailleurs && s.debut ? sigleFuseau(s.debut, fuseau) : null;
                        return (
                          <li key={s.id} className="cal-ligne">
                            <span className="cal-ligne-quand">
                              <span className="cal-ligne-jour">{jourCourt(s.date, fuseau)}</span>
                              {h && (
                                <span className="cal-ligne-heure">
                                  {h}
                                  {sigle ? ` ${sigle}` : ''}
                                </span>
                              )}
                            </span>
                            {s.affiche ? (
                              <img
                                className="cal-ligne-affiche"
                                src={s.affiche}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                              />
                            ) : (
                              <div className="cal-ligne-affiche" aria-hidden="true" />
                            )}
                            <span className="cal-ligne-texte">
                              <a className="cal-titre" href={s.lien} target="_blank" rel="noreferrer">
                                {s.titre}
                              </a>
                              {s.artistes.length > 0 && (
                                <span className="cal-artistes">
                                  {s.artistes.slice(0, 5).join(', ')}
                                </span>
                              )}
                              <span className="cal-lieu">
                                {/* Le marqueur vit dans LES DEUX gabarits.
                                    Il n'etait que dans les cartes, et la
                                    recherche, qui affiche un horaire
                                    compact, ne le montrait pas : une soiree
                                    ajoutee a la main y passait pour une
                                    soiree de Resident Advisor. */}
                                {s.origine && s.origine !== 'ra' && (
                                  <span className="cal-origine">{NOM_DE_SOURCE[s.origine]}</span>
                                )}
                                {s.lieu ?? t.lieuNonAnnonce}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    parJour.map(([date, liste]) => (
                    <section key={date} className="cal-jour">
                      <h3>{jour(date, fuseau)}</h3>
                      <ul className="cal-liste">
                        {liste.map((s) => {
                          const h = s.debut ? heureLocale(s.debut, fuseau) : null;
                          const sigle = ailleurs && s.debut ? sigleFuseau(s.debut, fuseau) : null;
                          return (
                            <li key={s.id} className="cal-soiree">
                              {/* LA CARTE ENTIERE OUVRE LA FICHE, POCHETTE COMPRISE.
                                  Elle etait un lien vers un autre site : on
                                  cliquait sur un titre et on quittait SONAA
                                  pour lire ce que SONAA avait deja en base.
                                  La pochette, elle, n'etait cliquable nulle
                                  part, ce qui est le premier endroit ou l'on
                                  clique dans une grille d'affiches.

                                  C'est un bouton et non un lien : il n'emmene
                                  nulle part, il deplie. Un lien qui ne
                                  navigue pas ment a la barre d'etat, au clic
                                  du milieu et au clavier. */}
                              <button
                                type="button"
                                className="cal-ouvre"
                                onClick={() => setDepliee((v) => (v === s.id ? null : s.id))}
                                aria-expanded={depliee === s.id}
                                aria-controls={`detail-${s.id}`}
                              >
                                {s.affiche ? (
                                  <img
                                    className="cal-affiche"
                                    src={s.affiche}
                                    alt=""
                                    /* CHARGEMENT DIFFERE, ET C'EST LA SEULE
                                       ECONOMIE POSSIBLE : RA sert ses
                                       originaux, un a deux megaoctets piece,
                                       et ignore tout parametre de
                                       redimensionnement. */
                                    loading="lazy"
                                    decoding="async"
                                    draggable={false}
                                  />
                                ) : (
                                  <div className="cal-soiree-sans-affiche" aria-hidden="true" />
                                )}
                              </button>
                              <div className="cal-texte">
                                <button
                                  type="button"
                                  className="cal-titre cal-titre-bouton"
                                  onClick={() => setDepliee((v) => (v === s.id ? null : s.id))}
                                  aria-expanded={depliee === s.id}
                                  aria-controls={`detail-${s.id}`}
                                >
                                  {s.titre}
                                </button>
                                {/* LES NOMS AVANT LE LIEU. C'est le line-up
                                    qu'on cherche des yeux en parcourant une
                                    grille, la salle ne vient qu'ensuite, quand
                                    on a decide que la soiree l'interessait. */}
                                {s.artistes.length > 0 && (
                                  <p className="cal-artistes">{s.artistes.slice(0, 6).join(', ')}</p>
                                )}
                                <p className="cal-lieu">
                                  {/* LA PROVENANCE SE DIT, ET SEULEMENT
                                      QUAND ELLE APPREND QUELQUE CHOSE.
                                      Resident Advisor est deja nomme en tete
                                      de page ; le repeter sur chaque ligne
                                      serait du bruit. Une soiree ajoutee a
                                      la main, elle, ne vient pas de la, et
                                      celui qui la lit doit pouvoir le
                                      savoir. */}
                                  {s.origine && s.origine !== 'ra' && (
                                    <span className="cal-origine">{NOM_DE_SOURCE[s.origine]}</span>
                                  )}
                                  {s.lieu ?? t.lieuNonAnnonce}
                                  {h ? ` · ${h}${sigle ? ` ${sigle}` : ''}` : ''}
                                </p>
                                {s.genres.length > 0 && (
                                  <p className="cal-genres">{s.genres.join(' · ')}</p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </div>
        {/* LE PIED DE PAGE EST DANS LA COLONNE, PAS DEHORS.
            Il vivait apres </main>, donc a la largeur de la fenetre : ses
            quatre colonnes commencaient au bord gauche de l'ecran pendant que
            tout le reste de la page s'arretait a 1240 px. Mesure a 1440 px :
            pied a 1440 de large a x=0, contre 1240 a x=100 pour Credits et A
            propos, qui le placent DANS le main. Trois pages sur cinq avaient
            raison. */}
        <PiedDePage />
      </main>
    </>
  );
}
