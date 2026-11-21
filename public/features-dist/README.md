# features-dist/ — bundles des features distantes (v2, « tout par le CDN »)

Deux familles de bundles cohabitent ici (servis en same-origin `/features-dist/<slug>.js` en dev) :

- **Features de base** de l'app (`dashboard`, `building-detail`, `anomalies`, `tickets`,
  `interventions`, `admin`) : buildées par `npm run build:features`
  (`scripts/build-features.mjs`) → bundles + **`manifest.json` (manifeste des features de
  base, avec sri)** + seed `app-supervision-backend/sql/131_base_features_v2.sql`.
- **Lots métier** (`@facis/app-features`, 12 slugs) : buildés par
  `app-features/scripts/build.mjs` → `app-features/dist/`. Pour les servir en dev, copier
  **uniquement les bundles** :

  ```bash
  cp ../app-features/dist/*.js public/features-dist/
  # NE PAS copier app-features/dist/manifest.json ici : il écraserait le manifeste des
  # features de base (build-features.mjs le régénère ; le sri lu à l'exécution vient du
  # catalogue LDP /features/<slug>, pas de ce fichier).
  ```

En prod, `cdn_url` pointe vers le CDN jsDelivr du package publié (même binaire → même sri).
