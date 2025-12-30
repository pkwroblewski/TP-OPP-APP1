// src/lib/analysis/response-parser.ts
// Parse and validate Claude's analysis response

import type { TPAnalysisResult, TPOpportunity } from '@/lib/types/analysis';

export interface ParseResult {
  success: boolean;
  analysis: TPAnalysisResult | null;
  error?: string;
  rawResponse: string;
  validationWarnings: string[];
}

/**
 * Parse Claude's response into TPAnalysisResult
 * @param response - Claude's raw response
 * @param extractionMetadata - Optional metadata from extraction to fill in defaults
 */
export function parseAnalysisResponse(
  response: string,
  extractionMetadata?: { account_type?: string; company_size?: string }
): ParseResult {
  const validationWarnings: string[] = [];

  // Try to extract JSON from the response
  let jsonStr = response.trim();

  // Handle markdown code blocks
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    // Try to find JSON object in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return {
          success: false,
          analysis: null,
          error: 'Failed to parse JSON from Claude response',
          rawResponse: response,
          validationWarnings: [],
        };
      }
    } else {
      return {
        success: false,
        analysis: null,
        error: 'No valid JSON found in Claude response',
        rawResponse: response,
        validationWarnings: [],
      };
    }
  }

  // Fill in missing simple fields from extraction metadata if available
  const result = parsed as Record<string, unknown>;
  if (extractionMetadata) {
    if (!result.account_type && extractionMetadata.account_type) {
      result.account_type = extractionMetadata.account_type.toLowerCase();
      validationWarnings.push('account_type filled from extraction metadata');
    }
    if (!result.company_size && extractionMetadata.company_size) {
      result.company_size = extractionMetadata.company_size.toLowerCase();
      validationWarnings.push('company_size filled from extraction metadata');
    }
  }

  // Validate the parsed response
  if (!isValidTPAnalysisResult(result)) {
    return {
      success: false,
      analysis: null,
      error: 'Response does not match TPAnalysisResult schema',
      rawResponse: response,
      validationWarnings,
    };
  }

  const analysis = result as TPAnalysisResult;

  // Validate PCN citations in opportunities
  const opportunitiesWithoutCitations = analysis.opportunities.filter(
    (opp) => !hasValidPCNCitations(opp)
  );

  if (opportunitiesWithoutCitations.length > 0) {
    validationWarnings.push(
      `${opportunitiesWithoutCitations.length} opportunities lack proper PCN code citations`
    );
  }

  // Validate data references
  for (const opp of analysis.opportunities) {
    if (!opp.data_references || opp.data_references.length === 0) {
      validationWarnings.push(`Opportunity "${opp.title}" has no data references`);
    }
  }

  // Validate executive summary has citations
  if (!analysis.executive_summary.includes('PCN')) {
    validationWarnings.push('Executive summary does not cite PCN codes');
  }

  return {
    success: true,
    analysis,
    rawResponse: response,
    validationWarnings,
  };
}

/**
 * Check if response matches TPAnalysisResult schema (basic validation)
 */
function isValidTPAnalysisResult(obj: unknown): obj is TPAnalysisResult {
  if (typeof obj !== 'object' || obj === null) return false;

  const result = obj as Record<string, unknown>;

  // Check required fields
  const requiredFields = [
    'account_type',
    'company_size',
    'far_analysis',
    'company_classification',
    'classification_reasoning',
    'opportunities',
    'flags',
    'risk_score',
    'priority_ranking',
    'executive_summary',
    'recommended_actions',
  ];

  for (const field of requiredFields) {
    if (!(field in result)) {
      console.warn(`Missing required field: ${field}`);
      return false;
    }
  }

  // Validate opportunities array
  if (!Array.isArray(result.opportunities)) {
    console.warn('opportunities is not an array');
    return false;
  }

  // Validate each opportunity
  for (const opp of result.opportunities) {
    if (!isValidOpportunity(opp)) {
      console.warn('Invalid opportunity structure');
      return false;
    }
  }

  // Validate risk_score is a number
  if (typeof result.risk_score !== 'number') {
    console.warn('risk_score is not a number');
    return false;
  }

  return true;
}

/**
 * Validate individual opportunity
 */
