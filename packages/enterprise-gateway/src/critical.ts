import { createHash } from 'node:crypto';
import type { CriticalFacts, Policy } from '@zk-mcp/sdk';
import { FixtureConnectors } from './connectors.js';

/** Illustrative operator policy; never accepted as tool arguments. */
export const CRITICAL_POLICY: Policy = {
  min_reviewers: 3,
  critical: { max_evidence_age_ms: 60_000, max_canary_error_rate_ppm: 500,
    max_canary_p99_latency_ms: 250, min_canary_duration_ms: 600_000, max_canary_traffic_percent: 5 },
};

export function criticalFixture(now: () => number = Date.now): FixtureConnectors {
  const connectors = new FixtureConnectors(now);
  const at = now();
  const critical: CriticalFacts = {
    emergency_stop: false, requester_id: 10, security_approver_id: 20,
    operations_approver_id: 30, service_owner_approver_id: 40, approvers_mfa_verified: true,
    approvals_expires_at_ms: at + 900_000,
    approved_revision: [...createHash('sha256').update(connectors.headSha).digest()],
    evidence_observed_at_ms: at, change_window_start_ms: at - 60_000, change_window_end_ms: at + 900_000,
    artifact_signature_verified: true, sbom_verified: true, provenance_verified: true,
    vulnerability_scan_complete: true, high_vulnerabilities: 0, secrets_detected: 0,
    backup_restore_tested: true, rollback_tested: true, canary_duration_ms: 600_000,
    canary_traffic_percent: 5, canary_error_rate_ppm: 100, canary_p99_latency_ms: 120,
    active_sev1_incidents: 0, dependencies_healthy: true, policy_override_requested: false,
  };
  connectors.facts = { ...connectors.facts, approvals: 3, critical };
  return connectors;
}

export const CRITICAL_ATTACKS: ReadonlyArray<{ name: string; change: (facts: CriticalFacts) => void }> = [
  { name: 'Arrêt d’urgence actif', change: f => { f.emergency_stop = true; } },
  { name: 'Auto-approbation du demandeur', change: f => { f.security_approver_id = f.requester_id; } },
  { name: 'Même personne dans deux rôles', change: f => { f.service_owner_approver_id = f.operations_approver_id; } },
  { name: 'MFA non vérifiée', change: f => { f.approvers_mfa_verified = false; } },
  { name: 'Approbations expirées', change: f => { f.approvals_expires_at_ms = 1; } },
  { name: 'Commit substitué', change: f => { f.approved_revision = Array<number>(32).fill(0); } },
  { name: 'Observations périmées', change: f => { f.evidence_observed_at_ms = 1; } },
  { name: 'Fenêtre de changement fermée', change: f => { f.change_window_end_ms = 1; } },
  { name: 'Signature artefact absente', change: f => { f.artifact_signature_verified = false; } },
  { name: 'SBOM non vérifiée', change: f => { f.sbom_verified = false; } },
  { name: 'Provenance non vérifiée', change: f => { f.provenance_verified = false; } },
  { name: 'Scan de sécurité incomplet', change: f => { f.vulnerability_scan_complete = false; } },
  { name: 'Vulnérabilité élevée présente', change: f => { f.high_vulnerabilities = 1; } },
  { name: 'Secret détecté', change: f => { f.secrets_detected = 1; } },
  { name: 'Restauration de sauvegarde non testée', change: f => { f.backup_restore_tested = false; } },
  { name: 'Rollback non testé', change: f => { f.rollback_tested = false; } },
  { name: 'Canary trop court', change: f => { f.canary_duration_ms = 599_999; } },
  { name: 'Canary trop largement déployé', change: f => { f.canary_traffic_percent = 6; } },
  { name: 'Taux d’erreur excessif', change: f => { f.canary_error_rate_ppm = 501; } },
  { name: 'Latence excessive', change: f => { f.canary_p99_latency_ms = 251; } },
  { name: 'Incident majeur actif', change: f => { f.active_sev1_incidents = 1; } },
  { name: 'Dépendance indisponible', change: f => { f.dependencies_healthy = false; } },
  { name: 'Contournement manuel demandé', change: f => { f.policy_override_requested = true; } },
];
