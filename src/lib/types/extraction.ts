// src/lib/types/extraction.ts
// Types for Document AI extraction output

// =============================================================================
// GLOBAL METADATA
// =============================================================================

export interface ExtractionMetadata {
  source_file: string;
  extracted_at: string;
  pages_processed: number;
  processor_version: string;

  // Schema versioning for drift prevention
  extraction_schema_version: string;
  mapping_rules_version: string;

  // Language and format detection
  language_detected: 'FR' | 'EN' | 'DE' | 'MIXED';
  languages_present: string[];

  // Unit/scale detection
  currency: string;
  currency_source: string;
  unit_scale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
  unit_scale_source: string;
  unit_scale_confidence: number;

  // Reporting framework
  reporting_standard: 'LUX_GAAP' | 'IFRS' | 'UNKNOWN';
  is_consolidated: boolean;
  consolidation_source?: string;
  statement_layout_version?: string;

  // Luxembourg GAAP compliance
  account_type: 'full' | 'abridged' | 'abbreviated';
  company_size: 'small' | 'medium' | 'large' | 'unknown';
  has_management_report: boolean;
  has_audit_report: boolean;
  ecdf_format_detected: boolean;
  has_reference_column: boolean;

  // Template fingerprint
  template_fingerprint: {
    fingerprint_hash: string;
    layout_signature: string;
    audit_firm_template?: string;
    language_detected: 'FR' | 'EN' | 'DE' | 'MIXED';
    previously_approved: boolean;
    approval_date?: string;
    approval_mapping_confidence: number;
  };

  // Period information
  period_start: string;
  period_end: string;
  comparative_period_start?: string;
  comparative_period_end?: string;
  filing_date?: string;

  confidence_score: number;
}

// =============================================================================
// EXTRACTED VALUES
// =============================================================================

export interface ExtractedValue {
  value: number | string | null;
  page: number;
  source?: string;
  confidence?: number;
  ecdf_code?: string;
  note_reference?: string;
  is_abridged?: boolean;
}

export type ExtractionStatus =
  | 'extracted'
  | 'not_found'
  | 'not_disclosed'
  | 'not_applicable'
  | 'aggregated'
  | 'unknown';

export interface ExtractedValueWithStatus {
  value: number | null;
  status: ExtractionStatus;
  status_reason?: string;
  page: number | null;
  source_text?: string;
  confidence: number;
  ecdf_code?: string;
  note_reference?: string;
  caption_original?: string;
  caption_normalized?: string;
}

export interface NoteContent {
  note_number: string;
  title: string;
  raw_text: string;
  page: number;
  structured_data?: Record<string, unknown>;
}

export interface LinkedExtractedValue extends ExtractedValueWithStatus {
  note_content?: NoteContent;
}

// =============================================================================
// CODE MAPPING
// =============================================================================

export const TP_CRITICAL_PCN_CODES = [
  '1171', '1279', '4279', '4379', '1151', '1137',
  '6311', '6511', '6051', '7051',
  '6412', '6417', '109',
  '1010', '1110', '1310', '1410',
] as const;

export interface CodeMappingResult {
  matched_code: string | null;
  match_source: 'reference_column' | 'caption_match' | 'manual';
  alt_candidates: Array<{
    code: string;
    caption: string;
    similarity_score: number;
  }>;
  match_confidence: number;
  match_reason: string;
  requires_review: boolean;
  dictionary_version: string;
}

// =============================================================================
// HIERARCHICAL LINKED SCHEMA
// =============================================================================

export interface LinkedNoteData {
  note_number: string;
  note_title: string;
  page: number;

  breakdown?: Array<{
    description: string;
    amount: number;
    currency: string;
    sub_pcn_code?: string;
  }>;

  counterparties?: Array<{
    name: string;
    country?: string;
    amount: number;
    relationship?: string;
    transaction_type?: string;
  }>;

  maturity_analysis?: {
    within_1_year: number;
    after_1_year_within_5: number;
    after_5_years: number;
  };

