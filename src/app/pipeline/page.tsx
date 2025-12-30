// src/app/pipeline/page.tsx
// Pipeline page showing all opportunities being tracked

import { createServiceClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/layout/page-container';
import { PipelinePageClient } from './pipeline-page-client';
import type { PipelineItem } from '@/components/pipeline';

export default async function PipelinePage() {
  const supabase = createServiceClient();

  // Fetch all pipeline items with company info
  const { data: pipelineItems, error: pipelineError } = await supabase
    .from('opportunity_pipeline')
    .select(`
      *,
      company:companies (
        id,
        name,
        rcs_number
      )
    `)
    .order('updated_at', { ascending: false });

  if (pipelineError) {
    console.error('Error fetching pipeline:', pipelineError);
  }

  // Get latest analysis for each company in pipeline
  const companyIds = pipelineItems?.map((p) => p.company_id) || [];

  // Get all financial years for these companies
  const { data: financialYears } = await supabase
    .from('financial_years')
    .select('id, company_id')
    .in('company_id', companyIds)
    .order('year_end', { ascending: false });

  const yearIds = financialYears?.map((y) => y.id) || [];

  // Get analyses for these years
  const { data: analyses } = await supabase
    .from('tp_analyses')
    .select(`
      financial_year_id,
      risk_score,
      opportunities_count,
      priority_ranking,
      company_classification
    `)
    .in('financial_year_id', yearIds)
    .order('analyzed_at', { ascending: false });

  // Map analyses to companies (get latest for each company)
  const analysisMap = new Map<string, {
    risk_score: number | null;
    opportunities_count: number | null;
    priority_ranking: string | null;
    company_classification: string | null;
  }>();

  // Build year-to-company mapping
  const yearToCompany = new Map<string, string>();
  financialYears?.forEach((y) => {
    yearToCompany.set(y.id, y.company_id);
  });

  // Map analyses to companies (first one per company is latest due to ordering)
  analyses?.forEach((a) => {
    const companyId = yearToCompany.get(a.financial_year_id);
    if (companyId && !analysisMap.has(companyId)) {
      analysisMap.set(companyId, {
        risk_score: a.risk_score,
        opportunities_count: a.opportunities_count,
        priority_ranking: a.priority_ranking,
        company_classification: a.company_classification,
      });
    }
  });

  // Attach analysis to pipeline items and transform to expected shape
  const itemsWithAnalysis: PipelineItem[] = (pipelineItems || []).map((item) => {
    const companyData = item.company as { id: string; name: string; rcs_number: string } | null;
    return {
      id: item.id,
      company_id: item.company_id,
      status: item.status,
      notes: item.notes,
      next_action: item.next_action,
      next_action_date: item.next_action_date,
      created_at: item.created_at,
      updated_at: item.updated_at,
      company: companyData || { id: item.company_id, name: 'Unknown', rcs_number: '' },
      analysis: analysisMap.get(item.company_id) || null,
    };
  });

  return (
    <PageContainer
      title="Opportunity Pipeline"
      description="Track and manage transfer pricing opportunities"
    >
      <PipelinePageClient initialItems={itemsWithAnalysis} />
    </PageContainer>
  );
}
