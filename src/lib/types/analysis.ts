// src/lib/types/analysis.ts
// Types for Claude analysis output

import type { AnalysisReadinessLevel } from './extraction';

// =============================================================================
// FAR ANALYSIS
// =============================================================================

export interface FARAnalysis {
  functional_analysis: {
    company_type: 'operational' | 'holding' | 'financing' | 'ip_holding' | 'mixed';
    functions_performed: string[];
    key_decisions_made: string[];
    substance_indicators: {
      has_employees: boolean;
      employee_count: number | null;
      has_physical_office: boolean;
      has_local_management: boolean;
      is_domiciliation_administered: boolean;
    };
    functional_classification: string;
  };

  asset_analysis: {
    key_assets_owned: string[];
    key_assets_used: string[];
    intangible_assets: string[];
    asset_intensity_ratio: number | null;
  };

  risk_analysis: {
    financial_risks: string[];
    operational_risks: string[];
    market_risks: string[];
    risks_controlled: string[];
    risks_borne_by_others: string[];
  };
}

// =============================================================================
// TP OPPORTUNITY
// =============================================================================

export interface TPOpportunity {
  type:
    | 'zero_spread'
    | 'thin_cap'
    | 'unremunerated_guarantee'
    | 'undocumented_services'
    | 'pricing_anomaly'
    | 'missing_documentation'
    | 'related_party_flag'
    | 'substance_concern'
    | 'maturity_mismatch'
    | 'soparfi_substance_risk'
    | 'circular_56_1_concern';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affected_amount: number | null;
  potential_adjustment: number | null;
  recommendation: string;
  data_references: string[];
  regulatory_reference?: string;

  generated_at_readiness_level: AnalysisReadinessLevel;
  required_data_present: boolean;

  substance_indicators?: {
    ic_debt_amount?: number;
    staff_costs?: number;
    employee_count?: number;
    is_domiciliation_administered?: boolean;
  };
}

// =============================================================================
// IC FINANCING ANALYSIS
// =============================================================================

export interface ICFinancingAnalysis {
  total_ic_loans_granted: number;
  total_ic_loans_received: number;
  net_ic_position: number;

  lending_analysis: {
    principal: number;
    interest_income: number;
    implied_rate: number | null;
    maturity_profile: {
      within_one_year: number;
      after_one_year: number;
      after_five_years: number;
    };
    has_subordination: boolean;
  };

  borrowing_analysis: {
    principal: number;
    interest_expense: number;
    implied_rate: number | null;
    maturity_profile: {
      within_one_year: number;
      after_one_year: number;
      after_five_years: number;
    };
  };

  spread_analysis: {
    ic_spread_bps: number | null;
    market_benchmark_low: number;
    market_benchmark_high: number;
    is_within_benchmark: boolean;
    spread_assessment: 'adequate' | 'low' | 'zero' | 'negative' | 'unknown';
  };
}

// =============================================================================
// TP ANALYSIS RESULT
// =============================================================================

export interface TPAnalysisResult {
  // Account context
  account_type: 'full' | 'abridged';
  company_size: 'small' | 'medium' | 'large';
  analysis_limitations: string[];

  // FAR Analysis
  far_analysis: FARAnalysis;

  // Company classification
  company_classification: 'operational' | 'holding' | 'financing' | 'ip_holding' | 'mixed';
  classification_reasoning: string;

  // IC Financing analysis
  ic_financing: ICFinancingAnalysis;

  // Calculated metrics summary
  metrics: {
    total_ic_positions: number;
    ic_loans_granted: number;
    ic_loans_received: number;
    ic_interest_income: number;
    ic_interest_expense: number;
    implied_lending_rate: number | null;
    implied_borrowing_rate: number | null;
    ic_spread_bps: number | null;
    debt_equity_ratio: number | null;
    effective_tax_rate: number | null;
  };

  // Related Party Flags (from Note 7ter)
  related_party_flags: {
    has_note_7ter_disclosures: boolean;
    non_arms_length_transactions: number;
    flagged_transactions: Array<{
      description: string;
      amount: number;
      counterparty: string;
      concern: string;
    }>;
  };

  // Opportunities
  opportunities: TPOpportunity[];

  // Risk flags
  flags: {
    has_zero_spread: boolean;
    has_thin_cap_risk: boolean;
    has_unremunerated_guarantee: boolean;
    has_undocumented_services: boolean;
    has_substance_concerns: boolean;
    has_related_party_issues: boolean;
  };

  // Scoring
  risk_score: number;
  priority_ranking: 'high' | 'medium' | 'low';

  // Summary
  executive_summary: string;
  recommended_actions: string[];

  // Documentation assessment
  documentation_gaps: string[];
  suggested_benchmarking_studies: string[];
}
