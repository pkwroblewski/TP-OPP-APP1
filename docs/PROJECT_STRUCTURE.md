# TP Opportunity Finder - Project Structure

## Overview

A web application for identifying transfer pricing opportunities from Luxembourg company annual accounts. The system uses a strict two-layer architecture: deterministic extraction (Google Document AI) followed by AI-powered analysis (Claude API), ensuring no hallucination of financial data.

---

## Core Principle: Data Flow Separation

```
PDF → Google Drive → Document AI → Structured JSON → Database → Claude API → Analysis
                                          ↑
                                    HARD BOUNDARY
                                          ↓
                          Claude ONLY receives structured JSON
                          Claude NEVER sees PDF, images, or raw text
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 (App Router) | Web application |
| PDF Storage | Google Drive (Premium) | Original PDFs, organized by company/year |
| Extraction | Google Document AI (Layout Parser) | PDF → structured JSON |
| Database | Supabase (PostgreSQL) | Extraction data, analysis results, pipeline |
| Analysis | Claude API (Anthropic) | TP opportunity identification |
| Auth | Supabase Auth | Single user login |
| Hosting | Vercel (Free tier) | Application hosting |

**Note:** This project reuses the existing Supabase project from the old TP Opportunity Finder app. The database schema will be migrated to the new structure.

---

## Google Drive Folder Structure

```
My Drive/
└── TP-Opportunity-Finder/
    │
    ├── 00-Inbox/                          # New uploads awaiting processing
    │   └── [uploaded files]
    │
    ├── 01-Companies/                      # Organized by RCS number
    │   ├── B155908-Aperam/
    │   │   ├── 2023-12-31/
    │   │   │   └── annual-accounts.pdf
    │   │   └── 2022-12-31/
    │   │       └── annual-accounts.pdf
    │   │
    │   ├── B123456-Company-Name/
    │   │   └── 2023-12-31/
    │   │       └── annual-accounts.pdf
    │   │
    │   └── [more companies...]
    │
    ├── 02-Reference/                      # Luxembourg GAAP guides
    │   ├── lu-balance-sheet-structure.md
    │   ├── lu-pnl-structure.md
    │   └── lu-intercompany-guide.md
    │
    └── 03-Archive/                        # Old/superseded files
        └── [archived files]
```

### Naming Conventions

| Element | Format | Example |
|---------|--------|---------|
| Company folder | `{RCS}-{CompanyName}` | `B155908-Aperam` |
| Year folder | `{YYYY-MM-DD}` (year end) | `2023-12-31` |
| PDF file | `annual-accounts.pdf` | `annual-accounts.pdf` |

---

## Application Folder Structure

```
tp-opportunity-finder/
│
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── page.tsx                      # Dashboard home
│   │   ├── layout.tsx                    # Root layout
│   │   ├── globals.css                   # Global styles
│   │   │
│   │   ├── upload/
│   │   │   └── page.tsx                  # PDF upload interface
│   │   │
│   │   ├── companies/
│   │   │   ├── page.tsx                  # Company list
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Company detail view
│   │   │
│   │   ├── extraction/
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Extraction review/approval
│   │   │
│   │   ├── analysis/
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Analysis results view
│   │   │
│   │   ├── pipeline/
│   │   │   └── page.tsx                  # Opportunity pipeline
│   │   │
│   │   └── api/
│   │       ├── upload/
│   │       │   └── route.ts              # Upload PDF to Google Drive
│   │       ├── extract/
│   │       │   └── route.ts              # Trigger Document AI extraction
│   │       ├── analyze/
│   │       │   └── route.ts              # Trigger Claude analysis
│   │       ├── companies/
│   │       │   └── route.ts              # Company CRUD
│   │       └── pipeline/
│   │           └── route.ts              # Pipeline status updates
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser Supabase client
│   │   │   ├── server.ts                 # Server Supabase client
│   │   │   └── middleware.ts             # Auth middleware
│   │   │
│   │   ├── google/
│   │   │   ├── auth.ts                   # Google auth setup
│   │   │   ├── drive.ts                  # Google Drive operations
│   │   │   └── document-ai.ts            # Document AI client
│   │   │
│   │   ├── parser/
│   │   │   ├── index.ts                  # Main parser entry
│   │   │   ├── balance-sheet.ts          # Balance sheet extraction with eCDF codes
│   │   │   ├── profit-loss.ts            # P&L extraction (abridged detection)
│   │   │   ├── notes.ts                  # Notes/IC transaction extraction
│   │   │   ├── company-profile.ts        # Company info + size determination
│   │   │   ├── management-report.ts      # Management report for FAR analysis
│   │   │   ├── related-parties.ts        # Note 7ter related party extraction
│   │   │   ├── ownership.ts              # Ownership structure (Note 1)
│   │   │   └── validators.ts             # Validation rules + arithmetic checks
│   │   │
│   │   ├── analysis/
│   │   │   ├── client.ts                 # Anthropic client
│   │   │   ├── prompts.ts                # TP analysis prompts
│   │   │   └── response-parser.ts        # Parse Claude responses
│   │   │
│   │   ├── types/
│   │   │   ├── extraction.ts             # Extraction schema types
│   │   │   ├── analysis.ts               # Analysis schema types
│   │   │   ├── database.ts               # Database row types
│   │   │   └── api.ts                    # API request/response types
│   │   │
│   │   └── utils/
│   │       ├── hash.ts                   # JSON hashing for verification
│   │       └── format.ts                 # Number/currency formatting
│   │
│   └── components/
│       ├── ui/                           # Base UI components
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   ├── input.tsx
│       │   ├── badge.tsx
│       │   ├── table.tsx
│       │   └── loading.tsx
│       │
│       ├── layout/
│       │   ├── header.tsx
│       │   ├── sidebar.tsx
│       │   └── page-container.tsx
│       │
│       ├── upload/
│       │   ├── pdf-uploader.tsx          # Drag-drop upload
│       │   └── upload-form.tsx           # Company metadata form
│       │
│       ├── companies/
│       │   ├── company-list.tsx
│       │   ├── company-card.tsx
│       │   └── company-status-badge.tsx
│       │
│       ├── extraction/
│       │   ├── extraction-viewer.tsx     # Display extracted data
│       │   ├── balance-sheet-table.tsx
│       │   ├── pnl-table.tsx
│       │   ├── ic-transactions-table.tsx
│       │   └── source-reference.tsx      # Page/note references
│       │
│       ├── analysis/
│       │   ├── analysis-dashboard.tsx
│       │   ├── opportunity-card.tsx
│       │   ├── risk-score-badge.tsx
│       │   └── classification-badge.tsx
│       │
│       └── pipeline/
│           ├── pipeline-board.tsx        # Kanban-style board
│           ├── pipeline-column.tsx
│           └── pipeline-card.tsx
│
├── docs/
│   ├── PROJECT_STRUCTURE.md              # This file
│   ├── IMPLEMENTATION_GUIDE.md           # Implementation instructions
│   └── reference/
│       ├── lu-balance-sheet-structure.md
│       ├── lu-pnl-structure.md
│       └── lu-intercompany-guide.md
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql        # Database schema
│
├── scripts/
│   ├── test-google-connection.ts         # Test Google APIs
│   ├── test-supabase-connection.ts       # Test Supabase
│   └── seed-test-data.ts                 # Optional test data
│
├── .env.local                            # Environment variables (DO NOT COMMIT)
├── .env.example                          # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.js
```

---

## Database Schema

### Table: companies

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rcs_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  legal_form TEXT,
  gdrive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_rcs ON companies(rcs_number);
```

### Table: financial_years

```sql
CREATE TABLE financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  year_end DATE NOT NULL,
  
  -- Google Drive references
  gdrive_folder_id TEXT,
  gdrive_pdf_file_id TEXT,
  gdrive_pdf_url TEXT,
  pdf_uploaded_at TIMESTAMPTZ,
  
  -- Extraction layer
  extraction_status TEXT DEFAULT 'pending',
  extraction_data JSONB,
  extraction_confidence NUMERIC,
  extraction_warnings JSONB,
  extracted_at TIMESTAMPTZ,
  
  -- CRITICAL: Schema versioning for drift prevention
  extraction_schema_version TEXT,           -- e.g., "1.0.0"
  
  -- CRITICAL: Unit/scale validation
  unit_scale TEXT,                          -- 'UNITS', 'THOUSANDS', 'MILLIONS'
  unit_scale_validated BOOLEAN DEFAULT FALSE,
  
  -- Account classification
  account_type TEXT,                        -- 'full', 'abridged', 'abbreviated'
  company_size TEXT,                        -- 'small', 'medium', 'large'
  reporting_standard TEXT,                  -- 'LUX_GAAP', 'IFRS'
  
  -- CRITICAL: JSON ↔ Tables Reconciliation (Non-Negotiable)
  reconciliation_status TEXT DEFAULT 'pending',  -- 'pending', 'passed', 'failed', 'needs_rerun'
  reconciliation_checked_at TIMESTAMPTZ,
  reconciliation_transformer_version TEXT,
  reconciliation_records_json INTEGER,       -- Count of records in JSON
  reconciliation_records_tables INTEGER,     -- Count of records in tables
  reconciliation_fingerprint_mismatches INTEGER DEFAULT 0,
  
  -- Approval gate: can only be TRUE if reconciliation_status = 'passed'
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  
  -- Analysis layer
  analysis_status TEXT DEFAULT 'pending',
  analysis_input_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, year_end),
  
  -- CONSTRAINT: Cannot be approved if reconciliation failed
  CONSTRAINT approval_requires_reconciliation 
    CHECK (NOT is_approved OR reconciliation_status = 'passed')
);

CREATE INDEX idx_financial_years_company ON financial_years(company_id);
CREATE INDEX idx_financial_years_status ON financial_years(extraction_status, analysis_status);
CREATE INDEX idx_financial_years_reconciliation ON financial_years(reconciliation_status);
```

### Table: tp_analyses

```sql
CREATE TABLE tp_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year_id UUID REFERENCES financial_years(id) ON DELETE CASCADE,
  input_extraction_hash TEXT NOT NULL,
  
  -- Account context
  account_type TEXT,                        -- 'full' or 'abridged'
  company_size TEXT,                        -- 'small', 'medium', 'large'
  analysis_limitations JSONB,               -- Array of limitation strings
  
  -- Classification
  company_classification TEXT,
  classification_reasoning TEXT,
  
  -- FAR Analysis (stored as JSONB)
  far_analysis JSONB,
  
  -- IC Financing Analysis
  ic_financing_analysis JSONB,
  
  -- Key metrics (denormalized for querying)
  total_ic_positions NUMERIC,
  ic_loans_granted NUMERIC,
  ic_loans_received NUMERIC,
  ic_interest_income NUMERIC,
  ic_interest_expense NUMERIC,
  implied_lending_rate NUMERIC,
  implied_borrowing_rate NUMERIC,
  ic_spread_bps INTEGER,
  debt_equity_ratio NUMERIC,
  effective_tax_rate NUMERIC,
  
  -- Related Party Flags (Note 7ter)
  has_note_7ter_disclosures BOOLEAN DEFAULT FALSE,
  non_arms_length_transaction_count INTEGER DEFAULT 0,
  related_party_flags JSONB,
  
  -- Opportunities
  opportunities JSONB,
  
  -- Risk flags
  has_zero_spread BOOLEAN DEFAULT FALSE,
  has_thin_cap_risk BOOLEAN DEFAULT FALSE,
  has_unremunerated_guarantee BOOLEAN DEFAULT FALSE,
  has_undocumented_services BOOLEAN DEFAULT FALSE,
  has_substance_concerns BOOLEAN DEFAULT FALSE,
  has_related_party_issues BOOLEAN DEFAULT FALSE,
  
  -- Scoring
  risk_score INTEGER,
  priority_ranking TEXT,
  
  -- Summary
  executive_summary TEXT,
  recommended_actions JSONB,
  documentation_gaps JSONB,
  suggested_benchmarking_studies JSONB,
  
  -- Raw response
  raw_analysis_response JSONB,
  
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tp_analyses_financial_year ON tp_analyses(financial_year_id);
CREATE INDEX idx_tp_analyses_priority ON tp_analyses(priority_ranking, risk_score DESC);
CREATE INDEX idx_tp_analyses_related_party ON tp_analyses(has_related_party_issues) WHERE has_related_party_issues = TRUE;
CREATE INDEX idx_tp_analyses_zero_spread ON tp_analyses(has_zero_spread) WHERE has_zero_spread = TRUE;
```

