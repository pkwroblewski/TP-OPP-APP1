// src/lib/parser/index.ts
// Main parser entry point for Luxembourg GAAP extraction

import type { DocumentAIResult } from '@/lib/google/document-ai';
import { CODE_DICTIONARY_VERSION, getCodeDefinition, TP_CRITICAL_PCN_CODES } from './code-dictionary';
import { detectUnitScale, type UnitScaleDetection } from './unit-scale';
import { extractFromReferenceColumn, type ExtractedCode } from './reference-column-extractor';
import { extractCompanyProfile, type CompanyProfile } from './company-profile';
import { evaluatePreAnalysisGates, type PreAnalysisGates } from './pre-analysis-gates';
import { computeDeterministicMetrics, type DeterministicMetrics } from './deterministic-metrics';

export const EXTRACTION_SCHEMA_VERSION = '1.0.0';

// Simplified types for parser output (compatible with database storage)
export interface ParserExtractionMetadata {
  schema_version: string;
  code_dictionary_version: string;
  extraction_timestamp: string;
  document_language: 'en' | 'fr' | 'de' | 'unknown';
  unit_scale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
  unit_scale_validated: boolean;
  account_type: string;
  company_size: string;
  reporting_standard: string;
  overall_confidence: number;
  extraction_warnings: string[];
  reference_column_detected: boolean;
}

export interface ParserCanonicalLineItem {
  ecdf_code: string;
  caption_original: string;
  caption_normalized: string;
  value_current_year: number | null;
  value_prior_year: number | null;
  unit_scale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
  raw_value_string: string;
  extraction_confidence: number;
  match_source: 'reference_column' | 'caption_match';
  is_total: boolean;
  parent_code?: string;
  note_reference?: string;
  linked_note_data: unknown | null;
  source_page: number;
  tp_priority: 'high' | 'medium' | 'low';
}

export interface ParserStructuredExtraction {
  metadata: ParserExtractionMetadata;
  company_profile: CompanyProfile;
  canonical_balance_sheet: {
    total_assets: number | null;
    total_liabilities: number | null;
    line_items: ParserCanonicalLineItem[];
  };
  canonical_profit_loss: {
    net_profit_loss: number | null;
    line_items: ParserCanonicalLineItem[];
  };
  deterministic_metrics: DeterministicMetrics;
  extracted_notes: unknown[];
  ic_transactions_from_notes: ParserICTransaction[];
  related_party_transactions: ParserRelatedPartyTransaction[];
  management_report_summary: unknown | null;
  far_context: unknown | null;
  ownership_structure: unknown | null;
  pre_analysis_gates: PreAnalysisGates;
  validation_dashboard: ParserValidationDashboard;
}

export interface ParserICTransaction {
  transaction_type: string;
  counterparty?: string;
  counterparty_country?: string;
  amount: number | null;
  currency?: string;
  interest_rate?: string;
  maturity?: string;
  maturity_within_one_year?: number;
  maturity_after_one_year?: number;
  maturity_after_five_years?: number;
  is_subordinated?: boolean;
  description?: string;
  source_page?: number;
  source_note?: string;
  source_text?: string;
  ecdf_code?: string;
  extraction_confidence?: number;
}

export interface ParserRelatedPartyTransaction {
  nature: string;
  counterparty?: string;
  relationship?: string;
  amount?: number;
  is_arms_length?: boolean;
  terms_description?: string;
  source_page?: number;
  source_note?: string;
}

export interface ParserValidationDashboard {
  blocking_issues: string[];
  warnings: string[];
  arithmetic_errors: unknown[];
  substance_warnings: string[];
  completeness_issues: string[];
  volatility_alerts: string[];
  unit_scale_evidence: string[];
  overall_status: 'ok' | 'warnings' | 'blocked';
}

export interface ParseResult {
  success: boolean;
  extraction: ParserStructuredExtraction | null;
  error?: string;
  warnings: string[];
}

/**
 * Main parser entry point
 * Transforms Document AI output into StructuredExtraction
 */