  raw_text?: string;
  extraction_triggered: boolean;
  extraction_complete: boolean;
}

export interface CanonicalLineItem {
  lux_code: string;

  caption_metadata: {
    original: string;
    normalized: string;
    language: 'FR' | 'EN' | 'DE' | 'MIXED';
  };

  code_mapping: CodeMappingResult;

  amount_cy: number | null;
  amount_py: number | null;

  raw_numeric_cy?: string;
  raw_numeric_py?: string;
  numeric_parse_notes?: string;

  status_cy: ExtractionStatus;
  status_py: ExtractionStatus;

  statement: 'balance_sheet' | 'profit_loss';
  section: string;
  is_subtotal: boolean;
  is_total: boolean;
  parent_code?: string;

  maturity?: 'within_1y' | 'after_1y' | 'after_5y' | 'total';

  is_intercompany: boolean;
  ic_nature?: 'affiliated' | 'participating' | 'other_related';
  ic_economic_nature?: 'trade' | 'financing' | 'tax' | 'dividends' | 'cash_pool' | 'other';

  note_link?: string;
  linked_note_data?: LinkedNoteData;

  page: number;
  source_text?: string;
  confidence: number;
}

export interface CanonicalStatement {
  statement_type: 'balance_sheet' | 'profit_loss';
  layout: 'LU_GAAP_STATUTORY' | 'LU_GAAP_ABRIDGED' | 'IFRS' | 'OTHER';
  currency: string;
  unit_scale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
  period_end_cy: string;
  period_end_py: string;

  lines: CanonicalLineItem[];

  is_complete: boolean;
  missing_lines: string[];
  validation_errors: string[];

  mapping_quality: {
    total_lines: number;
    high_confidence_mappings: number;
    medium_confidence_mappings: number;
    low_confidence_mappings: number;
    requires_review_count: number;
    duplicate_code_warnings: string[];
  };
}

// =============================================================================
// COMPANY PROFILE
// =============================================================================

export interface CompanyProfile {
  name: ExtractedValue;
  rcs_number: ExtractedValue;
  legal_form: ExtractedValue;
  financial_year_end: ExtractedValue;
  financial_year_start?: ExtractedValue;

  principal_activity_text: ExtractedValue;
  registered_office: ExtractedValue;

  employee_count: ExtractedValue;
  company_size_determination: {
    calculated_size: 'small' | 'medium' | 'large' | 'unknown';
    balance_sheet_total: number | null;
    net_turnover: number | null;
    average_employees: number | null;
    average_employees_source?: string;
    thresholds_exceeded: string[];
    turnover_per_employee?: number;
    assets_per_employee?: number;
    low_substance_flag: boolean;
    substance_flag_reason?: string;
  };

  auditor_name?: ExtractedValue;
  auditor_opinion?: 'unqualified' | 'qualified' | 'adverse' | 'disclaimer' | 'unknown';

  has_employees: boolean;
  has_physical_office: boolean;
  is_management_company_administered: boolean;
  management_company_name?: string;
}

// =============================================================================
// MULTI-YEAR CONTEXT
// =============================================================================

export interface MultiYearContext {
  current_year: {
    period_end: string;
    data_complete: boolean;
  };

  previous_year: {
    period_end: string;
    data_available: boolean;
    extraction_source: 'comparative_column' | 'not_available';
  };

  historical_context?: {
    years_available: number;
    oldest_year_end?: string;
    can_compute_3_year_average: boolean;
    can_compute_weighted_average: boolean;
  };

  trend_analysis_limitations: string[];
}

// =============================================================================
// FINANCIAL YEAR DATA
// =============================================================================

export interface FinancialYearData {
  turnover: LinkedExtractedValue;
  turnover_by_activity?: LinkedExtractedValue[];
  turnover_by_geography?: LinkedExtractedValue[];

  gross_result?: LinkedExtractedValue;
  is_abridged_pnl: boolean;

  other_operating_income: LinkedExtractedValue;

  raw_materials?: LinkedExtractedValue;
  other_external_charges?: LinkedExtractedValue;

