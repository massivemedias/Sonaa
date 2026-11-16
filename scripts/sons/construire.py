"""LA BIBLIOTHEQUE D'INSTRUMENTS DES AFFICHES DE RYTHME (ADR-122).

Usage : python3 scripts/sons/construire.py [--seulement id1,id2]

Mika, le 16 novembre 2026 : « les sons sont horribles et ne refletent pas du
tout le style ; prends de bons one-shots pour tous les sous-styles », puis :
« remplace aussi les accords et les basses par des samples, refais la
totale ». Le navigateur ne fabrique plus aucun son : il lit des fichiers.

Ce script ecrit ces fichiers dans public/sons et leur fiche dans
src/data/instruments-sons.json. Trois provenances, toutes libres :

- les enregistrements CC0 de la Versilian (VCSL) et du VSCO-2-CE : piano
  Steinway, piano FM et Clavisynth du TX81Z, sections de cordes, trompette
  et trombone, flute, harpe, kalimba, balafon, glockenspiel, cloches
  tubulaires, harmonica, gong, enclume, timbales ;
- les echantillons CC0 de Sonic Pi (percussions electroniques, glitch,
  scratch, tabla, impact) ;
- des synthetiseurs ecrits en Faust (faust.py) et rendus ici une fois pour
  toutes : basses Juno, Minimoog, SH-101, 303, reese, wobble, growl, 808,
  log drum, nappes, cordes de synthe, supersaw, orgues, stabs, hoover,
  screech, kicks de gabber, de hardstyle et de psytrance, montee, salles.

Chaque instrument accorde est enregistre en plusieurs ZONES, une note toutes
les six ou sept demi-tons : le moteur prend la plus proche et ne la
transpose jamais de plus de trois ou quatre demi-tons, ce qui garde le
timbre. Chaque note est egalisee en energie, pour que les instruments se
remplacent l'un l'autre sans saut de volume.

Les clones se font a part (sans blobs, git va chercher chaque fichier) :
  git clone --filter=blob:none --no-checkout https://github.com/sgossner/VCSL ~/libs/VCSL
  git clone --filter=blob:none --no-checkout https://github.com/sgossner/VSCO-2-CE ~/libs/VSCO
  Sonic Pi : etc/samples du depot sonic-pi-net/sonic-pi, dans ~/libs/sonic-pi
  oramics/sampled : ~/oramics/sampled (deja utilise par convertir-sons.py)
"""
import hashlib
import json
import os
from collections import Counter
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import faust as F  # noqa: E402
from outils import (  # noqa: E402
    accorder,
    convoluer,
    couper,
    decoder,
    ecrire,
    egaliser,
    frequence,
    hauteur,
    lire,
    lister_git,
    midi_de,
    midi_du_nom,
    passe_bas,
    passe_haut,
)

RACINE = Path(__file__).resolve().parents[2]
SORTIE = RACINE / 'public' / 'sons'
FICHE = RACINE / 'src' / 'data' / 'instruments-sons.json'
LIBS = Path(os.environ.get('SONAA_LIBS', '/home/user/libs'))
VCSL = LIBS / 'VCSL'
VSCO = LIBS / 'VSCO'
SONICPI = LIBS / 'sonic-pi' / 'etc' / 'samples'
ORAMICS = Path(os.environ.get('SONAA_ORAMICS', '/home/user/oramics/sampled'))
CACHE = Path.home() / '.cache' / 'sonaa-sons'

GRAVE = 22050  # basses et nappes sombres : rien d'utile au-dessus de 11 kHz
MEDIUM = 32000  # claviers, cordes, leads
AIGU = 44100  # percussions

# Les zones : une note enregistree toutes les six ou sept demi-tons, sur le
# registre ou le moteur joue chaque famille (voir hauteurs() dans son.ts).
Z_SUB = [24, 31, 38, 45]
Z_BASSE = [31, 38, 45, 52, 59]
Z_ACIDE = [43, 50, 57, 64, 71]
Z_ACCORD = [60, 66, 72, 78, 84, 90]
Z_NAPPE = [59, 68, 77, 86]
Z_LEAD = [66, 72, 78, 84, 90]


# ─── Les sources ──────────────────────────────────────────────────────────


def _cache(cle: str, charger) -> np.ndarray:
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / (hashlib.sha1(cle.encode()).hexdigest() + '.npy')
    if f.exists():
        return np.load(f)
    x = charger()
    np.save(f, x)
    return x


def git_audio(depot: Path, relatif: str, taux: int) -> np.ndarray:
    import subprocess

    def charger():
        donnees = subprocess.run(['git', '-C', str(depot), 'show', f'HEAD:{relatif}'], capture_output=True, check=True).stdout
        return decoder(donnees, taux)

    return _cache(f'{depot}:{relatif}:{taux}', charger)


class Enregistre:
    """Un instrument enregistre : ses fichiers, la hauteur mesuree de chacun."""

    def __init__(self, depot: Path, dossier: str, filtre: str, taux: int, debut: float = 0.08, transpose: int = 0):
        self.notes: list[tuple[float, str]] = []
        self.depot, self.taux = depot, taux
        for rel in lister_git(depot, dossier):
            if not re.search(filtre, rel):
                continue
            nom = midi_du_nom(Path(rel).name)
            x = git_audio(depot, rel, taux)
            f = hauteur(x, taux, debut=debut, duree=0.4)
            m = midi_de(f) if f else None
            # la mesure decide de l'octave ; le nom ne sert que si elle echoue
            if m is None or (nom is not None and abs(m - (nom + transpose)) > 13):
                if nom is None:
                    continue
                m = float(nom + transpose)
            self.notes.append((m, rel))
        if not self.notes:
            raise RuntimeError(f'aucune note dans {dossier} ({filtre})')
        # LES ERREURS D'OCTAVE. Chaque collection nomme ses notes avec sa propre
        # convention (do 4 = MIDI 60 ou 72), et la mesure se trompe parfois
        # d'une octave sur une note douce ou tres aigue. Le decalage le plus
        # frequent entre le nom et la mesure est la convention ; une note qui
        # s'en ecarte d'une octave tout rond est ramenee sur son nom, avec
        # l'accord fin de la mesure.
        decalages = Counter(round(m - n) for m, rel in self.notes if (n := midi_du_nom(Path(rel).name)) is not None)
        if decalages:
            convention = decalages.most_common(1)[0][0]
            corrigees = []
            for m, rel in self.notes:
                n = midi_du_nom(Path(rel).name)
                if n is not None:
                    e = m - (n + convention)
                    k = round(e / 12)
                    if k != 0 and abs(e - 12 * k) < 0.7:
                        m -= 12 * k
                corrigees.append((m, rel))
            self.notes = corrigees
        self.notes.sort()

    def note(self, midi: float) -> np.ndarray:
        """La note enregistree la plus proche, accordee exactement sur `midi`."""
        m, rel = min(self.notes, key=lambda n: abs(n[0] - midi))
        x = git_audio(self.depot, rel, self.taux)
        return accorder(x, 2 ** ((midi - m) / 12))

    def etendue(self) -> tuple[float, float]:
        return self.notes[0][0], self.notes[-1][0]


