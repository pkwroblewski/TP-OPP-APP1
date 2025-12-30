// src/lib/types/database.ts
// Types matching Supabase tables

import type { StructuredExtraction } from './extraction';
import type { TPAnalysisResult, TPOpportunity } from './analysis';

// =============================================================================
// COMPANIES TABLE
// =============================================================================

export interface Company {
  id: string;
  rcs_number: string;
  name: string;
  legal_form: string | null;
  gdrive_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyInsert {
  rcs_number: string;
  name: string;
  legal_form?: string | null;
  gdrive_folder_id?: string | null;
}

export interface CompanyUpdate {
  rcs_number?: string;
  name?: string;
  legal_form?: string | null;
  gdrive_folder_id?: string | null;
  updated_at?: string;
}

// =============================================================================
// FINANCIAL YEARS TABLE
// =============================================================================

export interface FinancialYear {
  id: string;
  company_id: string;
  year_end: string;

  // Google Drive references
  gdrive_folder_id: string | null;
  gdrive_pdf_file_id: string | null;
  gdrive_pdf_url: string | null;
  pdf_uploaded_at: string | null;

  // Extraction layer
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_data: StructuredExtraction | null;
  extraction_confidence: number | null;
  extraction_warnings: string[] | null;
  extracted_at: string | null;

  // Schema versioning
  extraction_schema_version: string | null;

  // Unit/scale validation
  unit_scale: 'UNITS' | 'THOUSANDS' | 'MILLIONS' | null;
  unit_scale_validated: boolean;

  // Account classification
  account_type: 'full' | 'abridged' | 'abbreviated' | null;
  company_size: 'small' | 'medium' | 'large' | null;
  reporting_standard: 'LUX_GAAP' | 'IFRS' | null;

  // Reconciliation
  reconciliation_status: 'pending' | 'passed' | 'failed' | 'needs_rerun';
  reconciliation_checked_at: string | null;
  reconciliation_transformer_version: string | null;
  reconciliation_records_json: number | null;
  reconciliation_records_tables: number | null;
  reconciliation_fingerprint_mismatches: number;

  // Approval gate
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;

  // Analysis layer
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed' | 'blocked';
  analysis_input_hash: string | null;

  created_at: string;
}

export interface FinancialYearInsert {
  company_id: string;
  year_end: string;
  gdrive_folder_id?: string | null;
  gdrive_pdf_file_id?: string | null;
  gdrive_pdf_url?: string | null;
  pdf_uploaded_at?: string | null;
  extraction_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface FinancialYearUpdate {
  gdrive_folder_id?: string | null;
  gdrive_pdf_file_id?: string | null;
  gdrive_pdf_url?: string | null;
  pdf_uploaded_at?: string | null;
  extraction_status?: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_data?: StructuredExtraction | null;
  extraction_confidence?: number | null;
  extraction_warnings?: string[] | null;
  extracted_at?: string | null;
  extraction_schema_version?: string | null;
  unit_scale?: 'UNITS' | 'THOUSANDS' | 'MILLIONS' | null;
  unit_scale_validated?: boolean;
  account_type?: 'full' | 'abridged' | 'abbreviated' | null;
  company_size?: 'small' | 'medium' | 'large' | null;
  reporting_standard?: 'LUX_GAAP' | 'IFRS' | null;
  reconciliation_status?: 'pending' | 'passed' | 'failed' | 'needs_rerun';
  reconciliation_checked_at?: string | null;
  reconciliation_transformer_version?: string | null;
  reconciliation_records_json?: number | null;
  reconciliation_records_tables?: number | null;
  reconciliation_fingerprint_mismatches?: number;
  is_approved?: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  analysis_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'blocked';
  analysis_input_hash?: string | null;
}

// =============================================================================
// TP ANALYSES TABLE
// =============================================================================

export interface TPAnalysis {
  id: string;
  financial_year_id: string;
  input_extraction_hash: string;

  // Account context
  account_type: 'full' | 'abridged' | null;
  company_size: 'small' | 'medium' | 'large' | null;
  analysis_limitations: string[] | null;

  // Classification
  company_classification: string | null;
  classification_reasoning: string | null;

  // FAR Analysis
  far_analysis: TPAnalysisResult['far_analysis'] | null;