### Table: ic_transactions

```sql
CREATE TABLE ic_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year_id UUID REFERENCES financial_years(id) ON DELETE CASCADE,
  
  -- RECONCILIATION IDENTIFIERS (prevent JSON ↔ tables drift)
  record_id TEXT NOT NULL,                   -- Deterministic hash: type + counterparty + amount + page
  record_fingerprint TEXT NOT NULL,          -- Hash of all fields for drift detection
  
  transaction_type TEXT NOT NULL,
  counterparty TEXT,
  counterparty_country TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'EUR',
  interest_rate TEXT,
  maturity TEXT,
  
  -- Enhanced maturity splits
  maturity_within_one_year NUMERIC,
  maturity_after_one_year NUMERIC,
  maturity_after_five_years NUMERIC,
  is_subordinated BOOLEAN DEFAULT FALSE,
  
  description TEXT,
  source_page INTEGER,
  source_note TEXT,
  source_text TEXT,
  ecdf_code TEXT,                           -- eCDF/PCN code reference
  extraction_confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no duplicate records
  UNIQUE(financial_year_id, record_id)
);

CREATE INDEX idx_ic_transactions_financial_year ON ic_transactions(financial_year_id);
CREATE INDEX idx_ic_transactions_type ON ic_transactions(transaction_type);
CREATE INDEX idx_ic_transactions_record_id ON ic_transactions(record_id);
```

### Table: related_party_transactions

```sql
-- Note 7ter (Art. 65(1) 7ter) - Related party transactions
-- CRITICAL: Transactions not concluded under normal market conditions

-- SEMANTIC CORRECTION: Do NOT use is_arms_length with default TRUE
-- Instead use explicit disclosure_type and non_market_terms_disclosed

CREATE TYPE related_party_disclosure_type AS ENUM (
  '7ter_non_market',              -- Note 7ter: explicitly non-market terms
  'full_related_party_listing',   -- Full disclosure of all related party transactions
  'statement_only_no_exceptions', -- Statement that no non-market transactions exist
  'not_disclosed'                 -- No disclosure (check if exempt)
);

CREATE TABLE related_party_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year_id UUID REFERENCES financial_years(id) ON DELETE CASCADE,
  
  -- Reconciliation identifiers (prevent JSON ↔ tables drift)
  record_id TEXT NOT NULL,                   -- Deterministic hash for idempotent writes
  record_fingerprint TEXT NOT NULL,          -- Hash of all fields for drift detection
  
  nature TEXT NOT NULL,                     -- Nature of the transaction
  counterparty TEXT,                        -- Related party name
  relationship TEXT,                        -- Nature of relationship (owner, affiliate, etc.)
  amount NUMERIC,
  
  -- CORRECTED SEMANTICS (no default - must be explicitly set)
  disclosure_type related_party_disclosure_type NOT NULL,
  non_market_terms_disclosed BOOLEAN,       -- NULL = unknown, TRUE = explicitly 7ter, FALSE = at market
  -- NO DEFAULT - transformer must explicitly set this
  
  terms_description TEXT,                   -- Terms and conditions if disclosed
  source_page INTEGER,
  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no duplicate records
  UNIQUE(financial_year_id, record_id)
);

CREATE INDEX idx_related_party_financial_year ON related_party_transactions(financial_year_id);
CREATE INDEX idx_related_party_non_market ON related_party_transactions(non_market_terms_disclosed) 
  WHERE non_market_terms_disclosed = TRUE;
CREATE INDEX idx_related_party_disclosure_type ON related_party_transactions(disclosure_type);
```

### Table: template_fingerprints (Prevents Systematic Mapping Errors)

```sql
-- Template fingerprints for mapping cache
-- Reduces review volume by reusing approved mappings for known templates
CREATE TABLE template_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT UNIQUE NOT NULL,    -- Hash of layout + language + audit firm
  layout_signature TEXT NOT NULL,           -- Key layout features detected
  audit_firm_template TEXT,                 -- PwC, Deloitte, EY, KPMG, or unknown
  language_detected TEXT NOT NULL,          -- FR, EN, DE, MIXED
  
  -- Approval status
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,                         -- User ID
  
  -- Confidence at time of approval
  mapping_confidence_at_approval NUMERIC,
  dictionary_version_at_approval TEXT NOT NULL,
  
  -- Governance (prevents systematic error propagation)
  expiry_date DATE NOT NULL,                -- 12 months from approval
  last_regression_test_date DATE,
  requires_revalidation BOOLEAN DEFAULT FALSE,
  revoked BOOLEAN DEFAULT FALSE,
  revocation_reason TEXT,
  revoked_at TIMESTAMPTZ,
  
  -- TRUST BUT VERIFY: Spot-check configuration
  spot_check_rate NUMERIC DEFAULT 0.05,     -- 1 in 20 uploads (5%)
  uploads_since_last_spot_check INTEGER DEFAULT 0,
  last_spot_check_date TIMESTAMPTZ,
  last_spot_check_passed BOOLEAN,
  total_uploads_with_fingerprint INTEGER DEFAULT 0,
  spot_check_failures INTEGER DEFAULT 0,
  auto_revoke_threshold INTEGER DEFAULT 3,  -- Auto-revoke after 3 failures
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fingerprint_hash ON template_fingerprints(fingerprint_hash);
CREATE INDEX idx_fingerprint_approved ON template_fingerprints(approved) WHERE approved = TRUE;
CREATE INDEX idx_fingerprint_needs_revalidation ON template_fingerprints(requires_revalidation) 
  WHERE requires_revalidation = TRUE;
```

### Table: consolidation_resolutions (One-Step Resolution)

```sql
-- Consolidation resolutions - stored so we never ask again
-- If consolidation status is unclear, user confirms ONCE
CREATE TABLE consolidation_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,             -- e.g., "2024"
  
  -- Resolution
  resolution TEXT NOT NULL CHECK (resolution IN ('standalone', 'consolidated')),
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_by TEXT NOT NULL,                -- User ID
  
  -- Context
  indicators_at_resolution JSONB,           -- What indicators were present
  notes TEXT,
  
  -- Ensure one resolution per company/year
  UNIQUE(company_id, financial_year)
);

CREATE INDEX idx_consolidation_company_year ON consolidation_resolutions(company_id, financial_year);
```

### Table: opportunity_pipeline

```sql
CREATE TABLE opportunity_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'identified',
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_company ON opportunity_pipeline(company_id);
CREATE INDEX idx_pipeline_status ON opportunity_pipeline(status);
```

---

## Extraction Schema (TypeScript)

### Luxembourg GAAP Compliance Notes

The extraction schema is designed around official Luxembourg eCDF (electronic Central Filing) and PCN (Plan Comptable Normalisé) codes to ensure deterministic mapping and prevent hallucination.

**Key Design Principles:**
1. **eCDF/PCN Anchors** - Every financial line item maps to official codes (e.g., code 1171 for "Amounts owed by affiliated undertakings")
2. **Size-Aware Extraction** - Schema includes company_size metadata to set expectations for available data
3. **Hierarchical Linking** - Balance sheet/P&L items link to their corresponding Notes
4. **Abridged Account Detection** - Flags when data is from abridged accounts (small/medium companies)
5. **Related Party Focus** - Dedicated extraction for Note 7ter and ownership disclosures
6. **Canonical Line-Item Model** - Store FULL statutory statements as arrays, derive KPIs from them
7. **Unit/Scale Capture** - CRITICAL: Capture presentation scale (units/thousands/millions)
8. **Explicit Status Modeling** - Distinguish "zero" vs "not found" vs "not disclosed" vs "not applicable"

**Company Size Thresholds (Art. 35 Company Law):**
| Category | Balance Sheet Total | Net Turnover | Employees |
|----------|--------------------:|-------------:|----------:|
| Small | ≤ €4.4M | ≤ €8.8M | ≤ 50 |
| Medium | ≤ €20M | ≤ €40M | ≤ 250 |
| Large | > €20M | > €40M | > 250 |

