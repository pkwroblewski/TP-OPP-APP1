// src/lib/parser/company-profile.ts
// Extract company profile and determine size classification

import type { DocumentAIResult } from '@/lib/google/document-ai';
import { parseNumericString } from './numeric-parser';

export type CompanySize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type AccountType = 'FULL' | 'ABRIDGED' | 'ABBREVIATED';
export type ReportingStandard = 'LUX_GAAP' | 'IFRS' | 'UNKNOWN';

export interface CompanyProfile {
  name: string | null;
  rcs_number: string | null;
  legal_form: string | null;
  registered_office: string | null;
  incorporation_date: string | null;
  financial_year_start: string | null;
  financial_year_end: string | null;
  company_size: CompanySize;
  size_determination_source: 'thresholds' | 'disclosure' | 'default';
  size_thresholds_met: SizeThresholds;
  account_type: AccountType;
  reporting_standard: ReportingStandard;
  is_consolidated: boolean;
  consolidation_source: string | null;
  average_employees: number | null;
  average_employees_source: string | null;
  soparfi_indicators: SOPARFIIndicators;
}

export interface SizeThresholds {
  balance_sheet_total: number | null;
  net_turnover: number | null;
  average_employees: number | null;
  exceeds_small: boolean;
  exceeds_medium: boolean;
}

export interface SOPARFIIndicators {
  is_likely_soparfi: boolean;
  indicators_found: string[];
  confidence: number;
}

// Luxembourg size thresholds (as of 2024)
const SIZE_THRESHOLDS = {
  small: {
    balance_sheet_total: 4_400_000,    // EUR
    net_turnover: 8_800_000,            // EUR
    average_employees: 50,
  },
  medium: {
    balance_sheet_total: 20_000_000,   // EUR
    net_turnover: 40_000_000,           // EUR
    average_employees: 250,
  },
};

// Legal form patterns
const LEGAL_FORM_PATTERNS = [
  { pattern: /S\.?A\.?R\.?L\.?/i, form: 'SARL' },
  { pattern: /S\.?A\.?\s/i, form: 'SA' },
  { pattern: /S\.?C\.?A\.?/i, form: 'SCA' },
  { pattern: /S\.?C\.?S\.?/i, form: 'SCS' },
  { pattern: /S\.?E\.?C\.?A\.?/i, form: 'SECA' },
  { pattern: /S\.?E\.?/i, form: 'SE' },
  { pattern: /GmbH/i, form: 'GmbH' },
  { pattern: /AG\s/i, form: 'AG' },
  { pattern: /société\s+anonyme/i, form: 'SA' },
  { pattern: /société\s+à\s+responsabilité\s+limitée/i, form: 'SARL' },
];

// SOPARFI keywords
const SOPARFI_KEYWORDS = [
  'holding', 'participations', 'investments', 'investment company',
  'société de participations financières', 'soparfi', 'beteiligungsgesellschaft',
  'financial holding', 'acquisition', 'detention', 'gestion de participations'
];

/**
 * Extract company profile from document
 */
export function extractCompanyProfile(
  document: DocumentAIResult,
  balanceSheetTotal: number | null,
  netTurnover: number | null,
  employees: number | null
): CompanyProfile {
  const text = document.text;

  // Extract basic info
  const name = extractCompanyName(text);
  const rcsNumber = extractRCSNumber(text);
  const legalForm = extractLegalForm(text);
  const registeredOffice = extractRegisteredOffice(text);
  const yearEnd = extractFinancialYearEnd(text);
  const employeesFromText = extractEmployeeCount(text);

  // Determine average employees (prefer parameter, fallback to text extraction)
  const avgEmployees = employees ?? employeesFromText.count;
  const employeesSource = employees ? 'parameter' : employeesFromText.source;

  // Calculate size thresholds
  const thresholds = calculateSizeThresholds(balanceSheetTotal, netTurnover, avgEmployees);
  const companySize = determineCompanySize(thresholds);

  // Detect account type
  const accountType = detectAccountType(text);

  // Detect reporting standard
  const reportingStandard = detectReportingStandard(text);

  // Detect consolidation
  const consolidation = detectConsolidation(text);

  // Detect SOPARFI indicators
  const soparfiIndicators = detectSOPARFIIndicators(text, balanceSheetTotal, netTurnover, avgEmployees);

  return {
    name,
    rcs_number: rcsNumber,
    legal_form: legalForm,
    registered_office: registeredOffice,
    incorporation_date: null, // Would need specific extraction
    financial_year_start: null,
    financial_year_end: yearEnd,
    company_size: companySize,
    size_determination_source: thresholds.balance_sheet_total !== null ? 'thresholds' : 'default',
    size_thresholds_met: thresholds,
    account_type: accountType,
    reporting_standard: reportingStandard,
    is_consolidated: consolidation.is_consolidated,
    consolidation_source: consolidation.source,
    average_employees: avgEmployees,
    average_employees_source: employeesSource,
    soparfi_indicators: soparfiIndicators,
  };
}

