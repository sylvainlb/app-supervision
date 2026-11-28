# app-supervision — Energy supervision application

This repository is the **front-end** of the energy supervision application — the highest
layer and the **user entry point**. This README explains how to install and run **all
layers** of the stack.

Implementation of `spec/supervision-energetique-front-technique.md` (Startin'blox stack:
Orbit shell, sibStore, Store blox as CDN ES modules, custom Lit components, sib-auth/OIDC).

## Stack (top to bottom)

```
app-supervision (this repo)     ← front — USER entry point
   │ consumes: root LDP, POST /app/query, OIDC (/auth/*)
   │ file: deps (sibling repos, required): app-model-editor (@facis/app-model-editor),
   │   app-ui-editor (@facis/app-ui-editor), app-store (@facis/app-store)
   ▼
app-supervision-backend         ← deployable assembly — DEPLOYMENT entry point
   │   (scripts/start.sh starts the whole docker infra)
   ├── fap-ldp                  ← LDP extension: app.* domain, JSON-LD endpoint, ACL/PDP
   │     (+ ext/model-injection E11, ext/shacl contracts)
   └── fap-light-serveur        ← core: bronze/silver/gold PostgreSQL + ORCE + caddy + IdP (1 VM)
app-store + app-features        ← activatable features, plugged into the front
app-ai-component-editor         ← AI component editor (standalone)
spec/                           ← specifications (documentation, read first; not a git repo)
```

