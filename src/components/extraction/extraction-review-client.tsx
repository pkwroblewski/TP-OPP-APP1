// src/components/extraction/extraction-review-client.tsx
// Client-side extraction review component

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExtractionViewer } from './extraction-viewer';
import { Spinner } from '@/components/ui/loading';
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
  gdrive_pdf_file_id: string | null;
  gdrive_pdf_url: string | null;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed' | null;
  extraction_data: ParserStructuredExtraction | null;
  extraction_warnings: string[] | null;
  extracted_at: string | null;
  analysis_status: string | null;
  analysis_input_hash: string | null;
}

interface YearSummary {
  id: string;
  year_end: string;
  extraction_status: string | null;
  analysis_status: string | null;
}

interface ExtractionReviewClientProps {
  company: Company;
  financialYear: FinancialYear;
  allYears: YearSummary[];
}

export function ExtractionReviewClient({
  company,
  financialYear,
  allYears,
}: ExtractionReviewClientProps) {
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const handleExtract = async () => {
    setIsExtracting(true);
    setExtractionError(null);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financialYearId: financialYear.id }),
      });

      const result = await response.json();

      if (!result.success) {
        setExtractionError(result.error || 'Extraction failed');
      } else {
        // Refresh the page to show updated data
        router.refresh();
      }
    } catch (error) {
      setExtractionError('Failed to start extraction');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleYearChange = (yearId: string) => {
    router.push(`/companies/${company.id}/extraction?year=${yearId}`);
  };

  const handleProceedToAnalysis = () => {
    router.push(`/companies/${company.id}/analysis?year=${financialYear.id}`);
  };

  // No PDF uploaded
  if (!financialYear.gdrive_pdf_file_id) {
    return (
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
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF Uploaded</h3>
          <p className="text-gray-500 mb-4">
            Upload a financial statement PDF before extraction.
          </p>
          <Button onClick={() => router.push('/upload')}>Upload PDF</Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year Selector & Actions */}
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
                    {year.extraction_status ? ` (${year.extraction_status})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-3">
              <ExtractionStatusBadge status={financialYear.extraction_status} />

              {financialYear.gdrive_pdf_url && (
                <a
                  href={financialYear.gdrive_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View PDF
                </a>
              )}

              {(!financialYear.extraction_status ||
                financialYear.extraction_status === 'pending' ||
                financialYear.extraction_status === 'failed') && (
                <Button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  variant="primary"
                >
                  {isExtracting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Extracting...
                    </>
                  ) : financialYear.extraction_status === 'failed' ? (
                    'Retry Extraction'
                  ) : (
                    'Start Extraction'
                  )}
                </Button>
              )}

              {financialYear.extraction_status === 'completed' && (
                <Button onClick={handleExtract} variant="secondary" disabled={isExtracting}>
                  Re-Extract
                </Button>
              )}
            </div>
          </div>

          {extractionError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {extractionError}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Extraction Status Display */}
      {financialYear.extraction_status === 'processing' && (
        <Card>
          <CardBody className="text-center py-12">
            <Spinner size="lg" className="mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Extraction in Progress</h3>
            <p className="text-gray-500">
              Processing PDF through Document AI and Luxembourg GAAP parser...
            </p>
          </CardBody>
        </Card>
      )}

      {financialYear.extraction_status === 'failed' && (
        <Card className="border-red-200">
          <CardBody>
            <h3 className="text-lg font-medium text-red-700 mb-2">Extraction Failed</h3>
            {financialYear.extraction_warnings && financialYear.extraction_warnings.length > 0 && (
              <ul className="text-sm text-red-600 space-y-1">
                {financialYear.extraction_warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-gray-500 mt-4">
              Please check the PDF quality and try again, or contact support if the issue persists.
            </p>
          </CardBody>
        </Card>
      )}

      {financialYear.extraction_status === 'pending' && !isExtracting && (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Extraction</h3>
            <p className="text-gray-500 mb-4">
              PDF is uploaded. Click "Start Extraction" to process the document.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Extraction Data Display */}
      {financialYear.extraction_status === 'completed' && financialYear.extraction_data && (
        <ExtractionViewer
          extraction={financialYear.extraction_data}
          financialYearId={financialYear.id}
          companyName={company.name}
          yearEnd={financialYear.year_end}
          onProceedToAnalysis={
            financialYear.extraction_data.pre_analysis_gates.can_proceed_to_analysis
              ? handleProceedToAnalysis
              : undefined
          }
        />
      )}

      {/* Extraction Metadata */}
      {financialYear.extracted_at && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">Extracted:</span>{' '}
                {new Date(financialYear.extracted_at).toLocaleString()}
              </div>
              {financialYear.analysis_input_hash && (
                <div>
                  <span className="font-medium">Hash:</span>{' '}
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                    {financialYear.analysis_input_hash.slice(0, 16)}...
                  </code>
                </div>
              )}
              {financialYear.analysis_status && (
                <div>
                  <span className="font-medium">Analysis Status:</span>{' '}
                  <Badge
                    className={
                      financialYear.analysis_status === 'ready'
                        ? 'bg-green-100 text-green-700'
                        : financialYear.analysis_status === 'blocked'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }
                  >
                    {financialYear.analysis_status}
                  </Badge>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

interface ExtractionStatusBadgeProps {
  status: string | null;
}

function ExtractionStatusBadge({ status }: ExtractionStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', className: 'bg-green-100 text-green-700' };
      case 'processing':
        return { label: 'Processing', className: 'bg-blue-100 text-blue-700' };
      case 'failed':
        return { label: 'Failed', className: 'bg-red-100 text-red-700' };
      case 'pending':
        return { label: 'Pending', className: 'bg-gray-100 text-gray-700' };
      default:
        return { label: 'Not Started', className: 'bg-gray-100 text-gray-500' };
    }
  };

  const config = getStatusConfig();

  return <Badge className={config.className}>{config.label}</Badge>;
}
