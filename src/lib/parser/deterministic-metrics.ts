// src/lib/parser/deterministic-metrics.ts
// CRITICAL: All metrics computed deterministically here, NOT in Claude

import type { ExtractedCode } from './reference-column-extractor';
import type { UnitScale } from './unit-scale';
import { applyScale } from './unit-scale';

export interface DeterministicMetrics {
  // Profitability
  gross_margin_pct: number | null;
  operating_margin_pct: number | null;
  net_margin_pct: number | null;
  ebitda: number | null;
  ebitda_margin_pct: number | null;

  // Leverage
  debt_to_equity_ratio: number | null;
  ic_debt_to_total_debt_ratio: number | null;
  ic_debt_to_equity_ratio: number | null;
  interest_coverage_ratio: number | null;

  // Activity
  asset_turnover_ratio: number | null;
  ic_receivables_to_total_assets_pct: number | null;
  ic_payables_to_total_liabilities_pct: number | null;

  // TP-Specific
  staff_cost_to_revenue_pct: number | null;
  external_charges_to_revenue_pct: number | null;
  financial_assets_to_total_assets_pct: number | null;
  ic_interest_income: number | null;
  ic_interest_expense: number | null;
  implied_ic_lending_rate_pct: number | null;
  implied_ic_borrowing_rate_pct: number | null;

  // YoY Analysis
  yoy_analysis: YoYAnalysis | null;

  // Metrics not calculable
  metrics_not_calculable: MetricNotCalculable[];
}

export interface YoYAnalysis {
  turnover_change_pct: number | null;
  margin_change_pp: number | null; // percentage points
  ic_debt_change_pct: number | null;
  staff_cost_change_pct: number | null;
  interest_rate_change_bps: number | null; // basis points

  // Volatility flags
  significant_volatility: VolatilityFlag[];
}

export interface VolatilityFlag {
  metric: string;
  change: number;
  threshold: number;
  direction: 'increase' | 'decrease';
  tp_relevance: string;
}

export interface MetricNotCalculable {
  metric_name: string;
  reason: string;
  missing_inputs: string[];
}

/**
 * Compute all deterministic metrics from extracted codes
 */
