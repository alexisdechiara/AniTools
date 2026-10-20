# Audit UX/UI et feuille de route produit

Audit réalisé le 20 octobre 2026 sur la branche `codex/complete-audit-roadmap`
(travail non commité inclus), en complément de `docs/AUDIT.md` qui couvre la
sécurité, l'architecture et la livraison.

## 1. Périmètre et méthode

- **Surfaces parcourues dans le navigateur** : Login, Dashboard, Statistics
  (Overview, Genres, Voice Actors), Rewind 2026, Explore, Podium, Timeline,
  Calendar (jour, semaine, mois), Tierlist, Create, Settings, Support.
- **Identités** : invité, puis profil public `alexisdechiara` (433 animes).
  OAuth non testé (pas de session AniList dans le navigateur d'audit).
- **Viewports** : 375 px (mobile), ~800 px, 1440 px ; thème clair et sombre.
- **Grille d'analyse** : accessibilité, mise en page, rédaction, typographie,
  couleurs, finition visuelle (suite `better-*`), plus les parcours fonctionnels
  et la valeur produit.
- **Contrôles automatisés dans la page** : noms accessibles de tous les
  contrôles visibles, `alt` des images, nombre de `<h1>` et de `<main>`, cibles
  de moins de 24 px, contrastes calculés sur les couleurs réellement rendues.
- **Conventions du projet lues** : `AGENTS.md`, `docs/AUDIT.md`,
  `docs/CREATE.md`, `docs/DEPLOYMENT.md`. Stack : Nuxt 4, Nuxt UI, Tailwind 4,
  Pinia, Unovis, vue-cal, grid-layout-plus.

**Non couvert** : comparaison avec la maquette Claude Design « Maquette AniTools
responsive » (non accessible depuis cette session), lecteur d'écran réel, zoom
200 %, mode OAuth, navigateurs autres que Chromium.

## 2. Synthèse

L'application est riche et visuellement soignée sur desktop : Rewind, Explore
et Settings sont au niveau d'un produit fini. Cinq problèmes bloquent pourtant
une mise en production :

1. **Aucune navigation sur mobile.** La barre latérale passe en `display: none`
   sous 1024 px et aucun bouton ne l'ouvre.
2. **Le mode profil public ne survit pas à un rechargement.** Un favori, un lien
   partagé ou un F5 sur une page personnelle renvoie au login.
3. **La vue Mois du Calendar est cassée** dès que la période traverse un
   changement d'heure (requête refusée en 400).
4. **Le graphique « Mean Score » affiche un axe faux**, qui trompe sur la
   distribution des notes.
5. **Les titres longs débordent des cartes du Dashboard** et créent un défilement
   horizontal.

Côté produit, les fondations (API serveur, stores, utilitaires testés) sont
solides. Les plus gros gains viennent maintenant de trois chantiers : une vraie
porte d'entrée pour les visiteurs, un Calendar personnalisé (« mes séries ») et
le partage social (Rewind et comparaison entre profils).

## 3. Constats ranked

Sévérité : **HIGH** bloque une tâche, trompe l'utilisateur ou rend un contenu
inaccessible ; **MEDIUM** dégrade nettement la compréhension ou la cohérence ;
**LOW** est du polish isolé.

### 3.1 Bloquants fonctionnels (hors grille `better-*`)

| Sévérité | Emplacement | Constat | Correction proposée |
| --- | --- | --- | --- |
| HIGH | `app/middleware/Auth.global.ts:16`, `app/stores/User.ts:248` | En SSR, `publicUsername` n'existe que dans le `localStorage` : le middleware voit un visiteur anonyme et redirige vers `/login`. Reproduit sur `/`, `/statistics` et toute page perso chargée directement. | Persister l'identité publique dans un cookie non sensible (`anitools-public-profile`, `SameSite=Lax`, lu par `useCookie`) et le lire dans `restoreSession`. À défaut, laisser passer le middleware côté serveur pour `oauthWithPublicProfile` et ne trancher que côté client. Ajouter un test e2e « rechargement en mode profil public ». |
| HIGH | `server/utils/request-validation.ts:4`, `app/stores/Calendar.ts:32` | La vue Mois demande 6 semaines, soit 42 jours + 1 h au passage à l'heure d'hiver. Le serveur répond `400 Calendar ranges cannot exceed 42 days`, puis l'interface affiche « temporarily unavailable ». | Tolérer 43 jours côté serveur, ou découper la plage côté client. Distinguer une erreur 4xx (« Cette période est trop longue ») d'une indisponibilité. Ajouter un test unitaire avec une plage qui traverse un changement d'heure. |
| HIGH | `app/components/cards/MeanScoreBarCard.vue:20` | `tick-format="(d, i) => scoring[i]?.x"` utilise le rang du tick (0–9) au lieu de sa valeur : l'axe affiche 20, 30, 35… 60 sous des barres qui vont jusqu'à 100. | `(tick: number) => scoring[tick]?.x`. Les graphiques en ligne (`LineChart.vue:26`) formatent déjà la valeur du tick et ne sont pas touchés. |

### 3.2 Grille UX/UI

| Sévérité | Domaine | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- | --- |
| HIGH | Layout | `app/layouts/default.vue:14-41` | `UDashboardSidebar` sans `UDashboardSidebarToggle` ni `UDashboardNavbar`. À 375 px, la nav vaut `display:none`, largeur 0. | Ajouter un `UDashboardNavbar` partagé (titre de page + `UDashboardSidebarToggle`) dans chaque `UDashboardPanel`, ou une barre mobile dans le layout. | Aucune page n'est atteignable sur mobile : contenu inaccessible à 320 px. |
| HIGH | Layout | `app/components/cards/RecentListUpdatesCard.vue:68`, `CurrentAnimeCard.vue`, `MetricsCard.vue` | Le texte `truncate` est dans un parent qui s'élargit ; « Re:Zero… 4th Season » sort de la carte et crée un défilement horizontal à 1440 px. | `min-w-0 overflow-hidden` sur le conteneur de carte (`MetricsCard` racine et `GridItem`), titre complet dans `title` ou dans le popover. | Contenu tronqué ou débordant sans accès à la valeur complète. |
| HIGH | Accessibilité | `app/pages/create.vue:512`, `:518` | `<input type="color">` dans `UFormField label="Accent"`, sans `id` ni `aria-label`. | `id="create-accent"` + `:ui`/`name` du `UFormField` relié, ou `aria-label="Accent color"` / `"Background color"`. | Contrôle sans nom accessible. |
| HIGH | Couleurs | `app/components/explore/InterestedDeck.vue:63`, `app/pages/explore.vue:201` | `Undo` en `color="error"` ; toast de succès « Added to Plan to Watch » en `color="warning"`. | `Undo` en `neutral`/`soft` ; succès en `success`. | Couleur sémantique utilisée à contresens (danger sur une action non destructive). |
| MEDIUM | Accessibilité | `app/pages/explore.vue:290` | `<main>` imbriqué dans le `<main id="main-content">` du layout (2 landmarks). | Remplacer par `<section aria-label="Suggestion deck">`. | Navigation par landmarks ambiguë. |
| MEDIUM | Accessibilité | `app/pages/statistics/*.vue`, `explore.vue`, `timeline.vue`, `tierlist.vue`, `create.vue` ; `index.vue` et `statistics/*` sans `useSeoMeta` | 0 `<h1>` sur ces pages ; titre d'onglet « AniTools \| AniTools » (`app/app.vue:16` + `titleTemplate`). | Un en-tête de page partagé (`PageHeader` : surtitre, `<h1>`, description, actions), réutilisé partout ; `useSeoMeta({ title })` par page ; `title` par défaut vide dans `app.vue`. | Structure de titres et onglets indistincts. |
| MEDIUM | Rédaction | `app/components/cards/MetricsCard.vue:4`, `:13` ; `AnimesWatchedCard.vue:2` | `capitalize` CSS transforme « Anime in progress » en « Anime In Progress » ; « Animes Watched ». | Retirer `capitalize`, garder la casse de phrase du source ; « Anime watched ». | Casse et terminologie incohérentes entre cartes et pages. |
| MEDIUM | Rédaction | `app/pages/timeline.vue:50-53`, `components/timeline/ActivityCard.vue:93`, `GanttChart.vue:83-87`, `cards/NextEpisodesCard.vue:28`, `toLocaleString()` des compteurs | `Intl.DateTimeFormat(undefined, …)` : jours en français (« LUN. ») à côté de « watched episode » ; date brute « 21/10/2026 14:30:00 ». | Un utilitaire `formatDate`/`formatNumber` avec la locale de l'interface (`"en"` tant qu'il n'y a pas d'i18n) et des formats relatifs (« in 2 days · Wed 14:30 »). | Mélange de langues dans un même parcours (interdit par AGENTS.md), et risque de désynchronisation SSR/client. |
| MEDIUM | Layout | `app/pages/index.vue:466-467` | `breakpoints`/`cols` responsives de grid-layout-plus sans layout par breakpoint : trou de ~350 px à 800 px. | Générer un layout par breakpoint dans `app/utils/dashboard-layout.ts` (empilement ordonné en `md`/`sm`), avec un test unitaire. | Hiérarchie cassée sur tablette. |
| MEDIUM | Couleurs | `app/assets/css/main.css:55` (+ `--color-planning`) | Segments du donut Status : Paused 1,24:1, Planning 1,57:1 sur blanc. | Utiliser les marches 400–500 (≥ 3:1) et un contour clair entre segments. | Contraste des éléments graphiques sous 3:1. |
| MEDIUM | Accessibilité | `app/pages/calendar.vue:109-111` | Langue de doublage indiquée par un drapeau `circle-flags:*` en `aria-hidden`, sans texte. Le drapeau japonais se lit comme une « pastille rouge ». | Badge texte court (`JA`, `EN`, `FR`) ou libellé dans `getEventAriaLabel` ; légende dans le filtre « Dubbing ». | Sens porté par une icône seule ; un drapeau n'est pas une langue. |
| MEDIUM | Rédaction | `app/pages/login.vue:66-80` | Erreur de profil uniquement dans un toast de 5 s. | Message inline sous le champ (`aria-invalid`, `aria-describedby`) ; toast conservé pour les erreurs réseau, persistant jusqu'à fermeture. | L'erreur disparaît avant d'être lue et n'est pas reliée au champ. |
| MEDIUM | UI | `PageLoadingState` (Calendar, Dashboard, Tierlist, Explore) | Chargeur plein écran : 5 à 13 s avant le premier contenu sur le Dashboard. | Squelettes par carte (`WidgetLoadingSkeleton` existe déjà) et rendu progressif ; garder le plein écran pour Tierlist uniquement. | Temps perçu long ; le contenu déjà prêt reste masqué. |
| LOW | Rédaction | `cards/MeanScoreBarCard.vue:2`, `rewind/HighlightsCard.vue` | « 76.70 % » ignore la préférence de format de score. | Passer par `usePersonalScore`. | Préférence Settings non respectée partout. |
| LOW | UI | `components/podium/CategoryPodiumCard.vue`, `rewind/AnimeRankingCard.vue` | Trois titres à 100 % classés 1, 2, 3 ; titres coupés « Shimetsu Kaiy… ». | Mention « Tied » et départage explicite (date ou popularité) ; titre complet dans `title`/popover. | Classement trompeur, titres illisibles. |

