/**
 * GARDE ANTI-SECRETS - aucun secret dans les fichiers suivis par git.
 *
 * Porte depuis massivemedias (frontend/src/data/secretsEnDur.test.js), ou il
 * est ne de l'incident du 3 aout 2026 : une cle Supabase `service_role` et un
 * mot de passe super-admin lisibles dans un depot public.
 *
 * Ici en script Node autonome : Sonaa n'a pas vitest, et un garde ne doit pas
 * imposer une dependance. Chaine dans `build` avec `&&` : si un secret entre
 * dans un fichier suivi, le build echoue en NOMMANT le fichier.
 *
 * PAS DE REPLI SANS GIT, ET C'EST UN CHOIX : emuler .gitignore a la main se
 * trompe des deux cotes (il balayerait .env - de vrais secrets, correctement
 * ignores). Sans git, on echoue avec une phrase claire plutot que de passer
 * vert sans avoir rien lu.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const MOTIFS = [
  [/sk_live_[0-9a-zA-Z]{20,}/, 'cle Stripe secrete LIVE'],
  [/sk_test_[0-9a-zA-Z]{20,}/, 'cle Stripe secrete de test'],
  [/rk_live_[0-9a-zA-Z]{20,}/, 'cle Stripe restreinte'],
  [/whsec_[0-9a-zA-Z]{24,}/, 'secret de webhook Stripe'],
  [/\bre_[0-9A-Za-z]{8}_[0-9A-Za-z]{20,}/, 'cle API Resend'],
  [/eyJhbGciOi[0-9A-Za-z_.-]{60,}/, 'JWT (cle Supabase anon ou service_role)'],
  [/\bsb_secret_[0-9A-Za-z_-]{16,}/, 'cle secrete Supabase'],
  [/AIza[0-9A-Za-z_-]{33}/, 'cle API Google'],
  [/ya29\.[0-9A-Za-z_-]{50,}/, 'jeton OAuth Google'],
  [/gh[pousr]_[0-9A-Za-z]{36}/, 'jeton GitHub'],
  [/xox[baprs]-[0-9A-Za-z-]{20,}/, 'jeton Slack'],
  [/postgres(ql)?:\/\/[^\s"'<>]*:[^\s"'<>@]{8,}@/, 'chaine Postgres avec mot de passe'],
  [/mongodb(\+srv)?:\/\/[^\s"'<>]*:[^\s"'<>@]{8,}@/, 'chaine MongoDB avec mot de passe'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----[\s]*[A-Za-z0-9+/]{40,}/, 'cle privee'],
]

const EXEMPTS = [
  /verifier-secrets\.mjs$/,   // ce fichier contient les motifs, forcement
  /\.example$/,
  /package-lock\.json$/,
]

let fichiers
try {
  fichiers = execFileSync('git', ['ls-files'], { cwd: RACINE, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\n').filter(Boolean)
} catch (e) {
  console.error('git indisponible : le garde anti-secrets ne peut pas enumerer les fichiers suivis.')
  console.error('Il echoue expres plutot que de passer vert sans avoir rien balaye. (' + e.message + ')')
  process.exit(1)
}
fichiers = fichiers.filter((f) => !EXEMPTS.some((rx) => rx.test(f)))

const trouves = []
for (const f of fichiers) {
  let contenu
  try { contenu = readFileSync(resolve(RACINE, f), 'utf8') } catch { continue }
  for (const [rx, nom] of MOTIFS) {
    const m = contenu.match(rx)
    if (m) trouves.push(`${f} -> ${nom} (${m[0].slice(0, 14)}…)`)
  }
}

if (trouves.length) {
  console.error('SECRET DANS UN FICHIER SUIVI PAR GIT - build refuse :')
  for (const t of trouves) console.error('  ' + t)
  process.exit(1)
}
console.log(`anti-secrets : ${fichiers.length} fichiers balayes, rien a signaler`)
