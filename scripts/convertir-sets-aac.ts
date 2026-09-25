/* LES MIXTAPES EN AAC, A COTE DU WAV QUI RESTE LE MASTER.
 *
 * Mika, le 24 septembre 2026 : « servir les mixtapes en AAC au lieu du
 * WAV ». Un set d'une heure en WAV pese 600 Mo ; en AAC a 192 kbit/s, 85.
 *
 * POURQUOI UN SCRIPT ET PAS LA MISE EN LIGNE ELLE-MEME. Le depot d'un set va
 * du navigateur a R2 par la passerelle, en tranches de 40 Mo : aucun des
 * trois ne sait encoder de l'audio. La conversion demande ffmpeg, donc une
 * machine. Ce script est cette machine : il prend chaque set dont
 * `audio_aac_path` est vide, telecharge le WAV, l'encode, range l'AAC dans
 * R2 sous le meme chemin avec l'extension .m4a, et inscrit ce chemin dans
 * la base. Lance a la main sur un poste, ou chaque nuit par GitHub Actions
 * (.github/workflows/mixtapes-aac.yml).
 *
 * LE WAV N'EST NI EFFACE NI DEPLACE : les adresses existantes tiennent, et
 * le lecteur choisit l'AAC quand il existe (voir lib/lecture-set.ts).
 *
 * Usage : SUPABASE_SERVICE_ROLE_KEY=... npm run convertir:aac
 *         (sans la cle, la conversion se fait et le SQL a executer est
 *         imprime a la fin) */

import { execFileSync, spawnSync } from 'node:child_process';
import { createWriteStream, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'https://pqgapyfqkjzvwkulxnhv.supabase.co';
const CLE_ANON = process.env['SUPABASE_ANON_KEY'] ?? 'sb_publishable_y7NY3g6pZgJYRnX5fPbNXA_VlzRJpVn';
const CLE_SERVICE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';
const SEAU = 'sonaa-sets';
const DEBIT = '192k';

interface Set {
  readonly id: string;
  readonly titre: string;
  readonly audio_path: string;
  readonly audio_aac_path: string | null;
}

const mo = (o: number): string => `${(o / 1048576).toFixed(1)} Mo`;

async function lister(): Promise<Set[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/dj_sets?select=id,titre,audio_path,audio_aac_path&audio_aac_path=is.null&order=created_at.asc`, {
    headers: { apikey: CLE_ANON, Authorization: `Bearer ${CLE_ANON}` },
  });
  if (!r.ok) throw new Error(`liste des sets : HTTP ${r.status} ${await r.text()}`);
  return (await r.json()) as Set[];
}

async function telecharger(url: string, vers: string): Promise<number> {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`telechargement : HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body as never), createWriteStream(vers));
  return statSync(vers).size;
}

/* AAC PAR AUDIOTOOLBOX QUAND IL EXISTE (macOS), sinon l'encodeur natif de
   ffmpeg. `faststart` place l'index en tete du fichier : sans lui, un
   lecteur en flux doit lire la fin du fichier avant de commencer. */
function encoder(source: string, cible: string): void {
  const args = (codec: string) => ['-y', '-v', 'error', '-i', source, '-vn', '-c:a', codec, '-b:a', DEBIT, '-movflags', '+faststart', cible];
  const essai = spawnSync('ffmpeg', args('aac_at'), { stdio: 'pipe' });
  if (essai.status === 0) return;
  execFileSync('ffmpeg', args('aac'), { stdio: 'pipe' });
}

function deposer(cle: string, fichier: string): void {
  execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${SEAU}/${cle}`, '--file', fichier, '--content-type', 'audio/mp4', '--remote'], {
    cwd: join(process.cwd(), 'worker'),
    stdio: 'pipe',
  });
}

async function inscrire(id: string, cle: string): Promise<boolean> {
  if (!CLE_SERVICE) return false;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/dj_sets?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}`, 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ audio_aac_path: cle }),
  });
  if (!r.ok) throw new Error(`inscription : HTTP ${r.status} ${await r.text()}`);
  return true;
}

const sets = await lister();
const aFaire = sets.filter((s) => !s.audio_path.startsWith('supabase:') && !/\.(m4a|aac|mp3|ogg|oga|opus)$/i.test(s.audio_path));
console.log(`${sets.length} set(s) sans AAC, ${aFaire.length} a convertir.`);
const sql: string[] = [];
const bilan: string[] = [];
const dossier = mkdtempSync(join(tmpdir(), 'sonaa-aac-'));

for (const s of aFaire) {
  const debut = Date.now();
  const source = join(dossier, `${s.id}.src`);
  const cible = join(dossier, `${s.id}.m4a`);
  const cle = s.audio_path.replace(/\.[^./]+$/, '') + '.m4a';
  process.stdout.write(`\n${s.titre}\n  telechargement... `);
  const avant = await telecharger(`${PASSERELLE}/${s.audio_path}`, source);
  process.stdout.write(`${mo(avant)}\n  encodage AAC ${DEBIT}... `);
  const t0 = Date.now();
  encoder(source, cible);
  const apres = statSync(cible).size;
  const dureeEncodage = Math.round((Date.now() - t0) / 1000);
  process.stdout.write(`${mo(apres)} en ${dureeEncodage} s\n  depot R2 ${cle}... `);
  deposer(cle, cible);
  const inscrit = await inscrire(s.id, cle);
  process.stdout.write(inscrit ? 'inscrit dans la base\n' : 'depose (base : SQL a executer, voir plus bas)\n');
  if (!inscrit) sql.push(`update public.dj_sets set audio_aac_path = '${cle}' where id = '${s.id}';`);
  bilan.push(`${s.titre} : ${mo(avant)} -> ${mo(apres)} (${Math.round((1 - apres / avant) * 100)} % de moins), encodage ${dureeEncodage} s, total ${Math.round((Date.now() - debut) / 1000)} s`);
  rmSync(source, { force: true });
  rmSync(cible, { force: true });
}
rmSync(dossier, { recursive: true, force: true });

console.log('\nBILAN');
for (const l of bilan) console.log('  ' + l);
if (sql.length > 0) console.log('\nSQL A EXECUTER (pas de SUPABASE_SERVICE_ROLE_KEY) :\n' + sql.join('\n'));