  staff_costs_total: LinkedExtractedValue;
  staff_wages_salaries?: LinkedExtractedValue;
  staff_social_security?: LinkedExtractedValue;
  staff_pensions?: LinkedExtractedValue;

  depreciation: LinkedExtractedValue;
  other_operating_charges: LinkedExtractedValue;

  ic_dividend_income: LinkedExtractedValue;
  third_party_dividend_income?: LinkedExtractedValue;

  ic_interest_income: LinkedExtractedValue;
  third_party_interest_income: LinkedExtractedValue;

  ic_interest_expense: LinkedExtractedValue;
  third_party_interest_expense: LinkedExtractedValue;

  profit_before_tax: LinkedExtractedValue;
  tax: LinkedExtractedValue;
  net_profit: LinkedExtractedValue;

  effective_tax_rate?: number;
  statutory_rate_difference?: number;
}

export interface ProfitAndLoss {
  currency: string;
  current_year: FinancialYearData;
  prior_year: FinancialYearData;
  turnover_note?: NoteContent;
}

export interface BalanceSheetYearData {
  total_assets: LinkedExtractedValue;

  participations_affiliated: LinkedExtractedValue;
  ic_loans_granted_fixed: LinkedExtractedValue;
  participating_interests: LinkedExtractedValue;
  loans_to_participating: LinkedExtractedValue;

  trade_receivables: LinkedExtractedValue;
  ic_receivables_current: LinkedExtractedValue;
  other_receivables: LinkedExtractedValue;

  cash: LinkedExtractedValue;

  total_equity: LinkedExtractedValue;
  share_capital: LinkedExtractedValue;
  share_premium: LinkedExtractedValue;
  reserves: LinkedExtractedValue;
  retained_earnings: LinkedExtractedValue;
  profit_loss_year: LinkedExtractedValue;

  total_creditors: LinkedExtractedValue;

  bank_debt_within_one_year: LinkedExtractedValue;
  bank_debt_after_one_year: LinkedExtractedValue;
  bank_debt_after_five_years: LinkedExtractedValue;

  ic_loans_received_within_one_year: LinkedExtractedValue;
  ic_loans_received_after_one_year: LinkedExtractedValue;
  ic_loans_received_after_five_years: LinkedExtractedValue;
  ic_loans_received_total: LinkedExtractedValue;

  trade_payables: LinkedExtractedValue;

  total_ic_assets: LinkedExtractedValue;
  total_ic_liabilities: LinkedExtractedValue;
}

export interface BalanceSheet {
  currency: string;
  current_year: BalanceSheetYearData;
  prior_year: BalanceSheetYearData;
  creditors_maturity_note?: NoteContent;
}

// =============================================================================
// IC TRANSACTIONS & RELATED PARTIES
// =============================================================================

export interface ReconciliationStatus {
  json_to_tables_transformed: boolean;
  transformation_timestamp: string;
  transformer_version: string;

  round_trip_check_passed: boolean;
  records_in_json: number;
  records_in_tables: number;
  fingerprint_mismatches: number;
  missing_in_tables: string[];
  extra_in_tables: string[];

  reconciliation_status: 'pending' | 'passed' | 'failed' | 'needs_rerun';
  failure_reason?: string;

  can_be_approved: boolean;
}

export interface ICTransaction {
  record_id: string;
  record_fingerprint: string;

  type: 'loan_granted' | 'loan_received' | 'service_fee_income' |
        'service_fee_expense' | 'management_fee' | 'royalty' |
        'guarantee' | 'dividend' | 'cash_pooling' | 'other';
  counterparty: string | null;
  counterparty_country: string | null;
  amount: number | null;
  interest_rate: string | null;
  maturity: string | null;
  maturity_within_one_year?: number;
  maturity_after_one_year?: number;
  maturity_after_five_years?: number;
  is_subordinated?: boolean;
  description: string;
  page: number;
  source_note: string | null;
  ecdf_code?: string;
}

