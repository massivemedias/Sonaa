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
export const langue: Langue = (() => {
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
})();

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
  readonly voirTousLesArtistes: (n: number) => string;
  readonly nSets: (n: number) => string;
  readonly aucunArtiste: string;
  readonly setsDeLaCommunaute: string;
  readonly voirLArtiste: string;
  readonly artisteIntrouvable: string;
  readonly retourAuxArtistes: string;
  readonly lesStyles: string;
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
  voirTousLesArtistes: (n) => `Voir les ${n} artistes`,
  nSets: (n) => (n <= 1 ? `${n} set` : `${n} sets`),
  aucunArtiste: 'Personne n’a encore publié de set.',
  setsDeLaCommunaute: 'Sets déposés dans ce style',
  voirLArtiste: 'Voir tous ses sets',
  artisteIntrouvable: 'Cet artiste n’a pas de set publié.',
  retourAuxArtistes: 'Revenir aux artistes',
  lesStyles: 'Styles',
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
  chemin: 'Path',
  texteEnFrancais: 'Genre texts are written in French and are not machine translated.',
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
  nGenresDerives: (n) => `${n} genre${n > 1 ? 's' : ''}`,
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
  voirTousLesArtistes: (n) => `See all ${n} artists`,
  nSets: (n) => (n <= 1 ? `${n} set` : `${n} sets`),
  aucunArtiste: 'Nobody has published a set yet.',
  setsDeLaCommunaute: 'Sets uploaded in this style',
  voirLArtiste: 'See all their sets',
  artisteIntrouvable: 'This artist has no published set.',
  retourAuxArtistes: 'Back to artists',
  lesStyles: 'Styles',
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
