// src/lib/google/document-ai.ts
// Google Document AI client for PDF extraction
// Supports both synchronous (<=30 pages) and batch processing (>30 pages)

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Storage } from '@google-cloud/storage';
import { getCredentials } from './auth';
import crypto from 'crypto';

// Document AI types
export interface DocumentAIPage {
  pageNumber: number;
  dimension: {
    width: number;
    height: number;
  };
  blocks: DocumentAIBlock[];
  paragraphs: DocumentAIParagraph[];
  tables: DocumentAITable[];
}

export interface DocumentAIBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface DocumentAIParagraph {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface DocumentAITable {
  headerRows: DocumentAITableRow[];
  bodyRows: DocumentAITableRow[];
  boundingBox: BoundingBox;
}

export interface DocumentAITableRow {
  cells: DocumentAITableCell[];
}

export interface DocumentAITableCell {
  text: string;
  rowSpan: number;
  colSpan: number;
  confidence: number;
}

export interface BoundingBox {
  normalizedVertices: Array<{ x: number; y: number }>;
}

export interface DocumentAIResult {
  text: string;
  pages: DocumentAIPage[];
  entities: DocumentAIEntity[];
  mimeType: string;
}

export interface DocumentAIEntity {
  type: string;
  mentionText: string;
  confidence: number;
  pageAnchor?: {
    pageRefs: Array<{ page: number }>;
  };
}

let clientInstance: DocumentProcessorServiceClient | null = null;

/**
 * Get or create a Document AI client instance
 */
function getClient(): DocumentProcessorServiceClient {
  if (clientInstance) {
    return clientInstance;
  }

  const credentials = getCredentials();
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us';

  // Use region-specific endpoint for Document AI
  const apiEndpoint = location === 'eu'
    ? 'eu-documentai.googleapis.com'
    : `${location}-documentai.googleapis.com`;

  clientInstance = new DocumentProcessorServiceClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    projectId: credentials.project_id,
    apiEndpoint,
  });

  return clientInstance;
}

/**
 * Get the processor name (full resource path)
 */
function getProcessorName(): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION;
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is not set');
  }

  if (!location) {
    throw new Error('GOOGLE_CLOUD_LOCATION environment variable is not set');
  }

  if (!processorId) {
    throw new Error('GOOGLE_DOCUMENT_AI_PROCESSOR_ID environment variable is not set');
  }

  return `projects/${projectId}/locations/${location}/processors/${processorId}`;
}

// GCS client for batch processing
let storageInstance: Storage | null = null;

function getStorageClient(): Storage {
  if (storageInstance) {
    return storageInstance;
  }

  const credentials = getCredentials();
  storageInstance = new Storage({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    projectId: credentials.project_id,
  });

  return storageInstance;
}

/**
 * Process a PDF document using Document AI
 * Automatically uses batch processing for documents > 15 pages
 *
 * @param pdfBuffer - PDF file as a Buffer
 * @param options - Optional processing options
 * @returns Extracted document data
 */
export async function processDocument(
  pdfBuffer: Buffer,
  options: { timeoutMs?: number } = {}
): Promise<DocumentAIResult> {
  const timeoutMs = options.timeoutMs || 300000;

  console.log(`[Document AI] PDF size: ${pdfBuffer.length} bytes`);
  console.log(`[Document AI] Timeout: ${timeoutMs}ms`);

  // Try synchronous processing first (works for <= 15 pages with OCR, <= 30 with native PDF)
  try {
    return await processDocumentSync(pdfBuffer, timeoutMs);
  } catch (error: unknown) {
    const err = error as { reason?: string; message?: string };

    // If page limit exceeded, use batch processing
    if (err.reason === 'PAGE_LIMIT_EXCEEDED' || err.message?.includes('PAGE_LIMIT_EXCEEDED') || err.message?.includes('page limit')) {
      console.log('[Document AI] Page limit exceeded, switching to batch processing...');
      return await processDocumentBatch(pdfBuffer, timeoutMs);
    }

    throw error;
  }
}

/**
 * Process a document synchronously (for documents <= 15 pages)
 */
