// src/app/page.tsx
// Dashboard home page with stats and quick actions

import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/layout';
import { Card, CardBody, CardHeader, Button, Badge } from '@/components/ui';

export default async function Home() {
  const supabase = createServiceClient();

  // Fetch stats in parallel
  const [
    { count: companiesCount },
    { data: pendingExtractions },
    { data: pendingAnalyses },
    { data: pipelineItems },
    { data: recentUploads },
    { data: recentAnalyses },
    { data: upcomingActions },
    { data: highPriorityOpps },
  ] = await Promise.all([
    // Total companies
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    // Pending extractions
    supabase
      .from('financial_years')
      .select('id')
      .or('extraction_status.is.null,extraction_status.eq.pending'),
    // Pending analyses
    supabase
      .from('financial_years')
      .select('id')
      .eq('extraction_status', 'completed')
      .or('analysis_status.is.null,analysis_status.eq.pending,analysis_status.eq.ready,analysis_status.eq.ready_with_warnings'),
    // Pipeline items
    supabase
      .from('opportunity_pipeline')
      .select('id, status'),
    // Recent uploads (last 5)
    supabase
      .from('financial_years')
      .select(`
        id,
        year_end,
        pdf_uploaded_at,
        company:companies (
          id,
          name
        )
      `)
      .not('pdf_uploaded_at', 'is', null)
      .order('pdf_uploaded_at', { ascending: false })
      .limit(5),
    // Recent analyses (last 5)
    supabase
      .from('tp_analyses')
      .select(`
        id,
        analyzed_at,
        risk_score,
        opportunities_count,
        financial_year:financial_years (
          id,
          year_end,
          company:companies (
            id,
            name
          )
        )
      `)
      .order('analyzed_at', { ascending: false })
      .limit(5),
    // Upcoming actions from pipeline
    supabase
      .from('opportunity_pipeline')
      .select(`
        id,
        next_action,
        next_action_date,
        company:companies (
          id,
          name
        )
      `)
      .not('next_action_date', 'is', null)
      .gte('next_action_date', new Date().toISOString().split('T')[0])
      .order('next_action_date', { ascending: true })
      .limit(5),
    // High priority opportunities (top 5 by risk score)
    supabase
      .from('tp_analyses')
      .select(`
        id,
        risk_score,
        opportunities_count,
        company_classification,
        financial_year:financial_years (
          id,
          company:companies (
            id,
            name
          )
        )
      `)
      .not('risk_score', 'is', null)
      .order('risk_score', { ascending: false })
      .limit(5),
  ]);

  // Calculate pipeline stats
  const pipelineActive = pipelineItems?.filter(
    (p) => p.status !== 'won' && p.status !== 'lost'
  ).length || 0;

  return (
    <PageContainer
      title="Dashboard"
      description="Transfer pricing opportunity identification for Luxembourg companies"
    >
      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Companies"
          value={companiesCount || 0}
          href="/companies"
        />
        <StatCard
          label="Pending Extraction"
          value={pendingExtractions?.length || 0}
          highlight={(pendingExtractions?.length ?? 0) > 0}
        />
        <StatCard
          label="Ready for Analysis"
          value={pendingAnalyses?.length || 0}
          highlight={(pendingAnalyses?.length ?? 0) > 0}
        />
        <StatCard
          label="Total Analyzed"
          value={recentAnalyses?.length ? '5+' : '0'}
        />
        <StatCard
          label="Active Pipeline"
          value={pipelineActive}
          href="/pipeline"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Upload</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Upload annual accounts PDF for analysis
                </p>
                <Link href="/upload" className="inline-block mt-3">
                  <Button size="sm">Upload PDF</Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Companies</h3>
                <p className="text-sm text-gray-500 mt-1">
                  View and manage uploaded companies
                </p>
                <Link href="/companies" className="inline-block mt-3">
                  <Button size="sm" variant="secondary">View All</Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Pipeline</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Track identified opportunities
                </p>
                <Link href="/pipeline" className="inline-block mt-3">
                  <Button size="sm" variant="secondary">View Pipeline</Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Activity and Priority Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-gray-100">
              {/* Recent Uploads */}
              {recentUploads && recentUploads.length > 0 ? (
                recentUploads.slice(0, 3).map((upload) => {
                  const companyData = upload.company as { id: string; name: string } | { id: string; name: string }[] | null;
                  const company = Array.isArray(companyData) ? companyData[0] : companyData;
                  return (
                    <div key={upload.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-sm font-medium text-gray-900">
                            {company?.name || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {upload.pdf_uploaded_at
                            ? new Date(upload.pdf_uploaded_at).toLocaleDateString()
                            : ''}
                        </span>
                      </div>
                      <div className="ml-4 text-xs text-gray-500">
                        Uploaded {upload.year_end} accounts
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No recent uploads
                </div>
              )}

              {/* Recent Analyses */}
              {recentAnalyses && recentAnalyses.length > 0 && (
                recentAnalyses.slice(0, 2).map((analysis) => {
                  type FYType = {
                    id: string;
                    year_end: string;
                    company: { id: string; name: string } | { id: string; name: string }[] | null;
                  };
                  const fyData = analysis.financial_year as FYType | FYType[] | null;
                  const fyItem = Array.isArray(fyData) ? fyData[0] : fyData;
                  const companyData = fyItem?.company;
                  const fyCompany = Array.isArray(companyData) ? companyData[0] : companyData;
                  const fy = fyItem ? { ...fyItem, company: fyCompany } : null;
                  return (
                    <div key={analysis.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-sm font-medium text-gray-900">
                            {fy?.company?.name || 'Unknown'}
                          </span>
                          <Badge className="text-xs bg-green-100 text-green-700">
                            {analysis.opportunities_count || 0} opportunities
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {analysis.analyzed_at
                            ? new Date(analysis.analyzed_at).toLocaleDateString()
                            : ''}
                        </span>
                      </div>
                      <div className="ml-4 text-xs text-gray-500">
                        Analysis completed - Risk score: {analysis.risk_score || 'N/A'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardBody>
        </Card>

        {/* Upcoming Actions & High Priority */}
        <div className="space-y-6">
          {/* Upcoming Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Upcoming Actions</h3>
                <Link href="/pipeline" className="text-sm text-blue-600 hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {upcomingActions && upcomingActions.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {upcomingActions.map((action) => {
                    const companyData = action.company as { id: string; name: string } | { id: string; name: string }[] | null;
                    const company = Array.isArray(companyData) ? companyData[0] : companyData;
                    const isOverdue = action.next_action_date
                      ? new Date(action.next_action_date) < new Date()
                      : false;
                    return (
                      <div key={action.id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {company?.name || 'Unknown'}
                          </span>
                          <span
                            className={`text-xs ${
                              isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                            }`}
                          >
                            {action.next_action_date
                              ? new Date(action.next_action_date).toLocaleDateString()
                              : ''}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">{action.next_action}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No upcoming actions scheduled
                </div>
              )}
            </CardBody>
          </Card>

          {/* High Priority Opportunities */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">High Priority Opportunities</h3>
            </CardHeader>
            <CardBody className="p-0">
              {highPriorityOpps && highPriorityOpps.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {highPriorityOpps.map((opp) => {
                    type FYTypeSimple = {
                      id: string;
                      company: { id: string; name: string } | { id: string; name: string }[] | null;
                    };
                    const fyData = opp.financial_year as FYTypeSimple | FYTypeSimple[] | null;
                    const fyItem = Array.isArray(fyData) ? fyData[0] : fyData;
                    const oppCompanyData = fyItem?.company;
                    const oppCompany = Array.isArray(oppCompanyData) ? oppCompanyData[0] : oppCompanyData;
                    const fy = fyItem ? { ...fyItem, company: oppCompany } : null;
                    return (
                      <Link
                        key={opp.id}
                        href={`/companies/${fy?.company?.id}`}
                        className="block px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {fy?.company?.name || 'Unknown'}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-xs ${
                                (opp.risk_score || 0) >= 67
                                  ? 'bg-red-100 text-red-700'
                                  : (opp.risk_score || 0) >= 34
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              Risk: {opp.risk_score}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {opp.company_classification || 'Unknown type'} -{' '}
                          {opp.opportunities_count || 0} opportunities
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No analyses completed yet.{' '}
                  <Link href="/companies" className="text-blue-600 hover:underline">
                    Analyze a company
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number | string;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <Card className={highlight ? 'border-yellow-300 bg-yellow-50' : ''}>
      <CardBody className="text-center py-4">
        <div className={`text-2xl font-bold ${highlight ? 'text-yellow-700' : 'text-gray-900'}`}>
          {value}
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </CardBody>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
