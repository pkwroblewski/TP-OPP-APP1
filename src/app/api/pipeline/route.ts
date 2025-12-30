// src/app/api/pipeline/route.ts
// Pipeline API - List all and create new

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
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
      return NextResponse.json(
        { error: 'Failed to fetch pipeline items' },
        { status: 500 }
      );
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

    // Attach analysis to pipeline items
    const itemsWithAnalysis = pipelineItems?.map((item) => ({
      ...item,
      analysis: analysisMap.get(item.company_id) || null,
    })) || [];

    return NextResponse.json({
      items: itemsWithAnalysis,
      count: itemsWithAnalysis.length,
    });
  } catch (error) {
    console.error('Pipeline GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, notes, nextAction, nextActionDate } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if already in pipeline
    const { data: existing } = await supabase
      .from('opportunity_pipeline')
      .select('id')
      .eq('company_id', companyId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Company is already in the pipeline' },
        { status: 409 }
      );
    }

    // Create pipeline entry
    const { data: newEntry, error: createError } = await supabase
      .from('opportunity_pipeline')
      .insert({
        company_id: companyId,
        status: 'identified',
        notes: notes || null,
        next_action: nextAction || null,
        next_action_date: nextActionDate || null,
      })
      .select(`
        *,
        company:companies (
          id,
          name,
          rcs_number
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating pipeline entry:', createError);
      return NextResponse.json(
        { error: 'Failed to create pipeline entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      item: newEntry,
      message: `${company.name} added to pipeline`,
    }, { status: 201 });
  } catch (error) {
    console.error('Pipeline POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
