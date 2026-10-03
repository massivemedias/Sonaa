/* LA TABLE, FACON XONE.
 *
 * Mika, le 3 octobre 2026 : « les 4 filtres comme une Xone 4 faders, mais
 * que ce soit juste les 2 premiers utilises ; des FX Reverb, Delay, Disto,
 * Chorus et deux ou trois trucs de DJ ; un knob de filtre directement
 * au-dessus du fader, d'une couleur differente ; tous les FX globaux ».
 *
 * Quatre voies sont dessinees, comme sur la table ; les deux dernieres sont
 * eteintes, parce qu'il n'y a que deux platines. Les effets sont sur le bus
 * maitre, un potard chacun, comme les GLOBAL FX de la MM-808 (Mika les
 * voulait « en knob ») ; leur tempo suit la platine qu'on entend le plus. */

import { useEffect, useRef, useState } from 'react';
import { t } from '../langue/langue.ts';
import { LED_DU_VU, ledsAllumees } from './calculs.ts';
import { Bouton, Crochet, Fader } from './Commandes.tsx';
import { DIVISIONS, EFFETS, moteurExistant, obtenirMoteur, type NomEffet } from './moteur.ts';

interface ReglagesVoie {
  gain: number;
  aigu: number;
  medium: number;
  bas: number;
  filtre: number;
  volume: number;
}

const VOIE_NEUTRE: ReglagesVoie = { gain: 0, aigu: 0, medium: 0, bas: 0, filtre: 0, volume: 0.8 };
const SANS_EFFET = Object.fromEntries(EFFETS.map((e) => [e, 0])) as Record<NomEffet, number>;

interface Props {
  /** Le tempo de la platine qu'on entend le plus : celui des effets. */
  readonly bpm: number;
  /** Ce que la page doit savoir pour choisir ce tempo. */
  readonly onVolumes: (v: { a: number; b: number; croise: number }) => void;
}

