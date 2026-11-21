# app-supervision — Application de supervision énergétique

Ce dépôt est le **front-end** de l'application de supervision énergétique — la couche la
plus haute et le **point d'entrée utilisateur**. Ce README explique comment installer et
lancer **toutes les couches** de la pile.

Implémentation de `spec/supervision-energetique-front-technique.md` (stack Startin'blox :
shell Orbit, sibStore, blox du Store en ES modules CDN, composants custom Lit, sib-auth/OIDC).

## Pile (du haut vers le bas)

```
app-supervision (ce dépôt)      ← front — point d'entrée UTILISATEUR
   │ consomme : LDP racine, POST /app/query, OIDC (/auth/*)
   ▼
app-supervision-backend         ← assemblage déployable — point d'entrée DÉPLOIEMENT
   │   (scripts/start.sh lance toute l'infra docker)
   ├── fap-ldp                  ← extension LDP : domaine app.*, endpoint JSON-LD, ACL/PDP
   └── fap-light-serveur        ← cœur : PostgreSQL bronze/silver/gold + ORCE + caddy + IdP (1 VM)
app-store + app-features        ← features activables, branchées sur le front
spec/                           ← spécifications (documentation, à lire en premier)
```

**Règle de dépendance : front → back → fap.** Aucun fichier du front n'est servi par le
back : en dev, `http://app.localhost/` est un proxy caddy vers le serveur Vite de l'hôte ;
en prod, `dist/` est déployé sur une origine séparée (déclarée dans `FRONT_ORIGINS` du back).

## Prérequis

- **Docker + plugin docker compose** (pour le back)
- **Node.js ≥ 20 + npm** (pour le front ; testé avec Node v20)

## Installation et lancement de toutes les couches

### 1. Cloner les dépôts

```sh
git clone git@github.com:sylvainlb/app-supervision.git          # ce dépôt (front)
git clone git@github.com:sylvainlb/app-supervision-backend.git  # assemblage déployable
git clone git@github.com:sylvainlb/fap-light-serveur.git        # cœur FAP-light
git clone git@github.com:sylvainlb/fap-ldp.git                   # extension LDP
# Optionnels (features v2) :
git clone git@github.com:sylvainlb/app-store.git                 # mécanisme de features
git clone git@github.com:sylvainlb/app-features.git              # composants métier
# + le répertoire spec/ (spécifications) fourni avec les sources, à côté des dépôts
```

> Les 4 premiers dépôts suffisent pour faire tourner l'application. `app-store` /
> `app-features` ne servent que pour les features chargeables en v2 (le front embarque
> déjà le mécanisme `<app-store>` / `<app-menu>` en vendored).

### 2. Lire la spec

