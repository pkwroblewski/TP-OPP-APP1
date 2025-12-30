// src/lib/parser/pre-analysis-gates.ts
// CRITICAL: Pre-analysis gates that must pass before Claude analysis

import { TP_CRITICAL_PCN_CODES } from './code-dictionary';
import type { UnitScaleDetection } from './unit-scale';
import type { ExtractedCode } from './reference-column-extractor';
import type { CompanyProfile } from './company-profile';

export type AnalysisReadinessLevel = 'READY_FULL' | 'READY_LIMITED' | 'BLOCKED';

export interface PreAnalysisGates {
  // MUST-PASS gates
  unit_scale_validated: boolean;
  balance_sheet_balances: boolean;

  // Other gates
  consolidation_gate: ConsolidationGate;
  mapping_gate: MappingGate;
  data_quality_gate: DataQualityGate;

  // Computed
  readiness_level: AnalysisReadinessLevel;
  can_proceed_to_analysis: boolean;
  blocking_issues: string[];
  warning_issues: string[];

  // If LIMITED
  limited_mode_rules?: LimitedModeRules;

  // Module trust levels
  module_trust_levels: ModuleTrustLevels;

  // Review actions
  required_review_actions: ReviewAction[];
}

export interface ConsolidationGate {
  is_consolidated: boolean;
  consolidation_detected_from: string | null;
  analysis_mode: 'proceed_standalone' | 'proceed_consolidated' | 'blocked' | 'pending_resolution';
  reason: string;
}

export interface MappingGate {
  high_confidence_pct: number;
  medium_confidence_pct: number;
  low_confidence_pct: number;
  tp_critical_codes_affected: boolean;
  affected_critical_codes: string[];
  overall_mapping_confidence: number;
}

export interface DataQualityGate {
  has_balance_sheet: boolean;
  has_profit_loss: boolean;
  has_notes: boolean;
  has_management_report: boolean;
  completeness_score: number;
  missing_critical_data: string[];
}

export interface LimitedModeRules {
  allowed_opportunity_types: string[];
  disallowed_opportunity_types: string[];
  reason_for_limitations: string[];
}

export interface ModuleTrustLevels {
  module_a_anchors: number; // BS/PL extraction confidence
  module_b_context: number; // Notes/IC transactions confidence
  module_c_narrative: number; // Management report confidence
}