def sonicpi(nom: str, taux: int = AIGU) -> np.ndarray:
    return lire(SONICPI / f'{nom}.flac', taux)


def oramics(rel: str, taux: int = AIGU) -> np.ndarray:
    return lire(ORAMICS / rel, taux)


def vcsl(rel: str, taux: int = AIGU) -> np.ndarray:
    return git_audio(VCSL, rel, taux)


def melange(*couches: tuple[np.ndarray, float]) -> np.ndarray:
    n = max(len(x) for x, _ in couches)
    y = np.zeros(n)
    for x, g in couches:
        y[: len(x)] += x * g
    return y


def sature(x: np.ndarray, k: float) -> np.ndarray:
    return np.tanh(k * x / max(1e-9, np.abs(x).max())) / np.tanh(k)


# ─── Le catalogue ─────────────────────────────────────────────────────────
#
# mode : « tenu » s'arrete a la fin de la note avec un fondu de `relache` ;
# « libre » sonne jusqu'au bout de son fichier (piano, cloche, pluck) ;
# « fige » est un accord enregistre, joue sur la fondamentale ; « coup » est
# une frappe sans hauteur.

CATALOGUE: dict[str, dict] = {}


def synthe(id_, patch, reglages, zones, porte, total, taux=MEDIUM, mode='tenu', relache=0.04, rms=-18, large=False, apres=None):
    CATALOGUE[id_] = dict(
        type='faust', patch=patch, reglages=reglages, zones=zones, porte=porte, total=total, taux=taux,
        mode=mode, relache=relache, rms=rms, large=large, apres=apres,
    )


def enregistre(id_, source, zones, longueur, taux=MEDIUM, mode='libre', relache=0.15, rms=-18, large=False, apres=None):
    CATALOGUE[id_] = dict(type='note', source=source, zones=zones, longueur=longueur, taux=taux, mode=mode, relache=relache, rms=rms, large=large, apres=apres)


def frappe(id_, fabriquer, rms=None, crete=-1.0, longueur=None, taux=AIGU):
    CATALOGUE[id_] = dict(type='coup', fabriquer=fabriquer, rms=rms, crete=crete, longueur=longueur, taux=taux, mode='coup', zones=[])


def fige(id_, fabriquer, zones, longueur, taux=MEDIUM, relache=0.1, rms=-18, large=False):
    """Un accord enregistre d'un bloc ; `fabriquer(midi)` rend l'accord bati sur `midi`."""
    CATALOGUE[id_] = dict(type='fige', fabriquer=fabriquer, zones=zones, longueur=longueur, taux=taux, mode='fige', relache=relache, rms=rms, large=large)


A = F.ANALOGIQUE

