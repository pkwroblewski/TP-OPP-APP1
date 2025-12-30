// src/components/extraction/extraction-viewer.tsx
// Main extraction viewer component with tabbed navigation

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ValidationDashboard } from './validation-dashboard';
import { MetricsDisplay } from './metrics-display';
import { FinancialStatements } from './financial-statements';
import { CompanyProfileDisplay } from './company-profile-display';
import type { ParserStructuredExtraction, ParserExtractionMetadata } from '@/lib/parser';

type ViewerTab = 'overview' | 'validation' | 'company' | 'financials' | 'metrics' | 'raw';

interface ExtractionViewerProps {
  extraction: ParserStructuredExtraction;
  financialYearId: string;
  companyName: string;
  yearEnd: string;
  onProceedToAnalysis?: () => void;
}

export function ExtractionViewer({
  extraction,
  financialYearId,
  companyName,
  yearEnd,
  onProceedToAnalysis,
}: ExtractionViewerProps) {
  const [activeTab, setActiveTab] = useState<ViewerTab>('overview');

  const tabs: { id: ViewerTab; label: string; badge?: string }[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'validation',
      label: 'Validation',
      badge:
        extraction.validation_dashboard.blocking_issues.length > 0
          ? extraction.validation_dashboard.blocking_issues.length.toString()
          : undefined,
    },
    { id: 'company', label: 'Company Profile' },
    { id: 'financials', label: 'Financial Statements' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'raw', label: 'Raw Data' },
  ];

  const canProceed = extraction.pre_analysis_gates.can_proceed_to_analysis;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{companyName}</h2>
              <p className="text-sm text-gray-500">
                Financial Year Ending: {yearEnd} | ID: {financialYearId.slice(0, 8)}...
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ExtractionStatusBadge metadata={extraction.metadata} />
              {canProceed && onProceedToAnalysis && (
                <button
                  onClick={onProceedToAnalysis}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Proceed to Analysis
                </button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 px-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.badge && (
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab
            extraction={extraction}
            onViewValidation={() => setActiveTab('validation')}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationDashboard
            validationDashboard={extraction.validation_dashboard}
            preAnalysisGates={extraction.pre_analysis_gates}
          />
        )}

        {activeTab === 'company' && (
          <CompanyProfileDisplay profile={extraction.company_profile} />
        )}

        {activeTab === 'financials' && (
          <FinancialStatements
            balanceSheet={extraction.canonical_balance_sheet}
            profitLoss={extraction.canonical_profit_loss}
            unitScale={extraction.metadata.unit_scale}
          />
        )}

        {activeTab === 'metrics' && <MetricsDisplay metrics={extraction.deterministic_metrics} />}

        {activeTab === 'raw' && <RawDataTab extraction={extraction} />}
      </div>
    </div>
  );
}

interface ExtractionStatusBadgeProps {
  metadata: ParserExtractionMetadata;
}

