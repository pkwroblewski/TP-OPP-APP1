// src/lib/types/api.ts
// Types for API requests and responses

import type { Company, FinancialYear, TPAnalysis, OpportunityPipeline, PipelineStatus } from './database';
import type { StructuredExtraction, PreAnalysisGates } from './extraction';
import type { TPAnalysisResult } from './analysis';

// =============================================================================
// GENERIC API RESPONSE
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// UPLOAD API
// =============================================================================

export interface UploadRequest {
  file: File;
  rcsNumber: string;
  companyName: string;
  yearEnd: string; // YYYY-MM-DD format
}

export interface UploadResponse {
  success: boolean;
  company: {
    id: string;
    rcs_number: string;
    name: string;
    gdrive_folder_id: string;
  };
  financialYear: {
    id: string;
    year_end: string;
    gdrive_folder_id: string;
    gdrive_pdf_file_id: string;
    gdrive_pdf_url: string;
    extraction_status: string;
  };
  message: string;
}

// =============================================================================
// EXTRACT API
// =============================================================================

export interface ExtractRequest {
  financialYearId: string;
}

export interface ExtractResponse {
  success: boolean;
  extraction_id: string;
  status: 'completed' | 'failed';

  // Gate status
  pre_analysis_gates: {
    readiness_level: PreAnalysisGates['readiness_level'];
    blocking_issues: string[];
    warning_issues: string[];
    can_proceed_to_analysis: boolean;
    requires_human_review: boolean;
    review_reasons?: string[];
  };

  // Extraction summary
  extraction_summary: {
    company_name: string;
    year_end: string;
    account_type: string;
    company_size: string;
    confidence_score: number;
    ic_transactions_count: number;
    related_party_transactions_count: number;
  };

  message: string;
  error?: string;
}

// =============================================================================
// ANALYZE API
// =============================================================================

export interface AnalyzeRequest {
  financialYearId: string;
  forceAnalysis?: boolean;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis_id: string;
  status: 'completed' | 'failed' | 'blocked';

  // Analysis summary
  analysis_summary: {
    company_classification: string;
    risk_score: number;
    priority_ranking: string;
    opportunities_count: number;
    high_severity_count: number;
    medium_severity_count: number;
    low_severity_count: number;
  };

  // Key flags
  flags: {
    has_zero_spread: boolean;
    has_thin_cap_risk: boolean;
    has_substance_concerns: boolean;
    has_related_party_issues: boolean;
  };

  executive_summary: string;

  message: string;
  error?: string;
  blocking_issues?: string[];
}

// =============================================================================
// COMPANIES API
// =============================================================================

export interface CompaniesListResponse {
  companies: Array<Company & {
    financial_years_count: number;
    latest_extraction_status: FinancialYear['extraction_status'] | null;
    latest_analysis_status: FinancialYear['analysis_status'] | null;
    in_pipeline: boolean;
  }>;
  total: number;
}

export interface CompanyDetailResponse {
  company: Company;
  financial_years: Array<FinancialYear & {
    has_analysis: boolean;
    analysis_risk_score?: number;
    analysis_priority?: string;
  }>;
  pipeline?: OpportunityPipeline | null;
}

// =============================================================================
// PIPELINE API
// =============================================================================

export interface PipelineListResponse {
  pipeline: Array<OpportunityPipeline & {
    company: Company;
    latest_analysis?: {
      risk_score: number | null;
      priority_ranking: string | null;
      opportunities_count: number;
      total_affected_amount: number | null;
    };
  }>;
  summary: {
    total: number;
    by_status: Record<PipelineStatus, number>;
    total_potential_value: number;
  };
}

export interface PipelineCreateRequest {
  companyId: string;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string;
}

export interface PipelineUpdateRequest {
  status?: PipelineStatus;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string;
}

export interface PipelineResponse {
  pipeline: OpportunityPipeline;
  message: string;
}

// =============================================================================
// EXTRACTION VIEWER API
// =============================================================================

export interface ExtractionViewerResponse {
  financialYear: FinancialYear;
  company: Company;
  extraction: StructuredExtraction | null;
  pdf_url: string | null;
}

// =============================================================================
// ANALYSIS VIEWER API
// =============================================================================

export interface AnalysisViewerResponse {
  financialYear: FinancialYear;
  company: Company;
  analysis: TPAnalysis | null;
  extraction_summary: {
    account_type: string | null;
    company_size: string | null;
    confidence_score: number | null;
  };
}

// =============================================================================
// EXPORT API
// =============================================================================

export interface ExportRequest {
  analysisId: string;
  format?: 'csv' | 'json';
}

export interface ExportResponse {
  success: boolean;
  download_url?: string;
  filename?: string;
  error?: string;
}

// =============================================================================
// DASHBOARD API
// =============================================================================

export interface DashboardStatsResponse {
  total_companies: number;
  pending_extractions: number;
  pending_analyses: number;
  opportunities_identified: number;
  pipeline_value: number;

  recent_uploads: Array<{
    company_name: string;
    rcs_number: string;
    year_end: string;
    uploaded_at: string;
  }>;

  recent_analyses: Array<{
    company_name: string;
    rcs_number: string;
    year_end: string;
    risk_score: number;
    priority: string;
    analyzed_at: string;
  }>;

  high_priority_opportunities: Array<{
    company_id: string;
    company_name: string;
    rcs_number: string;
    risk_score: number;
    opportunities_count: number;
  }>;

  upcoming_actions: Array<{
    company_name: string;
    next_action: string;
    next_action_date: string;
  }>;
}

// =============================================================================
// VALIDATION / REVIEW API
// =============================================================================

export interface ReviewActionRequest {
  financialYearId: string;
  actionType: 'confirm_unit_scale' | 'confirm_mapping' | 'confirm_consolidation' | 'fix_arithmetic';
  payload: {
    confirmed?: boolean;
    selectedCode?: string;
    consolidationResolution?: 'standalone' | 'consolidated';
    fixedValue?: number;
  };
}

export interface ReviewActionResponse {
  success: boolean;
  message: string;
  updated_gates?: PreAnalysisGates;
  requires_reextraction?: boolean;
}
