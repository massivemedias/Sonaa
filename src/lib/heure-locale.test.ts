import { describe, expect, it } from 'vitest';
import { instantLocal } from './heure-locale.ts';

describe('instantLocal', () => {
  it('22 h a Montreal en septembre, c est 02:00 UTC le lendemain', () => {
    expect(instantLocal('2026-09-12', '22:00', 'America/Toronto').toISOString()).toBe('2026-09-13T02:00:00.000Z');
  });
  it('22 h a Montreal en janvier, c est 03:00 UTC : l heure d hiver compte', () => {
    expect(instantLocal('2027-01-16', '22:00', 'America/Toronto').toISOString()).toBe('2027-01-17T03:00:00.000Z');
  });
  it('23 h 30 a Paris en juillet, c est 21:30 UTC', () => {
    expect(instantLocal('2026-07-04', '23:30', 'Europe/Paris').toISOString()).toBe('2026-07-04T21:30:00.000Z');
  });
  it('minuit a Tokyo, c est 15:00 UTC la veille', () => {
    expect(instantLocal('2026-10-10', '00:00', 'Asia/Tokyo').toISOString()).toBe('2026-10-09T15:00:00.000Z');
  });
});
