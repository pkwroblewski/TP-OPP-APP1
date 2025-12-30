// src/components/analysis/analysis-page-client.tsx
// Client-side analysis page component

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalysisDashboard } from './analysis-dashboard';
import { ExportButton } from './export-button';
import { Spinner } from '@/components/ui/loading';
import type { TPAnalysisResult } from '@/lib/types/analysis';
import type { ParserStructuredExtraction } from '@/lib/parser';

interface Company {
  id: string;
  name: string;
  rcs_number: string;
}

interface FinancialYear {
  id: string;
  company_id: string;
  year_end: string;
  extraction_status: string | null;
  extraction_data: ParserStructuredExtraction | null;
  analysis_status: string | null;
}

interface AnalysisRecord {
  id: string;
  financial_year_id: string;
  analysis_result: TPAnalysisResult | null;
  readiness_level: string | null;
  opportunities_count: number | null;
  risk_score: number | null;
  priority_ranking: string | null;
  analyzed_at: string | null;
  analysis_limitations: string[] | null;
}

interface YearSummary {
  id: string;
  year_end: string;
  extraction_status: string | null;
  analysis_status: string | null;
}

interface AnalysisPageClientProps {
  company: Company;
  financialYear: FinancialYear;
  analysisResult: AnalysisRecord | null;
  allYears: YearSummary[];
}

