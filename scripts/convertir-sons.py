"""LA CONVERSION DES SONS DES AFFICHES DE RYTHME (ADR-113).

Usage : python3 scripts/convertir-sons.py CHEMIN_DU_DEPOT_ORAMICS_SAMPLED

Le depot oramics/sampled se clone a part :
  git clone --depth 1 https://github.com/oramics/sampled

LE DEFAUT CORRIGE LE 16 NOVEMBRE 2026. La premiere conversion avait ecrit 31
fichiers sur 67 sans bloc « data » valide : toute la TR-909, la TR-909 passee
dans le SP-1200, la TR-808 et la batterie acoustique. Le navigateur refusait
de les decoder, le moteur les ignorait, et ces pistes retombaient sur des
sons synthetises. Mika : « les sons sont horribles et ne refletent pas du
tout le style ».

Ce script relit les originaux, les passe en mono, 44,1 kHz, 16 bits, coupe
le silence de tete et de queue sous -60 dB, ramene la crete a -1 dB, pose un
fondu de 5 ms en fin, et ecrit un WAV a l'en-tete minimal (RIFF, fmt, data)
avec le module wave de Python : aucun bloc de metadonnees, rien qu'un
decodeur puisse mal lire. Il exige ffmpeg pour la lecture.
"""
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SORTIE = Path(__file__).resolve().parent.parent / 'public' / 'sons'
TAUX = 44100

# nom dans public/sons  ->  (fichier dans oramics/sampled, gain en dB apres normalisation)
SOURCES = {
    'tr909-kick': ('DM/TR-909/Detroit/samples/kick.wav', 0),
    'tr909-snare': ('DM/TR-909/Detroit/samples/snare.wav', 0),
    'tr909-clap': ('DM/TR-909/Detroit/samples/clap-1.wav', 0),
    'tr909-rim': ('DM/TR-909/Detroit/samples/rim.wav', 0),
    'tr909-hat': ('DM/TR-909/Detroit/samples/hihat-closed.wav', 0),
    'tr909-openhat': ('DM/TR-909/Detroit/samples/hihat-open-1.wav', 0),
    'tr909-ride': ('DM/TR-909/Detroit/samples/ride.wav', 0),
    'tr909-tom': ('DM/TR-909/Detroit/samples/tom-l.wav', 0),
    'sp909-kick': ('DM/TR-909/SP/samples/kick.wav', 0),
    'sp909-snare': ('DM/TR-909/SP/samples/snare.wav', 0),
    'sp909-clap': ('DM/TR-909/SP/samples/clap1.wav', 0),
    'sp909-hat': ('DM/TR-909/SP/samples/hihat-closed-1.wav', 0),
    'sp909-openhat': ('DM/TR-909/SP/samples/hihat-open-1.wav', 0),
    'tr808-kick': ('DM/TR-808/samples/01.BD.808.wav', 0),
    'tr808-snare': ('DM/TR-808/samples/01.SD5.808.wav', 0),
    'tr808-clap': ('DM/TR-808/samples/01.CP.808.wav', 0),
    'tr808-rim': ('DM/TR-808/samples/01.RS.808.wav', 0),
    'tr808-hat': ('DM/TR-808/samples/01.CH.808.wav', 0),
    'tr808-openhat': ('DM/TR-808/samples/01.OH.808.wav', 0),
    'tr808-cowbell': ('DM/TR-808/samples/01.CB.808.wav', 0),
    'tr808-conga': ('DM/TR-808/samples/01.MC.808.wav', 0),
    'tr808-tom': ('DM/TR-808/samples/01.LT.808.wav', 0),
    'tr808-maracas': ('DM/TR-808/samples/01.MA.808.wav', 0),
    'tr808-claves': ('DM/TR-808/samples/01.CL.808.wav', 0),
    'break-kick': ('DRUMS/pearl-master-studio/samples/kick-01.wav', 0),
    'break-snare': ('DRUMS/pearl-master-studio/samples/snare-01.wav', 0),
    'break-hat': ('DRUMS/pearl-master-studio/samples/hihat-closed.wav', 0),
    'break-openhat': ('DRUMS/pearl-master-studio/samples/hihat-open.wav', 0),
    'break-ride': ('DRUMS/pearl-master-studio/samples/ride-01.wav', 0),
    'break-tom': ('DRUMS/pearl-master-studio/samples/tom-02.wav', 0),
    # la note fantome : une caisse plus douce, 9 dB sous les autres
    'break-ghost': ('DRUMS/pearl-master-studio/samples/snare-02.wav', -9),
}


def lire(chemin: Path) -> np.ndarray:
    brut = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(chemin), '-ac', '1', '-ar', str(TAUX), '-f', 'f32le', '-'],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(brut, dtype=np.float32).astype(np.float64)


def preparer(x: np.ndarray, gain_db: float) -> np.ndarray:
    crete = np.abs(x).max()
    if crete <= 0:
        raise ValueError('fichier muet')
    seuil = crete * 10 ** (-60 / 20)
    utiles = np.where(np.abs(x) > seuil)[0]
    x = x[max(0, utiles[0] - 22) : utiles[-1] + 1]
    x = x / np.abs(x).max() * 10 ** (-1 / 20) * 10 ** (gain_db / 20)
    fondu = min(len(x), int(0.005 * TAUX))
    x[-fondu:] *= np.linspace(1, 0, fondu)
    return x


def ecrire(chemin: Path, x: np.ndarray) -> None:
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2')
    with wave.open(str(chemin), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TAUX)
        w.writeframes(pcm.tobytes())


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    depot = Path(sys.argv[1])
    for nom, (relatif, gain) in SOURCES.items():
        x = preparer(lire(depot / relatif), gain)
        ecrire(SORTIE / f'{nom}.wav', x)
        print(f'{nom:16} {len(x) / TAUX:5.2f} s  <- {relatif}')


if __name__ == '__main__':
    main()
