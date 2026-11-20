# app-supervision

Front-end de l'application de supervision énergétique — implémentation de
`spec/supervision-energetique-front-technique.md` (stack Startin'blox : shell Orbit,
sibStore, blox du Store en ES modules CDN, composants custom Lit, sib-auth/OIDC).

## Structure (spec §4)

```
├── orbit.json          ← config Orbit : routes §8, composants §6, oidc §13.6, npm épinglé
├── src/
│   ├── index.ts        ← bootstrap Orbit + injection fetchAuthn (sib-auth) dans sibStore §13.7
│   ├── config.ts       ← env : POD_URL, OIDC_ISSUER, OIDC_CLIENT_ID
│   └── lib/            ← logique pure testée (contrat HTTP, transitions, gold, ETag, context)
├── components/
│   ├── boilerplate/    ← hiérarchie vendored §6.2 : LitElement → ComponentObjectHandler
│   │                     → ComponentObjectsHandler → OrbitComponent (Task, save, requestNavigation)
│   └── <nom>/          ← 6 blox custom Lit §7 (building-map, energy-chart, anomaly-list,
│                         ticket-board, ticket-detail, user-admin) + logic.js pur par composant
├── tests/              ← conformité spec + composants (node --test + happy-dom, sibStore mocké)
└── dist/               ← build Vite (servi par caddy à https://<pod>/app/)
```

## Lancer en local avec le back FAP-light

**1. Back** (stack 1 VM : postgres + ORCE + caddy + Keycloak) :

```sh
cd ../fap-light-serveur
cp .env.example .env        # éditer les secrets si besoin (FAP_DOMAIN=localhost par défaut)
./scripts/deploy.sh         # build + up + attente santé
# → LDP/JSON-LD : https://app.localhost/ (caddy :443, certificat auto-signé en local :
#   l'accepter dans le navigateur) ; Keycloak : https://app.localhost/auth/realms/fap-light
#   (console admin : http://localhost:8080) ; ORCE : http://localhost:1880
```

**2. Front** :

```sh
cd ../app-supervision
cp .env.example .env        # POD_URL=https://app.localhost, OIDC_ISSUER=.../auth/realms/fap-light
npm ci
npm run dev                 # → http://localhost:5173 (proxy Vite same-origin vers le back)
```

En dev, `vite.config.ts` proxage `/tickets`, `/buildings`, `/users`, `/gold`,
`/app/query` et `/auth` vers `POD_URL` (pas de CORS). En production, pas de proxy :
le build est servi en same-origin par caddy à `https://<pod>/app/` :

```sh
POD_URL=https://<pod> OIDC_ISSUER=https://<pod>/auth/realms/fap-light npm run build
# copier dist/ sur le serveur, route caddy /app/* → statique (spec front §13.6)
```

## Authentification OIDC

Login via `@inrupt/solid-client-authn-browser` (login direct avec `clientId` statique
`fap-light-ui` — Keycloak ne supporte pas le dynamic registration, décision D-7) :
- pas de session au chargement → redirect automatique vers
  `https://app.localhost/auth/realms/fap-light/protocol/openid-connect/auth` ;
- 401 du LDP → purge du cache sibStore + re-login ;
- `fetch` authentifié (DPoP) injecté dans `window.sibStore.fetchAuthn` (§13.7).
`<sib-auth>` sert à la restauration de session et à l'affichage du webId.
Note : `overrides` npm épinglent `@inrupt/oidc-client-ext`/`solid-client-authn-core`
à 1.11.2 (aligné sur `@inrupt/solid-client-authn-browser@1.11.2`, sinon
`removeOidcQueryParam is not a function`).

## Fixtures de démo

Si le back ne répond pas (LDP 404/500, réseau coupé), le front retombe sur des
**données exemple** (`src/lib/fixtures.js`) : 4 bâtiments géolocalisés (Lyon), 4 tickets
tous statuts, 4 anomalies, commentaires, utilisateurs, et séries horaires synthétiques
pour le proxy `/app/query`. Dès que le back répond, les vraies données repassent devant.
Désactivable : `VITE_FIXTURES=0` dans `.env`. Les mutations (POST/PATCH/DELETE) restent
en mémoire de session.

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
