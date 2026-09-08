/* LA GARDE EST LA SEULE DECISION DE CET ADAPTATEUR, DONC LA SEULE A TESTER.
 * Les exemples sont des titres reels de la premiere moisson montrealaise. */
import { describe, expect, it } from 'vitest';
import { estElectronique } from './ingerer-eventbrite.ts';

describe('estElectronique', () => {
  it('garde ce qui se dit electronique dans le titre', () => {
    expect(estElectronique('Alex Kade: The EMO x ANIME RAVE', null, null)).toBe(true);
    expect(estElectronique('DJ Nights at Bootlegger | Montreal Electronic Music & Free Entry', null, null)).toBe(true);
    expect(estElectronique('NightCalll : Back To The 90s Rave', null, null)).toBe(true);
    expect(estElectronique('Piknic Électronik MTL #15', null, null)).toBe(true);
  });
  it('garde ce qui le dit dans l annonce, quand rien dans le titre ne dit autre chose', () => {
    expect(estElectronique('WEBZ- Syncopath Collective Launch Party', 'techno et bass', null)).toBe(true);
    expect(estElectronique('Soirée', 'DJ set toute la nuit', null)).toBe(true);
  });
  /* CE QUE MIKA A VU EN TETE DU CALENDRIER LE 7 SEPTEMBRE 2026. */
  it('ecarte un cirque, un hommage, un quartet, meme si leur annonce dit « DJ »', () => {
    expect(estElectronique('Paranormal Cirque Nightmare - Saint-Bruno-de-Montarville', 'DJ et disco après le spectacle', null)).toBe(false);
    expect(estElectronique('Montréal : Vendredi 11 septembre 2026 - 19h30 : Hommage à Ginette Reno', null, null)).toBe(false);
    expect(estElectronique('Cardinal 4tet', 'jazz, dj après', 'La Brassée')).toBe(false);
    expect(estElectronique('Kid Disco', 'disco pour enfants', 'jams')).toBe(false);
    expect(estElectronique('ROLLER DISCO *54', 'DJ toute la soirée', null)).toBe(false);
    expect(estElectronique("GOLF & REAL ESTATE DES INSPIRÉS DE L'IMMOBILIER", 'dj set en soirée', null)).toBe(false);
  });
  it('ecarte ce qui ne le dit nulle part', () => {
    expect(estElectronique('VOID, DESOLUS avec STREGONERIA, POSTLUVEN', 'Concert Métal / Metal Concert', 'Les Productions Dungeon Works')).toBe(false);
    expect(estElectronique("TRIVIA NIGHT AT HURLEY'S", null, null)).toBe(false);
  });
  /* L'ANNONCE QUI NOMME TOUT : l'electro entre le rock et le latin n'est pas
     une soiree electro. Une seule autre scene a cote ne gene pas. */
  it('lit l annonce, mais pas quand elle nomme deux autres scenes', () => {
    expect(estElectronique('La Grande soirée dansante de DJ Fred Savard', 'Pop 80/90, dance, rock indie, franco, latin, electro, musiques des Caraïbes.', 'Fred Savard')).toBe(false);
    expect(estElectronique('GLOBAL SESSIONS MONTREAL', 'DJ GLOBAL is coming! Afro House, Amapiano, Afrobeats & Global Sounds!', 'Rib Entertainment')).toBe(true);
    expect(estElectronique('Symbiosis \u2013 Le Rituel', 'un univers techno aux saveurs psy-tech. Aux platines : Aël Solara.', null)).toBe(true);
  });
  /* UN DJ SET DANS UNE DEGUSTATION reste une degustation. */
  it('un dj set ne l emporte pas sur un bloquant du titre', () => {
    expect(estElectronique('Goûtez l’Afrique du Sud | Vins, bouchées et DJ set', 'DJ set par le collectif Moonshine', null)).toBe(false);
  });
  /* « DJ » et « disco » seuls ne decident plus : un DJ de mariage en porte. */
  it('ne se contente plus d un mot faible', () => {
    expect(estElectronique('2000s Throwback Night Taverna (DJ Advocate)', 'DJ toute la nuit', 'TAVERNA')).toBe(false);
    expect(estElectronique('#LeCypher #404 - Live Hip-Hop Thursdays', 'dj set', null)).toBe(false);
  });
  /* « techno » nu attrapait « Technology ». */
  it('ne prend pas « techno » dans « technology », ni les autres mots enclaves', () => {
    expect(estElectronique('Conference on Information Technology and Computing', null, null)).toBe(false);
    expect(estElectronique('Grand entrance gala', 'discount travel to Edmonton', null)).toBe(false);
  });
  /* UN MOT FORT DANS LE TITRE L'EMPORTE sur un bloquant a cote. */
  it('un mot fort dans le titre l emporte sur un bloquant', () => {
    expect(estElectronique('Techno-Metal Night', 'metal', null)).toBe(true);
    expect(estElectronique('Cirque Du Rave: The Freakshow - Montreal', null, 'Cirque Du Rave')).toBe(true);
  });
  /* UN CHIFFRE COLLE AU MOT N'EST PAS UNE LETTRE : « Down2Techno » doit passer. */
  it('accepte un mot electronique colle a un chiffre', () => {
    expect(estElectronique('Down2Techno: FEL!, Pinch, POM', null, null)).toBe(true);
  });
  it('ne prend pas « set » ni « dj » a l interieur d un autre mot', () => {
    expect(estElectronique('Sunset Yoga', 'settle in', 'Adjust Co')).toBe(false);
  });
});
