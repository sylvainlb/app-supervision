// Inline SVG icons for the web components (shadow DOM).
// Why not Material Icons (font ligatures): the @font-face loaded in
// index.html does not pierce the shadow root → the icons would be invisible there.
// Material Icons name (the `icon` field of the /features/ catalogue) → SVG paths.
const PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  warning: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  confirmation_number: '<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5z"/><line x1="13" y1="5" x2="13" y2="19" stroke-dasharray="2.5 3"/>',
  admin_panel_settings: '<path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  storefront: '<path d="M4 7 5.5 3h13L20 7"/><path d="M4 7h16v3a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 13a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 10V7z"/><path d="M5 13v8h14v-8"/><path d="M9 21v-5h6v5"/>',
  extension: '<path d="M10 3h4v4a2 2 0 1 0 4 0h3v4h-4a2 2 0 1 0 0 4h4v4h-4a2 2 0 1 0-4 0h-3v-4H7a2 2 0 1 1 0-4h3V3z" transform="scale(0.92) translate(1,1)"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
  assignment: '<rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>',
  insights: '<line x1="4" y1="20" x2="20" y2="20"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="11" y1="20" x2="11" y2="9"/><line x1="16" y1="20" x2="16" y2="15"/><path d="M5 8l4-4 3.5 3L18 2"/>',
  bar_chart: '<line x1="3" y1="20" x2="21" y2="20"/><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="15"/>',
  description: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>',
  gavel: '<path d="m13 12-7.8 7.8a2.12 2.12 0 0 1-3-3L10 9"/><path d="m15 15 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
  location_city: '<path d="M3 21h18"/><path d="M5 21V8l5-3v16"/><path d="M10 21V11l6-2v12"/><path d="M16 21V9l4 2v10"/><line x1="7.5" y1="10" x2="7.5" y2="10.01"/><line x1="7.5" y1="14" x2="7.5" y2="14.01"/><line x1="13" y1="13" x2="13" y2="13.01"/><line x1="13" y1="17" x2="13" y2="17.01"/>',
  notifications_active: '<path d="M18 9a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/><path d="M12 3v1"/><path d="M20.5 6.5a9 9 0 0 1 0 5"/><path d="M3.5 6.5a9 9 0 0 0 0 5"/>',
  partly_cloudy_day: '<circle cx="7" cy="7" r="2.6"/><line x1="7" y1="1.5" x2="7" y2="3"/><line x1="1.5" y1="7" x2="3" y2="7"/><line x1="3.3" y1="3.3" x2="4.4" y2="4.4"/><line x1="10.7" y1="3.3" x2="9.6" y2="4.4"/><path d="M13.5 20a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 23 13.5 3.75 3.75 0 0 1 21.5 20z"/>',
  savings: '<path d="M4.5 12a7.5 7.5 0 0 1 15 0v4a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/><path d="M12 4.5V8"/><path d="M16.5 10.5H19a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2.5"/><circle cx="9" cy="13" r=".6"/><path d="M9 21v-1.5M15 21v-1.5"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="5.5" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><line x1="8.3" y1="10.8" x2="15.7" y2="6.7"/><line x1="8.3" y1="13.2" x2="15.7" y2="17.3"/>',
  smart_toy: '<rect x="5" y="8.5" width="14" height="10.5" rx="2.5"/><circle cx="9.5" cy="13.5" r="1"/><circle cx="14.5" cy="13.5" r="1"/><path d="M12 8.5V5"/><circle cx="12" cy="3.8" r="1.2"/><path d="M9 17h6"/>',
  solar_power: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="21.5" y2="12"/><line x1="5.3" y1="5.3" x2="7.4" y2="7.4"/><line x1="16.6" y1="16.6" x2="18.7" y2="18.7"/><line x1="5.3" y1="18.7" x2="7.4" y2="16.6"/><line x1="16.6" y1="7.4" x2="18.7" y2="5.3"/>',
  timer: '<line x1="10" y1="2.5" x2="14" y2="2.5"/><line x1="12" y1="2.5" x2="12" y2="5.5"/><circle cx="12" cy="13.5" r="7.5"/><line x1="12" y1="13.5" x2="12" y2="9.5"/><line x1="12" y1="13.5" x2="14.5" y2="15"/>',
  trending_down: '<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>',
};

// Returns an inline <svg> (stroke currentColor). `name` = catalogue icon
// (Material Icons slug); fallback puzzle `extension`.
export function iconSvg(name) {
  const p = PATHS[name] ?? PATHS.extension;
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
