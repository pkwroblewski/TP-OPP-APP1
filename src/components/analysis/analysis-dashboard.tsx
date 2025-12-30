// src/components/analysis/analysis-dashboard.tsx
// Main analysis dashboard component

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpportunityCard } from './opportunity-card';
import { RiskScoreBadge, RiskScoreBar } from './risk-score-badge';
import { ClassificationBadge } from './classification-badge';
import { MetricsSummary } from './metrics-summary';
import type { TPAnalysisResult } from '@/lib/types/analysis';

type DashboardTab = 'overview' | 'opportunities' | 'metrics' | 'far' | 'recommendations';

interface AnalysisDashboardProps {
  analysis: TPAnalysisResult;
  companyName: string;
  yearEnd: string;
  readinessLevel?: string;
  onAddToPipeline?: () => void;
}

export function AnalysisDashboard({
  analysis,
  companyName,
  yearEnd,
  readinessLevel,
  onAddToPipeline,
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const tabs: { id: DashboardTab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'opportunities', label: 'Opportunities', badge: analysis.opportunities.length },
    { id: 'metrics', label: 'Metrics' },
    { id: 'far', label: 'FAR Analysis' },
    { id: 'recommendations', label: 'Actions' },
  ];

  const getPriorityColor = () => {
    switch (analysis.priority_ranking) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{companyName}</h2>
              <p className="text-sm text-gray-500">TP Analysis - FY {yearEnd}</p>
              {readinessLevel && readinessLevel !== 'READY_FULL' && (
                <Badge className="mt-2 bg-yellow-100 text-yellow-700">
                  Analysis performed in {readinessLevel} mode
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <RiskScoreBadge score={analysis.risk_score} size="lg" />
              <div className="flex flex-col items-end gap-2">
                <ClassificationBadge
                  classification={analysis.company_classification}
                  reasoning={analysis.classification_reasoning}
                  size="md"
                />
                <Badge className={getPriorityColor()}>
                  {analysis.priority_ranking.toUpperCase()} Priority
                </Badge>
              </div>
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
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
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
          <OverviewTab analysis={analysis} onAddToPipeline={onAddToPipeline} />
        )}
        {activeTab === 'opportunities' && <OpportunitiesTab analysis={analysis} />}
        {activeTab === 'metrics' && (
          <MetricsSummary metrics={analysis.metrics} flags={analysis.flags} />
        )}
        {activeTab === 'far' && <FARTab analysis={analysis} />}
        {activeTab === 'recommendations' && <RecommendationsTab analysis={analysis} />}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({
  analysis,
  onAddToPipeline,
}: {
  analysis: TPAnalysisResult;
  onAddToPipeline?: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Executive Summary</h3>
        </CardHeader>
        <CardBody>
          <p className="text-gray-700 whitespace-pre-line">{analysis.executive_summary}</p>
        </CardBody>
      </Card>

      {/* Analysis Limitations */}
      {analysis.analysis_limitations.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-yellow-700">Analysis Limitations</h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1 text-sm text-yellow-700">
              {analysis.analysis_limitations.map((limitation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Opportunities"
          value={analysis.opportunities.length.toString()}
          icon="flag"
        />
        <StatCard
          label="High Severity"
          value={analysis.opportunities.filter((o) => o.severity === 'high').length.toString()}
          icon="alert"
          highlight
        />
        <StatCard
          label="Account Type"
          value={analysis.account_type.toUpperCase()}
          icon="doc"
        />
        <StatCard
          label="Company Size"
          value={analysis.company_size.toUpperCase()}
          icon="building"
        />
      </div>

      {/* Risk Score Visualization */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Risk Assessment</h3>
        </CardHeader>
        <CardBody>
          <RiskScoreBar score={analysis.risk_score} className="max-w-md mx-auto" />
        </CardBody>
      </Card>

      {/* Related Party Flags */}
      {analysis.related_party_flags.has_note_7ter_disclosures && (
        <Card className="border-red-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-red-700">Note 7ter Disclosures</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 mb-3">
              {analysis.related_party_flags.non_arms_length_transactions} transaction(s) disclosed
              as not at arm&apos;s length
            </p>
            {analysis.related_party_flags.flagged_transactions.length > 0 && (
              <div className="space-y-2">
                {analysis.related_party_flags.flagged_transactions.map((tx, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg">
                    <div className="font-medium text-gray-900">{tx.description}</div>
                    <div className="text-sm text-gray-600">
                      Counterparty: {tx.counterparty} | Amount:{' '}
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(tx.amount)}
                    </div>
                    <div className="text-sm text-red-600 mt-1">{tx.concern}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Add to Pipeline Button */}
      {onAddToPipeline && (
        <div className="flex justify-center">
          <button
            onClick={onAddToPipeline}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add to Opportunity Pipeline
          </button>
        </div>
      )}
    </div>
  );
}

// Opportunities Tab
function OpportunitiesTab({ analysis }: { analysis: TPAnalysisResult }) {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredOpportunities =
    filter === 'all'
      ? analysis.opportunities
      : analysis.opportunities.filter((o) => o.severity === filter);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'high', 'medium', 'low'] as const).map((severity) => (
          <button
            key={severity}
            onClick={() => setFilter(severity)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === severity
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
            {severity !== 'all' && (
              <span className="ml-1">
                ({analysis.opportunities.filter((o) => o.severity === severity).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Opportunities List */}
      {filteredOpportunities.length > 0 ? (
        <div className="space-y-4">
          {filteredOpportunities.map((opportunity, index) => (
            <OpportunityCard key={index} opportunity={opportunity} />
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center py-12 text-gray-500">
            No opportunities found{filter !== 'all' && ` with ${filter} severity`}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// FAR Tab
function FARTab({ analysis }: { analysis: TPAnalysisResult }) {
  const far = analysis.far_analysis;

  return (
    <div className="space-y-4">
      {/* Functional Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Functional Analysis</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Company Type</div>
              <ClassificationBadge
                classification={far.functional_analysis.company_type}
                size="lg"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Functions Performed</div>
              <div className="flex flex-wrap gap-2">
                {far.functional_analysis.functions_performed.map((func, index) => (
                  <Badge key={index} className="bg-blue-100 text-blue-700">
                    {func}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Substance Indicators</div>
              <div className="grid grid-cols-2 gap-3">
                <SubstanceIndicator
                  label="Has Employees"
                  value={far.functional_analysis.substance_indicators.has_employees}
                  count={far.functional_analysis.substance_indicators.employee_count}
                />
                <SubstanceIndicator
                  label="Physical Office"
                  value={far.functional_analysis.substance_indicators.has_physical_office}
                />
                <SubstanceIndicator
                  label="Local Management"
                  value={far.functional_analysis.substance_indicators.has_local_management}
                />
                <SubstanceIndicator
                  label="Domiciliation"
                  value={far.functional_analysis.substance_indicators.is_domiciliation_administered}
                  inverted
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Asset Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Asset Analysis</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {far.asset_analysis.key_assets_owned.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Key Assets Owned</div>
                <ul className="text-sm text-gray-700 list-disc list-inside">
                  {far.asset_analysis.key_assets_owned.map((asset, index) => (
                    <li key={index}>{asset}</li>
                  ))}
                </ul>
              </div>
            )}
            {far.asset_analysis.intangible_assets.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Intangible Assets</div>
                <ul className="text-sm text-gray-700 list-disc list-inside">
                  {far.asset_analysis.intangible_assets.map((asset, index) => (
                    <li key={index}>{asset}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Risk Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Risk Analysis</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Financial Risks</div>
              <ul className="text-sm text-gray-600 space-y-1">
                {far.risk_analysis.financial_risks.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Operational Risks</div>
              <ul className="text-sm text-gray-600 space-y-1">
                {far.risk_analysis.operational_risks.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// Recommendations Tab
function RecommendationsTab({ analysis }: { analysis: TPAnalysisResult }) {
  return (
    <div className="space-y-4">
      {/* Recommended Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recommended Actions</h3>
        </CardHeader>
        <CardBody>
          <ol className="space-y-3">
            {analysis.recommended_actions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700">{action}</span>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {/* Documentation Gaps */}
      {analysis.documentation_gaps.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-yellow-700">Documentation Gaps</h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {analysis.documentation_gaps.map((gap, index) => (
                <li key={index} className="flex items-start gap-2 text-yellow-700">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Suggested Studies */}
      {analysis.suggested_benchmarking_studies.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Suggested Benchmarking Studies</h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {analysis.suggested_benchmarking_studies.map((study, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  <span>{study}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// Helper Components
function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: 'flag' | 'alert' | 'doc' | 'building';
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-red-200 bg-red-50' : ''}>
      <CardBody className="text-center py-4">
        <div className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </CardBody>
    </Card>
  );
}

function SubstanceIndicator({
  label,
  value,
  count,
  inverted,
}: {
  label: string;
  value: boolean;
  count?: number | null;
  inverted?: boolean;
}) {
  const isGood = inverted ? !value : value;

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-gray-50">
      <div className={`w-3 h-3 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm text-gray-700">
        {label}
        {count !== undefined && count !== null && ` (${count})`}
      </span>
    </div>
  );
}
