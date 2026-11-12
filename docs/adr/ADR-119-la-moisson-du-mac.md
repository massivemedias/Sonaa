# ADR-119 : la moisson du Mac

Date : 12 novembre 2026. Statut : accepté.

## Pourquoi

Eventbrite refuse les machines de GitHub depuis la fin d'octobre 2026 (code
405 dès la première page) et Shotgun les arrête à un contrôle Vercel depuis
septembre. La moisson de la nuit n'en tirait plus rien, sans échouer. Les deux
sources laissent passer une adresse de maison. Mika : « planifie Eventbrite et
Shotgun sur mon Mac ».

## Ce qui est décidé

- **Une machine par source.** Ticketmaster et Lepointdevente restent sur
  GitHub ; Eventbrite et Shotgun en sortent et tournent sur le Mac de Mika.
- **launchd, chaque matin à 6 h 43.** Un Mac en veille à cette heure lance la
  moisson à son réveil. L'agent s'appelle `ca.sonaa.moissons` et appelle
  `scripts/mac/moissonner.sh`.
- **La clé de service vit dans le trousseau de macOS**, sous le nom
  `sonaa-supabase-service`. Mika la colle une fois à l'invite de
  `npm run planifier:mac`, elle ne s'affiche pas, et elle n'existe dans
  l'environnement que le temps de la moisson. Elle n'entre ni dans le dépôt
  ni dans `.env`.
- **Le dépôt n'est mis à jour que s'il est sur main et sans travail en
  cours.** Sinon la moisson tourne avec la version locale, et le journal le
  dit.
- **Shotgun passe à cinq villes** : Montpellier, Toulouse, Lyon, Marseille
  (« aix-marseille » chez eux) et Paris, plafonnée à dix pages parce que
  Resident Advisor la couvre déjà.

## Ce que cela engage

- Si le Mac reste éteint plusieurs jours, ces deux sources vieillissent : le
  calendrier garde les soirées déjà versées, rien ne se perd.
- Le journal est `~/Library/Logs/sonaa-moissons.log`. Pour tout retirer :
  `npm run deplanifier:mac`.
