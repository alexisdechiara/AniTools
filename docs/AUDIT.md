# Audit AniTools

Date de référence : 29 juillet 2026.

## Résumé

Le socle est sain pour poursuivre le développement après la mise à niveau : Nuxt 4.5.1, dépendances directes actualisées, analyse de sécurité des dépendances sans vulnérabilité connue, lint et typecheck opérationnels, et fondation OAuth AniList sécurisée côté serveur.

Le produit n'est toutefois pas prêt pour une version publique complète. Calendar et Tierlist sont les fonctionnalités les plus avancées. Dashboard et Statistics sont utilisables mais incomplets et peu responsives. Rewind est encore une maquette alimentée en partie par des valeurs fixes ou aléatoires. Explore, Timeline et Create n'existent pas encore.

## État par surface

| Surface | État | Constat |
| --- | --- | --- |
| Authentification | Préparée | Authorization Code Grant, état anti-CSRF, échange serveur et session chiffrée ajoutés. Il reste à créer l'application AniList et à faire transiter les requêtes privées par le serveur. |
| Calendar | Avancé | AniList + simuldub, vues jour/semaine/mois, recherche et filtres. Il manque des types stricts, des tests, une limite de plage et du rate limiting. |
| Dashboard | Partiel | Cartes de synthèse et prochains épisodes présents. « Add a card » est inactif, la grille est rigide et la timeline/animes du moment manquent. |
| Statistics | Partiel | Vue d'ensemble riche. Les sous-routes Genres, Tags, Voice Actors, Studios et Staff sont désactivées. |
| Rewind | Prototype | Plusieurs métriques sont codées en dur, les listes sont vides et l'activité est aléatoire. Les calculs ne sont pas réellement bornés à l'année. |
| Tierlist | Avancé | Tiers, drag-and-drop, filtres, import et persistance locale. Le mode franchise et tous les exports restent à faire. |
| Explore | Absent | Aucune page ni logique de recommandation. |
| Timeline | Absent | Aucune page ni modèle d'activité. |
| Create | Absent | Aucun gabarit ni pipeline de rendu/export. |
| Settings | Démonstration | Contenu Nuxt UI factice (profil Benjamin, mot de passe, membres, notifications) sans backend réel. À remplacer ou supprimer. |

## Dépendances et outillage

### Réalisé

- Nuxt `4.2.2` → `4.5.1`, correctif de sécurité courant.
- Nuxt UI `4.3.0` → `4.10.0`.
- Nuxt Image `2.0.0` → `2.1.0`.
- Remplacement du module SEO tout-en-un par les modules réellement utilisés : Site Config, Robots et Sitemap.
- Pinia `3.0.4` → `4.0.2` et `@pinia/nuxt` `1.0.1`.
- Directus SDK `21.1.0` → `23.0.0`.
- ESLint `9.39.2` → `10.8.0`, TypeScript `6.0.3`, vue-tsc `3.3.8`.
- Mise à jour des bibliothèques d'icônes, graphiques, dates, VueUse, Zod et vue-cal.
- Suppression des dépendances directes inutilisées : `@nuxtjs/mdc`, `nuxt-charts`, `country-to-iso`, `embla-carousel-wheel-gestures`.
- Standardisation sur Bun 1.3.5 ; conservation du seul lockfile `bun.lock` et suppression du lockfile npm concurrent.
- Installation figée, lint, typecheck, build de production et audit de sécurité validés avec les commandes Bun.
- Overrides temporaires de dépendances transitives vulnérables, validés par lint/typecheck/build. Ils devront être réévalués à chaque mise à jour.

### Risques restants

- `nuxt-graphql-client@0.2.46` est la dernière version publiée mais constitue un point de maintenance et tire un ancien pipeline GraphQL Codegen. Prévoir son remplacement par un client maintenu et une génération de types explicite.
- Le build Nitro cible encore `node-server` : Bun est le gestionnaire de paquets et l'entrée des commandes, mais l'artefact produit se lance actuellement avec Node `>=22.19.0`. Un déploiement intégralement exécuté par Bun nécessitera de choisir puis valider explicitement le preset Nitro adapté à l'hébergeur.
- `bun outdated` ne signale plus que TypeScript 7.0.2. Le projet reste volontairement sur 6.0.3, version embarquée par Nuxt 4.5.1, jusqu'à validation officielle de ce saut majeur par l'ensemble Nuxt/Vue tooling.
- La version `vue-cal` reste une release candidate (`5.0.1-rc.46`). Garder un test de non-régression du calendrier avant chaque montée de version.
- Le lint ne contient aucune erreur bloquante, mais remonte encore 1 452 avertissements, principalement sur la mise en forme Vue/Tailwind et des types `any`. Cette dette doit être réduite progressivement sans appliquer un `--fix` global non relu.

## Authentification AniList

### Fondation ajoutée

1. `/auth/anilist` crée une transaction OAuth et redirige vers AniList.
2. `/auth/anilist/callback` valide `state`, échange le code côté serveur puis charge `Viewer`.
3. Le jeton est conservé dans un cookie chiffré, `HttpOnly`, `SameSite=Lax`, `Secure` sous HTTPS.
4. `/api/auth/session` ne renvoie que le profil public de session, jamais le jeton.
5. `/api/auth/logout` détruit la session.
6. Le login conserve un mode « profil public » pour les usages ne nécessitant pas d'autorisation.

### Configuration manuelle requise