# ── LES BASSES ──
# Juno-106 / Juno-60 : carre et dent de scie, filtre doux. Deep house, italo,
# nu-disco, synthpop, dark disco, downtempo.
synthe('basse-juno', A, dict(suivi=1, wsaw=0.5, wsq=0.7, wsub=0.45, cut=230, envamt=1500, res=0.25, fdec=0.22, fsus=0.15, aatk=0.003, adec=0.45, asus=0.85, arel=0.05, drive=1.5), Z_BASSE, 0.85, 1.0, GRAVE)
# Minimoog : trois oscillateurs, filtre en echelle qui claque. Boogie,
# synth-funk, electro, Moroder.
synthe('basse-moog', A, dict(suivi=1, wsaw=1, wsq=0.5, det=6, wsub=0.3, cut=170, envamt=2700, res=0.45, fdec=0.17, fsus=0.25, aatk=0.002, adec=0.5, asus=0.9, arel=0.04, drive=2.2), Z_BASSE, 0.85, 1.0, GRAVE)
# SH-101 / MC-202 : carre etroit, sous-octave, enveloppe seche. Minimal,
# EBM, techno body music, skweee.
synthe('basse-101', A, dict(suivi=1, wsq=1, pw=0.35, wsaw=0.3, wsub=0.6, cut=240, envamt=3300, res=0.55, fdec=0.11, fsus=0.05, aatk=0.001, adec=0.26, asus=0.55, arel=0.03, drive=1.7), Z_BASSE, 0.5, 0.7, GRAVE)
# La basse roulante de la psytrance : une note par double croche, tres
# courte, attaque nette, filtre qui se ferme en 70 ms.
synthe('basse-roll', A, dict(suivi=1, wsaw=1, wsub=0.5, cut=170, envamt=4300, res=0.35, fdec=0.07, fsus=0, aatk=0.001, adec=0.11, asus=0, arel=0.02, drive=2.6), Z_BASSE, 0.13, 0.26, GRAVE, mode='libre')
# Trois dents de scie saturees : electro house, bass house, big beat, EBM dure.
synthe('basse-saw', A, dict(suivi=1, wsaw=1, det=14, wsub=0.5, cut=480, envamt=3000, res=0.3, fdec=0.25, fsus=0.4, aatk=0.002, adec=0.4, asus=0.9, arel=0.04, drive=5), Z_BASSE, 0.8, 1.0, GRAVE)
# La basse de dub : sinus et triangle, ronde, sans attaque. Dub, reggae,
# dub techno, trip-hop, psydub.
synthe('basse-dub', A, dict(wsin=1, wtri=0.6, cut=320, envamt=250, res=0.1, fdec=0.3, fsus=0.5, aatk=0.008, adec=0.6, asus=0.85, arel=0.1, drive=1.4), Z_BASSE, 0.95, 1.15, GRAVE, relache=0.08)
# La basse FM du DX7 (« Lately bass ») : freestyle, electro DX7, hi-NRG.
synthe('basse-fm', F.FM, dict(ratio=1, idx=4.5, idxs=0.6, idec=0.15, aatk=0.001, adec=0.6, asus=0.45, arel=0.06), Z_BASSE, 0.8, 1.0, GRAVE)
# La basse electrique au doigt : corde pincee et fondamentale. Disco, funk,
# soul de Philadelphie, reggae, post-disco.
synthe('basse-electrique', F.CORDE, dict(brille=1500, t60=1.6, amorti=0.4, attaque=0.006, fond=0.7, fdec=0.9, drive=1.6, cab=3500, hp=30, arel=0.05), Z_BASSE, 0.85, 1.0, GRAVE)
# La contrebasse : plus sombre, plus courte. Nu-jazz, lounge.
synthe('basse-contrebasse', F.CORDE, dict(brille=850, t60=0.9, amorti=0.5, attaque=0.012, fond=0.8, fdec=0.7, drive=1.2, cab=2200, hp=30, arel=0.08), Z_BASSE, 0.85, 1.0, GRAVE)
# La TB-303, normale et accentuee : le filtre s'ouvre plus haut, resonne plus fort.
synthe('basse-303', A, dict(suivi=0.5, wsaw=1, cut=230, envamt=1700, res=0.82, fdec=0.24, fsus=0, aatk=0.002, adec=0.5, asus=0.85, arel=0.03, drive=1.8, hp=60), Z_ACIDE, 0.42, 0.55, MEDIUM, relache=0.02)
synthe('basse-303-accent', A, dict(suivi=0.5, wsaw=1, cut=300, envamt=4200, res=0.9, fdec=0.17, fsus=0, aatk=0.002, adec=0.5, asus=0.9, arel=0.03, drive=2.8, hp=60), Z_ACIDE, 0.42, 0.55, MEDIUM, relache=0.02)
# La reese : deux dents de scie qui battent, filtre qui respire. Jungle,
# drum and bass, speed garage, breakstep.
synthe('basse-reese', A, dict(wsaw=1, det=22, wsub=0.6, cut=850, lfoamt=450, lforate=0.6, res=0.2, aatk=0.01, asus=1, arel=0.08, drive=1.8), Z_BASSE, 1.1, 1.25, GRAVE, relache=0.06)
# La reese sale du techstep et du neurofunk.
synthe('basse-reese-neuro', A, dict(wsaw=1, wsq=0.4, det=30, wsub=0.5, cut=1300, lfoamt=1300, lforate=2.5, res=0.4, aatk=0.005, asus=1, arel=0.06, drive=8, hp=30), Z_BASSE, 1.1, 1.25, GRAVE, relache=0.05)
# Le wobble : un « oua » par note, filtre qui s'ouvre puis se referme.
synthe('basse-wobble', A, dict(wsaw=1, wsq=0.5, wsub=0.6, det=10, cut=170, envamt=2900, fatk=0.11, fdec=0.2, fsus=0, res=0.55, aatk=0.004, asus=1, arel=0.04, drive=4), Z_BASSE, 0.8, 0.95, GRAVE)
# Le growl du brostep et du riddim : modulation rapide, saturation lourde.
synthe('basse-growl', A, dict(wsaw=1, wsq=0.8, pwlfo=0.35, pwrate=9, det=25, cut=420, lfoamt=3000, lforate=7, res=0.6, aatk=0.003, asus=1, arel=0.04, drive=12), Z_BASSE, 0.8, 0.95, GRAVE)
# La basse « warp » du speed garage et du bassline.
synthe('basse-warp', A, dict(wsaw=1, wsq=0.6, pw=0.25, pwlfo=0.2, pwrate=6, det=12, cut=300, envamt=1800, fatk=0.04, fdec=0.2, fsus=0.3, lfoamt=800, lforate=8, res=0.45, aatk=0.003, asus=1, arel=0.04, drive=4), Z_BASSE, 0.8, 0.95, GRAVE)
# La reverse bass du hardstyle : elle monte vers le contretemps puis se coupe.
synthe('basse-reverse', A, dict(wsaw=1, det=20, wsub=0.5, cut=280, envamt=2600, fatk=0.32, fdec=0.01, fsus=1, res=0.4, aatk=0.34, adec=0.01, asus=1, arel=0.012, drive=6), Z_BASSE, 0.36, 0.4, GRAVE, mode='libre')
# La basse saturee du frenchcore et du hardcore.
synthe('basse-saturee', A, dict(wsaw=1, wsq=1, det=15, cut=1900, res=0.3, aatk=0.002, adec=0.2, asus=0.6, arel=0.03, drive=20), Z_BASSE, 0.6, 0.75, GRAVE)
# Le bourdon : une note tenue qui gronde.
synthe('basse-bourdon', A, dict(wsaw=0.7, wsub=0.6, det=8, cut=210, lfoamt=220, lforate=0.2, res=0.2, aatk=0.25, asus=1, arel=0.4, drive=2), Z_BASSE, 2.4, 2.8, GRAVE, relache=0.3)

# ── LES SOUS-BASSES ──
synthe('sub-sinus', A, dict(wsin=1, wtri=0.12, cut=700, res=0, aatk=0.004, asus=1, arel=0.04, drive=1.3), Z_SUB, 1.0, 1.1, GRAVE, relache=0.05)
# La 808 tenue : un sinus qui tombe de sept demi-tons et sature un peu.
synthe('sub-808', A, dict(wsin=1, pst=7, pdec=0.035, cut=3000, aatk=0.001, adec=1.5, asus=0, arel=0.1, drive=2.4), Z_SUB, 1.4, 1.5, GRAVE, mode='libre')
synthe('logdrum', A, dict(wsin=1, wtri=0.25, pst=5, pdec=0.02, cut=2600, aatk=0.001, adec=0.3, asus=0, arel=0.05, drive=2.8), Z_BASSE, 0.3, 0.45, GRAVE, mode='libre')


def rumble(midi: float) -> np.ndarray:
    """Le rumble techno : un grave qui roule dans une salle, sature, filtre bas."""
    x = F.rendre(A, dict(wsaw=0.6, wsin=1, cut=160, res=0.2, aatk=0.002, adec=0.35, asus=0, arel=0.05), frequence(midi), 0.3, 0.5, GRAVE)
    ir = F.salle(2.2, 2.0, GRAVE).mean(axis=0)
    y = convoluer(x, ir)[: int(0.9 * GRAVE)]
    y[: len(x)] += x * 2
    return passe_bas(sature(y, 3), GRAVE, 150)