```typescript
// src/lib/types/extraction.ts

// =============================================================================
// GLOBAL METADATA
// =============================================================================

export interface ExtractionMetadata {
  // Source tracking
  source_file: string;
  extracted_at: string;
  pages_processed: number;
  processor_version: string;
  
  // CRITICAL: Schema versioning for drift prevention
  extraction_schema_version: string;        // e.g., "1.0.0"
  mapping_rules_version: string;            // e.g., "2024-01"
  
  // Language and format detection
  language_detected: 'FR' | 'EN' | 'DE' | 'MIXED';
  languages_present: string[];              // e.g., ['FR', 'EN']
  
  // CRITICAL: Unit/scale detection (catastrophic if wrong)
  currency: string;                         // e.g., "EUR", "USD"
  currency_source: string;                  // Where detected
  unit_scale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
  unit_scale_source: string;                // Where detected (e.g., "Page 1: 'in thousands of EUR'")
  unit_scale_confidence: number;
  
  // Reporting framework
  reporting_standard: 'LUX_GAAP' | 'IFRS' | 'UNKNOWN';
  is_consolidated: boolean;                 // CRITICAL: Consolidated (Group) vs Standalone (Annual)
  consolidation_source?: string;            // Where determined (e.g., "Title: 'Comptes Annuels'")
  statement_layout_version?: string;        // e.g., "LU_STATUTORY_2023"
  
  // Luxembourg GAAP compliance
  account_type: 'full' | 'abridged' | 'abbreviated';
  company_size: 'small' | 'medium' | 'large' | 'unknown';
  has_management_report: boolean;
  has_audit_report: boolean;
  ecdf_format_detected: boolean;
  has_reference_column: boolean;            // PCN codes in Reference column?
  
  // TEMPLATE FINGERPRINT (for mapping cache - reduces review over time)
  template_fingerprint: {
    fingerprint_hash: string;               // Hash of: layout cues + language + audit firm template
    layout_signature: string;               // Key layout features detected
    audit_firm_template?: string;           // PwC, Deloitte, EY, KPMG, or unknown
    language_detected: 'FR' | 'EN' | 'DE' | 'MIXED';
    previously_approved: boolean;           // Has this fingerprint been approved before?
    approval_date?: string;
    approval_mapping_confidence: number;    // Confidence when approved
  };
  
  // Period information
  period_start: string;                     // ISO date
  period_end: string;                       // ISO date (= year_end)
  comparative_period_start?: string;        // Prior year start
  comparative_period_end?: string;          // Prior year end
  filing_date?: string;
  
  // Overall confidence
  confidence_score: number;
}

// =============================================================================
// THREE-MODULE JSON ORGANIZATION
// =============================================================================
/*
The structured extraction is organized into three conceptual modules:

MODULE A: DETERMINISTIC TOTALS (The "Anchor")
- Key-value pairs using PCN codes (e.g., pcn_1171)
- Canonical line items from Balance Sheet and P&L
- Pre-computed deterministic metrics
- These are the "hard numbers" that Claude cannot modify

MODULE B: DISCLOSURE TEXT (The "Context")  
- Raw text blocks from Notes (Note 7ter, Note 20, etc.)
- Structured tables extracted from Notes
- Linked note data embedded in canonical line items
- Provides context for the numbers

MODULE C: FUNCTIONAL NARRATIVE (The "Story")
- Management Report extractions
- Qualitative FAR context (risks, functions, personnel)
- Business model descriptions
- Gives Claude the "why" behind the numbers
*/

export interface ExtractedValue {
  value: number | string | null;
  page: number;
  source?: string;
  confidence?: number;
  ecdf_code?: string;           // Official eCDF/PCN code (e.g., "1171")
  note_reference?: string;      // Link to corresponding note (e.g., "Note 4")
  is_abridged?: boolean;        // True if this is an aggregated abridged value
}

// CRITICAL: Explicit status modeling to prevent "missing = zero" errors
/*
DEFAULTS MUST NEVER IMPLY COMPLIANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Any field where a default would carry compliance meaning must:
1. Use NULL/unknown as default
2. Force explicit population by the transformer
3. Block analysis if not explicitly set

Examples of WRONG defaults:
- is_arms_length: true (implies compliance if not set) → FIXED
- has_substance: true (implies substance if not checked)
- is_compliant: true (implies compliance if not verified)

Use explicit enums or nullable booleans with NO DEFAULT instead.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
export type ExtractionStatus = 
  | 'extracted'      // Value successfully extracted
  | 'not_found'      // Looked for but not found in document
  | 'not_disclosed'  // Entity legally not required to disclose (size exemption)
  | 'not_applicable' // Line item doesn't apply to this entity type
  | 'aggregated'     // Value exists but is aggregated with other items (abridged)
  | 'unknown';       // Status not yet determined - MUST be resolved before analysis

export interface ExtractedValueWithStatus {
  value: number | null;
  status: ExtractionStatus;
  status_reason?: string;       // e.g., "Abridged accounts - included in Gross Result"
  page: number | null;
  source_text?: string;
  confidence: number;
  ecdf_code?: string;
  note_reference?: string;
  caption_original?: string;    // Original caption as it appears in document
  caption_normalized?: string;  // Normalized English caption
}

// Hierarchical structure linking line items to their notes
export interface LinkedExtractedValue extends ExtractedValueWithStatus {
  note_content?: NoteContent;   // Parsed content from the corresponding note
}

export interface NoteContent {
  note_number: string;
  title: string;
  raw_text: string;
  page: number;
  structured_data?: Record<string, any>;  // Parsed tables/values from note
}

// =============================================================================
// CAPTION → eCDF CODE MAPPING
// =============================================================================
// CRITICAL: PDFs often don't show eCDF codes - we must map from captions
// HOWEVER: Luxembourg filings often have a "Reference" column with PCN codes
// PRIORITY: Always extract from Reference column first, fall back to caption matching

/*
MAPPING DICTIONARY ARTIFACT (CRITICAL - Must be maintained)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The code dictionary is a MAINTAINED ARTIFACT that must be versioned and updated.
It contains:
- All PCN/eCDF codes with their expected hierarchy
- Multilingual caption libraries (FR/DE/EN)
- Known synonyms and variations
- PwC/Deloitte/EY/KPMG template variations

Location: src/lib/parser/data/code-dictionary.json
Version tracked in: CODE_DICTIONARY_VERSION

WRONG-BUT-CONFIDENT is the main risk - aggressive gating required:
- If requires_review_count > 0, force human review
- If high_confidence_mappings < 80%, block automated analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

// TP-CRITICAL PCN CODES (Materiality-based mapping gate)
// Only force human review if low-confidence mappings touch these codes
export const TP_CRITICAL_PCN_CODES = [
  // IC Balances (Balance Sheet)
  '1171',  // Amounts owed by affiliated undertakings (receivables)
  '1279',  // Amounts owed by affiliated undertakings (receivables > 1yr)
  '4279',  // Amounts owed to affiliated undertakings (payables)
  '4379',  // Amounts owed to affiliated undertakings (payables > 1yr)
  '1151',  // Shares in affiliated undertakings (participations)
  '1137',  // Participating interests
  
  // IC Income/Expense (P&L)
  '6311',  // Interest and similar income from affiliated undertakings
  '6511',  // Interest and similar charges to affiliated undertakings
  '6051',  // Other operating charges - affiliated
  '7051',  // Other operating income - affiliated
  
  // Substance indicators
  '6412',  // Staff costs - wages and salaries
  '6417',  // Staff costs - social security
  '109',   // Total assets (for asset intensity)
  
  // Equity (for thin cap)
  '1010',  // Subscribed capital
  '1110',  // Reserves
  '1310',  // Profit/loss brought forward
  '1410',  // Profit/loss for the financial year
] as const;

export interface CodeMappingResult {
  matched_code: string | null;
  match_source: 'reference_column' | 'caption_match' | 'manual';  // How code was found
  alt_candidates: Array<{
    code: string;
    caption: string;
    similarity_score: number;
  }>;
  match_confidence: number;          // 0-1
  match_reason: string;              // e.g., "exact_match_fr", "fuzzy_match_en", "ambiguous"
  requires_review: boolean;          // True if confidence < threshold
  
  // Dictionary version used for this mapping
  dictionary_version: string;
}

// =============================================================================
// HIERARCHICAL LINKED SCHEMA
// =============================================================================
// Balance sheet items directly embed their linked note data
// When a note_link is found, targeted extraction is triggered for that note

export interface LinkedNoteData {
  note_number: string;
  note_title: string;
  page: number;
  
  // Structured data extracted from the note
  breakdown?: Array<{
    description: string;
    amount: number;
    currency: string;
    sub_pcn_code?: string;                  // If breakdown has its own PCN codes
  }>;
  
  // For IC-related notes: counterparty details with transaction types
  counterparties?: Array<{
    name: string;
    country?: string;
    amount: number;
    relationship?: string;
    transaction_type?: string;              // e.g., "corporate services", "accrued interest", "cash pooling"
  }>;
  
  // For maturity notes (Note 20)
  maturity_analysis?: {
    within_1_year: number;
    after_1_year_within_5: number;
    after_5_years: number;
  };
  
  // Raw text for AI analysis
  raw_text?: string;
  
  // Extraction status
  extraction_triggered: boolean;            // True when note_link was found
  extraction_complete: boolean;             // True when targeted extraction finished
}

/*
PCN CODE AS PRIMARY KEY PRINCIPLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The 4-digit PCN code (e.g., 1171, 1139, 1379) is the IMMUTABLE identifier.
Captions (FR/DE/EN) are stored as METADATA ONLY for human review.
This eliminates translation errors and fuzzy matching hallucinations.

If a valid PCN code is present in the "Reference" column, IGNORE the row caption.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE JSON STRUCTURE (Semantic Anchoring):
{
  "pcn_1171": {
    "value": 881583087.98,
    "note_link": "Note 5",
    "caption_metadata": {
      "original": "Créances sur des entreprises liées",
      "normalized": "Amounts owed by affiliated undertakings",
      "language": "FR"
    },
    "linked_note_data": {
      "note_number": "5",
      "counterparties": [
        {"name": "Parent Co SA", "amount": 500000000, "transaction_type": "cash_pooling"},
        {"name": "Sister Co BV", "amount": 381583087.98, "transaction_type": "accrued_interest"}
      ]
    }
  }
}

This structure means:
- PCN code 1171 is the KEY (immutable, language-independent)
- Balance sheet shows €881.5M owed by affiliates
- Note 5 has the TP-relevant detail: WHO owes what and WHY
- Claude receives the breakdown, not just the total
*/

export interface CanonicalLineItem {
  // PRIMARY KEY: PCN/eCDF code (immutable identifier)
  lux_code: string;                         // Official eCDF/PCN code (e.g., "1171") - THIS IS THE KEY
  
  // METADATA ONLY: Captions for human review (not used for matching after extraction)
  caption_metadata: {
    original: string;                       // As appears in document (FR/EN/DE)
    normalized: string;                     // Standardized English
    language: 'FR' | 'EN' | 'DE' | 'MIXED';
  };
  
  // Code mapping audit trail
  code_mapping: CodeMappingResult;          // How code was determined
  
  // Values (already scaled per unit_scale in metadata)
  amount_cy: number | null;                 // Current year
  amount_py: number | null;                 // Prior year
  
  // Raw numeric strings for audit (when confidence < threshold)
  raw_numeric_cy?: string;                  // Original string before parsing
  raw_numeric_py?: string;
  numeric_parse_notes?: string;             // e.g., "negative in parentheses", "decimal comma"
  
  // Status per year
  status_cy: ExtractionStatus;
  status_py: ExtractionStatus;
  
  // Classification
  statement: 'balance_sheet' | 'profit_loss';
  section: string;                          // e.g., "C.III" for financial fixed assets
  is_subtotal: boolean;
  is_total: boolean;
  parent_code?: string;                     // Parent line item code for hierarchy
  
  // Maturity (for receivables/payables)
  maturity?: 'within_1y' | 'after_1y' | 'after_5y' | 'total';
  
  // IC classification (statutory)
  is_intercompany: boolean;
  ic_nature?: 'affiliated' | 'participating' | 'other_related';
  
  // IC economic nature overlay (for analysis)
  ic_economic_nature?: 'trade' | 'financing' | 'tax' | 'dividends' | 'cash_pool' | 'other';
  
  // NOTE LINKAGE (Semantic Anchoring)
  // When note_link is found, triggers targeted extraction for that note
  note_link?: string;                       // e.g., "Note 5" - triggers targeted extraction
  linked_note_data?: LinkedNoteData;        // Extracted data from the referenced note
  
  // Source tracking
  page: number;
  source_text?: string;
  confidence: number;
}

export interface CanonicalStatement {
  statement_type: 'balance_sheet' | 'profit_loss';
  layout: 'LU_GAAP_STATUTORY' | 'LU_GAAP_ABRIDGED' | 'IFRS' | 'OTHER';
  currency: string;
  unit_scale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
  period_end_cy: string;
  period_end_py: string;
  
  // All line items in statutory order
  lines: CanonicalLineItem[];
  
  // Validation
  is_complete: boolean;                     // All expected lines extracted
  missing_lines: string[];                  // Codes of expected but missing lines
  validation_errors: string[];
  
  // Mapping quality metrics
  mapping_quality: {
    total_lines: number;
    high_confidence_mappings: number;       // confidence >= 0.9
    medium_confidence_mappings: number;     // 0.7 <= confidence < 0.9
    low_confidence_mappings: number;        // confidence < 0.7
    requires_review_count: number;
    duplicate_code_warnings: string[];      // Same code mapped twice (except expected maturity splits)
  };
}

export interface CompanyProfile {
  name: ExtractedValue;
  rcs_number: ExtractedValue;
  legal_form: ExtractedValue;
  financial_year_end: ExtractedValue;
  financial_year_start?: ExtractedValue;
  
  // Activity Description - for Functional Analysis
  principal_activity_text: ExtractedValue;
  registered_office: ExtractedValue;
  
  // Size Determination (Art. 35 thresholds)
  employee_count: ExtractedValue;
  company_size_determination: {
    calculated_size: 'small' | 'medium' | 'large' | 'unknown';
    balance_sheet_total: number | null;
    net_turnover: number | null;
    average_employees: number | null;            // CRITICAL: "Average number of persons employed"
    average_employees_source?: string;           // Where found (e.g., "Note 6", "Management Report")
    thresholds_exceeded: string[];               // Which of the 2-of-3 thresholds exceeded
    
    // Substance Analysis (for TP risk detection)
    turnover_per_employee?: number;              // High ratio = potential substance risk
    assets_per_employee?: number;
    low_substance_flag: boolean;                 // Low staff + High turnover/assets = TP Risk
    substance_flag_reason?: string;
  };
  
  // Audit Status
  auditor_name?: ExtractedValue;
  auditor_opinion?: 'unqualified' | 'qualified' | 'adverse' | 'disclaimer' | 'unknown';
  
  // Substance Indicators (for TP substance analysis)
  has_employees: boolean;
  has_physical_office: boolean;
  is_management_company_administered: boolean;
  management_company_name?: string;
}

// =============================================================================
// MULTI-YEAR EXTRACTION SUPPORT
// =============================================================================
// TP opportunities are rarely found in a single year - trends matter
// The extraction captures CY and PY from the same PDF (comparative columns)
// Additional years can be linked via separate financial_year records

export interface MultiYearContext {
  // Current Year (CY) - Primary extraction
  current_year: {
    period_end: string;
    data_complete: boolean;
  };
  
  // Previous Year (PY) - From comparative column in same PDF
  previous_year: {
    period_end: string;
    data_available: boolean;
    extraction_source: 'comparative_column' | 'not_available';
  };
  
  // For 3-year trend analysis (linked from database)
  historical_context?: {
    years_available: number;
    oldest_year_end?: string;
    can_compute_3_year_average: boolean;
    can_compute_weighted_average: boolean;
  };
  
  // Trend data limitations
  trend_analysis_limitations: string[];       // e.g., "Only 2 years available", "Prior year abridged"
}

export interface FinancialYearData {
  // Revenue - with eCDF codes
  turnover: LinkedExtractedValue;                        // Code 6011 - Montant net du chiffre d'affaires
  turnover_by_activity?: LinkedExtractedValue[];         // Note 22 breakdown (if large company)
  turnover_by_geography?: LinkedExtractedValue[];        // Note 22 breakdown (if large company)
  
  // For ABRIDGED accounts - these replace detailed breakdown
  gross_result?: LinkedExtractedValue;                   // Code 6051 - Résultat brut (small/medium only)
  is_abridged_pnl: boolean;                              // Flag if P&L is abridged
  
  // Operating Income
  other_operating_income: LinkedExtractedValue;          // Code 6071 - Autres produits d'exploitation
  
  // Operating Expenses (only in full accounts)
  raw_materials?: LinkedExtractedValue;                  // Code 6021 - Matières premières
  other_external_charges?: LinkedExtractedValue;         // Code 6041 - Autres charges externes
  
  // Staff Costs - with breakdown for FAR analysis
  staff_costs_total: LinkedExtractedValue;               // Code 6101 - Frais de personnel (total)
  staff_wages_salaries?: LinkedExtractedValue;           // Code 6111 - Salaires et traitements
  staff_social_security?: LinkedExtractedValue;          // Code 6121 - Charges sociales
  staff_pensions?: LinkedExtractedValue;                 // Code 6131 - Frais de pension
  
  // Depreciation & Value Adjustments
  depreciation: LinkedExtractedValue;                    // Code 6151 - Corrections de valeur
  
  // Other operating charges
  other_operating_charges: LinkedExtractedValue;         // Code 6201 - Autres charges d'exploitation
  
  // Financial Income - IC split CRITICAL
  ic_dividend_income: LinkedExtractedValue;              // Code 6251a - Produits de participations (liées)
  third_party_dividend_income?: LinkedExtractedValue;    // Code 6251 minus 6251a
  
  ic_interest_income: LinkedExtractedValue;              // Codes 6261a + 6271a - Interest from affiliated
  third_party_interest_income: LinkedExtractedValue;     // Total interest minus IC
  
  // Financial Expenses - IC split CRITICAL
  ic_interest_expense: LinkedExtractedValue;             // Code 6311a - Interest to affiliated
  third_party_interest_expense: LinkedExtractedValue;    // Total interest minus IC
  
  // Results
  profit_before_tax: LinkedExtractedValue;               // Code 6351 - Résultat avant impôts
  tax: LinkedExtractedValue;                             // Code 6361 - Impôts sur le résultat
  net_profit: LinkedExtractedValue;                      // Code 6371 - Résultat de l'exercice
  
  // Tax analysis for TP
  effective_tax_rate?: number;                           // Calculated: tax / profit_before_tax
  statutory_rate_difference?: number;                    // Difference from 24.94% (Lux rate)
}

export interface ProfitAndLoss {
  currency: string;
  current_year: FinancialYearData;
  prior_year: FinancialYearData;
  
  // Note 22 - Turnover breakdown (mandatory for large companies)
  turnover_note?: NoteContent;
}

export interface BalanceSheetYearData {
  // ASSETS - with eCDF codes
  total_assets: LinkedExtractedValue;                    // Code 399
  
  // Fixed Assets - Financial Assets (C.III)
  participations_affiliated: LinkedExtractedValue;       // Code 1151 - Parts dans entreprises liées
  ic_loans_granted_fixed: LinkedExtractedValue;          // Code 1171 - Créances sur entreprises liées (immob.)
  participating_interests: LinkedExtractedValue;         // Code 1152 - Participations
  loans_to_participating: LinkedExtractedValue;          // Code 1172 - Créances sur entreprises avec lien
  
  // Current Assets - Debtors (D.II)
  trade_receivables: LinkedExtractedValue;               // Code 1271 - Créances commerciales
  ic_receivables_current: LinkedExtractedValue;          // Code 1279 - Créances sur entreprises liées (circulant)
  other_receivables: LinkedExtractedValue;               // Code 1281 - Autres créances
  
  // Current Assets - Cash (D.IV)
  cash: LinkedExtractedValue;                            // Code 1351 - Avoirs en banques
  
  // LIABILITIES - Capital & Reserves (A)
  total_equity: LinkedExtractedValue;                    // Code 101 - Capitaux propres
  share_capital: LinkedExtractedValue;                   // Code 1011 - Capital souscrit
  share_premium: LinkedExtractedValue;                   // Code 1031 - Primes d'émission
  reserves: LinkedExtractedValue;                        // Code 1051 - Réserves
  retained_earnings: LinkedExtractedValue;               // Code 1071 - Résultats reportés
  profit_loss_year: LinkedExtractedValue;                // Code 1081 - Résultat de l'exercice
  
  // LIABILITIES - Creditors (C) with maturity splits
  total_creditors: LinkedExtractedValue;                 // Code 405 - Total dettes
  
  // Bank debt with maturity
  bank_debt_within_one_year: LinkedExtractedValue;       // Code 4211 - within 1 year
  bank_debt_after_one_year: LinkedExtractedValue;        // Code 4221 - after 1 year
  bank_debt_after_five_years: LinkedExtractedValue;      // after 5 years (from Note 20)
  
  // IC debt with maturity - CRITICAL FOR TP
  ic_loans_received_within_one_year: LinkedExtractedValue;  // Code 4251 - within 1 year
  ic_loans_received_after_one_year: LinkedExtractedValue;   // Code 4261 - after 1 year
  ic_loans_received_after_five_years: LinkedExtractedValue; // after 5 years (from Note 20)
  ic_loans_received_total: LinkedExtractedValue;            // Code 4279 - Total IC debt
  
  // Trade payables
  trade_payables: LinkedExtractedValue;                  // Code 4281 - Dettes commerciales
  
  // Calculated totals
  total_ic_assets: LinkedExtractedValue;                 // Sum of all IC receivables
  total_ic_liabilities: LinkedExtractedValue;            // Sum of all IC payables
}

export interface BalanceSheet {
  currency: string;
  current_year: BalanceSheetYearData;
  prior_year: BalanceSheetYearData;
  
  // Note 20 - Creditors maturity analysis (mandatory disclosure)
  creditors_maturity_note?: NoteContent;
}

/*
JSON ↔ NORMALIZED TABLES RECONCILIATION (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IC transactions and related party transactions are stored BOTH:
- In extraction JSON arrays (SOURCE OF TRUTH)
- In normalized DB tables (QUERY-OPTIMIZED MIRRORS)

REQUIREMENTS (enforced by code, not convention):
1. IDEMPOTENT TRANSFORMER: Same JSON always produces same table rows
2. DETERMINISTIC record_id: Hash of key fields (type + counterparty + amount + page)
3. record_fingerprint: Hash of ALL fields for drift detection
4. ROUND-TRIP EQUALITY: Tables can be regenerated from JSON with exact match
5. "APPROVED" status REQUIRES passing reconciliation check

If reconciliation fails, extraction stays in "pending_reconciliation" state.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

export interface ReconciliationStatus {
  json_to_tables_transformed: boolean;
  transformation_timestamp: string;
  transformer_version: string;              // Track which code version
  
  // Round-trip equality check
  round_trip_check_passed: boolean;
  records_in_json: number;
  records_in_tables: number;
  fingerprint_mismatches: number;
  missing_in_tables: string[];              // record_ids
  extra_in_tables: string[];                // record_ids
  
  // Status
  reconciliation_status: 'pending' | 'passed' | 'failed' | 'needs_rerun';
  failure_reason?: string;
  
  // Approval gate
  can_be_approved: boolean;                 // False if reconciliation failed
}

export interface ICTransaction {
  // RECONCILIATION IDENTIFIERS (prevent JSON ↔ tables drift)
  record_id: string;                        // Deterministic hash: type + counterparty + amount + page
  record_fingerprint: string;               // Hash of all fields for drift detection
  
  type: 'loan_granted' | 'loan_received' | 'service_fee_income' | 
        'service_fee_expense' | 'management_fee' | 'royalty' | 
        'guarantee' | 'dividend' | 'cash_pooling' | 'other';
  counterparty: string | null;
  counterparty_country: string | null;
  amount: number | null;
  interest_rate: string | null;
  maturity: string | null;
  maturity_within_one_year?: number;
  maturity_after_one_year?: number;
  maturity_after_five_years?: number;
  is_subordinated?: boolean;
  description: string;
  page: number;
  source_note: string | null;
  ecdf_code?: string;
}

// Note 7ter - Related Party Transactions (Art. 65(1) 7ter)
// CRITICAL: Transactions not concluded under normal market conditions
// NOTE: "No 7ter entries" ≠ "All IC is arm's length" - 7ter only shows NON-market terms

/*
RELATED PARTY BOOLEAN SEMANTICS (CRITICAL - Prevents Silent Errors)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRONG: is_arms_length: boolean (default TRUE)
  - If transformer forgets to set it, you get a false-negative
  - Note 7ter is explicitly "NOT under normal market conditions"

CORRECT: Use explicit disclosure_type and non_market_terms_disclosed
  - No default - must be explicitly set
  - disclosure_type clarifies what the row represents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

export type RelatedPartyDisclosureType = 
  | '7ter_non_market'              // Note 7ter: explicitly non-market terms
  | 'full_related_party_listing'   // Full disclosure of all related party transactions
  | 'statement_only_no_exceptions' // Statement that no non-market transactions exist
  | 'not_disclosed';               // No disclosure (check if exempt)

export interface RelatedPartyTransaction {
  // RECONCILIATION IDENTIFIERS (prevent JSON ↔ tables drift)
  record_id: string;                        // Deterministic hash: nature + counterparty + amount
  record_fingerprint: string;               // Hash of all fields
  
  nature: string;                          // Nature of the transaction
  counterparty: string;                    // Related party name
  relationship: string;                    // Nature of relationship (owner, affiliate, etc.)
  amount: number;
  
  // CORRECTED SEMANTICS (no default - must be explicitly set)
  disclosure_type: RelatedPartyDisclosureType;
  non_market_terms_disclosed: boolean | null;  // NULL = unknown, must investigate
                                               // TRUE = explicitly disclosed as non-market (7ter)
                                               // FALSE = explicitly stated as at market terms
  
  terms_description?: string;              // Terms and conditions if disclosed
  page: number;
  source_note: string;
}

// Note 1 - Ownership and Group Structure
export interface OwnershipStructure {
  immediate_parent?: {
    name: string;
    country: string;
    ownership_percentage: number;
    page: number;
  };
  ultimate_parent?: {
    name: string;
    country: string;
    ownership_percentage?: number;
    is_listed?: boolean;
    page: number;
  };
  subsidiaries?: Array<{
    name: string;
    country: string;
    ownership_percentage: number;
    activity?: string;
    page: number;
  }>;
  consolidation_status?: 'consolidated' | 'not_consolidated' | 'exempt';
  consolidation_parent?: string;           // Where consolidated accounts are filed
}

// =============================================================================
// SOPARFI / SUBSTANCE RISK PATTERNS
// =============================================================================
// Luxembourg-specific: Many entities are SOPARFIs (Holding/Financing companies)
// Pattern: High IC debt + zero/low staff = potential Substance Risk

export interface SubstanceIndicators {
  // Staff indicators
  has_employees: boolean;
  employee_count: number | null;
  staff_costs: number | null;
  
  // Office/management indicators
  has_physical_office: boolean;
  is_domiciliation_administered: boolean;  // Managed by external company
  management_company_name?: string;
  
  // Decision-making indicators
  has_local_directors: boolean;
  director_names?: string[];
  
  // SOPARFI pattern detection
  is_potential_soparfi: boolean;           // High financial assets, low operations
  soparfi_indicators: string[];            // What triggered the flag
  
  // Circular 56/1 compliance concerns
  circular_56_1_concerns: Array<{
    concern: string;
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
}

// =============================================================================
// QUALITATIVE FAR CONTEXT
// =============================================================================
// Extracted from Management Report for functional/risk analysis

// TP Trigger Keywords for targeted extraction
export const TP_TRIGGER_KEYWORDS = [
  // IP-related
  'patents', 'licenses', 'royalties', 'intellectual property', 'IP', 'trademarks',
  'brevets', 'licences', 'redevances', 'propriété intellectuelle', 'marques',
  
  // Services
  'management fees', 'service fees', 'administrative services', 'technical services',
  'frais de gestion', 'frais de service', 'services administratifs',
  
  // Financing
  'financing', 'loans', 'interest', 'guarantees', 'cash pooling', 'treasury',
  'financement', 'prêts', 'intérêts', 'garanties', 'trésorerie',
  
  // R&D
  'research', 'development', 'R&D', 'innovation',
  'recherche', 'développement', 'innovation',
  
  // Corporate purpose (Note 1)
  'creation', 'acquisition', 'holding', 'exploitation', 'sale of patents',
  'création', 'acquisition', 'détention', 'exploitation'
] as const;

export interface KeywordScore {
  keyword: string;
  category: 'ip' | 'services' | 'financing' | 'rd' | 'corporate_purpose';
  count: number;
  sentences: Array<{
    text: string;
    page: number;
    context: string;                        // Surrounding context
  }>;
  tp_relevance: 'high' | 'medium' | 'low';
}

export interface QualitativeFARContext {
  // Raw extracted text for Claude analysis
  qualitative_context: string;             // Full context string for AI
  
  // KEYWORD SCORING (targeted extraction)
  keyword_scores: KeywordScore[];
  total_tp_keywords_found: number;
  dominant_tp_theme?: 'ip_heavy' | 'financing_heavy' | 'services_heavy' | 'mixed';
  
  // Keyword-based extractions (legacy format)
  keywords_found: {
    risks: string[];                       // Mentions of "risks", "uncertainties"
    functions: string[];                   // Mentions of "functions", "activities"
    personnel: string[];                   // Mentions of "personnel", "employees", "staff"
    development: string[];                 // Mentions of "development", "growth"
    research: string[];                    // Mentions of "research", "R&D", "innovation"
    group: string[];                       // Mentions of "group", "parent", "subsidiary"
    
    // TP-specific keywords
    patents_ip: string[];                  // Patents, licenses, royalties
    management_fees: string[];             // Management/service fees
    financing_guarantees: string[];        // Financing, guarantees, cash pooling
  };
  
  // Extracted sentences containing TP triggers
  tp_relevant_sentences: Array<{
    sentence: string;
    source: 'management_report' | 'note_1' | 'note_7ter' | 'other_note';
    page: number;
    keywords_matched: string[];
    tp_category: 'ip' | 'services' | 'financing' | 'rd' | 'substance';
  }>;
  
  // Corporate Purpose from Note 1 (critical for FAR)
  corporate_purpose_text?: string;
  corporate_purpose_keywords: string[];
  
  // Extracted statements
  business_model_summary?: string;
  risk_statement?: string;
  key_personnel_info?: string;
  group_role_description?: string;
  
  // Source tracking
  source_pages: number[];
  extraction_confidence: number;
}

// Management Report (Art. 68) - Enhanced for FAR Analysis
export interface ManagementReport {
  has_management_report: boolean;
  page_start?: number;
  page_end?: number;
  
  // Business Overview - for Functional Analysis
  business_description?: string;           // Fair review of business development
  principal_activities?: string[];         // Main activities performed
  
  // Risk Analysis - for Risk Analysis in FAR
  principal_risks?: string[];              // Art. 68(1)(b) - principal risks and uncertainties
  financial_risks?: string[];              // Interest rate, currency, liquidity risks
  
  // Key Performance Indicators
  kpis_mentioned?: string[];               // Any KPIs disclosed
  
  // Future Outlook
  future_developments?: string;            // Likely future development
  
  // R&D Activities (relevant for IP/royalty TP)
  rd_activities?: string;                  // Research and development activities
  
  // QUALITATIVE FAR CONTEXT (for Claude)
  far_context: QualitativeFARContext;
  
  raw_text: string;                        // Full extracted text for AI analysis
}

// =============================================================================
// ACCOUNTING POLICIES & TAX NOTES (NEW)
// =============================================================================

export interface AccountingPolicies {
  has_accounting_policies_note: boolean;
  page?: number;
  
  // Valuation policies (comparability drivers)
  participations_valuation?: 'cost' | 'equity' | 'fair_value' | 'other';
  loans_valuation?: 'amortized_cost' | 'fair_value' | 'other';
  impairment_policy?: string;
  fx_policy?: string;                      // Foreign currency translation
  fair_value_option_used?: boolean;
  
  // Revenue recognition
  revenue_recognition_policy?: string;
  
  // Consolidation
  consolidation_method?: string;
  
  // Other significant policies
  other_policies?: string[];
  
  raw_text?: string;
}

export interface TaxNote {
  has_tax_note: boolean;
  page?: number;
  
  // Current vs deferred
  current_tax?: number;
  deferred_tax?: number;
  
  // Rate reconciliation (if disclosed)
  statutory_rate?: number;                 // Should be 24.94% for Lux
  effective_rate?: number;
  reconciliation_items?: Array<{
    description: string;
    amount?: number;
    rate_impact?: number;
  }>;
  
  // Tax losses / credits
  tax_losses_carried_forward?: number;
  tax_credits?: number;
  
  raw_text?: string;
}

// =============================================================================
// SIZE-BASED DISCLOSURE EXPECTATIONS
// =============================================================================
/*
ASSESSABILITY LABELING (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When a company is small/abridged and disclosures are exempt, the analysis output
must NOT imply compliance or arm's length. Instead, label the output:

"Not assessable from statutory accounts - [disclosure] is exempt for [size] entities"

This prevents false negatives where absence of disclosure = legal exemption, not compliance.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

export interface DisclosureExpectations {
  company_size: 'small' | 'medium' | 'large';
  account_type: 'full' | 'abridged' | 'abbreviated';
  
  // Expected disclosures by size
  expected_disclosures: Array<{
    disclosure: string;
    required: boolean;
    found: boolean;
    reason_if_missing?: 'exempt' | 'not_found' | 'not_applicable';
    
    // For analysis output labeling
    assessable: boolean;                    // Can this disclosure be assessed?
    not_assessable_reason?: string;         // e.g., "Exempt for small entities"
    tp_impact: string;                      // What TP analysis is affected
  }>;
  
  // Size-specific expectations
  turnover_breakdown_required: boolean;    // Note 22 - Large only
  related_party_full_disclosure: boolean;  // Full for large
  abridged_pnl_allowed: boolean;
  abbreviated_bs_allowed: boolean;
  management_report_required: boolean;
  audit_required: boolean;
  
  // Overall assessability summary
  full_tp_analysis_possible: boolean;
  limited_assessments_only: string[];      // What CAN be assessed
  not_assessable_areas: Array<{
    area: string;
    reason: string;
    output_label: string;                   // Exact label for analysis output
  }>;
}

export interface OffBalanceSheetItem {
  beneficiary: string;
  amount: number;
  fee_charged: number | null;
  description: string;
  page: number;
}

export interface OffBalanceSheet {
  guarantees_given: OffBalanceSheetItem[];
  guarantees_received: OffBalanceSheetItem[];
  other_commitments: OffBalanceSheetItem[];
}

export interface ExtractionFlags {
  items_not_found: string[];
  low_confidence_items: string[];
  validation_warnings: string[];
  notes_referenced_but_not_extracted: string[];
  
  // Luxembourg GAAP specific flags
  is_abridged_accounts: boolean;
  missing_mandatory_disclosures: string[];  // e.g., "Note 22 (turnover) missing for large company"
  arithmetic_validation_errors: string[];   // e.g., "Note 20 total doesn't match Creditors"
  potential_data_quality_issues: string[];  // e.g., "Large company but no turnover breakdown"
  
  // CRITICAL: Disclosure scope limitations
  ic_disclosure_limitation: boolean;        // True if related party disclosure is limited
  ic_disclosure_limitation_reason?: string; // e.g., "Art. 65(1) 7ter - only non-market terms disclosed"
  
  // Data completeness flags
  unit_scale_uncertain: boolean;
  debt_capture_incomplete: boolean;         // Not all interest-bearing debt captured
  ic_base_incomplete: boolean;              // IC interest without IC loans or vice versa
}

// =============================================================================
// CONFIGURABLE BENCHMARK PARAMETERS
// =============================================================================
// CRITICAL: These are HEURISTICS, not deterministic rules - label them clearly

export interface BenchmarkParameters {
  // IC financing spread benchmarks (configurable)
  ic_spread_low_bps: number;               // Default: 25 bps
  ic_spread_high_bps: number;              // Default: 75 bps
  ic_spread_zero_threshold_bps: number;    // Default: 10 bps (below = "zero spread")
  
  // Thin cap thresholds
  thin_cap_debt_equity_ratio: number;      // Default: 85% (Lux safe harbor)
  
  // Substance thresholds
  min_employees_for_substance: number;     // Default: 1
  
  // Confidence thresholds
  code_mapping_confidence_threshold: number; // Default: 0.7
  unit_scale_confidence_threshold: number;   // Default: 0.8
  
  // These are HEURISTICS - analysis must label them as such
  is_heuristic: true;
  source: string;                          // e.g., "OECD TPG / Market practice"
}

// =============================================================================
// DETERMINISTIC COMPUTED METRICS
// =============================================================================
// CRITICAL: These are computed BEFORE sending to Claude, not by Claude

export interface DeterministicMetrics {
  // Profitability (only if extractable from full accounts)
  operating_profit?: number;                // If definable from lines
  operating_profit_calculable: boolean;
  operating_profit_formula?: string;        // How it was calculated
  
  ebit?: number;
  ebit_calculable: boolean;
  
  ebitda?: number;
  ebitda_calculable: boolean;
  
  gross_margin_pct?: number;                // Only if turnover and COGS available
  operating_margin_pct?: number;
  net_margin_pct?: number;
  
  // IC Financing metrics
  avg_ic_loans_granted?: number;            // (Opening + Closing) / 2
  avg_ic_loans_received?: number;
  implied_ic_lending_rate?: number;         // IC Interest Income / Avg IC Loans Granted
  implied_ic_borrowing_rate?: number;       // IC Interest Expense / Avg IC Loans Received
  ic_spread_bps?: number;                   // (Lending - Borrowing) × 10,000
  
  // Leverage metrics - EXPANDED for all interest-bearing debt
  total_interest_bearing_debt?: number;     // Bank + debentures + IC + other
  debt_components: {
    bank_loans?: number;
    debentures?: number;                    // Bonds, notes
    ic_loans?: number;
    other_loans?: number;
    current_account_financing?: number;     // Cash pool positions
    accrued_interest?: number;
  };
  debt_components_captured: string[];       // Which debt types were included
  debt_capture_complete: boolean;           // All debt types captured?
  debt_equity_ratio?: number;
  equity_ratio_pct?: number;
  interest_coverage_ratio?: number;         // EBIT / Interest Expense
  
  // Asset metrics (for FAR)
  asset_intensity_ratio?: number;           // Total Assets / Turnover
  fixed_asset_ratio?: number;               // Fixed Assets / Total Assets
  
  // Tax metrics
  effective_tax_rate?: number;
  statutory_rate_lux: number;               // 24.94%
  rate_difference_pct?: number;
  
  // ==========================================================================
  // YEAR-ON-YEAR VOLATILITY ANALYSIS (For Trend Detection)
  // ==========================================================================
  // TP opportunities are rarely found in a single year - trends matter
  
  yoy_analysis: {
    // Revenue volatility
    turnover_cy?: number;
    turnover_py?: number;
    turnover_change_pct?: number;
    turnover_change_significant: boolean;   // >20% change
    
    // Profit volatility
    operating_profit_cy?: number;
    operating_profit_py?: number;
    operating_profit_change_pct?: number;
    profit_volatility_flag: boolean;        // Significant swing
    
    // Margin shifts
    operating_margin_cy_pct?: number;
    operating_margin_py_pct?: number;
    margin_shift_pct?: number;              // Margin erosion/improvement
    margin_shift_significant: boolean;      // >5pp change
    
    // IC position changes
    ic_debt_cy?: number;
    ic_debt_py?: number;
    ic_debt_change_pct?: number;
    ic_debt_spike_flag: boolean;            // Sudden increase in IC debt
    
    ic_receivables_cy?: number;
    ic_receivables_py?: number;
    ic_receivables_change_pct?: number;
    
    // Staff/substance changes
    staff_costs_cy?: number;
    staff_costs_py?: number;
    staff_costs_change_pct?: number;
    staff_reduction_flag: boolean;          // Substance erosion indicator
    
    // Interest rate changes
    implied_rate_cy?: number;
    implied_rate_py?: number;
    rate_change_bps?: number;
    rate_change_significant: boolean;       // >50bps change
  };
  
  // Calculation audit trail
  calculations_performed: Array<{
    metric: string;
    formula: string;
    inputs: Record<string, number | null>;
    result: number | null;
    notes: string;
  }>;
  
  // Metrics that CANNOT be calculated (and why)
  metrics_not_calculable: Array<{
    metric: string;
    reason: string;                         // e.g., "Abridged P&L - COGS not disclosed"
    missing_inputs: string[];
  }>;
}

// =============================================================================
// PRE-ANALYSIS GATES
// =============================================================================
// CRITICAL: These must pass before analysis can proceed

/*
ANALYSIS READINESS LEVELS (Prevents Endless Review Cycle)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To avoid over-blocking while protecting correctness, analysis proceeds at different
trust levels based on data quality:

READY_FULL: All must-pass gates + mapping quality ≥80%, no review needed
- Full TP analysis allowed
- All opportunity types can be generated

READY_LIMITED: Unit scale + BS balance pass; mapping 60-80%; notes may be incomplete
- Only high-confidence modules used
- Restricted opportunity types (see LimitedModeRules)

BLOCKED: Unit scale fails, BS fails, consolidation blocked, or material ambiguity
- No analysis allowed
- Must fix blocking issues first
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

export type AnalysisReadinessLevel = 'READY_FULL' | 'READY_LIMITED' | 'BLOCKED';

export interface LimitedModeRules {
  /*
  READY_LIMITED IS A HARD PRODUCT MODE (Not a soft warning)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Opportunity generation MECHANICALLY depends on:
  1. readiness_level
  2. *_calculable flags from DeterministicMetrics
  3. module_trust_levels
  4. abridged/aggregated status
  
  This is enforced BY CODE, not by prompt instructions like "please be careful."
  The opportunity generator CANNOT produce disabled opportunity types.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ALLOWED in LIMITED mode (if conditions met):
  - IC financing spread checks: IF ic_interest + ic_balances both high-confidence AND debt_capture_complete
  - Substance flags: IF employees/staff_costs are high-confidence
  - Thin cap ratio: IF total_debt and equity are high-confidence
  - Zero-spread detection: IF implied rates are calculable
  
  MECHANICALLY DISABLED in LIMITED mode (code blocks generation):
  - Operating PLIs / margin-based opportunities (if operating_profit_calculable = false)
  - Service fee base erosion analysis (if turnover not disclosed / abridged)
  - Cost-plus benchmarking (requires cost breakdown)
  - Any opportunity relying on abridged P&L lines (if is_abridged_pnl = true)
  - Note-based opportunities (if module_b_context.trust_level = 'low')
  */
  
  // MECHANICAL ENFORCEMENT (code-level, not prompt-level)
  opportunity_enablement: {
    // Each opportunity type maps to required conditions
    // Generator CANNOT produce if conditions not met
    [opportunity_type: string]: {
      enabled: boolean;
      required_calculable_flags: string[];      // Must all be true
      required_module_trust: {
        module: 'a' | 'b' | 'c';
        min_trust_level: 'high' | 'medium' | 'low';
      }[];
      blocked_if_abridged: boolean;
      blocked_if_aggregated_lines: string[];    // PCN codes that can't be aggregated
      disable_reason?: string;                  // Why disabled (for audit)
    };
  };
  
  allowed_opportunity_types: string[];
  disallowed_opportunity_types: string[];
  reason_for_limitations: string[];
}

export interface ModuleTrustLevels {
  // Trust level per module (A/B/C) - enables partial analysis
  module_a_anchors: {
    trust_level: 'high' | 'medium' | 'low';
    balance_sheet_confidence: number;
    profit_loss_confidence: number;
    metrics_confidence: number;
    issues: string[];
  };
  
  module_b_context: {
    trust_level: 'high' | 'medium' | 'low';
    notes_extraction_confidence: number;
    ic_transactions_confidence: number;
    related_party_confidence: number;
    issues: string[];
  };
  
  module_c_narrative: {
    trust_level: 'high' | 'medium' | 'low';
    management_report_confidence: number;
    far_context_confidence: number;
    issues: string[];
  };
}

// Bounded human review - STRICTLY constrained actions only
/*
REVIEW LOOP MUST BE BOUNDED AND HIGH-IMPACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Max 5-10 constrained actions. ONLY these action types are allowed:

1. confirm_unit_scale - yes/no (is it thousands or units?)
2. confirm_mapping - accept/reject for a few critical PCN code rows only
3. confirm_consolidation - ONE-STEP: standalone/consolidated (stored forever)
4. fix_arithmetic - accept suggested tie-out fix for one number

ANYTHING ELSE becomes a warning + LIMITED mode, NOT a blocker.
This prevents review queues from growing faster than they can be cleared.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
export type ReviewActionType = 
  | 'confirm_unit_scale'      // Yes/no: is the scale correct?
  | 'confirm_mapping'         // Accept/reject suggested PCN code
  | 'confirm_consolidation'   // One-step: standalone or consolidated
  | 'fix_arithmetic';         // Accept suggested tie-out fix

// NO OTHER ACTION TYPES ALLOWED - anything else goes to LIMITED mode with warning

export interface ReviewAction {
  action_type: ReviewActionType;
  priority: 'blocking' | 'high' | 'medium';
  description: string;
  
  // For mapping confirmation: show only lowest-confidence rows (max 10)
  // ONLY for TP_CRITICAL_PCN_CODES - non-critical codes don't block
  affected_items?: Array<{
    pcn_code: string;
    caption: string;
    confidence: number;
    suggested_code?: string;
    is_tp_critical: boolean;      // Only critical codes can block
  }>;
  
  // For arithmetic fix: show suggested correction
  suggested_fix?: {
    field: string;
    current_value: number;
    suggested_value: number;
  };
  
  // For consolidation: one-step resolution
  consolidation_indicators?: string[];  // Evidence shown to user
}

export interface PreAnalysisGates {
  // ANALYSIS READINESS LEVEL (derived from all gates)
  readiness_level: AnalysisReadinessLevel;
  limited_mode_rules?: LimitedModeRules;      // Only set if READY_LIMITED
  module_trust_levels: ModuleTrustLevels;
  
  // MUST-PASS gates (block analysis if failed) - TIER 1
  unit_scale_validated: boolean;
  unit_scale_gate_passed: boolean;
  unit_scale_confidence_sufficient: boolean;  // Must be >= 0.8
  
  balance_sheet_balances: boolean;
  balance_sheet_gate_passed: boolean;
  balance_sheet_difference?: number;
  balance_sheet_tolerance_pct: number;        // e.g., 0.01 for 1%
  
  // MAPPING GATE (CRITICAL - wrong code assignment is main vulnerability)
  mapping_gate_passed: boolean;
  mapping_gate_details: {
    high_confidence_pct: number;              // ≥80% for READY_FULL
    medium_confidence_pct: number;            // 60-80% allows READY_LIMITED
    requires_review_count: number;
    auto_analysis_allowed: boolean;
    
    // MATERIALITY-BASED GATE (prevents review inflation)
    // Only force review if low-confidence mappings touch TP-critical codes
    tp_critical_codes_affected: boolean;
    affected_critical_codes: string[];
    non_critical_low_confidence_count: number;  // Can proceed with warning
    
    // Template fingerprint for mapping cache (reduces review over time)
    template_fingerprint?: string;            // Hash of layout cues
    fingerprint_previously_approved: boolean;
    confidence_boost_applied: boolean;
    
    // Fingerprint governance (prevents systematic error propagation)
    fingerprint_governance?: {
      approval_date: string;
      expiry_date: string;                    // e.g., 12 months from approval
      last_regression_test_date: string;
      dictionary_version_at_approval: string;
      requires_revalidation: boolean;         // True if dictionary_version changed
      revoked: boolean;
      revocation_reason?: string;
      
      // TRUST BUT VERIFY (prevents single bad approval scaling into systemic error)
      spot_check_config: {
        spot_check_rate: number;              // e.g., 0.05 = 1 in 20 uploads
        uploads_since_last_spot_check: number;
        last_spot_check_date?: string;
        last_spot_check_passed?: boolean;
        total_uploads_with_fingerprint: number;
        spot_check_failures: number;          // If > threshold, auto-revoke
        auto_revoke_threshold: number;        // e.g., 3 failures
      };
    };
  };
  
  // CONSOLIDATION DECISION RULES (CRITICAL)
  consolidation_gate: {
    is_consolidated: boolean | null;        // NULL = unclear, needs resolution
    standalone_tp_analyzable: boolean;
    analysis_mode: 'entity_level' | 'group_level_only' | 'blocked' | 'pending_resolution';
    consolidation_limitations: string[];
    
    // ONE-STEP RESOLUTION (prevents recurring blocker)
    // If consolidation is unclear, produce exactly ONE ReviewAction
    // After user confirms, store resolution and never ask again for this company/year
    resolution_required: boolean;
    resolution_stored?: {
      resolved_at: string;
      resolved_by: string;                  // User ID
      resolution: 'standalone' | 'consolidated';
      company_id: string;
      financial_year: string;
      // Never ask again for this company/year combination
    };
  };
  
  // SHOULD-PASS gates (controls scope, not access) - TIER 2
  mapping_quality_acceptable: boolean;
  ic_consistency_check_passed: boolean;
  subtotals_reconcile: boolean;
  kpi_vs_canonical_reconciled: boolean;
  note_reconciliations_passed: boolean;       // Determines note-based opportunities
  abridged_pnl_detected: boolean;             // Determines P&L-based opportunities
  
  // Gate decisions
  can_proceed_to_analysis: boolean;
  blocking_issues: string[];
  warning_issues: string[];
  scope_limitations: string[];                // What's restricted in LIMITED mode
  
  // Review requirements (bounded, not endless)
  requires_human_review: boolean;
  review_reasons: string[];
  review_actions_required: ReviewAction[];    // Max 5-10 constrained actions
  
  // FIXABLE ERRORS
  has_fixable_errors: boolean;
  fixable_errors_applied: boolean;
  revalidation_required: boolean;
}

// =============================================================================
// VALIDATION DASHBOARD FLAGS
// =============================================================================
// Specific validation checks to present to user for review

export interface ValidationDashboard {
  // CRITICAL: Unit-Scale Cross-Check Reconciliation
  unit_scale_reconciliation: {
    performed: boolean;
    method: 'cross_section_comparison' | 'magnitude_check' | 'manual';
    sections_compared: string[];              // e.g., ["Statutory BS", "Summary BS"]
    reconciliation_passed: boolean;
    discrepancy_factor?: number;              // e.g., 1000 if summary is in thousands
    details: string;
  };
  
  // Data Consistency Flags
  inconsistencies: Array<{
    type: 'note_bs_mismatch' | 'subtotal_error' | 'cross_ref_error' | 'scale_mismatch';
    severity: 'error' | 'warning';
    description: string;                    // e.g., "Total Assets in Note 4 does not match Balance Sheet Line 109"
    expected_value?: number;
    actual_value?: number;
    pcn_codes_involved: string[];
    page_references: number[];
    
    // For arithmetic errors - allow single-number fix
    is_fixable: boolean;
    suggested_fix?: {
      field: string;
      current_value: number;
      suggested_value: number;
      fix_reason: string;
    };
  }>;
  
  // Substance Concern Flags
  substance_warnings: Array<{
    type: 'missing_staff_note' | 'low_substance' | 'no_employees' | 'domiciliation';
    severity: 'high' | 'medium' | 'low';
    description: string;                    // e.g., "Large entity detected, but Staff Cost Note is empty"
    indicators: Record<string, any>;
  }>;
  
  // Data Completeness Flags
  completeness_issues: Array<{
    type: 'missing_required' | 'missing_expected' | 'partial_extraction';
    field: string;
    reason: string;                         // e.g., "Note 7ter not found - required for large entity"
    impact: string;                         // What analysis is affected
  }>;
  
  // YoY Volatility Flags (for trend analysis)
  volatility_alerts: Array<{
    type: 'margin_shift' | 'ic_debt_spike' | 'staff_reduction' | 'turnover_volatility' | 'rate_change';
    severity: 'high' | 'medium' | 'low';
    description: string;                    // e.g., "IC debt increased 150% YoY"
    cy_value?: number;
    py_value?: number;
    change_pct?: number;
    tp_relevance: string;                   // Why this matters for TP
  }>;
  
  // Consolidation Alerts
  consolidation_alerts: Array<{
    type: 'standalone_with_subs' | 'consolidated_warning' | 'unclear_status';
    description: string;
    recommendation: string;
  }>;
  
  // Arithmetic Error Highlighting (for human fix)
  arithmetic_errors: Array<{
    location: string;                       // e.g., "Note 4.1 vs PCN 1137"
    description: string;                    // e.g., "Participations breakdown doesn't sum to BS total"
    expected_total: number;
    calculated_sum: number;
    difference: number;
    pcn_code: string;
    note_reference?: string;
    page: number;
    
    // Allow human to fix single number
    fixable_in_ui: boolean;
  }>;
  
  // Summary counts for UI
  summary: {
    total_errors: number;
    total_warnings: number;
    total_alerts: number;
    arithmetic_errors_count: number;
    ready_for_analysis: boolean;
    requires_review: boolean;
    confidence_level: 'high' | 'medium' | 'low';
  };
}

// =============================================================================
// COUNTERPARTY NORMALIZATION
// =============================================================================

export interface NormalizedCounterparty {
  raw_name: string;                         // As extracted from document
  normalized_name?: string;                 // Cleaned/standardized name
  relationship_type: 'parent' | 'subsidiary' | 'sister' | 'affiliate' | 'participating' | 'unknown';
  country?: string;
  country_confidence: number;
  is_normalized: boolean;                   // False if couldn't be resolved
  normalization_method?: string;            // e.g., "manual", "pattern_match", "lookup"
}

// =============================================================================
// MAIN STRUCTURED EXTRACTION
// =============================================================================

/*
TP HIGH-PRIORITY EXTRACTION FIELDS (Mandatory)
┌──────────────┬─────────────────────────────────┬─────────────────────────────────────────┐
│ Category     │ Item / PCN Code                 │ TP Utility                              │
├──────────────┼─────────────────────────────────┼─────────────────────────────────────────┤
│ P&L          │ Net Turnover (Note 22)          │ Calculation of Operating Margins        │
│ P&L          │ External Charges (601-606)      │ Identifying base erosion via service fees│
│ P&L          │ Staff Costs (641-645)           │ Substance indicators, FAR analysis      │
│ Balance Sheet│ Affiliated Receivables (1171)   │ IC loans granted                        │
│ Balance Sheet│ Affiliated Payables (1379/4279) │ IC loans received                       │
│ Balance Sheet│ Participations (1151)           │ Holding structure identification        │
│ Notes        │ Note 7ter (Related Parties)     │ CRITICAL: Non-arm's length transactions │
│ Notes        │ Note 20 (Maturity)              │ IC debt maturity for rate benchmarking  │
│ Notes        │ Note 22 (Turnover breakdown)    │ Geographic/activity split (large only)  │
│ Report       │ Management Report               │ Qualitative FAR analysis context        │
└──────────────┴─────────────────────────────────┴─────────────────────────────────────────┘

THREE-MODULE JSON ORGANIZATION:
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ MODULE A: DETERMINISTIC TOTALS (The "Anchor")                                           │
│ - canonical_balance_sheet, canonical_profit_loss (PCN-keyed line items)                 │
│ - deterministic_metrics (pre-computed, Claude cannot modify)                            │
│ - yoy_analysis (year-on-year volatility from CY/PY columns)                             │
│ Purpose: Hard numbers that form the basis of all calculations                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ MODULE B: DISCLOSURE TEXT (The "Context")                                               │
│ - extracted_notes (structured tables + raw text)                                        │
│ - ic_transactions_from_notes, related_party_transactions                                │
│ - linked_note_data embedded in canonical line items                                     │
│ Purpose: Provides context, counterparty details, maturity analysis                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ MODULE C: FUNCTIONAL NARRATIVE (The "Story")                                            │
│ - management_report, far_context, qualitative_context                                   │
│ - business model descriptions, principal risks, future development                      │
│ Purpose: Gives Claude the "why" behind the numbers for FAR analysis                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
*/

export interface StructuredExtraction {
  // Metadata and versioning
  extraction_metadata: ExtractionMetadata;
  
  // Company information
  company_profile: CompanyProfile;
  
  // MULTI-YEAR CONTEXT (for trend analysis)
  multi_year_context: MultiYearContext;
  
  // =========================================================================
  // MODULE A: DETERMINISTIC TOTALS (The "Anchor")
  // =========================================================================
  
  // CANONICAL STATEMENTS (Full statutory statements, PCN-keyed)
  canonical_balance_sheet: CanonicalStatement;
  canonical_profit_loss: CanonicalStatement;
  
  // LEGACY KPI VIEWS (derived from canonical statements for backward compatibility)
  profit_and_loss: ProfitAndLoss;
  balance_sheet: BalanceSheet;
  
  // DETERMINISTIC METRICS (computed before AI analysis, includes yoy_analysis)
  deterministic_metrics: DeterministicMetrics;
  
  // =========================================================================
  // MODULE B: DISCLOSURE TEXT (The "Context")
  // =========================================================================
  
  // IC Transaction Details from Notes
  ic_transactions_from_notes: ICTransaction[];
  
  // Related Party Disclosures (Note 7ter) - CRITICAL
  related_party_transactions: RelatedPartyTransaction[];
  related_party_disclosure_scope: {
    disclosure_present: boolean;
    applies_art_65_1_7ter: boolean;
    limitation_applied: boolean;            // Only non-market terms disclosed?
    limitation_description?: string;
    covered_parties: string[];              // Which related parties are covered
    excluded_parties?: string[];            // Explicitly excluded (if known)
  };
  
  // Ownership Structure (Note 1)
  ownership_structure: OwnershipStructure;
  
  // Notes extraction (both structured and raw)
  extracted_notes: {
    note_tables: Array<{
      note_number: string;
      title: string;
      rows: Record<string, any>[];
      page: number;
    }>;
    note_text_blocks: Array<{
      note_number: string;
      raw_text: string;
      page: number;
    }>;
  };
  
  // =========================================================================
  // MODULE C: FUNCTIONAL NARRATIVE (The "Story")
  // =========================================================================
  
  // Management Report (Art. 68) - for FAR Analysis
  management_report: ManagementReport;
  
  // SUBSTANCE INDICATORS (SOPARFI pattern detection)
  substance_indicators: SubstanceIndicators;
  
  // Accounting Policies - for comparability
  accounting_policies: AccountingPolicies;
  
  // Tax Note - for tax-driven TP analysis
  tax_note: TaxNote;
  
  // Off-Balance Sheet Items
  off_balance_sheet: OffBalanceSheet;
  
  // =========================================================================
  // SUPPORTING DATA & VALIDATION
  // =========================================================================
  
  // Normalized counterparties (all IC counterparties consolidated)
  counterparties: NormalizedCounterparty[];
  
  // Size-based disclosure expectations
  disclosure_expectations: DisclosureExpectations;
  
  // CONFIGURABLE BENCHMARK PARAMETERS (clearly labelled as heuristics)
  benchmark_parameters: BenchmarkParameters;
  
  // PRE-ANALYSIS GATES (must pass before analysis)
  pre_analysis_gates: PreAnalysisGates;
  
  // VALIDATION DASHBOARD (for user review)
  validation_dashboard: ValidationDashboard;
  
  // Extraction Quality Flags
  extraction_flags: ExtractionFlags;
  
  // Arithmetic Validation Results
  validation_results: {
    balance_sheet_balances: boolean;        // Assets = Equity + Liabilities
    balance_sheet_difference?: number;      // If not balancing, by how much
    note_totals_match: boolean;             // Note details sum to BS/PL totals
    note_reconciliation_errors: string[];
    ic_consistency: boolean;                // IC assets have corresponding IC income
    ic_consistency_issues: string[];
    subtotals_reconcile: boolean;           // Child items sum to subtotals
    subtotal_errors: string[];
    cross_statement_ties: boolean;          // P&L profit = equity movement (if checkable)
    unit_scale_validated: boolean;          // Magnitudes make sense
    kpi_vs_canonical_reconciled: boolean;   // KPIs match sum of canonical lines
    kpi_reconciliation_errors: string[];
    all_checks_passed: boolean;
  };
}
```

