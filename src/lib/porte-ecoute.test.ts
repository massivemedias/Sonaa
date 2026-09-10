// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* La session est simulee : le test decide qui est connecte. */
let session: object | null = null;
vi.mock('./useSession.ts', () => ({ sessionActuelle: () => session }));
vi.mock('./config.ts', () => ({ contributionsActives: true }));

const { peutEcouter, EVENEMENT_CONNEXION, MOTIF_ECOUTE } = await import('./porte-ecoute.ts');

describe('peutEcouter', () => {
  beforeEach(() => {
    session = null;
  });

  it('laisse passer quand une session existe, sans rien ouvrir', () => {
    session = { user: { id: 'x' } };
    const ouvertures = vi.fn();
    window.addEventListener(EVENEMENT_CONNEXION, ouvertures);
    expect(peutEcouter()).toBe(true);
    expect(ouvertures).not.toHaveBeenCalled();
    window.removeEventListener(EVENEMENT_CONNEXION, ouvertures);
  });

  it('refuse sans session et ouvre le panneau avec le motif ecoute', () => {
    let motif: unknown = null;
    const h = (e: Event): void => {
      motif = (e as CustomEvent<string>).detail;
    };
    window.addEventListener(EVENEMENT_CONNEXION, h);
    expect(peutEcouter()).toBe(false);
    expect(motif).toBe(MOTIF_ECOUTE);
    window.removeEventListener(EVENEMENT_CONNEXION, h);
  });
});
