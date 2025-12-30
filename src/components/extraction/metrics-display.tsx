// src/components/extraction/metrics-display.tsx
// Displays deterministic metrics computed from extraction

'use client';

import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DeterministicMetrics } from '@/lib/parser';

interface MetricsDisplayProps {
  metrics: DeterministicMetrics;
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Profitability Metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Profitability Metrics</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard
              label="Gross Margin"
              value={metrics.gross_margin_pct}
              format="percentage"
            />
            <MetricCard
              label="Operating Margin"
              value={metrics.operating_margin_pct}
              format="percentage"
            />
            <MetricCard
              label="Net Margin"
              value={metrics.net_margin_pct}
              format="percentage"
            />
            <MetricCard
              label="EBITDA"
              value={metrics.ebitda}
              format="currency"
            />
            <MetricCard
              label="EBITDA Margin"
              value={metrics.ebitda_margin_pct}
              format="percentage"
            />
          </div>
        </CardBody>
      </Card>

      {/* Leverage Metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Leverage Metrics</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Debt to Equity"
              value={metrics.debt_to_equity_ratio}
              format="ratio"
            />
            <MetricCard
              label="IC Debt / Total Debt"
              value={metrics.ic_debt_to_total_debt_ratio}
              format="percentage"
              highlight={metrics.ic_debt_to_total_debt_ratio !== null && metrics.ic_debt_to_total_debt_ratio > 0.5}
            />
            <MetricCard
              label="IC Debt / Equity"
              value={metrics.ic_debt_to_equity_ratio}
              format="ratio"
              highlight={metrics.ic_debt_to_equity_ratio !== null && metrics.ic_debt_to_equity_ratio > 3}
            />
            <MetricCard
              label="Interest Coverage"
              value={metrics.interest_coverage_ratio}
              format="ratio"
              warning={metrics.interest_coverage_ratio !== null && metrics.interest_coverage_ratio < 2}
            />
          </div>
        </CardBody>
      </Card>

      {/* Activity Metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Activity Metrics</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              label="Asset Turnover"
              value={metrics.asset_turnover_ratio}
              format="ratio"
            />
            <MetricCard
              label="IC Receivables / Assets"
              value={metrics.ic_receivables_to_total_assets_pct}
              format="percentage"
              highlight={metrics.ic_receivables_to_total_assets_pct !== null && metrics.ic_receivables_to_total_assets_pct > 30}
            />
            <MetricCard
              label="IC Payables / Liabilities"
              value={metrics.ic_payables_to_total_liabilities_pct}
              format="percentage"
              highlight={metrics.ic_payables_to_total_liabilities_pct !== null && metrics.ic_payables_to_total_liabilities_pct > 50}
            />
          </div>
        </CardBody>
      </Card>

      {/* TP-Specific Metrics */}
      <Card className="border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">TP-Specific Metrics</h3>
            <Badge className="bg-blue-100 text-blue-700">Transfer Pricing</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Staff Cost / Revenue"
              value={metrics.staff_cost_to_revenue_pct}
              format="percentage"
              warning={metrics.staff_cost_to_revenue_pct !== null && metrics.staff_cost_to_revenue_pct < 5}
            />
            <MetricCard
              label="External Charges / Revenue"
              value={metrics.external_charges_to_revenue_pct}
              format="percentage"
            />
            <MetricCard
              label="Financial Assets / Assets"
              value={metrics.financial_assets_to_total_assets_pct}
              format="percentage"
              highlight={metrics.financial_assets_to_total_assets_pct !== null && metrics.financial_assets_to_total_assets_pct > 80}
            />
            <MetricCard
              label="IC Interest Income"
              value={metrics.ic_interest_income}
              format="currency"
            />
            <MetricCard
              label="IC Interest Expense"
              value={metrics.ic_interest_expense}
              format="currency"
            />
            <MetricCard
              label="Implied IC Lending Rate"
              value={metrics.implied_ic_lending_rate_pct}
              format="percentage"
              highlight={metrics.implied_ic_lending_rate_pct !== null}
            />
            <MetricCard
              label="Implied IC Borrowing Rate"
              value={metrics.implied_ic_borrowing_rate_pct}
              format="percentage"
              highlight={metrics.implied_ic_borrowing_rate_pct !== null}
            />
          </div>
        </CardBody>
      </Card>

      {/* YoY Analysis */}
      {metrics.yoy_analysis && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Year-over-Year Analysis</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <MetricCard
                label="Turnover Change"
                value={metrics.yoy_analysis.turnover_change_pct}
                format="percentage"
                showSign
              />
              <MetricCard
                label="Margin Change"
                value={metrics.yoy_analysis.margin_change_pp}
                format="percentage"
                showSign
              />
              <MetricCard
                label="IC Debt Change"
                value={metrics.yoy_analysis.ic_debt_change_pct}
                format="percentage"
                showSign
              />
              <MetricCard
                label="Staff Cost Change"
                value={metrics.yoy_analysis.staff_cost_change_pct}
                format="percentage"
                showSign
              />
              <MetricCard
                label="Rate Change (bps)"
                value={metrics.yoy_analysis.interest_rate_change_bps}
                format="number"
                showSign
              />
            </div>

            {/* Volatility Flags */}
            {metrics.yoy_analysis.significant_volatility.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Significant Volatility Detected</h4>
                <div className="space-y-2">
                  {metrics.yoy_analysis.significant_volatility.map((flag, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <span className="text-yellow-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{flag.metric}</span>
                          <Badge
                            className={
                              flag.direction === 'increase'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            {flag.direction === 'increase' ? '+' : ''}
                            {flag.change.toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{flag.tp_relevance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Metrics Not Calculable */}
      {metrics.metrics_not_calculable.length > 0 && (
        <Card className="border-gray-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-600">
              Metrics Not Calculable ({metrics.metrics_not_calculable.length})
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {metrics.metrics_not_calculable.map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-gray-400">-</span>
                  <div>
                    <span className="font-medium">{item.metric_name}:</span>{' '}
                    {item.reason}
                    {item.missing_inputs.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {' '}(missing: {item.missing_inputs.join(', ')})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | null;
  format: 'percentage' | 'ratio' | 'currency' | 'number';
  highlight?: boolean;
  warning?: boolean;
  showSign?: boolean;
}

function MetricCard({ label, value, format, highlight, warning, showSign }: MetricCardProps) {
  const formatValue = () => {
    if (value === null) return 'N/A';

    switch (format) {
      case 'percentage':
        const sign = showSign && value > 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'number':
        const numSign = showSign && value > 0 ? '+' : '';
        return `${numSign}${value.toFixed(0)}`;
      default:
        return value.toString();
    }
  };

  const getBorderColor = () => {
    if (warning) return 'border-l-red-500';
    if (highlight) return 'border-l-blue-500';
    return 'border-l-gray-200';
  };

  const getTextColor = () => {
    if (value === null) return 'text-gray-400';
    if (warning) return 'text-red-600';
    if (highlight) return 'text-blue-600';
    return 'text-gray-900';
  };

  return (
    <div className={`p-3 bg-gray-50 rounded-lg border-l-4 ${getBorderColor()}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${getTextColor()}`}>{formatValue()}</div>
    </div>
  );
}
