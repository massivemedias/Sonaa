"""LES SYNTHETISEURS DE LA BIBLIOTHEQUE, ECRITS EN FAUST ET RENDUS HORS LIGNE.

Mika, le 16 novembre 2026 : « remplace aussi les accords et les basses par
des samples, refais la totale ». Aucune bibliotheque libre ne fournit une
303, une reese, un accord de dub techno ou un orgue M1 enregistres et
redistribuables. On les fabrique donc ici, une fois pour toutes, avec la
bibliotheque standard de Faust (oscillateurs sans repliement, filtre en
echelle de type Moog, enveloppes ADSR, reverberation zita), et on les ecrit
en fichiers : le navigateur ne fait plus que lire des enregistrements.

Chaque patch expose ses reglages en curseurs ; rendre() pose les reglages,
ouvre la porte le temps de la note, la referme, et laisse sonner la queue.
"""
import dawdreamer as daw
import numpy as np

TAUX = 44100

# Le soustractif analogique : jusqu'a trois voix desaccordees, scie, carre a
# largeur variable, triangle, sinus, sous-octave ; filtre en echelle avec
# enveloppe et LFO ; enveloppe d'amplitude ; saturation ; enveloppe de hauteur.
# `suivi` ouvre le filtre avec la hauteur, pour qu'une note aigue ne
# s'eteigne pas quand le filtre se referme sous sa fondamentale.
ANALOGIQUE = r'''
import("stdfaust.lib");
freq = hslider("freq",110,5,9000,0.001);
gate = button("gate");
wsaw = hslider("wsaw",1,0,1,0.01);
wsq = hslider("wsq",0,0,1,0.01);
wtri = hslider("wtri",0,0,1,0.01);
wsin = hslider("wsin",0,0,1,0.01);
wsub = hslider("wsub",0,0,1,0.01);
pw = hslider("pw",0.5,0.05,0.95,0.001);
pwlfo = hslider("pwlfo",0,0,0.45,0.001);
pwrate = hslider("pwrate",0.8,0.01,20,0.01);
det = hslider("det",0,0,80,0.1);
cut = hslider("cut",1000,20,18000,1);
envamt = hslider("envamt",0,0,18000,1);
res = hslider("res",0.2,0,0.98,0.001);
fatk = hslider("fatk",0.001,0.0005,6,0.0001);
fdec = hslider("fdec",0.3,0.002,10,0.001);
fsus = hslider("fsus",0,0,1,0.01);
lfoamt = hslider("lfoamt",0,0,8000,1);
lforate = hslider("lforate",2,0.01,30,0.01);
aatk = hslider("aatk",0.002,0.0005,6,0.0001);
adec = hslider("adec",0.3,0.002,10,0.001);
asus = hslider("asus",1,0,1,0.01);
arel = hslider("arel",0.1,0.002,10,0.001);
drive = hslider("drive",1,0.1,30,0.01);
pst = hslider("pst",0,-48,48,0.01);
pdec = hslider("pdec",0.05,0.001,3,0.001);
hp = hslider("hp",15,10,3000,1);
suivi = hslider("suivi",0,0,4,0.01);
penv = en.ar(0.0005, pdec, gate);
f = freq * pow(2, pst*penv/12);
c(x) = pow(2, x/1200);
lfopw = pw + pwlfo*os.osc(pwrate);
voix(r) = wsaw*os.sawtooth(f*r) + wsq*os.pulsetrain(f*r, lfopw) + wtri*os.triangle(f*r) + wsin*os.osc(f*r);
osc = (voix(c(0-det)) + voix(1) + voix(c(det)))/3 + wsub*os.osc(f*0.5);
fenv = en.adsr(fatk, fdec, fsus, 0.08, gate);
fc = min(18000, max(25, cut + suivi*freq + envamt*fenv + lfoamt*(0.5+0.5*os.osc(lforate))));
amp = en.adsr(aatk, adec, asus, arel, gate);
process = osc : fi.highpass(2, hp) : ve.moog_vcf_2bn(res, fc) : *(amp) : *(drive) : ma.tanh;
'''