CATALOGUE['rumble'] = dict(type='fonction', fabriquer=rumble, zones=Z_SUB, longueur=0.9, taux=GRAVE, mode='tenu', relache=0.12, rms=-16, large=False)

# ── LES CLAVIERS ──
PIANO = lambda: Enregistre(VCSL, 'Chordophones/Zithers/Grand Piano, Steinway B/NoSus', r'_vl3_', MEDIUM)  # noqa: E731
enregistre('piano', PIANO, Z_ACCORD, 2.0, rms=-19)
FMPIANO = lambda: Enregistre(VCSL, 'Electrophones/TX81Z/FM Piano', r'_vl2', MEDIUM)  # noqa: E731
enregistre('piano-fm', FMPIANO, Z_ACCORD, 2.0, rms=-19)
CLAVI = lambda: Enregistre(VCSL, 'Electrophones/TX81Z/Clavisynth', r'_vl3', MEDIUM)  # noqa: E731
enregistre('clavinet', CLAVI, Z_ACCORD, 0.8, mode='tenu', relache=0.05, rms=-19)
# Le Rhodes : modulation FM 1:1 dont l'indice retombe, et la lame qui tinte.
synthe('rhodes', F.FM, dict(ratio=1, idx=1.9, idxs=0.25, idec=0.7, aatk=0.001, adec=2.4, asus=0.12, arel=0.3, clic=0.12, h2=0.05), Z_ACCORD, 1.6, 2.0, mode='libre', rms=-19, large=True)


def piano_rave(midi: float) -> np.ndarray:
    """Le piano M1 du house italien et du rave : piano brillant double d'une cloche FM."""
    p = PIANO_CACHE[0].note(midi)[: int(2.0 * MEDIUM)]
    cloche = F.rendre(F.FM, dict(ratio=2, idx=1.4, idxs=0.2, idec=0.35, aatk=0.001, adec=0.9, asus=0, arel=0.2), frequence(midi), 0.8, 1.2, MEDIUM)
    y = melange((p / max(1e-9, np.abs(p).max()), 1.0), (cloche / max(1e-9, np.abs(cloche).max()), 0.35))
    return y + passe_haut(y, MEDIUM, 2500) * 0.6


PIANO_CACHE: list = []
CATALOGUE['piano-rave'] = dict(type='fonction', fabriquer=piano_rave, zones=Z_ACCORD, longueur=2.0, taux=MEDIUM, mode='libre', relache=0.15, rms=-18, large=True, avant=lambda: PIANO_CACHE.append(PIANO()))

# L'orgue M1 (« Organ 2 ») du garage et du UK garage : percussif, il retombe.
synthe('orgue-m1', F.ORGUE, dict(t3=1, t4=0.7, t5=0.5, t6=0.3, perc=0.6, pdec=0.18, clic=0.35, vib=0, aatk=0.002, adec=0.35, asus=0.45, arel=0.08, drive=1.6), Z_ACCORD, 1.0, 1.2, rms=-19)
# L'orgue a tirettes : 16', 8', 5 1/3', 4', clic, cabine. Lounge, krautrock,
# reggae, acid jazz.
synthe('orgue', F.ORGUE, dict(t1=0.6, t2=0.7, t3=1, t4=0.5, t6=0.25, perc=0.25, pdec=0.3, clic=0.25, vib=0.004, aatk=0.004, adec=1, asus=1, arel=0.07, drive=1.4), Z_ACCORD, 1.8, 2.0, rms=-20, large=True)

# ── LES ACCORDS ──
# Le stab de house : accord Juno ou Korg aux dents de scie, enveloppe courte.
synthe('stab', A, dict(suivi=1, wsaw=1, wsq=0.5, det=9, cut=650, envamt=3600, res=0.3, fdec=0.15, fsus=0.1, aatk=0.002, adec=0.35, asus=0.2, arel=0.1, drive=1.5), Z_ACCORD, 0.25, 0.6, mode='libre', rms=-18, large=True)


def accord_fige(intervalles, reglages, porte, total, patch=A):
    def fabriquer(midi: float) -> np.ndarray:
        notes = [F.rendre(patch, reglages, frequence(midi + i), porte, total, MEDIUM) for i in intervalles]
        return np.sum(notes, axis=0)

    return fabriquer


# L'accord de dub techno (Basic Channel) : mineur septieme neuvieme, filtre
# resonant ferme, enveloppe courte ; l'echo du moteur fait le reste.
fige('accord-dub', accord_fige([0, 3, 7, 10, 14], dict(wsaw=0.7, wsq=0.7, det=6, cut=420, envamt=1800, res=0.55, fdec=0.13, fsus=0.04, aatk=0.002, adec=0.25, asus=0, arel=0.08, drive=1.6), 0.25, 0.6), [45, 52, 59, 66], 0.6)
# Le stab rave : mineur a l'octave, brillant, sature. Techno belge,
# breakbeat hardcore, hardcore, gabber.
fige('stab-rave', accord_fige([0, 7, 12, 15, 19], dict(wsaw=1, wsq=0.7, det=14, cut=2200, envamt=3200, res=0.2, fdec=0.2, fsus=0.25, aatk=0.002, adec=0.35, asus=0.3, arel=0.08, drive=3), 0.3, 0.6), [52, 59, 66, 73], 0.6)

VIOLONS = lambda: Enregistre(VSCO, 'Strings/Violin Section/susVib', r'_v2', MEDIUM, debut=0.35)  # noqa: E731
ALTOS = lambda: Enregistre(VSCO, 'Strings/Viola Section/susvib', r'.', MEDIUM, debut=0.35)  # noqa: E731
CELLOS = lambda: Enregistre(VSCO, 'Strings/Cello Section/susvib', r'.', MEDIUM, debut=0.35)  # noqa: E731
VIOLONS_SPIC = lambda: Enregistre(VSCO, 'Strings/Violin Section/Spic', r'.', MEDIUM)  # noqa: E731
CELLOS_SPIC = lambda: Enregistre(VSCO, 'Strings/Cello Section/spic', r'.', MEDIUM)  # noqa: E731
TROMPETTE = lambda: Enregistre(VSCO, 'Brass/Trumpet/stac', r'.', MEDIUM)  # noqa: E731
TROMBONE = lambda: Enregistre(VSCO, 'Brass/Tenor Trombone/stac', r'.', MEDIUM)  # noqa: E731
FLUTE = lambda: Enregistre(VSCO, 'Woodwinds/Flute/susNV', r'.', MEDIUM, debut=0.3)  # noqa: E731
SOURCES: dict[str, Enregistre] = {}


