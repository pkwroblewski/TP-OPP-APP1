// src/lib/parser/reference-column-extractor.ts
// CRITICAL: Extract PCN codes from Reference column
// This is the MOST RELIABLE extraction method for Luxembourg filings

import type { DocumentAIResult, DocumentAITable, DocumentAITableRow } from '@/lib/google/document-ai';
import { CODE_DICTIONARY, getCodeDefinition } from './code-dictionary';
import { parseNumericString } from './numeric-parser';

export interface ExtractedCode {
  code: string;
  value: number | null;
  current_year_value: number | null;
  prior_year_value: number | null;
  caption: string;
  page_number: number;
  confidence: number;
  match_source: 'reference_column' | 'caption_match';
  raw_value_string: string;
}

export interface ReferenceColumnResult {
  has_reference_column: boolean;
  extracted_codes: ExtractedCode[];
  detection_confidence: number;
  detection_evidence: string[];
}

// Pattern to match PCN/eCDF codes (4-digit numbers, sometimes with letters)
const PCN_CODE_PATTERN = /^(\d{4}[A-Z]?)$/;

// Keywords that indicate a reference/code column
const REFERENCE_COLUMN_KEYWORDS = [
  'reference', 'ref', 'ref.', 'pcn', 'ecdf', 'code', 'poste', 'rubrique',
  'zeile', 'pos', 'position', 'ligne', 'nr', 'no', 'n°'
];

/**
 * Detect if document has a reference column with PCN codes
 */
export function extractFromReferenceColumn(document: DocumentAIResult): ReferenceColumnResult {
  const evidence: string[] = [];
  const extractedCodes: ExtractedCode[] = [];
  let hasReferenceColumn = false;
  let detectionConfidence = 0;

  // Process each page looking for tables with reference columns
  for (const page of document.pages) {
    for (const table of page.tables) {
      const tableResult = processTable(table, page.pageNumber, document.text);

      if (tableResult.hasReferenceColumn) {
        hasReferenceColumn = true;
        extractedCodes.push(...tableResult.codes);
        evidence.push(...tableResult.evidence);
        detectionConfidence = Math.max(detectionConfidence, tableResult.confidence);
      }
    }
  }

  // Also scan text for inline code references
  const textCodes = scanTextForCodes(document.text);
  if (textCodes.length > 0) {
    evidence.push(`Found ${textCodes.length} code references in document text`);
    // Merge with table-extracted codes (table takes priority)
    for (const textCode of textCodes) {
      if (!extractedCodes.some(c => c.code === textCode.code)) {
        extractedCodes.push(textCode);
      }
    }
  }

  if (!hasReferenceColumn && extractedCodes.length === 0) {
    evidence.push('No reference column detected - will use caption matching as fallback');
  }

  return {
    has_reference_column: hasReferenceColumn,
    extracted_codes: extractedCodes,
    detection_confidence: detectionConfidence,
    detection_evidence: evidence,
  };
}

/**
 * Process a single table looking for reference column
 */