# Le supersaw : sept dents de scie etalees, filtre doux, passe-haut.
SUPERSAW = r'''
import("stdfaust.lib");
freq = hslider("freq",220,5,9000,0.001);
gate = button("gate");
det = hslider("det",25,0,80,0.1);
cut = hslider("cut",6000,200,18000,1);
aatk = hslider("aatk",0.005,0.0005,6,0.0001);
adec = hslider("adec",0.5,0.002,10,0.001);
asus = hslider("asus",0.85,0,1,0.01);
arel = hslider("arel",0.25,0.002,10,0.001);
c(x) = pow(2, x/1200);
s(k) = os.sawtooth(freq*c(det*k));
osc = (s(0-1)+s(0-0.66)+s(0-0.33)+s(0)+s(0.33)+s(0.66)+s(1))/7;
process = osc : fi.highpass(2, 160) : fi.lowpass(2, cut) : *(en.adsr(aatk, adec, asus, arel, gate));
'''

# La FM a deux operateurs : Rhodes de DX7, basse FM, cloche, orgue M1.
FM = r'''
import("stdfaust.lib");
freq = hslider("freq",220,5,9000,0.001);
gate = button("gate");
ratio = hslider("ratio",1,0.25,14,0.001);
idx = hslider("idx",2,0,20,0.01);
idxs = hslider("idxs",0.1,0,20,0.01);
idec = hslider("idec",0.2,0.002,6,0.001);
aatk = hslider("aatk",0.002,0.0005,6,0.0001);
adec = hslider("adec",0.6,0.002,10,0.001);
asus = hslider("asus",0.3,0,1,0.01);
arel = hslider("arel",0.2,0.002,10,0.001);
h2 = hslider("h2",0,0,1,0.01);
h3 = hslider("h3",0,0,1,0.01);
clic = hslider("clic",0,0,1,0.01);
ienv = idxs + (idx-idxs)*en.ar(0.0005, idec, gate);
mod = os.osc(freq*ratio) * ienv * freq*ratio;
car = os.osc(freq + mod) + h2*os.osc(2*freq) + h3*os.osc(3*freq);
k = clic*no.noise*en.ar(0.0003, 0.006, gate) : fi.highpass(2, 1500);
process = (car + k) * en.adsr(aatk, adec, asus, arel, gate) : ma.tanh;
'''

# La corde pincee (Karplus-Strong) : guitare, basse electrique, contrebasse,
# skank. La boucle perd juste ce qu'il faut pour s'eteindre en `t60`
# secondes quelle que soit la note, et son retard tient compte du filtre :
# sans ces deux corrections, une note aigue mourait en 50 ms et sonnait faux.
# `fond` ajoute une sinusoide sous la corde pour le poids d'une basse,
# `drive` la sature comme un ampli, `cab` est le filtre du haut-parleur.
CORDE = r'''
import("stdfaust.lib");
freq = hslider("freq",110,20,4000,0.001);
gate = button("gate");
brille = hslider("brille",3500,300,12000,1);
t60 = hslider("t60",2,0.05,20,0.01);
amorti = hslider("amorti",0.5,0,0.5,0.001);
attaque = hslider("attaque",0.004,0.0005,0.05,0.0001);
fond = hslider("fond",0,0,2,0.01);
fdec = hslider("fdec",0.6,0.01,6,0.01);
drive = hslider("drive",1,0.1,40,0.01);
cab = hslider("cab",12000,300,16000,1);
hp = hslider("hp",40,10,3000,1);
arel = hslider("arel",0.03,0.002,3,0.001);
w = 2*ma.PI*freq/ma.SR;
gainH = sqrt(1 - 2*amorti*(1-amorti)*(1 - cos(w)));
phaseH = atan(amorti*sin(w)/(1 - amorti + amorti*cos(w)))/w;
retard = ma.SR/freq - 1 - phaseH;
perte = min(0.9999, pow(10, -3/(t60*freq)) / gainH);
moyenne(x) = x*(1-amorti) + x'*amorti;
exc = no.noise * en.ar(0.0005, attaque, gate) : fi.lowpass(2, brille);
boucle = de.fdelay1a(8192, retard) : moyenne : *(perte) : fi.dcblockerat(4);
corde = exc : (+ ~ boucle);
poids = fond*os.osc(freq)*en.ar(0.002, fdec, gate);
process = (corde + poids) : fi.highpass(2, hp) : *(drive) : ma.tanh : fi.lowpass(2, cab) : *(en.adsr(0.0005, 8, 1, arel, gate));
'''

