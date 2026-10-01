/* CE QUE LE COURS DESSINE : le tempo, et la photo d'une machine. Voir
   cours.ts. */

import { describe, expect, it } from 'vitest';
import { photoDeMachine, tempoDuCours } from './cours.ts';

describe('tempoDuCours', () => {
  it('lit une plage, ou un tempo seul', () => {
    expect(tempoDuCours('Le suomisaundi tourne entre 140 et 150 BPM, mais...')).toEqual([140, 150]);
    expect(tempoDuCours('140 BPM, sans discussion : c’est le tempo du genre.')).toEqual([140, 140]);
    expect(tempoDuCours('Le psycore commence vers 180 BPM et monte à 200, 220.')).toEqual([180, 200]);
  });
  it('ne dessine rien quand le cours dit qu il n y a pas de tempo', () => {
    expect(tempoDuCours('Il n’y a pas de tempo au sens dance : la musique concrète... 120 BPM')).toBeNull();
    expect(tempoDuCours('Pas de tempo, et le temps se compte en minutes.')).toBeNull();
  });
});

describe('photoDeMachine', () => {
  const cles = ['Roland TR-8', 'Roland TR-808', 'Roland TR-8S', 'Minimoog', 'Akai MPC2000', 'Akai MPC2000XL', 'Rhodes'];
  it('trouve la photo la plus precise', () => {
    expect(photoDeMachine('Roland TR-808', cles)).toBe('Roland TR-808');
    expect(photoDeMachine('Roland TR-8S', cles)).toBe('Roland TR-8S');
    expect(photoDeMachine('Moog Minimoog Model D', cles)).toBe('Minimoog');
    expect(photoDeMachine('Akai MPC2000XL', cles)).toBe('Akai MPC2000XL');
    expect(photoDeMachine('Fender Rhodes Mark I', cles)).toBe('Rhodes');
  });
  it('ne confond pas un modele avec un autre', () => {
    expect(photoDeMachine('Roland TR-909', cles)).toBeNull();
    expect(photoDeMachine('Ableton Operator', cles)).toBeNull();
  });
});
