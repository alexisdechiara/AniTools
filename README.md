# AniTools

AniTools est une application Nuxt qui transforme les données AniList en calendrier de diffusion, tableau de bord, statistiques, rétrospective annuelle et tier lists.

## Prérequis

- Bun 1.3.5 ou supérieur
- Node.js 22.19 ou supérieur uniquement si la cible de déploiement exécute le serveur avec Node

Le dépôt utilise uniquement `bun.lock`.

## Installation

```bash
bun install
cp .env.example .env
bun run dev
```

Le serveur de développement est disponible par défaut sur `http://localhost:3000`.

## Variables d'environnement

Les données AniList publiques fonctionnent sans OAuth. Pour activer « Continue with AniList », créer une application dans les [paramètres développeur AniList](https://anilist.co/settings/developer), puis configurer :

```dotenv
NUXT_ANILIST_CLIENT_ID=
NUXT_ANILIST_CLIENT_SECRET=
NUXT_ANILIST_REDIRECT_URI=http://localhost:3000/auth/anilist/callback
NUXT_SESSION_PASSWORD=
```

L'URL de redirection doit correspondre exactement à celle enregistrée chez AniList. `NUXT_SESSION_PASSWORD` doit contenir au moins 32 caractères aléatoires. Ne jamais placer ces valeurs dans une variable `NUXT_PUBLIC_*`.

Les autres variables disponibles sont documentées dans `.env.example`.

## Vérifications

```bash
bun run lint
bun run typecheck
bun run build
bun audit
```

## État du produit

- Calendar : fonctionnel, avec épisodes AniList et simuldubs Directus.
- Dashboard et Statistics : partiels.
- Rewind : prototype à remplacer par de vrais calculs annuels.
- Tierlist : fonctionnelle, exports et mode franchise à terminer.
- Explore, Timeline et Create : à construire.

Consulter [l'audit complet](docs/AUDIT.md) et [les consignes pour agents IA](AGENTS.md) avant toute évolution importante.

## Authentification

Le flux AniList utilise l'Authorization Code Grant :

- le client secret et l'échange du code restent côté serveur ;
- un état temporaire protège le callback contre les requêtes forgées ;
- le jeton est conservé dans un cookie chiffré `HttpOnly` ;
- l'API de session ne renvoie jamais le jeton au client.

Le mode par nom d'utilisateur reste disponible pour consulter un profil public sans autoriser l'application.