export function computeDeterministicMetrics(
  currentYearCodes: ExtractedCode[],
  priorYearCodes: ExtractedCode[] | null,
  unitScale: UnitScale
): DeterministicMetrics {
  const metricsNotCalculable: MetricNotCalculable[] = [];

  // Helper to get value by code
  const getValue = (codes: ExtractedCode[], code: string): number | null => {
    const found = codes.find(c => c.code === code);
    if (!found || found.current_year_value === null) return null;
    return applyScale(found.current_year_value, unitScale);
  };

  const getPriorValue = (code: string): number | null => {
    if (!priorYearCodes) return null;
    const found = priorYearCodes.find(c => c.code === code);
    if (!found || found.prior_year_value === null) return null;
    return applyScale(found.prior_year_value, unitScale);
  };

  // Get key values
  const netTurnover = getValue(currentYearCodes, '7010');
  const otherOperatingIncome = getValue(currentYearCodes, '7410') || 0;
  const rawMaterials = getValue(currentYearCodes, '6010') || 0;
  const externalCharges = getValue(currentYearCodes, '6020') || getValue(currentYearCodes, '6040') || 0;
  const staffCosts = (getValue(currentYearCodes, '6410') || 0) +
                     (getValue(currentYearCodes, '6420') || 0) +
                     (getValue(currentYearCodes, '6430') || 0);
  const depreciation = (getValue(currentYearCodes, '6510') || 0) +
                       (getValue(currentYearCodes, '6520') || 0);
  const otherOperatingExpenses = getValue(currentYearCodes, '6610') || 0;
  const netProfit = getValue(currentYearCodes, '9910');
  const taxOnProfit = getValue(currentYearCodes, '8610') || 0;

  const totalAssets = getValue(currentYearCodes, '109');
  const totalEquity = (getValue(currentYearCodes, '1011L') || 0) +
                      (getValue(currentYearCodes, '1061') || 0) +
                      (getValue(currentYearCodes, '1069') || 0) +
                      (getValue(currentYearCodes, '1071') || 0) +
                      (getValue(currentYearCodes, '1073') || 0);

  // IC balances
  const icReceivablesLT = getValue(currentYearCodes, '1171') || 0;
  const icReceivablesST = getValue(currentYearCodes, '4111') || 0;
  const icPayablesLT = getValue(currentYearCodes, '1379') || 0;
  const icPayablesST = getValue(currentYearCodes, '4279') || 0;
  const totalIcReceivables = icReceivablesLT + icReceivablesST;
  const totalIcPayables = icPayablesLT + icPayablesST;

  // Financial assets
  const participations = getValue(currentYearCodes, '1151') || 0;

  // Interest
  const icInterestIncome = getValue(currentYearCodes, '7610');
  const icInterestExpense = getValue(currentYearCodes, '7710');
  const otherInterestIncome = getValue(currentYearCodes, '7620') || 0;
  const otherInterestExpense = getValue(currentYearCodes, '7720') || 0;

  // Calculate profitability metrics
  let grossMarginPct: number | null = null;
  let operatingMarginPct: number | null = null;
  let netMarginPct: number | null = null;
  let ebitda: number | null = null;
  let ebitdaMarginPct: number | null = null;

  if (netTurnover !== null && netTurnover > 0) {
    const grossProfit = netTurnover - rawMaterials - externalCharges;
    grossMarginPct = (grossProfit / netTurnover) * 100;

    const operatingProfit = grossProfit - staffCosts - depreciation - otherOperatingExpenses + otherOperatingIncome;
    operatingMarginPct = (operatingProfit / netTurnover) * 100;

    if (netProfit !== null) {
      netMarginPct = (netProfit / netTurnover) * 100;
    }

    ebitda = operatingProfit + depreciation;
    ebitdaMarginPct = (ebitda / netTurnover) * 100;
  } else {
    metricsNotCalculable.push({
      metric_name: 'profitability_ratios',
      reason: 'Net turnover is zero or not available',
      missing_inputs: ['7010'],
    });
  }

  // Calculate leverage metrics
  let debtToEquityRatio: number | null = null;
  let icDebtToTotalDebtRatio: number | null = null;
  let icDebtToEquityRatio: number | null = null;
  let interestCoverageRatio: number | null = null;

  const totalDebt = icPayablesLT + icPayablesST +
                    (getValue(currentYearCodes, '1391') || 0) +
                    (getValue(currentYearCodes, '4291') || 0);

  if (totalEquity > 0) {
    debtToEquityRatio = totalDebt / totalEquity;
    icDebtToEquityRatio = totalIcPayables / totalEquity;
  } else {
    metricsNotCalculable.push({
      metric_name: 'equity_ratios',
      reason: 'Total equity is zero or negative',
      missing_inputs: ['equity_components'],
    });
  }

  if (totalDebt > 0) {
    icDebtToTotalDebtRatio = totalIcPayables / totalDebt;
  }

  const totalInterestExpense = (icInterestExpense || 0) + otherInterestExpense;
  if (totalInterestExpense > 0 && ebitda !== null) {
    interestCoverageRatio = ebitda / totalInterestExpense;
  }

  // Calculate activity metrics
  let assetTurnoverRatio: number | null = null;
  let icReceivablesToTotalAssetsPct: number | null = null;
  let icPayablesToTotalLiabilitiesPct: number | null = null;

  if (totalAssets !== null && totalAssets > 0) {
    if (netTurnover !== null) {
      assetTurnoverRatio = netTurnover / totalAssets;
    }
    icReceivablesToTotalAssetsPct = (totalIcReceivables / totalAssets) * 100;
  }

  const totalLiabilities = totalDebt; // Simplified
  if (totalLiabilities > 0) {
    icPayablesToTotalLiabilitiesPct = (totalIcPayables / totalLiabilities) * 100;
  }

  // Calculate TP-specific metrics
  let staffCostToRevenuePct: number | null = null;
  let externalChargesToRevenuePct: number | null = null;
  let financialAssetsToTotalAssetsPct: number | null = null;
  let impliedIcLendingRatePct: number | null = null;
  let impliedIcBorrowingRatePct: number | null = null;

  if (netTurnover !== null && netTurnover > 0) {
    staffCostToRevenuePct = (staffCosts / netTurnover) * 100;
    externalChargesToRevenuePct = (externalCharges / netTurnover) * 100;
  }

  if (totalAssets !== null && totalAssets > 0) {
    financialAssetsToTotalAssetsPct = (participations / totalAssets) * 100;
  }

  // Implied interest rates
  if (icInterestIncome !== null && totalIcReceivables > 0) {
    impliedIcLendingRatePct = (icInterestIncome / totalIcReceivables) * 100;
  }

  if (icInterestExpense !== null && totalIcPayables > 0) {
    impliedIcBorrowingRatePct = (icInterestExpense / totalIcPayables) * 100;
  }

  // YoY Analysis
  let yoyAnalysis: YoYAnalysis | null = null;
  if (priorYearCodes && priorYearCodes.length > 0) {
    yoyAnalysis = computeYoYAnalysis(
      currentYearCodes,
      priorYearCodes,
      unitScale,
      operatingMarginPct,
      impliedIcLendingRatePct
    );
  }

  return {
    gross_margin_pct: grossMarginPct,
    operating_margin_pct: operatingMarginPct,
    net_margin_pct: netMarginPct,
    ebitda,
    ebitda_margin_pct: ebitdaMarginPct,
    debt_to_equity_ratio: debtToEquityRatio,
    ic_debt_to_total_debt_ratio: icDebtToTotalDebtRatio,
    ic_debt_to_equity_ratio: icDebtToEquityRatio,
    interest_coverage_ratio: interestCoverageRatio,
    asset_turnover_ratio: assetTurnoverRatio,
    ic_receivables_to_total_assets_pct: icReceivablesToTotalAssetsPct,
    ic_payables_to_total_liabilities_pct: icPayablesToTotalLiabilitiesPct,
    staff_cost_to_revenue_pct: staffCostToRevenuePct,
    external_charges_to_revenue_pct: externalChargesToRevenuePct,
    financial_assets_to_total_assets_pct: financialAssetsToTotalAssetsPct,
    ic_interest_income: icInterestIncome,
    ic_interest_expense: icInterestExpense,
    implied_ic_lending_rate_pct: impliedIcLendingRatePct,
    implied_ic_borrowing_rate_pct: impliedIcBorrowingRatePct,
    yoy_analysis: yoyAnalysis,
    metrics_not_calculable: metricsNotCalculable,
  };
}