export function AnalysisPageClient({
  company,
  financialYear,
  analysisResult,
  allYears,
}: AnalysisPageClientProps) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [forceAnalysis, setForceAnalysis] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialYearId: financialYear.id,
          forceAnalysis,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.blocked) {
          setAnalysisError(`Analysis blocked: ${result.blocking_issues?.join(', ')}`);
        } else {
          setAnalysisError(result.error || 'Analysis failed');
        }
      } else {
        // Refresh the page to show updated data
        router.refresh();
      }
    } catch (error) {
      setAnalysisError('Failed to start analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleYearChange = (yearId: string) => {
    router.push(`/companies/${company.id}/analysis?year=${yearId}`);
  };

  const handleAddToPipeline = async () => {
    // TODO: Implement add to pipeline
    alert('Add to pipeline functionality coming soon!');
  };

  const handleGoToExtraction = () => {
    router.push(`/companies/${company.id}/extraction?year=${financialYear.id}`);
  };

  // Check if extraction is ready
  const isExtractionReady = financialYear.extraction_status === 'completed';
  const hasExtractionData = !!financialYear.extraction_data;

  // Get readiness level from extraction data
  const readinessLevel = financialYear.extraction_data?.pre_analysis_gates?.readiness_level;
  const canProceed = financialYear.extraction_data?.pre_analysis_gates?.can_proceed_to_analysis;
  const blockingIssues = financialYear.extraction_data?.pre_analysis_gates?.blocking_issues || [];

  return (
    <div className="space-y-6">
      {/* Year Selector & Controls */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Year Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">Financial Year:</label>
              <select
                value={financialYear.id}
                onChange={(e) => handleYearChange(e.target.value)}
                className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {allYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_end}
                    {year.analysis_status ? ` (${year.analysis_status})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-3">
              <AnalysisStatusBadge status={financialYear.analysis_status} />

              <Button
                variant="secondary"
                onClick={handleGoToExtraction}
              >
                View Extraction
              </Button>

              {isExtractionReady && hasExtractionData && (
                <>
                  {(!analysisResult || financialYear.analysis_status === 'failed') && (
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || (!canProceed && !forceAnalysis)}
                      variant="primary"
                    >
                      {isAnalyzing ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        'Start Analysis'
                      )}
                    </Button>
                  )}

                  {analysisResult && financialYear.analysis_status === 'completed' && (
                    <>
                      <ExportButton
                        analysisId={analysisResult.id}
                        companyName={company.name}
                      />
                      <Button
                        onClick={handleAnalyze}
                        variant="secondary"
                        disabled={isAnalyzing}
                      >
                        Re-Analyze
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Force Analysis Toggle */}
          {!canProceed && isExtractionReady && blockingIssues.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="forceAnalysis"
                  checked={forceAnalysis}
                  onChange={(e) => setForceAnalysis(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="forceAnalysis" className="text-sm text-yellow-700">
                  Force analysis despite blocking issues
                </label>
              </div>
              <div className="text-xs text-yellow-600">
                Blocking issues: {blockingIssues.join('; ')}
              </div>
            </div>
          )}

          {analysisError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {analysisError}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Extraction Not Ready */}
      {!isExtractionReady && (
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Extraction Required</h3>
            <p className="text-gray-500 mb-4">
              Complete the extraction process before running TP analysis.
            </p>
            <Button onClick={handleGoToExtraction}>Go to Extraction</Button>
          </CardBody>
        </Card>
      )}

      {/* Analysis Status Display */}
      {financialYear.analysis_status === 'processing' && (
        <Card>
          <CardBody className="text-center py-12">
            <Spinner size="lg" className="mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis in Progress</h3>
            <p className="text-gray-500">
              Claude is analyzing the financial data for transfer pricing opportunities...
            </p>
          </CardBody>
        </Card>
      )}

      {/* Ready to Analyze */}
      {isExtractionReady &&
        hasExtractionData &&
        !analysisResult &&
        financialYear.analysis_status !== 'processing' && (
          <Card>
            <CardBody className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Analysis</h3>
              <p className="text-gray-500 mb-2">
                Extraction complete. Click &quot;Start Analysis&quot; to run TP analysis.
              </p>
              {readinessLevel && (
                <Badge
                  className={
                    readinessLevel === 'READY_FULL'
                      ? 'bg-green-100 text-green-700'
                      : readinessLevel === 'READY_LIMITED'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }
                >
                  Readiness: {readinessLevel}
                </Badge>
              )}
            </CardBody>
          </Card>
        )}

      {/* Analysis Results */}
      {analysisResult && analysisResult.analysis_result && (
        <AnalysisDashboard
          analysis={analysisResult.analysis_result}
          companyName={company.name}
          yearEnd={financialYear.year_end}
          readinessLevel={analysisResult.readiness_level || undefined}
          onAddToPipeline={handleAddToPipeline}
        />
      )}

      {/* Blocked Result Display */}
      {analysisResult && !analysisResult.analysis_result && financialYear.analysis_status === 'blocked' && (
        <Card className="border-red-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-red-700">Analysis Blocked</h3>
          </CardHeader>
          <CardBody>
            <p className="text-gray-600 mb-4">
              Analysis could not be completed due to data quality issues.
            </p>
            {analysisResult.analysis_limitations && (
              <ul className="space-y-2">
                {analysisResult.analysis_limitations.map((limitation, index) => (
                  <li key={index} className="flex items-start gap-2 text-red-600">
                    <span>•</span>
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-gray-500 mt-4">
              Please review and fix the extraction issues, then try again.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Analysis Metadata */}
      {analysisResult && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {analysisResult.analyzed_at && (
                <div>
                  <span className="font-medium">Analyzed:</span>{' '}
                  {new Date(analysisResult.analyzed_at).toLocaleString()}
                </div>
              )}
              {analysisResult.readiness_level && (
                <div>
                  <span className="font-medium">Mode:</span> {analysisResult.readiness_level}
                </div>
              )}
              {analysisResult.opportunities_count !== null && (
                <div>
                  <span className="font-medium">Opportunities:</span>{' '}
                  {analysisResult.opportunities_count}
                </div>
              )}
              {analysisResult.risk_score !== null && (
                <div>
                  <span className="font-medium">Risk Score:</span> {analysisResult.risk_score}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

interface AnalysisStatusBadgeProps {
  status: string | null;
}

function AnalysisStatusBadge({ status }: AnalysisStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', className: 'bg-green-100 text-green-700' };
      case 'processing':
        return { label: 'Processing', className: 'bg-blue-100 text-blue-700' };
      case 'failed':
        return { label: 'Failed', className: 'bg-red-100 text-red-700' };
      case 'blocked':
        return { label: 'Blocked', className: 'bg-red-100 text-red-700' };
      case 'ready':
      case 'ready_with_warnings':
        return { label: 'Ready', className: 'bg-yellow-100 text-yellow-700' };
      default:
        return { label: 'Not Started', className: 'bg-gray-100 text-gray-500' };
    }
  };

  const config = getStatusConfig();

  return <Badge className={config.className}>{config.label}</Badge>;
}
