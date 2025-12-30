// src/app/api/analyze/route.ts
// Analysis API route - sends extraction JSON to Claude for TP analysis
// CRITICAL: This route only uses extraction_data from database, NEVER PDFs

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  callClaude,
  buildTPSystemPrompt,
  buildTPAnalysisPrompt,
  parseAnalysisResponse,
  createBlockedAnalysisResult,
  filterOpportunitiesByReadiness,
  enrichOpportunitiesWithScope,
} from '@/lib/analysis';
import type { ParserStructuredExtraction } from '@/lib/parser';
import type { TPAnalysisResult } from '@/lib/types/analysis';
import crypto from 'crypto';

interface AnalyzeRequest {
  financialYearId: string;
  forceAnalysis?: boolean;
}

interface AnalyzeResponse {
  success: boolean;
  analysis_id?: string;
  analysis?: TPAnalysisResult;
  blocked?: boolean;
  blocking_issues?: string[];
  validation_warnings?: string[];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  const supabase = createServiceClient();

  try {
    // 1. Parse request body
    const body: AnalyzeRequest = await request.json();
    const { financialYearId, forceAnalysis = false } = body;

    if (!financialYearId) {
      return NextResponse.json(
        { success: false, error: 'financialYearId is required' },
        { status: 400 }
      );
    }

    console.log(`[Analyze] Starting analysis for financial year: ${financialYearId}`);

    // 2. Fetch financial year with extraction data
    const { data: financialYear, error: fyError } = await supabase
      .from('financial_years')
      .select(`
        id,
        company_id,
        year_end,
        extraction_status,
        extraction_data,
        extraction_schema_version,
        analysis_status,
        analysis_input_hash,
        companies (
          id,
          name,
          rcs_number
        )
      `)
      .eq('id', financialYearId)
      .single();

    if (fyError || !financialYear) {
      console.error('[Analyze] Financial year not found:', fyError);
      return NextResponse.json(
        { success: false, error: 'Financial year not found' },
        { status: 404 }
      );
    }

    // 3. Validate extraction is complete
    if (financialYear.extraction_status !== 'completed') {
      return NextResponse.json(
        { success: false, error: `Extraction not completed. Status: ${financialYear.extraction_status}` },
        { status: 400 }
      );
    }

    if (!financialYear.extraction_data) {
      return NextResponse.json(
        { success: false, error: 'No extraction data available' },
        { status: 400 }
      );
    }

    const extraction = financialYear.extraction_data as ParserStructuredExtraction;
    const company = financialYear.companies as unknown as { id: string; name: string; rcs_number: string };

    // 4. Check pre-analysis gates
    const preAnalysisGates = extraction.pre_analysis_gates;

    if (!preAnalysisGates.can_proceed_to_analysis && !forceAnalysis) {
      console.log('[Analyze] Pre-analysis gates blocked:', preAnalysisGates.blocking_issues);
      return NextResponse.json({
        success: false,
        blocked: true,
        blocking_issues: preAnalysisGates.blocking_issues,
        error: 'Analysis blocked by pre-analysis gates. Use forceAnalysis=true to override.',
      }, { status: 400 });
    }

    // 5. Verify data integrity (hash check)
    const extractionJson = JSON.stringify(extraction);
    const currentHash = crypto
      .createHash('sha256')
      .update(extractionJson)
      .digest('hex');

    if (financialYear.analysis_input_hash && financialYear.analysis_input_hash !== currentHash) {
      console.warn('[Analyze] Extraction data has changed since last analysis');
      // Continue but note the change
    }

    // 6. Update status to processing
    await supabase
      .from('financial_years')
      .update({
        analysis_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', financialYearId);

    // 7. Check if analysis is blocked - return blocked result without calling Claude
    if (preAnalysisGates.readiness_level === 'BLOCKED') {
      const blockedResult = createBlockedAnalysisResult(
        preAnalysisGates.blocking_issues,
        extraction.metadata.account_type,
        extraction.metadata.company_size
      );

      // Store blocked result
      const { data: analysisRecord, error: insertError } = await supabase
        .from('tp_analyses')
        .insert({
          financial_year_id: financialYearId,
          analysis_result: blockedResult,
          readiness_level: 'BLOCKED',
          input_extraction_hash: currentHash,
          raw_analysis_response: null,
          analysis_limitations: preAnalysisGates.blocking_issues,
          opportunities_count: 0,
          risk_score: 0,
          analyzed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[Analyze] Failed to store blocked result:', insertError);
      }

      await supabase
        .from('financial_years')
        .update({
          analysis_status: 'blocked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', financialYearId);

      return NextResponse.json({
        success: true,
        analysis_id: analysisRecord?.id,
        blocked: true,
        blocking_issues: preAnalysisGates.blocking_issues,
        analysis: blockedResult,
      });
    }

    // 8. Build prompt and call Claude
    console.log('[Analyze] Building analysis prompt...');
    const systemPrompt = buildTPSystemPrompt();
    const userPrompt = buildTPAnalysisPrompt(extraction);

    console.log('[Analyze] Calling Claude API...');
    let claudeResponse;
    try {
      claudeResponse = await callClaude({
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        maxTokens: 8192,
        temperature: 0.2,
      });
      console.log(`[Analyze] Claude response received: ${claudeResponse.outputTokens} tokens`);
    } catch (claudeError) {
      console.error('[Analyze] Claude API failed:', claudeError);
      await updateAnalysisFailed(supabase, financialYearId, 'Claude API call failed');
      return NextResponse.json(
        { success: false, error: 'Claude API call failed' },
        { status: 500 }
      );
    }

    // 9. Parse Claude's response
    console.log('[Analyze] Parsing Claude response...');
    const parseResult = parseAnalysisResponse(claudeResponse.content, {
      account_type: extraction.metadata.account_type,
      company_size: extraction.metadata.company_size,
    });

    if (!parseResult.success || !parseResult.analysis) {
      console.error('[Analyze] Failed to parse response:', parseResult.error);

      // Store raw response for debugging
      await supabase
        .from('tp_analyses')
        .insert({
          financial_year_id: financialYearId,
          analysis_result: null,
          readiness_level: preAnalysisGates.readiness_level,
          input_extraction_hash: currentHash,
          raw_analysis_response: claudeResponse.content,
          analysis_limitations: [parseResult.error || 'Parse failed'],
          opportunities_count: 0,
          risk_score: 0,
          analyzed_at: new Date().toISOString(),
        });

      await updateAnalysisFailed(supabase, financialYearId, 'Failed to parse Claude response');
      return NextResponse.json(
        { success: false, error: parseResult.error || 'Failed to parse analysis response' },
        { status: 500 }
      );
    }

    let analysis = parseResult.analysis;

    // 10. Apply opportunity gate filter (mechanical enforcement)
    const isAbridged = extraction.metadata.account_type === 'ABRIDGED';
    const filteredOpportunities = filterOpportunitiesByReadiness(
      analysis.opportunities,
      preAnalysisGates,
      extraction.deterministic_metrics,
      isAbridged
    );

    // Enrich with scope metadata
    const enrichedOpportunities = enrichOpportunitiesWithScope(filteredOpportunities, preAnalysisGates);

    // Update analysis with filtered opportunities
    analysis = {
      ...analysis,
      opportunities: enrichedOpportunities,
      analysis_limitations: [
        ...analysis.analysis_limitations,
        ...parseResult.validationWarnings,
        ...(preAnalysisGates.readiness_level === 'READY_LIMITED'
          ? ['Analysis performed in LIMITED mode - some opportunity types excluded']
          : []),
      ],
    };

    // 11. Store analysis results
    console.log('[Analyze] Storing analysis results...');
    const { data: analysisRecord, error: insertError } = await supabase
      .from('tp_analyses')
      .insert({
        financial_year_id: financialYearId,
        analysis_result: analysis,
        readiness_level: preAnalysisGates.readiness_level,
        input_extraction_hash: currentHash,
        raw_analysis_response: claudeResponse.content,
        analysis_limitations: analysis.analysis_limitations,
        opportunities_count: analysis.opportunities.length,
        risk_score: analysis.risk_score,
        priority_ranking: analysis.priority_ranking,
        company_classification: analysis.company_classification,
        has_zero_spread: analysis.flags.has_zero_spread,
        has_thin_cap_risk: analysis.flags.has_thin_cap_risk,
        has_substance_concerns: analysis.flags.has_substance_concerns,
        analyzed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[Analyze] Failed to store analysis:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to store analysis results' },
        { status: 500 }
      );
    }

    // 12. Update financial year status
    await supabase
      .from('financial_years')
      .update({
        analysis_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', financialYearId);

    console.log('[Analyze] Analysis completed successfully');

    // 13. Return response
    return NextResponse.json({
      success: true,
      analysis_id: analysisRecord.id,
      analysis,
      validation_warnings: parseResult.validationWarnings,
    });
  } catch (error) {
    console.error('[Analyze] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Update financial year with failed analysis status
 */
async function updateAnalysisFailed(
  supabase: ReturnType<typeof createServiceClient>,
  financialYearId: string,
  errorMessage: string
): Promise<void> {
  await supabase
    .from('financial_years')
    .update({
      analysis_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', financialYearId);
}
