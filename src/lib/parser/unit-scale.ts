// src/lib/parser/unit-scale.ts
// CRITICAL: Unit/scale detection for financial data
// Getting this wrong causes catastrophic errors (thousands vs units)

import type { DocumentAIResult } from '@/lib/google/document-ai';

export type UnitScale = 'UNITS' | 'THOUSANDS' | 'MILLIONS';

export interface UnitScaleDetection {
  detected_scale: UnitScale;
  confidence: number;
  detection_source: 'explicit_text' | 'magnitude_analysis' | 'cross_validation' | 'default';
  evidence: string[];
  unit_scale_uncertain: boolean;
  reconciliation?: UnitScaleReconciliation;
}

export interface UnitScaleReconciliation {
  summary_values: Record<string, number>;
  statutory_values: Record<string, number>;
  detected_multiplier: number;
  reconciliation_passed: boolean;
  discrepancies: string[];
}

// Keywords that indicate scale in different languages
const SCALE_INDICATORS = {
  THOUSANDS: {
    en: ['in thousands', "in '000", 'in 000', '(thousands)', "('000)", 'k€', 'keur', 'teur', 'in thousand'],
    fr: ['en milliers', 'en keur', 'en mille', '(milliers)', "en '000"],
    de: ['in tausend', 'in teur', 'tausend euro', '(tausend)'],
  },
  MILLIONS: {
    en: ['in millions', '(millions)', 'm€', 'meur', 'in million'],
    fr: ['en millions', '(millions)', 'meur'],
    de: ['in millionen', '(millionen)', 'meur'],
  },
  UNITS: {
    en: ['in euro', 'in eur', 'in units', 'euro'],
    fr: ['en euro', 'en eur'],
    de: ['in euro', 'in eur'],
  },
};

/**
 * Detect unit scale from Document AI result
 */
export function detectUnitScale(document: DocumentAIResult): UnitScaleDetection {
  const evidence: string[] = [];
  let detectedScale: UnitScale = 'UNITS';
  let confidence = 0.5;
  let source: UnitScaleDetection['detection_source'] = 'default';

  // 1. Look for explicit text indicators in the document
  const text = document.text.toLowerCase();

  // Check for thousands indicators
  for (const lang of ['en', 'fr', 'de'] as const) {
    for (const indicator of SCALE_INDICATORS.THOUSANDS[lang]) {
      if (text.includes(indicator)) {
        detectedScale = 'THOUSANDS';
        confidence = 0.9;
        source = 'explicit_text';
        evidence.push(`Found "${indicator}" in document text`);
      }
    }
  }

  // Check for millions indicators (higher priority)
  for (const lang of ['en', 'fr', 'de'] as const) {
    for (const indicator of SCALE_INDICATORS.MILLIONS[lang]) {
      if (text.includes(indicator)) {
        detectedScale = 'MILLIONS';
        confidence = 0.9;
        source = 'explicit_text';
        evidence.push(`Found "${indicator}" in document text`);
      }
    }
  }

  // Check for explicit units indicators (override if found after scale indicators)
  // Look specifically near tables/headers
  const headerPatterns = [
    /amounts?\s+(?:are\s+)?(?:expressed\s+)?in\s+euro/i,
    /montants?\s+(?:sont\s+)?(?:exprimés?\s+)?en\s+euro/i,
    /beträge?\s+in\s+euro/i,
  ];

  for (const pattern of headerPatterns) {
    if (pattern.test(text)) {
      // Check if there's also a thousands qualifier
      const nearbyText = text.slice(Math.max(0, text.search(pattern) - 100), text.search(pattern) + 100);
      if (!nearbyText.includes('thousand') && !nearbyText.includes('millier') && !nearbyText.includes('tausend')) {
        detectedScale = 'UNITS';
        confidence = 0.85;
        source = 'explicit_text';
        evidence.push('Found explicit "amounts in euro" without thousands qualifier');
      }
    }
  }

  // 2. Magnitude analysis - analyze the size of numbers
  const magnitudeAnalysis = analyzeMagnitudes(document.text);
  if (magnitudeAnalysis.confidence > confidence) {
    detectedScale = magnitudeAnalysis.scale;
    confidence = magnitudeAnalysis.confidence;
    source = 'magnitude_analysis';
    evidence.push(...magnitudeAnalysis.evidence);
  }

  // Determine if uncertain
  const unitScaleUncertain = confidence < 0.8;
  if (unitScaleUncertain) {
    evidence.push(`Confidence ${(confidence * 100).toFixed(0)}% is below 80% threshold`);
  }

  return {
    detected_scale: detectedScale,
    confidence,
    detection_source: source,
    evidence,
    unit_scale_uncertain: unitScaleUncertain,
  };
}

/**
 * Analyze number magnitudes to infer scale
 */
