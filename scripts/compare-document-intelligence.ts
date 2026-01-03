// scripts/compare-document-intelligence.ts
// Compare Google Document AI vs Azure Document Intelligence on a PDF.

import * as dotenv from 'dotenv';
import * as path from 'path';
import { readFile } from 'fs/promises';
import { processDocument } from '../src/lib/google/document-ai.ts';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

type QualitySummary = {
  pages: number;
  text_length: number;
  tables: number;
  blocks: number;
  paragraphs: number;
  pcn_codes_found: number;
  top_pcn_codes: Array<{ code: string; count: number }>;
};

type AzureAnalyzeResult = {
  content?: string;
  pages?: Array<{ lines?: unknown[] }>;
  tables?: unknown[];
  paragraphs?: unknown[];
};

const DEFAULT_PDF_PATH = 'C:\\Users\\bitpk\\Downloads\\B155908.pdf';

function getPdfPath(): string {
  return process.argv[2] || process.env.PDF_PATH || DEFAULT_PDF_PATH;
}

function buildPcnStats(text: string): {
  pcn_codes_found: number;
  top_pcn_codes: Array<{ code: string; count: number }>;
} {
  const matches = text.match(/\b\d{4}\b/g) || [];
  const counts: Record<string, number> = {};
  for (const code of matches) {
    counts[code] = (counts[code] || 0) + 1;
  }

  const topPcnCodes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  return {
    pcn_codes_found: Object.keys(counts).length,
    top_pcn_codes: topPcnCodes,
  };
}

function buildDocumentAIQuality(result: {
  text: string;
  pages: Array<{ tables?: unknown[]; blocks?: unknown[]; paragraphs?: unknown[] }>;
}): QualitySummary {
  const text = result.text || '';
  const pages = result.pages || [];

  const tables = pages.reduce((sum, page) => sum + (page.tables?.length || 0), 0);
  const blocks = pages.reduce((sum, page) => sum + (page.blocks?.length || 0), 0);
  const paragraphs = pages.reduce((sum, page) => sum + (page.paragraphs?.length || 0), 0);
  const { pcn_codes_found, top_pcn_codes } = buildPcnStats(text);

  return {
    pages: pages.length,
    text_length: text.length,
    tables,
    blocks,
    paragraphs,
    pcn_codes_found,
    top_pcn_codes,
  };
}

function buildAzureQuality(result: AzureAnalyzeResult): QualitySummary {
  const text = result.content || '';
  const pages = result.pages || [];

  const tables = result.tables?.length || 0;
  const paragraphs = result.paragraphs?.length || 0;
  const blocks = pages.reduce((sum, page) => sum + (page.lines?.length || 0), 0);
  const { pcn_codes_found, top_pcn_codes } = buildPcnStats(text);

  return {
    pages: pages.length,
    text_length: text.length,
    tables,
    blocks,
    paragraphs,
    pcn_codes_found,
    top_pcn_codes,
  };
}

function formatTopCodes(codes: Array<{ code: string; count: number }>): string {
  if (codes.length === 0) {
    return 'none';
  }
  return codes.map((entry) => `${entry.code}:${entry.count}`).join(', ');
}

function logQuality(label: string, quality: QualitySummary): void {
  console.log('');
  console.log(`[${label}] pages=${quality.pages}`);
  console.log(`[${label}] text_length=${quality.text_length}`);
  console.log(`[${label}] tables=${quality.tables}`);
  console.log(`[${label}] blocks=${quality.blocks}`);
  console.log(`[${label}] paragraphs=${quality.paragraphs}`);
  console.log(`[${label}] pcn_codes_found=${quality.pcn_codes_found}`);
  console.log(`[${label}] top_pcn_codes=${formatTopCodes(quality.top_pcn_codes)}`);
}