  // IC Financing Analysis
  ic_financing_analysis: TPAnalysisResult['ic_financing'] | null;

  // Key metrics
  total_ic_positions: number | null;
  ic_loans_granted: number | null;
  ic_loans_received: number | null;
  ic_interest_income: number | null;
  ic_interest_expense: number | null;
  implied_lending_rate: number | null;
  implied_borrowing_rate: number | null;
  ic_spread_bps: number | null;
  debt_equity_ratio: number | null;
  effective_tax_rate: number | null;

  // Related Party Flags
  has_note_7ter_disclosures: boolean;
  non_arms_length_transaction_count: number;
  related_party_flags: TPAnalysisResult['related_party_flags'] | null;

  // Opportunities
  opportunities: TPOpportunity[] | null;

  // Risk flags
  has_zero_spread: boolean;
  has_thin_cap_risk: boolean;
  has_unremunerated_guarantee: boolean;
  has_undocumented_services: boolean;
  has_substance_concerns: boolean;
  has_related_party_issues: boolean;

  // Scoring
  risk_score: number | null;
  priority_ranking: 'high' | 'medium' | 'low' | null;

  // Summary
  executive_summary: string | null;
  recommended_actions: string[] | null;
  documentation_gaps: string[] | null;
  suggested_benchmarking_studies: string[] | null;

  // Raw response
  raw_analysis_response: TPAnalysisResult | null;

  analyzed_at: string | null;
  created_at: string;
}

export interface TPAnalysisInsert {
  financial_year_id: string;
  input_extraction_hash: string;
  account_type?: 'full' | 'abridged' | null;
  company_size?: 'small' | 'medium' | 'large' | null;
  analysis_limitations?: string[] | null;
  company_classification?: string | null;
  classification_reasoning?: string | null;
  far_analysis?: TPAnalysisResult['far_analysis'] | null;
  ic_financing_analysis?: TPAnalysisResult['ic_financing'] | null;
  total_ic_positions?: number | null;
  ic_loans_granted?: number | null;
  ic_loans_received?: number | null;
  ic_interest_income?: number | null;
  ic_interest_expense?: number | null;
  implied_lending_rate?: number | null;
  implied_borrowing_rate?: number | null;
  ic_spread_bps?: number | null;
  debt_equity_ratio?: number | null;
  effective_tax_rate?: number | null;
  has_note_7ter_disclosures?: boolean;
  non_arms_length_transaction_count?: number;
  related_party_flags?: TPAnalysisResult['related_party_flags'] | null;
  opportunities?: TPOpportunity[] | null;
  has_zero_spread?: boolean;
  has_thin_cap_risk?: boolean;
  has_unremunerated_guarantee?: boolean;
  has_undocumented_services?: boolean;
  has_substance_concerns?: boolean;
  has_related_party_issues?: boolean;
  risk_score?: number | null;
  priority_ranking?: 'high' | 'medium' | 'low' | null;
  executive_summary?: string | null;
  recommended_actions?: string[] | null;
  documentation_gaps?: string[] | null;
  suggested_benchmarking_studies?: string[] | null;
  raw_analysis_response?: TPAnalysisResult | null;
  analyzed_at?: string | null;
}

// =============================================================================
// IC TRANSACTIONS TABLE
// =============================================================================

export interface ICTransactionRow {
  id: string;
  financial_year_id: string;

  record_id: string;
  record_fingerprint: string;

  transaction_type: string;
  counterparty: string | null;
  counterparty_country: string | null;
  amount: number | null;
  currency: string;
  interest_rate: string | null;
  maturity: string | null;

  maturity_within_one_year: number | null;
  maturity_after_one_year: number | null;
  maturity_after_five_years: number | null;
  is_subordinated: boolean;

  description: string | null;
  source_page: number | null;
  source_note: string | null;
  source_text: string | null;
  ecdf_code: string | null;
  extraction_confidence: number | null;

