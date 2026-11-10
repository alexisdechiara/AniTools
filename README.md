# AniTools

AniTools est une application Nuxt 4 qui transforme les données AniList en
calendrier de diffusion, tableau de bord, statistiques, rétrospective annuelle,
découverte, timeline, tier lists et créations visuelles.

Le navigateur ne contacte jamais directement l'API GraphQL AniList : toutes les
opérations passent par des endpoints JSON serveur explicitement autorisés. Le
secret OAuth et le jeton utilisateur restent côté serveur.

## Fonctionnalités

- Calendar public : vues jour/semaine/mois, épisodes AniList, simuldubs Directus,
  recherche et filtres.
- Dashboard personnalisable et responsive : statistiques, épisodes à venir,
  animes en cours et mises à jour récentes.
- Statistics : vue d'ensemble, genres, tags, studios, voice actors et staff.
- Rewind annuel : genres, saisons, top/flop, sélection et temps regardé estimé.
- Tierlist publique : import AniList, mode franchise, classement, persistance,
  JSON et exports PNG/JPEG/WebP.
- Explore : recommandations AniList en pile swipe, découverte par studio,
  exclusion des titres déjà présents dans la liste complète et ajout à
  « Planning » avec une session AniList.
- Timeline : activité regroupée par semaines ou mois.
- Create : cartes anime (score, note, genres) et cartes de statistiques AniList,
  rendues localement via Canvas, sans upload.
- Podium : top 3 des animes, genres, tags et studios de la liste.
- Settings : thème, format d'affichage des scores et données locales.
- Support : FAQ publique et lien vers le dépôt GitHub.

`/calendar`, `/tierlist`, `/create`, `/settings` et `/support` fonctionnent sans
compte. Les autres
surfaces personnalisées utilisent soit une session OAuth, soit le nom d'un
profil AniList public.

## Prérequis

- Bun `>=1.3.5`
- Node.js `>=22.19.0`, y compris pour `bun run dev` et les tests navigateur :
  la CLI Nuxt s'exécute sur Node même lancée via Bun, et l'artefact Nitro
  `node-server` actuel l'exige aussi en production

Le dépôt utilise exclusivement Bun et le seul lockfile autorisé est `bun.lock`.

## Installation

```bash
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Le serveur de développement écoute par défaut sur
`http://localhost:3000`.

En développement, chaque réponse de lecture AniList est enregistrée une fois dans
`.data/anilist-dev-cache` puis rejouée : recharger les pages ne consomme plus le
quota AniList, mais les données restent figées. Supprimer ce dossier pour les
rafraîchir, ou régler `NUXT_ANILIST_DEV_CACHE` (`record`, `replay`, `off`).

## Authentification AniList

Le flux OAuth utilise l'Authorization Code Grant. Créer une application dans les
[paramètres développeur AniList](https://anilist.co/settings/developer) avec le
callback local exact :

```text
http://localhost:3000/auth/anilist/callback
```

Puis renseigner :

```dotenv
NUXT_SITE_URL=http://localhost:3000
NUXT_SITE_ENV=development
NUXT_ANILIST_CLIENT_ID=
NUXT_ANILIST_CLIENT_SECRET=
NUXT_ANILIST_REDIRECT_URI=http://localhost:3000/auth/anilist/callback
NUXT_SESSION_PASSWORD=
```

`NUXT_SESSION_PASSWORD` doit contenir au moins 32 caractères aléatoires. Ne
jamais placer le client secret, le mot de passe de session ou un jeton dans une
variable `NUXT_PUBLIC_*`.

Le flux conserve un `state` anti-CSRF, chiffre les cookies de transaction et de
session avec des usages cryptographiques distincts, limite le retour au même
site et ne renvoie jamais le jeton au client. AniList ne fournit pas de refresh
token : une reconnexion sera nécessaire à l'expiration.

La configuration de production, la rotation des clés, Directus et les contrôles
avant ouverture sont détaillés dans
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Vérifications

```bash
bun run check          # lint, typecheck, tests unitaires puis build
bun run test:nuxt      # seul le projet Vitest des stores et composables
bun run test:e2e       # Playwright contre le serveur de développement
bun run test:e2e:build # build puis Playwright contre le serveur de production
bun run audit:gate     # échoue sur une alerte haute ou critique non listée
```

La CI GitHub exécute l'installation figée, le lint, le typecheck, les tests
unitaires avec couverture, `bun run audit:gate`, le build et les tests
Playwright contre le build de production.

## Documentation

- [Audit de livraison et limites connues](docs/AUDIT.md)
- [Checklist de déploiement manuel](docs/DEPLOYMENT.md)
- [Formats et règles du studio Create](docs/CREATE.md)
- [Consignes pour les agents IA](AGENTS.md)

Les fonctions personnalisées restent marquées bêta tant que la configuration
OAuth et les contrôles de production n'ont pas été réalisés.