def source(nom: str, fabrique) -> Enregistre:
    if nom not in SOURCES:
        SOURCES[nom] = fabrique()
    return SOURCES[nom]


def cordes(midi: float) -> np.ndarray:
    """La section de cordes : violons en haut, altos au milieu, violoncelles en bas."""
    if midi >= 62:
        s = source('violons', VIOLONS)
    elif midi >= 52:
        s = source('altos', ALTOS)
    else:
        s = source('cellos', CELLOS)
    return s.note(midi)


def cuivres(midi: float) -> np.ndarray:
    """La section de cuivres : trompette et trombone a l'unisson, attaque franche."""
    t = source('trompette', TROMPETTE).note(midi)
    b = source('trombone', TROMBONE).note(midi - 12)
    return melange((t / np.abs(t).max(), 1.0), (b / np.abs(b).max(), 0.55))


def mellotron(midi: float) -> np.ndarray:
    """Le Mellotron : flute et cordes sur bande, assombries, avec le pleurage."""
    fl = source('flute', FLUTE).note(midi)
    vi = cordes(midi)
    y = melange((fl / np.abs(fl).max(), 0.8), (vi / np.abs(vi).max(), 0.6))
    n = np.arange(len(y))
    pleurage = 1 + 0.0025 * np.sin(2 * np.pi * 0.7 * n / MEDIUM)
    lecture = np.cumsum(pleurage)
    lecture = lecture[lecture < len(y) - 1]
    y = np.interp(lecture, n, y)
    return passe_bas(y, MEDIUM, 3200)


def orchestre(midi: float) -> np.ndarray:
    """Le coup d'orchestre de Fairlight : cordes piquees, cuivres et timbale, d'un bloc."""
    couches = []
    for i, g in [(0, 1.0), (7, 0.7), (12, 0.9), (19, 0.6), (24, 0.5)]:
        couches.append((source('violons-spic', VIOLONS_SPIC).note(midi + i + 12), g * 0.6))
    couches.append((source('cellos-spic', CELLOS_SPIC).note(midi), 1.0))
    couches.append((source('cellos-spic', CELLOS_SPIC).note(midi - 12), 0.8))
    couches.append((source('trombone', TROMBONE).note(midi), 0.9))
    couches.append((source('trompette', TROMPETTE).note(midi + 12), 0.8))
    norm = [(x / max(1e-9, np.abs(x).max()), g) for x, g in couches]
    tim = vcsl('Membranophones/Struck Membranophones/Timpani 1/Hit/Timpani1_Hit_v4_rr1_Sum.wav', MEDIUM)
    norm.append((tim / np.abs(tim).max(), 1.2))
    return melange(*norm)


CATALOGUE['cordes'] = dict(type='fonction', fabriquer=cordes, zones=Z_NAPPE, longueur=3.0, taux=MEDIUM, mode='tenu', relache=0.5, rms=-20, large=True)
CATALOGUE['cuivres'] = dict(type='fonction', fabriquer=cuivres, zones=Z_ACCORD, longueur=0.9, taux=MEDIUM, mode='libre', relache=0.1, rms=-18, large=True)
CATALOGUE['mellotron'] = dict(type='fonction', fabriquer=mellotron, zones=Z_NAPPE, longueur=3.0, taux=MEDIUM, mode='tenu', relache=0.4, rms=-20, large=True)
CATALOGUE['orchestre'] = dict(type='fige-fonction', fabriquer=orchestre, zones=[48, 55, 62, 69], longueur=1.2, taux=MEDIUM, mode='fige', relache=0.15, rms=-16, large=True)

# Les cordes de synthe (Solina, Ensoniq) de Detroit, du house et de la trance.
synthe('cordes-synthe', F.SUPERSAW, dict(det=12, cut=3300, aatk=0.25, adec=1, asus=1, arel=0.6), Z_NAPPE, 2.4, 3.0, GRAVE, relache=0.5, rms=-20, large=True)
synthe('supersaw', F.SUPERSAW, dict(det=24, cut=7500, aatk=0.004, adec=0.6, asus=0.8, arel=0.25), Z_LEAD, 1.0, 1.25, relache=0.2, rms=-19, large=True)
synthe('juno', A, dict(suivi=1, wsq=1, pwlfo=0.25, pwrate=0.7, wsaw=0.4, det=7, cut=1500, envamt=1500, fdec=0.4, fsus=0.4, res=0.15, aatk=0.005, adec=0.8, asus=0.7, arel=0.3), Z_ACCORD, 1.2, 1.5, relache=0.25, rms=-19, large=True)

# ── LES NAPPES ──
synthe('nappe', A, dict(suivi=0.8, wsaw=0.8, wsq=0.5, pwlfo=0.2, pwrate=0.5, det=12, cut=900, envamt=600, fatk=1.0, fdec=2, fsus=0.5, lfoamt=200, lforate=0.25, res=0.2, aatk=0.6, adec=1, asus=1, arel=1.0), Z_NAPPE, 2.6, 3.2, GRAVE, relache=0.8, rms=-20, large=True)
synthe('nappe-sombre', A, dict(suivi=0.5, wsq=0.8, pw=0.3, pwlfo=0.15, pwrate=0.3, wsub=0.4, det=8, cut=430, lfoamt=250, lforate=0.15, res=0.35, aatk=0.9, asus=1, arel=1.2), Z_NAPPE, 2.6, 3.2, GRAVE, relache=0.9, rms=-20, large=True)
synthe('nappe-air', F.SUPERSAW, dict(det=18, cut=2600, aatk=0.5, adec=1, asus=1, arel=0.9), Z_NAPPE, 2.6, 3.2, relache=0.8, rms=-21, large=True)
synthe('vent', F.VENT, dict(q=40, aatk=0.8, arel=1.2, gain=2.5), Z_NAPPE, 2.6, 3.2, GRAVE, relache=0.8, rms=-22, large=True)
synthe('bourdon', A, dict(wsaw=0.6, wsin=0.8, det=5, cut=380, lfoamt=220, lforate=0.1, res=0.25, aatk=1.0, asus=1, arel=1.2), Z_NAPPE, 2.6, 3.2, GRAVE, relache=1.0, rms=-21, large=True)

