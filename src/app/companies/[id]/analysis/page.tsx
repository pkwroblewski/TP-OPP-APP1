// src/app/companies/[id]/analysis/page.tsx
// Analysis results page for a specific financial year

import { createServiceClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { AnalysisPageClient } from '@/components/analysis/analysis-page-client';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}

export default async function AnalysisPage({ params, searchParams }: PageProps) {
  const { id: companyId } = await params;
  const { year: financialYearId } = await searchParams;

  const supabase = createServiceClient();

  // Get company info
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    notFound();
  }

  // If no year specified, get the most recent financial year
  let yearId = financialYearId;
  if (!yearId) {
    const { data: latestYear } = await supabase
      .from('financial_years')
      .select('id')
      .eq('company_id', companyId)
      .order('year_end', { ascending: false })
      .limit(1)
      .single();

    if (latestYear) {
      yearId = latestYear.id;
    }
  }

  if (!yearId) {
    redirect(`/companies?message=No financial years found for this company`);
  }

  // Get the financial year
  const { data: financialYear, error: fyError } = await supabase
    .from('financial_years')
    .select('*')
    .eq('id', yearId)
    .single();

  if (fyError || !financialYear) {
    notFound();
  }

  // Get analysis results if available
  const { data: analysisResult } = await supabase
    .from('tp_analyses')
    .select('*')
    .eq('financial_year_id', yearId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single();

  // Get all financial years for this company
  const { data: allYears } = await supabase
    .from('financial_years')
    .select('id, year_end, extraction_status, analysis_status')
    .eq('company_id', companyId)
    .order('year_end', { ascending: false });

  return (
    <PageContainer
      title={`TP Analysis - ${company.name}`}
      description={`Financial Year: ${financialYear.year_end}`}
    >
      <AnalysisPageClient
        company={company}
        financialYear={financialYear}
        analysisResult={analysisResult}
        allYears={allYears || []}
      />
    </PageContainer>
  );
}
