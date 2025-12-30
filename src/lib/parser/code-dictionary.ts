// src/lib/parser/code-dictionary.ts
// Luxembourg GAAP PCN/eCDF code dictionary
// CRITICAL: This is the source of truth for mapping line items

export const CODE_DICTIONARY_VERSION = '1.0.0';

export interface CodeDefinition {
  code: string;
  category: 'balance_sheet' | 'profit_loss' | 'notes' | 'other';
  subcategory?: string;
  caption_en: string;
  caption_fr: string;
  caption_de: string;
  synonyms_en?: string[];
  synonyms_fr?: string[];
  synonyms_de?: string[];
  tp_priority: 'high' | 'medium' | 'low';
  tp_utility?: string;
  is_total?: boolean;
  parent_code?: string;
  note_reference?: string;
  typical_sign?: 'debit' | 'credit' | 'either';
}

// TP-Critical PCN Codes (from IMPLEMENTATION_GUIDE.md)
export const TP_CRITICAL_PCN_CODES = [
  '1151', // Participations - affiliated undertakings
  '1171', // Amounts owed by affiliated undertakings (>1yr)
  '1379', // Amounts owed to affiliated undertakings (>1yr)
  '4051', // Trade receivables - affiliated undertakings
  '4111', // Amounts owed by affiliated undertakings (<1yr)
  '4279', // Amounts owed to affiliated undertakings (<1yr)
  '6010', // Raw materials and consumables
  '6040', // Other external charges
  '6410', // Wages and salaries
  '6420', // Social security costs
  '7010', // Net turnover
  '7510', // Income from participating interests - affiliated
  '7520', // Income from other investments - affiliated
  '7610', // Other interest receivable - affiliated
  '7710', // Interest payable - affiliated
];

