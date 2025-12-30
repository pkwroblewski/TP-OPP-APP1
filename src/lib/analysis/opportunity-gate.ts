// src/lib/analysis/opportunity-gate.ts
// CRITICAL: Mechanical enforcement of readiness levels
// This is CODE-LEVEL enforcement, not prompt-level

import type { TPOpportunity } from '@/lib/types/analysis';
import type { PreAnalysisGates, DeterministicMetrics } from '@/lib/parser';

/**
 * Opportunity type definitions and their requirements
 */
export interface OpportunityEnablement {
  type: TPOpportunity['type'];
  enabled_in_limited: boolean;
  required_calculable_flags: (keyof DeterministicMetrics)[];
  blocked_if_abridged: boolean;
  required_module_trust: {
    module: 'a' | 'b' | 'c';
    min_trust_level: number;
  }[];
}

const OPPORTUNITY_REQUIREMENTS: OpportunityEnablement[] = [
  {
    type: 'zero_spread',
    enabled_in_limited: true, // Allowed in LIMITED if IC amounts are high-confidence
    required_calculable_flags: ['implied_ic_lending_rate_pct', 'implied_ic_borrowing_rate_pct'],
    blocked_if_abridged: false,
    required_module_trust: [{ module: 'a', min_trust_level: 0.6 }],
  },
  {
    type: 'thin_cap',
    enabled_in_limited: true, // Debt/equity calculable from BS
    required_calculable_flags: ['debt_to_equity_ratio'],
    blocked_if_abridged: false,
    required_module_trust: [{ module: 'a', min_trust_level: 0.6 }],
  },
  {
    type: 'substance_concern',
    enabled_in_limited: true, // Employees/staff costs are BS items
    required_calculable_flags: ['staff_cost_to_revenue_pct'],
    blocked_if_abridged: false,
    required_module_trust: [{ module: 'a', min_trust_level: 0.5 }],
  },
  {
    type: 'soparfi_substance_risk',
    enabled_in_limited: true, // Holding indicators detectable from BS
    required_calculable_flags: ['financial_assets_to_total_assets_pct'],
    blocked_if_abridged: false,
    required_module_trust: [{ module: 'a', min_trust_level: 0.5 }],
  },
  {
    type: 'pricing_anomaly',
    enabled_in_limited: false, // Requires full P&L analysis
    required_calculable_flags: ['operating_margin_pct'],
    blocked_if_abridged: true,
    required_module_trust: [{ module: 'a', min_trust_level: 0.8 }],
  },
  {
    type: 'undocumented_services',
    enabled_in_limited: false, // Requires note analysis
    required_calculable_flags: [],
    blocked_if_abridged: true,
    required_module_trust: [{ module: 'b', min_trust_level: 0.7 }],
  },
  {
    type: 'unremunerated_guarantee',
    enabled_in_limited: true, // Detectable from IC positions
    required_calculable_flags: [],
    blocked_if_abridged: false,
    required_module_trust: [{ module: 'b', min_trust_level: 0.5 }],
  },
  {
    type: 'related_party_flag',
    enabled_in_limited: true, // Note 7ter is explicit
    required_calculable_flags: [],
    blocked_if_abridged: false,
    required_module_trust: [{ module: 'b', min_trust_level: 0.5 }],
  },
  {
    type: 'missing_documentation',
    enabled_in_limited: true, // Always checkable
    required_calculable_flags: [],
    blocked_if_abridged: false,
    required_module_trust: [],
  },
  {
    type: 'maturity_mismatch',
    enabled_in_limited: false, // Requires detailed note analysis
    required_calculable_flags: [],
    blocked_if_abridged: false,
    required_module_trust: [{ module: 'b', min_trust_level: 0.7 }],
  },
  {
    type: 'circular_56_1_concern',
    enabled_in_limited: true, // Substance check
    required_calculable_flags: [],
    blocked_if_abridged: false,
    required_module_trust: [{ module: 'a', min_trust_level: 0.5 }],
  },
];

/**
 * Filter opportunities based on readiness level and calculable flags
 * CRITICAL: This is mechanical enforcement - Claude cannot bypass
 */