function analyzeMagnitudes(text: string): {
  scale: UnitScale;
  confidence: number;
  evidence: string[];
} {
  // Extract all numbers from text
  const numberPattern = /[\d,.\s]+(?:\.\d{2})?/g;
  const numbers: number[] = [];

  let match;
  while ((match = numberPattern.exec(text)) !== null) {
    const cleaned = match[0].replace(/\s/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      numbers.push(num);
    }
  }

  if (numbers.length === 0) {
    return { scale: 'UNITS', confidence: 0.3, evidence: ['No numbers found for magnitude analysis'] };
  }

  // Calculate statistics
  const maxNum = Math.max(...numbers);
  const avgNum = numbers.reduce((a, b) => a + b, 0) / numbers.length;

  const evidence: string[] = [];
  evidence.push(`Analyzed ${numbers.length} numbers, max: ${maxNum.toLocaleString()}, avg: ${avgNum.toLocaleString()}`);

  // Heuristics based on typical Luxembourg company financials
  // Large companies in UNITS typically have numbers in millions/billions
  // In THOUSANDS, numbers are typically in thousands to low millions
  // In MILLIONS, numbers are typically in single digits to hundreds

  if (maxNum > 1_000_000_000) {
    // Numbers over 1 billion - likely in UNITS
    return {
      scale: 'UNITS',
      confidence: 0.75,
      evidence: [...evidence, 'Maximum value > 1 billion suggests UNITS'],
    };
  } else if (maxNum > 100_000_000) {
    // Numbers in hundreds of millions
    return {
      scale: 'UNITS',
      confidence: 0.65,
      evidence: [...evidence, 'Maximum value in hundreds of millions suggests UNITS'],
    };
  } else if (maxNum < 10_000 && avgNum < 1000) {
    // Very small numbers - likely MILLIONS or small company in THOUSANDS
    return {
      scale: 'THOUSANDS',
      confidence: 0.55,
      evidence: [...evidence, 'Small number magnitudes - possibly THOUSANDS or MILLIONS'],
    };
  }

  // Default assumption
  return {
    scale: 'UNITS',
    confidence: 0.5,
    evidence: [...evidence, 'Magnitude inconclusive, defaulting to UNITS'],
  };
}

/**
 * Cross-validate unit scale by comparing values across sections
 * MANDATORY: Prevents unit scale errors
 */
export function unitScaleReconciliation(
  summaryValues: Record<string, number>,
  statutoryValues: Record<string, number>
): UnitScaleReconciliation {
  const discrepancies: string[] = [];
  let detectedMultiplier = 1;
  let reconciliationPassed = true;

  // Compare matching keys
  const commonKeys = Object.keys(summaryValues).filter((k) => k in statutoryValues);

  if (commonKeys.length === 0) {
    return {
      summary_values: summaryValues,
      statutory_values: statutoryValues,
      detected_multiplier: 1,
      reconciliation_passed: true,
      discrepancies: ['No common keys found for reconciliation'],
    };
  }

  // Calculate ratios between summary and statutory values
  const ratios: number[] = [];
  for (const key of commonKeys) {
    const summaryVal = summaryValues[key];
    const statutoryVal = statutoryValues[key];

    if (summaryVal > 0 && statutoryVal > 0) {
      const ratio = statutoryVal / summaryVal;
      ratios.push(ratio);

      // Check for common multipliers
      if (Math.abs(ratio - 1000) < 10) {
        discrepancies.push(`${key}: Summary appears to be in THOUSANDS (ratio: ${ratio.toFixed(2)})`);
      } else if (Math.abs(ratio - 1_000_000) < 10000) {
        discrepancies.push(`${key}: Summary appears to be in MILLIONS (ratio: ${ratio.toFixed(2)})`);
      } else if (Math.abs(ratio - 1) > 0.1) {
        discrepancies.push(`${key}: Values don't match (summary: ${summaryVal}, statutory: ${statutoryVal}, ratio: ${ratio.toFixed(2)})`);
      }
    }
  }

  // Determine most likely multiplier
  if (ratios.length > 0) {
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    if (avgRatio > 500 && avgRatio < 2000) {
      detectedMultiplier = 1000;
      discrepancies.push(`Detected summary is in THOUSANDS (avg ratio: ${avgRatio.toFixed(2)})`);
    } else if (avgRatio > 500000 && avgRatio < 2000000) {
      detectedMultiplier = 1_000_000;
      discrepancies.push(`Detected summary is in MILLIONS (avg ratio: ${avgRatio.toFixed(2)})`);
    } else if (Math.abs(avgRatio - 1) > 0.1) {
      reconciliationPassed = false;
      discrepancies.push(`Reconciliation failed: unexpected ratio ${avgRatio.toFixed(2)}`);
    }
  }

  return {
    summary_values: summaryValues,
    statutory_values: statutoryValues,
    detected_multiplier: detectedMultiplier,
    reconciliation_passed: reconciliationPassed,
    discrepancies,
  };
}

/**
 * Apply scale multiplier to convert to base units (EUR)
 */
export function applyScale(value: number, scale: UnitScale): number {
  switch (scale) {
    case 'THOUSANDS':
      return value * 1000;
    case 'MILLIONS':
      return value * 1_000_000;
    case 'UNITS':
    default:
      return value;
  }
}

/**
 * Format value for display based on scale
 */
export function formatWithScale(value: number, scale: UnitScale): string {
  const scaledValue = applyScale(value, scale);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(scaledValue);
}