function computeYoYAnalysis(
  currentCodes: ExtractedCode[],
  priorCodes: ExtractedCode[],
  unitScale: UnitScale,
  currentOperatingMargin: number | null,
  currentImpliedRate: number | null
): YoYAnalysis {
  const volatilityFlags: VolatilityFlag[] = [];

  const getValue = (codes: ExtractedCode[], code: string): number | null => {
    const found = codes.find(c => c.code === code);
    if (!found) return null;
    const val = found.current_year_value ?? found.prior_year_value;
    if (val === null) return null;
    return applyScale(val, unitScale);
  };

  // Turnover change
  const currentTurnover = getValue(currentCodes, '7010');
  const priorTurnover = getValue(priorCodes, '7010');
  let turnoverChangePct: number | null = null;

  if (currentTurnover !== null && priorTurnover !== null && priorTurnover > 0) {
    turnoverChangePct = ((currentTurnover - priorTurnover) / priorTurnover) * 100;

    if (Math.abs(turnoverChangePct) > 20) {
      volatilityFlags.push({
        metric: 'Net Turnover',
        change: turnoverChangePct,
        threshold: 20,
        direction: turnoverChangePct > 0 ? 'increase' : 'decrease',
        tp_relevance: 'Significant revenue change may indicate pricing adjustments',
      });
    }
  }

  // IC debt change
  const currentIcDebt = (getValue(currentCodes, '1379') || 0) + (getValue(currentCodes, '4279') || 0);
  const priorIcDebt = (getValue(priorCodes, '1379') || 0) + (getValue(priorCodes, '4279') || 0);
  let icDebtChangePct: number | null = null;

  if (priorIcDebt > 0) {
    icDebtChangePct = ((currentIcDebt - priorIcDebt) / priorIcDebt) * 100;

    if (icDebtChangePct > 50) {
      volatilityFlags.push({
        metric: 'IC Debt',
        change: icDebtChangePct,
        threshold: 50,
        direction: 'increase',
        tp_relevance: 'IC debt spike - potential TP opportunity for financing analysis',
      });
    }
  }

  // Staff cost change
  const currentStaff = (getValue(currentCodes, '6410') || 0) + (getValue(currentCodes, '6420') || 0);
  const priorStaff = (getValue(priorCodes, '6410') || 0) + (getValue(priorCodes, '6420') || 0);
  let staffCostChangePct: number | null = null;

  if (priorStaff > 0) {
    staffCostChangePct = ((currentStaff - priorStaff) / priorStaff) * 100;

    if (staffCostChangePct < -20) {
      volatilityFlags.push({
        metric: 'Staff Costs',
        change: staffCostChangePct,
        threshold: -20,
        direction: 'decrease',
        tp_relevance: 'Staff reduction may indicate substance concerns',
      });
    }
  }

  // Margin change (percentage points)
  let marginChangePp: number | null = null;
  // Would need prior year operating margin calculation

  return {
    turnover_change_pct: turnoverChangePct,
    margin_change_pp: marginChangePp,
    ic_debt_change_pct: icDebtChangePct,
    staff_cost_change_pct: staffCostChangePct,
    interest_rate_change_bps: null, // Would need prior year rate
    significant_volatility: volatilityFlags,
  };
}

/**
 * Format metric for display
 */
export function formatMetric(value: number | null, type: 'percentage' | 'ratio' | 'currency'): string {
  if (value === null) return 'N/A';

  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'ratio':
      return value.toFixed(2);
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    default:
      return value.toString();
  }
}