### 3.3 Autres constats, hors plafond

- Statistics : barres Genres, Tags et Studios sans valeur chiffrée ; le
  Dashboard et la vue d'ensemble Statistics dupliquent les mêmes cartes.
- Rewind : heatmap sans légende ni infobulle ; sélecteur d'année peu visible.
- Calendar : le jour courant n'est pas mis en avant, pas de ligne « maintenant » ;
  la vue Jour s'ouvre à 00:00 sur mobile ; titres très tronqués quand les
  créneaux se chevauchent.
- Tierlist : premier lancement sans invitation à importer ; l'icône
  « inspecteur » ressemble à un bouton plein écran ; pas de `<h1>`.
- Explore : la sélection « Interested » est perdue au rechargement.
- Barre latérale (sombre) : l'état survol est identique à l'état actif.
- Dossiers vides `app/components/home` et `app/components/inbox`.
- Logo provisoire « A » (login, chargeurs) et `UHeader` détourné comme titre de
  barre latérale (`default.vue:25`).

### 3.4 Points vérifiés et conformes

- Contraste du login : textes secondaires entre 5,25:1 et 8,28:1, bouton AniList
  7,44:1.
- `prefers-reduced-motion` géré globalement (`main.css:108`).
- Aucun contrôle sans nom hors Create, aucune image sans `alt` sur les pages
  auditées.
