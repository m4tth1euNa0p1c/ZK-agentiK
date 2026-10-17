//! Critical-platform change control. Thresholds are examples, not a certification.
use serde::{Deserialize, Serialize};

pub const EMERGENCY_STOP: u32 = 1;
pub const INVALID_POLICY: u32 = 2;
pub const SEPARATION_OF_DUTIES: u32 = 4;
pub const APPROVAL_EXPIRED: u32 = 8;
pub const OUTSIDE_CHANGE_WINDOW: u32 = 16;
pub const STALE_EVIDENCE: u32 = 32;
pub const REVISION_MISMATCH: u32 = 64;
pub const ARTIFACT_UNTRUSTED: u32 = 128;
pub const SECURITY_FINDINGS: u32 = 256;
pub const RECOVERY_UNPROVEN: u32 = 512;
pub const CANARY_FAILED: u32 = 1024;
pub const ACTIVE_INCIDENT: u32 = 2048;
pub const OVERRIDE_REQUESTED: u32 = 4096;
pub const DEPENDENCY_UNHEALTHY: u32 = 8192;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CriticalPolicy {
    pub max_evidence_age_ms: u64,
    pub max_canary_error_rate_ppm: u32,
    pub max_canary_p99_latency_ms: u32,
    pub min_canary_duration_ms: u64,
    pub max_canary_traffic_percent: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CriticalFacts {
    pub emergency_stop: bool,
    pub requester_id: u32,
    pub security_approver_id: u32,
    pub operations_approver_id: u32,
    pub service_owner_approver_id: u32,
    pub approvers_mfa_verified: bool,
    pub approvals_expires_at_ms: u64,
    pub approved_revision: [u8; 32],
    pub evidence_observed_at_ms: u64,
    pub change_window_start_ms: u64,
    pub change_window_end_ms: u64,
    pub artifact_signature_verified: bool,
    pub sbom_verified: bool,
    pub provenance_verified: bool,
    pub vulnerability_scan_complete: bool,
    pub high_vulnerabilities: u32,
    pub secrets_detected: u32,
    pub backup_restore_tested: bool,
    pub rollback_tested: bool,
    pub canary_duration_ms: u64,
    pub canary_traffic_percent: u32,
    pub canary_error_rate_ppm: u32,
    pub canary_p99_latency_ms: u32,
    pub active_sev1_incidents: u32,
    pub dependencies_healthy: bool,
    pub policy_override_requested: bool,
}

/// Public context must come from the bound statement, never from private facts.
pub struct ExecutionContext {
    pub at_ms: u64,
    pub revision: [u8; 32],
}

/// Returns all violated controls; no fail-open, override or weighted risk score.
pub fn evaluate(f: &CriticalFacts, p: &CriticalPolicy, context: &ExecutionContext) -> u32 {
    let mut mask = 0;
    if f.emergency_stop {
        mask |= EMERGENCY_STOP;
    }
    if p.max_evidence_age_ms == 0
        || p.max_evidence_age_ms > 300_000
        || p.max_canary_error_rate_ppm > 1_000
        || p.max_canary_p99_latency_ms == 0
        || p.max_canary_p99_latency_ms > 1_000
        || p.min_canary_duration_ms < 600_000
        || p.min_canary_duration_ms > 86_400_000
        || p.max_canary_traffic_percent == 0
        || p.max_canary_traffic_percent > 10
    {
        mask |= INVALID_POLICY;
    }
    let ids = [
        f.requester_id,
        f.security_approver_id,
        f.operations_approver_id,
        f.service_owner_approver_id,
    ];
    if !f.approvers_mfa_verified
        || ids.contains(&0)
        || ids
            .iter()
            .enumerate()
            .any(|(i, id)| ids[i + 1..].contains(id))
    {
        mask |= SEPARATION_OF_DUTIES;
    }
    if context.at_ms >= f.approvals_expires_at_ms {
        mask |= APPROVAL_EXPIRED;
    }
    if f.change_window_end_ms <= f.change_window_start_ms
        || context.at_ms < f.change_window_start_ms
        || context.at_ms >= f.change_window_end_ms
    {
        mask |= OUTSIDE_CHANGE_WINDOW;
    }
    // checked_sub rejects future evidence without unsigned underflow.
    if f.evidence_observed_at_ms == 0
        || context
            .at_ms
            .checked_sub(f.evidence_observed_at_ms)
            .is_none_or(|age| age > p.max_evidence_age_ms)
    {
        mask |= STALE_EVIDENCE;
    }
    if context.revision == [0; 32] || f.approved_revision != context.revision {
        mask |= REVISION_MISMATCH;
    }
    if !f.artifact_signature_verified || !f.sbom_verified || !f.provenance_verified {
        mask |= ARTIFACT_UNTRUSTED;
    }
    if !f.vulnerability_scan_complete || f.high_vulnerabilities != 0 || f.secrets_detected != 0 {
        mask |= SECURITY_FINDINGS;
    }
    if !f.backup_restore_tested || !f.rollback_tested {
        mask |= RECOVERY_UNPROVEN;
    }
    if f.canary_duration_ms < p.min_canary_duration_ms
        || f.canary_traffic_percent == 0
        || f.canary_traffic_percent > p.max_canary_traffic_percent
        || f.canary_error_rate_ppm > p.max_canary_error_rate_ppm
        || f.canary_p99_latency_ms == 0
        || f.canary_p99_latency_ms > p.max_canary_p99_latency_ms
    {
        mask |= CANARY_FAILED;
    }
    if f.active_sev1_incidents != 0 {
        mask |= ACTIVE_INCIDENT;
    }
    if f.policy_override_requested {
        mask |= OVERRIDE_REQUESTED;
    }
    if !f.dependencies_healthy {
        mask |= DEPENDENCY_UNHEALTHY;
    }
    mask
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> (CriticalFacts, CriticalPolicy, ExecutionContext) {
        let p = CriticalPolicy {
            max_evidence_age_ms: 60_000,
            max_canary_error_rate_ppm: 500,
            max_canary_p99_latency_ms: 250,
            min_canary_duration_ms: 600_000,
            max_canary_traffic_percent: 5,
        };
        let f = CriticalFacts {
            emergency_stop: false,
            requester_id: 1,
            security_approver_id: 2,
            operations_approver_id: 3,
            service_owner_approver_id: 4,
            approvers_mfa_verified: true,
            approvals_expires_at_ms: 2_000_000,
            approved_revision: [1; 32],
            evidence_observed_at_ms: 1_000_000,
            change_window_start_ms: 900_000,
            change_window_end_ms: 2_000_000,
            artifact_signature_verified: true,
            sbom_verified: true,
            provenance_verified: true,
            vulnerability_scan_complete: true,
            high_vulnerabilities: 0,
            secrets_detected: 0,
            backup_restore_tested: true,
            rollback_tested: true,
            canary_duration_ms: 600_000,
            canary_traffic_percent: 5,
            canary_error_rate_ppm: 500,
            canary_p99_latency_ms: 250,
            active_sev1_incidents: 0,
            dependencies_healthy: true,
            policy_override_requested: false,
        };
        (
            f,
            p,
            ExecutionContext {
                at_ms: 1_000_000,
                revision: [1; 32],
            },
        )
    }
    #[test]
    fn allows_only_with_all_required_controls() {
        let (f, p, context) = fixture();
        assert_eq!(evaluate(&f, &p, &context), 0);
    }
    #[test]
    fn all_independent_controls_are_mandatory() {
        let (f, p, context) = fixture();
        type Mutation = (u32, fn(&mut CriticalFacts));
        let changes: [Mutation; 21] = [
            (EMERGENCY_STOP, |f| f.emergency_stop = true),
            (SEPARATION_OF_DUTIES, |f| {
                f.security_approver_id = f.requester_id
            }),
            (SEPARATION_OF_DUTIES, |f| {
                f.service_owner_approver_id = f.operations_approver_id
            }),
            (SEPARATION_OF_DUTIES, |f| f.approvers_mfa_verified = false),
            (APPROVAL_EXPIRED, |f| f.approvals_expires_at_ms = 1_000_000),
            (OUTSIDE_CHANGE_WINDOW, |f| {
                f.change_window_end_ms = 1_000_000
            }),
            (STALE_EVIDENCE, |f| f.evidence_observed_at_ms = 1_000_001),
            (STALE_EVIDENCE, |f| f.evidence_observed_at_ms = 939_999),
            (REVISION_MISMATCH, |f| f.approved_revision = [2; 32]),
            (ARTIFACT_UNTRUSTED, |f| {
                f.artifact_signature_verified = false
            }),
            (ARTIFACT_UNTRUSTED, |f| f.sbom_verified = false),
            (ARTIFACT_UNTRUSTED, |f| f.provenance_verified = false),
            (SECURITY_FINDINGS, |f| f.vulnerability_scan_complete = false),
            (SECURITY_FINDINGS, |f| f.high_vulnerabilities = 1),
            (SECURITY_FINDINGS, |f| f.secrets_detected = 1),
            (RECOVERY_UNPROVEN, |f| f.backup_restore_tested = false),
            (RECOVERY_UNPROVEN, |f| f.rollback_tested = false),
            (CANARY_FAILED, |f| f.canary_error_rate_ppm = 501),
            (ACTIVE_INCIDENT, |f| f.active_sev1_incidents = 1),
            (OVERRIDE_REQUESTED, |f| f.policy_override_requested = true),
            (DEPENDENCY_UNHEALTHY, |f| f.dependencies_healthy = false),
        ];
        for (expected, change) in changes {
            let mut changed = f.clone();
            change(&mut changed);
            assert_eq!(evaluate(&changed, &p, &context), expected);
        }
    }
    #[test]
    fn exact_time_thresholds_and_overflow_fail_closed() {
        let (mut f, mut p, mut context) = fixture();
        f.evidence_observed_at_ms = context.at_ms - p.max_evidence_age_ms;
        assert_eq!(evaluate(&f, &p, &context), 0);
        context.at_ms = u64::MAX;
        assert_ne!(evaluate(&f, &p, &context) & STALE_EVIDENCE, 0);
        p.max_evidence_age_ms = u64::MAX;
        assert_ne!(evaluate(&f, &p, &context) & INVALID_POLICY, 0);
    }
}
