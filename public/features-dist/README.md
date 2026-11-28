# features-dist/ — distant feature bundles (v2, "everything via the CDN")

Two families of bundles coexist here (served same-origin as `/features-dist/<slug>.js` in dev):

- **Base features** of the app (`dashboard`, `building-detail`, `anomalies`, `tickets`,
  `interventions`, `admin`): built by `npm run build:features`
  (`scripts/build-features.mjs`) → bundles + **`manifest.json` (manifest of the base
  features, with sri)** + seed `app-supervision-backend/sql/131_base_features_v2.sql`.
- **Business packs** (`@facis/app-features`, 12 slugs): built by
  `app-features/scripts/build.mjs` → `app-features/dist/`. To serve them in dev, copy
  **only the bundles**:

  ```bash
  cp ../app-features/dist/*.js public/features-dist/
  # DO NOT copy app-features/dist/manifest.json here: it would overwrite the manifest of
  # the base features (build-features.mjs regenerates it; the sri read at runtime comes from
  # the LDP catalogue /features/<slug>, not from this file).
  ```

In prod, `cdn_url` points to the jsDelivr CDN of the published package (same binary → same sri).
