// src/app/api/pipeline/[id]/route.ts
// Pipeline API - Single item operations

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Fetch pipeline item with company info
    const { data: item, error } = await supabase
      .from('opportunity_pipeline')
      .select(`
        *,
        company:companies (
          id,
          name,
          rcs_number,
          legal_form,
          sector
        )
      `)
      .eq('id', id)
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: 'Pipeline item not found' },
        { status: 404 }
      );
    }

    // Get latest financial year with analysis
    const { data: financialYears } = await supabase
      .from('financial_years')
      .select('id')
      .eq('company_id', item.company_id)
      .order('year_end', { ascending: false })
      .limit(1);

    let analysis = null;

    if (financialYears && financialYears.length > 0) {
      const { data: latestAnalysis } = await supabase
        .from('tp_analyses')
        .select(`
          risk_score,
          opportunities_count,
          priority_ranking,
          company_classification,
          opportunities,
          analyzed_at
        `)
        .eq('financial_year_id', financialYears[0].id)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();

      analysis = latestAnalysis || null;
    }

    return NextResponse.json({
      item: {
        ...item,
        analysis,
      },
    });
  } catch (error) {
    console.error('Pipeline GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, nextAction, nextActionDate } = body;

    // Validate status if provided
    const validStatuses = ['identified', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes || null;
    if (nextAction !== undefined) updates.next_action = nextAction || null;
    if (nextActionDate !== undefined) updates.next_action_date = nextActionDate || null;

    // Update pipeline item
    const { data: updatedItem, error } = await supabase
      .from('opportunity_pipeline')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        company:companies (
          id,
          name,
          rcs_number
        )
      `)
      .single();

    if (error) {
      console.error('Error updating pipeline item:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pipeline item not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to update pipeline item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      item: updatedItem,
      message: 'Pipeline item updated successfully',
    });
  } catch (error) {
    console.error('Pipeline PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Get item info for response
    const { data: item } = await supabase
      .from('opportunity_pipeline')
      .select(`
        id,
        company:companies (
          name
        )
      `)
      .eq('id', id)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: 'Pipeline item not found' },
        { status: 404 }
      );
    }

    // Delete pipeline item
    const { error } = await supabase
      .from('opportunity_pipeline')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pipeline item:', error);
      return NextResponse.json(
        { error: 'Failed to delete pipeline item' },
        { status: 500 }
      );
    }

    const company = item.company as { name: string } | { name: string }[] | null;
    const companyName = Array.isArray(company)
      ? company[0]?.name
      : company?.name || 'Company';

    return NextResponse.json({
      success: true,
      message: `${companyName} removed from pipeline`,
    });
  } catch (error) {
    console.error('Pipeline DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
