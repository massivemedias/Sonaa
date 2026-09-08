/* LA LANGUE DE L'INTERFACE, decidee une fois au chargement.

   CE QUI EST TRADUIT ET CE QUI NE L'EST PAS, et la distinction est nette.

   L'INTERFACE est traduite : les boutons, les etats du lecteur, les libelles
   de navigation, tout ce que la machine dit d'elle-meme. Ces phrases sont
   ecrites ici, a la main, dans les deux langues.

   LE CORPUS NE L'EST PAS. Les 219 descriptions de genres sont un texte
   d'auteur, ecrit en francais, avec des choix de formulation qui portent des
   nuances de filiation. Les faire traduire par une machine reviendrait a
   publier sous le nom de Mika des phrases qu'il n'a pas ecrites et qu'il ne
   peut pas relire. Le projet refuse d'inventer une date ou un identifiant de
   video ; il refuse de la meme facon d'inventer sa propre prose. Les visiteurs
   dont le navigateur n'est pas en francais le lisent donc en francais, et
   l'interface le leur DIT au lieu de le laisser deviner.

   Les noms de genres ne sont pas traduits non plus : « Acid House » est un
   nom propre, pas une expression.

   AJOUTER UNE LANGUE tient en un objet de plus dans ce fichier. Le type
   force a le remplir en entier : il est impossible d'en publier un a moitie
   traduit sans que la compilation le refuse. */

export type Langue = 'fr' | 'en';

/* ON RESPECTE L'ORDRE DECLARE PAR LA PERSONNE, sans le corriger.

   J'avais d'abord ecrit l'inverse ici : que l'anglais en tete et le francais
   en second devait donner du francais, puisque le corpus est en francais. La
   mesure a montre que le code faisait autre chose, et c'est le code qui avait
   raison. Une liste de langues est un ordre de PREFERENCE ; la retourner
   revient a decider a la place de quelqu'un qu'il lira mieux dans sa seconde
   langue. L'avis en tete des descriptions dit ce qu'il faut savoir, et il
   suffit.

   On parcourt quand meme la liste entiere : un navigateur regle sur
   allemand puis francais recevra du francais, ce qui est bien sa preference
   parmi celles qu'on sait servir. */
/* ═══ LE CHOIX DE LA PERSONNE PASSE AVANT CELUI DE SON NAVIGATEUR ═══
 *
 * La detection reste, et elle reste en premiere position pour qui n'a rien
 * demande : c'est la meilleure supposition possible sans rien exiger. Mais
 * une supposition ne doit jamais l'emporter sur une decision. Quelqu'un qui
 * lit le francais depuis un ordinateur regle en anglais, au bureau, sur une
 * machine partagee, avait jusqu'ici le site en anglais et aucun moyen de le
 * dire.
 *
 * ON RECHARGE LA PAGE APRES LE CHOIX, ET C'EST ASSUME. Le dictionnaire est lu
 * au moment ou chaque module s'evalue : les libelles du menu, les groupes de
 * la navigation, les etiquettes du lecteur sont figes a l'import. Les rendre
 * reactifs demanderait de faire passer la langue par un contexte React et de
 * retoucher une centaine d'appels a `t`, pour un geste qu'on fait une fois
 * dans une visite. Un rechargement est honnete : il garantit qu'AUCUN
 * fragment ne reste dans l'ancienne langue, ce qu'une bascule partielle ne
 * garantit pas. L'adresse porte la route, donc on revient au meme endroit. */

const CLE_LANGUE = 'sonaa-langue';

function langueRangee(): Langue | null {
  try {
    const brut = localStorage.getItem(CLE_LANGUE);
    return brut === 'fr' || brut === 'en' ? brut : null;
  } catch {
    /* Navigation privee, stockage refuse : on retombe sur la detection. */
    return null;
  }
}

function langueDuNavigateur(): Langue {
  const liste =
    typeof navigator !== 'undefined' && Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [typeof navigator !== 'undefined' ? navigator.language : 'fr'];
  for (const l of liste) {
    const code = (l ?? '').slice(0, 2).toLowerCase();
    if (code === 'fr') return 'fr';
    if (code === 'en') return 'en';
  }
  /* Ni francais ni anglais : l'anglais porte plus loin comme langue de
     relais, et le corpus reste en francais de toute facon. */
  return 'en';
}

export const langue: Langue = langueRangee() ?? langueDuNavigateur();

/** Vrai quand la langue vient d'un choix explicite et non de la detection.
    Le selecteur s'en sert pour ne pas allumer un bouton que personne n'a
    presse : tant que rien n'est choisi, aucune des deux langues n'est
    « la sienne », meme si l'une des deux est affichee. */
export const langueEstChoisie: boolean = langueRangee() !== null;

/** Range le choix et recharge. Ne fait rien si c'est deja la langue en cours
    ET qu'elle avait ete choisie : recharger pour rien ferait clignoter la
    page sans rien changer. */
export function choisirLangue(voulue: Langue): void {
  if (voulue === langue && langueEstChoisie) return;
  try {
    localStorage.setItem(CLE_LANGUE, voulue);
  } catch {
    /* Sans stockage, le choix ne survivra pas au rechargement. On recharge
       quand meme : la page repartira sur la detection, ce qui est visible et
       donc comprehensible, alors qu'un bouton sans effet ne l'est pas. */
  }
  window.location.reload();
}

/* L'ATTRIBUT `lang` DE LA PAGE SUIT, et ce n'est pas une politesse. Il
   commande la coupure des mots, les guillemets des correcteurs, et surtout ce
   qu'un lecteur d'ecran prononce : un texte francais lu par une voix anglaise
   est litteralement incomprehensible. */
if (typeof document !== 'undefined') document.documentElement.lang = langue;

interface Dictionnaire {
  readonly parcourir: string;
  readonly revenir: string;
  readonly chercherUnGenre: string;
  readonly fermerRecherche: string;
  readonly nomDunGenre: string;
  readonly aucunGenreDeCeNom: string;
  readonly retourAtlas: string;
  /** « 219 genres, 14 familles. Appuyez sur une famille. » */
  readonly accroche: (genres: number, familles: number) => string;
  readonly genresAppuyez: (n: number) => string;
  readonly nGenres: (n: number) => string;
  readonly nDerives: (n: number) => string;
  readonly nMorceaux: (n: number) => string;
  readonly bpm: (bas: number, haut: number) => string;
  readonly ecouter: string;
  readonly pause: string;
  readonly lecture: string;
  readonly morceauPrecedent: string;
  readonly morceauSuivant: string;
  readonly aucunMorceau: string;
  readonly lectureEnCours: string;
  readonly origine: string;
  readonly chargement: string;
  readonly appuyezEncoreCourt: string;
  readonly appuyezEncore: string;
  readonly pisteIllisible: string;
  readonly aPropos: string;
  readonly credits: string;
  readonly index: string;
  readonly navigationDuSite: string;
  readonly choixDeLangue: string;
  readonly passerAuClair: string;
  readonly passerAuSombre: string;
  readonly villeLibelle: string;
  readonly nGenresSurTotal: (n: number, total: number) => string;
  readonly genresPrincipauxSur: (n: number, total: number) => string;
  readonly encoreNCaracteres: (n: number) => string;
  readonly nDerivesDirects: (n: number) => string;
  readonly derivesEtDescendance: (nom: string, d: number, total: number) => string;
  readonly releveDu: (quand: string) => string;
  readonly fondateurDeLaFamille: (famille: string) => string;
  readonly villeDattacheEnregistree: (ville: string) => string;
  readonly noteDeModeration: (note: string) => string;
  readonly nSoireesAVenir: (n: number) => string;
  readonly rienPourLaRechercheRa: (quoi: string, ville: string) => string;
  readonly rienDAnnonce: (quand: string, ville: string, style: string | null) => string;
  readonly raNeDistinguePas: string;
  readonly rechercheElargieA: (valeur: string) => string;
  readonly aucunEquivalentDe: string;
  readonly chezRaVoiciTout: string;
  readonly raNeCouvrePas: (ville: string) => string;
  readonly raNeRepondPas: string;
  readonly propositionEnregistree: string;
  readonly ouElleSoutenue: string;
  readonly propositionAccepteePasAuto: string;
  readonly toutVoir: string;
  readonly indexIntro: (familles: number, genres: number) => string;
  readonly genresDeLaFamille: (nom: string) => string;
  readonly pageDemandeConnexion: string;
  readonly pasModerateur: string;
  readonly propositionsEnAttenteTete: string;
  readonly corpusParCommit: string;
  readonly leGenre: string;
  readonly vuesParMorceau: string;
  readonly connecte: string;
  readonly enTantQue: (nom: string) => string;
  readonly sousLePseudonyme: (pseudo: string) => string;
  readonly virguleModerateur: string;
  readonly genresLeRevendiquent: (combien: number) => string;
  readonly aucuneVilleDeCeNom: (combien: number) => string;
  readonly peutLeurEchapper: string;
  readonly roleOrigine: string;
  readonly roleCanon: string;
  readonly legendeOrigine: string;
  readonly installerIosAvant: string;
  readonly partager: string;
  readonly installerIosApres: string;
  readonly compris: string;
  readonly fermerLaFiche: string;
  readonly stylesDeCetArtiste: string;
  readonly lesArtistesDuStyle: string;
  /** La provenance ET la date : un relevé sans date se lit comme une vérité
      intemporelle. */
  readonly artistesDouVientLaListe: (quand: string) => string;
  readonly moisPrecedent: string;
  readonly moisSuivant: string;
  readonly choixSurCetteMachine: string;
  readonly effacer: string;
  /** « SONAA connaît 23 villes. » Le nombre change, la phrase aussi. */
  readonly sonaaConnaitNVilles: (n: number) => string;
  readonly voirLaFiche: string;
  readonly replierLaFiche: string;
  readonly plateau: string;
  readonly ouLibelle: string;
  readonly quandLibelle: string;
  readonly combien: string;
  readonly organisePar: string;
  readonly lAnnonce: string;
  readonly pasDeDetailIci: string;
  readonly ouvrirChezLaSource: string;
  readonly jusqua: string;
  readonly echap: string;
  readonly moderationMenu: string;
  readonly deconnexion: string;
  readonly reessayer: string;
  readonly pastilleParentAutreFamille: string;
  readonly parFamille: string;
  readonly parEpoque: string;
  readonly aucunCommentaireSignale: string;
  readonly seConnecterDiscussion: string;
  readonly proposerUneTrack: string;
  readonly signalerUneCorrection: string;
  readonly lienConnexionPartiVers: string;
  readonly allerListeFamilles: string;
  readonly chaineChronologiqueCourt: string;
  readonly nonDisponibleSurCetteVersion: string;
  readonly elleAjouteLesDecisions: string;
  readonly lecteurPasCharge: string;
  readonly seConnecterPourVoter: string;
  readonly referenceEtablie: string;
  readonly medianeDe: string;
  readonly sourceIndiquee: string;
  readonly reporteeDansLeCorpus: string;
  readonly filtreSur: string;
  readonly seDeconnecter: string;
  readonly mettreAJour: string;
  readonly plusTard: string;
  readonly ecouterCourt: string;
  readonly voirSurLaCarte: string;
  readonly tuSaisDansQuelGenre: string;
  readonly choisirGenreEtProposer: string;
  readonly chercheLeGenreCiDessus: string;
  readonly artistesSepares: string;
  readonly stylesSepares: string;
  readonly aujourdhuiOnglet: string;
  readonly finDeSemaineOnglet: string;
  readonly joursSuivantsOnglet: string;
  readonly quandAujourdhui: string;
  readonly quandWeekend: string;
  readonly quandSuite: string;
  readonly ledeCalendrier: string;
  readonly changerDeVille: string;
  readonly fermerCourt: string;
  readonly tousLesStyles: string;
  readonly lectureAgenda: string;
  readonly lieuNonAnnonce: string;
  readonly ajouteeALaMain: string;
  readonly choisirTiret: string;
  /** « 4 soirées aujourd’hui à Montréal. » Le pluriel n'est pas le meme
      dans les deux langues, la phrase est donc construite ici. */
  readonly compteurSoirees: (n: number, quand: string, ville: string, reste: string) => string;
  readonly compteurRecherche: (n: number, quoi: string, ville: string) => string;
  readonly lesNpremieres: (n: number) => string;
  readonly styleAvecNombre: (n: number) => string;

