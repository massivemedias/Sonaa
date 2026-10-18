import { describe, expect, it } from 'vitest';
import { adresseCourte, adresseDuReseau, liensAffiches, RESEAUX } from './reseaux.ts';

const reseau = (id: string) => RESEAUX.find((r) => r.id === id)!;

describe('adresseDuReseau', () => {
  it('fait une adresse d un simple identifiant', () => {
    expect(adresseDuReseau(reseau('soundcloud'), 'maudite-machine')).toBe('https://soundcloud.com/maudite-machine');
    expect(adresseDuReseau(reseau('instagram'), '@mme.s')).toBe('https://www.instagram.com/mme.s');
    expect(adresseDuReseau(reseau('bandcamp'), 'vrstl')).toBe('https://vrstl.bandcamp.com/');
    expect(adresseDuReseau(reseau('instagram'), '@dj.mike')).toBe('https://www.instagram.com/dj.mike');
  });
  it('reconnait une adresse sans protocole sur le domaine du reseau', () => {
    expect(adresseDuReseau(reseau('soundcloud'), 'soundcloud.com/x')).toBe('https://soundcloud.com/x');
    expect(adresseDuReseau(reseau('bandcamp'), 'vrstl.bandcamp.com')).toBe('https://vrstl.bandcamp.com/');
    expect(adresseDuReseau(reseau('instagram'), 'www.instagram.com/mme.s')).toBe('https://www.instagram.com/mme.s');
  });
  it('garde une adresse complete', () => {
    expect(adresseDuReseau(reseau('facebook'), 'https://facebook.com/withdimensions')).toBe('https://facebook.com/withdimensions');
    expect(adresseDuReseau(reseau('site'), 'sonaa.ca')).toBe('https://sonaa.ca/');
  });
  it('refuse ce qui n est pas une adresse web', () => {
    expect(adresseDuReseau(reseau('site'), 'javascript:alert(1)')).toBeNull();
    expect(adresseDuReseau(reseau('site'), '   ')).toBeNull();
  });
});

describe('liensAffiches', () => {
  it('suit l ordre des reseaux et ecarte les adresses non web', () => {
    const l = liensAffiches({ site: 'https://sonaa.ca', instagram: 'https://instagram.com/x', facebook: 'javascript:alert(1)' });
    expect(l.map((x) => x.reseau.id)).toEqual(['instagram', 'site']);
  });
});

describe('adresseCourte', () => {
  it('retire le protocole et le www', () => {
    expect(adresseCourte('https://www.facebook.com/withdimensions/')).toBe('facebook.com/withdimensions');
  });
});
