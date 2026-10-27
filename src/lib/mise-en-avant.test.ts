import { describe, expect, it } from 'vitest';
import { enAvantDabord, prixLisible, sessionDeLAdresse } from './mise-en-avant.ts';
import { corpsDeSession, lireDemandeMise, lireSession, sessionValide } from './stripe-session.ts';

describe('mise en avant, cote page', () => {
  it('passe les soirees mises en avant devant, sans changer l ordre des autres', () => {
    const liste = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(enAvantDabord(liste, new Set(['c', 'a'])).map((x) => x.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(enAvantDabord(liste, new Set()).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('lit la session du retour Stripe et rien d autre', () => {
    expect(sessionDeLAdresse('?mise=cs_live_a1B2c3D4e5F6g7')).toBe('cs_live_a1B2c3D4e5F6g7');
    expect(sessionDeLAdresse('?mise=cs_test_abc')).toBeNull();
    expect(sessionDeLAdresse('?mise=cs_live_a1B2c3D4e5/../x')).toBeNull();
    expect(sessionDeLAdresse('?autre=1')).toBeNull();
  });

  it('ecrit un prix lisible en dollars canadiens', () => {
    expect(prixLisible(1800, 'fr-CA').replace(/\s/g, ' ')).toBe('18 $');
    expect(prixLisible(1250, 'fr-CA').replace(/\s/g, ' ')).toBe('12,50 $');
    expect(prixLisible(1800, 'en-CA')).toBe('$18');
  });
});

describe('mise en avant, cote Stripe', () => {
  const brut = {
    soiree_id: '2245678',
    ville: 'montreal-ca',
    titre: '  Nuit   techno ',
    quand: '2026-11-08T22:00:00',
    nom: 'Collectif',
    courriel: 'Org@Exemple.CA',
    message: 'Bonjour\nmerci',
    langue: 'en',
  };

  it('lit une demande et la borne', () => {
    const d = lireDemandeMise(brut);
    expect(d).toEqual({ ...brut, titre: 'Nuit techno', courriel: 'org@exemple.ca', message: 'Bonjour\nmerci', langue: 'en' });
  });

  it('refuse une demande incomplete ou douteuse', () => {
    expect(lireDemandeMise({ ...brut, courriel: 'pas-un-courriel' })).toBeNull();
    expect(lireDemandeMise({ ...brut, ville: 'Montreal CA' })).toBeNull();
    expect(lireDemandeMise({ ...brut, quand: 'demain' })).toBeNull();
    expect(lireDemandeMise({ ...brut, nom: '   ' })).toBeNull();
    expect(lireDemandeMise(null)).toBeNull();
  });

  it('ecrit la session de paiement en dollars canadiens, retour sur la page de la ville', () => {
    const p = corpsDeSession({ id: 'u-1', montant: 1800, titre: 'Nuit techno', ville: 'montreal-ca', courriel: 'org@exemple.ca', langue: 'fr' });
    expect(p.get('mode')).toBe('payment');
    expect(p.get('line_items[0][price_data][currency]')).toBe('cad');
    expect(p.get('line_items[0][price_data][unit_amount]')).toBe('1800');
    expect(p.get('line_items[0][price_data][product_data][name]')).toBe('Mise en avant sur SONAA : Nuit techno');
    expect(p.get('metadata[mise_id]')).toBe('u-1');
    expect(p.get('success_url')).toBe('https://sonaa.ca/soirees/montreal-ca/?mise={CHECKOUT_SESSION_ID}');
    expect(p.get('cancel_url')).toBe('https://sonaa.ca/soirees/montreal-ca/');
    /* Stripe recoit les accolades decodees : le corps encode, relu, les rend. */
    expect(new URLSearchParams(p.toString()).get('success_url')).toContain('{CHECKOUT_SESSION_ID}');
  });

  it('ne tient pour payee qu une session reglee en dollars canadiens', () => {
    const id = 'cs_live_a1B2c3D4e5F6g7';
    expect(sessionValide(id)).toBe(true);
    expect(lireSession({ id, payment_status: 'paid', currency: 'cad', amount_total: 1800 })).toEqual({ session: id, payee: true, montant: 1800 });
    expect(lireSession({ id, payment_status: 'unpaid', currency: 'cad', amount_total: 1800 })?.payee).toBe(false);
    expect(lireSession({ id, payment_status: 'paid', currency: 'usd', amount_total: 1800 })?.payee).toBe(false);
    expect(lireSession({ id: 'pi_123', payment_status: 'paid', currency: 'cad', amount_total: 1800 })).toBeNull();
  });
});
