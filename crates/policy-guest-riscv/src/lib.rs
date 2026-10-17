#![no_std]

use policy_engine_core::{
    critical::ExecutionContext, evaluate_at, Policy, PolicyDecision, PolicyFacts,
};

/// Backend-specific adapters must authenticate commitments and commit the full
/// public journal around this pure policy function. This alone is not a zkVM ABI.
pub fn execute(
    private_facts: &PolicyFacts<'_>,
    public_policy: &Policy,
    context: &ExecutionContext,
) -> PolicyDecision {
    evaluate_at(private_facts, public_policy, context)
}