// Full Code Dictionary
export const CODE_DICTIONARY: Record<string, CodeDefinition> = {
  // ============================================
  // BALANCE SHEET - ASSETS
  // ============================================

  // Fixed Assets - Intangible
  '1011': {
    code: '1011',
    category: 'balance_sheet',
    subcategory: 'intangible_assets',
    caption_en: 'Research and development costs',
    caption_fr: 'Frais de recherche et de développement',
    caption_de: 'Forschungs- und Entwicklungskosten',
    tp_priority: 'medium',
    tp_utility: 'R&D activities indicator',
    typical_sign: 'debit',
  },
  '1013': {
    code: '1013',
    category: 'balance_sheet',
    subcategory: 'intangible_assets',
    caption_en: 'Concessions, patents, licences, trademarks',
    caption_fr: 'Concessions, brevets, licences, marques',
    caption_de: 'Konzessionen, Patente, Lizenzen, Marken',
    tp_priority: 'high',
    tp_utility: 'IP assets for royalty analysis',
    typical_sign: 'debit',
  },
  '1015': {
    code: '1015',
    category: 'balance_sheet',
    subcategory: 'intangible_assets',
    caption_en: 'Goodwill',
    caption_fr: 'Goodwill',
    caption_de: 'Geschäftswert',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },
  '1019': {
    code: '1019',
    category: 'balance_sheet',
    subcategory: 'intangible_assets',
    caption_en: 'Payments on account and intangible assets in development',
    caption_fr: "Acomptes versés et immobilisations incorporelles en cours",
    caption_de: 'Geleistete Anzahlungen',
    tp_priority: 'low',
    typical_sign: 'debit',
  },

  // Fixed Assets - Tangible
  '1021': {
    code: '1021',
    category: 'balance_sheet',
    subcategory: 'tangible_assets',
    caption_en: 'Land and buildings',
    caption_fr: 'Terrains et constructions',
    caption_de: 'Grundstücke und Bauten',
    tp_priority: 'low',
    typical_sign: 'debit',
  },
  '1023': {
    code: '1023',
    category: 'balance_sheet',
    subcategory: 'tangible_assets',
    caption_en: 'Plant and machinery',
    caption_fr: 'Installations techniques et machines',
    caption_de: 'Technische Anlagen und Maschinen',
    tp_priority: 'low',
    typical_sign: 'debit',
  },
  '1025': {
    code: '1025',
    category: 'balance_sheet',
    subcategory: 'tangible_assets',
    caption_en: 'Other fixtures and fittings, tools and equipment',
    caption_fr: 'Autres installations, outillage et mobilier',
    caption_de: 'Andere Anlagen, Betriebs- und Geschäftsausstattung',
    tp_priority: 'low',
    typical_sign: 'debit',
  },

  // Fixed Assets - Financial (TP CRITICAL)
  '1151': {
    code: '1151',
    category: 'balance_sheet',
    subcategory: 'financial_assets',
    caption_en: 'Shares in affiliated undertakings',
    caption_fr: 'Parts dans des entreprises liées',
    caption_de: 'Anteile an verbundenen Unternehmen',
    synonyms_en: ['Participating interests - affiliated', 'Investments in subsidiaries'],
    synonyms_fr: ['Participations dans des entreprises liées'],
    tp_priority: 'high',
    tp_utility: 'Holding structure identification, SOPARFI indicator',
    note_reference: 'Note 3',
    typical_sign: 'debit',
  },
  '1155': {
    code: '1155',
    category: 'balance_sheet',
    subcategory: 'financial_assets',
    caption_en: 'Shares in undertakings with participating interest',
    caption_fr: 'Parts dans des entreprises avec lesquelles il existe un lien de participation',
    caption_de: 'Anteile an Unternehmen mit Beteiligungsverhältnis',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },
  '1171': {
    code: '1171',
    category: 'balance_sheet',
    subcategory: 'financial_assets',
    caption_en: 'Amounts owed by affiliated undertakings (>1yr)',
    caption_fr: 'Créances sur des entreprises liées (>1an)',
    caption_de: 'Forderungen gegen verbundene Unternehmen (>1J)',
    synonyms_en: ['Loans to affiliated companies', 'IC receivables long-term'],
    tp_priority: 'high',
    tp_utility: 'IC loans granted - interest rate benchmarking',
    note_reference: 'Note 5',
    typical_sign: 'debit',
  },
  '1175': {
    code: '1175',
    category: 'balance_sheet',
    subcategory: 'financial_assets',
    caption_en: 'Amounts owed by undertakings with participating interest (>1yr)',
    caption_fr: 'Créances sur des entreprises avec lesquelles il existe un lien de participation (>1an)',
    caption_de: 'Forderungen gegen Unternehmen mit Beteiligungsverhältnis (>1J)',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },
  '1181': {
    code: '1181',
    category: 'balance_sheet',
    subcategory: 'financial_assets',
    caption_en: 'Other loans and other financial assets',
    caption_fr: 'Prêts et autres immobilisations financières',
    caption_de: 'Sonstige Ausleihungen und Finanzanlagen',
    tp_priority: 'low',
    typical_sign: 'debit',
  },

  // Current Assets - Receivables
  '4051': {
    code: '4051',
    category: 'balance_sheet',
    subcategory: 'current_receivables',
    caption_en: 'Trade receivables - affiliated undertakings',
    caption_fr: 'Créances commerciales - entreprises liées',
    caption_de: 'Forderungen aus Lieferungen - verbundene Unternehmen',
    tp_priority: 'high',
    tp_utility: 'IC trade receivables - service/goods transactions',
    typical_sign: 'debit',
  },
  '4055': {
    code: '4055',
    category: 'balance_sheet',
    subcategory: 'current_receivables',
    caption_en: 'Trade receivables - third parties',
    caption_fr: 'Créances commerciales - tiers',
    caption_de: 'Forderungen aus Lieferungen - Dritte',
    tp_priority: 'low',
    typical_sign: 'debit',
  },
  '4111': {
    code: '4111',
    category: 'balance_sheet',
    subcategory: 'current_receivables',
    caption_en: 'Amounts owed by affiliated undertakings (<1yr)',
    caption_fr: 'Créances sur des entreprises liées (<1an)',
    caption_de: 'Forderungen gegen verbundene Unternehmen (<1J)',
    synonyms_en: ['IC receivables short-term', 'Current IC loans'],
    tp_priority: 'high',
    tp_utility: 'Short-term IC financing',
    note_reference: 'Note 5',
    typical_sign: 'debit',
  },
  '4115': {
    code: '4115',
    category: 'balance_sheet',
    subcategory: 'current_receivables',
    caption_en: 'Amounts owed by undertakings with participating interest (<1yr)',
    caption_fr: 'Créances sur des entreprises avec lesquelles il existe un lien de participation (<1an)',
    caption_de: 'Forderungen gegen Unternehmen mit Beteiligungsverhältnis (<1J)',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },

  // Current Assets - Cash
  '4611': {
    code: '4611',
    category: 'balance_sheet',
    subcategory: 'cash',
    caption_en: 'Cash at bank and in hand',
    caption_fr: 'Avoirs en banques et en caisse',
    caption_de: 'Kassenbestand und Guthaben bei Kreditinstituten',
    tp_priority: 'low',
    typical_sign: 'debit',
  },

  // ============================================
  // BALANCE SHEET - LIABILITIES
  // ============================================

  // Capital and Reserves
  '1011L': {
    code: '1011L',
    category: 'balance_sheet',
    subcategory: 'equity',
    caption_en: 'Subscribed capital',
    caption_fr: 'Capital souscrit',
    caption_de: 'Gezeichnetes Kapital',
    tp_priority: 'low',
    typical_sign: 'credit',
  },
  '1061': {
    code: '1061',
    category: 'balance_sheet',
    subcategory: 'equity',
    caption_en: 'Legal reserve',
    caption_fr: 'Réserve légale',
    caption_de: 'Gesetzliche Rücklage',
    tp_priority: 'low',
    typical_sign: 'credit',
  },
  '1069': {
    code: '1069',
    category: 'balance_sheet',
    subcategory: 'equity',
    caption_en: 'Other reserves',
    caption_fr: 'Autres réserves',
    caption_de: 'Andere Rücklagen',
    tp_priority: 'low',
    typical_sign: 'credit',
  },
  '1071': {
    code: '1071',
    category: 'balance_sheet',
    subcategory: 'equity',
    caption_en: 'Profit/loss brought forward',
    caption_fr: 'Résultats reportés',
    caption_de: 'Gewinnvortrag/Verlustvortrag',
    tp_priority: 'low',
    typical_sign: 'either',
  },
  '1073': {
    code: '1073',
    category: 'balance_sheet',
    subcategory: 'equity',
    caption_en: 'Profit/loss for the financial year',
    caption_fr: "Résultat de l'exercice",
    caption_de: 'Jahresüberschuss/Jahresfehlbetrag',
    tp_priority: 'medium',
    typical_sign: 'either',
  },

  // Non-current Liabilities (TP CRITICAL)
  '1379': {
    code: '1379',
    category: 'balance_sheet',
    subcategory: 'non_current_liabilities',
    caption_en: 'Amounts owed to affiliated undertakings (>1yr)',
    caption_fr: 'Dettes envers des entreprises liées (>1an)',
    caption_de: 'Verbindlichkeiten gegenüber verbundenen Unternehmen (>1J)',
    synonyms_en: ['IC payables long-term', 'Loans from affiliated companies'],
    tp_priority: 'high',
    tp_utility: 'IC loans received - thin cap & interest rate benchmarking',
    note_reference: 'Note 9',
    typical_sign: 'credit',
  },
  '1385': {
    code: '1385',
    category: 'balance_sheet',
    subcategory: 'non_current_liabilities',
    caption_en: 'Amounts owed to undertakings with participating interest (>1yr)',
    caption_fr: 'Dettes envers des entreprises avec lesquelles il existe un lien de participation (>1an)',
    caption_de: 'Verbindlichkeiten gegenüber Unternehmen mit Beteiligungsverhältnis (>1J)',
    tp_priority: 'medium',
    typical_sign: 'credit',
  },
  '1391': {
    code: '1391',
    category: 'balance_sheet',
    subcategory: 'non_current_liabilities',
    caption_en: 'Bank loans and overdrafts (>1yr)',
    caption_fr: 'Dettes envers des établissements de crédit (>1an)',
    caption_de: 'Verbindlichkeiten gegenüber Kreditinstituten (>1J)',
    tp_priority: 'medium',
    tp_utility: 'Third-party debt for thin cap analysis',
    typical_sign: 'credit',
  },

  // Current Liabilities
  '4219': {
    code: '4219',
    category: 'balance_sheet',
    subcategory: 'current_liabilities',
    caption_en: 'Trade payables',
    caption_fr: 'Dettes commerciales',
    caption_de: 'Verbindlichkeiten aus Lieferungen und Leistungen',
    tp_priority: 'low',
    typical_sign: 'credit',
  },
  '4279': {
    code: '4279',
    category: 'balance_sheet',
    subcategory: 'current_liabilities',
    caption_en: 'Amounts owed to affiliated undertakings (<1yr)',
    caption_fr: 'Dettes envers des entreprises liées (<1an)',
    caption_de: 'Verbindlichkeiten gegenüber verbundenen Unternehmen (<1J)',
    synonyms_en: ['IC payables short-term', 'Current IC debt'],
    tp_priority: 'high',
    tp_utility: 'Short-term IC financing, substance risk indicator',
    note_reference: 'Note 9',
    typical_sign: 'credit',
  },
  '4285': {
    code: '4285',
    category: 'balance_sheet',
    subcategory: 'current_liabilities',
    caption_en: 'Amounts owed to undertakings with participating interest (<1yr)',
    caption_fr: 'Dettes envers des entreprises avec lesquelles il existe un lien de participation (<1an)',
    caption_de: 'Verbindlichkeiten gegenüber Unternehmen mit Beteiligungsverhältnis (<1J)',
    tp_priority: 'medium',
    typical_sign: 'credit',
  },
  '4291': {
    code: '4291',
    category: 'balance_sheet',
    subcategory: 'current_liabilities',
    caption_en: 'Bank loans and overdrafts (<1yr)',
    caption_fr: 'Dettes envers des établissements de crédit (<1an)',
    caption_de: 'Verbindlichkeiten gegenüber Kreditinstituten (<1J)',
    tp_priority: 'low',
    typical_sign: 'credit',
  },

  // ============================================
  // PROFIT & LOSS
  // ============================================

  // Revenue
  '7010': {
    code: '7010',
    category: 'profit_loss',
    subcategory: 'revenue',
    caption_en: 'Net turnover',
    caption_fr: "Chiffre d'affaires net",
    caption_de: 'Umsatzerlöse',
    synonyms_en: ['Revenue', 'Sales'],
    synonyms_fr: ['Ventes'],
    tp_priority: 'high',
    tp_utility: 'Operating margin calculation, PLI denominator',
    note_reference: 'Note 22',
    typical_sign: 'credit',
  },
  '7110': {
    code: '7110',
    category: 'profit_loss',
    subcategory: 'revenue',
    caption_en: 'Variation in stocks',
    caption_fr: 'Variation des stocks',
    caption_de: 'Bestandsveränderungen',
    tp_priority: 'low',
    typical_sign: 'either',
  },
  '7210': {
    code: '7210',
    category: 'profit_loss',
    subcategory: 'revenue',
    caption_en: 'Work performed and capitalised',
    caption_fr: 'Production immobilisée',
    caption_de: 'Aktivierte Eigenleistungen',
    tp_priority: 'low',
    typical_sign: 'credit',
  },
  '7410': {
    code: '7410',
    category: 'profit_loss',
    subcategory: 'revenue',
    caption_en: 'Other operating income',
    caption_fr: "Autres produits d'exploitation",
    caption_de: 'Sonstige betriebliche Erträge',
    tp_priority: 'medium',
    tp_utility: 'May include management fees received',
    typical_sign: 'credit',
  },

  // Cost of Sales / Materials
  '6010': {
    code: '6010',
    category: 'profit_loss',
    subcategory: 'cost_of_sales',
    caption_en: 'Raw materials and consumables',
    caption_fr: 'Matières premières et consommables',
    caption_de: 'Roh-, Hilfs- und Betriebsstoffe',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },
  '6020': {
    code: '6020',
    category: 'profit_loss',
    subcategory: 'cost_of_sales',
    caption_en: 'Other external charges',
    caption_fr: 'Autres charges externes',
    caption_de: 'Andere externe Aufwendungen',
    synonyms_en: ['External services', 'Purchased services'],
    synonyms_fr: ['Charges externes'],
    tp_priority: 'high',
    tp_utility: 'Base erosion via service fees - IC management/service charges',
    typical_sign: 'debit',
  },
  '6040': {
    code: '6040',
    category: 'profit_loss',
    subcategory: 'cost_of_sales',
    caption_en: 'Other external charges',
    caption_fr: 'Autres charges externes',
    caption_de: 'Bezogene Leistungen',
    tp_priority: 'high',
    tp_utility: 'External charges - potential IC service fees',
    typical_sign: 'debit',
  },

  // Staff Costs (TP CRITICAL for substance)
  '6410': {
    code: '6410',
    category: 'profit_loss',
    subcategory: 'staff_costs',
    caption_en: 'Wages and salaries',
    caption_fr: 'Salaires et traitements',
    caption_de: 'Löhne und Gehälter',
    tp_priority: 'high',
    tp_utility: 'Substance indicator - FAR analysis',
    note_reference: 'Note 24',
    typical_sign: 'debit',
  },
  '6420': {
    code: '6420',
    category: 'profit_loss',
    subcategory: 'staff_costs',
    caption_en: 'Social security costs',
    caption_fr: 'Charges sociales',
    caption_de: 'Soziale Abgaben',
    tp_priority: 'high',
    tp_utility: 'Substance indicator',
    typical_sign: 'debit',
  },
  '6430': {
    code: '6430',
    category: 'profit_loss',
    subcategory: 'staff_costs',
    caption_en: 'Other staff costs',
    caption_fr: 'Autres frais de personnel',
    caption_de: 'Andere Personalaufwendungen',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },
  '6440': {
    code: '6440',
    category: 'profit_loss',
    subcategory: 'staff_costs',
    caption_en: 'Pension costs',
    caption_fr: 'Charges de retraite',
    caption_de: 'Aufwendungen für Altersversorgung',
    tp_priority: 'low',
    typical_sign: 'debit',
  },

  // Depreciation
  '6510': {
    code: '6510',
    category: 'profit_loss',
    subcategory: 'depreciation',
    caption_en: 'Depreciation on intangible assets',
    caption_fr: 'Dotations aux amortissements sur immobilisations incorporelles',
    caption_de: 'Abschreibungen auf immaterielle Vermögensgegenstände',
    tp_priority: 'medium',
    tp_utility: 'IP amortization',
    typical_sign: 'debit',
  },
  '6520': {
    code: '6520',
    category: 'profit_loss',
    subcategory: 'depreciation',
    caption_en: 'Depreciation on tangible assets',
    caption_fr: 'Dotations aux amortissements sur immobilisations corporelles',
    caption_de: 'Abschreibungen auf Sachanlagen',
    tp_priority: 'low',
    typical_sign: 'debit',
  },

  // Other Operating Expenses
  '6610': {
    code: '6610',
    category: 'profit_loss',
    subcategory: 'other_operating',
    caption_en: 'Other operating expenses',
    caption_fr: "Autres charges d'exploitation",
    caption_de: 'Sonstige betriebliche Aufwendungen',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },

  // Financial Income (TP CRITICAL)
  '7510': {
    code: '7510',
    category: 'profit_loss',
    subcategory: 'financial_income',
    caption_en: 'Income from participating interests - affiliated undertakings',
    caption_fr: 'Produits des participations - entreprises liées',
    caption_de: 'Erträge aus Beteiligungen - verbundene Unternehmen',
    synonyms_en: ['Dividend income from subsidiaries'],
    tp_priority: 'high',
    tp_utility: 'Holding income analysis',
    typical_sign: 'credit',
  },
  '7520': {
    code: '7520',
    category: 'profit_loss',
    subcategory: 'financial_income',
    caption_en: 'Income from other investments - affiliated undertakings',
    caption_fr: "Produits d'autres valeurs mobilières - entreprises liées",
    caption_de: 'Erträge aus anderen Wertpapieren - verbundene Unternehmen',
    tp_priority: 'high',
    typical_sign: 'credit',
  },
  '7610': {
    code: '7610',
    category: 'profit_loss',
    subcategory: 'financial_income',
    caption_en: 'Other interest receivable - affiliated undertakings',
    caption_fr: "Autres intérêts et produits assimilés - entreprises liées",
    caption_de: 'Sonstige Zinsen - verbundene Unternehmen',
    synonyms_en: ['Interest income from IC loans'],
    tp_priority: 'high',
    tp_utility: 'IC interest income - rate benchmarking',
    typical_sign: 'credit',
  },
  '7620': {
    code: '7620',
    category: 'profit_loss',
    subcategory: 'financial_income',
    caption_en: 'Other interest receivable - other',
    caption_fr: "Autres intérêts et produits assimilés - autres",
    caption_de: 'Sonstige Zinsen - andere',
    tp_priority: 'low',
    typical_sign: 'credit',
  },

  // Financial Expenses (TP CRITICAL)
  '7710': {
    code: '7710',
    category: 'profit_loss',
    subcategory: 'financial_expenses',
    caption_en: 'Interest payable - affiliated undertakings',
    caption_fr: "Intérêts et charges assimilées - entreprises liées",
    caption_de: 'Zinsen - verbundene Unternehmen',
    synonyms_en: ['Interest expense on IC loans'],
    tp_priority: 'high',
    tp_utility: 'IC interest expense - thin cap & rate benchmarking',
    typical_sign: 'debit',
  },
  '7720': {
    code: '7720',
    category: 'profit_loss',
    subcategory: 'financial_expenses',
    caption_en: 'Interest payable - other',
    caption_fr: "Intérêts et charges assimilées - autres",
    caption_de: 'Zinsen - andere',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },
  '7750': {
    code: '7750',
    category: 'profit_loss',
    subcategory: 'financial_expenses',
    caption_en: 'Value adjustments on financial assets',
    caption_fr: 'Corrections de valeur sur immobilisations financières',
    caption_de: 'Abschreibungen auf Finanzanlagen',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },

  // Tax
  '8610': {
    code: '8610',
    category: 'profit_loss',
    subcategory: 'tax',
    caption_en: 'Tax on profit',
    caption_fr: "Impôts sur le résultat",
    caption_de: 'Steuern vom Einkommen und Ertrag',
    tp_priority: 'medium',
    typical_sign: 'debit',
  },

  // Result
  '9910': {
    code: '9910',
    category: 'profit_loss',
    subcategory: 'result',
    caption_en: 'Profit/loss for the financial year',
    caption_fr: "Résultat de l'exercice",
    caption_de: 'Jahresüberschuss/Jahresfehlbetrag',
    tp_priority: 'high',
    typical_sign: 'either',
  },

  // ============================================
  // TOTALS
  // ============================================
  '109': {
    code: '109',
    category: 'balance_sheet',
    subcategory: 'total',
    caption_en: 'Total Assets',
    caption_fr: 'Total de l\'actif',
    caption_de: 'Bilanzsumme Aktiva',
    tp_priority: 'medium',
    is_total: true,
    typical_sign: 'debit',
  },
  '309': {
    code: '309',
    category: 'balance_sheet',
    subcategory: 'total',
    caption_en: 'Total Liabilities',
    caption_fr: 'Total du passif',
    caption_de: 'Bilanzsumme Passiva',
    tp_priority: 'medium',
    is_total: true,
    typical_sign: 'credit',
  },
};