export function TableVue({ bpm, onVolumes }: Props) {
  const [voies, setVoies] = useState<[ReglagesVoie, ReglagesVoie]>([VOIE_NEUTRE, VOIE_NEUTRE]);
  const [croise, setCroise] = useState(0);
  const [maitre, setMaitre] = useState(0.88);
  const [doses, setDoses] = useState<Record<NomEffet, number>>(SANS_EFFET);
  const [dernier, setDernier] = useState<NomEffet | null>(null);
  const [division, setDivision] = useState<number>(1);

  const regler = (i: 0 | 1, champ: keyof ReglagesVoie, v: number): void => {
    setVoies((avant) => {
      const suite: [ReglagesVoie, ReglagesVoie] = [{ ...avant[0] }, { ...avant[1] }];
      suite[i][champ] = v;
      return suite;
    });
    const voie = obtenirMoteur().table.voies[i];
    if (champ === 'gain') voie.gain(v);
    else if (champ === 'filtre') voie.filtre(v);
    else if (champ === 'volume') voie.volume(v);
    else voie.egaliseur(champ, v);
  };

  useEffect(() => {
    onVolumes({ a: voies[0].volume, b: voies[1].volume, croise });
  }, [voies, croise, onVolumes]);

  useEffect(() => {
    moteurExistant()?.table.effets.tempo({ bpm });
  }, [bpm]);

  /* ═══ LES VU-METRES ═══ A chaque image, sans React. Les segments tombent
     d'un cran toutes les trois images, comme une vraie colonne de LED : un
     pic se voit encore un instant apres le coup de grosse caisse. */
  const vu = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let image = 0;
    let compte = 0;
    const affiches = [0, 0, 0];
    const lire = (): void => {
      image = requestAnimationFrame(lire);
      compte += 1;
      const m = moteurExistant();
      const niveaux = m ? [m.table.voies[0].niveau(), m.table.voies[1].niveau(), m.table.niveauMaitre()] : [0, 0, 0];
      niveaux.forEach((n, i) => {
        const leds = ledsAllumees(n);
        const avant = affiches[i] ?? 0;
        const suite = leds >= avant ? leds : compte % 3 === 0 ? avant - 1 : avant;
        affiches[i] = suite;
        vu.current[i]?.style.setProperty('--pl-niveau', String(suite / LED_DU_VU));
      });
    };
    image = requestAnimationFrame(lire);
    return () => cancelAnimationFrame(image);
  }, []);

  const doser = (e: NomEffet, v: number): void => {
    setDoses((avant) => ({ ...avant, [e]: v }));
    setDernier(e);
    const effets = obtenirMoteur().table.effets;
    effets.tempo({ bpm, division });
    effets.dose(e, v);
  };

  const voie = (i: 0 | 1 | 2 | 3) => {
    const active = i < 2;
    const r = active ? voies[i as 0 | 1] : VOIE_NEUTRE;
    const change = (champ: keyof ReglagesVoie) => (v: number) => {
      if (active) regler(i as 0 | 1, champ, v);
    };
    return (
      <div className="pl-voie" data-active={active} key={i} aria-disabled={!active}>
        <span className="pl-voie-numero" aria-hidden="true">
          {i + 1}
        </span>
        <span className="pl-voie-nom">{active ? (i === 0 ? 'A' : 'B') : t.tableVoieLibre}</span>
        <Bouton valeur={r.gain} min={-1} max={1} neutre={0} onChange={change('gain')} nom={`${t.tableGain} ${i + 1}`} libelle={t.tableGain} />
        <Bouton valeur={r.aigu} min={-1} max={1} neutre={0} onChange={change('aigu')} nom={`${t.tableAigus} ${i + 1}`} libelle={t.tableAigusCourt} />
        <Bouton valeur={r.medium} min={-1} max={1} neutre={0} onChange={change('medium')} nom={`${t.tableMediums} ${i + 1}`} libelle={t.tableMediumsCourt} />
        <Bouton valeur={r.bas} min={-1} max={1} neutre={0} onChange={change('bas')} nom={`${t.tableBasses} ${i + 1}`} libelle={t.tableBassesCourt} />
        <Bouton valeur={r.filtre} min={-1} max={1} neutre={0} onChange={change('filtre')} nom={`${t.tableFiltre} ${i + 1}`} libelle={t.tableFiltre} teinte="filtre" />
        <div className="pl-voie-bas">
          <span
            className="pl-vu"
            aria-hidden="true"
            ref={(el) => {
              if (active) vu.current[i] = el;
            }}
          />
          <Fader sens="vertical" valeur={r.volume} min={0} max={1} neutre={0.8} onChange={change('volume')} nom={t.tableVolume(i + 1)} className="pl-voie-fader" />
        </div>
      </div>
    );
  };

  const divisionAffichee = (d: number): string => (d === 0.25 ? '1/4' : d === 0.5 ? '1/2' : d === 0.75 ? '3/4' : String(d));

  return (
    <section className="pl-machine pl-table" aria-label={t.tableNom}>
      <header className="pl-plaque">
        <span className="pl-marque">SONAA</span>
        <span className="pl-modele">{t.tableNom}</span>
        <span className="pl-plaque-note">4 CH</span>
      </header>

      <div className="pl-effets" aria-label={t.tableEffets}>
        <div className="pl-effets-ecran" aria-live="polite">
          <span>{dernier ? `${t.effetNom(dernier)} ${Math.round(doses[dernier] * 100)}%` : t.tableEffets}</span>
          <span>{divisionAffichee(division)}</span>
          <span>{bpm.toFixed(1)} BPM</span>
        </div>
        <div className="pl-effets-potards">
          {EFFETS.map((e) => (
            <Bouton key={e} valeur={doses[e]} min={0} max={1} neutre={0} onChange={(v) => doser(e, v)} nom={t.effetNom(e)} libelle={t.effetNom(e)} />
          ))}
        </div>
        <div className="pl-effets-temps" role="group" aria-label={t.tableTemps}>
          <span className="pl-silk">{t.tableTemps}</span>
          {DIVISIONS.map((d) => (
            <button
              key={d}
              type="button"
              className="pl-touche"
              aria-pressed={division === d}
              onClick={() => {
                setDivision(d);
                obtenirMoteur().table.effets.tempo({ bpm, division: d });
              }}
            >
              <span className="pl-touche-led" aria-hidden="true" />
              {divisionAffichee(d)}
            </button>
          ))}
        </div>
        <Crochet libelle={t.tableEffets} />
      </div>

      <div className="pl-voies">
        {voie(0)}
        {voie(1)}
        {voie(2)}
        {voie(3)}
        <div className="pl-maitre">
          <span className="pl-voie-numero" aria-hidden="true">
            M
          </span>
          <span className="pl-voie-nom">{t.tableMaitre}</span>
          <Bouton
            valeur={maitre}
            min={0}
            max={1}
            neutre={0.88}
            onChange={(v) => {
              setMaitre(v);
              obtenirMoteur().table.volumeMaitre(v);
            }}
            nom={t.tableMaitre}
            libelle={t.tableMaitre}
          />
          <span
            className="pl-vu pl-vu-maitre"
            aria-hidden="true"
            ref={(el) => {
              vu.current[2] = el;
            }}
          />
        </div>
      </div>

      <div className="pl-croise">
        <span className="pl-silk pl-silk-fort" aria-hidden="true">
          A
        </span>
        <Fader
          sens="horizontal"
          valeur={croise}
          min={-1}
          max={1}
          neutre={0}
          onChange={(v) => {
            setCroise(v);
            obtenirMoteur().table.crossfader(v);
          }}
          nom={t.tableCrossfader}
          className="pl-croise-fader"
        />
        <span className="pl-silk pl-silk-fort" aria-hidden="true">
          B
        </span>
      </div>
      <Crochet libelle={t.tableCrossfader} />
    </section>
  );
}
