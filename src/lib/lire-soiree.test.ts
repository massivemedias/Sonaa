/* LIRE UNE SOIREE DANS UNE PAGE. Les extraits ci-dessous sont reduits de
   pages reelles relevees le 1er octobre 2026. Voir lire-soiree.ts. */

import { describe, expect, it } from 'vitest';
import { adresseFacebook, jourEtHeure, lireLaPage, lireLeLienSeul, phraseFacebook, sourceDuLien } from './lire-soiree.ts';

const FACEBOOK = `<html><head>
<meta property="og:title" content="KIMONO CLUB - &quot;HOUSE IN THE SKY&quot;" />
<meta property="og:description" content="Event in Montreal by Robin Des Bois and Kimono Club on Friday, October 2 2026" />
<meta property="og:url" content="https://www.facebook.com/events/3933-avenue-du-parc-la-fontaine-montreal-qc-canada-quebec-h2l-0c7/kimono-club-house-in-the-sky/1040142175666932/" />
<meta property="og:image" content="https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=1040142175666932" />
</head></html>`;

const EVENTBRITE = `<html><head>
<meta property="og:title" content="Titre de partage" />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SocialEvent","name":"WEBZ- Syncopath Collective Launch Party",
"startDate":"2026-10-02T18:00:00-04:00","location":{"@type":"Place","name":"La Récré","address":{"@type":"PostalAddress",
"streetAddress":"5860 Avenue De Lorimier","addressLocality":"Montréal"}},"image":"https://img.evbuc.com/x.jpg",
"performer":[{"@type":"Person","name":"TempoTantrum"},{"@type":"Person","name":"Weird Ferrari"}],
"organizer":{"@type":"Organization","name":"Syncopath"},"offers":[{"@type":"AggregateOffer","lowPrice":"16.5","highPrice":"16.5","priceCurrency":"CAD"}],
"description":"Techno, Dnb &amp; alternative fashion"}</script>
</head></html>`;

describe('sourceDuLien', () => {
  it('reconnait les sources et leur identifiant', () => {
    expect(sourceDuLien('https://www.facebook.com/events/2184574042413370/')).toEqual({ source: 'facebook', ref: '2184574042413370' });
    expect(sourceDuLien('https://m.facebook.com/events/2184574042413370?ref=x')).toEqual({ source: 'facebook', ref: '2184574042413370' });
    expect(sourceDuLien('https://ra.co/events/2246730')).toEqual({ source: 'ra', ref: '2246730' });
    expect(sourceDuLien('https://www.eventbrite.ca/e/webz-tickets-1999419434351').source).toBe('eventbrite');
    expect(sourceDuLien('https://exemple.com/soiree').source).toBe('page');
  });
});

describe('jourEtHeure', () => {
  it('garde le jour et l heure de la salle, sans convertir', () => {
    expect(jourEtHeure('2026-10-02T22:00:00-04:00')).toEqual({ jour: '2026-10-02', heure: '22:00' });
    expect(jourEtHeure('2026-10-02')).toEqual({ jour: '2026-10-02', heure: null });
  });
});

describe('Facebook', () => {
  it('lit la ville, les organisateurs et le jour dans la phrase d apercu', () => {
    expect(phraseFacebook('Event in Montreal by WaterFront.Events and 4 others on Friday, October 2 20265 posts in the discussion.')).toEqual({
      ville: 'Montreal',
      organisateur: 'WaterFront.Events',
      jour: '2026-10-02',
      heure: null,
    });
  });

  it('remet l adresse de l URL canonique en mots', () => {
    expect(adresseFacebook('https://www.facebook.com/events/1403-rue-ste-%C3%A9lisabeth-montr%C3%A9al-qc-h2x-3c5-canada/whales/2831823020523334/')).toBe(
      '1403 Rue Ste Élisabeth Montréal QC H2X 3C5'
    );
  });

  it('remplit ce que la page donne, et laisse vide l heure et la salle', () => {
    const s = lireLaPage(FACEBOOK, 'https://www.facebook.com/events/1040142175666932/');
    expect(s.titre).toBe('KIMONO CLUB - "HOUSE IN THE SKY"');
    expect(s.jour).toBe('2026-10-02');
    expect(s.heure).toBeNull();
    expect(s.lieu).toBeNull();
    expect(s.organisateur).toBe('Robin Des Bois, Kimono Club');
    expect(s.adresse).toBe('3933 Avenue du Parc la Fontaine Montreal QC H2L 0C7');
    expect(s.affiche).toContain('lookaside.fbsbx.com');
  });

  it('ne prend pas la page de connexion pour une soiree', () => {
    const s = lireLaPage('<meta property="og:title" content="Log in or sign up to view" />', 'https://www.facebook.com/events/1/');
    expect(s.titre).toBeNull();
  });
});

describe('JSON-LD', () => {
  it('prefere ce que la source declare a ses balises de partage', () => {
    const s = lireLaPage(EVENTBRITE, 'https://www.eventbrite.ca/e/webz-syncopath-collective-launch-party-tickets-1999419434351');
    expect(s.titre).toBe('WEBZ- Syncopath Collective Launch Party');
    expect(s).toMatchObject({ jour: '2026-10-02', heure: '18:00', lieu: 'La Récré', ville: 'Montréal' });
    expect(s.adresse).toBe('5860 Avenue De Lorimier, Montréal');
    expect(s.artistes).toEqual(['TempoTantrum', 'Weird Ferrari']);
    expect(s.prix).toBe('16.50 CAD');
    expect(s.organisateur).toBe('Syncopath');
    expect(s.description).toBe('Techno, Dnb & alternative fashion');
  });
});

describe('lireLeLienSeul', () => {
  it('tire le titre et la date de l adresse Ticketmaster', () => {
    const s = lireLeLienSeul('https://www.ticketmaster.ca/container-live-avec-kill-alters-live-montreal-quebec-10-01-2026/event/310064FBF142C0EC');
    expect(s.jour).toBe('2026-10-01');
    expect(s.titre).toBe('Container live avec kill alters live montreal quebec');
  });
});
