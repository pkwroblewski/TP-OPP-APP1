// src/lib/parser/numeric-parser.ts
// Numeric parsing utilities for European/Luxembourg number formats

export interface ParsedNumber {
  value: number;
  raw_string: string;
  is_negative: boolean;
  confidence: number;
  format_detected: 'european' | 'american' | 'unknown';
}

/**
 * Parse a numeric string handling European formats
 * European: 1.234.567,89 (dots for thousands, comma for decimal)
 * American: 1,234,567.89 (commas for thousands, dot for decimal)
 */
export function parseNumericString(input: string | undefined | null): ParsedNumber {
  const rawString = (input || '').trim();

  if (!rawString) {
    return {
      value: 0,
      raw_string: rawString,
      is_negative: false,
      confidence: 0,
      format_detected: 'unknown',
    };
  }

  // Detect negative values
  let isNegative = false;
  let workingString = rawString;

  // Check for parentheses notation: (1,234)
  if (workingString.startsWith('(') && workingString.endsWith(')')) {
    isNegative = true;
    workingString = workingString.slice(1, -1);
  }

  // Check for minus sign
  if (workingString.startsWith('-') || workingString.startsWith('−')) {
    isNegative = true;
    workingString = workingString.slice(1);
  }

  // Check for trailing minus (rare but exists)
  if (workingString.endsWith('-') || workingString.endsWith('−')) {
    isNegative = true;
    workingString = workingString.slice(0, -1);
  }

  // Remove currency symbols and whitespace
  workingString = workingString
    .replace(/[€$£¥]/g, '')
    .replace(/EUR/gi, '')
    .replace(/\s/g, '')
    .trim();

  if (!workingString) {
    return {
      value: 0,
      raw_string: rawString,
      is_negative: isNegative,
      confidence: 0,
      format_detected: 'unknown',
    };
  }

  // Detect format and parse
  const { value, confidence, format } = detectAndParse(workingString);

  return {
    value: isNegative ? -value : value,
    raw_string: rawString,
    is_negative: isNegative,
    confidence,
    format_detected: format,
  };
}

/**
 * Detect number format and parse
 */
function detectAndParse(str: string): {
  value: number;
  confidence: number;
  format: 'european' | 'american' | 'unknown';
} {
  // Count dots and commas
  const dots = (str.match(/\./g) || []).length;
  const commas = (str.match(/,/g) || []).length;

  // Find last occurrence of each
  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  // Check what comes after the last separator
  const charsAfterLastDot = lastDot >= 0 ? str.length - lastDot - 1 : -1;
  const charsAfterLastComma = lastComma >= 0 ? str.length - lastComma - 1 : -1;

  // Determine format
  let format: 'european' | 'american' | 'unknown' = 'unknown';
  let confidence = 0.5;

  // European: comma is decimal separator (1.234.567,89)
  // American: dot is decimal separator (1,234,567.89)

  if (commas === 1 && dots === 0) {
    // Single comma: likely European decimal
    if (charsAfterLastComma === 2) {
      format = 'european';
      confidence = 0.9;
    } else if (charsAfterLastComma === 3) {
      // Could be thousands separator
      format = 'american';
      confidence = 0.6;
    } else {
      format = 'european';
      confidence = 0.7;
    }
  } else if (dots === 1 && commas === 0) {
    // Single dot: likely American decimal
    if (charsAfterLastDot === 2) {
      format = 'american';
      confidence = 0.9;
    } else if (charsAfterLastDot === 3) {
      // Could be thousands separator
      format = 'european';
      confidence = 0.6;
    } else {
      format = 'american';
      confidence = 0.7;
    }
  } else if (commas > 0 && dots > 0) {
    // Both present - last one is decimal
    if (lastComma > lastDot) {
      format = 'european';
      confidence = 0.95;
    } else {
      format = 'american';
      confidence = 0.95;
    }
  } else if (commas > 1 && dots === 0) {
    // Multiple commas, no dots: American thousands
    format = 'american';
    confidence = 0.85;
  } else if (dots > 1 && commas === 0) {
    // Multiple dots, no commas: European thousands
    format = 'european';
    confidence = 0.85;
  } else {
    // No separators - just a plain number
    format = 'american';
    confidence = 1.0;
  }

  // Parse based on detected format
  let value: number;
  if (format === 'european') {
    // Remove thousand separators (dots) and convert decimal (comma to dot)
    const normalized = str.replace(/\./g, '').replace(',', '.');
    value = parseFloat(normalized);
  } else {
    // Remove thousand separators (commas)
    const normalized = str.replace(/,/g, '');
    value = parseFloat(normalized);
  }

  if (isNaN(value)) {
    return { value: 0, confidence: 0, format: 'unknown' };
  }

  return { value, confidence, format };
}

/**
 * Parse a percentage string
 */
export function parsePercentage(input: string | undefined | null): ParsedNumber {
  const rawString = (input || '').trim();
  let workingString = rawString.replace(/%/g, '').trim();

  const parsed = parseNumericString(workingString);

  return {
    ...parsed,
    value: parsed.value / 100, // Convert to decimal
    raw_string: rawString,
  };
}

/**
 * Parse an interest rate string (handles basis points, percentages)
 */
export function parseInterestRate(input: string | undefined | null): {
  rate: number;
  raw_string: string;
  format: 'percentage' | 'basis_points' | 'decimal';
  confidence: number;
} {
  const rawString = (input || '').trim().toLowerCase();
  let rate = 0;
  let format: 'percentage' | 'basis_points' | 'decimal' = 'percentage';
  let confidence = 0.5;

  // Check for basis points (bp, bps)
  if (rawString.includes('bp') || rawString.includes('basis point')) {
    const cleaned = rawString.replace(/bp[s]?/g, '').replace(/basis\s*point[s]?/g, '').trim();
    const parsed = parseNumericString(cleaned);
    rate = parsed.value / 10000; // Convert bp to decimal
    format = 'basis_points';
    confidence = parsed.confidence * 0.9;
  }
  // Check for percentage
  else if (rawString.includes('%')) {
    const parsed = parsePercentage(rawString);
    rate = parsed.value;
    format = 'percentage';
    confidence = parsed.confidence * 0.9;
  }
  // Plain number - assume percentage if > 0 and < 100, else decimal
  else {
    const parsed = parseNumericString(rawString);
    if (parsed.value > 0 && parsed.value < 100) {
      rate = parsed.value / 100;
      format = 'percentage';
      confidence = 0.6;
    } else if (parsed.value > 0 && parsed.value < 1) {
      rate = parsed.value;
      format = 'decimal';
      confidence = 0.7;
    } else {
      rate = parsed.value / 100;
      format = 'percentage';
      confidence = 0.4;
    }
  }

  return { rate, raw_string: rawString, format, confidence };
}

/**
 * Format number for display in European format
 */
export function formatEuropeanNumber(value: number, decimals: number = 2): string {
  const parts = value.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];

  if (decimals === 0) {
    return integerPart;
  }
  return `${integerPart},${decimalPart}`;
}

/**
 * Check if a string represents a valid number
 */
export function isNumericString(input: string): boolean {
  const parsed = parseNumericString(input);
  return parsed.confidence > 0 && !isNaN(parsed.value);
}

/**
 * Extract all numbers from a text string
 */
export function extractNumbers(text: string): ParsedNumber[] {
  // Pattern to match numbers with various formats
  const pattern = /[-−]?\(?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?\)?/g;
  const matches = text.match(pattern) || [];

  return matches.map((match) => parseNumericString(match)).filter((p) => p.confidence > 0);
}