  /* ═══ L'INTERFACE, TRADUITE POUR DE VRAI ═══
     Mika a teste en anglais et a vu ce qui restait en francais. Ces cent huit
     libelles etaient ecrits en dur dans vingt-trois composants : le selecteur
     de langue les traversait sans les voir. Ils passent tous par ici
     maintenant, ce qui rend le controle de type utile : il devient impossible
     d'en ajouter un dans une seule langue. */
  readonly revenirAccueil: string;
  readonly sonaaRevenirAccueil: string;
  readonly chercherUnGenreCourt: string;
  readonly chercherGenreArbre: string;
  readonly sonaaRevenirAtlas: string;
  readonly revenirAtlasCourt: string;
  readonly remonterNiveau: string;
  readonly deployerChemin: string;
  readonly replierChemin: string;
  readonly controlesNavigation: string;
  readonly chercherGenreArtisteLabel: string;
  readonly zoomArriere: string;
  readonly zoomArriereTouche: string;
  readonly ouvrirIndex: string;
  readonly aideChercher: string;
  readonly aideOuvrirGenre: string;
  readonly aideSeDeplacer: string;
  readonly aideRemonter: string;
  readonly aideVueEnsemble: string;
  readonly aideOuvrirDerives: string;
  readonly chercherSalleArtisteSoiree: string;
  readonly chercherDansAffichees: string;
  readonly unInstant: string;
  readonly choisissezVille: string;
  readonly unJour: string;
  readonly surTroisMois: string;
  readonly votreProfil: string;
  readonly ilsNeCouvrentPasTout: string;
  readonly parentAutreFamille: string;
  readonly chaineChronologique: string;
  readonly ouvrirTracksEtFiche: string;
  readonly filiationDebattue: string;
  readonly identifiantDuGenre: string;
  readonly commentairesSignales: string;
  readonly fermerRouvrirCommentaires: string;
  readonly lectureDeLaFile: string;
  readonly masqueCourt: string;
  readonly placeholderCommentaire: string;
  readonly ecrireUnMessage: string;
  readonly desapprouver: string;
  readonly commentairesFermes: string;
  readonly personneNaEcrit: string;
  readonly messageRetire: string;
  readonly aSoutenirOuContester: string;
  readonly nomSurLaSortie: string;
  readonly surQuoiVousAppuyez: string;
  readonly lesPropositionsEnAttente: string;
  readonly ceQuiDoitChanger: string;
  readonly ceQuiDevraitEtreEcrit: string;
  readonly leGenreDontIlDescend: string;
  readonly choisirUnGenre: string;
  readonly votreAdresse: string;
  readonly neeDe: string;
  readonly aDonne: string;
  readonly revenirNavigation: string;
  readonly genresDansLeTemps: string;
  readonly moderation: string;
  readonly revenirAccueilTexte: string;
  readonly lesPropositions: string;
  readonly laPageDesPropositions: string;
  readonly accepterNePublieRien: string;
  readonly laFileEstVide: string;
  readonly rouvrirLecteur: string;
  readonly reglerLargeurColonne: string;
  readonly fermerLecteur: string;
  readonly profilCourt: string;
  readonly nomDunGenreOuArtiste: string;
  readonly ongletCompte: string;
  readonly ongletSets: string;
  readonly ongletEvenements: string;
  readonly mesPropositions: string;
  readonly ajouterUneSoiree: string;
  readonly ajouterCourt: string;
  readonly ajouterSoireeIntro: string;
  readonly connexionPourAjouter: string;
  readonly titreLibelle: string;
  readonly dateLibelle: string;
  readonly heureLibelle: string;
  readonly salleLibelle: string;
  readonly afficheLibelle: string;
  readonly choisirUneAffiche: string;
  readonly changerLAffiche: string;
  readonly retirerLAffiche: string;
  readonly afficheAide: string;
  readonly lienBillets: string;
  readonly annonceLibelle: string;
  readonly enregistrementEnCours: string;
  readonly enregistrementImpossible: string;
  readonly ajouterLaSoiree: string;
  readonly ilFautTitreEtDate: string;
  readonly imagePourInstagram: string;
  readonly imageEnCours: string;
  readonly imagePrete: string;
  readonly imageImpossible: string;
  readonly copierLeTexteDuPost: string;
  readonly texteCopie: string;
  readonly copieImpossible: string;
  readonly retirerLaSoiree: string;
  readonly confirmerRetraitSoiree: string;
  readonly retraitImpossible: string;
  readonly mesSoirees: string;
  readonly mesSoireesIntro: string;
  readonly aucuneSoireeDeposee: string;
  readonly soireeDepubliee: string;
  readonly lectureImpossible: string;
  readonly sourceMembre: string;
  readonly ouvrirLecteur: string;
  readonly precedente: string;
  readonly positionDansLaTrack: string;
  readonly ouvrirSurYoutube: string;
  readonly reduireLecteur: string;
  readonly rouvrirColonneGenre: string;
  readonly arreter: string;
  readonly filiationDebattueMinuscule: string;
  readonly ficheARelire: string;
  readonly auditeursLastfm: string;
  readonly peuDocumenteLastfm: string;
  readonly ficheEnBrouillon: string;
  readonly sansLabelFondateur: string;
  readonly aucunNeProduitPlus: string;
  readonly artistesCles: string;
  readonly conventionArbre: string;
  readonly rienUneFeuille: string;
  readonly charnieres: string;
  readonly aussiRevendiquee: string;
  readonly aussiAppele: string;
  readonly votreVille: string;
  readonly aucuneVilleEnregistree: string;
  readonly soutenirProposition: string;
  readonly contesterProposition: string;
  readonly noteModerationFacultative: string;
  readonly noteModeration: string;
  readonly votreProposition: string;
  readonly proposeLe: string;
  readonly propositionAccepteeNentrePas: string;
  readonly voirTousLesGenres: string;
  readonly fileDeModeration: string;
  readonly lectureDesPropositions: string;
  readonly nouvelleVersionPrete: string;
  readonly installerSonaa: string;
  readonly surEcranAccueil: string;
  readonly revenirRecherche: string;
  readonly chercherGenreArtisteTrackLabel: string;
  readonly morceauPasDansAtlas: string;
  readonly rienNeCorrespond: string;
  readonly soireesAjouteesMain: string;
  readonly lesQuatorzeFamilles: string;
  readonly choisirLaVue: string;
  readonly cliquezUneVue: string;
  readonly enFrancais: string;
  readonly enAnglais: string;
  readonly chemin: string;
  /* Le seul endroit ou l'interface avoue une limite : les textes de genres
     sont en francais et ne seront pas traduits par une machine. */
  readonly texteEnFrancais: string | null;
  readonly machines: string;
  readonly sonorites: string;
  readonly labels: string;
  readonly artistes: string;
  readonly aPropSujet: string;
  readonly cettePiste: string;
  readonly lHistoire: string;
  readonly laFabrication: string;
  readonly ficheTechnique: string;
  readonly tempo: string;
  readonly apparition: string;
  readonly descendance: string;
  readonly nGenresDerives: (n: number) => string;
  readonly vers: string;
  readonly motDeLAuteur: string;
  readonly positionDansLeMorceau: string;
  readonly reculer: string;
  readonly avancer: string;
  readonly seConnecter: string;
  readonly connexion: string;
  readonly fermer: string;
  readonly usageConnexion: string;
  readonly continuerGoogle: string;
  readonly ou: string;
  readonly lienParti: string;
  readonly tonAdresse: string;
  readonly envoiEnCours: string;
  readonly recevoirLien: string;
  readonly promesseDonnees: string;
  /* Etats du lecteur, cote moteur. */
  readonly erreurRetiree: string;
  readonly erreurNonAutorisee: string;
  readonly erreurIdentifiant: string;
  readonly erreurIllisible: string;
  readonly passageSuivant: string;
  readonly aucuneLisible: string;
  readonly sansVideo: string;
  readonly lecteurBloque: string;
  readonly lecteurIndisponible: string;
  readonly googleNonConfiguree: string;
  readonly lienPerime: string;
  readonly connexionRefusee: string;
  readonly connexionEchouee: string;

