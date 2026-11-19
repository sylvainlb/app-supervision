// Logique pure building-map — spec front §7.2.
// État par bâtiment : vert = OK, orange = anomalie ouverte, rouge = sévérité haute.
// Une anomalie liée à un ticket CLOSED (via tickets:anomaly_ref) n'est plus active.

export const STATE = { OK: 'ok', ANOMALY: 'anomaly', HIGH: 'high' };
const HIGH_SEVERITIES = ['HIGH', 'CRITICAL'];

export function isAnomalyActive(anomaly, tickets = []) {
  const ref = anomaly?.['@id'];
  return !tickets.some((t) => t['tickets:status'] === 'CLOSED' && t['tickets:anomaly_ref'] === ref);
}

export function computeBuildingStates(buildings, anomalies, tickets = []) {
  const active = (anomalies ?? []).filter((a) => isAnomalyActive(a, tickets));
  return (buildings ?? []).map((building) => {
    const own = active.filter((a) => a.meter_id === building.meter_id);
    const state = own.some((a) => HIGH_SEVERITIES.includes(a.severity))
      ? STATE.HIGH
      : own.length > 0
        ? STATE.ANOMALY
        : STATE.OK;
    return { building, state, anomalies: own };
  });
}