# L'orgue a tirettes : neuf harmoniques (16', 5 1/3', 8', 4', 2 2/3', 2',
# 1 3/5', 1 1/3', 1'), le clic de touche, la percussion qui retombe, et un
# leger vibrato de cabine tournante.
ORGUE = r'''
import("stdfaust.lib");
freq = hslider("freq",220,20,4000,0.001);
gate = button("gate");
t1 = hslider("t1",0,0,1,0.01);
t2 = hslider("t2",0,0,1,0.01);
t3 = hslider("t3",1,0,1,0.01);
t4 = hslider("t4",0,0,1,0.01);
t5 = hslider("t5",0,0,1,0.01);
t6 = hslider("t6",0,0,1,0.01);
t8 = hslider("t8",0,0,1,0.01);
perc = hslider("perc",0,0,1,0.01);
pdec = hslider("pdec",0.25,0.01,2,0.001);
clic = hslider("clic",0.2,0,1,0.01);
vib = hslider("vib",0.003,0,0.02,0.0001);
aatk = hslider("aatk",0.004,0.0005,2,0.0001);
adec = hslider("adec",0.5,0.01,8,0.001);
asus = hslider("asus",1,0,1,0.01);
arel = hslider("arel",0.06,0.002,4,0.001);
drive = hslider("drive",1.2,0.1,20,0.01);
f = freq*(1 + vib*os.osc(6.2));
h(r) = os.osc(f*r);
tirettes = t1*h(0.5) + t2*h(1.5) + t3*h(1) + t4*h(2) + t5*h(3) + t6*h(4) + t8*h(8);
pc = perc*h(3)*en.ar(0.001, pdec, gate);
k = clic*no.noise*en.ar(0.0002, 0.005, gate) : fi.bandpass(1, 1500, 6000);
process = (tirettes/3 + pc + k) * en.adsr(aatk, adec, asus, arel, gate) * drive : ma.tanh;
'''

# Le vent accorde : du bruit dans trois resonateurs etroits poses sur la
# fondamentale et ses harmoniques, pour une nappe de souffle ou de texture.
VENT = r'''
import("stdfaust.lib");
freq = hslider("freq",220,20,4000,0.001);
gate = button("gate");
q = hslider("q",30,2,200,0.1);
aatk = hslider("aatk",1,0.001,6,0.001);
arel = hslider("arel",1.5,0.01,8,0.001);
gain = hslider("gain",6,0.1,60,0.01);
b = no.noise;
res = b <: fi.resonbp(freq, q, 1), fi.resonbp(freq*2, q, 0.5), fi.resonbp(freq*3, q, 0.25) :> _;
process = res * gain * en.adsr(aatk, 1, 1, arel, gate) : ma.tanh;
'''

# Une voyelle chantee : dent de scie dans trois formants, avec vibrato.
VOIX = r'''
import("stdfaust.lib");
freq = hslider("freq",220,40,2000,0.001);
gate = button("gate");
f1 = hslider("f1",730,100,4000,1);
f2 = hslider("f2",1090,100,5000,1);
f3 = hslider("f3",2440,100,6000,1);
g1 = hslider("g1",730,100,4000,1);
g2 = hslider("g2",1090,100,5000,1);
glisse = hslider("glisse",0.2,0.001,3,0.001);
det = hslider("det",0,0,40,0.1);
souffle = hslider("souffle",0.04,0,2,0.01);
vibp = hslider("vibp",0.006,0,0.05,0.0001);
aatk = hslider("aatk",0.02,0.001,4,0.001);
adec = hslider("adec",0.2,0.01,4,0.001);
asus = hslider("asus",0.85,0,1,0.01);
arel = hslider("arel",0.12,0.01,4,0.001);
drive = hslider("drive",1,0.1,40,0.01);
vib = 1 + vibp*os.osc(5.5);
c(x) = pow(2, x/1200);
src = (os.sawtooth(freq*vib*c(0-det)) + os.sawtooth(freq*vib) + os.sawtooth(freq*vib*c(det)))*0.3 + no.noise*souffle;
m = en.ar(glisse, 30, gate);
a = f1 + (g1-f1)*m;
b = f2 + (g2-f2)*m;
fo = src <: fi.resonbp(a, 8, 1), fi.resonbp(b, 10, 0.6), fi.resonbp(f3, 14, 0.35) :> _;
process = fo * en.adsr(aatk, adec, asus, arel, gate) * drive : ma.tanh;
'''

