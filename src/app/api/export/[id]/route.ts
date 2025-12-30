// src/app/api/export/[id]/route.ts
// Export analysis results as CSV

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: analysisId } = await params;
    const supabase = createServiceClient();

    // Fetch analysis with related data
    const { data: analysis, error: analysisError } = await supabase
      .from('tp_analyses')
      .select(`
        *,
        financial_year:financial_years (
          id,
          year_end,
          account_type,
          company_size,
          company:companies (
            id,
            name,
            rcs_number,
            legal_form,
            sector
          )
        )
      `)
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Type the nested data
    type FYType = {
      id: string;
      year_end: string;
      account_type: string | null;
      company_size: string | null;
      company: {
        id: string;
        name: string;
        rcs_number: string;
        legal_form: string | null;
        sector: string | null;
      } | { id: string; name: string; rcs_number: string; legal_form: string | null; sector: string | null; }[] | null;
    };

    const fyData = analysis.financial_year as FYType | FYType[] | null;
    const fy = Array.isArray(fyData) ? fyData[0] : fyData;
    const companyData = fy?.company;
    const company = Array.isArray(companyData) ? companyData[0] : companyData;

    // Parse opportunities from JSON
    const opportunities = analysis.opportunities as Array<{
      opportunity_type: string;
      severity: string;
      affected_amount: number | null;
      description: string;
      recommendation: string;
      pcn_reference: string;
    }> || [];

    // Build CSV content
    const csvRows: string[] = [];

    // Header section
    csvRows.push('TP Opportunity Analysis Export');
    csvRows.push(`Export Date,${new Date().toISOString()}`);
    csvRows.push('');

    // Company section
    csvRows.push('COMPANY INFORMATION');
    csvRows.push(`Company Name,${escapeCSV(company?.name || 'Unknown')}`);
    csvRows.push(`RCS Number,${escapeCSV(company?.rcs_number || '')}`);
    csvRows.push(`Legal Form,${escapeCSV(company?.legal_form || '')}`);
    csvRows.push(`Sector,${escapeCSV(company?.sector || '')}`);
    csvRows.push(`Year End,${escapeCSV(fy?.year_end || '')}`);
    csvRows.push(`Account Type,${escapeCSV(fy?.account_type || '')}`);
    csvRows.push(`Company Size,${escapeCSV(fy?.company_size || '')}`);
    csvRows.push('');

    // Classification section
    csvRows.push('CLASSIFICATION');
    csvRows.push(`Company Classification,${escapeCSV(analysis.company_classification || 'N/A')}`);
    csvRows.push(`Classification Reasoning,${escapeCSV(analysis.classification_reasoning || '')}`);
    csvRows.push(`Priority Ranking,${escapeCSV(analysis.priority_ranking || 'N/A')}`);
    csvRows.push(`Risk Score,${analysis.risk_score ?? 'N/A'}`);
    csvRows.push(`Opportunities Count,${analysis.opportunities_count ?? 0}`);
    csvRows.push('');

    // Metrics section
    csvRows.push('KEY METRICS');
    csvRows.push(`Total IC Positions,${formatAmount(analysis.total_ic_positions)}`);
    csvRows.push(`IC Loans Granted,${formatAmount(analysis.ic_loans_granted)}`);
    csvRows.push(`IC Loans Received,${formatAmount(analysis.ic_loans_received)}`);
    csvRows.push(`IC Interest Income,${formatAmount(analysis.ic_interest_income)}`);
    csvRows.push(`IC Interest Expense,${formatAmount(analysis.ic_interest_expense)}`);
    csvRows.push(`Implied Lending Rate,${formatPercent(analysis.implied_lending_rate)}`);
    csvRows.push(`Implied Borrowing Rate,${formatPercent(analysis.implied_borrowing_rate)}`);
    csvRows.push(`IC Spread (bps),${analysis.ic_spread_bps ?? 'N/A'}`);
    csvRows.push(`Debt/Equity Ratio,${formatRatio(analysis.debt_equity_ratio)}`);
    csvRows.push(`Effective Tax Rate,${formatPercent(analysis.effective_tax_rate)}`);
    csvRows.push('');

    // Flags section
    csvRows.push('RISK FLAGS');
    csvRows.push(`Has Zero Spread,${analysis.has_zero_spread ? 'Yes' : 'No'}`);
    csvRows.push(`Has Thin Cap Risk,${analysis.has_thin_cap_risk ? 'Yes' : 'No'}`);
    csvRows.push(`Has Unremunerated Guarantee,${analysis.has_unremunerated_guarantee ? 'Yes' : 'No'}`);
    csvRows.push(`Has Undocumented Services,${analysis.has_undocumented_services ? 'Yes' : 'No'}`);
    csvRows.push(`Has Substance Concerns,${analysis.has_substance_concerns ? 'Yes' : 'No'}`);
    csvRows.push(`Has Related Party Issues,${analysis.has_related_party_issues ? 'Yes' : 'No'}`);
    csvRows.push(`Has Note 7ter Disclosures,${analysis.has_note_7ter_disclosures ? 'Yes' : 'No'}`);
    csvRows.push(`Non-Arms-Length Transaction Count,${analysis.non_arms_length_transaction_count ?? 0}`);
    csvRows.push('');

    // Opportunities section
    if (opportunities.length > 0) {
      csvRows.push('OPPORTUNITIES');
      csvRows.push('Type,Severity,Affected Amount,PCN Reference,Description,Recommendation');

      for (const opp of opportunities) {
        csvRows.push([
          escapeCSV(opp.opportunity_type || ''),
          escapeCSV(opp.severity || ''),
          formatAmount(opp.affected_amount),
          escapeCSV(opp.pcn_reference || ''),
          escapeCSV(opp.description || ''),
          escapeCSV(opp.recommendation || ''),
        ].join(','));
      }
    } else {
      csvRows.push('OPPORTUNITIES');
      csvRows.push('No opportunities identified');
    }

    const csvContent = csvRows.join('\n');

    // Generate filename
    const companyName = company?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
    const yearEnd = fy?.year_end || 'unknown';
    const filename = `TP_Analysis_${companyName}_${yearEnd}.csv`;

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}

// Helper functions
function escapeCSV(value: string): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
}
