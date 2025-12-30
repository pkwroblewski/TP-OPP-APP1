// src/app/companies/[id]/page.tsx
// Company detail page showing all financial years and their status

import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id: companyId } = await params;

  const supabase = createServiceClient();

  // Get company with all financial years
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    notFound();
  }

  // Get all financial years for this company
  const { data: financialYears } = await supabase
    .from('financial_years')
    .select('*')
    .eq('company_id', companyId)
    .order('year_end', { ascending: false });

  // Get latest analysis for each year that has one
  const yearIds = financialYears?.map((y) => y.id) || [];
  const { data: analyses } = await supabase
    .from('tp_analyses')
    .select('*')
    .in('financial_year_id', yearIds)
    .order('analyzed_at', { ascending: false });

  // Get pipeline status if exists
  const { data: pipelineEntry } = await supabase
    .from('opportunity_pipeline')
    .select('*')
    .eq('company_id', companyId)
    .single();

  // Map analyses to years
  const analysisMap = new Map();
  analyses?.forEach((a) => {
    if (!analysisMap.has(a.financial_year_id)) {
      analysisMap.set(a.financial_year_id, a);
    }
  });

  // Calculate quick stats from latest analysis
  const latestYear = financialYears?.[0];
  const latestAnalysis = latestYear ? analysisMap.get(latestYear.id) : null;

  return (
    <PageContainer
      title={company.name}
      description={`RCS: ${company.rcs_number}`}
      action={
        <div className="flex gap-2">
          <Link href="/companies">
            <Button variant="secondary">Back to Companies</Button>
          </Link>
          <Link href={`/upload?company=${company.id}`}>
            <Button variant="primary">Upload New Year</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Company Header */}
        <Card>
          <CardBody>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
                  {pipelineEntry && (
                    <Badge className="bg-blue-100 text-blue-700">In Pipeline</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">RCS:</span> {company.rcs_number}
                  </div>
                  {company.legal_form && (
                    <div>
                      <span className="font-medium">Legal Form:</span> {company.legal_form}
                    </div>
                  )}
                  {company.sector && (
                    <div>
                      <span className="font-medium">Sector:</span> {company.sector}
                    </div>
                  )}
                </div>
              </div>

              {company.gdrive_folder_url && (
                <a
                  href={company.gdrive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71zm-.79 1.5h3.63L14 12l-3.45 7H7.63L4.44 15l3.19-5.5L4.44 6l2.48-1zM12 7l3.45 5.5L12 18l-3.45-5.5L12 7z" />
                  </svg>
                  Open in Drive
                </a>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Quick Stats (if analysis exists) */}
        {latestAnalysis && latestAnalysis.analysis_result && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Classification"
              value={latestAnalysis.company_classification || 'N/A'}
            />
            <StatCard
              label="Risk Score"
              value={latestAnalysis.risk_score?.toString() || 'N/A'}
              highlight={latestAnalysis.risk_score > 66}
            />
            <StatCard
              label="Opportunities"
              value={latestAnalysis.opportunities_count?.toString() || '0'}
            />
            <StatCard
              label="Priority"
              value={latestAnalysis.priority_ranking?.toUpperCase() || 'N/A'}
            />
          </div>
        )}

        {/* Financial Years */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Financial Years</h3>
          </CardHeader>
          <CardBody className="p-0">
            {financialYears && financialYears.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Year End
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Extraction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Analysis
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Score
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {financialYears.map((year) => {
                      const analysis = analysisMap.get(year.id);
                      return (
                        <FinancialYearRow
                          key={year.id}
                          year={year}
                          analysis={analysis}
                          companyId={companyId}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-4">No financial years uploaded yet.</p>
                <Link href={`/upload?company=${company.id}`}>
                  <Button variant="primary">Upload First Year</Button>
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Pipeline Status */}
        {pipelineEntry && (
          <Card className="border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pipeline Status</h3>
                <Link href="/pipeline">
                  <Button variant="secondary" size="sm">
                    View Pipeline
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <PipelineStatusBadge status={pipelineEntry.status} />
                </div>
                {pipelineEntry.next_action && (
                  <div>
                    <div className="text-sm text-gray-500">Next Action</div>
                    <div className="font-medium">{pipelineEntry.next_action}</div>
                  </div>
                )}
                {pipelineEntry.next_action_date && (
                  <div>
                    <div className="text-sm text-gray-500">Due Date</div>
                    <div className="font-medium">
                      {new Date(pipelineEntry.next_action_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {pipelineEntry.notes && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-500">Notes</div>
                    <div className="text-sm text-gray-700">{pipelineEntry.notes}</div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

interface FinancialYearRowProps {
  year: {
    id: string;
    year_end: string;
    extraction_status: string | null;
    analysis_status: string | null;
    gdrive_pdf_url: string | null;
  };
  analysis: {
    risk_score: number | null;
    opportunities_count: number | null;
  } | null;
  companyId: string;
}

function FinancialYearRow({ year, analysis, companyId }: FinancialYearRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="font-medium text-gray-900">{year.year_end}</div>
        {year.gdrive_pdf_url && (
          <a
            href={year.gdrive_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View PDF
          </a>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={year.extraction_status} type="extraction" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={year.analysis_status} type="analysis" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {analysis?.risk_score !== null && analysis?.risk_score !== undefined ? (
          <div className="flex items-center gap-2">
            <RiskScoreIndicator score={analysis.risk_score} />
            <span className="text-sm text-gray-600">
              ({analysis.opportunities_count || 0} opportunities)
            </span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end gap-2">
          {(!year.extraction_status || year.extraction_status === 'pending') && (
            <Link href={`/companies/${companyId}/extraction?year=${year.id}`}>
              <Button variant="primary" size="sm">
                Extract
              </Button>
            </Link>
          )}
          {year.extraction_status === 'completed' && (
            <Link href={`/companies/${companyId}/extraction?year=${year.id}`}>
              <Button variant="secondary" size="sm">
                View Extraction
              </Button>
            </Link>
          )}
          {year.extraction_status === 'completed' &&
            (!year.analysis_status || year.analysis_status === 'ready' || year.analysis_status === 'ready_with_warnings') && (
              <Link href={`/companies/${companyId}/analysis?year=${year.id}`}>
                <Button variant="primary" size="sm">
                  Analyze
                </Button>
              </Link>
            )}
          {year.analysis_status === 'completed' && (
            <Link href={`/companies/${companyId}/analysis?year=${year.id}`}>
              <Button variant="secondary" size="sm">
                View Analysis
              </Button>
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({
  status,
  type,
}: {
  status: string | null;
  type: 'extraction' | 'analysis';
}) {
  const getConfig = () => {
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
      case 'pending':
        return { label: 'Pending', className: 'bg-gray-100 text-gray-600' };
      default:
        return { label: 'Not Started', className: 'bg-gray-100 text-gray-500' };
    }
  };

  const config = getConfig();
  return <Badge className={config.className}>{config.label}</Badge>;
}

function RiskScoreIndicator({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 67) return 'bg-red-500';
    if (score >= 34) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${getColor()}`} />
      <span className="font-medium">{score}</span>
    </div>
  );
}

function PipelineStatusBadge({ status }: { status: string }) {
  const getConfig = () => {
    switch (status) {
      case 'identified':
        return { label: 'Identified', className: 'bg-gray-100 text-gray-700' };
      case 'contacted':
        return { label: 'Contacted', className: 'bg-blue-100 text-blue-700' };
      case 'meeting':
        return { label: 'Meeting', className: 'bg-purple-100 text-purple-700' };
      case 'proposal':
        return { label: 'Proposal', className: 'bg-orange-100 text-orange-700' };
      case 'won':
        return { label: 'Won', className: 'bg-green-100 text-green-700' };
      case 'lost':
        return { label: 'Lost', className: 'bg-red-100 text-red-700' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-600' };
    }
  };

  const config = getConfig();
  return <Badge className={config.className}>{config.label}</Badge>;
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-red-200' : ''}>
      <CardBody className="text-center py-4">
        <div className={`text-xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </CardBody>
    </Card>
  );
}