- Créer l'application dans les paramètres développeur AniList.
- Déclarer exactement l'URL de callback de production.
- Configurer `NUXT_ANILIST_CLIENT_ID`, `NUXT_ANILIST_CLIENT_SECRET`, `NUXT_ANILIST_REDIRECT_URI` et un `NUXT_SESSION_PASSWORD` aléatoire d'au moins 32 caractères.
- Ajouter ensuite des endpoints serveur dédiés et strictement typés pour les lectures privées ou mutations. Ne pas exposer un proxy GraphQL générique.
- Prévoir le renouvellement par reconnexion : AniList annonce des jetons valides un an et ne fournit pas de refresh token.

## Sécurité

### Corrigé

- 54 vulnérabilités initialement signalées par l'audit du registre, dont 4 critiques, ramenées à 0 connue.
- Suppression d'un `v-html` inutile sur une description externe.
- Secrets OAuth placés dans le runtime privé.
- État OAuth anti-CSRF, redirection de retour limitée au même site et session non mise en cache.
- Transmission automatique des cookies SSR au client GraphQL AniList désactivée afin que la session chiffrée ne quitte jamais le serveur AniTools.
- Correction de plusieurs erreurs de lint qui masquaient des mutations de props, routes mortes et assertions non sûres.

### À faire avant ouverture large

- [ ] Ajouter un rate limiting sur `/api/calendar`, `/api/search` et les futurs endpoints AniList authentifiés.
- [ ] Limiter explicitement la durée et l'ordre des plages demandées à `/api/calendar`.
- [ ] Ajouter une Content Security Policy après inventaire des images et services externes autorisés.
- [ ] Définir une stratégie de rotation de `NUXT_SESSION_PASSWORD` et de révocation des sessions.
- [ ] Éviter les logs verbeux contenant des objets AniList dans Tierlist et Calendar.
- [ ] Auditer les permissions Directus et empêcher toute lecture de collections non nécessaires.

## Qualité, tests et CI

Il n'existe actuellement ni suite de tests versionnée ni workflow CI visible. Le typecheck était bloqué localement par une page `test.vue` ignorée, qui a été corrigée dans le workspace mais n'appartient pas au dépôt.

Priorités :

- [ ] Ajouter Vitest pour les stores, calculs Statistics/Rewind, filtres Tierlist et fusion Calendar.
- [ ] Ajouter des tests de routes pour l'état OAuth, le callback invalide, l'expiration et la suppression de session.
- [ ] Ajouter Playwright pour login, profil public, Calendar et Tierlist.
- [ ] Créer une CI exécutant installation reproductible, lint, typecheck, tests, build et audit.
- [ ] Ajouter Renovate ou Dependabot avec regroupement contrôlé des mises à jour Nuxt.

## UX, accessibilité et responsive

- Les pages Dashboard, Statistics et Rewind utilisent des grilles fixes de quatre ou douze colonnes. Elles doivent recevoir des variantes mobile/tablette.
- Le login a encore besoin d'une vérification visuelle mobile et clavier.
- Tierlist dépend fortement du drag-and-drop et de menus au survol ; prévoir des actions clavier/tactiles équivalentes et des annonces pour lecteurs d'écran.
- Les boutons uniquement iconographiques doivent tous avoir un nom accessible.
- Ajouter des états d'erreur visibles aux appels Calendar et GraphQL, au lieu de seulement journaliser certaines erreurs.
- Prévoir une stratégie i18n : l'interface est en anglais, tandis que les messages techniques mélangent français et anglais.

## Performance et données

- Le cache Calendar est en mémoire de processus : il n'est ni partagé ni durable en environnement serverless.
- Les stores User et Tierlist sont persistés côté navigateur. Ne jamais y ajouter le jeton OAuth.
- Plusieurs tris Statistics mutent les tableaux sources ; la logique doit utiliser des copies pour éviter des changements d'ordre implicites.
- Le Dashboard charge statistiques et listes dans le middleware global, ce qui retarde toute navigation protégée. Prévoir du chargement parallèle, des squelettes et une invalidation de cache.
- Les composants et endpoints de démonstration (`customers`, `mails`, `members`, notifications et réglages factices) augmentent le poids et la confusion produit.

## SEO et contenu

- Les balises principales, canonical, sitemap et données structurées existent.
- Le README du template a été remplacé par une documentation AniTools.
- Le `SearchAction` structuré pointe vers `/calendar` sans véritable paramètre de recherche d'URL ; le retirer ou implémenter la cible attendue.
- Vérifier la prévisualisation sociale et remplacer l'image SVG par une carte finale quand l'identité visuelle sera stabilisée.
- Les pages privées ou personnalisées doivent rester exclues du sitemap et être envoyées avec une politique d'indexation adaptée.

## Backlog priorisé

### P0 — rendre le socle exploitable

- [ ] Configurer l'application OAuth AniList dans les environnements.
- [ ] Acheminer les lectures privées via des endpoints serveur autorisés.
- [ ] Supprimer ou remplacer les Settings et API de démonstration.
- [ ] Ajouter tests OAuth, Calendar, Statistics et Tierlist.
- [ ] Ajouter la CI.

### P1 — finir les fonctions déjà visibles

- [ ] Rendre Dashboard/Statistics/Rewind responsives.
- [ ] Remplacer toutes les données Rewind factices par des agrégations annuelles.
- [ ] Finaliser les exports Tierlist et le mode franchise.
- [ ] Ajouter rate limiting, CSP et validation stricte des entrées serveur.
- [ ] Remplacer `nuxt-graphql-client`.

### P2 — étendre le produit

- [ ] Explore.
- [ ] Timeline.
- [ ] Sous-pages Statistics.
- [ ] Module Create, après définition précise des gabarits et exports.
