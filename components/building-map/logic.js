// Pure building-map logic — front spec §7.2.
// State per building: green = OK, orange = open anomaly, red = high severity.
// An anomaly linked to a CLOSED ticket (via anomaly_ref) is no longer active.
// Fields read by local name (field): the back prefixes by table (app_buildings:lat…).
import { field } from '../../src/lib/context.js';

export const STATE = { OK: 'ok', ANOMALY: 'anomaly', HIGH: 'high' };
const HIGH_SEVERITIES = ['HIGH', 'CRITICAL'];

export function anomalySeverity(a) {
  return String(field(a, 'severity') ?? '').toUpperCase();
}

export function isAnomalyActive(anomaly, tickets = []) {
  const ref = anomaly?.['@id'];
  return !tickets.some((t) => field(t, 'status') === 'CLOSED' && field(t, 'anomaly_ref') === ref);
}

export function computeBuildingStates(buildings, anomalies, tickets = []) {
  const active = (anomalies ?? []).filter((a) => isAnomalyActive(a, tickets));
  return (buildings ?? [])
    .filter((b) => b != null)
    .map((building) => {
      const meter = field(building, 'meter_id');
      const own = active.filter((a) => field(a, 'meter_id') === meter);
      const state = own.some((a) => HIGH_SEVERITIES.includes(anomalySeverity(a)))
        ? STATE.HIGH
        : own.length > 0
          ? STATE.ANOMALY
          : STATE.OK;
      return { building, state, anomalies: own };
    });
}
