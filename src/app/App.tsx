import type { CSSProperties } from 'react';
import styles from './App.module.css';

/* Les quatorze familles, avec la teinte définie dans tokens.css et l'année
   d'émergence de leur genre le plus ancien. Cette page n'est pas un
   placeholder : c'est la première épreuve de la palette, du plafond de chroma
   et de l'échelle d'ancienneté. Les données réelles arrivent en P1. */
interface Family {
  readonly id: string;
  readonly hue: number;
  readonly chroma: 'default' | 'roots';
  readonly year: number;
}

const FAMILIES: readonly Family[] = [
  { id: 'roots', hue: 70, chroma: 'roots', year: 1948 },
  { id: 'disco', hue: 55, chroma: 'default', year: 1973 },
  { id: 'industrial', hue: 105, chroma: 'default', year: 1977 },
  { id: 'electro', hue: 135, chroma: 'default', year: 1982 },
  { id: 'house', hue: 30, chroma: 'default', year: 1984 },
  { id: 'techno', hue: 225, chroma: 'default', year: 1985 },
  { id: 'breaks', hue: 330, chroma: 'default', year: 1990 },
  { id: 'hardcore', hue: 300, chroma: 'default', year: 1991 },
  { id: 'trance', hue: 275, chroma: 'default', year: 1992 },
  { id: 'ambient', hue: 185, chroma: 'default', year: 1992 },
  { id: 'psy', hue: 250, chroma: 'default', year: 1993 },
  { id: 'downtempo', hue: 160, chroma: 'default', year: 1994 },
  { id: 'bass', hue: 355, chroma: 'default', year: 1997 },
  { id: 'minimal', hue: 205, chroma: 'default', year: 2001 }
];

const DECADES = [1970, 1980, 1990, 2000, 2010, 2020] as const;

const OLDEST_YEAR = 1948;
const NEWEST_YEAR = 2026;

/* 0 pour la famille la plus ancienne, 1 pour la plus récente. La conversion
   en luminosité se fait en CSS, à partir des jetons. */
const ageRatio = (year: number): number =>
  (year - OLDEST_YEAR) / (NEWEST_YEAR - OLDEST_YEAR);

export function App() {
  return (
    <div className={styles.plate}>
      <div className={styles.frame}>
        <span className={`${styles.registration} ${styles.topLeft}`} aria-hidden="true" />
        <span className={`${styles.registration} ${styles.topRight}`} aria-hidden="true" />
        <span className={`${styles.registration} ${styles.bottomLeft}`} aria-hidden="true" />
        <span className={`${styles.registration} ${styles.bottomRight}`} aria-hidden="true" />

        {/* Marge gauche : la colonne de temps, lisible à tous les zooms. */}
        <div className={styles.timeColumn} aria-hidden="true">
          <span className={styles.rupture} title="Échelle compressée avant 1969" />
          {DECADES.map((decade) => (
            <span key={decade} className={styles.decade}>
              {decade}
            </span>
          ))}
        </div>

        <main className={styles.field}>
          <span className={styles.watermark} aria-hidden="true">
            Atlas
          </span>

          <header className={styles.masthead}>
            <h1 className={styles.wordmark}>Sonaa</h1>
            <p className={styles.tagline}>
              Atlas généalogique des musiques électroniques. Chaque genre est une durée,
              posée sur l&apos;axe du temps, reliée à ce dont elle descend.
            </p>
          </header>

          <section className={styles.familyScale} aria-label="Échelle chromatique des familles">
            <p className={styles.familyScaleLabel}>
              14 familles, luminosité selon l&apos;ancienneté
            </p>
            <ul className={styles.familyList}>
              {FAMILIES.map((family) => (
                <li
                  key={family.id}
                  className={styles.family}
                  style={
                    {
                      '--family-hue': family.hue,
                      '--family-chroma-own':
                        family.chroma === 'roots'
                          ? 'var(--family-chroma-roots)'
                          : 'var(--family-chroma)',
                      '--age-ratio': ageRatio(family.year)
                    } as CSSProperties
                  }
                >
                  <span className={styles.familyStroke} aria-hidden="true" />
                  {family.id}
                </li>
              ))}
            </ul>
          </section>

          <p className={styles.dataLine}>
            <span>P0 · fondations</span>
            <span>1948 — 2026</span>
            <span>14 familles</span>
            <span>0 genre</span>
          </p>
        </main>
      </div>
    </div>
  );
}