async function processDocumentSync(
  pdfBuffer: Buffer,
  timeoutMs: number
): Promise<DocumentAIResult> {
  const client = getClient();
  const processorName = getProcessorName();
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us';
  const apiEndpoint = location === 'eu' ? 'eu-documentai.googleapis.com' : `${location}-documentai.googleapis.com`;

  console.log(`[Document AI] Using SYNC processing`);
  console.log(`[Document AI] Using processor: ${processorName}`);
  console.log(`[Document AI] API endpoint: ${apiEndpoint}`);

  const request = {
    name: processorName,
    rawDocument: {
      content: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
    skipHumanReview: true,
    processOptions: {
      ocrConfig: {
        enableNativePdfParsing: true,
      },
    },
  };

  let result;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Document AI processing timed out after ${timeoutMs / 1000} seconds.`));
      }, timeoutMs);
    });

    const processingPromise = client.processDocument(request);
    const response = await Promise.race([processingPromise, timeoutPromise]);
    [result] = response;

    console.log(`[Document AI] Sync processing completed successfully`);
    console.log(`[Document AI] Processed ${result.document?.pages?.length || 0} pages`);
  } catch (error: unknown) {
    const err = error as { code?: number; details?: string; message?: string; statusDetails?: unknown[]; reason?: string };

    if (err.message?.includes('timed out')) {
      console.error('[Document AI] Processing timed out');
      throw error;
    }

    console.error('[Document AI] API Error:', {
      code: err.code,
      details: err.details,
      message: err.message,
      reason: err.reason,
      statusDetails: JSON.stringify(err.statusDetails, null, 2),
    });

    if (err.reason === 'PAGE_LIMIT_EXCEEDED') {
      throw error; // Let the caller handle this and switch to batch
    }

    if (err.code === 8 || err.message?.includes('quota')) {
      throw new Error('Document AI quota exceeded. Please try again later.');
    }

    if (err.code === 7 || err.code === 16) {
      throw new Error('Document AI authentication failed.');
    }

    throw error;
  }

  if (!result.document) {
    throw new Error('Document AI returned no document');
  }

  return parseDocumentResponse(result.document);
}

/**
 * Process a document using batch processing (for documents > 15 pages)
 * Uses Google Cloud Storage as intermediate storage
 */
async function processDocumentBatch(
  pdfBuffer: Buffer,
  timeoutMs: number
): Promise<DocumentAIResult> {
  const client = getClient();
  const storage = getStorageClient();
  const processorName = getProcessorName();
  const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || `${process.env.GOOGLE_CLOUD_PROJECT_ID}-docai-temp`;

  console.log(`[Document AI] Using BATCH processing`);
  console.log(`[Document AI] Using processor: ${processorName}`);
  console.log(`[Document AI] Using bucket: ${bucketName}`);

  // Generate unique file names
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  const inputFileName = `docai-input/${timestamp}-${randomId}/document.pdf`;
  const outputPrefix = `docai-output/${timestamp}-${randomId}/`;

  try {
    // Ensure bucket exists
    const bucket = storage.bucket(bucketName);
    const [bucketExists] = await bucket.exists();
    if (!bucketExists) {
      console.log(`[Document AI] Creating bucket: ${bucketName}`);
      await storage.createBucket(bucketName, {
        location: process.env.GOOGLE_CLOUD_LOCATION || 'EU',
        storageClass: 'STANDARD',
      });
    }

    // Upload PDF to GCS
    console.log(`[Document AI] Uploading PDF to gs://${bucketName}/${inputFileName}`);
    const inputFile = bucket.file(inputFileName);
    await inputFile.save(pdfBuffer, {
      contentType: 'application/pdf',
    });

    // Create batch processing request
    const request = {
      name: processorName,
      inputDocuments: {
        gcsDocuments: {
          documents: [{
            gcsUri: `gs://${bucketName}/${inputFileName}`,
            mimeType: 'application/pdf',
          }],
        },
      },
      documentOutputConfig: {
        gcsOutputConfig: {
          gcsUri: `gs://${bucketName}/${outputPrefix}`,
        },
      },
      skipHumanReview: true,
    };

    console.log('[Document AI] Starting batch processing...');
    const [operation] = await client.batchProcessDocuments(request);

    // Wait for the operation to complete using the promise
    console.log('[Document AI] Waiting for batch processing to complete...');

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Batch processing timed out after ${timeoutMs / 1000} seconds.`));
      }, timeoutMs);
    });

    // Wait for operation to complete with timeout
    const operationPromise = operation.promise();
    await Promise.race([operationPromise, timeoutPromise]);

    console.log('[Document AI] Batch processing completed, fetching results...');

    // Find and download all output files (batch processing creates shards for large docs)
    const [files] = await bucket.getFiles({ prefix: outputPrefix });
    const jsonFiles = files.filter(f => f.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name));

    if (jsonFiles.length === 0) {
      throw new Error('No output files found from batch processing');
    }

    console.log(`[Document AI] Found ${jsonFiles.length} output shard(s)`);

    // Merge all shards into a single document
    let mergedText = '';
    const mergedPages: unknown[] = [];
    const mergedEntities: Array<{ type?: string; mentionText?: string; confidence?: number; pageAnchor?: { pageRefs?: Array<{ page?: number | string }> } }> = [];

    for (const jsonFile of jsonFiles) {
      const [outputContent] = await jsonFile.download();
      const shardJson = JSON.parse(outputContent.toString());

      // Append text (with offset tracking for text anchors)
      const textOffset = mergedText.length;
      if (shardJson.text) {
        mergedText += shardJson.text;
      }

      // Add pages
      if (shardJson.pages && Array.isArray(shardJson.pages)) {
        mergedPages.push(...shardJson.pages);
      }

      // Add entities (adjusting text anchors if needed)
      if (shardJson.entities && Array.isArray(shardJson.entities)) {
        mergedEntities.push(...shardJson.entities);
      }

      console.log(`[Document AI] Shard ${jsonFile.name}: ${shardJson.pages?.length || 0} pages`);
    }

    const outputJson = {
      text: mergedText,
      pages: mergedPages,
      entities: mergedEntities,
    };

    console.log(`[Document AI] Merged output: ${outputJson.pages?.length || 0} total pages`);

    // Clean up GCS files
    console.log('[Document AI] Cleaning up temporary files...');
    await inputFile.delete().catch(() => {});
    for (const file of files) {
      await file.delete().catch(() => {});
    }

    return parseDocumentResponse(outputJson);
  } catch (error) {
    // Clean up on error
    try {
      const bucket = storage.bucket(bucketName);
      const [inputFiles] = await bucket.getFiles({ prefix: `docai-input/${timestamp}-${randomId}/` });
      const [outputFiles] = await bucket.getFiles({ prefix: outputPrefix });
      for (const file of [...inputFiles, ...outputFiles]) {
        await file.delete().catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Parse Document AI response into our format
 */
function parseDocumentResponse(document: {
  text?: string;
  pages?: unknown[];
  entities?: Array<{
    type?: string;
    mentionText?: string;
    confidence?: number;
    pageAnchor?: {
      pageRefs?: Array<{ page?: number | string }>;
    };
  }>;
}): DocumentAIResult {
  // Extract full text
  const text = document.text || '';

  // Process pages
  const pages: DocumentAIPage[] = (document.pages || []).map((page, index) => {
    // Cast to unknown first to handle the complex types
    const pageData = page as unknown as Record<string, unknown>;
    const typedPage = page as { dimension?: { width?: number; height?: number } };
    return {
      pageNumber: index + 1,
      dimension: {
        width: (typedPage.dimension?.width as number) || 0,
        height: (typedPage.dimension?.height as number) || 0,
      },
      blocks: extractBlocks(pageData, text),
      paragraphs: extractParagraphs(pageData, text),
      tables: extractTables(pageData, text),
    };
  });

  // Extract entities
  const entities: DocumentAIEntity[] = (document.entities || []).map((entity) => ({
    type: entity.type || '',
    mentionText: entity.mentionText || '',
    confidence: entity.confidence || 0,
    pageAnchor: entity.pageAnchor
      ? {
          pageRefs: (entity.pageAnchor.pageRefs || []).map((ref) => ({
            page: Number(ref.page) || 0,
          })),
        }
      : undefined,
  }));

  return {
    text,
    pages,
    entities,
    mimeType: 'application/pdf',
  };
}

/**
 * Extract text from a text anchor
 */
function extractTextFromAnchor(
  textAnchor: unknown,
  fullText: string
): string {
  const anchor = textAnchor as { textSegments?: Array<{ startIndex?: string | number; endIndex?: string | number }> } | null | undefined;
  if (!anchor?.textSegments) {
    return '';
  }

  return anchor.textSegments
    .map((segment) => {
      const startIndex = Number(segment.startIndex || 0);
      const endIndex = Number(segment.endIndex || 0);
      return fullText.substring(startIndex, endIndex);
    })
    .join('');
}

/**
 * Extract blocks from a page
 */
function extractBlocks(
  page: Record<string, unknown>,
  fullText: string
): DocumentAIBlock[] {
  const blocks = page.blocks as Array<Record<string, unknown>> | undefined;
  if (!blocks) {
    return [];
  }

  return blocks.map((block) => {
    const layout = block.layout as Record<string, unknown> | undefined;
    return {
      text: extractTextFromAnchor(layout?.textAnchor, fullText),
      confidence: (layout?.confidence as number) || 0,
      boundingBox: extractBoundingBox(layout?.boundingPoly),
    };
  });
}

/**
 * Extract paragraphs from a page
 */
function extractParagraphs(
  page: Record<string, unknown>,
  fullText: string
): DocumentAIParagraph[] {
  const paragraphs = page.paragraphs as Array<Record<string, unknown>> | undefined;
  if (!paragraphs) {
    return [];
  }

  return paragraphs.map((paragraph) => {
    const layout = paragraph.layout as Record<string, unknown> | undefined;
    return {
      text: extractTextFromAnchor(layout?.textAnchor, fullText),
      confidence: (layout?.confidence as number) || 0,
      boundingBox: extractBoundingBox(layout?.boundingPoly),
    };
  });
}

/**
 * Extract tables from a page
 */
function extractTables(
  page: Record<string, unknown>,
  fullText: string
): DocumentAITable[] {
  const tables = page.tables as Array<Record<string, unknown>> | undefined;
  if (!tables) {
    return [];
  }

  return tables.map((table) => {
    const layout = table.layout as Record<string, unknown> | undefined;
    return {
      headerRows: extractTableRows(table.headerRows as unknown[], fullText),
      bodyRows: extractTableRows(table.bodyRows as unknown[], fullText),
      boundingBox: extractBoundingBox(layout?.boundingPoly),
    };
  });
}

/**
 * Extract table rows
 */
function extractTableRows(
  rows: unknown[] | undefined,
  fullText: string
): DocumentAITableRow[] {
  if (!rows) {
    return [];
  }

  return rows.map((row) => {
    const typedRow = row as { cells?: Array<{ layout?: { textAnchor?: unknown; confidence?: number }; rowSpan?: number; colSpan?: number }> };
    return {
      cells: (typedRow.cells || []).map((cell) => ({
        text: extractTextFromAnchor(
          cell.layout?.textAnchor as { textSegments?: Array<{ startIndex?: string | number; endIndex?: string | number }> },
          fullText
        ),
        rowSpan: cell.rowSpan || 1,
        colSpan: cell.colSpan || 1,
        confidence: cell.layout?.confidence || 0,
      })),
    };
  });
}

/**
 * Extract bounding box from bounding poly
 */
function extractBoundingBox(
  boundingPoly: unknown
): BoundingBox {
  const poly = boundingPoly as { normalizedVertices?: Array<{ x?: number; y?: number }> } | undefined;

  if (!poly?.normalizedVertices) {
    return { normalizedVertices: [] };
  }

  return {
    normalizedVertices: poly.normalizedVertices.map((v) => ({
      x: v.x || 0,
      y: v.y || 0,
    })),
  };
}

/**
 * Get Document AI configuration info
 */
export function getDocumentAIConfig(): {
  projectId: string;
  location: string;
  processorId: string;
  processorName: string;
} {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
  const location = process.env.GOOGLE_CLOUD_LOCATION || '';
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || '';

  return {
    projectId,
    location,
    processorId,
    processorName: getProcessorName(),
  };
}