# ── LES GUITARES ──
synthe('guitare-cocotte', F.CORDE, dict(brille=5200, t60=0.25, amorti=0.2, attaque=0.002, drive=1.6, cab=6000, hp=180, arel=0.02), Z_ACCORD, 0.12, 0.3, mode='libre', rms=-18)
synthe('guitare', F.CORDE, dict(brille=4200, t60=2.5, amorti=0.15, attaque=0.003, drive=1.2, cab=7000, hp=90, arel=0.1), Z_ACCORD, 1.4, 1.8, mode='libre', rms=-19, large=True)
synthe('guitare-saturee', F.CORDE, dict(brille=3200, t60=4, amorti=0.2, attaque=0.003, drive=25, cab=4200, hp=90, arel=0.05), Z_ACCORD, 1.0, 1.3, relache=0.06, rms=-19)

# ── LES MELODIES ──
synthe('lead-moog', A, dict(suivi=1, wsaw=1, wsq=0.6, det=7, cut=900, envamt=3000, res=0.35, fdec=0.3, fsus=0.5, aatk=0.003, asus=1, arel=0.1, drive=2), Z_LEAD, 0.9, 1.05, relache=0.08)
synthe('lead', A, dict(suivi=1, wsaw=1, det=14, cut=1500, envamt=5000, res=0.55, fdec=0.2, fsus=0.3, aatk=0.002, asus=1, arel=0.08, drive=3, hp=200), Z_LEAD, 0.9, 1.05, relache=0.06)
synthe('lead-fm', F.FM, dict(ratio=2, idx=3, idxs=1.2, idec=0.3, aatk=0.003, adec=1, asus=0.7, arel=0.12), Z_LEAD, 0.9, 1.05, relache=0.08)
synthe('screech', A, dict(suivi=0.5, wsaw=1, wsq=0.5, det=35, cut=2500, res=0.85, lfoamt=1500, lforate=6, pst=5, pdec=0.08, aatk=0.003, asus=1, arel=0.05, drive=18, hp=500), Z_LEAD, 0.8, 0.95, relache=0.05)
synthe('hoover', A, dict(suivi=0.5, wsaw=1, wsq=0.8, pwlfo=0.3, pwrate=3, det=30, cut=3500, res=0.15, pst=-5, pdec=0.25, aatk=0.01, asus=1, arel=0.2, drive=3), Z_LEAD, 1.0, 1.25, relache=0.15, large=True)
synthe('pluck', A, dict(suivi=1.5, wsaw=1, det=8, wtri=0.3, cut=400, envamt=5000, res=0.25, fdec=0.14, fsus=0, aatk=0.001, adec=0.35, asus=0, arel=0.1), Z_LEAD, 0.3, 0.55, mode='libre', large=True)
synthe('arpege', A, dict(suivi=1.5, wsaw=1, det=12, cut=600, envamt=6500, res=0.3, fdec=0.17, fsus=0, aatk=0.001, adec=0.4, asus=0.1, arel=0.1), Z_LEAD, 0.3, 0.55, mode='libre', large=True)
synthe('sequence', A, dict(suivi=1.2, wsaw=0.6, wsq=0.8, pw=0.3, cut=300, envamt=4000, res=0.55, fdec=0.12, fsus=0, aatk=0.001, adec=0.3, asus=0.2, arel=0.06, drive=1.8), Z_LEAD, 0.25, 0.45, mode='libre')
synthe('bleep', A, dict(wsin=1, cut=6000, aatk=0.002, adec=0.25, asus=0.3, arel=0.05), Z_LEAD, 0.2, 0.35, mode='libre')
synthe('chiptune', A, dict(wsq=1, pw=0.25, cut=9000, aatk=0.001, adec=0.15, asus=0.7, arel=0.02), Z_LEAD, 0.4, 0.5)
synthe('cloche', F.FM, dict(ratio=3.5, idx=3, idxs=0.2, idec=1.2, aatk=0.001, adec=2.2, asus=0, arel=0.5), Z_LEAD, 1.4, 2.0, mode='libre')
synthe('modulaire', F.FM, dict(ratio=1.41, idx=6, idxs=0, idec=0.08, aatk=0.001, adec=0.3, asus=0, arel=0.05), Z_LEAD, 0.25, 0.4, mode='libre')
enregistre('harpe', lambda: Enregistre(VCSL, 'Chordophones/Composite Chordophones/Concert Harp', r'_mf1', MEDIUM), Z_LEAD, 1.8)
enregistre('kalimba', lambda: Enregistre(VCSL, 'Idiophones/Plucked Idiophones/Kalimba, Kenya', r'.', MEDIUM), Z_LEAD, 1.2)
enregistre('balafon', lambda: Enregistre(VCSL, 'Idiophones/Struck Idiophones/Balafon/Hard Mallet', r'_vl2_', MEDIUM), Z_LEAD, 0.9)
enregistre('marimba', lambda: Enregistre(VCSL, 'Idiophones/Struck Idiophones/Marimba', r'_med_', MEDIUM), Z_LEAD, 1.0)
enregistre('carillon', lambda: Enregistre(VCSL, 'Idiophones/Struck Idiophones/Tubular Bells 1', r'_f_|_ff_', MEDIUM), Z_LEAD, 2.2)
enregistre('melodica', lambda: Enregistre(VCSL, 'Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C', r'Sustain|sus', MEDIUM, debut=0.2), Z_LEAD, 1.2, mode='tenu', relache=0.08)

# ── LES VOIX ──
synthe('voix', F.VOIX, dict(f1=750, f2=1200, f3=2600, g1=600, g2=1000, glisse=0.25, det=6, souffle=0.05, vibp=0.006, aatk=0.01, adec=0.3, asus=0.8, arel=0.1), Z_LEAD, 0.6, 0.75, relache=0.08)
synthe('talkbox', F.VOIX, dict(f1=350, f2=800, f3=2400, g1=750, g2=1300, glisse=0.12, det=0, souffle=0.01, vibp=0, aatk=0.005, adec=0.2, asus=0.9, arel=0.06, drive=1.6), Z_LEAD, 0.6, 0.75, relache=0.05)
synthe('cris', F.VOIX, dict(f1=900, f2=1800, f3=3000, g1=700, g2=1400, glisse=0.3, det=20, souffle=0.6, vibp=0.02, aatk=0.005, adec=0.2, asus=0.8, arel=0.08, drive=12), Z_LEAD, 0.5, 0.65, relache=0.06)