---

## Analysis Schema (TypeScript)

```typescript
// src/lib/types/analysis.ts

// Functional, Asset, Risk (FAR) Analysis
export interface FARAnalysis {
  functional_analysis: {
    company_type: 'operational' | 'holding' | 'financing' | 'ip_holding' | 'mixed';
    functions_performed: string[];
    key_decisions_made: string[];
    substance_indicators: {
      has_employees: boolean;
      employee_count: number | null;
      has_physical_office: boolean;
      has_local_management: boolean;
      is_domiciliation_administered: boolean;
    };
    functional_classification: string;  // e.g., "Limited risk distributor", "Contract manufacturer"
  };
  
  asset_analysis: {
    key_assets_owned: string[];
    key_assets_used: string[];
    intangible_assets: string[];
    asset_intensity_ratio: number | null;  // Total assets / Turnover
  };
  
  risk_analysis: {
    financial_risks: string[];      // From management report
    operational_risks: string[];    // From management report
    market_risks: string[];
    risks_controlled: string[];
    risks_borne_by_others: string[];
  };
}

/*
OPPORTUNITY ENABLEMENT BY READINESS LEVEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────┬─────────────┬───────────────┬─────────┐
│ Opportunity Type            │ READY_FULL  │ READY_LIMITED │ BLOCKED │
├─────────────────────────────┼─────────────┼───────────────┼─────────┤
│ zero_spread                 │ ✓           │ ✓ (if IC data)│ ✗       │
│ thin_cap                    │ ✓           │ ✓ (if D/E)    │ ✗       │
│ unremunerated_guarantee     │ ✓           │ ✗             │ ✗       │
│ undocumented_services       │ ✓           │ ✗             │ ✗       │
│ pricing_anomaly             │ ✓           │ ✗             │ ✗       │
│ missing_documentation       │ ✓           │ ✗             │ ✗       │
│ related_party_flag          │ ✓           │ ✓ (if Note 7ter)│ ✗     │
│ substance_concern           │ ✓           │ ✓ (if staff)  │ ✗       │
│ maturity_mismatch           │ ✓           │ ✓ (if Note 20)│ ✗       │
│ soparfi_substance_risk      │ ✓           │ ✓             │ ✗       │
│ circular_56_1_concern       │ ✓           │ ✓             │ ✗       │
└─────────────────────────────┴─────────────┴───────────────┴─────────┘

REQUIRES FULL ACCOUNTS (not abridged):
- Operating PLI-based opportunities
- Cost-plus benchmarking
- Service fee base erosion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

export interface TPOpportunity {
  type: 'zero_spread' | 'thin_cap' | 'unremunerated_guarantee' | 
        'undocumented_services' | 'pricing_anomaly' | 'missing_documentation' |
        'related_party_flag' | 'substance_concern' | 'maturity_mismatch' |
        'soparfi_substance_risk' | 'circular_56_1_concern';  // Luxembourg-specific
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affected_amount: number | null;
  potential_adjustment: number | null;
  recommendation: string;
  data_references: string[];        // eCDF codes or note references
  regulatory_reference?: string;    // e.g., "Art. 56bis LIR", "OECD TPG Chapter X", "Circular 56/1"
  
  // Readiness context (for audit trail)
  generated_at_readiness_level: AnalysisReadinessLevel;
  required_data_present: boolean;   // All required inputs were high-confidence
  
  // For SOPARFI/substance concerns
  substance_indicators?: {
    ic_debt_amount?: number;
    staff_costs?: number;
    employee_count?: number;
    is_domiciliation_administered?: boolean;
  };
}

export interface ICFinancingAnalysis {
  total_ic_loans_granted: number;
  total_ic_loans_received: number;
  net_ic_position: number;
  
  lending_analysis: {
    principal: number;
    interest_income: number;
    implied_rate: number | null;
    maturity_profile: {
      within_one_year: number;
      after_one_year: number;
      after_five_years: number;
    };
    has_subordination: boolean;
  };
  
  borrowing_analysis: {
    principal: number;
    interest_expense: number;
    implied_rate: number | null;
    maturity_profile: {
      within_one_year: number;
      after_one_year: number;
      after_five_years: number;
    };
  };
  
  spread_analysis: {
    ic_spread_bps: number | null;
    market_benchmark_low: number;   // 25 bps
    market_benchmark_high: number;  // 75 bps
    is_within_benchmark: boolean;
    spread_assessment: 'adequate' | 'low' | 'zero' | 'negative' | 'unknown';
  };
}

export interface TPAnalysisResult {
  // Account context
  account_type: 'full' | 'abridged';
  company_size: 'small' | 'medium' | 'large';
  analysis_limitations: string[];   // What couldn't be analyzed due to abridged accounts
  
  // FAR Analysis
  far_analysis: FARAnalysis;
  
  // Company classification (derived from FAR)
  company_classification: 'operational' | 'holding' | 'financing' | 'ip_holding' | 'mixed';
  classification_reasoning: string;
  
  // IC Financing detailed analysis
  ic_financing: ICFinancingAnalysis;
  
  // Calculated metrics summary
  metrics: {
    total_ic_positions: number;
    ic_loans_granted: number;
    ic_loans_received: number;
    ic_interest_income: number;
    ic_interest_expense: number;
    implied_lending_rate: number | null;
    implied_borrowing_rate: number | null;
    ic_spread_bps: number | null;
    debt_equity_ratio: number | null;
    effective_tax_rate: number | null;
  };
  
  // Related Party Flags (from Note 7ter)
  related_party_flags: {
    has_note_7ter_disclosures: boolean;
    non_arms_length_transactions: number;
    flagged_transactions: Array<{
      description: string;
      amount: number;
      counterparty: string;
      concern: string;
    }>;
  };
  
  // Opportunities
  opportunities: TPOpportunity[];
  
  // Risk flags
  flags: {
    has_zero_spread: boolean;
    has_thin_cap_risk: boolean;
    has_unremunerated_guarantee: boolean;
    has_undocumented_services: boolean;
    has_substance_concerns: boolean;
    has_related_party_issues: boolean;  // From Note 7ter
  };
  
  // Scoring
  risk_score: number; // 1-100
  priority_ranking: 'high' | 'medium' | 'low';
  
  // Summary
  executive_summary: string;
  recommended_actions: string[];
  
  // For TP documentation assessment
  documentation_gaps: string[];
  suggested_benchmarking_studies: string[];
}
```

