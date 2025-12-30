// src/app/api/upload/route.ts
// Upload API route for storing PDFs in Google Drive and creating database records

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import {
  findOrCreateFolder,
  uploadFile,
  getFolderIds,
} from '@/lib/google/drive';

interface UploadResponse {
  success: boolean;
  companyId?: string;
  financialYearId?: string;
  message?: string;
  error?: string;
}

// Validate RCS number format (B followed by 5-6 digits)
function validateRcsNumber(rcsNumber: string): boolean {
  const rcsRegex = /^B\d{5,6}$/i;
  return rcsRegex.test(rcsNumber);
}

// Validate date format (YYYY-MM-DD)
function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date <= new Date();
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Get user session for OAuth access token
    const session = await auth();
    const accessToken = session?.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please sign in with Google first.' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const rcsNumber = (formData.get('rcsNumber') as string)?.toUpperCase();
    const companyName = (formData.get('companyName') as string)?.trim();
    const yearEnd = formData.get('yearEnd') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    if (!rcsNumber || !validateRcsNumber(rcsNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid RCS number format. Must be B followed by 5-6 digits (e.g., B123456)' },
        { status: 400 }
      );
    }

    if (!companyName || companyName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Company name is required and must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!yearEnd || !validateDate(yearEnd)) {
      return NextResponse.json(
        { success: false, error: 'Invalid year end date' },
        { status: 400 }
      );
    }

    // Get folder IDs from environment
    const { companiesFolderId } = getFolderIds();

    // Create company folder name: "{rcsNumber}-{companyName}"
    const companyFolderName = `${rcsNumber}-${companyName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')}`;

    // Create or find company folder in Google Drive (using user's OAuth token)
    console.log(`Creating/finding company folder: ${companyFolderName}`);
    const companyFolderId = await findOrCreateFolder(companyFolderName, companiesFolderId, accessToken);

    // Create year folder inside company folder
    console.log(`Creating/finding year folder: ${yearEnd}`);
    const yearFolderId = await findOrCreateFolder(yearEnd, companyFolderId, accessToken);

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload PDF to year folder (using user's OAuth token)
    console.log('Uploading PDF to Google Drive...');
    const { fileId: pdfFileId, webViewLink: pdfUrl } = await uploadFile(
      fileBuffer,
      'annual-accounts.pdf',
      yearFolderId,
      accessToken
    );

    console.log(`PDF uploaded: ${pdfFileId}`);

    // Initialize Supabase client
    const supabase = createServiceClient();

    // Create or update company record
    console.log('Creating/updating company record...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .upsert(
        {
          rcs_number: rcsNumber,
          name: companyName,
          gdrive_folder_id: companyFolderId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'rcs_number',
        }
      )
      .select('id')
      .single();

    if (companyError) {
      console.error('Company upsert error:', companyError);
      return NextResponse.json(
        { success: false, error: `Database error: ${companyError.message}` },
        { status: 500 }
      );
    }

    // Create financial_year record
    console.log('Creating financial year record...');
    const { data: financialYear, error: fyError } = await supabase
      .from('financial_years')
      .insert({
        company_id: company.id,
        year_end: yearEnd,
        gdrive_folder_id: yearFolderId,
        gdrive_pdf_file_id: pdfFileId,
        gdrive_pdf_url: pdfUrl,
        extraction_status: 'pending',
      })
      .select('id')
      .single();

    if (fyError) {
      // Check if it's a duplicate
      if (fyError.code === '23505') {
        // Unique violation - update existing record
        const { data: existingFY, error: updateError } = await supabase
          .from('financial_years')
          .update({
            gdrive_folder_id: yearFolderId,
            gdrive_pdf_file_id: pdfFileId,
            gdrive_pdf_url: pdfUrl,
            extraction_status: 'pending',
          })
          .eq('company_id', company.id)
          .eq('year_end', yearEnd)
          .select('id')
          .single();

        if (updateError) {
          console.error('Financial year update error:', updateError);
          return NextResponse.json(
            { success: false, error: `Database error: ${updateError.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          companyId: company.id,
          financialYearId: existingFY.id,
          message: 'Annual accounts updated successfully',
        });
      }

      console.error('Financial year insert error:', fyError);
      return NextResponse.json(
        { success: false, error: `Database error: ${fyError.message}` },
        { status: 500 }
      );
    }

    console.log('Upload complete!');

    return NextResponse.json({
      success: true,
      companyId: company.id,
      financialYearId: financialYear.id,
      message: 'Annual accounts uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