export type RelatedPartyDisclosureType =
  | '7ter_non_market'
  | 'full_related_party_listing'
  | 'statement_only_no_exceptions'
  | 'not_disclosed';

export interface RelatedPartyTransaction {
  record_id: string;
  record_fingerprint: string;

  nature: string;
  counterparty: string;
  relationship: string;
  amount: number;

  disclosure_type: RelatedPartyDisclosureType;
  non_market_terms_disclosed: boolean | null;

  terms_description?: string;
  page: number;
  source_note: string;
}

// =============================================================================
// OWNERSHIP STRUCTURE
// =============================================================================

export interface OwnershipStructure {
  immediate_parent?: {
    name: string;
    country: string;
    ownership_percentage: number;
    page: number;
  };
  ultimate_parent?: {
    name: string;
    country: string;
    ownership_percentage?: number;
    is_listed?: boolean;
    page: number;
  };
  subsidiaries?: Array<{
    name: string;
    country: string;
    ownership_percentage: number;
    activity?: string;
    page: number;
  }>;
  consolidation_status?: 'consolidated' | 'not_consolidated' | 'exempt';
  consolidation_parent?: string;
}

// =============================================================================
// SUBSTANCE INDICATORS
// =============================================================================

export interface SubstanceIndicators {
  has_employees: boolean;
  employee_count: number | null;
  staff_costs: number | null;

  has_physical_office: boolean;
  is_domiciliation_administered: boolean;
  management_company_name?: string;

  has_local_directors: boolean;
  director_names?: string[];

  is_potential_soparfi: boolean;
  soparfi_indicators: string[];

  circular_56_1_concerns: Array<{
    concern: string;
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
}

// =============================================================================
// QUALITATIVE FAR CONTEXT
// =============================================================================

export const TP_TRIGGER_KEYWORDS = [
  'patents', 'licenses', 'royalties', 'intellectual property', 'IP', 'trademarks',
  'brevets', 'licences', 'redevances', 'propriété intellectuelle', 'marques',
  'management fees', 'service fees', 'administrative services', 'technical services',
  'frais de gestion', 'frais de service', 'services administratifs',
  'financing', 'loans', 'interest', 'guarantees', 'cash pooling', 'treasury',
  'financement', 'prêts', 'intérêts', 'garanties', 'trésorerie',
  'research', 'development', 'R&D', 'innovation',
  'recherche', 'développement', 'innovation',
  'creation', 'acquisition', 'holding', 'exploitation', 'sale of patents',
  'création', 'acquisition', 'détention', 'exploitation'
] as const;

export interface KeywordScore {
  keyword: string;
  category: 'ip' | 'services' | 'financing' | 'rd' | 'corporate_purpose';
  count: number;
  sentences: Array<{
    text: string;
    page: number;
    context: string;
  }>;
  tp_relevance: 'high' | 'medium' | 'low';
}

export interface QualitativeFARContext {
  qualitative_context: string;

  keyword_scores: KeywordScore[];
  total_tp_keywords_found: number;
  dominant_tp_theme?: 'ip_heavy' | 'financing_heavy' | 'services_heavy' | 'mixed';

  keywords_found: {
    risks: string[];
    functions: string[];
    personnel: string[];
    development: string[];
    research: string[];
    group: string[];
    patents_ip: string[];
    management_fees: string[];
    financing_guarantees: string[];
  };

  tp_relevant_sentences: Array<{
    sentence: string;
    source: 'management_report' | 'note_1' | 'note_7ter' | 'other_note';
    page: number;
    keywords_matched: string[];
    tp_category: 'ip' | 'services' | 'financing' | 'rd' | 'substance';
  }>;

  corporate_purpose_text?: string;
  corporate_purpose_keywords: string[];

  business_model_summary?: string;
  risk_statement?: string;
  key_personnel_info?: string;
  group_role_description?: string;

  source_pages: number[];
  extraction_confidence: number;
}

export interface ManagementReport {
  has_management_report: boolean;
  page_start?: number;
  page_end?: number;

  business_description?: string;
  principal_activities?: string[];