// Get code definition by code
export function getCodeDefinition(code: string): CodeDefinition | undefined {
  return CODE_DICTIONARY[code];
}

// Find codes by caption (fuzzy match)
export function findCodesByCaption(
  caption: string,
  language: 'en' | 'fr' | 'de' = 'en'
): Array<{ code: string; confidence: number }> {
  const normalizedCaption = caption.toLowerCase().trim();
  const results: Array<{ code: string; confidence: number }> = [];

  for (const [code, def] of Object.entries(CODE_DICTIONARY)) {
    const captionField = language === 'en' ? def.caption_en :
                         language === 'fr' ? def.caption_fr : def.caption_de;

    const synonymsField = language === 'en' ? def.synonyms_en :
                          language === 'fr' ? def.synonyms_fr : def.synonyms_de;

    // Check main caption
    const normalizedDef = captionField.toLowerCase();
    if (normalizedDef === normalizedCaption) {
      results.push({ code, confidence: 1.0 });
      continue;
    }

    // Check if caption contains or is contained
    if (normalizedDef.includes(normalizedCaption) || normalizedCaption.includes(normalizedDef)) {
      const similarity = Math.min(normalizedCaption.length, normalizedDef.length) /
                        Math.max(normalizedCaption.length, normalizedDef.length);
      if (similarity > 0.5) {
        results.push({ code, confidence: similarity * 0.8 });
        continue;
      }
    }

    // Check synonyms
    if (synonymsField) {
      for (const synonym of synonymsField) {
        const normalizedSyn = synonym.toLowerCase();
        if (normalizedSyn === normalizedCaption) {
          results.push({ code, confidence: 0.95 });
          break;
        }
        if (normalizedSyn.includes(normalizedCaption) || normalizedCaption.includes(normalizedSyn)) {
          const similarity = Math.min(normalizedCaption.length, normalizedSyn.length) /
                            Math.max(normalizedCaption.length, normalizedSyn.length);
          if (similarity > 0.5) {
            results.push({ code, confidence: similarity * 0.75 });
            break;
          }
        }
      }
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

// Get all codes by category
export function getCodesByCategory(
  category: CodeDefinition['category'],
  subcategory?: string
): CodeDefinition[] {
  return Object.values(CODE_DICTIONARY).filter(
    (def) => def.category === category && (!subcategory || def.subcategory === subcategory)
  );
}

// Get TP-priority codes
export function getTPPriorityCodes(priority?: 'high' | 'medium' | 'low'): CodeDefinition[] {
  return Object.values(CODE_DICTIONARY).filter(
    (def) => !priority || def.tp_priority === priority
  );
}
