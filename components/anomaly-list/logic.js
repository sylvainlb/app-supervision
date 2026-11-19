// Logique pure anomaly-list — spec front §7.4.

export function filterAnomalies(anomalies, { building, severity, type, from, to } = {}) {
  return (anomalies ?? [])
    .filter((a) => !building || a.meter_id === building || a.building === building)
    .filter((a) => !severity || a.severity === severity)
    .filter((a) => !type || a.type === type)
    .filter((a) => !from || (a.ts ?? '') >= from)
    .filter((a) => !to || (a.ts ?? '') <= to)
    .sort((a, b) => (b.ts ?? '').localeCompare(a.ts ?? '')); // tri date décroissante
}

// Pré-remplissage du formulaire ticket (§7.4 : titre + anomaly_ref).
export function ticketPrefill(anomaly) {
  return {
    'tickets:title': `Anomalie ${anomaly.type ?? ''} — ${anomaly.meter_id ?? ''} (${anomaly.ts ?? ''})`,
    'tickets:anomaly_ref': anomaly['@id'],
  };
}