  principal_risks?: string[];
  financial_risks?: string[];

  kpis_mentioned?: string[];

  future_developments?: string;
  rd_activities?: string;

  far_context: QualitativeFARContext;

  raw_text: string;
}

// =============================================================================
// ACCOUNTING POLICIES & TAX
// =============================================================================

export interface AccountingPolicies {
  has_accounting_policies_note: boolean;
  page?: number;

  participations_valuation?: 'cost' | 'equity' | 'fair_value' | 'other';
  loans_valuation?: 'amortized_cost' | 'fair_value' | 'other';
  impairment_policy?: string;
  fx_policy?: string;
  fair_value_option_used?: boolean;

  revenue_recognition_policy?: string;
  consolidation_method?: string;
  other_policies?: string[];

  raw_text?: string;
}

export interface TaxNote {
  has_tax_note: boolean;
  page?: number;

  current_tax?: number;
  deferred_tax?: number;

  statutory_rate?: number;
  effective_rate?: number;
  reconciliation_items?: Array<{
    description: string;
    amount?: number;
    rate_impact?: number;
  }>;

  tax_losses_carried_forward?: number;
  tax_credits?: number;

  raw_text?: string;
}

// =============================================================================
// DISCLOSURE EXPECTATIONS
// =============================================================================

export interface DisclosureExpectations {
  company_size: 'small' | 'medium' | 'large';
  account_type: 'full' | 'abridged' | 'abbreviated';

  expected_disclosures: Array<{
    disclosure: string;
    required: boolean;
    found: boolean;
    reason_if_missing?: 'exempt' | 'not_found' | 'not_applicable';
    assessable: boolean;
    not_assessable_reason?: string;
    tp_impact: string;
  }>;

  turnover_breakdown_required: boolean;
  related_party_full_disclosure: boolean;
  abridged_pnl_allowed: boolean;
  abbreviated_bs_allowed: boolean;
  management_report_required: boolean;
  audit_required: boolean;

  full_tp_analysis_possible: boolean;
  limited_assessments_only: string[];
  not_assessable_areas: Array<{
    area: string;
    reason: string;
    output_label: string;
  }>;
}

// =============================================================================
// OFF-BALANCE SHEET
// =============================================================================

export interface OffBalanceSheetItem {
  beneficiary: string;
  amount: number;
  fee_charged: number | null;
  description: string;
  page: number;
}

export interface OffBalanceSheet {
  guarantees_given: OffBalanceSheetItem[];
  guarantees_received: OffBalanceSheetItem[];
  other_commitments: OffBalanceSheetItem[];
}

// =============================================================================
// EXTRACTION FLAGS
// =============================================================================

export interface ExtractionFlags {
  items_not_found: string[];
  low_confidence_items: string[];
  validation_warnings: string[];
  notes_referenced_but_not_extracted: string[];

  is_abridged_accounts: boolean;
  missing_mandatory_disclosures: string[];
  arithmetic_validation_errors: string[];
  potential_data_quality_issues: string[];

  ic_disclosure_limitation: boolean;
  ic_disclosure_limitation_reason?: string;

  unit_scale_uncertain: boolean;
  debt_capture_incomplete: boolean;
  ic_base_incomplete: boolean;
}

// =============================================================================
// BENCHMARK PARAMETERS
// =============================================================================

export interface BenchmarkParameters {
  ic_spread_low_bps: number;
  ic_spread_high_bps: number;
  ic_spread_zero_threshold_bps: number;

  thin_cap_debt_equity_ratio: number;

  min_employees_for_substance: number;

  code_mapping_confidence_threshold: number;
  unit_scale_confidence_threshold: number;

  is_heuristic: true;
  source: string;
}

// =============================================================================
// DETERMINISTIC METRICS
// =============================================================================

export interface DeterministicMetrics {
  operating_profit?: number;
  operating_profit_calculable: boolean;
  operating_profit_formula?: string;

  ebit?: number;
  ebit_calculable: boolean;

  ebitda?: number;
  ebitda_calculable: boolean;