---

## Environment Variables

```env
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=eu
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# Google Drive Folder IDs
GDRIVE_ROOT_FOLDER_ID=folder-id
GDRIVE_COMPANIES_FOLDER_ID=folder-id

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload` | POST | Upload PDF to Google Drive, create company record |
| `/api/extract` | POST | Trigger Document AI extraction |
| `/api/analyze` | POST | Trigger Claude analysis (JSON input only) |
| `/api/companies` | GET | List all companies |
| `/api/companies/[id]` | GET | Get company detail |
| `/api/companies/[id]/financial-years` | GET | Get financial years for company |
| `/api/pipeline` | GET/POST/PATCH | Manage pipeline status |

---

## User Flows

### Upload Flow
1. User navigates to `/upload`
2. User drops PDF file
3. User enters: RCS number, Company name, Year end date
4. System uploads to Google Drive (`/01-Companies/{RCS}-{Name}/{Year}/`)
5. System creates company + financial_year records
6. User redirected to company list

### Extraction Flow
1. User views company with "Pending" extraction status
2. User clicks "Extract"
3. System downloads PDF from Google Drive
4. System sends to Document AI
5. System parses response into structured JSON
6. System stores in database
7. User reviews extraction data
8. User clicks "Approve for Analysis"

### Analysis Flow
1. User views approved extraction
2. User clicks "Analyze"
3. System sends extraction JSON to Claude (never PDF)
4. System stores analysis results
5. User views opportunities, risk score, recommendations

### Pipeline Flow
1. User views analysis with opportunities
2. User adds company to pipeline
3. User moves through stages: Identified → Contacted → Meeting → Proposal → Won/Lost
4. User adds notes and next actions

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| API keys in browser | All Google/Anthropic calls in API routes (server-side) |
| Unauthorized access | Supabase Auth with single user restriction |
| Service account exposure | Stored as env var, never in code |
| Data integrity | Hash verification before analysis |
| PDF data leakage | PDFs never sent to Claude, only structured JSON |