**Dependency rule: front → back → fap.** No front file is served by the back: in dev,
`http://app.localhost/` is a caddy proxy to the host's Vite server; in prod, `dist/` is
deployed on a separate origin (declared in the back's `FRONT_ORIGINS`).

## Prerequisites

- **Docker + docker compose plugin** (for the back)
- **Node.js ≥ 20 + npm** (for the front; tested with Node v20)

## Install and run all layers

### 1. Clone the repositories

```sh
git clone git@github.com:sylvainlb/app-supervision.git          # this repo (front)
git clone git@github.com:sylvainlb/app-supervision-backend.git  # deployable assembly
git clone git@github.com:sylvainlb/fap-light-serveur.git        # FAP-light core
git clone git@github.com:sylvainlb/fap-ldp.git                   # LDP extension
# REQUIRED siblings of the front (file: dependencies in package.json — npm ci fails without them):
git clone git@github.com:sylvainlb/app-model-editor.git         # @facis/app-model-editor (model registry/editor, routes /model-registry, /model-editor)
git clone git@github.com:sylvainlb/app-ui-editor.git            # @facis/app-ui-editor (WYSIWYG component editor)
# Optional (v2 features + AI component editor):
git clone git@github.com:sylvainlb/app-store.git                 # @facis/app-store (feature mechanism)
git clone git@github.com:sylvainlb/app-features.git              # business components
git clone git@github.com:sylvainlb/app-ai-component-editor.git   # AI component editor (standalone)
# + the spec/ directory (specifications) provided with the sources, next to the repos
#   (spec/ is intentionally NOT a git repository — it ships with the sources)
```

> The first 6 repositories (front, back, core, LDP ext, model-editor, ui-editor) are enough
> to run the application. `app-store` / `app-features` / `app-ai-component-editor` are only
> used for loadable v2 features and the AI component editor (the front already embeds
> the `<app-store>` / `<app-menu>` mechanism as vendored).

### 2. Read the spec

`../spec/facis-fap-architecture-synthese.md` (global architecture), then
`../spec/supervision-energetique-spec-fonctionnelle.md` (business use cases).

### 3. Build the custom Docker images of the core (once)

The back stack references two **local** images (absent from registries); their
Dockerfiles are in `fap-light-serveur`:

```sh
cd fap-light-serveur
docker build -t fap-light-postgres:latest ./deploy/postgres   # PostgreSQL 16 + pg_cron
docker build -t fap-light-orce:latest     ./deploy/orce       # ORCE (Node-RED) + runtime modules
```

### 4. Start the back (all infra)

```sh
cd app-supervision-backend
cp .env.example .env     # secrets are auto-generated on first launch; edit if needed
./scripts/start.sh       # idempotent; --reset to start from scratch
# → LDP/JSON-LD: http://localhost/  ·  Keycloak IdP: http://localhost/auth/realms/fap-light
# → ORCE editor: http://localhost/editor/  ·  dev accounts: alice / bob / admin (password "dev")
```

### 5. Run the front

```sh
cd app-supervision
npm ci
npm run dev              # first launch: auto-configures to http://localhost (POD_URL)
```

→ open **http://app.localhost/** (the back's caddy proxies to this Vite server).

### 6. (Optional) Enable features

`app-store` (`<app-store>` / `<app-menu>` mechanism + SQL model on the FAP-LDP side) and
`app-features` (12 business components) integrate into this front — see their READMEs.

**Good news: no build needed to run the features.** The bundles are already versioned in
this repo (`public/features-dist/`, 22 files + `manifest.json` with SRI), the
`app.features` catalogue is seeded at back boot
(`app-supervision-backend/sql/130_app_store_catalogue_v2.sql`, `cdn_url` set to
`/features-dist/<slug>.js` same-origin in dev), and `<dynamic-feature>` loads each
feature on the fly (SRI check before import). The `app-features` repo is only useful if you
**modify** a feature: `app-features/scripts/build.mjs` then
`app-supervision/scripts/build-features.mjs` regenerate the bundles.

**Current delivery mode: 100% same-origin, no external CDN.** Two families:

- **Base features** (dashboard, anomalies, tickets, interventions, building-detail,
  store, admin): components **packaged in the app** (`components/`, declared in
  `orbit.json`, static import in the Vite bundle).
- **12 v2 business features** (`alert-rules`, `sla-dashboard`, …): bundles
  `public/features-dist/<slug>.js` served by **this front itself** — the seed sets
  **relative** `cdn_url` values (`/features-dist/<slug>.js`, generated by
  `scripts/build-features.mjs`), loaded on the fly via `import()` with SRI check
  (`components/shared/loader.js`).

**The jsDelivr CDN is only planned for prod** (package `@facis/app-features` published on
npm: `cdn_url` = `https://cdn.jsdelivr.net/npm/@facis/app-features@<version>/dist/<slug>.js`).
As long as the seeded catalogue contains relative URLs, no external call is made —
even in prod.

### 7. Model registry & model editor (`@facis/app-model-editor`)

Once the back is up and you are logged in, open:

- **http://app.localhost/model-registry** — public registry: the object types your apps can
  manipulate (published LDP containers: `buildings`, `tickets`, …), one fiche per model,
  « Edit model », test zone, publish;
- **http://app.localhost/model-editor** — same gallery + the admin « model sources » section.

The component is embedded from the sibling repo `app-model-editor` (`file:` dependency,
served from its `src/`, no build). Spec: `../spec/app-shape-editor.md` (rev 4.x, journal
4.13–4.29) and `../spec/model-injection-spec.md` (E11 injection channel, annexe A). Server
side: `fap-ldp/ext/shacl` (contracts, `GET /shapes/`) and `fap-ldp/ext/model-injection`
(E11, `POST /admin/apps`, admin role only — dev account `admin`/`dev`).

### 8. Tests

Every repository has a node test suite, no services needed:

```sh
# in each repo:
node --test tck/    # or: node --test tests/   (app-supervision)
```

---


## Structure (spec §4)

```
├── orbit.json          ← Orbit config: routes §8, components §6, oidc §13.6, pinned npm
├── src/
│   ├── index.ts        ← Orbit bootstrap + fetchAuthn injection (sib-auth) into sibStore §13.7
│   ├── config.js       ← env: POD_URL, OIDC_ISSUER, OIDC_CLIENT_ID (Node fallback for tests)
│   └── lib/            ← pure tested logic (HTTP contract, transitions, gold, ETag, context)
├── components/
│   ├── boilerplate/    ← vendored hierarchy §6.2: LitElement → ComponentObjectHandler
│   │                     → ComponentObjectsHandler → OrbitComponent (Task, save, requestNavigation)
│   └── <name>/          ← 6 custom Lit blox §7 (building-map, energy-chart, anomaly-list,
│                         ticket-board, ticket-detail, user-admin) + pure logic.js per component
├── tests/              ← spec conformance + components (node --test + happy-dom, mocked sibStore)
└── dist/               ← Vite build (prod: deployed on the front origin FRONT_ORIGINS of the back)
```

## Run locally with the FAP-light back

**1. Back** (1 VM stack: postgres + ORCE + caddy + Keycloak) — see `../app-supervision-backend`:

```sh
cd ../app-supervision-backend
./scripts/start.sh          # starts the back (idempotent)
# → LDP/JSON-LD: http://localhost/ (dev = plain HTTP); Keycloak (IdP):
#   http://localhost/auth/realms/fap-light; ORCE/editor: http://localhost/editor/
```

**2. Front** (SELF-CONTAINED from the back: no client file is served by the backend):

```sh
cd ../app-supervision
npm ci
npm run dev                 # → http://app.localhost/  (port 80: the back's caddy proxies app.localhost → this vite server)
#   auto-configure on first launch: ./scripts/configure.sh http://localhost
#   (POD_URL = the BACK; OIDC_ISSUER = http://localhost/auth/realms/fap-light)
```

The client has **no vite proxy** to the back: all calls go absolute to
`POD_URL` (cross-origin from `http://app.localhost/`) — CORS is handled by the back
(origin declared in the backend's `FRONT_ORIGINS`) and `/auth` by Keycloak (`webOrigins`).
A vite proxy would break DPoP (`DPoP HTTP URL mismatch`).
In production: `./scripts/configure.sh https://fap.example.com && npm run build`,
then deploy `dist/` on the origin declared in `FRONT_ORIGINS` (e.g. `https://app.fap.example.com`).

## OIDC authentication

A single `Session` from `@inrupt/solid-client-authn-browser` (direct login with static
`clientId` `fap-light-ui` — Keycloak does no dynamic registration, D-7; `<sib-auth>`
is not used because it embeds the same lib twice and both fight over the code):

- no session on load → automatic redirect to
  `${OIDC_ISSUER}/protocol/openid-connect/auth` (`http://localhost/auth/realms/fap-light/...` in dev);
- the `offline_access` scope (hard-coded in oidc-client-ext) is removed from the
  authorization URL via `handleRedirect` — Keycloak 26.4 rejects it for this client (`not_allowed`);
- `tokenType: 'Bearer'`: FAP-LDP validates tokens via userinfo in Bearer
  (`fap-ldp/core/nodes/nodes/ldp-container.js`) → a DPoP-bound token (cnf) would be rejected;
- 401 from the LDP → cache purge + re-login;
- `session.fetch` injected into `window.sibStore.fetchAuthn` (§13.7, single injection point),
  with relative URLs rewritten to absolute against `POD_URL` and fixtures fallback (`VITE_FIXTURES`).

Data reads: `getJson(url)` (components/boilerplate) = `fetchAuthn` + raw JSON.
`sibStore.getData()` returns `CustomGetter` proxies (fields readable only via
`await proxy.get(path)`) — unusable for our custom blox, hence raw JSON.
LDP containers only list `@id`s, so `resolveMembers()` resolves each member.
Fields are read by local name via `field(obj, 'lat')` (the back prefixes by table:
`app_buildings:lat`, `app_tickets:status`, `gold_anomaly_candidates:severity`…).
Writes (POST/PATCH) use non-prefixed keys — the server maps by local name (@vocab).

## Gold data

- Published in LDP containers (`/gold/anomaly_candidates/`, …) → direct LDP read.
- Voluminous (hourly) → server-side signed proxy `POST /app/query`, body
  `{agreement, assetId, from, to}` with `assetId` = DSP catalogue id
  (`dataset:facis:net-grid-hourly`) and `agreement:internal:framework-contract`.
  Never any HMAC in the browser (§13.1). Response `{columns, rows[]}` with positional rows.

## Local dev (plain HTTP)

Back on `http://localhost` (:80, ENV=dev) — Keycloak served under `/auth`
(`--http-relative-path /auth`, caddy does not strip it, `KC_PROXY_HEADERS=xforwarded`
for DPoP htu validation). Front: `npm run dev` → `http://localhost:5173/`,
`.env`: `POD_URL=http://localhost`, `OIDC_ISSUER=http://localhost/auth/realms/fap-light`.
Keycloak accounts: alice / bob / admin (password `dev`).
Note: npm `overrides` pin `@inrupt/oidc-client-ext`/`solid-client-authn-core`
to 1.11.2 (aligned with `@inrupt/solid-client-authn-browser@1.11.2`, otherwise
`removeOidcQueryParam is not a function`).

## Demo data on deployment

A from-scratch deployment **already has data** — three sources:

1. **Back seed SQL** (loaded automatically at boot by
   `app-supervision-backend/scripts/deploy-local.sh`):
   `app-supervision-backend/sql/101_seed_demo.sql` inserts the application accounts
   (webid = Keycloak claims: alice / bob / admin), a **demo building portfolio**
   (with `meter_id`, geolocated), **tickets** and **comments**.
   → visible from the first login in the UI.
2. **Sensor simulation** (FAP-light core, tick every 60 s): feeds
   bronze → silver → gold (including `gold.anomaly_candidates` and the hourly aggregates
   consumed via `POST /app/query`). The **hourly series fill up progressively**
   after boot (not instantly).
3. **Front fixtures** (fallback only): if the back does not answer (LDP 404/500,
   network down), the front falls back to **sample data** (`src/lib/fixtures.js`):
   4 geolocated buildings (Lyon), 4 tickets in all statuses, 4 anomalies, comments,
   users, and synthetic hourly series for the `/app/query` proxy.
   As soon as the back answers, real data takes over again.
   Can be disabled: `VITE_FIXTURES=0` in `.env`. Mutations (POST/PATCH/DELETE)
   remain in session memory.

## Conformance tests

```sh
npm test          # = node --test tests/
```

The suite validates spec conformance: structure §4, routes/Orbit §8+§13.6, FAP-LDP
HTTP contract §2/§10 (401/403/404/412/304/429, dspace:Error), transition matrix §13.5,
gold LDP/proxy mapping §13.3 + proxy contract C1.9, ETag §2/§5, @context §13.2, the
absolute rule §13.1 (no HMAC secret nor /dsp/data call in the browser), the pure logic of
each component (map states, filters, grouping, windows, validation) and the Lit components
themselves under happy-dom (rendering, requestNavigation, PATCH merge-patch, 412, save→refresh).

## Note

Spec point O-3: to be confirmed under real conditions that `fetchAuthn` is indeed the single
injection point of `@startinblox/oidc@0.16.6` into sibStore (`@startinblox/core@2.0.6`).
The Cypress component/e2e tests CA-1..CA-5 of spec §11 remain to be written on the FAP-LDP TCK side.