export async function parseDocument(
  documentAIResult: DocumentAIResult,
  rcsNumber: string,
  companyName: string,
  yearEnd: string
): Promise<ParseResult> {
  const warnings: string[] = [];

  try {
    // 1. FIRST: Detect unit scale - CRITICAL
    const unitScaleDetection = detectUnitScale(documentAIResult);
    if (unitScaleDetection.unit_scale_uncertain) {
      warnings.push('Unit scale uncertain - manual verification recommended');
    }

    // 2. Detect if Reference column with PCN codes exists
    const referenceColumnResult = extractFromReferenceColumn(documentAIResult);
    if (!referenceColumnResult.has_reference_column) {
      warnings.push('No PCN reference column detected - using caption matching as fallback');
    }

    // 3. Build canonical line items from extracted codes
    const canonicalLineItems = buildCanonicalLineItems(
      referenceColumnResult.extracted_codes,
      unitScaleDetection.detected_scale
    );

    // 4. Calculate key totals for company profile
    const totalAssets = getValueByCode(canonicalLineItems, '109');
    const netTurnover = getValueByCode(canonicalLineItems, '7010');
    const employees = extractEmployeeCount(documentAIResult.text);

    // 5. Extract company profile
    const companyProfile = extractCompanyProfile(
      documentAIResult,
      totalAssets,
      netTurnover,
      employees
    );

    // Override with provided values
    companyProfile.name = companyName;
    companyProfile.rcs_number = rcsNumber;
    companyProfile.financial_year_end = yearEnd;

    // 6. Compute deterministic metrics
    const metrics = computeDeterministicMetrics(
      referenceColumnResult.extracted_codes,
      null, // Prior year codes not available in first pass
      unitScaleDetection.detected_scale
    );

    // 7. Check if we have balance sheet and P&L
    const hasBalanceSheet = canonicalLineItems.some(item =>
      item.ecdf_code?.startsWith('1') || item.ecdf_code === '109' || item.ecdf_code === '309'
    );
    const hasProfitLoss = canonicalLineItems.some(item =>
      item.ecdf_code?.startsWith('6') || item.ecdf_code?.startsWith('7') || item.ecdf_code === '9910'
    );
    const hasNotes = documentAIResult.text.toLowerCase().includes('note') ||
                     documentAIResult.text.toLowerCase().includes('annexe');
    const hasManagementReport = documentAIResult.text.toLowerCase().includes('management report') ||
                                documentAIResult.text.toLowerCase().includes('rapport de gestion');

    // 8. Calculate balance sheet delta
    const totalLiabilities = getValueByCode(canonicalLineItems, '309');
    const balanceSheetDelta = (totalAssets || 0) - (totalLiabilities || 0);

    // 9. Evaluate pre-analysis gates
    const preAnalysisGates = evaluatePreAnalysisGates(
      unitScaleDetection,
      referenceColumnResult.extracted_codes,
      companyProfile,
      balanceSheetDelta,
      hasBalanceSheet,
      hasProfitLoss,
      hasNotes,
      hasManagementReport
    );

    // Add gate warnings
    warnings.push(...preAnalysisGates.warning_issues);

    // 10. Build metadata
    const metadata: ParserExtractionMetadata = {
      schema_version: EXTRACTION_SCHEMA_VERSION,
      code_dictionary_version: CODE_DICTIONARY_VERSION,
      extraction_timestamp: new Date().toISOString(),
      document_language: detectLanguage(documentAIResult.text),
      unit_scale: unitScaleDetection.detected_scale,
      unit_scale_validated: !unitScaleDetection.unit_scale_uncertain,
      account_type: companyProfile.account_type,
      company_size: companyProfile.company_size,
      reporting_standard: companyProfile.reporting_standard,
      overall_confidence: calculateOverallConfidence(referenceColumnResult.extracted_codes),
      extraction_warnings: warnings,
      reference_column_detected: referenceColumnResult.has_reference_column,
    };

    // 11. Build structured extraction
    const extraction: ParserStructuredExtraction = {
      metadata,
      company_profile: companyProfile,
      canonical_balance_sheet: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        line_items: canonicalLineItems.filter(item =>
          item.ecdf_code && (item.ecdf_code.startsWith('1') || item.ecdf_code.startsWith('4'))
        ),
      },
      canonical_profit_loss: {
        net_profit_loss: getValueByCode(canonicalLineItems, '9910'),
        line_items: canonicalLineItems.filter(item =>
          item.ecdf_code && (item.ecdf_code.startsWith('6') || item.ecdf_code.startsWith('7') || item.ecdf_code.startsWith('8') || item.ecdf_code.startsWith('9'))
        ),
      },
      deterministic_metrics: metrics,
      extracted_notes: [], // Would need dedicated note extraction
      ic_transactions_from_notes: [], // Would need IC transaction extraction
      related_party_transactions: [], // Would need related party extraction
      management_report_summary: null, // Would need management report extraction
      far_context: null, // Would need FAR context extraction
      ownership_structure: null, // Would need ownership extraction
      pre_analysis_gates: preAnalysisGates,
      validation_dashboard: {
        blocking_issues: preAnalysisGates.blocking_issues,
        warnings: warnings,
        arithmetic_errors: [],
        substance_warnings: companyProfile.soparfi_indicators.is_likely_soparfi
          ? ['SOPARFI indicators detected - substance risk analysis recommended']
          : [],
        completeness_issues: preAnalysisGates.data_quality_gate.missing_critical_data,
        volatility_alerts: metrics.yoy_analysis?.significant_volatility.map(v => v.tp_relevance) || [],
        unit_scale_evidence: unitScaleDetection.evidence,
        overall_status: preAnalysisGates.readiness_level === 'BLOCKED' ? 'blocked' :
                        preAnalysisGates.readiness_level === 'READY_LIMITED' ? 'warnings' : 'ok',
      },
    };

    return {
      success: true,
      extraction,
      warnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    return {
      success: false,
      extraction: null,
      error: errorMessage,
      warnings,
    };
  }
}