function processTable(
  table: DocumentAITable,
  pageNumber: number,
  fullText: string
): {
  hasReferenceColumn: boolean;
  codes: ExtractedCode[];
  evidence: string[];
  confidence: number;
} {
  const codes: ExtractedCode[] = [];
  const evidence: string[] = [];
  let referenceColumnIndex = -1;
  let valueColumnIndex = -1;
  let priorYearColumnIndex = -1;
  let captionColumnIndex = -1;

  // Analyze header row to find reference column
  if (table.headerRows.length > 0) {
    const headerRow = table.headerRows[0];

    for (let i = 0; i < headerRow.cells.length; i++) {
      const cellText = (headerRow.cells[i]?.text || '').toLowerCase().trim();

      // Check if this is the reference column
      if (REFERENCE_COLUMN_KEYWORDS.some(kw => cellText.includes(kw))) {
        referenceColumnIndex = i;
        evidence.push(`Found reference column at index ${i} with header "${cellText}"`);
      }

      // Check for value columns (current year, prior year)
      if (cellText.includes('2024') || cellText.includes('2023') || cellText.includes('current') ||
          cellText.includes('exercice') || cellText.includes('année') || cellText.includes('jahr')) {
        if (valueColumnIndex === -1) {
          valueColumnIndex = i;
        } else {
          priorYearColumnIndex = i;
        }
      }

      // Check for description/caption column
      if (cellText.includes('description') || cellText.includes('libellé') ||
          cellText.includes('bezeichnung') || cellText.includes('poste') ||
          cellText.length > 20) {
        captionColumnIndex = i;
      }
    }
  }

  // If no reference column found in header, check first few rows for code patterns
  if (referenceColumnIndex === -1) {
    for (let rowIdx = 0; rowIdx < Math.min(5, table.bodyRows.length); rowIdx++) {
      const row = table.bodyRows[rowIdx];
      for (let colIdx = 0; colIdx < row.cells.length; colIdx++) {
        const cellText = (row.cells[colIdx]?.text || '').trim();
        if (PCN_CODE_PATTERN.test(cellText)) {
          referenceColumnIndex = colIdx;
          evidence.push(`Detected reference column at index ${colIdx} from code pattern "${cellText}"`);
          break;
        }
      }
      if (referenceColumnIndex !== -1) break;
    }
  }

  if (referenceColumnIndex === -1) {
    return { hasReferenceColumn: false, codes: [], evidence, confidence: 0 };
  }

  // Set default column indices if not found
  if (captionColumnIndex === -1) {
    captionColumnIndex = referenceColumnIndex === 0 ? 1 : 0;
  }
  if (valueColumnIndex === -1) {
    // Assume value is in the column after caption
    valueColumnIndex = Math.max(captionColumnIndex + 1, referenceColumnIndex + 1);
  }

  // Extract codes from body rows
  for (const row of table.bodyRows) {
    const codeCell = row.cells[referenceColumnIndex];
    if (!codeCell) continue;

    const codeText = (codeCell.text || '').trim();
    if (!PCN_CODE_PATTERN.test(codeText)) continue;

    // Validate against code dictionary
    const codeDef = getCodeDefinition(codeText);
    const isKnownCode = codeDef !== undefined;

    // Get caption
    const caption = (row.cells[captionColumnIndex]?.text || '').trim();

    // Get values
    const currentValueText = (row.cells[valueColumnIndex]?.text || '').trim();
    const priorValueText = priorYearColumnIndex >= 0 ? (row.cells[priorYearColumnIndex]?.text || '').trim() : '';

    const currentParsed = parseNumericString(currentValueText);
    const priorParsed = parseNumericString(priorValueText);

    codes.push({
      code: codeText,
      value: currentParsed.value,
      current_year_value: currentParsed.value,
      prior_year_value: priorParsed.confidence > 0 ? priorParsed.value : null,
      caption,
      page_number: pageNumber,
      confidence: isKnownCode ? 0.95 : 0.7,
      match_source: 'reference_column',
      raw_value_string: currentValueText,
    });
  }

  evidence.push(`Extracted ${codes.length} codes from table`);

  return {
    hasReferenceColumn: true,
    codes,
    evidence,
    confidence: codes.length > 0 ? 0.9 : 0.5,
  };
}

/**
 * Scan document text for inline code references
 * Enhanced to work better with Document OCR output where tables may not be detected
 */