# Le kick synthetique des styles durs : sinus a enveloppe de hauteur, clic,
# saturation reglable (gabber, psytrance, hardstyle).
KICK = r'''
import("stdfaust.lib");
gate = button("gate");
f0 = hslider("f0",50,20,200,0.1);
fhaut = hslider("fhaut",400,40,2000,1);
pdec = hslider("pdec",0.05,0.002,0.5,0.001);
adec = hslider("adec",0.4,0.02,3,0.001);
drive = hslider("drive",1,0.1,40,0.01);
clic = hslider("clic",0.3,0,1,0.01);
pe = en.ar(0.0003, pdec, gate);
f = f0 + (fhaut-f0)*pe*pe;
corps = os.osc(f) * en.ar(0.0008, adec, gate);
k = clic*no.noise*en.ar(0.0002, 0.004, gate) : fi.bandpass(1, 2000, 9000);
process = (corps + k) * drive : ma.tanh : fi.lowpass(2, 9000);
'''

# Le souffle filtre : montees, impacts, textures.
SOUFFLE = r'''
import("stdfaust.lib");
gate = button("gate");
f0 = hslider("f0",300,20,16000,1);
f1 = hslider("f1",8000,20,16000,1);
duree = hslider("duree",4,0.05,20,0.01);
q = hslider("q",1.5,0.3,20,0.01);
monte = hslider("monte",1,0,1,1);
t = (+(1/ma.SR) ~ _) : min(duree);
x = t/duree;
fc = f0*pow(f1/f0, x);
amp = select2(monte, exp(-4*x), x*x);
process = no.noise : fi.resonbp(fc, q, 1) : *(amp) : *(gate>0);
'''

# La salle : une reverberation zita stereo, rendue sur une impulsion pour en
# faire la reponse impulsionnelle du convolueur du navigateur.
SALLE = r'''
import("stdfaust.lib");
t60 = hslider("t60",2.4,0.2,10,0.01);
process = _ <: re.zita_rev1_stereo(40, 200, 6000, t60, t60*0.8, 44100);
'''


def rendre(dsp: str, reglages: dict, freq: float | None, porte: float, total: float, taux: int = TAUX) -> np.ndarray:
    """Une note : la porte ouverte `porte` secondes, rendue sur `total`."""
    e = daw.RenderEngine(taux, 128)
    p = e.make_faust_processor('s')
    p.set_dsp_string(dsp)
    if not p.compile():
        raise RuntimeError('Faust refuse le patch')
    noms = {d['name'].split('/')[-1] for d in p.get_parameters_description()}
    for k, v in reglages.items():
        if k not in noms:
            raise KeyError(f'reglage inconnu : {k}')
        p.set_parameter(f'/dawdreamer/{k}', float(v))
    if freq is not None and 'freq' in noms:
        p.set_parameter('/dawdreamer/freq', float(freq))
    n = int(total * taux)
    g = np.zeros(n, dtype=np.float32)
    g[: int(porte * taux)] = 1.0
    if 'gate' in noms:
        p.set_automation('/dawdreamer/gate', g)
    e.load_graph([(p, [])])
    e.render(total)
    sortie = e.get_audio()
    return sortie.mean(axis=0) if sortie.ndim == 2 else sortie


def salle(t60: float, secondes: float, taux: int = TAUX) -> np.ndarray:
    """La reponse impulsionnelle stereo d'une salle zita."""
    e = daw.RenderEngine(taux, 128)
    imp = np.zeros((1, int(secondes * taux)), dtype=np.float32)
    imp[0, 0] = 1.0
    src = e.make_playback_processor('imp', imp)
    p = e.make_faust_processor('rev')
    p.set_dsp_string(SALLE)
    if not p.compile():
        raise RuntimeError('Faust refuse la salle')
    p.set_parameter('/dawdreamer/t60', t60)
    e.load_graph([(src, []), (p, ['imp'])])
    e.render(secondes)
    return e.get_audio()
