// Pure anomaly-list logic — front spec §7.4.
// Fields read by local name (field): gold_anomaly_candidates:severity, event_timestamp…
import { field } from '../../src/lib/context.js';

export function anomalyTs(a) {
  return String(field(a, 'event_timestamp') ?? field(a, 'ts') ?? '');
}

export function filterAnomalies(anomalies, { building, severity, type, from, to } = {}) {
  const sev = severity ? String(severity).toUpperCase() : null;
  return (anomalies ?? [])
    .filter((a) => a != null)
    .filter((a) => !building || field(a, 'meter_id') === building || field(a, 'building') === building || field(a, 'site_id') === building)
    .filter((a) => !sev || String(field(a, 'severity') ?? '').toUpperCase() === sev)
    .filter((a) => !type || field(a, 'type') === type)
    .filter((a) => !from || anomalyTs(a) >= from)
    .filter((a) => !to || anomalyTs(a) <= to)
    .sort((a, b) => anomalyTs(b).localeCompare(anomalyTs(a))); // date descending
}

// Ticket form prefill (§7.4: title + anomaly_ref).
export function ticketPrefill(anomaly) {
  const ts = anomalyTs(anomaly);
  return {
    title: `Anomaly ${field(anomaly, 'type') ?? ''} — ${field(anomaly, 'meter_id') ?? ''} (${ts})`.replace(/\s+/g, ' ').trim(),
    anomaly_ref: anomaly['@id'],
    description: `z=${field(anomaly, 'z_score') ?? ''} sev=${field(anomaly, 'severity') ?? ''} ts=${ts}`,
  };
}
