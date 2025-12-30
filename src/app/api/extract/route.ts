// src/app/api/extract/route.ts
// Extraction API route - processes PDFs through Document AI and parser
// CRITICAL: This route only does extraction. It does NOT call Claude API.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { downloadFile } from '@/lib/google/drive';
import { processDocument } from '@/lib/google/document-ai';
import { parseDocument, EXTRACTION_SCHEMA_VERSION, type ParserStructuredExtraction } from '@/lib/parser';
import crypto from 'crypto';

interface ExtractRequest {
  financialYearId: string;
}

interface ExtractResponse {
  success: boolean;
  extraction_id?: string;
  status?: 'completed' | 'failed' | 'blocked';
  pre_analysis_gates?: {
    readiness_level: string;
    blocking_issues: string[];
    warning_issues: string[];
  };
  can_proceed_to_analysis?: boolean;
  requires_human_review?: boolean;
  review_reason?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractResponse>> {
  const supabase = createServiceClient();

  try {
    // Parse request body
    const body: ExtractRequest = await request.json();
    const { financialYearId } = body;

    if (!financialYearId) {
      return NextResponse.json(
        { success: false, error: 'financialYearId is required' },
        { status: 400 }
      );
    }

    // 1. Validate financial year exists and has PDF uploaded
    console.log(`[Extract] Starting extraction for financial year: ${financialYearId}`);

    const { data: financialYear, error: fyError } = await supabase
      .from('financial_years')
      .select(`
        id,
        company_id,
        year_end,
        gdrive_pdf_file_id,
        gdrive_pdf_url,
        extraction_status,
        companies (
          id,
          name,
          rcs_number
        )
      `)
      .eq('id', financialYearId)
      .single();

    if (fyError || !financialYear) {
      console.error('[Extract] Financial year not found:', fyError);
      return NextResponse.json(
        { success: false, error: 'Financial year not found' },
        { status: 404 }
      );
    }

    if (!financialYear.gdrive_pdf_file_id) {
      return NextResponse.json(
        { success: false, error: 'No PDF uploaded for this financial year' },
        { status: 400 }
      );
    }

    // Get company info (Supabase returns single object for belongs_to relations)
    const company = financialYear.companies as unknown as { id: string; name: string; rcs_number: string };

    // 2. Update extraction_status to 'processing'
    console.log('[Extract] Setting status to processing...');
    await supabase
      .from('financial_years')
      .update({
        extraction_status: 'processing',
      })
      .eq('id', financialYearId);

    // 3. Download PDF from Google Drive
    console.log('[Extract] Downloading PDF from Google Drive...');
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await downloadFile(financialYear.gdrive_pdf_file_id);
      console.log(`[Extract] PDF downloaded: ${pdfBuffer.length} bytes`);
    } catch (downloadError) {
      console.error('[Extract] PDF download failed:', downloadError);
      await updateExtractionFailed(supabase, financialYearId, 'Failed to download PDF from Google Drive');
      return NextResponse.json(
        { success: false, error: 'Failed to download PDF from Google Drive' },
        { status: 500 }
      );
    }

    // 4. Send PDF to Document AI (supports Layout Parser or Document OCR)
    console.log('[Extract] Processing PDF with Document AI...');
    let documentAIResult;
    try {
      // Use 5 minute timeout for Document OCR which can handle large documents
      documentAIResult = await processDocument(pdfBuffer, { timeoutMs: 300000 });
      console.log(`[Extract] Document AI returned ${documentAIResult.pages.length} pages`);
    } catch (docAIError) {
      const errorMessage = docAIError instanceof Error ? docAIError.message : 'Document AI processing failed';
      console.error('[Extract] Document AI processing failed:', errorMessage);
      await updateExtractionFailed(supabase, financialYearId, errorMessage);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    // 5. Parse response using Luxembourg GAAP parser
    console.log('[Extract] Parsing with Luxembourg GAAP parser...');
    const parseResult = await parseDocument(
      documentAIResult,
      company.rcs_number,
      company.name,
      financialYear.year_end
    );

    if (!parseResult.success || !parseResult.extraction) {
      console.error('[Extract] Parsing failed:', parseResult.error);
      await updateExtractionFailed(supabase, financialYearId, parseResult.error || 'Parsing failed');
      return NextResponse.json(
        { success: false, error: parseResult.error || 'Parsing failed' },
        { status: 500 }
      );
    }

    const extraction = parseResult.extraction;
    const preAnalysisGates = extraction.pre_analysis_gates;

    // 6. Evaluate pre-analysis gates
    console.log(`[Extract] Readiness level: ${preAnalysisGates.readiness_level}`);

    let analysisStatus: string;
    if (preAnalysisGates.readiness_level === 'BLOCKED') {
      analysisStatus = 'blocked';
    } else if (preAnalysisGates.readiness_level === 'READY_LIMITED') {
      analysisStatus = 'ready_with_warnings';
    } else {
      analysisStatus = 'ready';
    }

    // 7. Create analysis input hash for integrity check
    const extractionJson = JSON.stringify(extraction);
    const analysisInputHash = crypto
      .createHash('sha256')
      .update(extractionJson)
      .digest('hex');

    // 8. Store extraction results in database
    console.log('[Extract] Storing extraction results...');
    const { error: updateError } = await supabase
      .from('financial_years')
      .update({
        extraction_data: extraction,
        extraction_schema_version: EXTRACTION_SCHEMA_VERSION,
        unit_scale: extraction.metadata.unit_scale,
        unit_scale_validated: extraction.metadata.unit_scale_validated,
        account_type: extraction.metadata.account_type,
        company_size: extraction.metadata.company_size,
        reporting_standard: extraction.metadata.reporting_standard,
        extraction_confidence: extraction.metadata.overall_confidence,
        extraction_warnings: parseResult.warnings,
        extracted_at: new Date().toISOString(),
        extraction_status: 'completed',
        analysis_status: analysisStatus,
        analysis_input_hash: analysisInputHash,
      })
      .eq('id', financialYearId);

    if (updateError) {
      console.error('[Extract] Failed to store extraction:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to store extraction results' },
        { status: 500 }
      );
    }

    // 9. Store IC transactions in ic_transactions table
    if (extraction.ic_transactions_from_notes.length > 0) {
      console.log(`[Extract] Storing ${extraction.ic_transactions_from_notes.length} IC transactions...`);
      const icTransactions = extraction.ic_transactions_from_notes.map(tx => ({
        financial_year_id: financialYearId,
        transaction_type: tx.transaction_type,
        counterparty: tx.counterparty,
        counterparty_country: tx.counterparty_country || null,
        amount: tx.amount,
        currency: tx.currency || 'EUR',
        interest_rate: tx.interest_rate || null,
        maturity: tx.maturity || null,
        maturity_within_one_year: tx.maturity_within_one_year || null,
        maturity_after_one_year: tx.maturity_after_one_year || null,
        maturity_after_five_years: tx.maturity_after_five_years || null,
        is_subordinated: tx.is_subordinated || false,
        description: tx.description || null,
        source_page: tx.source_page || null,
        source_note: tx.source_note || null,
        source_text: tx.source_text || null,
        ecdf_code: tx.ecdf_code || null,
        extraction_confidence: tx.extraction_confidence || null,
      }));

      const { error: icError } = await supabase
        .from('ic_transactions')
        .insert(icTransactions);

      if (icError) {
        console.warn('[Extract] Failed to store IC transactions:', icError);
        // Non-fatal - continue
      }
    }

    // 10. Store related party transactions in related_party_transactions table
    if (extraction.related_party_transactions.length > 0) {
      console.log(`[Extract] Storing ${extraction.related_party_transactions.length} related party transactions...`);
      const rptTransactions = extraction.related_party_transactions.map(tx => ({
        financial_year_id: financialYearId,
        nature: tx.nature,
        counterparty: tx.counterparty || null,
        relationship: tx.relationship || null,
        amount: tx.amount || null,
        is_arms_length: tx.is_arms_length !== false,
        terms_description: tx.terms_description || null,
        source_page: tx.source_page || null,
        source_note: tx.source_note || null,
      }));

      const { error: rptError } = await supabase
        .from('related_party_transactions')
        .insert(rptTransactions);

      if (rptError) {
        console.warn('[Extract] Failed to store related party transactions:', rptError);
        // Non-fatal - continue
      }
    }

    // 11. Determine if human review is required
    const requiresHumanReview = preAnalysisGates.readiness_level === 'BLOCKED' ||
                                preAnalysisGates.required_review_actions.length > 0;

    let reviewReason: string | undefined;
    if (requiresHumanReview) {
      if (preAnalysisGates.blocking_issues.length > 0) {
        reviewReason = preAnalysisGates.blocking_issues[0];
      } else if (preAnalysisGates.required_review_actions.length > 0) {
        reviewReason = `${preAnalysisGates.required_review_actions.length} items require review`;
      }
    }

    console.log('[Extract] Extraction completed successfully');

    // 12. Return response
    return NextResponse.json({
      success: true,
      extraction_id: financialYearId,
      status: preAnalysisGates.readiness_level === 'BLOCKED' ? 'blocked' : 'completed',
      pre_analysis_gates: {
        readiness_level: preAnalysisGates.readiness_level,
        blocking_issues: preAnalysisGates.blocking_issues,
        warning_issues: preAnalysisGates.warning_issues,
      },
      can_proceed_to_analysis: preAnalysisGates.can_proceed_to_analysis,
      requires_human_review: requiresHumanReview,
      review_reason: reviewReason,
    });
  } catch (error) {
    console.error('[Extract] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Update financial year with failed extraction status
 */
async function updateExtractionFailed(
  supabase: ReturnType<typeof createServiceClient>,
  financialYearId: string,
  errorMessage: string
): Promise<void> {
  await supabase
    .from('financial_years')
    .update({
      extraction_status: 'failed',
      extraction_warnings: [errorMessage],
    })
    .eq('id', financialYearId);
}
