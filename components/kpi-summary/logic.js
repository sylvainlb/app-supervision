// Pure kpi-summary logic — dashboard aggregates.
import { field } from '../../src/lib/context.js';
import { isAnomalyActive, anomalySeverity } from '../building-map/logic.js';

export function computeKpis(buildings = [], anomalies = [], tickets = []) {
  const active = (anomalies ?? []).filter((a) => a != null && isAnomalyActive(a, tickets));
  const critical = active.filter((a) => ['HIGH', 'CRITICAL'].includes(anomalySeverity(a))).length;
  const openTickets = (tickets ?? []).filter((t) => t != null && ['OPEN', 'IN_PROGRESS'].includes(field(t, 'status'))).length;
  return {
    buildings: (buildings ?? []).filter((b) => b != null).length,
    anomaliesActive: active.length,
    anomaliesCritical: critical,
    ticketsOpen: openTickets,
  };
}
