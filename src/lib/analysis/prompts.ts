// src/lib/analysis/prompts.ts
// TP Analysis prompt builder - CRITICAL: Claude receives PRE-COMPUTED metrics only

import type { ParserStructuredExtraction } from '@/lib/parser';

/**
 * Build the system prompt for TP analysis
 */
export function buildTPSystemPrompt(): string {
  return `You are an expert Luxembourg Transfer Pricing analyst. You analyze financial statements to identify transfer pricing opportunities, risks, and compliance issues.

CRITICAL OPERATING RULES:

1. DATA USAGE - MANDATORY:
   - USE the deterministic_metrics provided - DO NOT recalculate any arithmetic
   - If a metric is null or flagged incomplete, output "insufficient data"
   - NEVER estimate or infer missing amounts
   - CITE data_references (pcn_code, page, note_ref) for EVERY conclusion
   - Respect status fields: 'not_disclosed' ≠ 'zero'

2. PCN CODE CITATION - MANDATORY:
   - EVERY identified opportunity MUST cite specific PCN codes
   - Format: "Based on PCN 1171 (IC Receivables: €X) and PCN 6311 (IC Interest: €Y)..."
   - If an opportunity cannot be supported by specific PCN codes, DO NOT include it
   - This enables instant verification by TP professionals

3. ANALYSIS READINESS LEVEL:
   - Check readiness_level BEFORE generating opportunities
   - READY_FULL: All opportunity types allowed
   - READY_LIMITED: Only allowed_opportunity_types, label as "Limited Analysis"
   - BLOCKED: Return "Analysis blocked - see blocking_issues"

4. CONSOLIDATION AWARENESS:
   - If is_consolidated = true: IC may be eliminated, note limitations
   - Focus on group-level indicators for consolidated accounts

5. ABRIDGED ACCOUNTS:
   - If account_type = 'ABRIDGED': DO NOT calculate margin metrics
   - Focus on: IC financing, debt/equity, substance indicators

6. NOTE 7TER INTERPRETATION - CRITICAL:
   - Note 7ter ONLY shows transactions NOT at arm's length
   - "No 7ter entries" does NOT mean "all IC is arm's length"
   - It could mean: all IC IS arm's length, OR company is exempt, OR disclosure incomplete

7. REGULATORY REFERENCES:
   - OECD Transfer Pricing Guidelines (2022)
   - Luxembourg Article 56/56bis Income Tax Law
   - Luxembourg TP Circular LIR 56/1 and 56bis/1
   - Thin cap safe harbor: 85:15 debt-to-equity
   - IC financing spread benchmark: 25-75 bps above reference rate

OUTPUT FORMAT:
You must respond with valid JSON matching the TPAnalysisResult schema.
Include all required fields with proper typing.`;
}

/**
 * Build the TP analysis prompt with extraction data
 * CRITICAL: Only includes structured JSON, never PDF content
 */