export function filterOpportunitiesByReadiness(
  opportunities: TPOpportunity[],
  gates: PreAnalysisGates,
  metrics: DeterministicMetrics,
  isAbridged: boolean
): TPOpportunity[] {
  // If BLOCKED, return no opportunities
  if (gates.readiness_level === 'BLOCKED') {
    return [];
  }

  return opportunities.filter((opp) => {
    const requirement = OPPORTUNITY_REQUIREMENTS.find((r) => r.type === opp.type);

    // Unknown opportunity type - allow if READY_FULL, block if LIMITED
    if (!requirement) {
      return gates.readiness_level === 'READY_FULL';
    }

    // In LIMITED mode, only enabled opportunities are allowed
    if (gates.readiness_level === 'READY_LIMITED' && !requirement.enabled_in_limited) {
      return false;
    }

    // Check if blocked by abridged status
    if (requirement.blocked_if_abridged && isAbridged) {
      return false;
    }

    // Check all required calculable flags
    for (const flag of requirement.required_calculable_flags) {
      const value = metrics[flag];
      if (value === null || value === undefined) {
        return false;
      }
    }

    // Check module trust levels
    for (const req of requirement.required_module_trust) {
      const trustLevel = getModuleTrustLevel(gates.module_trust_levels, req.module);
      if (trustLevel < req.min_trust_level) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get trust level for a module
 */
function getModuleTrustLevel(
  moduleTrustLevels: PreAnalysisGates['module_trust_levels'],
  module: 'a' | 'b' | 'c'
): number {
  switch (module) {
    case 'a':
      return moduleTrustLevels.module_a_anchors;
    case 'b':
      return moduleTrustLevels.module_b_context;
    case 'c':
      return moduleTrustLevels.module_c_narrative;
    default:
      return 0;
  }
}

/**
 * Get allowed opportunity types for LIMITED mode
 */
export function getAllowedOpportunityTypes(gates: PreAnalysisGates): TPOpportunity['type'][] {
  if (gates.readiness_level === 'READY_FULL') {
    return OPPORTUNITY_REQUIREMENTS.map((r) => r.type);
  }

  if (gates.readiness_level === 'BLOCKED') {
    return [];
  }

  // LIMITED mode - return enabled types
  return OPPORTUNITY_REQUIREMENTS.filter((r) => r.enabled_in_limited).map((r) => r.type);
}

/**
 * Validate that an opportunity meets requirements
 */
export function validateOpportunity(
  opportunity: TPOpportunity,
  gates: PreAnalysisGates,
  metrics: DeterministicMetrics,
  isAbridged: boolean
): { valid: boolean; reason?: string } {
  const requirement = OPPORTUNITY_REQUIREMENTS.find((r) => r.type === opportunity.type);

  if (!requirement) {
    return {
      valid: gates.readiness_level === 'READY_FULL',
      reason: 'Unknown opportunity type',
    };
  }

  if (gates.readiness_level === 'BLOCKED') {
    return { valid: false, reason: 'Analysis is blocked' };
  }

  if (gates.readiness_level === 'READY_LIMITED' && !requirement.enabled_in_limited) {
    return { valid: false, reason: 'Not allowed in LIMITED mode' };
  }

  if (requirement.blocked_if_abridged && isAbridged) {
    return { valid: false, reason: 'Blocked for abridged accounts' };
  }

  for (const flag of requirement.required_calculable_flags) {
    const value = metrics[flag];
    if (value === null || value === undefined) {
      return { valid: false, reason: `Required metric ${flag} not calculable` };
    }
  }

  for (const req of requirement.required_module_trust) {
    const trustLevel = getModuleTrustLevel(gates.module_trust_levels, req.module);
    if (trustLevel < req.min_trust_level) {
      return {
        valid: false,
        reason: `Module ${req.module} trust level (${trustLevel}) below required (${req.min_trust_level})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Add analysis scope metadata to opportunities
 */
export function enrichOpportunitiesWithScope(
  opportunities: TPOpportunity[],
  gates: PreAnalysisGates
): TPOpportunity[] {
  return opportunities.map((opp) => ({
    ...opp,
    generated_at_readiness_level: gates.readiness_level,
    required_data_present: true,
  }));
}