function ExtractionStatusBadge({ metadata }: ExtractionStatusBadgeProps) {
  const getConfidenceColor = () => {
    if (metadata.overall_confidence >= 0.8) return 'bg-green-100 text-green-700';
    if (metadata.overall_confidence >= 0.6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={getConfidenceColor()}>
        {(metadata.overall_confidence * 100).toFixed(0)}% Confidence
      </Badge>
      <Badge className="bg-gray-100 text-gray-700">{metadata.unit_scale}</Badge>
      <Badge className="bg-gray-100 text-gray-700">{metadata.document_language.toUpperCase()}</Badge>
    </div>
  );
}

interface OverviewTabProps {
  extraction: ParserStructuredExtraction;
  onViewValidation: () => void;
}

function OverviewTab({ extraction, onViewValidation }: OverviewTabProps) {
  const { metadata, pre_analysis_gates, canonical_balance_sheet, canonical_profit_loss } =
    extraction;

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Readiness Status */}
      <Card
        className={
          pre_analysis_gates.readiness_level === 'BLOCKED'
            ? 'border-red-200'
            : pre_analysis_gates.readiness_level === 'READY_LIMITED'
            ? 'border-yellow-200'
            : 'border-green-200'
        }
      >
        <CardHeader>
          <h3 className="font-semibold">Analysis Readiness</h3>
        </CardHeader>
        <CardBody>
          <div className="text-center py-4">
            <div
              className={`text-3xl font-bold ${
                pre_analysis_gates.readiness_level === 'BLOCKED'
                  ? 'text-red-600'
                  : pre_analysis_gates.readiness_level === 'READY_LIMITED'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {pre_analysis_gates.readiness_level.replace('_', ' ')}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {pre_analysis_gates.can_proceed_to_analysis
                ? 'Ready for Claude analysis'
                : 'Review required before analysis'}
            </p>
            {pre_analysis_gates.blocking_issues.length > 0 && (
              <button
                onClick={onViewValidation}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                View {pre_analysis_gates.blocking_issues.length} blocking issue(s)
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Extraction Quality */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Extraction Quality</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <QualityItem
              label="Overall Confidence"
              value={metadata.overall_confidence}
              format="percentage"
            />
            <QualityItem
              label="High Confidence Codes"
              value={pre_analysis_gates.mapping_gate.high_confidence_pct}
              format="percentage"
            />
            <QualityItem
              label="Data Completeness"
              value={pre_analysis_gates.data_quality_gate.completeness_score}
              format="score"
            />
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-3 h-3 rounded-full ${
                    metadata.reference_column_detected ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                />
                <span className="text-gray-600">
                  {metadata.reference_column_detected
                    ? 'PCN reference column detected'
                    : 'Using caption matching'}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Key Figures */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Key Figures</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Assets</span>
              <span className="font-medium">
                {formatCurrency(canonical_balance_sheet.total_assets)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Liabilities</span>
              <span className="font-medium">
                {formatCurrency(canonical_balance_sheet.total_liabilities)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Net Profit/Loss</span>
              <span
                className={`font-medium ${
                  canonical_profit_loss.net_profit_loss !== null &&
                  canonical_profit_loss.net_profit_loss < 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {formatCurrency(canonical_profit_loss.net_profit_loss)}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Company Info Summary */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Company Classification</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                className={
                  extraction.company_profile.company_size === 'LARGE'
                    ? 'bg-purple-100 text-purple-700'
                    : extraction.company_profile.company_size === 'MEDIUM'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }
              >
                {extraction.company_profile.company_size}
              </Badge>
              <Badge className="bg-gray-100 text-gray-700">
                {extraction.company_profile.account_type}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              {extraction.company_profile.reporting_standard} |{' '}
              {extraction.company_profile.is_consolidated ? 'Consolidated' : 'Standalone'}
            </p>
            {extraction.company_profile.soparfi_indicators.is_likely_soparfi && (
              <Badge className="bg-orange-100 text-orange-700">Likely SOPARFI</Badge>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Extracted Items Count */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Extracted Data</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            <CountItem label="BS Line Items" count={canonical_balance_sheet.line_items.length} />
            <CountItem label="P&L Line Items" count={canonical_profit_loss.line_items.length} />
            <CountItem label="IC Transactions" count={extraction.ic_transactions_from_notes.length} />
            <CountItem
              label="Related Party Tx"
              count={extraction.related_party_transactions.length}
            />
          </div>
        </CardBody>
      </Card>

      {/* Warnings Summary */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Warnings Summary</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {metadata.extraction_warnings.length > 0 ? (
              <ul className="text-sm text-yellow-700 space-y-1">
                {metadata.extraction_warnings.slice(0, 5).map((warning, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-yellow-500">•</span>
                    {warning}
                  </li>
                ))}
                {metadata.extraction_warnings.length > 5 && (
                  <li className="text-gray-500">
                    +{metadata.extraction_warnings.length - 5} more warnings
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-green-600">No extraction warnings</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

interface QualityItemProps {
  label: string;
  value: number;
  format: 'percentage' | 'score';
}

function QualityItem({ label, value, format }: QualityItemProps) {
  const displayValue = format === 'percentage' ? `${(value * 100).toFixed(0)}%` : `${value}/100`;

  const getColor = () => {
    const normalizedValue = format === 'percentage' ? value : value / 100;
    if (normalizedValue >= 0.8) return 'bg-green-500';
    if (normalizedValue >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{displayValue}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${getColor()}`}
          style={{ width: `${format === 'percentage' ? value * 100 : value}%` }}
        />
      </div>
    </div>
  );
}

interface CountItemProps {
  label: string;
  count: number;
}

function CountItem({ label, count }: CountItemProps) {
  return (
    <div className="text-center p-2 bg-gray-50 rounded">
      <div className="text-2xl font-bold text-gray-900">{count}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

interface RawDataTabProps {
  extraction: ParserStructuredExtraction;
}

function RawDataTab({ extraction }: RawDataTabProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Raw Extraction Data</h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:underline"
          >
            {expanded ? 'Collapse' : 'Expand All'}
          </button>
        </div>
      </CardHeader>
      <CardBody>
        <pre
          className={`text-xs bg-gray-50 p-4 rounded-lg overflow-auto ${
            expanded ? '' : 'max-h-96'
          }`}
        >
          {JSON.stringify(extraction, null, 2)}
        </pre>
      </CardBody>
    </Card>
  );
}
