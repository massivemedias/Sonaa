# SONAA

Atlas généalogique des musiques électroniques. Un graphe orienté acyclique où
chaque genre est une durée posée sur l'axe du temps, reliée à ses ancêtres et
à ses descendants.

Publié sur https://massivemedias.github.io/Sonaa/

## Deux documents à lire avant de toucher au code

- [DESIGN.md](DESIGN.md), la direction artistique. La règle qui gouverne tout :
  une épaisseur, une teinte, une longueur ou une durée encode une donnée, ou
  n'existe pas.
- [ARCHITECTURE.md](ARCHITECTURE.md), les décisions techniques au format ADR.

## Lancer en local

```
npm install
npm run dev
```

Aucune configuration, aucun fichier `.env`, aucune clé. Le projet est
entièrement statique et n'appelle aucun service tiers au build.

## Scripts

| Script | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | contrôle TypeScript puis build de production dans `dist/` |
| `npm run preview` | sert le build de production en local |

## Contraintes du projet

- Aucun secret, aucune variable d'environnement, aucun backend.
- Aucune librairie de graphe tierce : le moteur de layout est écrit ici
  (ADR-002). React Flow, Cytoscape et vis-network sont exclus.
- D3 uniquement en modules ciblés, jamais le paquet complet (ADR-013).
- Base `/Sonaa/` partout, aucune URL absolue en dur vers le domaine.

## Déploiement

Chaque push sur `main` déclenche `.github/workflows/deploy.yml` : Node 20,
`npm ci`, `npm run build`, contrôle anti-secret sur `dist/`, puis publication
sur GitHub Pages. Le build échoue si le contrôle remonte quoi que ce soit.

## État

Phase P0, fondations. La page d'accueil est la première épreuve visuelle de la
direction artistique, pas un placeholder. Les données de genres arrivent en P1.