`../spec/facis-fap-architecture-synthese.md` (architecture globale), puis
`../spec/supervision-energetique-spec-fonctionnelle.md` (cas d'usage métier).

### 3. Builder les images Docker custom du cœur (une seule fois)

La stack du back référence deux images **locales** (absentes des registries) ; leurs
Dockerfiles sont dans `fap-light-serveur` :

```sh
cd fap-light-serveur
docker build -t fap-light-postgres:latest ./deploy/postgres   # PostgreSQL 16 + pg_cron
docker build -t fap-light-orce:latest     ./deploy/orce       # ORCE (Node-RED) + modules runtime
```

### 4. Démarrer le back (toute l'infra)

```sh
cd app-supervision-backend
cp .env.example .env     # les secrets sont auto-générés au 1er lancement ; éditer si besoin
./scripts/start.sh       # idempotent ; --reset pour repartir à zéro
# → LDP/JSON-LD : http://localhost/  ·  IdP Keycloak : http://localhost/auth/realms/fap-light
# → éditeur ORCE : http://localhost/editor/  ·  comptes dev : alice / bob / admin (mdp "dev")
```

### 5. Lancer le front

```sh
cd app-supervision
npm ci
npm run dev              # 1er lancement : configure auto vers http://localhost (POD_URL)
```

→ ouvrir **http://app.localhost/** (caddy du back proxifie vers ce serveur Vite).

### 6. (Optionnel) Activer des features

`app-store` (mécanisme `<app-store>` / `<app-menu>` + modèle SQL côté FAP-LDP) et
`app-features` (12 composants métier) s'intègrent dans ce front — voir leurs README.

---

## Structure (spec §4)

```
├── orbit.json          ← config Orbit : routes §8, composants §6, oidc §13.6, npm épinglé
├── src/
│   ├── index.ts        ← bootstrap Orbit + injection fetchAuthn (sib-auth) dans sibStore §13.7
│   ├── config.js       ← env : POD_URL, OIDC_ISSUER, OIDC_CLIENT_ID (fallback Node pour tests)
│   └── lib/            ← logique pure testée (contrat HTTP, transitions, gold, ETag, context)
├── components/
│   ├── boilerplate/    ← hiérarchie vendored §6.2 : LitElement → ComponentObjectHandler
│   │                     → ComponentObjectsHandler → OrbitComponent (Task, save, requestNavigation)
│   └── <nom>/          ← 6 blox custom Lit §7 (building-map, energy-chart, anomaly-list,
│                         ticket-board, ticket-detail, user-admin) + logic.js pur par composant
├── tests/              ← conformité spec + composants (node --test + happy-dom, sibStore mocké)
└── dist/               ← build Vite (prod : déployé sur l'origine front FRONT_ORIGINS du back)
```

## Lancer en local avec le back FAP-light

**1. Back** (stack 1 VM : postgres + ORCE + caddy + Keycloak) — voir `../app-supervision-backend` :

```sh
cd ../app-supervision-backend
./scripts/start.sh          # démarre le back (idempotent)
# → LDP/JSON-LD : http://localhost/ (dev = HTTP pur) ; Keycloak (IdP) :
#   http://localhost/auth/realms/fap-light ; ORCE/éditeur : http://localhost/editor/
```

**2. Front** (AUTONOME du back : aucun fichier du client n'est servi par le backend) :

```sh
cd ../app-supervision
npm ci
npm run dev                 # → http://app.localhost/  (port 80 : caddy du back proxifie app.localhost → ce serveur vite)
#   configure auto au 1er lancement : ./scripts/configure.sh http://localhost
#   (POD_URL = le BACK ; OIDC_ISSUER = http://localhost/auth/realms/fap-light)
```

Le client n'a **aucun proxy vite** vers le back : tous les appels partent en absolu vers
`POD_URL` (cross-origin depuis `http://app.localhost/`) — le CORS est géré par le back
(origine déclarée dans `FRONT_ORIGINS` du backend) et `/auth` par Keycloak (`webOrigins`).
Un proxy vite casserait le DPoP (`DPoP HTTP URL mismatch`).
En production : `./scripts/configure.sh https://fap.example.com && npm run build`,
puis déployer `dist/` sur l'origine prévue dans `FRONT_ORIGINS` (ex. `https://app.fap.example.com`).

## Authentification OIDC

Une seule `Session` `@inrupt/solid-client-authn-browser` (login direct avec `clientId`
statique `fap-light-ui` — Keycloak ne fait pas de dynamic registration, D-7 ; `<sib-auth>`
n'est pas utilisé car il embarque la même lib en double et les deux se disputent le code) :

- pas de session au chargement → redirect automatique vers
  `${OIDC_ISSUER}/protocol/openid-connect/auth` (`http://localhost/auth/realms/fap-light/...` en dev) ;
- le scope `offline_access` (en dur dans oidc-client-ext) est retiré de l'URL d'autorisation
  via `handleRedirect` — Keycloak 26.4 le refuse pour ce client (`not_allowed`) ;
- `tokenType: 'Bearer'` : le FAP-LDP valide les tokens via userinfo en Bearer
  (`fap-ldp/core/nodes/nodes/ldp-container.js`) → un token DPoP-bound (cnf) serait refusé ;
- 401 du LDP → purge du cache + re-login ;
- `session.fetch` injecté dans `window.sibStore.fetchAuthn` (§13.7, point d'injection unique),
  avec réécriture des URL relatives en absolues vers `POD_URL` et repli fixtures (`VITE_FIXTURES`).

Lecture des données : `getJson(url)` (components/boilerplate) = `fetchAuthn` + JSON brut.
`sibStore.getData()` renvoie des proxies `CustomGetter` (champs lisibles seulement via
`await proxy.get(path)`) — illisible pour nos blox custom, d'où le JSON brut.
Les conteneurs LDP ne listant que des `@id`, `resolveMembers()` résout chaque membre.
Champs lus par nom local via `field(obj, 'lat')` (le back préfixe par table :
`app_buildings:lat`, `app_tickets:status`, `gold_anomaly_candidates:severity`…).
Écritures (POST/PATCH) en clés non préfixées — le serveur mappe par nom local (@vocab).

## Données gold

- Publiées en conteneurs LDP (`/gold/anomaly_candidates/`, …) → lecture LDP directe.
- Volumineuses (horaires) → proxy signé côté serveur `POST /app/query`, body
  `{agreement, assetId, from, to}` avec `assetId` = id catalogue DSP
  (`dataset:facis:net-grid-hourly`) et `agreement:interne:contrat-cadre`.
  Jamais de HMAC côté navigateur (§13.1). Réponse `{columns, rows[]}` avec rows positionnels.

## Dev local (HTTP pur)

Back sur `http://localhost` (:80, ENV=dev) — Keycloak sert sous `/auth`
(`--http-relative-path /auth`, caddy ne strippe pas, `KC_PROXY_HEADERS=xforwarded`
pour la validation DPoP htu). Front : `npm run dev` → `http://localhost:5173/`,
`.env` : `POD_URL=http://localhost`, `OIDC_ISSUER=http://localhost/auth/realms/fap-light`.
Comptes Keycloak : alice / bob / admin (mdp `dev`).
Note : `overrides` npm épinglent `@inrupt/oidc-client-ext`/`solid-client-authn-core`
à 1.11.2 (aligné sur `@inrupt/solid-client-authn-browser@1.11.2`, sinon
`removeOidcQueryParam is not a function`).

## Données de démo au déploiement

Un déploiement from-scratch **a déjà des données** — trois sources :

1. **Seed SQL du back** (chargé automatiquement au boot par
   `app-supervision-backend/scripts/deploy-local.sh`) :
   `app-supervision-backend/sql/101_seed_demo.sql` insère les comptes applicatifs
   (webid = claims Keycloak : alice / bob / admin), un **parc de bâtiments de démo**
   (avec `meter_id`, géolocalisés), des **tickets** et des **commentaires**.
   → visibles dès le 1er login dans l'UI.
2. **Simulation capteurs** (cœur FAP-light, tick toutes les 60 s) : alimente
   bronze → silver → gold (dont `gold.anomaly_candidates` et les agrégats horaires
   consommés via `POST /app/query`). Les **séries horaires se remplissent progressivement**
   après le boot (pas instantanément).
3. **Fixtures du front** (repli uniquement) : si le back ne répond pas (LDP 404/500,
   réseau coupé), le front retombe sur des **données exemple** (`src/lib/fixtures.js`) :
   4 bâtiments géolocalisés (Lyon), 4 tickets tous statuts, 4 anomalies, commentaires,
   utilisateurs, et séries horaires synthétiques pour le proxy `/app/query`.
   Dès que le back répond, les vraies données repassent devant.
   Désactivable : `VITE_FIXTURES=0` dans `.env`. Les mutations (POST/PATCH/DELETE)
   restent en mémoire de session.

## Tests de conformité

```sh
npm test          # = node --test tests/
```

La suite valide la conformité à la spec : structure §4, routes/Orbit §8+§13.6, contrat
HTTP FAP-LDP §2/§10 (401/403/404/412/304/429, dspace:Error), matrice de transitions §13.5,
mapping gold LDP/proxy §13.3 + contrat proxy C1.9, ETag §2/§5, @context §13.2, la règle
absolue §13.1 (aucun secret HMAC ni appel /dsp/data côté navigateur), la logique pure de
chaque composant (états carte, filtres, groupage, fenêtres, validation) et les composants
Lit eux-mêmes sous happy-dom (rendu, requestNavigation, PATCH merge-patch, 412, save→refresh).

## Note

Point O-3 de la spec : à confirmer en conditions réelles que `fetchAuthn` est bien le point
d'injection unique de `@startinblox/oidc@0.16.6` dans sibStore (`@startinblox/core@2.0.6`).
Les tests Cypress composant/e2e CA-1..CA-5 de la spec §11 restent à écrire côté TCK FAP-LDP.