function extractCompanyName(text: string): string | null {
  // Look for company name patterns
  const patterns = [
    /(?:société|company|gesellschaft|firma)\s*[:\s]+\s*([A-Z][A-Za-z\s&.,'-]+(?:S\.?A\.?R?\.?L?\.?|S\.?A\.?|GmbH|AG))/i,
    /^([A-Z][A-Za-z\s&.,'-]+(?:S\.?A\.?R?\.?L?\.?|S\.?A\.?|GmbH|AG))/m,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function extractRCSNumber(text: string): string | null {
  // RCS Luxembourg: B followed by digits
  const patterns = [
    /R\.?C\.?S\.?\s*(?:Luxembourg)?\s*[:\s]*\s*(B\s*\d{5,6})/i,
    /(?:enregistrée?|registered|eingetragen)\s+.*?(B\s*\d{5,6})/i,
    /(B\s*\d{5,6})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/\s/g, '');
    }
  }

  return null;
}

function extractLegalForm(text: string): string | null {
  for (const { pattern, form } of LEGAL_FORM_PATTERNS) {
    if (pattern.test(text)) {
      return form;
    }
  }
  return null;
}

function extractRegisteredOffice(text: string): string | null {
  const patterns = [
    /(?:siège\s+social|registered\s+office|sitz)\s*[:\s]+\s*([^\n]+)/i,
    /(?:adresse|address)\s*[:\s]+\s*([^\n]+Luxembourg[^\n]*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function extractFinancialYearEnd(text: string): string | null {
  // Look for year end date patterns
  const patterns = [
    /(?:exercice|financial\s+year|geschäftsjahr)\s+(?:clos|ended|zum)\s+(?:le\s+)?(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{4})/i,
    /(?:au|as\s+at|zum)\s+(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{4})/i,
    /(\d{4}[-\/]\d{2}[-\/]\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function extractEmployeeCount(text: string): { count: number | null; source: string | null } {
  const patterns = [
    /(?:average\s+)?(?:number\s+of\s+)?employees?\s*[:\s]*\s*(\d+)/i,
    /(?:effectif\s+moyen|personnel)\s*[:\s]*\s*(\d+)/i,
    /(?:mitarbeiter|beschäftigte)\s*[:\s]*\s*(\d+)/i,
    /(\d+)\s*(?:employees?|salariés?|mitarbeiter)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (!isNaN(count) && count < 100000) { // Sanity check
        return { count, source: 'text_extraction' };
      }
    }
  }

  return { count: null, source: null };
}

function calculateSizeThresholds(
  balanceSheetTotal: number | null,
  netTurnover: number | null,
  avgEmployees: number | null
): SizeThresholds {
  const exceedsSmallBS = balanceSheetTotal !== null && balanceSheetTotal > SIZE_THRESHOLDS.small.balance_sheet_total;
  const exceedsSmallTurnover = netTurnover !== null && netTurnover > SIZE_THRESHOLDS.small.net_turnover;
  const exceedsSmallEmployees = avgEmployees !== null && avgEmployees > SIZE_THRESHOLDS.small.average_employees;

  const exceedsMediumBS = balanceSheetTotal !== null && balanceSheetTotal > SIZE_THRESHOLDS.medium.balance_sheet_total;
  const exceedsMediumTurnover = netTurnover !== null && netTurnover > SIZE_THRESHOLDS.medium.net_turnover;
  const exceedsMediumEmployees = avgEmployees !== null && avgEmployees > SIZE_THRESHOLDS.medium.average_employees;

  // Need to exceed 2 of 3 thresholds to move up a size category
  const smallCount = [exceedsSmallBS, exceedsSmallTurnover, exceedsSmallEmployees].filter(Boolean).length;
  const mediumCount = [exceedsMediumBS, exceedsMediumTurnover, exceedsMediumEmployees].filter(Boolean).length;

  return {
    balance_sheet_total: balanceSheetTotal,
    net_turnover: netTurnover,
    average_employees: avgEmployees,
    exceeds_small: smallCount >= 2,
    exceeds_medium: mediumCount >= 2,
  };
}

function determineCompanySize(thresholds: SizeThresholds): CompanySize {
  if (thresholds.exceeds_medium) {
    return 'LARGE';
  }
  if (thresholds.exceeds_small) {
    return 'MEDIUM';
  }
  return 'SMALL';
}

function detectAccountType(text: string): AccountType {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('comptes annuels abrégés') || lowerText.includes('abridged')) {
    return 'ABRIDGED';
  }

  if (lowerText.includes('abbreviated') || lowerText.includes('kurzfassung')) {
    return 'ABBREVIATED';
  }

  return 'FULL';
}

function detectReportingStandard(text: string): ReportingStandard {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('ifrs') || lowerText.includes('international financial reporting standards')) {
    return 'IFRS';
  }

  if (lowerText.includes('lux gaap') || lowerText.includes('luxembourg gaap') ||
      lowerText.includes('plan comptable normalisé') || lowerText.includes('pcn')) {
    return 'LUX_GAAP';
  }

  // Default assumption for Luxembourg filings
  return 'LUX_GAAP';
}

function detectConsolidation(text: string): { is_consolidated: boolean; source: string | null } {
  const lowerText = text.toLowerCase();

  const consolidatedKeywords = [
    'comptes consolidés', 'consolidated accounts', 'consolidated financial statements',
    'konzernabschluss', 'group accounts', 'états financiers consolidés'
  ];

  for (const keyword of consolidatedKeywords) {
    if (lowerText.includes(keyword)) {
      return { is_consolidated: true, source: keyword };
    }
  }

  const standaloneKeywords = [
    'comptes annuels', 'annual accounts', 'statutory accounts',
    'einzelabschluss', 'standalone accounts'
  ];

  for (const keyword of standaloneKeywords) {
    if (lowerText.includes(keyword)) {
      return { is_consolidated: false, source: keyword };
    }
  }

  return { is_consolidated: false, source: null };
}

function detectSOPARFIIndicators(
  text: string,
  balanceSheetTotal: number | null,
  netTurnover: number | null,
  avgEmployees: number | null
): SOPARFIIndicators {
  const indicators: string[] = [];
  let confidence = 0;

  const lowerText = text.toLowerCase();

  // Check for SOPARFI keywords
  for (const keyword of SOPARFI_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      indicators.push(`Found keyword: "${keyword}"`);
      confidence += 0.15;
    }
  }

  // Check for high financial assets to turnover ratio
  if (balanceSheetTotal && netTurnover && netTurnover > 0) {
    const ratio = balanceSheetTotal / netTurnover;
    if (ratio > 10) {
      indicators.push(`High BS to turnover ratio: ${ratio.toFixed(1)}x`);
      confidence += 0.2;
    }
  }

  // Check for low/no employees with high assets
  if (avgEmployees !== null && avgEmployees < 5 && balanceSheetTotal && balanceSheetTotal > 10_000_000) {
    indicators.push(`Low employees (${avgEmployees}) with high assets (${(balanceSheetTotal / 1_000_000).toFixed(1)}M)`);
    confidence += 0.25;
  }

  // Check for zero turnover (pure holding)
  if (netTurnover !== null && netTurnover === 0) {
    indicators.push('Zero net turnover (pure holding)');
    confidence += 0.3;
  }

  return {
    is_likely_soparfi: confidence >= 0.4,
    indicators_found: indicators,
    confidence: Math.min(confidence, 1.0),
  };
}