function isValidOpportunity(obj: unknown): obj is TPOpportunity {
  if (typeof obj !== 'object' || obj === null) return false;

  const opp = obj as Record<string, unknown>;

  const requiredFields = ['type', 'severity', 'title', 'description', 'recommendation'];

  for (const field of requiredFields) {
    if (!(field in opp)) {
      console.warn(`Opportunity missing field: ${field}`);
      return false;
    }
  }

  // Validate severity
  if (!['high', 'medium', 'low'].includes(opp.severity as string)) {
    console.warn('Invalid severity value');
    return false;
  }

  return true;
}

/**
 * Check if opportunity has valid PCN code citations
 */
function hasValidPCNCitations(opportunity: TPOpportunity): boolean {
  // Check description for PCN references
  const pcnPattern = /PCN\s*\d{4}/gi;
  const descHasPCN = pcnPattern.test(opportunity.description);

  // Check data_references
  const hasDataRefs = opportunity.data_references && opportunity.data_references.length > 0;

  return descHasPCN || hasDataRefs;
}

/**
 * Create a default/empty analysis result for blocked cases
 */
export function createBlockedAnalysisResult(
  blockingIssues: string[],
  accountType: string,
  companySize: string
): TPAnalysisResult {
  return {
    account_type: accountType as 'full' | 'abridged',
    company_size: companySize as 'small' | 'medium' | 'large',
    analysis_limitations: ['Analysis blocked due to pre-analysis gate failures', ...blockingIssues],

    far_analysis: {
      functional_analysis: {
        company_type: 'mixed',
        functions_performed: [],
        key_decisions_made: [],
        substance_indicators: {
          has_employees: false,
          employee_count: null,
          has_physical_office: false,
          has_local_management: false,
          is_domiciliation_administered: false,
        },
        functional_classification: 'Unknown - analysis blocked',
      },
      asset_analysis: {
        key_assets_owned: [],
        key_assets_used: [],
        intangible_assets: [],
        asset_intensity_ratio: null,
      },
      risk_analysis: {
        financial_risks: [],
        operational_risks: [],
        market_risks: [],
        risks_controlled: [],
        risks_borne_by_others: [],
      },
    },

    company_classification: 'mixed',
    classification_reasoning: 'Analysis blocked - cannot determine classification',

    ic_financing: {
      total_ic_loans_granted: 0,
      total_ic_loans_received: 0,
      net_ic_position: 0,
      lending_analysis: {
        principal: 0,
        interest_income: 0,
        implied_rate: null,
        maturity_profile: {
          within_one_year: 0,
          after_one_year: 0,
          after_five_years: 0,
        },
        has_subordination: false,
      },
      borrowing_analysis: {
        principal: 0,
        interest_expense: 0,
        implied_rate: null,
        maturity_profile: {
          within_one_year: 0,
          after_one_year: 0,
          after_five_years: 0,
        },
      },
      spread_analysis: {
        ic_spread_bps: null,
        market_benchmark_low: 25,
        market_benchmark_high: 75,
        is_within_benchmark: false,
        spread_assessment: 'unknown',
      },
    },

    metrics: {
      total_ic_positions: 0,
      ic_loans_granted: 0,
      ic_loans_received: 0,
      ic_interest_income: 0,
      ic_interest_expense: 0,
      implied_lending_rate: null,
      implied_borrowing_rate: null,
      ic_spread_bps: null,
      debt_equity_ratio: null,
      effective_tax_rate: null,
    },

    related_party_flags: {
      has_note_7ter_disclosures: false,
      non_arms_length_transactions: 0,
      flagged_transactions: [],
    },

    opportunities: [],

    flags: {
      has_zero_spread: false,
      has_thin_cap_risk: false,
      has_unremunerated_guarantee: false,
      has_undocumented_services: false,
      has_substance_concerns: false,
      has_related_party_issues: false,
    },

    risk_score: 0,
    priority_ranking: 'low',

    executive_summary: `Analysis blocked. Issues: ${blockingIssues.join('; ')}`,
    recommended_actions: ['Resolve blocking issues before analysis can proceed'],

    documentation_gaps: [],
    suggested_benchmarking_studies: [],
  };
}
