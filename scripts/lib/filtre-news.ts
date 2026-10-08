/* CE QUI A SA PLACE DANS LES NEWS : LA MUSIQUE ELECTRONIQUE, ET RIEN D'AUTRE.
 *
 * Mika, le 8 octobre 2026 : « la page news, il y a beaucoup d'acoustique de
 * guitare. Je veux etre un site de musique electronique, donc ca doit
 * concerner la MAO, les synthes, les grooveboxes, les plugins, la techno ;
 * pas tout ce qui touche le rock, la pop, le rap, on s'en fout ».
 *
 * Mesure le meme jour : sur 61 articles publies, MusicRadar en donnait 12,
 * dont 9 de guitare, de rock ou de variete (Rolling Stones, Blink-182, Ozzy,
 * Drake), et Gearnews melait les amplis et les guitares folk aux synthes.
 *
 * ═══ DEUX SORTES DE SOURCES ═══
 *
 * LES GENERALISTES (MusicRadar, Gearnews, MusicTech) parlent de toute la
 * musique, et rangent bien leurs articles : « Guitars », « Bands »,
 * « Synths », « Plugins ». On lit le titre ET ces categories. Un mot hors
 * sujet fait tomber l'article ; et il faut en plus un mot de la musique
 * electronique (un synthe, un plugin, un logiciel, une boite a rythmes, un
 * DJ, la techno) pour qu'il reste. Le titre seul ne suffirait pas :
 * « Keeley Compressor Plus Germanium » est une pedale de guitare, et seules
 * ses categories le disent.
 *
 * LES SPECIALISEES (Attack, CDM, XLR8R, Mixmag, Tsugi...) ne parlent que de
 * nous, mais leurs etiquettes WordPress sont bavardes : XLR8R etiquette
 * « acoustic » une sortie de Beatrice Dillon, Tsugi « emo » ou « guitare »
 * la moitie de ses articles electroniques. On n'y lit que le TITRE, et seul
 * un mot fort le fait tomber (« A Beginner's Guide to Looping Guitar »).
 *
 * TSUGI EST ENTRE LES DEUX : un magazine electronique qui couvre aussi Rock
 * en Seine et Fontaines D.C. Son titre est juge comme ailleurs, et il faut
 * en plus un mot electronique dans le titre ou les etiquettes, en francais
 * comme en anglais.
 *
 * « Groupe », « chanteur » et « auteur-compositeur » sont des mots FAIBLES :
 * ils font tomber l'article seulement si rien d'electronique ne le sauve.
 * Jean-Michel Jarre est range chez MusicRadar sous « Singers & Songwriters »
 * ET « Synths ». */

/** Les sources qui couvrent toute la musique, et pas seulement la notre. */
export const GENERALISTES: ReadonlySet<string> = new Set(['musicradar', 'gearnews', 'musictech']);
/** Electroniques, mais pas seulement : il leur faut un mot de chez nous. */
export const MELANGEES: ReadonlySet<string> = new Set(['tsugi']);

const HORS_SUJET = [
  'guitar\\w*',
  'guitare\\w*',
  'ukulele',
  'banjo',
  'amps?',
  'amplifiers?',
  'amp modell?ing',
  'cabs?',
  'cabinets?',
  'pedals?',
  'pedalboards?',
  'fender',
  'gibson',
  'telecaster',
  'stratocaster',
  'les paul',
  'ibanez',
  'harley benton',
  'drummers?',
  'drum kits?',
  'cymbals?',
  'acoustic',
  'rock',
  'metal',
  'punk',
  'grunge',
  'country',
  'k-?pop',
  'pop (?:star|song|music|singer)s?',
  'popstars?',
  'rap',
  'rappers?',
  'hip-?hop',
  'r&b',
  'consumer tech',
  'headphones?',
  'earbuds?',
  'hi-?fi',
  'soundbars?',
  'portable speakers?',
  'multi-room',
];
/* Faibles : la scene electronique a aussi ses groupes et ses voix. */
const PEUT_ETRE_HORS_SUJET = ['bands?', 'singers?', 'songwriters?', 'vocalists?'];
/* Des noms qui contiennent un mot fort et n'ont rien a voir avec lui. */
const PROTEGES = /daft punk/giu;

const ELECTRONIQUE = [
  'synth\\w*',
  'synthé\\w*',
  'groovebox\\w*',
  'drum machines?',
  'boîtes? à rythmes?',
  'samplers?',
  'sampling',
  'samples?',
  'sequencers?',
  'modular',
  'modulaire',
  'eurorack',
  'midi',
  'controllers?',
  'plug-?ins?',
  'vst\\d?',
  'au',
  'daw',
  'software & apps',
  'fx software',
  'ableton',
  'live 12',
  'push',
  'bitwig',
  'fl studio',
  'logic pro',
  'cubase',
  'maschine',
  'kontakt',
  'reaktor',
  'serum',
  'arturia',
  'korg',
  'roland',
  'moog',
  'elektron',
  'novation',
  'teenage engineering',
  'op-\\w+',
  'behringer',
  'oberheim',
  'polyend',
  'erica synths',
  'mixing',
  'mastering',
  'studio monitors?',
  'monitors',
  'audio interfaces?',
  'music production',
  'artist/producer/dj',
  'djs?',
  'djing',
  'dj-kicks',
  'dj mixers?',
  'turntables?',
  'rekordbox',
  'traktor',
  'serato',
  'alphatheta',
  'pioneer dj',
  'techno',
  'house',
  'electro\\w*',
  'électro\\w*',
  'edm',
  'rave',
  'club',
  'ambient',
  'ambiant',
  'acid',
  'breakbeat',
  'trance',
  'jungle',
  'drum (?:and|&|n) bass',
];

/** Un des mots, entier : « band » ne se trouve ni dans « Bandcamp » ni dans
    « multiband », « rap » ni dans « trap ». */
function motEntier(mots: readonly string[]): RegExp {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${mots.join('|')})(?=$|[^\\p{L}\\p{N}])`, 'iu');
}
const FORT = motEntier(HORS_SUJET);
const FAIBLE = motEntier(PEUT_ETRE_HORS_SUJET);
const SAUVE = motEntier(ELECTRONIQUE);

export interface AJuger {
  readonly source: string;
  readonly titre: string;
  readonly etiquettes?: readonly string[] | undefined;
}

/** Vrai quand l'article a sa place dans les news de SONAA. */
export function pertinent(a: AJuger): boolean {
  const titre = a.titre.replace(PROTEGES, ' ');
  const tout = [titre, ...(a.etiquettes ?? [])].join(' · ');
  const electronique = SAUVE.test(tout);
  if (GENERALISTES.has(a.source)) {
    if (FORT.test(tout)) return false;
    if (FAIBLE.test(tout) && !electronique) return false;
    return electronique;
  }
  if (FORT.test(titre)) return false;
  if (MELANGEES.has(a.source)) return electronique;
  return true;
}
