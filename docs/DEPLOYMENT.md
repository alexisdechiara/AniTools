# Déploiement et configuration manuelle

Cette checklist regroupe les actions qui ne peuvent pas être terminées dans le
dépôt : création de l'application AniList, secrets, permissions de services,
infrastructure et recette réelle.

## 1. Créer l'application OAuth AniList

1. Ouvrir les [paramètres développeur AniList](https://anilist.co/settings/developer).
2. Créer une application dédiée à chaque environnement qui a un domaine
   différent, si possible.
3. En local, enregistrer exactement :

   ```text
   http://localhost:3000/auth/anilist/callback
   ```

4. En production, enregistrer exactement l'origine publique suivie de :

   ```text
   /auth/anilist/callback
   ```

   Exemple :

   ```text
   https://anitools.example.com/auth/anilist/callback
   ```

5. Copier le client ID et le client secret dans le gestionnaire de secrets de
   l'hébergeur. Ne pas les écrire dans Git, une image Docker, un log ou une
   variable `NUXT_PUBLIC_*`.

AniList exige que l'URL du callback corresponde exactement à celle enregistrée ;
voir les
[instructions officielles de l'Authorization Code Grant](https://docs.anilist.co/guide/auth/authorization-code).
La [documentation OAuth générale](https://docs.anilist.co/guide/auth/) précise
aussi que les jetons durent jusqu'à un an et qu'il n'existe pas de refresh token.

## 2. Définir les variables de production

Configurer les valeurs suivantes dans l'environnement du serveur :

```dotenv
NUXT_SITE_URL=https://anitools.example.com
NUXT_SITE_ENV=production

NUXT_PUBLIC_DIRECTUS_URL=https://api.anitools.example.com

NUXT_ANILIST_CLIENT_ID=...
NUXT_ANILIST_CLIENT_SECRET=...
NUXT_ANILIST_REDIRECT_URI=https://anitools.example.com/auth/anilist/callback

NUXT_SESSION_PASSWORD=...
NUXT_SESSION_PREVIOUS_PASSWORD=
```

Contrôles :

- [ ] `NUXT_SITE_URL` est l'origine canonique publique, sans chemin.
- [ ] `NUXT_SITE_ENV=production`.
- [ ] `NUXT_ANILIST_REDIRECT_URI` est strictement identique au callback AniList.
- [ ] Le client secret n'est accessible qu'au processus serveur.
- [ ] `NUXT_SESSION_PASSWORD` contient au moins 32 caractères aléatoires.
- [ ] `NUXT_SESSION_PREVIOUS_PASSWORD` est vide au premier déploiement.
- [ ] Aucune valeur réelle n'est committée dans `.env` ou `.env.example`.

Une clé de session peut être générée avec Bun :

```bash
bun -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Conserver cette clé dans un gestionnaire de secrets avec historique et contrôle
d'accès. Sa perte déconnecte les utilisateurs ; sa divulgation impose une
rotation immédiate.

## 3. Déployer exclusivement en HTTPS

- [ ] Le domaine et le certificat TLS sont actifs avant d'ouvrir l'OAuth.
- [ ] HTTP redirige définitivement vers HTTPS.
- [ ] Le proxy transmet le protocole d'origine correctement.
- [ ] Le proxy écrase les en-têtes `X-Forwarded-*` fournis par le visiteur et
  transmet une adresse cliente fiable.
- [ ] L'environnement du processus est réellement en production.
- [ ] Les cookies de session apparaissent `HttpOnly`, `Secure`,
  `SameSite=Lax` et ne sont jamais visibles dans JavaScript.
- [ ] `/api/auth/session`, `/api/auth/logout` et `/auth/**` répondent avec
  `no-store`.
- [ ] Le callback et le logout rejettent une origine ou un `state` invalide.
- [ ] HSTS et les autres en-têtes de sécurité sont présents.

`NUXT_SITE_URL` sert d'origine de confiance aux requêtes sensibles. Une valeur
absente ou différente du domaine réellement visible cassera ou bloquera
l'authentification.

## 4. Faire une rotation de clé de session

Pour changer `NUXT_SESSION_PASSWORD` sans invalider immédiatement toutes les
sessions :

1. Générer une nouvelle clé.
2. Déplacer la clé courante dans `NUXT_SESSION_PREVIOUS_PASSWORD`.
3. Placer la nouvelle clé dans `NUXT_SESSION_PASSWORD`.
4. Déployer les deux valeurs en même temps.
5. Vérifier qu'une session existante est acceptée puis rechiffrée avec la
   nouvelle clé.
6. Retirer `NUXT_SESSION_PREVIOUS_PASSWORD` à la fin de la période de grâce.

Les sessions AniList peuvent durer jusqu'à un an. Garder l'ancienne clé pendant
un an préserve toutes les sessions qui ne reviennent pas entre-temps ; la retirer
plus tôt est acceptable si forcer leur reconnexion est souhaité. Ne jamais
conserver plus d'une ancienne clé dans cette mécanique.

En cas de compromission, ne pas utiliser de période de grâce : retirer la clé
exposée, déployer une nouvelle clé et accepter la déconnexion générale.

## 5. Restreindre Directus

Le calendrier lit uniquement la collection `simuldub`. Pour le rôle utilisé
sans authentification :

- [ ] Autoriser uniquement `read` sur `simuldub`.
- [ ] Limiter les champs à `id`, `status`, `title`, `start_date`, `end_date`,
  `episode`, `languages`, `streaming` et `anilist_media_id`.
- [ ] Restreindre les éléments visibles aux statuts `published` et `cancelled`
  si le modèle de permissions Directus le permet.
- [ ] Refuser `create`, `update`, `delete`, import/export et accès au schéma.
- [ ] Ne rendre publique aucune autre collection par héritage de rôle.
- [ ] Vérifier qu'aucun token administrateur n'est nécessaire ou présent dans
  AniTools.
- [ ] Autoriser le réseau sortant du serveur AniTools vers Directus.
- [ ] Tester la suppression temporaire de Directus : Calendar doit rester
  utilisable avec un avertissement et les épisodes AniList.

`NUXT_PUBLIC_DIRECTUS_URL` expose l'adresse du service, jamais un identifiant
secret. Les permissions Directus restent donc la véritable frontière d'accès.

## 6. Choisir le runtime de l'artefact Nitro

Les commandes de développement, d'installation, de test et de build utilisent
exclusivement Bun :

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test:unit
bun run test:e2e
bun audit
bun run build
```

Le preset Nitro actuel produit cependant `.output/server/index.mjs` pour
`node-server`. La cible de production doit donc fournir Node.js `>=22.19.0` pour
exécuter cet artefact, même si Bun reste le gestionnaire du projet.

- [ ] Épingler Node.js `>=22.19.0` sur l'hébergeur.
- [ ] Conserver Bun `>=1.3.5` pour installation et build.
- [ ] Tester le démarrage de `.output/server/index.mjs`.
- [ ] Vérifier arrêt gracieux, health check et redémarrage.
- [ ] Vérifier que les variables ne sont disponibles qu'au runtime serveur.

Ne déclarer un déploiement « runtime Bun » qu'après avoir choisi un preset Nitro
compatible avec l'hébergeur et rejoué la recette complète. L'artefact actuel ne
le garantit pas.

## 7. Préparer le multi-instance ou le serverless

Aujourd'hui, les caches Calendar et les buckets de rate limiting vivent dans la
mémoire du processus. Ils conviennent à une recette ou à une instance unique,
mais chaque instance possède ses propres compteurs et son propre cache.

Avant plusieurs réplicas, autoscaling ou fonctions serverless :

- [ ] Remplacer les `Map` de rate limiting par Redis, KV ou un service atomique
  partagé avec expiration.
- [ ] Partager les caches Calendar/Directus ou utiliser un cache de plateforme
  cohérent.
- [ ] Définir des clés séparant endpoint, identité/IP et fenêtre.
- [ ] Conserver les limites amont AniList même en présence d'un cache CDN.
- [ ] Définir un comportement sûr si le stockage partagé est indisponible.
- [ ] Vérifier l'IP client derrière le CDN/proxy et empêcher l'usurpation de
  `X-Forwarded-For`.
- [ ] Ajouter métriques et alertes sur `429`, timeouts, erreurs AniList,
  indisponibilité Directus et taux de cache.
- [ ] Éviter de journaliser corps OAuth, cookies, en-têtes Authorization ou
  réponses contenant des données privées.

## 8. Respecter les conditions AniList

Relire les [conditions d'utilisation de l'API AniList](https://anilist.gitbook.io/anilist-apiv2-docs/docs/guide/terms-of-use)
juste avant la mise en ligne ; elles peuvent évoluer.

- [ ] Ne pas utiliser AniList comme système de sauvegarde ou base de données.
- [ ] Ne pas aspirer, hoarder ou collecter massivement le catalogue.
- [ ] Mettre en cache uniquement ce qui est nécessaire au fonctionnement et
  avec une durée limitée.
- [ ] Respecter les consignes de nommage et indiquer clairement que le produit
  est une intégration non officielle si la marque AniList est utilisée.
- [ ] Vérifier le seuil commercial en vigueur. Les conditions consultées lors de
  cet audit prévoient une licence au-delà de 150 USD de revenu mensuel ; demander
  l'accord AniList avant de dépasser ce cadre.
- [ ] Prévoir un contact et une procédure de retrait si AniList demande une
  modification d'usage.
- [ ] Ne lancer une future mutation qu'après confirmation utilisateur explicite
  et via une opération serveur autorisée.

## 9. Finaliser marque, contenu et i18n

- [ ] Remplacer les assets temporaires par le logo, favicon et carte Open Graph
  finaux, avec droits d'utilisation documentés.
- [ ] Tester les aperçus sociaux sur les principaux services.
- [ ] Vérifier que le nom et la présentation ne suggèrent pas une affiliation
  officielle à AniList.
- [ ] Choisir la langue de lancement. L'interface est actuellement en anglais.
- [ ] Si le français est ajouté, intégrer une bibliothèque i18n et traduire des
  parcours complets ; ne pas mélanger les langues écran par écran.
- [ ] Relire les textes de confidentialité, les responsabilités de licence des
  images Create et les éventuelles obligations cookies selon le pays ciblé.
- [ ] Vérifier les contrastes, le clavier, le zoom 200 % et un lecteur d'écran
  sur les navigateurs réellement supportés.

## 10. Recette avant ouverture

- [ ] `bun install --frozen-lockfile` réussit sur un environnement vierge.
- [ ] Lint, typecheck, tests unitaires, E2E, audit et build sont verts.
- [ ] Aucun lockfile autre que `bun.lock` n'est présent.
- [ ] `bun audit` ne signale aucune vulnérabilité connue non acceptée.
- [ ] OAuth fonctionne avec un vrai compte, puis logout invalide la session.
- [ ] Le mode profil public fonctionne sans autorisation OAuth.
- [ ] `/calendar`, `/tierlist` et `/create` fonctionnent sans compte.
- [ ] Les pages personnalisées refusent proprement une identité absente.
- [ ] Les callbacks invalides, erreurs AniList et quotas `429` sont lisibles.
- [ ] Calendar reste fonctionnel quand Directus est indisponible.
- [ ] Les exports Tierlist et Create sont vérifiés en PNG, JPEG et WebP.
- [ ] Desktop, tablette, mobile, clavier et lecteur d'écran ont été contrôlés.
- [ ] Le sitemap n'expose que les pages publiques indexables.
- [ ] Les logs et l'APM ont été inspectés pour confirmer l'absence de secrets.
- [ ] Un rollback de l'application et des secrets est documenté et testé.