  gross_margin_pct?: number;
  operating_margin_pct?: number;
  net_margin_pct?: number;

  avg_ic_loans_granted?: number;
  avg_ic_loans_received?: number;
  implied_ic_lending_rate?: number;
  implied_ic_borrowing_rate?: number;
  ic_spread_bps?: number;

  total_interest_bearing_debt?: number;
  debt_components: {
    bank_loans?: number;
    debentures?: number;
    ic_loans?: number;
    other_loans?: number;
    current_account_financing?: number;
    accrued_interest?: number;
  };
  debt_components_captured: string[];
  debt_capture_complete: boolean;
  debt_equity_ratio?: number;
  equity_ratio_pct?: number;
  interest_coverage_ratio?: number;

  asset_intensity_ratio?: number;
  fixed_asset_ratio?: number;

  effective_tax_rate?: number;
  statutory_rate_lux: number;
  rate_difference_pct?: number;

  yoy_analysis: {
    turnover_cy?: number;
    turnover_py?: number;
    turnover_change_pct?: number;
    turnover_change_significant: boolean;

    operating_profit_cy?: number;
    operating_profit_py?: number;
    operating_profit_change_pct?: number;
    profit_volatility_flag: boolean;

    operating_margin_cy_pct?: number;
    operating_margin_py_pct?: number;
    margin_shift_pct?: number;
    margin_shift_significant: boolean;

    ic_debt_cy?: number;
    ic_debt_py?: number;
    ic_debt_change_pct?: number;
    ic_debt_spike_flag: boolean;

    ic_receivables_cy?: number;
    ic_receivables_py?: number;
    ic_receivables_change_pct?: number;

    staff_costs_cy?: number;
    staff_costs_py?: number;
    staff_costs_change_pct?: number;
    staff_reduction_flag: boolean;

    implied_rate_cy?: number;
    implied_rate_py?: number;
    rate_change_bps?: number;
    rate_change_significant: boolean;
  };

  calculations_performed: Array<{
    metric: string;
    formula: string;
    inputs: Record<string, number | null>;
    result: number | null;
    notes: string;
  }>;

  metrics_not_calculable: Array<{
    metric: string;
    reason: string;
    missing_inputs: string[];
  }>;
}

// =============================================================================
// PRE-ANALYSIS GATES
// =============================================================================

export type AnalysisReadinessLevel = 'READY_FULL' | 'READY_LIMITED' | 'BLOCKED';

export interface LimitedModeRules {
  opportunity_enablement: {
    [opportunity_type: string]: {
      enabled: boolean;
      required_calculable_flags: string[];
      required_module_trust: {
        module: 'a' | 'b' | 'c';
        min_trust_level: 'high' | 'medium' | 'low';
      }[];
      blocked_if_abridged: boolean;
      blocked_if_aggregated_lines: string[];
      disable_reason?: string;
    };
  };

  allowed_opportunity_types: string[];
  disallowed_opportunity_types: string[];
  reason_for_limitations: string[];
}

export interface ModuleTrustLevels {
  module_a_anchors: {
    trust_level: 'high' | 'medium' | 'low';
    balance_sheet_confidence: number;
    profit_loss_confidence: number;
    metrics_confidence: number;
    issues: string[];
  };

  module_b_context: {
    trust_level: 'high' | 'medium' | 'low';
    notes_extraction_confidence: number;
    ic_transactions_confidence: number;
    related_party_confidence: number;
    issues: string[];
  };

  module_c_narrative: {
    trust_level: 'high' | 'medium' | 'low';
    management_report_confidence: number;
    far_context_confidence: number;
    issues: string[];
  };
}

export type ReviewActionType =
  | 'confirm_unit_scale'
  | 'confirm_mapping'
  | 'confirm_consolidation'
  | 'fix_arithmetic';

export interface ReviewAction {
  action_type: ReviewActionType;
  priority: 'blocking' | 'high' | 'medium';
  description: string;