  /* ── Les sets DJ ── */
  readonly lesSets: string;
  readonly monProfil: string;
  readonly baseIndisponible: string;
  readonly connexionRequiseProfil: string;
  readonly identitePublique: string;
  readonly changerLaPhoto: string;
  readonly photoLimite: string;
  readonly nomDArtiste: string;
  readonly nomDArtistePlaceholder: string;
  readonly presentation: string;
  readonly enregistrer: string;
  readonly creerMonProfil: string;
  readonly nomRequis: string;
  readonly profilEnregistre: string;
  readonly photoEnregistree: string;
  readonly artisteSansNom: string;
  readonly formatImageRefuse: string;
  readonly imageTropLourde: (taille: string) => string;
  readonly deposerUnSet: string;
  readonly limitesDepot: (max: string) => string;
  readonly fichierAudio: string;
  readonly titreDuSet: string;
  readonly genresDuSet: (n: number) => string;
  readonly choisirLesStyles: string;
  readonly changerLesStyles: string;
  readonly fermerLesStyles: string;
  readonly chercherUnStyle: string;
  readonly aucunStyleTrouve: string;
  readonly pochette: string;
  readonly deposerUnePochette: string;
  readonly pochetteAide: string;
  readonly retirerLaPochette: string;
  readonly pochetteCompressee: (avant: string, apres: string) => string;
  readonly fermerLImage: string;
  readonly modifier: string;
  readonly annuler: string;
  readonly titreRequis: string;
  readonly changementsNonEnregistres: string;
  readonly retirerLeStyle: (nom: string) => string;
  readonly lesArtistes: string;
  readonly lesSons: string;
  readonly piedParcourir: string;
  readonly piedParticiper: string;
  readonly piedLeProjet: string;
  readonly piedIndex: string;
  readonly piedPropositions: string;
  readonly piedCode: string;
  readonly piedMot: string;
  readonly stockageUtilise: (u: string, max: string) => string;
  readonly stockageSansLimite: (u: string) => string;
  readonly voirTousLesArtistes: (n: number) => string;
  readonly nSets: (n: number) => string;
  readonly aucunArtiste: string;
  readonly setsDeLaCommunaute: string;
  readonly voirLArtiste: string;
  readonly artisteIntrouvable: string;
  readonly retourAuxArtistes: string;
  readonly lesStyles: string;
  readonly leCalendrier: string;
  readonly leJeu: string;
  readonly derniersSets: string;
  readonly descriptionFacultative: string;
  readonly deposer: string;
  readonly etapeOnde: string;
  readonly etapeEnvoi: string;
  readonly etapeEnvoiPourcent: (n: number) => string;
  readonly etapeLigne: string;
  readonly formatAudioRefuse: string;
  readonly audioTropLourd: (taille: string, max: string) => string;
  readonly setDepose: string;
  readonly mesSets: (n: number) => string;
  readonly aucunSetDepose: string;
  readonly aucunSetPublie: string;
  readonly dureeInconnue: string;
  readonly publie: string;
  readonly brouillon: string;
  readonly nEcoutes: (n: number) => string;
  readonly publier: string;
  readonly depublier: string;
  readonly supprimer: string;
  readonly confirmerSuppression: (titre: string) => string;
  readonly setIntrouvable: string;
  readonly retourAuxSets: string;
  readonly setIllisible: string;
  readonly avancerDansLeSet: string;
  /** Unite de taille de fichier. « Mo » en francais, « MB » en anglais : le
      chiffre etait bon mais l'unite restait francaise dans l'interface
      anglaise, ce qui se lit comme une faute de frappe. */
  readonly uniteMo: string;
  readonly uniteGo: string;
  readonly deposerOuCliquer: string;
  readonly deposerLeFichier: string;
  readonly formatsAcceptes: string;
  readonly sansPerte: string;
  readonly aiffRefuse: string;
  readonly sansPerteTropLourd: (
    taille: string,
    max: string,
    minutesWav: number,
    minutesFlac: number
  ) => string;
}