function logDelta(google: QualitySummary, azure: QualitySummary): void {
  const delta = {
    pages: azure.pages - google.pages,
    text_length: azure.text_length - google.text_length,
    tables: azure.tables - google.tables,
    blocks: azure.blocks - google.blocks,
    paragraphs: azure.paragraphs - google.paragraphs,
    pcn_codes_found: azure.pcn_codes_found - google.pcn_codes_found,
  };

  console.log('');
  console.log('[Delta] Azure - Google');
  console.log(`[Delta] pages=${delta.pages}`);
  console.log(`[Delta] text_length=${delta.text_length}`);
  console.log(`[Delta] tables=${delta.tables}`);
  console.log(`[Delta] blocks=${delta.blocks}`);
  console.log(`[Delta] paragraphs=${delta.paragraphs}`);
  console.log(`[Delta] pcn_codes_found=${delta.pcn_codes_found}`);
}

async function analyzeAzureDocument(pdfBuffer: Buffer): Promise<AzureAnalyzeResult> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  const modelId = process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL || 'prebuilt-layout';
  const apiVersion = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION || '2023-07-31';

  if (!endpoint) {
    throw new Error('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT is not set');
  }
  if (!key) {
    throw new Error('AZURE_DOCUMENT_INTELLIGENCE_KEY is not set');
  }

  const baseEndpoint = endpoint.replace(/\/+$/, '');
  const analyzeUrls = [
    `${baseEndpoint}/documentintelligence/documentModels/${encodeURIComponent(modelId)}:analyze?api-version=${apiVersion}`,
    `${baseEndpoint}/formrecognizer/documentModels/${encodeURIComponent(modelId)}:analyze?api-version=${apiVersion}`,
  ];

  let lastError: Error | null = null;

  for (const url of analyzeUrls) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/pdf',
      },
      body: pdfBuffer,
    });

    if (response.status === 404) {
      lastError = new Error(`Azure analyze endpoint not found: ${url}`);
      continue;
    }

    if (response.status === 202) {
      const operationLocation = response.headers.get('operation-location');
      if (!operationLocation) {
        throw new Error('Azure analysis accepted but missing operation-location header');
      }
      return await pollAzureOperation(operationLocation, key);
    }

    if (!response.ok) {
      const responseText = await safeReadText(response);
      throw new Error(`Azure analyze failed (${response.status}): ${responseText}`);
    }

    const json = await response.json();
    return (json.analyzeResult ?? json) as AzureAnalyzeResult;
  }

  throw lastError || new Error('Azure analyze failed: no endpoint matched');
}

async function pollAzureOperation(operationUrl: string, key: string): Promise<AzureAnalyzeResult> {
  const timeoutMs = Number(process.env.AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS || 180000);
  const pollIntervalMs = Number(process.env.AZURE_DOCUMENT_INTELLIGENCE_POLL_MS || 1000);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await fetch(operationUrl, {
      headers: {
        'Ocp-Apim-Subscription-Key': key,
      },
    });

    if (!response.ok) {
      const responseText = await safeReadText(response);
      throw new Error(`Azure operation poll failed (${response.status}): ${responseText}`);
    }

    const json = await response.json();
    const status = String(json.status || '').toLowerCase();

    if (status === 'succeeded') {
      return (json.analyzeResult ?? json) as AzureAnalyzeResult;
    }
    if (status === 'failed') {
      throw new Error(`Azure analysis failed: ${JSON.stringify(json.error || json)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Azure analysis timed out after ${timeoutMs / 1000} seconds`);
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return 'Unable to read response body';
  }
}

async function main(): Promise<void> {
  const pdfPath = getPdfPath();
  console.log(`[Compare] PDF: ${pdfPath}`);

  const pdfBuffer = await readFile(pdfPath);
  console.log(`[Compare] PDF size: ${pdfBuffer.length} bytes`);

  console.log('[Compare] Running Google Document AI...');
  const documentAIResult = await processDocument(pdfBuffer, { timeoutMs: 300000 });
  const googleQuality = buildDocumentAIQuality(documentAIResult);
  logQuality('Google', googleQuality);

  console.log('[Compare] Running Azure Document Intelligence (prebuilt-layout)...');
  const azureResult = await analyzeAzureDocument(pdfBuffer);
  const azureQuality = buildAzureQuality(azureResult);
  logQuality('Azure', azureQuality);

  logDelta(googleQuality, azureQuality);
}

main().catch((error) => {
  console.error('[Compare] Failed:', error);
  process.exit(1);
});
