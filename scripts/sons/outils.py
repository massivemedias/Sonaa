"""LES OUTILS DU CONSTRUCTEUR : lire, mesurer la hauteur, accorder, couper,
egaliser, ecrire.

Tout passe en mono, en flottants, au taux demande. L'ecriture produit un WAV
a l'en-tete minimal (RIFF, fmt, data), 16 bits, sans aucun bloc de
metadonnees : la lecon du 16 novembre 2026, quand 31 fichiers sans bloc
« data » lisible ont fait retomber la TR-909 et la TR-808 sur des sons
synthetises.
"""
import subprocess
import wave
from pathlib import Path

import numpy as np


def decoder(donnees: bytes, taux: int) -> np.ndarray:
    """N'importe quel fichier audio, en mono flottant au taux voulu."""
    brut = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', str(taux), '-f', 'f32le', 'pipe:1'],
        input=donnees,
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(brut, dtype=np.float32).astype(np.float64)


def lire(chemin: Path, taux: int) -> np.ndarray:
    return decoder(Path(chemin).read_bytes(), taux)


def lire_git(depot: Path, relatif: str, taux: int) -> np.ndarray:
    """Un fichier d'un clone sans blobs : git va le chercher a la demande."""
    donnees = subprocess.run(['git', '-C', str(depot), 'show', f'HEAD:{relatif}'], capture_output=True, check=True).stdout
    return decoder(donnees, taux)


def lister_git(depot: Path, dossier: str) -> list[str]:
    sortie = subprocess.run(
        ['git', '-C', str(depot), 'ls-tree', '-r', '--name-only', 'HEAD', '--', dossier], capture_output=True, check=True, text=True
    ).stdout
    return [x for x in sortie.splitlines() if x.lower().endswith(('.wav', '.flac'))]


def hauteur(x: np.ndarray, taux: int, debut: float = 0.08, duree: float = 0.5, fmin: float = 25, fmax: float = 2500) -> float | None:
    """La fondamentale par la methode YIN, sur une fenetre stable de la note."""
    a = int(debut * taux)
    seg = x[a : a + int(duree * taux)]
    if len(seg) < taux * 0.05 or np.abs(seg).max() < 1e-4:
        return None
    seg = seg - seg.mean()
    tmax = min(len(seg) // 2, int(taux / fmin))
    tmin = max(2, int(taux / fmax))
    n = len(seg) - tmax
    # difference d(t) = somme (x[i] - x[i+t])^2 sur une fenetre de n echantillons
    cumul = np.concatenate([[0.0], np.cumsum(seg**2)])
    energie0 = cumul[n] - cumul[0]
    spectre = np.fft.rfft(seg, 2 * len(seg))
    autocorr = np.fft.irfft(spectre * np.conj(np.fft.rfft(seg[:n], 2 * len(seg))))[: tmax + 1]
    d = np.array([energie0 + (cumul[t + n] - cumul[t]) - 2 * autocorr[t] for t in range(tmax + 1)])
    cmnd = np.ones_like(d)
    somme = np.cumsum(d[1:])
    cmnd[1:] = d[1:] * np.arange(1, tmax + 1) / np.maximum(somme, 1e-12)
    t = None
    for i in range(tmin, tmax):
        if cmnd[i] < 0.12 and cmnd[i] <= cmnd[i + 1]:
            t = i
            break
    if t is None:
        t = tmin + int(np.argmin(cmnd[tmin:tmax]))
        if cmnd[t] > 0.35:
            return None
    # interpolation parabolique autour du creux
    if 1 <= t < tmax:
        g, c, dr = cmnd[t - 1], cmnd[t], cmnd[t + 1]
        den = g - 2 * c + dr
        if abs(den) > 1e-12:
            t = t + 0.5 * (g - dr) / den
    return taux / t


def midi_de(f: float) -> float:
    return 69 + 12 * np.log2(f / 440)


def frequence(midi: float) -> float:
    return 440 * 2 ** ((midi - 69) / 12)


NOTES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi_du_nom(nom: str) -> int | None:
    """« C#4 », « Bb2 », « A#0 » dans un nom de fichier, en MIDI (C4 = 60)."""
    import re

    m = re.search(r'(?<![A-Za-z])([A-G])([#b]?)(-?\d)(?!\d)', nom)
    if not m:
        return None
    n = NOTES[m.group(1)] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)
    return 12 * (int(m.group(3)) + 1) + n


def accorder(x: np.ndarray, rapport: float) -> np.ndarray:
    """Transpose en relisant plus vite (rapport > 1) ou plus lentement."""
    if abs(rapport - 1) < 1e-6:
        return x.copy()
    n = int(len(x) / rapport)
    return np.interp(np.arange(n) * rapport, np.arange(len(x)), x)


def couper(x: np.ndarray, taux: int, seuil_db: float = -50, longueur: float | None = None, fondu: float = 0.03) -> np.ndarray:
    """Retire le silence de tete, borne la longueur, pose un fondu final."""
    crete = np.abs(x).max()
    if crete <= 0:
        raise ValueError('fichier muet')
    utiles = np.where(np.abs(x) > crete * 10 ** (seuil_db / 20))[0]
    x = x[max(0, utiles[0] - int(0.0005 * taux)) : utiles[-1] + 1]
    if longueur is not None and len(x) > longueur * taux:
        x = x[: int(longueur * taux)]
    f = min(len(x), int(fondu * taux))
    x = x.copy()
    x[-f:] *= np.linspace(1, 0, f) ** 2
    return x


def passe_haut(x: np.ndarray, taux: int, fc: float) -> np.ndarray:
    """Un passe-haut du premier ordre, pour retirer le continu et le grondement."""
    rc = 1 / (2 * np.pi * fc)
    a = rc / (rc + 1 / taux)
    y = np.zeros_like(x)
    for i in range(1, len(x)):
        y[i] = a * (y[i - 1] + x[i] - x[i - 1])
    return y


def passe_bas(x: np.ndarray, taux: int, fc: float, ordre: int = 2) -> np.ndarray:
    """Un passe-bas par la transformee de Fourier, sans dephasage."""
    n = len(x)
    s = np.fft.rfft(x, 2 * n)
    f = np.fft.rfftfreq(2 * n, 1 / taux)
    s *= 1 / np.sqrt(1 + (f / fc) ** (2 * ordre))
    return np.fft.irfft(s)[:n]


def convoluer(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    n = len(x) + len(ir) - 1
    taille = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, taille) * np.fft.rfft(ir, taille))[:n]


def egaliser(x: np.ndarray, taux: int, rms_db: float, crete_db: float = -1.0, fenetre: float = 0.4) -> np.ndarray:
    """Ramene l'energie du corps de la note a `rms_db`, sans depasser `crete_db`."""
    corps = x[: max(1, int(fenetre * taux))]
    rms = np.sqrt(np.mean(corps**2))
    if rms <= 0:
        raise ValueError('note muette')
    y = x * (10 ** (rms_db / 20) / rms)
    crete = np.abs(y).max()
    plafond = 10 ** (crete_db / 20)
    if crete > plafond:
        y *= plafond / crete
    return y


def ecrire(chemin: Path, x: np.ndarray, taux: int) -> None:
    x = np.asarray(x)
    canaux = 1 if x.ndim == 1 else x.shape[0]
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2')
    if canaux > 1:
        pcm = pcm.T.reshape(-1)
    with wave.open(str(chemin), 'wb') as w:
        w.setnchannels(canaux)
        w.setsampwidth(2)
        w.setframerate(taux)
        w.writeframes(pcm.tobytes())