const FR: Dictionnaire = {
  parcourir: 'Parcourir',
  revenir: 'Revenir',
  chercherUnGenre: 'Chercher un genre',
  fermerRecherche: 'Fermer la recherche',
  nomDunGenre: "Nom d'un genre",
  aucunGenreDeCeNom: 'Aucun genre de ce nom.',
  retourAtlas: "SONAA, revenir à l'accueil",
  accroche: (g, f) => `${g} genres, ${f} familles. Appuyez sur une famille.`,
  genresAppuyez: (n) => `${n} genres. Appuyez pour ouvrir.`,
  nGenres: (n) => `${n} genres`,
  nDerives: (n) => `${n} dérivé${n > 1 ? 's' : ''}`,
  nMorceaux: (n) => `${n} morceau${n > 1 ? 'x' : ''}`,
  bpm: (b, h) => `${b} à ${h} BPM`,
  ecouter: 'Écouter',
  pause: 'Pause',
  lecture: 'Lecture',
  morceauPrecedent: 'Morceau précédent',
  morceauSuivant: 'Morceau suivant',
  aucunMorceau: "Aucun morceau n'est encore renseigné pour ce genre.",
  lectureEnCours: 'Lecture en cours',
  origine: 'origine',
  chargement: 'Chargement…',
  appuyezEncoreCourt: 'Appuyez encore pour le son',
  appuyezEncore: 'Appuyez encore pour lancer le son.',
  pisteIllisible: 'Piste illisible',
  aPropos: 'À propos',
  credits: 'Crédits',
  index: 'Index',
  navigationDuSite: 'Navigation du site',
  choixDeLangue: 'Langue de l’interface',
  passerAuClair: 'Passer au thème clair',
  passerAuSombre: 'Passer au thème sombre',
  villeLibelle: "Ville",
  nGenresSurTotal: (n, total) => `${n} genre${n > 1 ? 's' : ''} sur ${total}`,
  genresPrincipauxSur: (n, total) => `Genres principaux (${n} sur ${total})`,
  encoreNCaracteres: (n) => `encore ${n} caractère${n > 1 ? 's' : ''}`,
  nDerivesDirects: (n) => `${n} dérivé${n > 1 ? 's' : ''} direct${n > 1 ? 's' : ''}`,
  derivesEtDescendance: (nom, d, total) => `${nom} · ${d} dérivé${d > 1 ? 's' : ''} direct${d > 1 ? 's' : ''}, ${total} genre${total > 1 ? 's' : ''} au total`,
  releveDu: (quand) => ` · relevé du ${quand}`,
  fondateurDeLaFamille: (famille) => `fondateur de la famille ${famille}`,
  villeDattacheEnregistree: (ville) => `Ville d’attache enregistrée : ${ville}.`,
  noteDeModeration: (note) => `Note de modération : ${note}`,
  nSoireesAVenir: (n) => `${n} soirée${n > 1 ? 's' : ''} à venir`,
  rienPourLaRechercheRa: (quoi, ville) => `Rien qui corresponde à « ${quoi} » parmi les soirées que Resident Advisor annonce à ${ville} sur les trois prochains mois.`,
  rienDAnnonce: (quand, ville, style) => `Rien d’annoncé ${quand} à ${ville}${style ? ` en ${style}` : ''}. Regardez les jours suivants, ou changez de style.`,
  raNeDistinguePas: "Resident Advisor ne distingue pas",
  rechercheElargieA: (valeur) => ` : la recherche a été élargie à « ${valeur} ».`,
  aucunEquivalentDe: "Aucun équivalent de",
  chezRaVoiciTout: " chez Resident Advisor : voici tout ce qui se joue en ville.",
  raNeCouvrePas: (ville) => `Resident Advisor ne couvre pas ${ville}. La ville reste dans SONAA, ses soirées viendront d’ailleurs.`,
  raNeRepondPas: "Resident Advisor ne répond pas. Ce n’est pas une ville sans soirées : c’est la source qui est muette.",
  propositionEnregistree: "Proposition enregistrée. Elle apparaît dès maintenant dans",
  ouElleSoutenue: ", où elle peut être soutenue ou contestée avant d’être tranchée.",
  propositionAccepteePasAuto: "Une proposition acceptée n’entre pas automatiquement dans l’atlas : elle est reportée à la main dans le corpus, avec ses sources.",
  toutVoir: "tout voir",
  indexIntro: (familles, genres) => `Navigation hiérarchique des ${familles} familles et de leurs ${genres} genres. Même contenu et mêmes liens que l’espace, sans la matière.`,
  genresDeLaFamille: (nom) => `Genres de la famille ${nom}`,
  pageDemandeConnexion: "Cette page demande une connexion. Elle ne montre rien de plus que",
  pasModerateur: "Votre compte n’est pas modérateur. La file ci-dessous est de toute façon publique : elle est visible sur",
  propositionsEnAttenteTete: "Les propositions en attente, la plus soutenue en tête.",
  corpusParCommit: " : le corpus se modifie par commit, avec ses sources. Marquez « reportée dans le corpus » une fois le travail réellement fait.",
  leGenre: "Le genre",
  vuesParMorceau: "vues par morceau sur YouTube",
  connecte: "Connecté",
  enTantQue: (nom) => ` en tant que ${nom}`,
  sousLePseudonyme: (pseudo) => ` sous le pseudonyme ${pseudo}`,
  virguleModerateur: ", modérateur",
  genresLeRevendiquent: (combien) => `${combien} genres le revendiquent, la scène ne tranche pas`,
  aucuneVilleDeCeNom: (combien) => `Aucune ville de ce nom. SONAA en connaît ${combien} pour le moment.`,
  peutLeurEchapper: "une soirée qui passe de la techno sans se dire soirée techno peut leur échapper.",
  roleOrigine: "origine",
  roleCanon: "canon",
  legendeOrigine: "le morceau qui fonde le genre",
  installerIosAvant: "Pour garder SONAA sur votre écran d’accueil : touchez",
  partager: "Partager",
  installerIosApres: "en bas de l’écran, puis",
  compris: "Compris",
  fermerLaFiche: "Fermer la fiche",
  stylesDeCetArtiste: "Styles de cet artiste",
  lesArtistesDuStyle: "Les artistes de ce style",
  artistesDouVientLaListe: (quand) =>
    `Classés par nombre d’auditeurs chez Last.fm, et retenus quand leurs disques confirment le style chez Discogs. Relevé du ${quand}.`,
  moisPrecedent: "Mois précédent",
  moisSuivant: "Mois suivant",
  choixSurCetteMachine:
    "Le choix reste sur cette machine ; pour le garder d’un appareil à l’autre, mettez-le dans",
  effacer: "Effacer",
  sonaaConnaitNVilles: (n) => `SONAA connaît ${n} villes.`,
  voirLaFiche: "Voir la fiche complète",
  replierLaFiche: "Replier",
  plateau: "Plateau",
  ouLibelle: "Où",
  quandLibelle: "Quand",
  combien: "Combien",
  organisePar: "Organisé par",
  lAnnonce: "L’annonce",
  pasDeDetailIci: "Resident Advisor ne donne pas le détail de cette soirée à SONAA. Ce qui est ci-dessus est tout ce qu’il annonce.",
  ouvrirChezLaSource: "Ouvrir chez la source",
  jusqua: "jusqu’à",
  echap: "Échap",
  moderationMenu: "Modération",
  deconnexion: "Déconnexion",
  reessayer: "Réessayer",
  pastilleParentAutreFamille: "Une pastille signale un parent d'une autre famille",
  parFamille: "Par famille",
  parEpoque: "Par époque",
  aucunCommentaireSignale: "Aucun commentaire signalé. La file ne montre que les messages signalés ou masqués.",
  seConnecterDiscussion: "Se connecter pour participer à la discussion",
  proposerUneTrack: "Proposer une track",
  signalerUneCorrection: "Signaler une correction",
  lienConnexionPartiVers: "Un lien de connexion vient de partir vers",
  allerListeFamilles: "Aller à la liste des familles",
  chaineChronologiqueCourt: "Chaîne chronologique",
  nonDisponibleSurCetteVersion: "Non disponible sur cette version du site.",
  elleAjouteLesDecisions: ", elle ajoute les décisions.",
  lecteurPasCharge: "Le lecteur YouTube n’a pas pu se charger. La pochette reste affichée.",
  seConnecterPourVoter: "Se connecter pour voter et proposer des morceaux",
  referenceEtablie: "une référence établie",
  medianeDe: "médiane de",
  sourceIndiquee: "source indiquée",
  reporteeDansLeCorpus: "Reportée dans le corpus",
  filtreSur: "Filtré sur",
  seDeconnecter: "Se déconnecter",
  mettreAJour: "Mettre à jour",
  plusTard: "Plus tard",
  ecouterCourt: "Écouter",
  voirSurLaCarte: "Voir sur la carte",
  tuSaisDansQuelGenre: "Tu sais dans quel genre il va ? Propose-le, on le relira.",
  choisirGenreEtProposer: "Choisir le genre et proposer",
  chercheLeGenreCiDessus: "Cherche le genre ci-dessus, ouvre-le, puis « Proposer une track ».",
  artistesSepares: "Artistes, séparés par des virgules",
  stylesSepares: "Styles, séparés par des virgules",
  aujourdhuiOnglet: "Aujourd’hui",
  finDeSemaineOnglet: "Fin de semaine",
  joursSuivantsOnglet: "Les jours suivants",
  quandAujourdhui: "aujourd’hui",
  quandWeekend: "en fin de semaine",
  quandSuite: "dans les jours qui viennent",
  ledeCalendrier: "Ce qui se joue dans votre ville, dans les styles que vous suivez. Les soirées viennent de Resident Advisor, de Ticketmaster, de Shotgun, d’Eventbrite, de Lepointdevente et de saisies à la main ; chaque titre renvoie à sa source, et la pastille dit laquelle.",
  changerDeVille: "Changer de ville",
  fermerCourt: "Fermer",
  tousLesStyles: "Tous les styles",
  lectureAgenda: "Lecture de l’agenda…",
  lieuNonAnnonce: "Lieu non annoncé",
  ajouteeALaMain: "ajoutée à la main",
  choisirTiret: "Choisir…",
  compteurSoirees: (n, quand, ville, reste) =>
    `${n} soirée${n > 1 ? 's' : ''} ${quand} à ${ville}${reste}.`,
  compteurRecherche: (n, quoi, ville) =>
    `${n} soirée${n > 1 ? 's' : ''} pour « ${quoi} » à ${ville}, sur les trois prochains mois.`,
  lesNpremieres: (n) => `, les ${n} premières`,
  styleAvecNombre: (n) => `Styles (${n})`,

  revenirAccueil: "Revenir à l’accueil",
  sonaaRevenirAccueil: "SONAA, revenir à l’accueil",
  chercherUnGenreCourt: "Chercher un genre",
  chercherGenreArbre: "Chercher un genre dans l’arbre",
  sonaaRevenirAtlas: "SONAA, revenir à la vue Atlas",
  revenirAtlasCourt: "Revenir à l’Atlas",
  remonterNiveau: "Remonter d’un niveau",
  deployerChemin: "Déployer le chemin complet",
  replierChemin: "Replier le chemin",
  controlesNavigation: "Contrôles de navigation",
  chercherGenreArtisteLabel: "Chercher un genre, un artiste, un label",
  zoomArriere: "Zoom arrière",
  zoomArriereTouche: "Zoom arrière (-)",
  ouvrirIndex: "Ouvrir l’index, navigation complète des familles et des genres",
  aideChercher: "chercher un genre, un artiste, un label",
  aideOuvrirGenre: "ouvrir un genre, ses tracks et ses dérivés",
  aideSeDeplacer: "se déplacer",
  aideRemonter: "remonter d’un niveau",
  aideVueEnsemble: "revenir à la vue d’ensemble",
  aideOuvrirDerives: "ouvrir un genre et ses dérivés",
  chercherSalleArtisteSoiree: "Chercher une salle, un artiste, une soirée",
  chercherDansAffichees: "Chercher dans les soirées affichées",
  unInstant: "Un instant…",
  choisissezVille: "Choisissez une ville.",
  unJour: "Un jour",
  surTroisMois: "sur les trois prochains mois",
  votreProfil: "votre profil",
  ilsNeCouvrentPasTout: "Ils ne couvrent pas tout",
  parentAutreFamille: "Parent d’une autre famille",
  chaineChronologique: "Chaîne chronologique",
  ouvrirTracksEtFiche: "Ouvrir les tracks et la fiche du genre",
  filiationDebattue: "Filiation débattue",
  identifiantDuGenre: "identifiant du genre, par exemple dubtechno",
  commentairesSignales: "Commentaires signalés",
  fermerRouvrirCommentaires: "Fermer ou rouvrir les commentaires d’un genre",
  lectureDeLaFile: "Lecture de la file…",
  masqueCourt: "masqué",
  placeholderCommentaire: "Ce que tu sais de ce genre, ce que tu écoutes.",
  ecrireUnMessage: "Écrire un message",
  desapprouver: "Désapprouver",
  commentairesFermes: "Les commentaires sont fermés sur ce genre.",
  personneNaEcrit: "Personne n’a encore écrit sur ce genre.",
  messageRetire: "Message retiré par la modération.",
  aSoutenirOuContester: "à soutenir ou contester",
  nomSurLaSortie: "Nom tel qu’il figure sur la sortie",
  surQuoiVousAppuyez: "Sur quoi vous appuyez-vous ? Une pochette, une interview, une date de sortie, une écoute.",
  lesPropositionsEnAttente: "les propositions en attente",
  ceQuiDoitChanger: "Ce qui doit changer",
  ceQuiDevraitEtreEcrit: "Ce qui devrait être écrit",
  leGenreDontIlDescend: "Le genre dont il descend, selon vous",
  choisirUnGenre: "Choisir un genre…",
  votreAdresse: "Votre adresse",
  neeDe: "Née de",
  aDonne: "A donné",
  revenirNavigation: "Revenir a la navigation",
  genresDansLeTemps: "les genres dans le temps, par famille",
  moderation: "Modération",
  revenirAccueilTexte: "Revenir à l’accueil",
  lesPropositions: "les propositions",
  laPageDesPropositions: "la page des propositions",
  accepterNePublieRien: "Accepter ne publie rien",
  laFileEstVide: "La file est vide.",
  rouvrirLecteur: "Rouvrir le lecteur",
  reglerLargeurColonne: "Régler la largeur de la colonne, flèches gauche et droite",
  fermerLecteur: "Fermer le lecteur",
  profilCourt: "Profil",
  nomDunGenreOuArtiste: "Un genre, un artiste…",
  ongletCompte: "Compte",
  ongletSets: "Sets",
  ongletEvenements: "Événements",
  mesPropositions: "Mes propositions",
  ajouterUneSoiree: "Ajouter un événement",
  ajouterCourt: "Ajouter un événement",
  ajouterSoireeIntro: "Elle apparaît dans le calendrier tout de suite, avec la mention « membre ». Vous pourrez ensuite en tirer l’image pour Instagram depuis sa fiche ou depuis votre profil.",
  connexionPourAjouter: "Pour ajouter une soirée, connectez-vous : elle sera rattachée à votre compte, et vous seul pourrez la retirer.",
  titreLibelle: "Titre",
  dateLibelle: "Date",
  heureLibelle: "Heure de début",
  salleLibelle: "Salle",
  afficheLibelle: "Affiche",
  choisirUneAffiche: "Choisir une affiche",
  changerLAffiche: "Changer l’affiche",
  retirerLAffiche: "Retirer l’affiche",
  afficheAide: "JPEG, PNG ou WebP. Le format carré ou 4:5 donne la plus belle story.",
  lienBillets: "Lien pour les billets",
  annonceLibelle: "Annonce",
  enregistrementEnCours: "Enregistrement…",
  enregistrementImpossible: "Enregistrement impossible.",
  ajouterLaSoiree: "Ajouter la soirée",
  ilFautTitreEtDate: "Il faut au moins un titre et une date.",
  imagePourInstagram: "Image pour Instagram (9:16)",
  imageEnCours: "L’image se dessine…",
  imagePrete: "Image prête : elle est dans vos téléchargements, et ci-dessous. Sur téléphone, appuyez longuement dessus pour l’enregistrer.",
  imageImpossible: "L’image n’a pas pu être dessinée.",
  copierLeTexteDuPost: "Copier le texte du post",
  texteCopie: "Texte copié. Collez-le dans la légende de votre post ou de votre story.",
  copieImpossible: "Copie impossible dans ce navigateur.",
  retirerLaSoiree: "Retirer la soirée",
  confirmerRetraitSoiree: "Retirer cette soirée du calendrier ? Elle ne pourra pas être récupérée.",
  retraitImpossible: "Retrait impossible.",
  mesSoirees: "Mes soirées",
  mesSoireesIntro: "Les soirées que vous avez ajoutées au calendrier. Pour chacune, l’image 9:16 pour Instagram et le texte du post.",
  aucuneSoireeDeposee: "Aucune soirée à venir. Ajoutez-en une depuis le calendrier.",
  soireeDepubliee: "Retirée du calendrier par un modérateur",
  lectureImpossible: "Lecture impossible.",
  sourceMembre: "membre",
  ouvrirLecteur: "Ouvrir le lecteur",
  precedente: "Précédente",
  positionDansLaTrack: "Position dans la track",
  ouvrirSurYoutube: "Ouvrir sur YouTube",
  reduireLecteur: "Réduire le lecteur",
  rouvrirColonneGenre: "Rouvrir la colonne du genre",
  arreter: "Arrêter",
  filiationDebattueMinuscule: "filiation débattue",
  ficheARelire: "fiche à relire",
  auditeursLastfm: "auditeurs sur Last.fm",
  peuDocumenteLastfm: "peu documenté sur Last.fm",
  ficheEnBrouillon: "fiche en brouillon, à relire",
  sansLabelFondateur: "sans label fondateur identifié",
  aucunNeProduitPlus: "aucun, le genre ne produit plus",
  artistesCles: "Artistes clés",
  conventionArbre: "par convention d’arbre, ce n’est pas une filiation",
  rienUneFeuille: "rien, c’est une feuille",
  charnieres: "Charnières",
  aussiRevendiquee: "aussi revendiquée par",
  aussiAppele: "Aussi appelé",
  votreVille: "Votre ville",
  aucuneVilleEnregistree: "Aucune ville enregistrée.",
  soutenirProposition: "Soutenir cette proposition",
  contesterProposition: "Contester cette proposition",
  noteModerationFacultative: "Note de modération, facultative",
  noteModeration: "Note de modération",
  votreProposition: "votre proposition",
  proposeLe: "Proposé :",
  propositionAccepteeNentrePas: "Une proposition acceptée n’entre pas d’elle-même dans l’atlas",
  voirTousLesGenres: "Voir tous les genres",
  fileDeModeration: "File de modération",
  lectureDesPropositions: "Lecture des propositions…",
  nouvelleVersionPrete: "Une nouvelle version de l’atlas est prête.",
  installerSonaa: "Installer SONAA pour l’ouvrir hors ligne, sans barre de navigateur.",
  surEcranAccueil: "Sur l’écran d’accueil",
  revenirRecherche: "Revenir à la recherche",
  chercherGenreArtisteTrackLabel: "Chercher un genre, un artiste, un track ou un label",
  morceauPasDansAtlas: "Ce morceau n’est pas encore dans l’atlas.",
  rienNeCorrespond: "Rien ne correspond.",
  soireesAjouteesMain: "Soirées ajoutées à la main",
  lesQuatorzeFamilles: "Les quatorze familles",
  choisirLaVue: "Choisir la vue",
  cliquezUneVue: "Cliquez une vue pour entrer dans la carte :",
  enFrancais: 'Afficher l’interface en français',
  enAnglais: 'Afficher l’interface en anglais',
  chemin: 'Chemin',
  texteEnFrancais: null,
  machines: 'Machines',
  sonorites: 'Le son',
  labels: 'Labels',
  artistes: 'Artistes',
  aPropSujet: 'Le genre',
  cettePiste: 'Cette piste',
  lHistoire: 'L\u2019histoire',
  laFabrication: 'La fabrication',
  ficheTechnique: 'Fiche technique',
  tempo: 'Tempo',
  apparition: 'Apparition',
  descendance: 'Descendance',
  nGenresDerives: (n) => `${n} genre${n > 1 ? 's' : ''}`,
  vers: 'vers',
  motDeLAuteur: 'Le mot de Mika',
  positionDansLeMorceau: 'Position dans le morceau',
  reculer: 'Reculer de 10 secondes',
  avancer: 'Avancer de 10 secondes',
  seConnecter: 'Se connecter',
  connexion: 'Connexion',
  fermer: 'Fermer',
  usageConnexion: 'Connecte-toi pour proposer des morceaux, voter et commenter.',
  continuerGoogle: 'Continuer avec Google',
  ou: 'ou',
  lienParti:
    'Un lien de connexion vient de partir. Ouvre-le depuis ce navigateur, tu reviendras exactement ici.',
  tonAdresse: 'Ton adresse',
  envoiEnCours: 'Envoi…',
  recevoirLien: 'Recevoir un lien',
  promesseDonnees:
    'Aucun mot de passe, jamais. Ton pseudonyme public est calculé de façon non réversible : ' +
    "ton adresse n'est affichée nulle part, ni pour toi ni pour les autres.",
  erreurRetiree: 'a été retirée de YouTube',
  erreurNonAutorisee: "n'est pas autorisée hors de YouTube",
  erreurIdentifiant: 'a un identifiant invalide',
  erreurIllisible: 'est illisible',
  passageSuivant: 'Passage à la suivante.',
  aucuneLisible: "Aucune piste de cette liste n'est lisible.",
  sansVideo: "Cette piste n'a pas de vidéo associée.",
  lecteurBloque: 'Le lecteur YouTube est bloqué par une extension du navigateur.',
  lecteurIndisponible: "Le lecteur YouTube n'a pas pu se charger.",
  googleNonConfiguree:
    'La connexion Google n’est pas encore configurée sur ce site. Utilisez votre courriel ci-dessous.',
  lienPerime:
    'Ce lien de connexion a expiré ou a déjà servi. C’est fréquent : un lien ne vaut qu’une fois, ' +
    'et certains services de courriel l’ouvrent avant vous pour le vérifier. Demandez-en un autre ci-dessous.',
  connexionRefusee:
    'La connexion a été refusée avant d’aboutir. Rien n’a été enregistré. Vous pouvez recommencer ci-dessous.',
  connexionEchouee:
    'La connexion n’a pas abouti. Rien n’a été enregistré. Vous pouvez recommencer ci-dessous.',

  lesSets: 'Les sets',
  monProfil: 'Mon profil',
  baseIndisponible: "Le dépôt de sets n'est pas actif sur cette version du site.",
  connexionRequiseProfil: 'Connectez-vous pour créer votre profil et déposer un set.',
  identitePublique: 'Mon identité publique',
  changerLaPhoto: 'Changer la photo',
  photoLimite: 'JPEG, PNG ou WebP, 2 Mo au plus.',
  nomDArtiste: 'Nom d’artiste',
  nomDArtistePlaceholder: 'Le nom qui s’affichera sous vos sets',
  presentation: 'Présentation',
  enregistrer: 'Enregistrer',
  creerMonProfil: 'Créer mon profil',
  nomRequis: 'Il faut un nom pour signer un set.',
  profilEnregistre: 'Profil enregistré.',
  photoEnregistree: 'Photo enregistrée.',
  artisteSansNom: 'Sans nom',
  formatImageRefuse: 'Format refusé. JPEG, PNG ou WebP seulement.',
  imageTropLourde: (taille) => `Image de ${taille} : la limite est de 2 Mo.`,
  deposerUnSet: 'Déposer un set',
  limitesDepot: (max) =>
    `FLAC, WAV, MP3, M4A ou OGG, ${max} au plus par fichier, soit environ six heures ` +
    `de FLAC sans perte ou deux heures de WAV. Aucun fichier n’est réencodé : ce que vous déposez est ` +
    `exactement ce qui sera joué, octet pour octet. ` +
    `Le set arrive en brouillon, vous seul le voyez tant que vous ne l’avez pas publié.`,
  fichierAudio: 'Fichier audio',
  titreDuSet: 'Titre',
  genresDuSet: (n) => `Styles, pour le ranger dans l’atlas (${n} au plus)`,
  choisirLesStyles: 'Choisir des styles',
  changerLesStyles: 'Changer les styles',
  fermerLesStyles: 'Fermer',
  chercherUnStyle: 'Chercher un style…',
  aucunStyleTrouve: 'Aucun style ne correspond.',
  pochette: 'Pochette',
  deposerUnePochette: 'Glissez une image, ou cliquez',
  pochetteAide: 'N’importe quelle taille : elle est recompressée ici avant l’envoi.',
  retirerLaPochette: 'Retirer la pochette',
  pochetteCompressee: (avant, apres) => `Pochette prête : ${avant} → ${apres}`,
  fermerLImage: 'Fermer l’image',
  modifier: 'Modifier',
  annuler: 'Annuler',
  titreRequis: 'Il faut un titre.',
  changementsNonEnregistres: 'Modifications non enregistrées',
  retirerLeStyle: (nom) => `Retirer ${nom}`,
  lesArtistes: 'Artistes',
  lesSons: 'Sons',
  piedParcourir: 'Parcourir',
  piedParticiper: 'Participer',
  piedLeProjet: 'Le projet',
  piedIndex: 'Index des 219 genres',
  piedPropositions: 'Propositions du public',
  piedCode: 'Le code, sur GitHub',
  piedMot:
    'SONAA, un atlas généalogique des musiques électroniques. 219 genres, 14 familles, ' +
    'écrit et vérifié à la main.',
  stockageUtilise: (u, max) => `${u} utilisés sur ${max}.`,
  stockageSansLimite: (u) => `${u} déposés, sans limite sur ce compte.`,
  voirTousLesArtistes: (n) => `Voir les ${n} artistes`,
  nSets: (n) => (n <= 1 ? `${n} set` : `${n} sets`),
  aucunArtiste: 'Personne n’a encore publié de set.',
  setsDeLaCommunaute: 'Sets déposés dans ce style',
  voirLArtiste: 'Voir tous ses sets',
  artisteIntrouvable: 'Cet artiste n’a pas de set publié.',
  retourAuxArtistes: 'Revenir aux artistes',
  lesStyles: 'Styles',
  /* « Calendar » dans les deux langues : c'est le nom de la section, pas un
     mot a traduire. Choix de Mika du 7 septembre 2026. */
  leCalendrier: 'Calendar',
  leJeu: 'Jeu',
  derniersSets: 'Derniers sets',
  descriptionFacultative: 'Description, si vous voulez',
  deposer: 'Déposer',
  etapeOnde: 'Lecture de la forme d’onde…',
  etapeEnvoi: 'Envoi du fichier…',
  etapeEnvoiPourcent: (n) => `Envoi… ${n} %`,
  etapeLigne: 'Enregistrement…',
  formatAudioRefuse: 'Format refusé. MP3, M4A, AAC, OGG ou WAV seulement.',
  audioTropLourd: (taille, max) =>
    `Fichier de ${taille} : la limite est de ${max}. Réencodez en 128 kbps, ou coupez le set en deux.`,
  setDepose: 'Set déposé, en brouillon. Publiez-le quand vous voulez.',
  mesSets: (n) => (n === 0 ? 'Mes sets' : n === 1 ? '1 set déposé' : `${n} sets déposés`),
  aucunSetDepose: 'Rien de déposé pour l’instant.',
  aucunSetPublie: 'Aucun set publié pour l’instant.',
  dureeInconnue: 'Durée inconnue',
  publie: 'Publié',
  brouillon: 'Brouillon',
  nEcoutes: (n) => (n <= 1 ? `${n} écoute` : `${n} écoutes`),
  publier: 'Publier',
  depublier: 'Dépublier',
  supprimer: 'Supprimer',
  confirmerSuppression: (titre) => `Supprimer « ${titre} » et son fichier, définitivement ?`,
  setIntrouvable: 'Ce set n’existe pas, ou n’est plus publié.',
  retourAuxSets: 'Revenir aux sets',
  setIllisible: 'Le fichier n’a pas pu être lu.',
  avancerDansLeSet: 'Avancer dans le set',
  uniteMo: 'Mo',
  uniteGo: 'Go',
  deposerOuCliquer: 'Déposer ou cliquer',
  deposerLeFichier: 'Glissez votre set ici, ou cliquez',
  formatsAcceptes: 'FLAC ou WAV sans perte, ou MP3, M4A, OGG',
  sansPerte: 'sans perte',
  aiffRefuse:
    'AIFF et ALAC ne sont lus ni par Chrome ni par Firefox : le set serait muet pour ' +
    'presque tout le monde. Exportez en FLAC, qui est sans perte lui aussi, plus léger, ' +
    'et lu partout.',
  sansPerteTropLourd: (taille, max, minutesWav, minutesFlac) =>
    `Fichier de ${taille}, et la limite est de ${max}. Cela couvre environ ` +
    `${minutesWav} minutes de WAV ou ${minutesFlac} minutes de FLAC. Au-delà, ` +
    `c'est le total de stockage gratuit qui se remplit : exportez en FLAC, ` +
    `sans perte et deux fois plus léger.`
};

