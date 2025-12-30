// src/components/analysis/metrics-summary.tsx
// Summary grid of key metrics from analysis

'use client';

import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TPAnalysisResult } from '@/lib/types/analysis';

interface MetricsSummaryProps {
  metrics: TPAnalysisResult['metrics'];
  flags: TPAnalysisResult['flags'];
}

export function MetricsSummary({ metrics, flags }: MetricsSummaryProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const formatBps = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value.toFixed(0)} bps`;
  };

  const formatRatio = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toFixed(2);
  };

  return (
    <div className="space-y-4">
      {/* IC Position Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">IC Position Summary</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total IC Positions"
              value={formatCurrency(metrics.total_ic_positions)}
              highlight={metrics.total_ic_positions > 10000000}
            />
            <MetricCard
              label="IC Loans Granted"
              value={formatCurrency(metrics.ic_loans_granted)}
            />
            <MetricCard
              label="IC Loans Received"
              value={formatCurrency(metrics.ic_loans_received)}
            />
            <MetricCard
              label="Net IC Position"
              value={formatCurrency(metrics.ic_loans_granted - metrics.ic_loans_received)}
              negative={(metrics.ic_loans_granted - metrics.ic_loans_received) < 0}
            />
          </div>
        </CardBody>
      </Card>

      {/* Interest Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Interest Analysis</h3>
            {flags.has_zero_spread && (
              <Badge className="bg-red-100 text-red-700">Zero Spread Detected</Badge>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard
              label="IC Interest Income"
              value={formatCurrency(metrics.ic_interest_income)}
            />
            <MetricCard
              label="IC Interest Expense"
              value={formatCurrency(metrics.ic_interest_expense)}
            />
            <MetricCard
              label="Implied Lending Rate"
              value={formatPercentage(metrics.implied_lending_rate)}
            />
            <MetricCard
              label="Implied Borrowing Rate"
              value={formatPercentage(metrics.implied_borrowing_rate)}
            />
            <MetricCard
              label="IC Spread"
              value={formatBps(metrics.ic_spread_bps)}
              warning={
                metrics.ic_spread_bps !== null &&
                (metrics.ic_spread_bps < 25 || metrics.ic_spread_bps > 75)
              }
              highlight={metrics.ic_spread_bps !== null && metrics.ic_spread_bps === 0}
            />
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Benchmark range: 25-75 bps above reference rate
          </div>
        </CardBody>
      </Card>

      {/* Capital Structure */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Capital Structure</h3>
            {flags.has_thin_cap_risk && (
              <Badge className="bg-red-100 text-red-700">Thin Cap Risk</Badge>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              label="Debt/Equity Ratio"
              value={formatRatio(metrics.debt_equity_ratio)}
              warning={metrics.debt_equity_ratio !== null && metrics.debt_equity_ratio > 5.67} // 85:15
            />
            <MetricCard
              label="Effective Tax Rate"
              value={formatPercentage(metrics.effective_tax_rate)}
            />
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-2">Thin Cap Safe Harbor</div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    metrics.debt_equity_ratio !== null && metrics.debt_equity_ratio <= 5.67
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-sm font-medium">
                  {metrics.debt_equity_ratio !== null && metrics.debt_equity_ratio <= 5.67
                    ? 'Within safe harbor (85:15)'
                    : 'Exceeds safe harbor'}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Risk Flags Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Risk Flags</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <FlagIndicator label="Zero Spread" active={flags.has_zero_spread} />
            <FlagIndicator label="Thin Cap Risk" active={flags.has_thin_cap_risk} />
            <FlagIndicator label="Unremunerated Guarantee" active={flags.has_unremunerated_guarantee} />
            <FlagIndicator label="Undocumented Services" active={flags.has_undocumented_services} />
            <FlagIndicator label="Substance Concerns" active={flags.has_substance_concerns} />
            <FlagIndicator label="Related Party Issues" active={flags.has_related_party_issues} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  highlight?: boolean;
  warning?: boolean;
  negative?: boolean;
}

function MetricCard({ label, value, highlight, warning, negative }: MetricCardProps) {
  const getBgColor = () => {
    if (highlight) return 'bg-red-50 border-red-200';
    if (warning) return 'bg-yellow-50 border-yellow-200';
    return 'bg-gray-50 border-gray-100';
  };

  const getTextColor = () => {
    if (highlight) return 'text-red-700';
    if (warning) return 'text-yellow-700';
    if (negative) return 'text-red-600';
    return 'text-gray-900';
  };

  return (
    <div className={`p-4 rounded-lg border ${getBgColor()}`}>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${getTextColor()}`}>{value}</div>
    </div>
  );
}

interface FlagIndicatorProps {
  label: string;
  active: boolean;
}

function FlagIndicator({ label, active }: FlagIndicatorProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded">
      <div
        className={`w-3 h-3 rounded-full ${active ? 'bg-red-500' : 'bg-green-500'}`}
      />
      <span className={`text-sm ${active ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
  );
}