  created_at: string;
}

export interface ICTransactionInsert {
  financial_year_id: string;
  record_id: string;
  record_fingerprint: string;
  transaction_type: string;
  counterparty?: string | null;
  counterparty_country?: string | null;
  amount?: number | null;
  currency?: string;
  interest_rate?: string | null;
  maturity?: string | null;
  maturity_within_one_year?: number | null;
  maturity_after_one_year?: number | null;
  maturity_after_five_years?: number | null;
  is_subordinated?: boolean;
  description?: string | null;
  source_page?: number | null;
  source_note?: string | null;
  source_text?: string | null;
  ecdf_code?: string | null;
  extraction_confidence?: number | null;
}

// =============================================================================
// RELATED PARTY TRANSACTIONS TABLE
// =============================================================================

export type RelatedPartyDisclosureTypeDB =
  | '7ter_non_market'
  | 'full_related_party_listing'
  | 'statement_only_no_exceptions'
  | 'not_disclosed';

export interface RelatedPartyTransactionRow {
  id: string;
  financial_year_id: string;

  record_id: string;
  record_fingerprint: string;

  nature: string;
  counterparty: string | null;
  relationship: string | null;
  amount: number | null;

  disclosure_type: RelatedPartyDisclosureTypeDB;
  non_market_terms_disclosed: boolean | null;

  terms_description: string | null;
  source_page: number | null;
  source_note: string | null;

  created_at: string;
}

export interface RelatedPartyTransactionInsert {
  financial_year_id: string;
  record_id: string;
  record_fingerprint: string;
  nature: string;
  counterparty?: string | null;
  relationship?: string | null;
  amount?: number | null;
  disclosure_type: RelatedPartyDisclosureTypeDB;
  non_market_terms_disclosed?: boolean | null;
  terms_description?: string | null;
  source_page?: number | null;
  source_note?: string | null;
}

// =============================================================================
// TEMPLATE FINGERPRINTS TABLE
// =============================================================================

export interface TemplateFingerprint {
  id: string;
  fingerprint_hash: string;
  layout_signature: string;
  audit_firm_template: string | null;
  language_detected: string;

  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;

  mapping_confidence_at_approval: number | null;
  dictionary_version_at_approval: string;

  expiry_date: string;
  last_regression_test_date: string | null;
  requires_revalidation: boolean;
  revoked: boolean;
  revocation_reason: string | null;
  revoked_at: string | null;

  spot_check_rate: number;
  uploads_since_last_spot_check: number;
  last_spot_check_date: string | null;
  last_spot_check_passed: boolean | null;
  total_uploads_with_fingerprint: number;
  spot_check_failures: number;
  auto_revoke_threshold: number;

  created_at: string;
  updated_at: string;
}

// =============================================================================
// CONSOLIDATION RESOLUTIONS TABLE
// =============================================================================

export interface ConsolidationResolution {
  id: string;
  company_id: string;
  financial_year: string;

  resolution: 'standalone' | 'consolidated';
  resolved_at: string;
  resolved_by: string;

  indicators_at_resolution: Record<string, unknown> | null;
  notes: string | null;
}

export interface ConsolidationResolutionInsert {
  company_id: string;
  financial_year: string;
  resolution: 'standalone' | 'consolidated';
  resolved_by: string;
  indicators_at_resolution?: Record<string, unknown> | null;
  notes?: string | null;
}

// =============================================================================
// OPPORTUNITY PIPELINE TABLE
// =============================================================================

export type PipelineStatus =
  | 'identified'
  | 'contacted'
  | 'meeting'
  | 'proposal'
  | 'won'
  | 'lost';

export interface OpportunityPipeline {
  id: string;
  company_id: string;
  status: PipelineStatus;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityPipelineInsert {
  company_id: string;
  status?: PipelineStatus;
  notes?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
}

export interface OpportunityPipelineUpdate {
  status?: PipelineStatus;
  notes?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  updated_at?: string;
}

// =============================================================================
// JOINED TYPES (for queries)
// =============================================================================

export interface CompanyWithFinancialYears extends Company {
  financial_years: FinancialYear[];
}

export interface CompanyWithLatestStatus extends Company {
  financial_years: Array<{
    id: string;
    year_end: string;
    extraction_status: FinancialYear['extraction_status'];
    analysis_status: FinancialYear['analysis_status'];
  }>;
  pipeline?: OpportunityPipeline | null;
}

export interface FinancialYearWithCompany extends FinancialYear {
  company: Company;
}

export interface FinancialYearWithAnalysis extends FinancialYear {
  company: Company;
  tp_analyses: TPAnalysis[];
}

export interface PipelineWithDetails extends OpportunityPipeline {
  company: Company;
  latest_analysis?: TPAnalysis | null;
}
