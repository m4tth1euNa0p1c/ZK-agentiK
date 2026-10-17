#![no_std]

use serde::{Deserialize, Serialize};
pub mod critical;

/// Untrusted, normalized facts. Unknown status strings fail closed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PolicyFacts<'a> {
    pub sonar_quality_gate: &'a str,
    pub jira_status: &'a str,
    pub critical_vulnerabilities: u32,
    pub approvals: u32,
    pub critical: Option<&'a critical::CriticalFacts>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Policy {
    pub min_reviewers: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub critical: Option<critical::CriticalPolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PolicyDecision {
    pub allow: bool,
    /// 1=Sonar, 2=Jira, 4=vulnerabilities, 8=approvals, 16=invalid policy, 32=critical.
    pub violations_mask: u8,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub critical_violations: Option<u32>,
}

/// Allocation-free, bounded evaluation, with no host services or floating point.
pub fn evaluate(facts: &PolicyFacts<'_>, policy: &Policy) -> PolicyDecision {
    evaluate_at(
        facts,
        policy,
        &critical::ExecutionContext {
            at_ms: 0,
            revision: [0; 32],
        },
    )
}

pub fn evaluate_at(
    facts: &PolicyFacts<'_>,
    policy: &Policy,
    context: &critical::ExecutionContext,
) -> PolicyDecision {
    let mut decision = evaluate_fields(
        facts.sonar_quality_gate == "OK",
        facts.jira_status == "APPROVED",
        facts.critical_vulnerabilities,
        facts.approvals,
        policy.min_reviewers,
    );
    let critical_mask = match (&policy.critical, facts.critical) {
        (None, None) => 0,
        (Some(p), Some(f)) => {
            critical::evaluate(f, p, context)
                | if policy.min_reviewers < 3 {
                    critical::INVALID_POLICY
                } else {
                    0
                }
        }
        _ => critical::INVALID_POLICY,
    };
    if critical_mask != 0 {
        decision.allow = false;
        decision.violations_mask |= 32;
        decision.critical_violations = Some(critical_mask);
    }
    decision
}

/// Fixed-width ABI for freestanding guests, with no allocation required.
pub fn evaluate_fields(
    sonar_ok: bool,
    jira_approved: bool,
    critical_vulnerabilities: u32,
    approvals: u32,
    min_reviewers: u32,
) -> PolicyDecision {
    let mut mask = 0;
    if !sonar_ok {
        mask |= 1;
    }
    if !jira_approved {
        mask |= 2;
    }
    if critical_vulnerabilities != 0 {
        mask |= 4;
    }
    if approvals < min_reviewers {
        mask |= 8;
    }
    if min_reviewers == 0 {
        mask |= 16;
    }
    PolicyDecision {
        allow: mask == 0,
        violations_mask: mask,
        critical_violations: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exhaustive_boolean_policy_table() {
        for bits in 0..16 {
            let d = evaluate_fields(
                bits & 1 == 0,
                bits & 2 == 0,
                u32::from(bits & 4 != 0),
                if bits & 8 == 0 { 2 } else { 1 },
                2,
            );
            assert_eq!(d.allow, bits == 0);
            assert_eq!(d.violations_mask, bits);
        }
    }

    #[test]
    fn exact_status_and_integer_boundaries() {
        let facts = PolicyFacts {
            sonar_quality_gate: "ok",
            jira_status: "APPROVED ",
            critical_vulnerabilities: u32::MAX,
            approvals: u32::MAX,
            critical: None,
        };
        assert_eq!(
            evaluate(
                &facts,
                &Policy {
                    min_reviewers: u32::MAX,
                    critical: None
                }
            )
            .violations_mask,
            7
        );
        assert!(!evaluate_fields(true, true, 0, u32::MAX, 0).allow);
        assert!(evaluate_fields(true, true, 0, u32::MAX, u32::MAX).allow);
    }
}