# ── LES KICKS DES STYLES DURS ──
K = F.KICK
frappe('kick-gabber', lambda: passe_bas(F.rendre(K, dict(f0=52, fhaut=420, pdec=0.03, adec=0.42, drive=22, clic=0.6), None, 0.5, 0.55), AIGU, 7000))
frappe('kick-uptempo', lambda: passe_bas(F.rendre(K, dict(f0=56, fhaut=650, pdec=0.022, adec=0.3, drive=35, clic=0.8), None, 0.4, 0.42), AIGU, 8000))
frappe('kick-hardstyle', lambda: F.rendre(K, dict(f0=50, fhaut=520, pdec=0.035, adec=0.5, drive=9, clic=0.5), None, 0.55, 0.6))
frappe('kick-psy', lambda: F.rendre(K, dict(f0=46, fhaut=330, pdec=0.045, adec=0.25, drive=1.6, clic=0.35), None, 0.3, 0.32))
frappe('kick-dur', lambda: passe_bas(sature(oramics('DM/TR-909/Detroit/samples/kick.wav'), 6), AIGU, 9000))


def kick_caverne() -> np.ndarray:
    """Le kick de gqom : une 808 qui resonne dans une cave."""
    k = oramics('DM/TR-808/samples/01.BD.808.wav')
    ir = F.salle(1.8, 1.5).mean(axis=0)
    k = k[: int(1.2 * AIGU)]
    y = convoluer(k, ir)[: int(1.2 * AIGU)]
    y[: len(k)] += k * 3
    return sature(y, 2)


frappe('kick-caverne', kick_caverne)
frappe('chug', lambda: F.rendre(A, dict(wsaw=1, pst=12, pdec=0.03, cut=900, res=0.5, aatk=0.001, adec=0.12, asus=0, arel=0.02, drive=6), 70, 0.15, 0.2))

# ── LES PERCUSSIONS ET BRUITS (Sonic Pi, VCSL) ──
for nom, fichier in {
    'clic': 'elec_tick', 'plip': 'elec_plip', 'ping': 'elec_ping', 'twip': 'elec_twip',
    'glitch-2': 'glitch_perc2', 'glitch-3': 'glitch_perc3',
    'bruit': 'hat_noiz', 'robinet': 'tbd_perc_tap_1', 'porte': 'perc_door', 'papier': 'perc_swash', 'scratch': 'vinyl_scratch',
    'tabla-na': 'tabla_na',
    'caisse-impact': 'perc_impact1', 'caisse-balais': 'drum_snare_soft', 'snap': 'perc_snap',
    'fx-impact': 'misc_cineboom', 'cymbale': 'drum_splash_hard',
}.items():
    frappe(nom, (lambda f: lambda: sonicpi(f))(fichier), longueur=4.0 if nom == 'fx-impact' else 2.0)
frappe('gong', lambda: vcsl('Idiophones/Struck Idiophones/Gong 1/gong_mf.wav'), longueur=3.0)
frappe('enclume', lambda: vcsl('Idiophones/Struck Idiophones/Anvil/Anvil_Hit1_v2_rr1_Mid.wav'), longueur=1.2)
frappe('timbale', lambda: vcsl('Membranophones/Struck Membranophones/Timpani 1/Hit/Timpani1_Hit_v3_rr3_Sum.wav'), longueur=2.0)
frappe('fx-montee', lambda: F.rendre(F.SOUFFLE, dict(f0=300, f1=9000, duree=8, q=1.4, monte=1), None, 8.0, 8.0, GRAVE), crete=-3.0, taux=GRAVE)


# ── LE HI-TECH (ADR-123) ──
# Mika, le 16 novembre 2026 : « ecoute les meilleurs tracks dans le style et
# fais quelque chose de simple et relativement similaire avec les bons sons ».
# Mesures faites sur trois morceaux hi-tech libres d'archive.org (Unreal Sign,
# Hitech Transmitter, 180 BPM ; Gotavat, Paradigma, 182 BPM ; un mix hi-tech a
# 200 BPM) : le kick part de 360 Hz, passe 200 Hz a 18 ms, 120 Hz a 40 ms,
# 60 Hz vers 100 ms ; la basse a sa fondamentale entre 42 et 60 Hz et roule en
# micro-attaques de 8 a 9 ms, trois par double croche, muette sur le kick.
TEMPO_HITECH = 180


def kick_hitech() -> np.ndarray:
    """Le kick du hi-tech : court, sec, qui claque, accorde sur la courbe mesuree."""
    n = int(0.16 * AIGU)
    t = np.arange(n) / AIGU
    f = 45 + 220 * np.exp(-t / 0.015) + 110 * np.exp(-t / 0.055)
    corps = np.sin(2 * np.pi * np.cumsum(f) / AIGU)
    # il tient 60 ms puis tombe vite : comme les references, ou le corps reste
    # a -4 dB jusque vers 55 ms et laisse la place a la basse
    amp = np.minimum(1, t / 0.0006) * np.where(t < 0.06, 1.0, np.exp(-(t - 0.06) / 0.016))
    clic = passe_haut(np.random.default_rng(7).standard_normal(n), AIGU, 3000) * np.exp(-t / 0.0015) * 0.5
    return sature(corps * amp + clic, 1.8)


def basse_hitech(midi: float) -> np.ndarray:
    """Une double croche de basse en mitraille : la sous-basse tenue, et trois
    attaques claires a la triple croche de triolet, chacune un « zap » de
    filtre qui se referme en quelques millisecondes."""
    seize = 60 / TEMPO_HITECH / 4
    n = int(seize * MEDIUM)
    t = np.arange(n) / MEDIUM
    f = frequence(midi)
    # la fondamentale et sa deuxieme harmonique, legerement saturees : la
    # deuxieme est ce qu'on entend de la basse sur un telephone
    sub = np.tanh(1.4 * (np.sin(2 * np.pi * f * t) + 0.9 * np.sin(4 * np.pi * f * t))) * np.minimum(1, t / 0.002) * np.minimum(1, (seize - t) / 0.004)
    zap = np.zeros(n)
    for k in range(3):
        note = F.rendre(A, dict(wsaw=1, wsq=0.5, suivi=2, cut=150, envamt=5200, res=0.5, fdec=0.009, fsus=0, pst=7, pdec=0.004,
                                aatk=0.0005, adec=0.022, asus=0, arel=0.008, drive=2.2, hp=70), f * 2, 0.02, seize / 3, MEDIUM)
        a = int(k * seize / 3 * MEDIUM)
        zap[a: a + len(note)] += note[: n - a]
    return sub + 0.55 * zap / max(1e-9, np.abs(zap).max())


