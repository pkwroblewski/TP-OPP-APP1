// src/lib/azure/document-intelligence.ts
// Azure Document Intelligence client (prebuilt-layout) with mapping to DocumentAIResult.

import type {
  BoundingBox,
  DocumentAIBlock,
  DocumentAIPage,
  DocumentAIParagraph,
  DocumentAITable,
  DocumentAITableRow,
  DocumentAIResult,
} from '@/lib/google/document-ai';

type AzurePoint = { x: number; y: number };

type AzureBoundingRegion = {
  pageNumber?: number;
  polygon?: AzurePoint[];
};

type AzureLine = {
  content?: string;
  polygon?: AzurePoint[];
};

type AzurePage = {
  pageNumber?: number;
  width?: number;
  height?: number;
  lines?: AzureLine[];
};

type AzureParagraph = {
  content?: string;
  boundingRegions?: AzureBoundingRegion[];
};

type AzureTableCell = {
  rowIndex?: number;
  columnIndex?: number;
  content?: string;
  rowSpan?: number;
  columnSpan?: number;
  kind?: string;
  confidence?: number;
  boundingRegions?: AzureBoundingRegion[];
};

type AzureTable = {
  rowCount?: number;
  columnCount?: number;
  cells?: AzureTableCell[];
  boundingRegions?: AzureBoundingRegion[];
};

type AzureAnalyzeResult = {
  content?: string;
  pages?: AzurePage[];
  tables?: AzureTable[];
  paragraphs?: AzureParagraph[];
};

export function isAzureConfigured(): boolean {
  return Boolean(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT && process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY);
}

export async function processDocumentWithAzure(
  pdfBuffer: Buffer,
  options: { timeoutMs?: number } = {}
): Promise<DocumentAIResult> {
  const timeoutMs = options.timeoutMs ?? 180000;
  const analyzeResult = await analyzeDocumentWithAzure(pdfBuffer, timeoutMs);
  return mapAzureToDocumentAI(analyzeResult);
}

async function analyzeDocumentWithAzure(
  pdfBuffer: Buffer,
  timeoutMs: number
): Promise<AzureAnalyzeResult> {
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
      return await pollAzureOperation(operationLocation, key, timeoutMs);
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

async function pollAzureOperation(
  operationUrl: string,
  key: string,
  timeoutMs: number
): Promise<AzureAnalyzeResult> {
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

function mapAzureToDocumentAI(result: AzureAnalyzeResult): DocumentAIResult {
  const text = result.content || '';
  const pages = result.pages || [];
  const tables = result.tables || [];
  const paragraphs = result.paragraphs || [];
  const pageMap = new Map<number, AzurePage>();

  for (const page of pages) {
    if (page.pageNumber) {
      pageMap.set(page.pageNumber, page);
    }
  }

  const mappedPages: DocumentAIPage[] = pages.map((page, index) => {
    const pageNumber = page.pageNumber ?? index + 1;
    const dimension = {
      width: page.width || 0,
      height: page.height || 0,
    };

    const blocks: DocumentAIBlock[] = (page.lines || []).map((line) => ({
      text: line.content || '',
      confidence: 1,
      boundingBox: toBoundingBox(line.polygon, page),
    }));

    const mappedParagraphs: DocumentAIParagraph[] = paragraphs
      .filter((paragraph) => hasRegionOnPage(paragraph.boundingRegions, pageNumber))
      .map((paragraph) => ({
        text: paragraph.content || '',
        confidence: 1,
        boundingBox: toBoundingBox(getRegionPolygon(paragraph.boundingRegions, pageNumber), page),
      }));

    const mappedTables: DocumentAITable[] = tables
      .filter((table) => belongsToPage(table.boundingRegions, pageNumber))
      .map((table) => mapTableToDocumentAI(table, pageMap, pageNumber));

    return {
      pageNumber,
      dimension,
      blocks,
      paragraphs: mappedParagraphs,
      tables: mappedTables,
    };
  });

  return {
    text,
    pages: mappedPages,
    entities: [],
    mimeType: 'application/pdf',
  };
}

function mapTableToDocumentAI(
  table: AzureTable,
  pageMap: Map<number, AzurePage>,
  pageNumber: number
): DocumentAITable {
  const cells = table.cells || [];
  let rowCount = table.rowCount || 0;
  let columnCount = table.columnCount || 0;

  if (rowCount === 0 && cells.length > 0) {
    rowCount = Math.max(...cells.map((cell) => (cell.rowIndex ?? 0) + 1));
  }
  if (columnCount === 0 && cells.length > 0) {
    columnCount = Math.max(...cells.map((cell) => (cell.columnIndex ?? 0) + 1));
  }
  const headerRowIndices = new Set<number>();
  const rows: DocumentAITableRow[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const cells = Array.from({ length: columnCount }, () => ({
      text: '',
      rowSpan: 1,
      colSpan: 1,
      confidence: 0,
    }));
    rows.push({ cells });
  }

  for (const cell of cells) {
    const rowIndex = cell.rowIndex ?? 0;
    const colIndex = cell.columnIndex ?? 0;
    if (cell.kind === 'columnHeader') {
      headerRowIndices.add(rowIndex);
    }
    if (!rows[rowIndex] || !rows[rowIndex].cells[colIndex]) {
      continue;
    }
    rows[rowIndex].cells[colIndex] = {
      text: cell.content || '',
      rowSpan: cell.rowSpan || 1,
      colSpan: cell.columnSpan || 1,
      confidence: cell.confidence ?? 0,
    };
  }

  const headerRows: DocumentAITableRow[] = [];
  const bodyRows: DocumentAITableRow[] = [];

  rows.forEach((row, index) => {
    if (headerRowIndices.has(index)) {
      headerRows.push(row);
    } else {
      bodyRows.push(row);
    }
  });

  const page = pageMap.get(pageNumber);
  const boundingBox = toBoundingBox(getRegionPolygon(table.boundingRegions, pageNumber), page);

  return {
    headerRows,
    bodyRows,
    boundingBox,
  };
}

function hasRegionOnPage(regions: AzureBoundingRegion[] | undefined, pageNumber: number): boolean {
  if (!regions || regions.length === 0) {
    return false;
  }
  return regions.some((region) => region.pageNumber === pageNumber);
}

function belongsToPage(regions: AzureBoundingRegion[] | undefined, pageNumber: number): boolean {
  if (!regions || regions.length === 0) {
    return pageNumber === 1;
  }
  const primary = regions[0]?.pageNumber;
  if (primary) {
    return primary === pageNumber;
  }
  return regions.some((region) => region.pageNumber === pageNumber);
}

function getRegionPolygon(
  regions: AzureBoundingRegion[] | undefined,
  pageNumber: number
): AzurePoint[] | undefined {
  if (!regions || regions.length === 0) {
    return undefined;
  }
  const regionForPage = regions.find((region) => region.pageNumber === pageNumber);
  return regionForPage?.polygon ?? regions[0]?.polygon;
}

function toBoundingBox(
  polygon: AzurePoint[] | undefined,
  page: AzurePage | undefined
): BoundingBox {
  if (!polygon || polygon.length === 0 || !page?.width || !page?.height) {
    return { normalizedVertices: [] };
  }

  const width = page.width || 1;
  const height = page.height || 1;

  return {
    normalizedVertices: polygon.map((point) => ({
      x: clamp(point.x / width),
      y: clamp(point.y / height),
    })),
  };
}

function clamp(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