- Mode sombre cohérent sur Settings, Support et les pages perso.

**Verdict de la grille : Block.** Quatre HIGH d'interface et trois HIGH
fonctionnels doivent être corrigés avant la mise en production.

## 4. Propositions de features

Classées par valeur pour l'utilisateur. Effort : S (≤ 1 jour), M (2–4 jours),
L (1–2 semaines).

### 4.1 Acquisition et entrée

| Feature | Valeur | Effort |
| --- | --- | --- |
| **Page d'accueil publique** pour les invités sur `/` : présentation des outils, accès direct à Calendar, Tierlist et Create, puis connexion. Aujourd'hui `/` renvoie sur un login sans aucun lien vers les outils publics. | Indexable, explique le produit, réduit le rebond | M |
| **Lien « Explorer sans compte »** sur le login vers les outils publics. | Correctif rapide en attendant la page d'accueil | S |
| **Profils récents** sur le login : les 3 derniers pseudos publics. | Retour en un clic | S |

### 4.2 Calendar, l'usage quotidien

| Feature | Valeur | Effort |
| --- | --- | --- |
| **Filtre « Ma liste »** (Watching / Planning) et mise en avant des séries suivies. Le filtre Status existe, mais reste caché dans un sous-menu. | Transforme un calendrier générique en agenda perso | S |
| **Export et abonnement iCal** (`/api/calendar.ics?username=…`, épisodes de ma liste) | Google/Apple Calendar, rappels natifs | M |
| **Ligne « maintenant », jour courant mis en avant, défilement automatique** vers l'heure actuelle | Lisibilité immédiate | S |
| **Fuseau horaire et format 12/24 h** dans Settings (le store User a déjà `timezone`) | Exactitude pour les utilisateurs hors Europe | S |
| **Vue « Saison »** : grille des nouveautés de la saison avec filtres et ajout à Planning (OAuth) | Outil de saison très demandé par la communauté AniList | M |