function scanTextForCodes(text: string): ExtractedCode[] {
  const codes: ExtractedCode[] = [];

  // Pattern 1: "Code XXXX" or "Poste XXXX" explicit code markers
  const explicitPatterns = [
    /(?:code|poste|ref|pcn|ecdf|ligne|zeile|pos)\.?\s*(\d{4}[A-Z]?)/gi,
  ];

  for (const pattern of explicitPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const code = match[1];
      if (getCodeDefinition(code)) {
        if (!codes.some(c => c.code === code)) {
          codes.push({
            code,
            value: null,
            current_year_value: null,
            prior_year_value: null,
            caption: '',
            page_number: 0,
            confidence: 0.7,
            match_source: 'reference_column',
            raw_value_string: '',
          });
        }
      }
    }
  }

  // Pattern 2: Look for lines that have a 4-digit code followed or preceded by values
  // Common formats in Luxembourg filings:
  // "Total assets 109 123,456,789"
  // "109 Total assets 123,456,789"
  // "123,456,789 109"
  const linePatterns = [
    // Code at start of line with description and values
    /^[\s]*(\d{4})\s+([A-Za-zÀ-ÿ\s,()/-]+?)\s+([\d\s,.'()-]+)$/gm,
    // Description, then code, then values
    /^[\s]*([A-Za-zÀ-ÿ\s,()/-]+?)\s+(\d{4})\s+([\d\s,.'()-]+)$/gm,
    // Code in parentheses format: "(109)" often used in Lux filings
    /\((\d{4})\)\s*([\d\s,.'()-]+)/g,
    // Code with colon: "109:" or "Code 109:"
    /(?:code\s*)?(\d{4})\s*:\s*([\d\s,.'()-]+)/gi,
  ];

  for (const pattern of linePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let code: string;
      let valueStr: string;
      let caption = '';

      // Determine which group is the code based on pattern
      if (/^\d{4}$/.test(match[1])) {
        code = match[1];
        caption = match[2]?.replace(/[\d,.'()-]/g, '').trim() || '';
        valueStr = match[3] || match[2] || '';
      } else if (/^\d{4}$/.test(match[2])) {
        code = match[2];
        caption = match[1]?.replace(/[\d,.'()-]/g, '').trim() || '';
        valueStr = match[3] || '';
      } else {
        continue;
      }

      if (getCodeDefinition(code)) {
        if (!codes.some(c => c.code === code)) {
          // Parse the numeric value
          const parsed = parseNumericString(valueStr);
          codes.push({
            code,
            value: parsed.value,
            current_year_value: parsed.value,
            prior_year_value: null,
            caption,
            page_number: 0,
            confidence: parsed.confidence > 0 ? 0.65 : 0.5,
            match_source: 'caption_match',
            raw_value_string: valueStr,
          });
        }
      }
    }
  }

  // Pattern 3: Extract key totals by caption matching (fallback)
  const captionMappings: Array<{ patterns: RegExp[]; code: string }> = [
    { patterns: [/total\s*(des\s*)?(actif|assets?)/i, /bilanzsumme\s*aktiva/i], code: '109' },
    { patterns: [/total\s*(des\s*)?(passif|liabilities)/i, /bilanzsumme\s*passiva/i], code: '309' },
    { patterns: [/r[eé]sultat\s*net|net\s*(profit|loss|result)|jahres[üu]berschuss/i], code: '9910' },
    { patterns: [/chiffre\s*d.affaires|net\s*turnover|umsatzerlöse/i], code: '7010' },
    { patterns: [/immobilisations?\s*financières|financial\s*assets|finanzanlagen/i], code: '1500' },
    { patterns: [/participations?|participating\s*interests|beteiligungen/i], code: '1510' },
    { patterns: [/cr[eé]ances.*li[eé]es|amounts\s*owed.*affiliated/i], code: '1311' },
    { patterns: [/dettes.*li[eé]es|amounts\s*owed\s*to.*affiliated/i], code: '4811' },
    { patterns: [/capitaux\s*propres|shareholders?\s*(funds|equity)|eigenkapital/i], code: '309P' },
    { patterns: [/total\s*(des\s*)?charges|total\s*expenses/i], code: '6900' },
    { patterns: [/total\s*(des\s*)?produits|total\s*income/i], code: '7900' },
  ];

  // Number pattern for capturing financial values
  const numberSuffix = "[\\s\\S]{0,100}?([\\d][\\d\\s,.()-]{3,})";

  for (const mapping of captionMappings) {
    for (const pattern of mapping.patterns) {
      // Look for the pattern followed by a number on the same or next line
      const captionRegex = new RegExp(
        pattern.source + numberSuffix,
        pattern.flags + (pattern.flags.includes('g') ? '' : 'g')
      );

      let match;
      while ((match = captionRegex.exec(text)) !== null) {
        const valueStr = match[1];
        if (!codes.some(c => c.code === mapping.code)) {
          const parsed = parseNumericString(valueStr);
          if (parsed.value !== null && parsed.confidence > 0.3) {
            codes.push({
              code: mapping.code,
              value: parsed.value,
              current_year_value: parsed.value,
              prior_year_value: null,
              caption: getCodeDefinition(mapping.code)?.caption_en || '',
              page_number: 0,
              confidence: 0.55,
              match_source: 'caption_match',
              raw_value_string: valueStr,
            });
          }
        }
        break; // Only take the first match per pattern
      }
    }
  }

  return codes;
}

/**
 * Merge extracted codes with caption-matched codes
 * Reference column codes take priority
 */
export function mergeCodeSources(
  referenceColumnCodes: ExtractedCode[],
  captionMatchedCodes: ExtractedCode[]
): ExtractedCode[] {
  const merged: ExtractedCode[] = [...referenceColumnCodes];

  for (const captionCode of captionMatchedCodes) {
    const existing = merged.find(c => c.code === captionCode.code);
    if (!existing) {
      merged.push(captionCode);
    } else if (captionCode.confidence > existing.confidence) {
      // Update if caption match has higher confidence
      // (rare, but could happen with better caption context)
      Object.assign(existing, {
        caption: captionCode.caption || existing.caption,
      });
    }
  }

  return merged;
}