  affected_items?: Array<{
    pcn_code: string;
    caption: string;
    confidence: number;
    suggested_code?: string;
    is_tp_critical: boolean;
  }>;

  suggested_fix?: {
    field: string;
    current_value: number;
    suggested_value: number;
  };

  consolidation_indicators?: string[];
}

export interface PreAnalysisGates {
  readiness_level: AnalysisReadinessLevel;
  limited_mode_rules?: LimitedModeRules;
  module_trust_levels: ModuleTrustLevels;

  unit_scale_validated: boolean;
  unit_scale_gate_passed: boolean;
  unit_scale_confidence_sufficient: boolean;

  balance_sheet_balances: boolean;
  balance_sheet_gate_passed: boolean;
  balance_sheet_difference?: number;
  balance_sheet_tolerance_pct: number;

  mapping_gate_passed: boolean;
  mapping_gate_details: {
    high_confidence_pct: number;
    medium_confidence_pct: number;
    requires_review_count: number;
    auto_analysis_allowed: boolean;

    tp_critical_codes_affected: boolean;
    affected_critical_codes: string[];
    non_critical_low_confidence_count: number;

    template_fingerprint?: string;
    fingerprint_previously_approved: boolean;
    confidence_boost_applied: boolean;

    fingerprint_governance?: {
      approval_date: string;
      expiry_date: string;
      last_regression_test_date: string;
      dictionary_version_at_approval: string;
      requires_revalidation: boolean;
      revoked: boolean;
      revocation_reason?: string;

      spot_check_config: {
        spot_check_rate: number;
        uploads_since_last_spot_check: number;
        last_spot_check_date?: string;
        last_spot_check_passed?: boolean;
        total_uploads_with_fingerprint: number;
        spot_check_failures: number;
        auto_revoke_threshold: number;
      };
    };
  };

  consolidation_gate: {
    is_consolidated: boolean | null;
    standalone_tp_analyzable: boolean;
    analysis_mode: 'entity_level' | 'group_level_only' | 'blocked' | 'pending_resolution';
    consolidation_limitations: string[];

    resolution_required: boolean;
    resolution_stored?: {
      resolved_at: string;
      resolved_by: string;
      resolution: 'standalone' | 'consolidated';
      company_id: string;
      financial_year: string;
    };
  };

  mapping_quality_acceptable: boolean;
  ic_consistency_check_passed: boolean;
  subtotals_reconcile: boolean;
  kpi_vs_canonical_reconciled: boolean;
  note_reconciliations_passed: boolean;
  abridged_pnl_detected: boolean;

  can_proceed_to_analysis: boolean;
  blocking_issues: string[];
  warning_issues: string[];
  scope_limitations: string[];

  requires_human_review: boolean;
  review_reasons: string[];
  review_actions_required: ReviewAction[];

  has_fixable_errors: boolean;
  fixable_errors_applied: boolean;
  revalidation_required: boolean;
}

// =============================================================================
// VALIDATION DASHBOARD
// =============================================================================

export interface ValidationDashboard {
  unit_scale_reconciliation: {
    performed: boolean;
    method: 'cross_section_comparison' | 'magnitude_check' | 'manual';
    sections_compared: string[];
    reconciliation_passed: boolean;
    discrepancy_factor?: number;
    details: string;
  };

  inconsistencies: Array<{
    type: 'note_bs_mismatch' | 'subtotal_error' | 'cross_ref_error' | 'scale_mismatch';
    severity: 'error' | 'warning';
    description: string;
    expected_value?: number;
    actual_value?: number;
    pcn_codes_involved: string[];
    page_references: number[];

    is_fixable: boolean;
    suggested_fix?: {
      field: string;
      current_value: number;
      suggested_value: number;
      fix_reason: string;
    };
  }>;

  substance_warnings: Array<{
    type: 'missing_staff_note' | 'low_substance' | 'no_employees' | 'domiciliation';
    severity: 'high' | 'medium' | 'low';
    description: string;
    indicators: Record<string, unknown>;
  }>;