export function buildTPAnalysisPrompt(extraction: ParserStructuredExtraction): string {
  const {
    metadata,
    company_profile,
    canonical_balance_sheet,
    canonical_profit_loss,
    deterministic_metrics,
    ic_transactions_from_notes,
    related_party_transactions,
    pre_analysis_gates,
    validation_dashboard,
  } = extraction;

  // Prepare sanitized data for Claude
  const analysisInput = {
    // Metadata context
    metadata: {
      schema_version: metadata.schema_version,
      document_language: metadata.document_language,
      unit_scale: metadata.unit_scale,
      unit_scale_validated: metadata.unit_scale_validated,
      account_type: metadata.account_type,
      company_size: metadata.company_size,
      reporting_standard: metadata.reporting_standard,
      overall_confidence: metadata.overall_confidence,
      extraction_warnings: metadata.extraction_warnings,
    },

    // Company profile
    company_profile: {
      name: company_profile.name,
      rcs_number: company_profile.rcs_number,
      legal_form: company_profile.legal_form,
      company_size: company_profile.company_size,
      account_type: company_profile.account_type,
      is_consolidated: company_profile.is_consolidated,
      average_employees: company_profile.average_employees,
      soparfi_indicators: company_profile.soparfi_indicators,
    },

    // Pre-analysis gates - Claude must check these
    pre_analysis_gates: {
      readiness_level: pre_analysis_gates.readiness_level,
      can_proceed_to_analysis: pre_analysis_gates.can_proceed_to_analysis,
      blocking_issues: pre_analysis_gates.blocking_issues,
      warning_issues: pre_analysis_gates.warning_issues,
      unit_scale_validated: pre_analysis_gates.unit_scale_validated,
      balance_sheet_balances: pre_analysis_gates.balance_sheet_balances,
      consolidation_gate: pre_analysis_gates.consolidation_gate,
      mapping_gate: {
        high_confidence_pct: pre_analysis_gates.mapping_gate.high_confidence_pct,
        tp_critical_codes_affected: pre_analysis_gates.mapping_gate.tp_critical_codes_affected,
      },
      data_quality_gate: pre_analysis_gates.data_quality_gate,
      limited_mode_rules: pre_analysis_gates.limited_mode_rules,
      module_trust_levels: pre_analysis_gates.module_trust_levels,
    },

    // Balance Sheet summary
    balance_sheet: {
      total_assets: canonical_balance_sheet.total_assets,
      total_liabilities: canonical_balance_sheet.total_liabilities,
      // Include TP-critical line items with PCN codes
      tp_critical_items: canonical_balance_sheet.line_items
        .filter((item) => item.tp_priority === 'high' || item.tp_priority === 'medium')
        .map((item) => ({
          pcn_code: item.ecdf_code,
          caption: item.caption_normalized,
          current_year: item.value_current_year,
          prior_year: item.value_prior_year,
          confidence: item.extraction_confidence,
          source_page: item.source_page,
          note_reference: item.note_reference,
        })),
    },

    // Profit & Loss summary
    profit_loss: {
      net_profit_loss: canonical_profit_loss.net_profit_loss,
      // Include TP-critical line items
      tp_critical_items: canonical_profit_loss.line_items
        .filter((item) => item.tp_priority === 'high' || item.tp_priority === 'medium')
        .map((item) => ({
          pcn_code: item.ecdf_code,
          caption: item.caption_normalized,
          current_year: item.value_current_year,
          prior_year: item.value_prior_year,
          confidence: item.extraction_confidence,
          source_page: item.source_page,
        })),
    },

    // PRE-COMPUTED deterministic metrics - Claude MUST use these
    deterministic_metrics: {
      // Profitability
      gross_margin_pct: deterministic_metrics.gross_margin_pct,
      operating_margin_pct: deterministic_metrics.operating_margin_pct,
      net_margin_pct: deterministic_metrics.net_margin_pct,
      ebitda: deterministic_metrics.ebitda,
      ebitda_margin_pct: deterministic_metrics.ebitda_margin_pct,

      // Leverage
      debt_to_equity_ratio: deterministic_metrics.debt_to_equity_ratio,
      ic_debt_to_total_debt_ratio: deterministic_metrics.ic_debt_to_total_debt_ratio,
      ic_debt_to_equity_ratio: deterministic_metrics.ic_debt_to_equity_ratio,
      interest_coverage_ratio: deterministic_metrics.interest_coverage_ratio,

      // Activity
      asset_turnover_ratio: deterministic_metrics.asset_turnover_ratio,
      ic_receivables_to_total_assets_pct: deterministic_metrics.ic_receivables_to_total_assets_pct,
      ic_payables_to_total_liabilities_pct: deterministic_metrics.ic_payables_to_total_liabilities_pct,

      // TP-Specific
      staff_cost_to_revenue_pct: deterministic_metrics.staff_cost_to_revenue_pct,
      financial_assets_to_total_assets_pct: deterministic_metrics.financial_assets_to_total_assets_pct,
      ic_interest_income: deterministic_metrics.ic_interest_income,
      ic_interest_expense: deterministic_metrics.ic_interest_expense,
      implied_ic_lending_rate_pct: deterministic_metrics.implied_ic_lending_rate_pct,
      implied_ic_borrowing_rate_pct: deterministic_metrics.implied_ic_borrowing_rate_pct,

      // YoY Analysis
      yoy_analysis: deterministic_metrics.yoy_analysis,

      // What couldn't be calculated
      metrics_not_calculable: deterministic_metrics.metrics_not_calculable,
    },

    // IC transactions from notes
    ic_transactions: ic_transactions_from_notes.map((tx) => ({
      type: tx.transaction_type,
      counterparty: tx.counterparty,
      counterparty_country: tx.counterparty_country,
      amount: tx.amount,
      currency: tx.currency,
      interest_rate: tx.interest_rate,
      maturity: tx.maturity,
      is_subordinated: tx.is_subordinated,
      source_page: tx.source_page,
      source_note: tx.source_note,
      pcn_code: tx.ecdf_code,
      confidence: tx.extraction_confidence,
    })),

    // Related party transactions (Note 7ter) - PRIORITY
    related_party_transactions: related_party_transactions.map((tx) => ({
      nature: tx.nature,
      counterparty: tx.counterparty,
      relationship: tx.relationship,
      amount: tx.amount,
      is_arms_length: tx.is_arms_length,
      terms_description: tx.terms_description,
      source_page: tx.source_page,
      source_note: tx.source_note,
    })),

    // Validation status
    validation_status: {
      overall_status: validation_dashboard.overall_status,
      blocking_issues: validation_dashboard.blocking_issues,
      warnings: validation_dashboard.warnings,
      substance_warnings: validation_dashboard.substance_warnings,
    },
  };

  const prompt = `Analyze the following Luxembourg company financial data for Transfer Pricing opportunities and risks.

EXTRACTION DATA (JSON):
${JSON.stringify(analysisInput, null, 2)}

ANALYSIS REQUIREMENTS:

1. First check pre_analysis_gates.readiness_level:
   - If BLOCKED: Return analysis_blocked = true with blocking_issues
   - If READY_LIMITED: Only generate opportunities from allowed types
   - If READY_FULL: Proceed with full analysis

2. Classify the company (operational/holding/financing/IP holding/mixed)

3. Analyze IC Financing:
   - Use implied_ic_lending_rate_pct and implied_ic_borrowing_rate_pct from deterministic_metrics
   - Compare to benchmark (25-75 bps spread)
   - Flag zero-spread if rates are identical or spread < 10 bps

4. Check thin capitalization:
   - Use debt_to_equity_ratio from deterministic_metrics
   - Flag if ratio > 85:15 (debt:equity)

5. Analyze substance:
   - Check average_employees and staff_cost_to_revenue_pct
   - Check soparfi_indicators if flagged
   - Flag if high IC positions with low substance

6. Review Note 7ter transactions:
   - Flag any non-arm's length transactions
   - Remember: absence of 7ter entries ≠ all IC is arm's length

7. For each opportunity identified:
   - MUST cite specific PCN codes (e.g., "PCN 1171", "PCN 4279")
   - Include affected_amount from extraction
   - Include source_page references
   - Include regulatory_reference (Art. 56bis, Circular 56/1, etc.)

8. Calculate risk_score (0-100) based on:
   - IC position size relative to total assets
   - Zero-spread flag
   - Thin cap flag
   - Note 7ter issues
   - Substance concerns
   - Data quality

9. Generate executive_summary with key PCN codes cited

Respond with a valid JSON object matching the TPAnalysisResult schema.`;

  return prompt;
}

/**
 * Build a minimal prompt for testing
 */
export function buildTestPrompt(): string {
  return `Respond with a simple JSON: {"status": "ok", "message": "Claude API connection successful"}`;
}
