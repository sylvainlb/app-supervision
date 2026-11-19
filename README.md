# app-supervision

Front-end de l'application de supervision énergétique — implémentation de
`spec/supervision-energetique-front-technique.md` (stack Startin'blox : shell Orbit,
sibStore, blox du Store en ES modules CDN, composants custom Lit, sib-auth/OIDC).

## Structure (spec §4)

```
├── orbit.json          ← config Orbit : routes §8, composants §6, oidc §13.6, npm épinglé
├── src/
│   ├── index.ts        ← bootstrap, orbit-ready
│   ├── config.ts       ← env : POD_URL, OIDC_ISSUER, OIDC_CLIENT_ID
│   └── lib/            ← logique pure testée (contrat HTTP, transitions, gold, ETag, context)
├── components/         ← 6 blox custom §6.2 (building-map, energy-chart, anomaly-list,
│                         ticket-board, ticket-detail, user-admin)
├── tests/              ← tests de conformité à la spec (node --test, zéro dépendance)
└── dist/               ← build Vite (servi par caddy à https://<pod>/app/)
```

## Tests de conformité

```sh
npm test          # = node --test tests/
```

La suite valide la conformité à la spec : structure §4, routes/Orbit §8+§13.6, contrat
HTTP FAP-LDP §2/§10 (401/403/404/412/304/429, dspace:Error), matrice de transitions §13.5,
mapping gold LDP/proxy §13.3 + contrat proxy C1.9, ETag §2/§5, @context §13.2, et la règle
absolue §13.1 (aucun secret HMAC ni appel /dsp/data côté navigateur).

## Note

Les versions dans `orbit.json` / `package.json` sont des épingles exactes à régler sur les
versions publiées réelles de `@startinblox/*`, `lit`, `chart.js` au premier build (§13.6,
point O-3 de la spec : confirmer `fetchAuthn` contre la version épinglée de `@startinblox/oidc`).