export interface ReviewAction {
  action_type: 'confirm_unit_scale' | 'confirm_mapping' | 'confirm_consolidation' | 'fix_arithmetic';
  description: string;
  code?: string;
  current_value?: string;
  suggested_value?: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Evaluate all pre-analysis gates
 */
export function evaluatePreAnalysisGates(
  unitScaleDetection: UnitScaleDetection,
  extractedCodes: ExtractedCode[],
  companyProfile: CompanyProfile,
  balanceSheetDelta: number, // Difference between total assets and total liabilities
  hasBalanceSheet: boolean,
  hasProfitLoss: boolean,
  hasNotes: boolean,
  hasManagementReport: boolean
): PreAnalysisGates {
  const blockingIssues: string[] = [];
  const warningIssues: string[] = [];
  const reviewActions: ReviewAction[] = [];

  // 1. Unit Scale Gate (WARNING - not blocking)
  const unitScaleValidated = !unitScaleDetection.unit_scale_uncertain;
  if (!unitScaleValidated) {
    // Downgraded from blocking to warning - proceed with detected scale
    warningIssues.push(`Unit scale uncertain (${unitScaleDetection.detected_scale}) - verify before relying on values`);
    reviewActions.push({
      action_type: 'confirm_unit_scale',
      description: `Confirm presentation scale: ${unitScaleDetection.detected_scale}`,
      current_value: unitScaleDetection.detected_scale,
      priority: 'high',
    });
  }

  // 2. Balance Sheet Balances Gate (WARNING - not blocking)
  // Luxembourg filings often have rounding differences
  const balanceSheetBalances = Math.abs(balanceSheetDelta) < 1000; // Allow for larger rounding differences
  if (!balanceSheetBalances && hasBalanceSheet && Math.abs(balanceSheetDelta) > 0) {
    // Only add as warning if there's actually a significant difference
    warningIssues.push(`Balance sheet delta: ${balanceSheetDelta.toFixed(0)} (may be rounding or extraction issue)`);
    reviewActions.push({
      action_type: 'fix_arithmetic',
      description: 'Balance sheet totals do not match - verify extraction',
      current_value: balanceSheetDelta.toFixed(2),
      priority: 'medium',
    });
  }

  // 3. Consolidation Gate
  const consolidationGate = evaluateConsolidationGate(companyProfile);
  if (consolidationGate.analysis_mode === 'blocked' || consolidationGate.analysis_mode === 'pending_resolution') {
    blockingIssues.push(`Consolidation issue: ${consolidationGate.reason}`);
    reviewActions.push({
      action_type: 'confirm_consolidation',
      description: consolidationGate.reason,
      priority: 'high',
    });
  }

  // 4. Mapping Gate
  const mappingGate = evaluateMappingGate(extractedCodes);
  if (mappingGate.tp_critical_codes_affected && mappingGate.low_confidence_pct > 20) {
    warningIssues.push(`Low confidence on ${mappingGate.affected_critical_codes.length} TP-critical codes`);

    // Add review actions for low-confidence critical codes (max 5)
    const lowConfCritical = extractedCodes
      .filter(c => TP_CRITICAL_PCN_CODES.includes(c.code) && c.confidence < 0.7)
      .slice(0, 5);

    for (const code of lowConfCritical) {
      reviewActions.push({
        action_type: 'confirm_mapping',
        description: `Confirm code ${code.code}: "${code.caption}"`,
        code: code.code,
        current_value: code.caption,
        priority: 'medium',
      });
    }
  }

  // 5. Data Quality Gate
  const dataQualityGate = evaluateDataQualityGate(
    hasBalanceSheet,
    hasProfitLoss,
    hasNotes,
    hasManagementReport,
    companyProfile
  );

  for (const missing of dataQualityGate.missing_critical_data) {
    warningIssues.push(missing);
  }

  // 6. Module Trust Levels
  const moduleTrustLevels = calculateModuleTrustLevels(
    mappingGate.overall_mapping_confidence,
    extractedCodes,
    hasNotes,
    hasManagementReport
  );

  // 7. Compute Readiness Level
  const readinessLevel = computeReadinessLevel(
    unitScaleValidated,
    balanceSheetBalances,
    consolidationGate,
    mappingGate
  );

  // 8. Limited Mode Rules (if applicable)
  let limitedModeRules: LimitedModeRules | undefined;
  if (readinessLevel === 'READY_LIMITED') {
    limitedModeRules = computeLimitedModeRules(mappingGate, dataQualityGate);
  }

  return {
    unit_scale_validated: unitScaleValidated,
    balance_sheet_balances: balanceSheetBalances,
    consolidation_gate: consolidationGate,
    mapping_gate: mappingGate,
    data_quality_gate: dataQualityGate,
    readiness_level: readinessLevel,
    can_proceed_to_analysis: readinessLevel !== 'BLOCKED',
    blocking_issues: blockingIssues,
    warning_issues: warningIssues,
    limited_mode_rules: limitedModeRules,
    module_trust_levels: moduleTrustLevels,
    required_review_actions: reviewActions.slice(0, 10), // Max 10 actions
  };
}

function evaluateConsolidationGate(profile: CompanyProfile): ConsolidationGate {
  if (profile.is_consolidated) {
    return {
      is_consolidated: true,
      consolidation_detected_from: profile.consolidation_source,
      analysis_mode: 'proceed_consolidated',
      reason: 'Consolidated accounts detected - IC eliminations may apply',
    };
  }

  return {
    is_consolidated: false,
    consolidation_detected_from: profile.consolidation_source,
    analysis_mode: 'proceed_standalone',
    reason: 'Standalone accounts - full IC analysis available',
  };
}

function evaluateMappingGate(extractedCodes: ExtractedCode[]): MappingGate {
  if (extractedCodes.length === 0) {
    return {
      high_confidence_pct: 0,
      medium_confidence_pct: 0,
      low_confidence_pct: 100,
      tp_critical_codes_affected: true,
      affected_critical_codes: TP_CRITICAL_PCN_CODES,
      overall_mapping_confidence: 0,
    };
  }

  const highConf = extractedCodes.filter(c => c.confidence >= 0.8).length;
  const medConf = extractedCodes.filter(c => c.confidence >= 0.5 && c.confidence < 0.8).length;
  const lowConf = extractedCodes.filter(c => c.confidence < 0.5).length;

  const total = extractedCodes.length;
  const highConfPct = (highConf / total) * 100;
  const medConfPct = (medConf / total) * 100;
  const lowConfPct = (lowConf / total) * 100;

  // Check if TP-critical codes are affected by low confidence
  const affectedCritical = extractedCodes
    .filter(c => TP_CRITICAL_PCN_CODES.includes(c.code) && c.confidence < 0.7)
    .map(c => c.code);

  const overallConfidence = extractedCodes.reduce((sum, c) => sum + c.confidence, 0) / total;

  return {
    high_confidence_pct: highConfPct,
    medium_confidence_pct: medConfPct,
    low_confidence_pct: lowConfPct,
    tp_critical_codes_affected: affectedCritical.length > 0,
    affected_critical_codes: affectedCritical,
    overall_mapping_confidence: overallConfidence,
  };
}

function evaluateDataQualityGate(
  hasBalanceSheet: boolean,
  hasProfitLoss: boolean,
  hasNotes: boolean,
  hasManagementReport: boolean,
  profile: CompanyProfile
): DataQualityGate {
  const missingCritical: string[] = [];

  if (!hasBalanceSheet) {
    missingCritical.push('Balance sheet not found');
  }

  if (!hasProfitLoss) {
    missingCritical.push('Profit & Loss not found');
  }

  // Large companies should have certain disclosures
  if (profile.company_size === 'LARGE') {
    if (!hasNotes) {
      missingCritical.push('Notes not found (required for large entity)');
    }
    if (!hasManagementReport) {
      missingCritical.push('Management report not found (required for large entity)');
    }
  }

  // Calculate completeness score
  let score = 0;
  if (hasBalanceSheet) score += 30;
  if (hasProfitLoss) score += 30;
  if (hasNotes) score += 25;
  if (hasManagementReport) score += 15;

  return {
    has_balance_sheet: hasBalanceSheet,
    has_profit_loss: hasProfitLoss,
    has_notes: hasNotes,
    has_management_report: hasManagementReport,
    completeness_score: score,
    missing_critical_data: missingCritical,
  };
}

function calculateModuleTrustLevels(
  mappingConfidence: number,
  extractedCodes: ExtractedCode[],
  hasNotes: boolean,
  hasManagementReport: boolean
): ModuleTrustLevels {
  // Module A: Based on BS/PL extraction
  const bsplCodes = extractedCodes.filter(c =>
    c.code.startsWith('1') || c.code.startsWith('4') ||
    c.code.startsWith('6') || c.code.startsWith('7')
  );
  const moduleA = bsplCodes.length > 0
    ? bsplCodes.reduce((sum, c) => sum + c.confidence, 0) / bsplCodes.length
    : 0;

  // Module B: Based on notes/IC extraction
  const moduleB = hasNotes ? mappingConfidence * 0.8 : 0.3;

  // Module C: Based on management report
  const moduleC = hasManagementReport ? 0.7 : 0.2;

  return {
    module_a_anchors: moduleA,
    module_b_context: moduleB,
    module_c_narrative: moduleC,
  };
}

function computeReadinessLevel(
  unitScaleValidated: boolean,
  balanceSheetBalances: boolean,
  consolidationGate: ConsolidationGate,
  mappingGate: MappingGate
): AnalysisReadinessLevel {
  // BLOCKED if consolidation is pending resolution
  if (consolidationGate.analysis_mode === 'blocked' ||
      consolidationGate.analysis_mode === 'pending_resolution') {
    return 'BLOCKED';
  }

  // RELAXED: Unit scale uncertainty is a warning, not a blocker
  // The system will proceed with the detected scale but flag for review
  // Balance sheet not balancing is also downgraded to warning
  // (Luxembourg filings sometimes have rounding differences)

  // MATERIALITY-BASED MAPPING GATE
  const highConfPct = mappingGate.high_confidence_pct;
  const mediumConfPct = mappingGate.medium_confidence_pct;
  const criticalAffected = mappingGate.tp_critical_codes_affected;
  const totalConfPct = highConfPct + mediumConfPct;

  // READY_FULL if high confidence
  if (highConfPct >= 80) {
    return 'READY_FULL';
  }

  // READY_FULL if unit scale validated and good overall confidence
  if (unitScaleValidated && totalConfPct >= 70) {
    return 'READY_FULL';
  }

  // READY_LIMITED if we have some data (>= 40% medium+ confidence)
  // This allows caption-matched data to proceed
  if (totalConfPct >= 40) {
    return 'READY_LIMITED';
  }

  // READY_LIMITED if we have ANY extracted codes (better than nothing)
  if (mappingGate.overall_mapping_confidence > 0) {
    return 'READY_LIMITED';
  }

  // BLOCKED only if we have no data at all
  return 'BLOCKED';
}

function computeLimitedModeRules(
  mappingGate: MappingGate,
  dataQualityGate: DataQualityGate
): LimitedModeRules {
  const allowed: string[] = [];
  const disallowed: string[] = [];
  const reasons: string[] = [];

  // Always allowed in limited mode (don't require precise mapping)
  allowed.push('IC_FINANCING');
  allowed.push('SUBSTANCE_RISK');
  allowed.push('THIN_CAPITALIZATION');

  // Require higher confidence
  if (mappingGate.overall_mapping_confidence < 0.7) {
    disallowed.push('OPERATING_PLI_ANALYSIS');
    disallowed.push('SERVICE_FEE_EROSION');
    disallowed.push('COST_PLUS_ANALYSIS');
    reasons.push(`Low mapping confidence: ${(mappingGate.overall_mapping_confidence * 100).toFixed(0)}%`);
  }

  if (!dataQualityGate.has_notes) {
    disallowed.push('DETAILED_IC_ANALYSIS');
    reasons.push('Notes not available for detailed IC analysis');
  }

  return {
    allowed_opportunity_types: allowed,
    disallowed_opportunity_types: disallowed,
    reason_for_limitations: reasons,
  };
}