### 4.3 Dashboard et suivi

| Feature | Valeur | Effort |
| --- | --- | --- |
| **« +1 épisode » sur les animes en cours** (mutation serveur typée, OAuth), sur le modèle de `media-list.post.ts` | Transforme le Dashboard en outil d'action | M |
| **Carte « En retard »** : épisodes sortis mais pas encore vus | Répond à « qu'est-ce que je regarde ce soir ? » | S |
| **Carte Timeline compacte** (déjà listée comme dette dans AUDIT.md) | Continuité Dashboard → Timeline | S |
| **Différencier Dashboard et Statistics** : le Dashboard pour l'action et l'actualité, Statistics pour l'analyse | Moins de doublons | S |

### 4.4 Partage et social

| Feature | Valeur | Effort |
| --- | --- | --- |
| **Rewind partageable** : export en story (1080 × 1920) via le moteur Canvas de Create (top 3, genres, temps vu) | Effet viral en fin d'année | M |
| **Comparer deux profils** : score de compatibilité, animes communs, désaccords de notes, recommandations croisées | Feature sociale différenciante, sans nouvelle donnée privée | L |
| **Tierlist partageable par lien** (état compressé dans l'URL ou export JSON hébergé côté client) | Partage sans compte | M |
| **Nouveaux gabarits Create** : grille 3×3 de favoris, lineup de saison, carte « Currently watching » | Usage récurrent du studio | M |

### 4.5 Découverte

| Feature | Valeur | Effort |
| --- | --- | --- |
| **Persistance locale de la sélection « Interested »**, avec export et lien vers AniList | Évite de perdre une session de swipe | S |
| **Filtres de pile** : format, année, genres exclus, durée | Recommandations plus pertinentes | M |
| **Timeline : regrouper les épisodes consécutifs** (« Re:Zero, ép. 15 → 18 ») et détecter les binge-watchs | Flux lisible, données Rewind enrichies | S |

### 4.6 Fondations produit

| Feature | Valeur | Effort |
| --- | --- | --- |
| **i18n (FR/EN)** avec `@nuxtjs/i18n`, locale unique transmise aux formateurs | Le public visé est francophone ; prérequis à la cohérence des dates | L |
| **PWA installable** (manifest, icônes, cache des assets) | Usage mobile quotidien du Calendar | M |
| **Export et import des données locales** (préférences, tierlists, layout) dans Settings | Changer de navigateur sans perte | S |
| **Préférences supplémentaires** : langue des titres (romaji, anglais, natif), contenu adulte, fuseau | Cohérence avec AniList | S |

## 5. Plan de réalisation détaillé

Chaque phase se termine par la checklist d'AGENTS.md : `bun run lint`,
`bun run typecheck`, `bun run test:unit`, `bun run test:e2e`, `bun run build`,
`bun audit`.

### Phase 0 — Bloquants (≈ 3 jours)

1. **Navigation mobile**
   - Fichiers : `app/layouts/default.vue`, nouveau `app/components/PageHeader.vue`.
   - Ajouter `UDashboardNavbar` + `UDashboardSidebarToggle` dans chaque page via
     `PageHeader` (ce qui règle aussi l'absence de `<h1>`).
   - Acceptation : à 320 et 375 px, toutes les pages sont atteignables au doigt
     et au clavier ; e2e `public-shell.spec.ts` étendu (ouvrir le menu, aller
     sur Calendar).
2. **Session en profil public**
   - Fichiers : `app/stores/User.ts`, `app/middleware/Auth.global.ts`,
     `server/api/anilist/profile.get.ts` si besoin.
   - Cookie `anitools-public-profile` (pseudo uniquement, sans secret), lu en SSR.
   - Acceptation : e2e « charger un profil public, recharger `/statistics`,
     rester sur la page ». « Forget this profile » efface le cookie.
3. **Vue Mois du Calendar**
   - Fichiers : `server/utils/request-validation.ts`, `app/stores/Calendar.ts`,
     `app/pages/calendar.vue`.
   - Tolérance de 43 jours ; message d'erreur distinct pour une 4xx.
   - Acceptation : test unitaire couvrant octobre et mars ; vue Mois remplie.
4. **Axe du graphique Mean Score**
   - Fichier : `app/components/cards/MeanScoreBarCard.vue`.
   - Acceptation : libellés 10 → 100 alignés sur les barres ; contrôle visuel.
5. **Débordements du Dashboard**
   - Fichiers : `MetricsCard.vue`, `RecentListUpdatesCard.vue`,
     `CurrentAnimeCard.vue`, `NextEpisodesCard.vue`.
   - Acceptation : `scrollWidth === clientWidth` à 1440, 1024, 800 et 375 px.

### Phase 1 — Accessibilité et cohérence (≈ 4 jours)

1. Noms des inputs couleur de Create ; `<section>` au lieu du `<main>` imbriqué
   dans Explore.
2. `PageHeader` et `useSeoMeta` sur toutes les pages ; corriger le titre par
   défaut dans `app.vue`.
3. Utilitaire de formatage (`app/utils/format.ts`) : dates absolues, relatives et
   nombres avec une locale explicite ; remplacer tous les `toLocaleString()` et
   `Intl.DateTimeFormat(undefined)`. Tests unitaires déterministes (fuseau fixé).
4. Casse : retirer `capitalize` de `MetricsCard`, renommer « Animes Watched »,
   auditer tous les titres de cartes en casse de phrase.
5. Couleurs sémantiques : `Undo` neutre, toasts de succès en `success`, palette
   de statuts à ≥ 3:1 (Paused, Planning).
6. Erreurs inline sur le login ; toasts d'erreur persistants.
7. Langues de doublage en texte dans Calendar.
8. Score : `usePersonalScore` dans Mean Score, Highlights et Podium.

Acceptation : relance de l'audit automatique (0 contrôle sans nom, un seul `<h1>`
et un seul `<main>` par page) ; e2e mis à jour.

### Phase 2 — UX par surface (≈ 1,5 semaine)

| Surface | Tâches |
| --- | --- |
| Dashboard | Layouts par breakpoint (`dashboard-layout.ts` + tests), squelettes par carte à la place du chargeur plein écran, dates relatives dans Next airing, carte « En retard ». |
| Statistics | Valeurs chiffrées sur les barres, en-tête de page, Overview recentré sur l'analyse (le Dashboard garde les chiffres clés). |
| Calendar | Ligne « maintenant », jour courant, défilement vers l'heure actuelle, filtre « Ma liste » visible en premier niveau, infobulle du titre complet. |
| Rewind | Légende et infobulles de la heatmap, sélecteur d'année visible, titres complets au survol et au focus. |
| Podium | Égalités explicites, départage documenté ; évaluer la fusion avec Statistics ou Rewind « All time ». |
| Explore | Persistance locale de « Interested », filtres de pile. |
| Timeline | Regroupement des épisodes consécutifs (utilitaire testé), `<h1>` « Timeline ». |
| Tierlist | Écran de premier lancement (« Importer ma liste », « Partir d'un modèle », « Recherche »), icône et libellé de l'inspecteur, `<h1>`. |
| Login | Lien vers les outils publics, profils récents, logo définitif. |

### Phase 3 — Features à forte valeur (≈ 3–4 semaines)

1. Page d'accueil publique sur `/` (indexable, ajout au sitemap) avec redirection
   des connectés vers le Dashboard.
2. Export et abonnement iCal du Calendar (endpoint serveur validé, rate limité,
   en cache).
3. « +1 épisode » et carte « En retard » (mutation serveur OAuth typée, sur le
   modèle de `media-list.post.ts`).
4. Rewind partageable via le moteur Canvas de Create.
5. Comparaison de deux profils publics (nouvel utilitaire testé, page
   `/compare`).
6. Vue Saison.

### Phase 4 — Fondations (en continu)

- i18n FR/EN (prérequis : utilitaire de formatage de la phase 1).
- PWA et export/import des données locales.
- Tests de régression visuelle (captures Playwright par page et viewport) pour
  verrouiller les corrections de mise en page.
- Synchroniser la maquette Claude Design et le design system avec les nouveaux
  composants (`PageHeader`, navbar mobile), puis comparer chaque écran.

## 6. Suivi

| Phase | Statut |
| --- | --- |
| 0 — Bloquants | Fait (20/10/2026) |
| 1 — Accessibilité et cohérence | Fait (20/10/2026) |
| 2 — UX par surface | Fait, sauf les points listés en section 7 |
| 3 — Features | À valider (section 7) |
| 4 — Fondations | À valider (section 7) |

### Corrections livrées

- Barre de navigation mobile dans `layouts/default.vue` (bouton d'ouverture du
  menu, titre de la page) ; hauteur du Calendar ajustée.
- Profil public conservé au rechargement : cookie `anitools-public-profile`
  (pseudo public uniquement) lu au rendu serveur ; profil oublié seulement sur
  404 AniList.
- Vue Mois du Calendar : marge d'une heure pour le changement d'heure, message
  d'erreur distinct pour une période refusée, jour courant mis en avant, titre
  complet et langues de doublage dans le libellé et l'infobulle des événements.
- Graphique Mean Score : axe juste, moyenne et infobulle au format de score choisi.
- Cartes du Dashboard : plus de débordement horizontal, titre complet au survol,
  disposition propre à chaque breakpoint (`packDashboardLayout`, testé).
- `PageHeader` partagé : `<h1>` sur Statistics, Explore, Timeline, Create et
  Tierlist ; titres d'onglet dérivés du registre des fonctionnalités.
- Casse de phrase sur tous les titres de cartes (suppression de `capitalize`).
- `app/utils/format.ts` : dates et nombres en locale d'interface explicite
  (fini « LUN. » dans une interface anglaise), prochaines diffusions en relatif.
- Couleurs de statut à 3:1 minimum dans les deux thèmes.
- Create : sélecteurs de couleur nommés. Explore : plus de `<main>` imbriqué,
  « Undo » neutre, toast de succès en vert.
- Login : erreur sous le champ (`aria-invalid`, `role="alert"`), champ en 16 px
  sur mobile, liens vers les outils sans compte.
- Statistics : valeur chiffrée à droite de chaque barre.
- Podiums : rangs partagés et mention « Tied » en cas d'égalité
  (`competitionRanks`, testé).
- Rewind : sélecteur d'année visible, heatmap avec nombre de mises à jour par
  jour et légende.
- Tierlist : bandeau de démarrage quand la liste est vide, bouton
  « Customize » explicite à la place de l'icône d'inspecteur.

## 7. Checklist des features à valider

Rien de cette liste n'est commencé : chaque point attend ta validation.

### Entrée et identité

- [ ] Page d'accueil publique sur `/` pour les invités (présentation, accès aux
  outils publics, connexion), indexable.
- [ ] « Profils récents » sur le login (3 derniers pseudos publics).
- [ ] Logo et identité de marque définitifs (remplacer le « A » provisoire du
  login et des chargeurs).

### Calendar

- [ ] Filtre « Ma liste » (Watching / Planning) visible au premier niveau.
- [ ] Export et abonnement iCal des épisodes de ma liste.
- [ ] Fuseau horaire et format 12/24 h dans Settings.
- [ ] Vue « Saison » : nouveautés de la saison, filtres, ajout à Planning (OAuth).

### Dashboard et suivi

- [ ] Bouton « +1 épisode » sur les animes en cours (mutation serveur OAuth).
- [ ] Carte « En retard » : épisodes sortis mais pas encore vus.
- [ ] Carte Timeline compacte.
- [ ] Recentrer le Dashboard sur l'action et Statistics sur l'analyse (moins de
  cartes en double).
- [ ] Remplacer le chargeur plein écran par un rendu progressif carte par carte.

### Partage et social

- [ ] Rewind exportable en story via le moteur Canvas de Create.
- [ ] Comparaison de deux profils (compatibilité, animes communs, désaccords).
- [ ] Tier list partageable par lien.
- [ ] Nouveaux gabarits Create : grille 3×3 de favoris, lineup de saison.

### Découverte et activité

- [ ] Sélection « Interested » d'Explore conservée localement, avec export.
- [ ] Filtres de la pile Explore (format, année, genres exclus).
- [ ] Timeline : regrouper les épisodes consécutifs (« ép. 15 → 18 »).
- [ ] Podium : fusion éventuelle avec Statistics ou Rewind « All time ».

### Fondations

- [ ] i18n FR/EN (`@nuxtjs/i18n`) ; `UI_LOCALE` dans `app/utils/format.ts` est
  déjà le point unique à brancher.
- [ ] PWA installable.
- [ ] Export et import des données locales dans Settings.
- [ ] Préférences : langue des titres, contenu adulte.
- [ ] Tests de régression visuelle Playwright par page et par viewport.
- [ ] Comparer chaque écran à la maquette Claude Design.