/**
 * Build canonical line items from extracted codes
 */
function buildCanonicalLineItems(
  extractedCodes: ExtractedCode[],
  unitScale: string
): ParserCanonicalLineItem[] {
  return extractedCodes.map(code => {
    const codeDef = getCodeDefinition(code.code);

    return {
      ecdf_code: code.code,
      caption_original: code.caption,
      caption_normalized: codeDef?.caption_en || code.caption,
      value_current_year: code.current_year_value,
      value_prior_year: code.prior_year_value,
      unit_scale: unitScale as 'UNITS' | 'THOUSANDS' | 'MILLIONS',
      raw_value_string: code.raw_value_string,
      extraction_confidence: code.confidence,
      match_source: code.match_source,
      is_total: codeDef?.is_total || false,
      parent_code: codeDef?.parent_code,
      note_reference: codeDef?.note_reference,
      linked_note_data: null,
      source_page: code.page_number,
      tp_priority: codeDef?.tp_priority || 'low',
    };
  });
}

/**
 * Get value by code from canonical line items
 */
function getValueByCode(items: ParserCanonicalLineItem[], code: string): number | null {
  const item = items.find(i => i.ecdf_code === code);
  return item?.value_current_year ?? null;
}

/**
 * Extract employee count from text
 */
function extractEmployeeCount(text: string): number | null {
  const patterns = [
    /(?:average\s+)?(?:number\s+of\s+)?employees?\s*[:\s]*\s*(\d+)/i,
    /(?:effectif\s+moyen|personnel)\s*[:\s]*\s*(\d+)/i,
    /(?:mitarbeiter|beschäftigte)\s*[:\s]*\s*(\d+)/i,
    /(\d+)\s*(?:employees?|salariés?|mitarbeiter)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (!isNaN(count) && count < 100000) {
        return count;
      }
    }
  }

  return null;
}

/**
 * Detect document language
 */
function detectLanguage(text: string): 'en' | 'fr' | 'de' | 'unknown' {
  const lowerText = text.toLowerCase();

  // Count language-specific words
  const frenchWords = ['entreprise', 'société', 'exercice', 'bilan', 'compte', 'résultat', 'annexe'];
  const germanWords = ['unternehmen', 'gesellschaft', 'geschäftsjahr', 'bilanz', 'gewinn', 'verlust'];
  const englishWords = ['company', 'financial', 'year', 'balance', 'sheet', 'profit', 'loss', 'notes'];

  const frenchCount = frenchWords.filter(w => lowerText.includes(w)).length;
  const germanCount = germanWords.filter(w => lowerText.includes(w)).length;
  const englishCount = englishWords.filter(w => lowerText.includes(w)).length;

  if (frenchCount > germanCount && frenchCount > englishCount) return 'fr';
  if (germanCount > frenchCount && germanCount > englishCount) return 'de';
  if (englishCount > 0) return 'en';

  return 'unknown';
}

/**
 * Calculate overall extraction confidence
 */
function calculateOverallConfidence(extractedCodes: ExtractedCode[]): number {
  if (extractedCodes.length === 0) return 0;

  const totalConfidence = extractedCodes.reduce((sum, c) => sum + c.confidence, 0);
  return totalConfidence / extractedCodes.length;
}

// Re-export types and utilities
export { CODE_DICTIONARY_VERSION, TP_CRITICAL_PCN_CODES } from './code-dictionary';
export type { UnitScaleDetection } from './unit-scale';
export type { ExtractedCode } from './reference-column-extractor';
export type { CompanyProfile, CompanySize, AccountType, ReportingStandard } from './company-profile';
export type { PreAnalysisGates, AnalysisReadinessLevel } from './pre-analysis-gates';
export type { DeterministicMetrics } from './deterministic-metrics';