const EN: Dictionnaire = {
  parcourir: 'Browse',
  revenir: 'Back',
  chercherUnGenre: 'Search a genre',
  fermerRecherche: 'Close search',
  nomDunGenre: 'Genre name',
  aucunGenreDeCeNom: 'No genre by that name.',
  retourAtlas: 'SONAA, back to home',
  accroche: (g, f) => `${g} genres, ${f} families. Tap a family.`,
  genresAppuyez: (n) => `${n} genres. Tap to open.`,
  nGenres: (n) => `${n} genres`,
  nDerives: (n) => `${n} offshoot${n > 1 ? 's' : ''}`,
  nMorceaux: (n) => `${n} track${n > 1 ? 's' : ''}`,
  bpm: (b, h) => `${b} to ${h} BPM`,
  ecouter: 'Play',
  pause: 'Pause',
  lecture: 'Play',
  morceauPrecedent: 'Previous track',
  morceauSuivant: 'Next track',
  aucunMorceau: 'No track has been recorded for this genre yet.',
  lectureEnCours: 'Now playing',
  origine: 'origin',
  chargement: 'Loading…',
  appuyezEncoreCourt: 'Tap again for sound',
  appuyezEncore: 'Tap again to start the sound.',
  pisteIllisible: 'Track unavailable',
  aPropos: 'About',
  credits: 'Credits',
  index: 'Index',
  navigationDuSite: 'Site navigation',
  choixDeLangue: 'Interface language',
  passerAuClair: 'Switch to the light theme',
  passerAuSombre: 'Switch to the dark theme',
  villeLibelle: "City",
  /* EN ANGLAIS, ZERO PREND LE PLURIEL : « 0 offshoots », la ou le francais
     ecrit « 0 dérivé ». La regle n'est donc pas la meme des deux cotes, et
     copier `n > 1` du francais donnait « 0 direct offshoot », vu a l'ecran. */
  nGenresSurTotal: (n, total) => `${n} genre${n === 1 ? '' : 's'} of ${total}`,
  genresPrincipauxSur: (n, total) => `Main genres (${n} of ${total})`,
  encoreNCaracteres: (n) => `${n} more character${n === 1 ? '' : 's'}`,
  nDerivesDirects: (n) => `${n} direct offshoot${n === 1 ? '' : 's'}`,
  derivesEtDescendance: (nom, d, total) => `${nom} · ${d} direct offshoot${d === 1 ? '' : 's'}, ${total} genre${total === 1 ? '' : 's'} in all`,
  releveDu: (quand) => ` · surveyed on ${quand}`,
  fondateurDeLaFamille: (famille) => `founder of the ${famille} family`,
  villeDattacheEnregistree: (ville) => `Home city saved: ${ville}.`,
  noteDeModeration: (note) => `Moderation note: ${note}`,
  nSoireesAVenir: (n) => `${n} upcoming night${n === 1 ? '' : 's'}`,
  rienPourLaRechercheRa: (quoi, ville) => `Nothing matching “${quoi}” among the nights Resident Advisor lists in ${ville} over the next three months.`,
  rienDAnnonce: (quand, ville, style) => `Nothing announced ${quand} in ${ville}${style ? ` in ${style}` : ''}. Look at the days ahead, or change style.`,
  raNeDistinguePas: "Resident Advisor does not distinguish",
  rechercheElargieA: (valeur) => `: the search was widened to “${valeur}”.`,
  aucunEquivalentDe: "No equivalent of",
  chezRaVoiciTout: " on Resident Advisor: here is everything on in town.",
  raNeCouvrePas: (ville) => `Resident Advisor does not cover ${ville}. The city stays in SONAA, its nights will come from elsewhere.`,
  raNeRepondPas: "Resident Advisor is not responding. This is not a city without nights: the source is silent.",
  propositionEnregistree: "Proposal saved. It appears right away in",
  ouElleSoutenue: ", where it can be supported or challenged before being decided.",
  propositionAccepteePasAuto: "An accepted proposal does not enter the atlas automatically: it is carried into the corpus by hand, with its sources.",
  toutVoir: "see all",
  indexIntro: (familles, genres) => `Hierarchical navigation of the ${familles} families and their ${genres} genres. Same content and same links as the space, without the matter.`,
  genresDeLaFamille: (nom) => `Genres of the ${nom} family`,
  pageDemandeConnexion: "This page requires signing in. It shows nothing more than",
  pasModerateur: "Your account is not a moderator. The queue below is public anyway: it is visible on",
  propositionsEnAttenteTete: "Pending proposals, the most supported first.",
  corpusParCommit: ": the corpus changes by commit, with its sources. Mark “carried into the corpus” once the work is really done.",
  leGenre: "The genre",
  vuesParMorceau: "views per track on YouTube",
  connecte: "Signed in",
  enTantQue: (nom) => ` as ${nom}`,
  sousLePseudonyme: (pseudo) => ` under the pseudonym ${pseudo}`,
  virguleModerateur: ", moderator",
  genresLeRevendiquent: (combien) => `${combien} genres claim it, the scene does not decide`,
  aucuneVilleDeCeNom: (combien) => `No city by that name. SONAA knows ${combien} so far.`,
  peutLeurEchapper: "a night that plays techno without calling itself a techno night can slip past them.",
  roleOrigine: "origin",
  roleCanon: "canon",
  legendeOrigine: "the track that founds the genre",
  installerIosAvant: "To keep SONAA on your home screen: tap",
  partager: "Share",
  installerIosApres: "at the bottom of the screen, then",
  compris: "Got it",
  fermerLaFiche: "Close",
  stylesDeCetArtiste: "This artist’s styles",
  lesArtistesDuStyle: "Artists in this style",
  artistesDouVientLaListe: (quand) =>
    `Ranked by listener count on Last.fm, and kept when their records confirm the style on Discogs. Surveyed on ${quand}.`,
  moisPrecedent: "Previous month",
  moisSuivant: "Next month",
  choixSurCetteMachine:
    "The choice stays on this machine; to keep it from one device to the next, put it in",
  effacer: "Clear",
  sonaaConnaitNVilles: (n) => `SONAA knows ${n} cities.`,
  voirLaFiche: "See the full listing",
  replierLaFiche: "Collapse",
  plateau: "Line-up",
  ouLibelle: "Where",
  quandLibelle: "When",
  combien: "How much",
  organisePar: "Organised by",
  lAnnonce: "The announcement",
  pasDeDetailIci: "Resident Advisor does not give SONAA the detail of this night. What is above is everything it announces.",
  ouvrirChezLaSource: "Open at the source",
  jusqua: "until",
  echap: "Esc",
  moderationMenu: "Moderation",
  deconnexion: "Sign out",
  reessayer: "Try again",
  pastilleParentAutreFamille: "A dot marks a parent from another family",
  parFamille: "By family",
  parEpoque: "By era",
  aucunCommentaireSignale: "No reported comment. The queue only shows messages that were reported or hidden.",
  seConnecterDiscussion: "Sign in to join the discussion",
  proposerUneTrack: "Suggest a track",
  signalerUneCorrection: "Report a correction",
  lienConnexionPartiVers: "A sign-in link has just been sent to",
  allerListeFamilles: "Go to the list of families",
  chaineChronologiqueCourt: "Chronological chain",
  nonDisponibleSurCetteVersion: "Not available on this build of the site.",
  elleAjouteLesDecisions: ", it adds the decisions.",
  lecteurPasCharge: "The YouTube player could not load. The sleeve stays on screen.",
  seConnecterPourVoter: "Sign in to vote and suggest tracks",
  referenceEtablie: "an established reference",
  medianeDe: "median of",
  sourceIndiquee: "source given",
  reporteeDansLeCorpus: "Carried into the corpus",
  filtreSur: "Filtered on",
  seDeconnecter: "Sign out",
  mettreAJour: "Update",
  plusTard: "Later",
  ecouterCourt: "Listen",
  voirSurLaCarte: "See on the map",
  tuSaisDansQuelGenre: "Do you know which genre it belongs to? Suggest it, we will review it.",
  choisirGenreEtProposer: "Pick the genre and suggest",
  chercheLeGenreCiDessus: "Find the genre above, open it, then use “Suggest a track”.",
  artistesSepares: "Artists, separated by commas",
  stylesSepares: "Styles, separated by commas",
  aujourdhuiOnglet: "Today",
  finDeSemaineOnglet: "This weekend",
  joursSuivantsOnglet: "The days ahead",
  quandAujourdhui: "today",
  quandWeekend: "this weekend",
  quandSuite: "in the days ahead",
  ledeCalendrier: "What is on in your city, in the styles you follow. Nights come from Resident Advisor, Ticketmaster, Shotgun, Eventbrite, Lepointdevente and from entries made by hand; every title links back to its source, and the badge says which one.",
  changerDeVille: "Change city",
  fermerCourt: "Close",
  tousLesStyles: "Every style",
  lectureAgenda: "Loading the listings…",
  lieuNonAnnonce: "Venue not announced",
  ajouteeALaMain: "added by hand",
  choisirTiret: "Pick…",
  compteurSoirees: (n, quand, ville, reste) =>
    `${n} night${n === 1 ? '' : 's'} ${quand} in ${ville}${reste}.`,
  compteurRecherche: (n, quoi, ville) =>
    `${n} night${n === 1 ? '' : 's'} for “${quoi}” in ${ville}, over the next three months.`,
  lesNpremieres: (n) => `, the first ${n}`,
  styleAvecNombre: (n) => `Styles (${n})`,

  revenirAccueil: "Back to the home page",
  sonaaRevenirAccueil: "SONAA, back to the home page",
  chercherUnGenreCourt: "Search a genre",
  chercherGenreArbre: "Search a genre in the tree",
  sonaaRevenirAtlas: "SONAA, back to the Atlas view",
  revenirAtlasCourt: "Back to the Atlas",
  remonterNiveau: "Up one level",
  deployerChemin: "Show the full path",
  replierChemin: "Collapse the path",
  controlesNavigation: "Navigation controls",
  chercherGenreArtisteLabel: "Search a genre, an artist, a label",
  zoomArriere: "Zoom out",
  zoomArriereTouche: "Zoom out (-)",
  ouvrirIndex: "Open the index, full navigation of families and genres",
  aideChercher: "search a genre, an artist, a label",
  aideOuvrirGenre: "open a genre, its tracks and its offshoots",
  aideSeDeplacer: "move around",
  aideRemonter: "up one level",
  aideVueEnsemble: "back to the overview",
  aideOuvrirDerives: "open a genre and its offshoots",
  chercherSalleArtisteSoiree: "Search a venue, an artist, a night",
  chercherDansAffichees: "Search within the nights shown",
  unInstant: "One moment…",
  choisissezVille: "Pick a city.",
  unJour: "A day",
  surTroisMois: "over the next three months",
  votreProfil: "your profile",
  ilsNeCouvrentPasTout: "They do not cover everything",
  parentAutreFamille: "Parent from another family",
  chaineChronologique: "Chronological chain",
  ouvrirTracksEtFiche: "Open the tracks and the genre page",
  filiationDebattue: "Disputed lineage",
  identifiantDuGenre: "genre identifier, for example dubtechno",
  commentairesSignales: "Reported comments",
  fermerRouvrirCommentaires: "Close or reopen comments on a genre",
  lectureDeLaFile: "Loading the queue…",
  masqueCourt: "hidden",
  placeholderCommentaire: "What you know about this genre, what you listen to.",
  ecrireUnMessage: "Write a message",
  desapprouver: "Downvote",
  commentairesFermes: "Comments are closed on this genre.",
  personneNaEcrit: "Nobody has written about this genre yet.",
  messageRetire: "Message removed by moderation.",
  aSoutenirOuContester: "to support or dispute",
  nomSurLaSortie: "Name as it appears on the release",
  surQuoiVousAppuyez: "What are you basing this on? A sleeve, an interview, a release date, a listen.",
  lesPropositionsEnAttente: "the pending proposals",
  ceQuiDoitChanger: "What should change",
  ceQuiDevraitEtreEcrit: "What it should say",
  leGenreDontIlDescend: "The genre it comes from, in your view",
  choisirUnGenre: "Pick a genre…",
  votreAdresse: "Your email",
  neeDe: "Born from",
  aDonne: "Led to",
  revenirNavigation: "Back to navigation",
  genresDansLeTemps: "genres over time, by family",
  moderation: "Moderation",
  revenirAccueilTexte: "Back to the home page",
  lesPropositions: "the proposals",
  laPageDesPropositions: "the proposals page",
  accepterNePublieRien: "Accepting publishes nothing",
  laFileEstVide: "The queue is empty.",
  rouvrirLecteur: "Reopen the player",
  reglerLargeurColonne: "Adjust the column width, left and right arrows",
  fermerLecteur: "Close the player",
  profilCourt: "Profile",
  nomDunGenreOuArtiste: "A genre, an artist…",
  ongletCompte: "Account",
  ongletSets: "Sets",
  ongletEvenements: "Events",
  mesPropositions: "My proposals",
  ajouterUneSoiree: "Add an event",
  ajouterCourt: "Add an event",
  ajouterSoireeIntro: "It appears in the calendar right away, marked “member”. You can then get the Instagram image from its card or from your profile.",
  connexionPourAjouter: "To add a night, sign in: it will be tied to your account, and only you can remove it.",
  titreLibelle: "Title",
  dateLibelle: "Date",
  heureLibelle: "Start time",
  salleLibelle: "Venue",
  afficheLibelle: "Poster",
  choisirUneAffiche: "Choose a poster",
  changerLAffiche: "Change the poster",
  retirerLAffiche: "Remove the poster",
  afficheAide: "JPEG, PNG or WebP. Square or 4:5 makes the best story.",
  lienBillets: "Ticket link",
  annonceLibelle: "Announcement",
  enregistrementEnCours: "Saving…",
  enregistrementImpossible: "Could not save.",
  ajouterLaSoiree: "Add the night",
  ilFautTitreEtDate: "A title and a date are required.",
  imagePourInstagram: "Instagram image (9:16)",
  imageEnCours: "Drawing the image…",
  imagePrete: "Image ready: it is in your downloads, and below. On a phone, press and hold it to save.",
  imageImpossible: "The image could not be drawn.",
  copierLeTexteDuPost: "Copy the post text",
  texteCopie: "Text copied. Paste it into the caption of your post or story.",
  copieImpossible: "Copying is not possible in this browser.",
  retirerLaSoiree: "Remove the night",
  confirmerRetraitSoiree: "Remove this night from the calendar? It cannot be recovered.",
  retraitImpossible: "Could not remove.",
  mesSoirees: "My nights",
  mesSoireesIntro: "The nights you added to the calendar. For each one, the 9:16 Instagram image and the post text.",
  aucuneSoireeDeposee: "No upcoming night. Add one from the calendar.",
  soireeDepubliee: "Removed from the calendar by a moderator",
  lectureImpossible: "Could not read.",
  sourceMembre: "member",
  ouvrirLecteur: "Open the player",
  precedente: "Previous",
  positionDansLaTrack: "Position in the track",
  ouvrirSurYoutube: "Open on YouTube",
  reduireLecteur: "Shrink the player",
  rouvrirColonneGenre: "Reopen the genre column",
  arreter: "Stop",
  filiationDebattueMinuscule: "disputed lineage",
  ficheARelire: "page to review",
  auditeursLastfm: "listeners on Last.fm",
  peuDocumenteLastfm: "thinly documented on Last.fm",
  ficheEnBrouillon: "draft page, to review",
  sansLabelFondateur: "no founding label identified",
  aucunNeProduitPlus: "none, the genre is no longer active",
  artistesCles: "Key artists",
  conventionArbre: "a tree convention, not a lineage",
  rienUneFeuille: "nothing, it is a leaf",
  charnieres: "Turning points",
  aussiRevendiquee: "also claimed by",
  aussiAppele: "Also called",
  votreVille: "Your city",
  aucuneVilleEnregistree: "No city saved.",
  soutenirProposition: "Support this proposal",
  contesterProposition: "Dispute this proposal",
  noteModerationFacultative: "Moderation note, optional",
  noteModeration: "Moderation note",
  votreProposition: "your proposal",
  proposeLe: "Proposed:",
  propositionAccepteeNentrePas: "An accepted proposal does not enter the atlas by itself",
  voirTousLesGenres: "See every genre",
  fileDeModeration: "Moderation queue",
  lectureDesPropositions: "Loading proposals…",
  nouvelleVersionPrete: "A new version of the atlas is ready.",
  installerSonaa: "Install SONAA to open it offline, without a browser bar.",
  surEcranAccueil: "On the home screen",
  revenirRecherche: "Back to the search",
  chercherGenreArtisteTrackLabel: "Search a genre, an artist, a track or a label",
  morceauPasDansAtlas: "This track is not in the atlas yet.",
  rienNeCorrespond: "Nothing matches.",
  soireesAjouteesMain: "Nights added by hand",
  lesQuatorzeFamilles: "The fourteen families",
  choisirLaVue: "Pick the view",
  cliquezUneVue: "Click a view to enter the map:",
  enFrancais: 'Show the interface in French',
  enAnglais: 'Show the interface in English',
  chemin: 'Path',
  texteEnFrancais:
    'The texts of this atlas are written in French and are not machine translated. The interface is in English.',
  machines: 'Machines',
  sonorites: 'Sound',
  labels: 'Labels',
  artistes: 'Artists',
  aPropSujet: 'The genre',
  cettePiste: 'This track',
  lHistoire: 'The story',
  laFabrication: 'How it is made',
  ficheTechnique: 'Fact sheet',
  tempo: 'Tempo',
  apparition: 'Emerged',
  descendance: 'Offshoots',
  nGenresDerives: (n) => `${n} genre${n === 1 ? '' : 's'}`,
  vers: 'circa',
  motDeLAuteur: 'A word from Mika',
  positionDansLeMorceau: 'Position in track',
  reculer: 'Back 10 seconds',
  avancer: 'Forward 10 seconds',
  seConnecter: 'Sign in',
  connexion: 'Sign in',
  fermer: 'Close',
  usageConnexion: 'Sign in to suggest tracks, vote and comment.',
  continuerGoogle: 'Continue with Google',
  ou: 'or',
  lienParti:
    'A sign-in link is on its way. Open it from this browser and you will come back right here.',
  tonAdresse: 'Your email',
  envoiEnCours: 'Sending…',
  recevoirLien: 'Send me a link',
  promesseDonnees:
    'No password, ever. Your public nickname is derived in a non reversible way: ' +
    'your address is shown nowhere, not even to you.',
  erreurRetiree: 'was removed from YouTube',
  erreurNonAutorisee: 'cannot be played outside YouTube',
  erreurIdentifiant: 'has an invalid identifier',
  erreurIllisible: 'is unavailable',
  passageSuivant: 'Skipping to the next one.',
  aucuneLisible: 'No track in this list can be played.',
  sansVideo: 'This track has no video attached.',
  lecteurBloque: 'The YouTube player is blocked by a browser extension.',
  lecteurIndisponible: 'The YouTube player could not load.',
  googleNonConfiguree:
    'Google sign-in is not configured on this site yet. Use your email below.',
  lienPerime:
    'This sign-in link has expired or has already been used. That is common: a link is good once, ' +
    'and some mail services open it before you do in order to check it. Ask for another one below.',
  connexionRefusee:
    'Sign-in was refused before it completed. Nothing was saved. You can try again below.',
  connexionEchouee:
    'Sign-in did not complete. Nothing was saved. You can try again below.',

  lesSets: 'Sets',
  monProfil: 'My profile',
  baseIndisponible: 'Set uploads are not enabled on this build of the site.',
  connexionRequiseProfil: 'Sign in to create your profile and upload a set.',
  identitePublique: 'My public identity',
  changerLaPhoto: 'Change photo',
  photoLimite: 'JPEG, PNG or WebP, 2 MB max.',
  nomDArtiste: 'Artist name',
  nomDArtistePlaceholder: 'The name shown under your sets',
  presentation: 'About you',
  enregistrer: 'Save',
  creerMonProfil: 'Create my profile',
  nomRequis: 'A set needs a name to sign it.',
  profilEnregistre: 'Profile saved.',
  photoEnregistree: 'Photo saved.',
  artisteSansNom: 'Unnamed',
  formatImageRefuse: 'Format refused. JPEG, PNG or WebP only.',
  imageTropLourde: (taille) => `Image is ${taille}: the limit is 2 MB.`,
  deposerUnSet: 'Upload a set',
  limitesDepot: (max) =>
    `FLAC, WAV, MP3, M4A or OGG, ${max} max per file, about six hours of lossless FLAC or two hours of WAV. ` +
    `No file is re-encoded: what you upload is exactly what plays, byte for byte. ` +
    `The set arrives as a draft, only you can see it until you publish it.`,
  fichierAudio: 'Audio file',
  titreDuSet: 'Title',
  genresDuSet: (n) => `Styles, to file it in the atlas (${n} max)`,
  choisirLesStyles: 'Choose styles',
  changerLesStyles: 'Change styles',
  fermerLesStyles: 'Close',
  chercherUnStyle: 'Search a style…',
  aucunStyleTrouve: 'No style matches.',
  pochette: 'Artwork',
  deposerUnePochette: 'Drag an image, or click',
  pochetteAide: 'Any size: it is recompressed here before upload.',
  retirerLaPochette: 'Remove artwork',
  pochetteCompressee: (avant, apres) => `Artwork ready: ${avant} → ${apres}`,
  fermerLImage: 'Close image',
  modifier: 'Edit',
  annuler: 'Cancel',
  titreRequis: 'A title is required.',
  changementsNonEnregistres: 'Unsaved changes',
  retirerLeStyle: (nom) => `Remove ${nom}`,
  lesArtistes: 'Artists',
  lesSons: 'Sounds',
  piedParcourir: 'Browse',
  piedParticiper: 'Take part',
  piedLeProjet: 'The project',
  piedIndex: 'Index of all 219 genres',
  piedPropositions: 'Public proposals',
  piedCode: 'The code, on GitHub',
  piedMot:
    'SONAA, a genealogical atlas of electronic music. 219 genres, 14 families, ' +
    'written and checked by hand.',
  stockageUtilise: (u, max) => `${u} used of ${max}.`,
  stockageSansLimite: (u) => `${u} uploaded, no limit on this account.`,
  voirTousLesArtistes: (n) => `See all ${n} artists`,
  nSets: (n) => (n <= 1 ? `${n} set` : `${n} sets`),
  aucunArtiste: 'Nobody has published a set yet.',
  setsDeLaCommunaute: 'Sets uploaded in this style',
  voirLArtiste: 'See all their sets',
  artisteIntrouvable: 'This artist has no published set.',
  retourAuxArtistes: 'Back to artists',
  lesStyles: 'Styles',
  leCalendrier: 'Calendar',
  leJeu: 'Game',
  derniersSets: 'Latest sets',
  descriptionFacultative: 'Description, if you like',
  deposer: 'Upload',
  etapeOnde: 'Reading the waveform…',
  etapeEnvoi: 'Uploading…',
  etapeEnvoiPourcent: (n) => `Uploading… ${n}%`,
  etapeLigne: 'Saving…',
  formatAudioRefuse: 'Format refused. MP3, M4A, AAC, OGG or WAV only.',
  audioTropLourd: (taille, max) =>
    `File is ${taille}: the limit is ${max}. Re-encode at 128 kbps, or split the set in two.`,
  setDepose: 'Set uploaded as a draft. Publish it whenever you want.',
  mesSets: (n) => (n === 0 ? 'My sets' : n === 1 ? '1 set uploaded' : `${n} sets uploaded`),
  aucunSetDepose: 'Nothing uploaded yet.',
  aucunSetPublie: 'No published sets yet.',
  dureeInconnue: 'Unknown length',
  publie: 'Published',
  brouillon: 'Draft',
  nEcoutes: (n) => (n <= 1 ? `${n} play` : `${n} plays`),
  publier: 'Publish',
  depublier: 'Unpublish',
  supprimer: 'Delete',
  confirmerSuppression: (titre) => `Delete “${titre}” and its file, permanently?`,
  setIntrouvable: 'This set does not exist, or is no longer published.',
  retourAuxSets: 'Back to sets',
  setIllisible: 'The file could not be played.',
  avancerDansLeSet: 'Seek in the set',
  uniteMo: 'MB',
  uniteGo: 'GB',
  deposerOuCliquer: 'Drop or click',
  deposerLeFichier: 'Drag your set here, or click',
  formatsAcceptes: 'FLAC or WAV lossless, or MP3, M4A, OGG',
  sansPerte: 'lossless',
  aiffRefuse:
    'AIFF and ALAC play in neither Chrome nor Firefox: the set would be silent for ' +
    'almost everyone. Export to FLAC, which is lossless too, smaller, and plays everywhere.',
  sansPerteTropLourd: (taille, max, minutesWav, minutesFlac) =>
    `File is ${taille}, and the limit is ${max}. That covers about ` +
    `${minutesWav} minutes of WAV or ${minutesFlac} minutes of FLAC. Beyond that ` +
    `it is the free storage total that fills up: export to FLAC, lossless and half the size.`
};

export const t: Dictionnaire = langue === 'en' ? EN : FR;

/* L'attribut de langue du document suit, sinon les lecteurs d'ecran
   prononcent l'anglais avec la phonetique francaise. */
if (typeof document !== 'undefined') {
  document.documentElement.lang = langue;
}