def charley_fm(longueur: float) -> np.ndarray:
    """Le charley FM (FM8) : une porteuse aigue modulee hors harmonie, et un
    souffle tres aigu, filtres au-dessus de 4 kHz."""
    x = F.rendre(F.FM, dict(ratio=1.41, idx=9, idxs=9, idec=0.01, aatk=0.0005, adec=longueur, asus=0, arel=0.01), 5200, longueur, longueur * 1.6)
    n = len(x)
    t = np.arange(n) / AIGU
    souffle = np.random.default_rng(3).standard_normal(n) * np.exp(-t / (longueur * 0.6)) * 0.4
    y = x + souffle
    return y - passe_bas(y, AIGU, 4200, 4)


CATALOGUE['kick-hitech'] = dict(type='coup', fabriquer=kick_hitech, rms=None, crete=-1.0, longueur=None, taux=AIGU, mode='coup', zones=[])
CATALOGUE['charley-fm'] = dict(type='coup', fabriquer=lambda: charley_fm(0.035), rms=None, crete=-1.0, longueur=None, taux=AIGU, mode='coup', zones=[])
CATALOGUE['charley-fm-ouvert'] = dict(type='coup', fabriquer=lambda: charley_fm(0.16), rms=None, crete=-1.0, longueur=None, taux=AIGU, mode='coup', zones=[])
# Une zone par demi-ton : la mitraille est calee sur 180 BPM, la transposer
# changerait son debit.
CATALOGUE['basse-hitech'] = dict(type='fonction', fabriquer=basse_hitech, zones=list(range(26, 45)), longueur=None, taux=MEDIUM, mode='libre', relache=0.004, rms=-14, large=False, fondu=0.004)
# Le laser : une note FM qui plonge de plus d'une octave en 25 ms.
synthe('lead-zap', A, dict(suivi=1, wsaw=1, wsq=0.6, det=8, cut=900, envamt=6000, res=0.55, fdec=0.05, fsus=0.1, pst=19, pdec=0.025,
                           aatk=0.001, adec=0.14, asus=0, arel=0.04, drive=3, hp=150), Z_LEAD, 0.15, 0.24, mode='libre')

# Les deux salles : reponses impulsionnelles stereo d'une reverberation zita,
# lues par le convolueur du navigateur.
CATALOGUE['salle-courte'] = dict(type='salle', t60=1.6, secondes=2.2, taux=MEDIUM, mode='salle', zones=[])
CATALOGUE['salle-longue'] = dict(type='salle', t60=3.4, secondes=4.0, taux=MEDIUM, mode='salle', zones=[])


# ─── La fabrique ──────────────────────────────────────────────────────────


def zone(spec: dict, midi: int) -> np.ndarray:
    t = spec['type']
    if t == 'faust':
        x = F.rendre(spec['patch'], spec['reglages'], frequence(midi), spec['porte'], spec['total'], spec['taux'])
    elif t == 'note':
        if '_src' not in spec:
            spec['_src'] = spec['source']()
        x = spec['_src'].note(midi)
    elif t in ('fonction', 'fige', 'fige-fonction'):
        x = spec['fabriquer'](midi)
    else:
        raise ValueError(t)
    x = np.asarray(x, dtype=np.float64)
    longueur = spec.get('longueur') or spec.get('total')
    x = couper(x, spec['taux'], seuil_db=-45, longueur=longueur, fondu=spec.get('fondu', 0.05 if spec['mode'] != 'tenu' else 0.12))
    return egaliser(x, spec['taux'], spec['rms'])


def construire(seulement: set[str] | None) -> None:
    ancienne = json.loads(FICHE.read_text()) if FICHE.exists() else {}
    fiche: dict[str, dict] = {} if seulement is None else dict(ancienne)
    for id_, spec in CATALOGUE.items():
        if seulement is not None and id_ not in seulement:
            continue
        if 'avant' in spec:
            spec['avant']()
        taux = spec['taux']
        if spec['mode'] == 'salle':
            ir = F.salle(spec['t60'], spec['secondes'], taux)
            ir = ir / np.abs(ir).max() * 0.9
            f = min(ir.shape[1], int(0.2 * taux))
            ir[:, -f:] *= np.linspace(1, 0, f)
            ecrire(SORTIE / f'{id_}.wav', ir, taux)
            fiche[id_] = {'mode': 'coup'}
            print(f'{id_:22} salle {ir.shape[1] / taux:5.2f} s')
            continue
        if spec['mode'] == 'coup':
            x = np.asarray(spec['fabriquer'](), dtype=np.float64)
            x = couper(x, taux, seuil_db=-55, longueur=spec['longueur'], fondu=0.01)
            x = egaliser(x, taux, spec['rms'], spec['crete']) if spec['rms'] else x / np.abs(x).max() * 10 ** (spec['crete'] / 20)
            ecrire(SORTIE / f'{id_}.wav', x, taux)
            fiche[id_] = {'mode': 'coup'}
            print(f'{id_:22} coup  {len(x) / taux:5.2f} s')
            continue
        tailles = []
        for m in spec['zones']:
            x = zone(spec, m)
            ecrire(SORTIE / f'{id_}-{m}.wav', x, taux)
            tailles.append(len(x) / taux)
        fiche[id_] = {
            'mode': spec['mode'],
            'zones': spec['zones'],
            'relache': spec['relache'],
            **({'large': True} if spec.get('large') else {}),
        }
        print(f'{id_:22} {spec["mode"]:5} {len(spec["zones"])} zones, {min(tailles):4.2f} a {max(tailles):4.2f} s')
    fiche = {k: v for k, v in fiche.items() if k in CATALOGUE}
    FICHE.write_text(json.dumps(dict(sorted(fiche.items())), ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    seulement = None
    if '--seulement' in sys.argv:
        seulement = set(sys.argv[sys.argv.index('--seulement') + 1].split(','))
    construire(seulement)