  completeness_issues: Array<{
    type: 'missing_required' | 'missing_expected' | 'partial_extraction';
    field: string;
    reason: string;
    impact: string;
  }>;

  volatility_alerts: Array<{
    type: 'margin_shift' | 'ic_debt_spike' | 'staff_reduction' | 'turnover_volatility' | 'rate_change';
    severity: 'high' | 'medium' | 'low';
    description: string;
    cy_value?: number;
    py_value?: number;
    change_pct?: number;
    tp_relevance: string;
  }>;

  consolidation_alerts: Array<{
    type: 'standalone_with_subs' | 'consolidated_warning' | 'unclear_status';
    description: string;
    recommendation: string;
  }>;

  arithmetic_errors: Array<{
    location: string;
    description: string;
    expected_total: number;
    calculated_sum: number;
    difference: number;
    pcn_code: string;
    note_reference?: string;
    page: number;
    fixable_in_ui: boolean;
  }>;

  summary: {
    total_errors: number;
    total_warnings: number;
    total_alerts: number;
    arithmetic_errors_count: number;
    ready_for_analysis: boolean;
    requires_review: boolean;
    confidence_level: 'high' | 'medium' | 'low';
  };
}

// =============================================================================
// COUNTERPARTY NORMALIZATION
// =============================================================================

export interface NormalizedCounterparty {
  raw_name: string;
  normalized_name?: string;
  relationship_type: 'parent' | 'subsidiary' | 'sister' | 'affiliate' | 'participating' | 'unknown';
  country?: string;
  country_confidence: number;
  is_normalized: boolean;
  normalization_method?: string;
}

// =============================================================================
// MAIN STRUCTURED EXTRACTION
// =============================================================================

export interface StructuredExtraction {
  extraction_metadata: ExtractionMetadata;
  company_profile: CompanyProfile;
  multi_year_context: MultiYearContext;

  // MODULE A: DETERMINISTIC TOTALS
  canonical_balance_sheet: CanonicalStatement;
  canonical_profit_loss: CanonicalStatement;
  profit_and_loss: ProfitAndLoss;
  balance_sheet: BalanceSheet;
  deterministic_metrics: DeterministicMetrics;

  // MODULE B: DISCLOSURE TEXT
  ic_transactions_from_notes: ICTransaction[];
  related_party_transactions: RelatedPartyTransaction[];
  related_party_disclosure_scope: {
    disclosure_present: boolean;
    applies_art_65_1_7ter: boolean;
    limitation_applied: boolean;
    limitation_description?: string;
    covered_parties: string[];
    excluded_parties?: string[];
  };
  ownership_structure: OwnershipStructure;
  extracted_notes: {
    note_tables: Array<{
      note_number: string;
      title: string;
      rows: Record<string, unknown>[];
      page: number;
    }>;
    note_text_blocks: Array<{
      note_number: string;
      raw_text: string;
      page: number;
    }>;
  };

  // MODULE C: FUNCTIONAL NARRATIVE
  management_report: ManagementReport;
  substance_indicators: SubstanceIndicators;
  accounting_policies: AccountingPolicies;
  tax_note: TaxNote;
  off_balance_sheet: OffBalanceSheet;

  // SUPPORTING DATA & VALIDATION
  counterparties: NormalizedCounterparty[];
  disclosure_expectations: DisclosureExpectations;
  benchmark_parameters: BenchmarkParameters;
  pre_analysis_gates: PreAnalysisGates;
  validation_dashboard: ValidationDashboard;
  extraction_flags: ExtractionFlags;
  validation_results: {
    balance_sheet_balances: boolean;
    balance_sheet_difference?: number;
    note_totals_match: boolean;
    note_reconciliation_errors: string[];
    ic_consistency: boolean;
    ic_consistency_issues: string[];
    subtotals_reconcile: boolean;
    subtotal_errors: string[];
    cross_statement_ties: boolean;
    unit_scale_validated: boolean;
    kpi_vs_canonical_reconciled: boolean;
    kpi_reconciliation_errors: string[];
    all_checks_passed: boolean;
  };
}
