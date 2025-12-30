# TP Opportunity Finder - Implementation Guide

## For Use With: VS Code + Claude Code + Opus 4.5

This guide provides step-by-step implementation instructions. Each phase includes prompts you can give to Claude Code to implement specific features.

---

## Pre-Implementation Setup (Manual Steps)

Complete these steps manually before starting implementation.

### Step 1: Google Cloud Setup

**1.1 Create Project**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name: `tp-opportunity-finder`
4. Click "Create"
5. Note your **Project ID**

**1.2 Enable Billing**
1. Navigation menu → Billing
2. Link a billing account

**1.3 Enable APIs**
1. Navigation menu → APIs & Services → Enable APIs
2. Search and enable:
   - "Cloud Document AI API"
   - "Google Drive API"

**1.4 Create Document AI Processor**
1. Navigation menu → Document AI
2. Click "Create Processor"
3. Select "Layout Parser"
4. Location: `eu` (for GDPR compliance)
5. Name: `luxembourg-accounts-parser`
6. Click "Create"
7. Note your **Processor ID** (shown in processor details)

**1.5 Create Service Account**
1. Navigation menu → IAM & Admin → Service Accounts
2. Click "Create Service Account"
3. Name: `tp-extractor`
4. Click "Create and Continue"
5. Add role: "Document AI API User"
6. Click "Done"
7. Click on the created service account
8. Go to "Keys" tab
9. Add Key → Create new key → JSON → Create
10. **Save the downloaded JSON file securely**
11. Note the **service account email** (e.g., `tp-extractor@project-id.iam.gserviceaccount.com`)

### Step 2: Google Drive Setup

**2.1 Create Folder Structure**
1. In Google Drive, create folder: `TP-Opportunity-Finder`
2. Inside it, create:
   - `00-Inbox`
   - `01-Companies`
   - `02-Reference`
   - `03-Archive`

**2.2 Share with Service Account**
1. Right-click `TP-Opportunity-Finder` folder
2. Share → Add service account email (from step 1.5)
3. Set permission: Editor
4. Click "Share"

**2.3 Get Folder IDs**
1. Open each folder in browser
2. Copy the ID from the URL: `https://drive.google.com/drive/folders/{FOLDER_ID}`
3. Note IDs for:
   - Root folder (`TP-Opportunity-Finder`)
   - Companies folder (`01-Companies`)

### Step 3: Supabase Setup (Reusing Existing Project)

**3.1 Use Existing Project**
1. Go to [supabase.com](https://supabase.com)
2. Open your existing TP Opportunity Finder project
3. You will migrate the schema to the new structure

**3.2 Note Existing Credentials**
From Project Settings → API (you likely have these already):
- **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
- **anon public key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
- **service_role key** (SUPABASE_SERVICE_ROLE_KEY) - keep secret!

**3.3 Backup Existing Data (Optional)**
If you want to preserve any existing data:
1. Go to SQL Editor
2. Run: `SELECT * FROM companies;` and export results
3. Repeat for any other tables you want to backup

**3.4 Drop Old Tables and Create New Schema**
Go to SQL Editor and run this migration script:

```sql
-- =====================================================
-- MIGRATION SCRIPT: Old TP Opp App → New Architecture
-- =====================================================

-- Step 1: Drop old tables (if they exist)
-- WARNING: This will delete all existing data!
DROP TABLE IF EXISTS opportunity_status CASCADE;
DROP TABLE IF EXISTS market_benchmarks CASCADE;
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS tp_assessments CASCADE;
DROP TABLE IF EXISTS ic_transactions CASCADE;
DROP TABLE IF EXISTS financial_data CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Step 2: Create new schema

-- Companies table
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

-- Financial years table (with schema versioning)
CREATE TABLE financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  year_end DATE NOT NULL,
  gdrive_folder_id TEXT,
  gdrive_pdf_file_id TEXT,
  gdrive_pdf_url TEXT,
  pdf_uploaded_at TIMESTAMPTZ,
  
  -- Extraction metadata
  extraction_status TEXT DEFAULT 'pending',
  extraction_data JSONB,
  extraction_confidence NUMERIC,
  extraction_warnings JSONB,
  extracted_at TIMESTAMPTZ,
  
  -- Schema versioning (CRITICAL for drift prevention)
  extraction_schema_version TEXT,           -- e.g., "1.0.0"
  
  -- Unit/scale validation (CRITICAL)
  unit_scale TEXT,                          -- 'UNITS', 'THOUSANDS', 'MILLIONS'
  unit_scale_validated BOOLEAN DEFAULT FALSE,
  
  -- Account classification
  account_type TEXT,                        -- 'full', 'abridged', 'abbreviated'
  company_size TEXT,                        -- 'small', 'medium', 'large'
  reporting_standard TEXT,                  -- 'LUX_GAAP', 'IFRS'
  
  -- Analysis status
  analysis_status TEXT DEFAULT 'pending',
  analysis_input_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year_end)
);

CREATE INDEX idx_financial_years_company ON financial_years(company_id);
CREATE INDEX idx_financial_years_status ON financial_years(extraction_status, analysis_status);

-- TP analyses table (enhanced with FAR analysis and Note 7ter)
CREATE TABLE tp_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year_id UUID REFERENCES financial_years(id) ON DELETE CASCADE,
  input_extraction_hash TEXT NOT NULL,
  account_type TEXT,
  company_size TEXT,
  analysis_limitations JSONB,
  company_classification TEXT,
  classification_reasoning TEXT,
  far_analysis JSONB,
  ic_financing_analysis JSONB,
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
  has_note_7ter_disclosures BOOLEAN DEFAULT FALSE,
  non_arms_length_transaction_count INTEGER DEFAULT 0,
  related_party_flags JSONB,
  opportunities JSONB,
  has_zero_spread BOOLEAN DEFAULT FALSE,
  has_thin_cap_risk BOOLEAN DEFAULT FALSE,
  has_unremunerated_guarantee BOOLEAN DEFAULT FALSE,
  has_undocumented_services BOOLEAN DEFAULT FALSE,
  has_substance_concerns BOOLEAN DEFAULT FALSE,
  has_related_party_issues BOOLEAN DEFAULT FALSE,
  risk_score INTEGER,
  priority_ranking TEXT,
  executive_summary TEXT,
  recommended_actions JSONB,
  documentation_gaps JSONB,
  suggested_benchmarking_studies JSONB,
  raw_analysis_response JSONB,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tp_analyses_financial_year ON tp_analyses(financial_year_id);
CREATE INDEX idx_tp_analyses_priority ON tp_analyses(priority_ranking, risk_score DESC);
CREATE INDEX idx_tp_analyses_related_party ON tp_analyses(has_related_party_issues) WHERE has_related_party_issues = TRUE;

-- IC transactions table (enhanced with maturity and eCDF codes)
CREATE TABLE ic_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year_id UUID REFERENCES financial_years(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  counterparty TEXT,
  counterparty_country TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'EUR',
  interest_rate TEXT,
  maturity TEXT,
  maturity_within_one_year NUMERIC,
  maturity_after_one_year NUMERIC,
  maturity_after_five_years NUMERIC,
  is_subordinated BOOLEAN DEFAULT FALSE,
  description TEXT,
  source_page INTEGER,
  source_note TEXT,
  source_text TEXT,
  ecdf_code TEXT,
  extraction_confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ic_transactions_financial_year ON ic_transactions(financial_year_id);
CREATE INDEX idx_ic_transactions_type ON ic_transactions(transaction_type);

-- Related party transactions table (Note 7ter - NEW)
CREATE TABLE related_party_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year_id UUID REFERENCES financial_years(id) ON DELETE CASCADE,
  nature TEXT NOT NULL,
  counterparty TEXT,
  relationship TEXT,
  amount NUMERIC,
  is_arms_length BOOLEAN DEFAULT TRUE,
  terms_description TEXT,
  source_page INTEGER,
  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_related_party_financial_year ON related_party_transactions(financial_year_id);
CREATE INDEX idx_related_party_arms_length ON related_party_transactions(is_arms_length) WHERE is_arms_length = FALSE;

-- Pipeline table
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

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE tp_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_pipeline ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single user app)
CREATE POLICY "Allow all for authenticated" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON financial_years FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON tp_analyses FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON ic_transactions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON opportunity_pipeline FOR ALL USING (true);

-- =====================================================
-- Migration complete!
-- =====================================================
```

**3.5 Verify Migration**
After running the script, verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected result:
- companies
- financial_years
- ic_transactions
- opportunity_pipeline
- tp_analyses

### Step 4: Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key
3. Note your **API key** (starts with `sk-ant-`)

### Step 5: Prepare Environment Variables

Create a text file with all your credentials ready to paste:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

GOOGLE_CLOUD_PROJECT_ID=tp-opportunity-finder
GOOGLE_CLOUD_LOCATION=eu
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=xxxxxxxxx

GDRIVE_ROOT_FOLDER_ID=xxxxx
GDRIVE_COMPANIES_FOLDER_ID=xxxxx

ANTHROPIC_API_KEY=sk-ant-xxxxx

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For `GOOGLE_APPLICATION_CREDENTIALS_JSON`:
- Open the downloaded service account JSON file
- Copy the entire contents
- Paste as a single line (remove line breaks)

---

## Phase 1: Project Initialization

### Prompt 1.1 — Initialize Next.js Project

```
Create a new Next.js 14 project with App Router for a TP Opportunity Finder application.

Requirements:
1. Use TypeScript
2. Use Tailwind CSS for styling
3. Use src/ directory structure
4. Create the following folder structure inside src/:
   - app/ (with page.tsx, layout.tsx, globals.css)
   - lib/ (empty for now)
   - components/ (empty for now)

5. Create these configuration files:
   - .env.example with placeholders for all environment variables (see list below)
   - .gitignore that includes:
     - .env*
     - !.env.example
     - node_modules/
     - .next/
     - credentials/
     - *.json (except package.json, tsconfig.json)

Environment variables needed (.env.example):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_CLOUD_PROJECT_ID
- GOOGLE_CLOUD_LOCATION
- GOOGLE_DOCUMENT_AI_PROCESSOR_ID
- GOOGLE_APPLICATION_CREDENTIALS_JSON
- GDRIVE_ROOT_FOLDER_ID
- GDRIVE_COMPANIES_FOLDER_ID
- ANTHROPIC_API_KEY
- NEXT_PUBLIC_APP_URL

6. Install these dependencies:
   - @supabase/supabase-js
   - @supabase/ssr
   - @google-cloud/documentai
   - googleapis
   - @anthropic-ai/sdk
   - crypto (built-in, no install needed)

7. Create a minimal home page at src/app/page.tsx that says "TP Opportunity Finder - Coming Soon"

Do not create any other pages or components yet.
```

### Prompt 1.2 — Create Type Definitions

```
Create TypeScript type definitions for the TP Opportunity Finder.

Create the following files in src/lib/types/:

1. extraction.ts - Types for Document AI extraction output:
   - ExtractionMetadata
   - ExtractedValue (with value, page, source, confidence)
   - CompanyProfile
   - ProfitAndLoss with current_year and prior_year
   - BalanceSheet with current_year and prior_year
   - ICTransaction
   - OffBalanceSheet
   - ExtractionFlags
   - StructuredExtraction (main type combining all above)

2. analysis.ts - Types for Claude analysis output:
   - TPOpportunity
   - TPAnalysisResult

3. database.ts - Types matching Supabase tables:
   - Company
   - FinancialYear
   - TPAnalysis
   - ICTransaction
   - OpportunityPipeline

4. api.ts - Types for API requests/responses:
   - UploadRequest / UploadResponse
   - ExtractRequest / ExtractResponse
   - AnalyzeRequest / AnalyzeResponse

Use the schemas defined in PROJECT_STRUCTURE.md as reference. Make sure all types are properly exported.
```

### Prompt 1.3 — Create Supabase Clients

```
Create Supabase client utilities for the TP Opportunity Finder.

Create these files in src/lib/supabase/:

1. client.ts - Browser client for client components
   - Use createBrowserClient from @supabase/ssr
   - Export a function that creates and returns the client

2. server.ts - Server client for API routes and server components
   - Use createServerClient from @supabase/ssr
   - Handle cookies properly for Next.js App Router
   - Export functions for creating server client

3. middleware.ts - Auth middleware helper
   - Create middleware for protecting routes
   - Handle session refresh

Make sure environment variables are properly typed and accessed.
Reference Next.js App Router patterns for Supabase integration.
```

### Prompt 1.4 — Create Google API Clients

```
Create Google API client utilities for Document AI and Google Drive.

Create these files in src/lib/google/:

1. auth.ts - Google authentication setup
   - Parse GOOGLE_APPLICATION_CREDENTIALS_JSON from environment variable
   - Create and export a function that returns authenticated Google auth client
   - Handle the JSON parsing safely with error handling

2. drive.ts - Google Drive operations
   - Function to find or create a folder by name within a parent
   - Function to upload a file (PDF) to a specific folder
   - Function to download a file by ID
   - Function to get file metadata
   - Function to generate a viewable URL for a file
   - All functions should use the auth from auth.ts

3. document-ai.ts - Document AI client
   - Create Document AI client using credentials
   - Function to process a PDF buffer and return raw extraction
   - Configure for the Layout Parser processor
   - Handle EU location setting

Include proper error handling and TypeScript types for all functions.
Environment variables needed:
- GOOGLE_CLOUD_PROJECT_ID
- GOOGLE_CLOUD_LOCATION  
- GOOGLE_DOCUMENT_AI_PROCESSOR_ID
- GOOGLE_APPLICATION_CREDENTIALS_JSON
- GDRIVE_ROOT_FOLDER_ID
- GDRIVE_COMPANIES_FOLDER_ID
```

### Prompt 1.5 — Create Connection Test Scripts

```
Create test scripts to verify all external service connections work.

Create these files in scripts/:

1. test-google-connection.ts
   - Test Google Drive: list files in root folder
   - Test Document AI: verify processor exists and is enabled
   - Print success/failure for each test
   - Use ts-node to run

2. test-supabase-connection.ts
   - Test database connection
   - Verify all tables exist (companies, financial_years, tp_analyses, ic_transactions, opportunity_pipeline)
   - Print success/failure
   - Use ts-node to run

Add scripts to package.json:
- "test:google": "ts-node scripts/test-google-connection.ts"
- "test:supabase": "ts-node scripts/test-supabase-connection.ts"
- "test:connections": "npm run test:google && npm run test:supabase"

Include clear console output showing what's being tested and results.
```

---

## Phase 2: Upload & Storage

### Prompt 2.1 — Create Base UI Components

```
Create base UI components for the TP Opportunity Finder using Tailwind CSS.

Create these files in src/components/ui/:

1. button.tsx - Button component
   - Variants: primary, secondary, danger, ghost
   - Sizes: sm, md, lg
   - Loading state with spinner
   - Disabled state

2. card.tsx - Card component  
   - Optional header, footer
   - Padding variants

3. input.tsx - Input component
   - Label support
   - Error state
   - Helper text

4. badge.tsx - Badge/tag component
   - Color variants: gray, green, yellow, red, blue
   - Size variants

5. table.tsx - Table components
   - Table, TableHeader, TableBody, TableRow, TableCell
   - Sortable header support

6. loading.tsx - Loading components
   - Spinner
   - Skeleton loader
   - Full page loading

Use a professional, minimal design aesthetic. Colors:
- Primary: blue-600
- Background: gray-50
- Card background: white
- Text: gray-900 (headings), gray-600 (body)
- Borders: gray-200

Export all components with proper TypeScript props.
```

### Prompt 2.2 — Create Layout Components

```
Create layout components for the TP Opportunity Finder.

Create these files in src/components/layout/:

1. header.tsx - Top navigation header
   - App logo/name: "TP Opportunity Finder"
   - Navigation links: Dashboard, Upload, Companies, Pipeline
   - Use Next.js Link component

2. sidebar.tsx - Side navigation (optional, can be combined with header)
   - Same navigation as header
   - Active state highlighting

3. page-container.tsx - Page wrapper component
   - Consistent padding and max-width
   - Page title prop
   - Optional action buttons slot

Update src/app/layout.tsx to include:
- Header component
- Main content area with proper padding
- Consistent page structure

Create a simple but professional layout suitable for a business application.
```

### Prompt 2.3 — Create Upload Page

```
Create the PDF upload page for the TP Opportunity Finder.

Create/update these files:

1. src/components/upload/pdf-uploader.tsx
   - Drag and drop zone for PDF files
   - Click to browse support
   - File type validation (PDF only)
   - File size display
   - Preview of selected file name
   - Remove file button

2. src/components/upload/upload-form.tsx
   - Form fields:
     - RCS Number (text input, required, format validation: B followed by 5-6 digits)
     - Company Name (text input, required)
     - Year End Date (date input, required)
   - Combines with PDFUploader
   - Submit button with loading state
   - Form validation before submit

3. src/app/upload/page.tsx
   - Page title: "Upload Annual Accounts"
   - Include UploadForm component
   - Success message after upload with link to company
   - Error handling display

The form should POST to /api/upload with:
- file: PDF file
- rcsNumber: string
- companyName: string
- yearEnd: string (YYYY-MM-DD)

Use react-hook-form for form handling if helpful, or plain React state.
```

### Prompt 2.4 — Create Upload API Route

```
Create the upload API route that stores PDFs in Google Drive and creates database records.

Create src/app/api/upload/route.ts with:

POST handler that:
1. Receives multipart form data (file, rcsNumber, companyName, yearEnd)
2. Validates inputs:
   - File is PDF
   - RCS number format is valid
   - Year end is valid date
3. Creates company folder in Google Drive if not exists:
   - Folder name: "{rcsNumber}-{companyName}"
   - Parent: GDRIVE_COMPANIES_FOLDER_ID
4. Creates year folder inside company folder:
   - Folder name: "{yearEnd}" (YYYY-MM-DD)
5. Uploads PDF to year folder:
   - File name: "annual-accounts.pdf"
6. Creates/updates company record in Supabase:
   - Upsert by rcs_number
   - Store gdrive_folder_id
7. Creates financial_year record in Supabase:
   - Links to company
   - Stores gdrive_folder_id, gdrive_pdf_file_id, gdrive_pdf_url
   - Sets extraction_status: 'pending'
8. Returns success with company ID and financial year ID

Include proper error handling:
- Return appropriate HTTP status codes
- Return descriptive error messages
- Log errors for debugging

Use the Google Drive utilities from src/lib/google/drive.ts.
```

### Prompt 2.5 — Create Companies List Page

```
Create the companies list page showing all uploaded companies.

Create/update these files:

1. src/components/companies/company-card.tsx
   - Display company name and RCS number
   - Show number of financial years uploaded
   - Show latest extraction status (badge)
   - Show latest analysis status (badge)
   - Link to company detail page
   - Link to Google Drive folder (external link icon)

2. src/components/companies/company-list.tsx
   - Grid or list view of CompanyCard components
   - Empty state when no companies
   - Loading state

3. src/components/companies/company-status-badge.tsx
   - Status badge component
   - Colors: pending (gray), processing (yellow), completed (green), failed (red)

4. src/app/companies/page.tsx
   - Page title: "Companies"
   - Fetch companies from Supabase with their financial years
   - Include count of total companies
   - "Upload New" button linking to /upload
   - Display CompanyList

Query should join companies with financial_years to get status information.
Order by most recently updated.
```

---

## Phase 3: Extraction Layer

### Prompt 3.1 — Create Luxembourg GAAP Parser

```
Create the Luxembourg GAAP parser that transforms Document AI output into structured extraction.

IMPORTANT: This parser must be Luxembourg GAAP-aware, using official eCDF/PCN codes, handling different company sizes, and capturing FULL statutory statements.

CRITICAL PRINCIPLES:
1. Capture UNIT/SCALE first - catastrophic errors if wrong (thousands vs units)
2. Store FULL statements as canonical line items, derive KPIs from them
3. Model "missing vs zero vs not disclosed" explicitly for every field
4. Compute metrics DETERMINISTICALLY here, NOT in AI layer
5. Map captions to eCDF codes with confidence scoring - PDFs often don't show codes
6. Enforce pre-analysis gates before allowing analysis to proceed

PCN CODE DOMINANCE (CRITICAL):
- Layout Parser struggles with labels (PwC vs Deloitte templates differ)
- Luxembourg filings have a "Reference" column with 4-digit PCN/eCDF codes
- ALWAYS prioritize extracting from the Reference column first
- These codes are UNIVERSAL across all filings - most reliable anchors
- Fall back to caption matching only when Reference column not present

TP HIGH-PRIORITY EXTRACTION FIELDS:
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

Create these files in src/lib/parser/:

1. index.ts - Main parser entry point
   - FIRST: Call detectUnitScale() - block if uncertain
   - Detect reporting standard (Lux GAAP vs IFRS)
   - Detect if Reference column with PCN codes exists
   - Determine company size from thresholds
   - Build canonical statements using PCN codes from Reference column (priority) or caption matcher
   - Extract and link note data to balance sheet items (hierarchical schema)
   - Compute deterministic metrics
   - Detect SOPARFI/substance risk patterns
   - Evaluate pre-analysis gates
   - Assemble final StructuredExtraction object

2. code-dictionary.ts - CRITICAL
   - Versioned dictionary of Lux GAAP line items
   - Include ALL TP-priority PCN codes (see table above)
   - Map FR/DE/EN captions to codes
   - Export: CODE_DICTIONARY_VERSION

3. reference-column-extractor.ts - NEW (CRITICAL)
   - Detect if filing has Reference column with PCN codes
   - Extract codes directly from Reference column (4-digit numbers)
   - Map each code to its line item value
   - This is the MOST RELIABLE extraction method
   - Return: { has_reference_column, extracted_codes[] }

4. caption-matcher.ts
   - FALLBACK: Only use when Reference column not present
   - Fuzzy matching with confidence scoring
   - Track match_source: 'reference_column' vs 'caption_match'

5. unit-scale.ts - CRITICAL
   - Detect presentation scale: UNITS, THOUSANDS, MILLIONS
   - Cross-validate magnitudes make sense
   - If confidence < 0.8, flag unit_scale_uncertain = true
   
   MANDATORY: unit_scale_reconciliation() function
   - Compare totals across different sections of the PDF
   - Example: If summary table shows "4,532,321" and statutory eCDF table 
     shows "4,532,321,258.08", then summary is in thousands
   - Multiply summary values by 1,000 and check if they approximate statutory values
   - Cross-check BEFORE passing data to database
   - Add to ValidationDashboard.unit_scale_reconciliation object

6. numeric-parser.ts
   - Decimal comma/dot, negative parentheses
   - Store raw_numeric_string for audit

7. company-profile.ts
   - Extract company info, determine size
   - Detect SOPARFI indicators (high financial assets, low operations)
   - Extract average_employees and its source

8. canonical-statements.ts
   - Build CanonicalStatement with hierarchical linked schema
   
   PCN CODE AS PRIMARY KEY:
   - If valid PCN code found in Reference column, IGNORE the row caption
   - Captions stored as caption_metadata only for human review
   - JSON key: "pcn_1171" not "affiliated_undertakings"
   - This eliminates translation errors and fuzzy matching hallucinations
   
   - Priority: Reference column PCN codes
   - Each line item embeds its linked_note_data directly

9. note-linker.ts - CRITICAL (Semantic Anchoring)
   - When note_link is found on a line item, TRIGGER targeted extraction
   - Do NOT wait - immediately extract that specific note's content
   - Example: PCN 1171 has note_link="Note 5" → extract Note 5 immediately
   - Extract: breakdown tables, counterparty details, maturity analysis
   - Build LinkedNoteData and embed in CanonicalLineItem
   - This gives the TP detail (corporate services, accrued interest, cash pooling)
     not just the balance sheet total

10. balance-sheet.ts / profit-loss.ts
    - Build KPI views from canonical lines
    - VALIDATE: KPI values = sum of canonical lines

11. notes.ts - Parse all notes (structured + raw)

12. accounting-policies.ts - Extract valuation methods

13. tax-note.ts - Extract tax data

14. management-report.ts
    - Extract for FAR analysis
    - Build QualitativeFARContext with KEYWORD SCORING:
    
    TP TRIGGER KEYWORDS (scan for these):
    - IP: patents, licenses, royalties, intellectual property, brevets
    - Services: management fees, service fees, frais de gestion
    - Financing: loans, interest, guarantees, cash pooling, treasury
    - R&D: research, development, innovation
    - Corporate purpose: creation, acquisition, holding, exploitation
    
    - Score each keyword: category, count, sentences found, tp_relevance
    - Extract sentences containing triggers as tp_relevant_sentences array
    - Extract corporate_purpose_text from Note 1
    - Store as qualitative_context string for Claude
    - This gives Claude the "story" without reading 30+ page PDF

15. related-parties.ts
    - CRITICAL: "No Note 7ter" ≠ "No IC transactions"
    - Extract disclosure scope limitations

16. counterparty-normalizer.ts
    - Normalize names, classify IC economic nature

17. substance-indicators.ts - CRITICAL
    - Detect SOPARFI/Intermediary Financing patterns
    - Check Circular 56/1 compliance concerns:
      * High IC debt (code 4279) + zero/low staff costs = Substance Risk
      * High financial assets (code 1151) + no employees = Holding with substance concern
      * Domiciliation/management company administration
    - Flag substance_risk opportunities

18. deterministic-metrics.ts
    - Compute ALL metrics here, NOT in Claude
    - Track metrics_not_calculable with reasons
    - CRITICAL: Compute yoy_analysis for trend detection:
      * Turnover change %
      * Margin shifts (flag if >5pp change)
      * IC debt spikes (flag if >50% increase)
      * Staff cost changes (flag reductions)
      * Interest rate changes (flag if >50bps)
    - Flag significant volatility for TP relevance

19. pre-analysis-gates.ts - CRITICAL (Prevents Endless Review)
    
    Compute READINESS LEVEL from all gates:
    
    ```typescript
    function computeReadinessLevel(gates): AnalysisReadinessLevel {
      // BLOCKED if any MUST-PASS fails
      if (!gates.unit_scale_validated || !gates.balance_sheet_balances) {
        return 'BLOCKED';
      }
      if (gates.consolidation_gate.analysis_mode === 'blocked') {
        return 'BLOCKED';
      }
      if (gates.consolidation_gate.analysis_mode === 'pending_resolution') {
        return 'BLOCKED';  // Must resolve consolidation first
      }
      
      // MATERIALITY-BASED MAPPING GATE (prevents review inflation)
      // Only block/force review if TP-critical codes are affected
      const criticalCodesAffected = gates.mapping_gate_details.tp_critical_codes_affected;
      const highConfPct = gates.mapping_gate_details.high_confidence_pct;
      
      // READY_FULL if high confidence OR only non-critical codes affected
      if (highConfPct >= 80) {
        return 'READY_FULL';
      }
      if (highConfPct >= 60 && !criticalCodesAffected) {
        // Non-critical codes low confidence - allow LIMITED with warning
        return 'READY_LIMITED';
      }
      
      // READY_LIMITED if medium confidence on critical codes
      if (highConfPct >= 60) {
        return 'READY_LIMITED';
      }
      
      // BLOCKED if confidence too low on critical codes
      return 'BLOCKED';
    }
    ```
    
    MATERIALITY-BASED REVIEW:
    - Check if low-confidence mappings touch TP_CRITICAL_PCN_CODES
    - If only non-critical codes affected: allow READY_LIMITED with warning
    - If critical codes affected: force review only for those codes
    - This prevents review inflation while protecting correctness
    
    Compute MODULE TRUST LEVELS:
    - Module A (Anchors): Based on BS/PL extraction confidence + metrics calculable
    - Module B (Context): Based on notes extraction + IC transaction confidence
    - Module C (Narrative): Based on management report extraction
    
    Compute LIMITED MODE RULES (if READY_LIMITED):
    - allowed_opportunity_types: IC financing, substance, thin cap
    - disallowed_opportunity_types: Operating PLIs, service fee erosion, cost-plus
    - reason_for_limitations: List what's missing/low-confidence
    
    Generate BOUNDED REVIEW ACTIONS (max 5-10):
    - Only show blocking issues
    - Only show lowest 5-10 confidence mappings ON TP-CRITICAL CODES
    - Only show scale detection evidence
    - Each action is a constrained operation:
      * "confirm_unit_scale" - yes/no
      * "confirm_mapping" - accept/reject suggested code
      * "confirm_consolidation" - ONE-STEP: standalone/consolidated (stored, never asked again)
      * "fix_arithmetic" - accept suggested fix

20. template-fingerprint.ts - NEW (with TRUST BUT VERIFY)
    - Compute template_fingerprint_hash from:
      * Layout signature (table structures, headers)
      * Language detected
      * Audit firm template (if identifiable)
    - Check against previously-approved fingerprints
    
    FINGERPRINT GOVERNANCE (prevents systematic error propagation):
    - Approved fingerprints have expiry_date (12 months)
    - Track dictionary_version_at_approval
    - If dictionary_version changes: set requires_revalidation = true
    - Support revocation with reason
    
    TRUST BUT VERIFY (spot-checking):
    ```typescript
    function shouldSpotCheck(fingerprint): boolean {
      const rate = fingerprint.spot_check_config.spot_check_rate;  // e.g., 0.05
      const uploadsSinceLastCheck = fingerprint.spot_check_config.uploads_since_last_spot_check;
      
      // Spot check every 1 in 20 uploads (5%)
      if (Math.random() < rate) return true;
      
      // Also spot check if too many uploads since last check
      if (uploadsSinceLastCheck > 100) return true;
      
      return false;
    }
    
    function handleSpotCheckResult(fingerprint, passed: boolean): void {
      if (!passed) {
        fingerprint.spot_check_config.spot_check_failures++;
        
        // Auto-revoke if too many failures
        if (fingerprint.spot_check_config.spot_check_failures >= 
            fingerprint.spot_check_config.auto_revoke_threshold) {
          fingerprint.revoked = true;
          fingerprint.revocation_reason = 'Auto-revoked: exceeded spot check failure threshold';
        }
      }
    }
    ```
    
    ```typescript
    function shouldApplyFingerprintBoost(fingerprint): boolean {
      if (!fingerprint.previously_approved) return false;
      if (fingerprint.revoked) return false;
      if (fingerprint.requires_revalidation) return false;
      if (new Date() > new Date(fingerprint.expiry_date)) return false;
      if (fingerprint.dictionary_version_at_approval !== CURRENT_DICTIONARY_VERSION) {
        return false;  // Dictionary changed, need revalidation
      }
      return true;
    }
    ```

21. validation-dashboard.ts
    - Build ValidationDashboard for user review interface
    - Generate inconsistency flags:
      * "Total Assets in Note 4 does not match Balance Sheet Line 109"
    - Generate substance warnings:
      * "Large entity detected, but Staff Cost Note is empty"
    - Generate completeness issues:
      * "Note 7ter not found - required for large entity"
    - Generate volatility alerts:
      * "IC debt increased 150% YoY - potential TP opportunity"
      * "Operating margin dropped 8pp YoY - investigate cost allocation"
    - Generate consolidation alerts if applicable

22. consolidation-detector.ts
    - Detect Consolidated (Group) vs Standalone (Annual) accounts
    - Look for indicators:
      * Title: "Comptes Annuels" vs "Comptes Consolidés"
      * Consolidation note presence
      * Subsidiary accounting policy
    - TP implications:
      * Hidden IP/management fees visible in standalone
      * IC eliminations in consolidated
    - Set is_consolidated and consolidation_source in metadata
    - CRITICAL: Derive analysis_mode for consolidation_gate

23. reconciliation-transformer.ts - NEW
    - Single deterministic transformer: JSON → normalized DB tables
    - Generate record_id (hash of key fields) for each IC/related party transaction
    - Generate record_fingerprint (hash of all fields)
    - Validate round-trip equality before marking approved
    - Prevent JSON ↔ tables drift

24. validators.ts
    - All validation checks
    - IC Alignment: Check if Interest Income exists alongside IC Receivables

LANGUAGE NORMALIZATION:
- If source is FR/DE, map labels to English TP standard terms
- Keep original PCN code as immutable key
- Store caption_original (FR/DE/EN) and caption_normalized (English)

THREE-MODULE OUTPUT STRUCTURE:
Ensure the JSON is conceptually organized as:
- MODULE A (Anchors): canonical_balance_sheet, canonical_profit_loss, deterministic_metrics
- MODULE B (Context): extracted_notes, ic_transactions_from_notes, related_party_transactions
- MODULE C (Story): management_report, far_context, qualitative_context

Reference PROJECT_STRUCTURE.md for full type definitions.
```

### Prompt 3.1.1 — Golden Corpus Regression Strategy (CRITICAL)

```
To prevent review creep and ensure dictionary/mapping updates don't degrade quality:

1. GOLDEN CORPUS MAINTENANCE
   Location: tests/golden-corpus/
   
   Maintain a set of 20-30 representative Luxembourg filings:
   - 10 full accounts (FR, DE, EN)
   - 10 abridged accounts (FR, DE, EN)
   - 5 scanned PDFs (test OCR handling)
   - 5 uncommon templates (private equity, funds, etc.)
   
   Each corpus file has:
   - Original PDF
   - Expected extraction JSON (approved)
   - Expected gate outcomes
   - Expected metrics

2. REGRESSION TEST REQUIREMENTS
   Before ANY dictionary or mapping rule update:
   - Run extraction against full corpus
   - Report deltas in:
     * Mapping confidence (any drops?)
     * Gates passed (any new failures?)
     * Metrics computed (any changes?)
   - Block merge if:
     * Any previously-passing gate now fails
     * Average mapping confidence drops >5%
     * Any high-confidence mapping becomes low-confidence

3. TEMPLATE FINGERPRINT CACHING
   When extraction completes with high confidence:
   - Compute template_fingerprint (hash of layout + language + audit firm)
   - Store in database with approval status
   
   On subsequent uploads:
   - If fingerprint matches previously-approved template:
     * Auto-boost mapping confidence by 10%
     * Skip review if boosted confidence ≥ 80%
   - If fingerprint is new:
     * Normal confidence calculation
     * May require review based on gates

4. DICTIONARY GOVERNANCE
   Location: src/lib/parser/data/code-dictionary.json
   
   - Versioned (increment on every change)
   - Changes require:
     * Regression test pass
     * Changelog entry
     * Review by TP domain expert (for semantic changes)
   - Include:
     * All PCN/eCDF codes
     * FR/DE/EN captions
     * Known synonyms
     * PwC/Deloitte/EY/KPMG template variations
```

### Prompt 3.2 — Create Extract API Route

```
Create the extraction API route that processes PDFs through Document AI.

Create src/app/api/extract/route.ts with:

POST handler that:
1. Receives: { financialYearId: string }
2. Validates financial year exists and has PDF uploaded
3. Updates extraction_status to 'processing'
4. Downloads PDF from Google Drive using gdrive_pdf_file_id
5. Sends PDF to Document AI Layout Parser
6. Parses response using Luxembourg GAAP parser (returns StructuredExtraction)
7. Evaluates pre-analysis gates:
   - Check pre_analysis_gates.can_proceed_to_analysis
   - If MUST-PASS gates fail: set analysis_status to 'blocked'
   - If only warnings: set analysis_status to 'ready_with_warnings'
   - If all pass: set analysis_status to 'ready'
8. Stores extraction results:
   - extraction_data: full StructuredExtraction JSON (validated against schema)
   - extraction_schema_version: from extraction metadata
   - unit_scale: from extraction metadata
   - unit_scale_validated: from pre_analysis_gates
   - account_type: from extraction metadata
   - company_size: from extraction metadata
   - reporting_standard: from extraction metadata
   - extraction_confidence: overall confidence score
   - extraction_warnings: validation warnings + gate warnings
   - extracted_at: timestamp
   - extraction_status: 'completed' or 'failed'
9. Stores IC transactions in ic_transactions table
10. Stores related party transactions in related_party_transactions table
11. Creates analysis_input_hash from extraction_data (for integrity check)
12. Returns extraction summary with gate status

Response should include:
- extraction_id
- status
- pre_analysis_gates summary (blocking_issues, warning_issues)
- can_proceed_to_analysis
- requires_human_review (if true, explain why)

Error handling:
- If Document AI fails, set status to 'failed' with error in warnings
- If parsing fails, store raw response and set status to 'failed'
- If MUST-PASS gates fail, extraction succeeds but analysis is blocked
- Return appropriate error responses

CRITICAL: This route only does extraction. It does NOT call Claude API.
The extraction_data JSON is what will be sent to Claude in the analyze route.
JSON schema validation should reject invalid payloads to prevent drift.
```

### Prompt 3.3 — Create Extraction Viewer Components

```
Create components to display and review extracted data with eCDF code references.

CRITICAL: The extraction-viewer must stop the "endless review cycle" by showing 
the user WHY the system is confident (or not) and allowing quick fixes.

Create these files in src/components/extraction/:

1. extraction-viewer.tsx
   - Main component that displays full extraction
   - Tabs or sections for:
     * Company Profile (with size badge)
     * Balance Sheet (with eCDF codes)
     * P&L (with abridged flag if applicable)
     * IC Transactions
     * Related Party Transactions (Note 7ter)
     * Ownership Structure
     * Management Report Summary
     * Validation Results
     * VALIDATION DASHBOARD (prominent display)
   - Shows extraction confidence score
   - Shows account type badge (Full/Abridged)
   - "Approve for Analysis" button (only if extraction completed AND gates pass)

2. validation-dashboard.tsx - NEW (CRITICAL for human approval)
   - PROMINENT display of all validation flags
   - Color-coded sections:
     * RED: Blocking issues (must fix before analysis)
     * YELLOW: Warnings (can proceed but note)
     * GREEN: All checks passed
   
   - ARITHMETIC ERRORS section:
     * Display each error with: location, expected total, calculated sum, difference
     * Example: "Note 4.1 Participations breakdown (€1,234,567) ≠ BS PCN 1137 (€1,234,890)"
     * INLINE EDIT: Allow user to fix single number directly in UI
     * "Accept suggested fix" button for obvious rounding errors
   
   - SCALE VALIDATION section:
     * Show unit_scale_reconciliation results
     * Display: sections compared, reconciliation passed/failed
     * If failed: show discrepancy factor (e.g., "Summary appears to be in thousands")
   
   - COMPLETENESS section:
     * Missing required disclosures for company size
     * Note 7ter status (found/not found/exempt)
   
   - YoY VOLATILITY ALERTS:
     * Margin shifts, IC debt spikes, staff reductions
     * Each with TP relevance explanation

3. balance-sheet-table.tsx
   - Table showing extracted balance sheet
   - Columns: eCDF Code, Line Item, Current Year, Prior Year, Note Ref, Page
   - Highlight IC-related items (codes 1171, 1279, 4279)
   - Show maturity breakdown for debt items
   - Show null values as "Not found" with warning icon
   - Expandable rows to show linked Note content
   - INLINE HIGHLIGHT: Cells that failed validation checks (red border)

4. pnl-table.tsx
   - Table showing extracted P&L
   - Show "ABRIDGED" banner if is_abridged_pnl is true
   - Explain what data is hidden in Gross Result for abridged
   - Columns: eCDF Code, Line Item, Current Year, Prior Year, Note Ref, Page
   - Highlight IC revenue/expense items
   - Show staff costs breakdown if available

5. ic-transactions-table.tsx
   - Table of extracted IC transactions
   - Columns: Type, Counterparty, Country, Amount, Rate, Maturity, Page, Note
   - Group by transaction type
   - Show maturity splits (within 1yr, after 1yr, after 5yr)
   - Show subordination status
   - Show source text on hover/expand

6. related-party-section.tsx
   - Display Note 7ter related party transactions
   - HIGHLIGHT transactions "not at arm's length"
   - Show relationship type and counterparty
   - Red flag for any non-arm's-length transactions

7. ownership-structure.tsx
   - Visual display of group structure
   - Show immediate parent → company → subsidiaries
   - Display ownership percentages
   - Show countries with flag icons

8. management-report-summary.tsx
   - Display key extracted elements from Management Report
   - Sections: Business Description, Principal Risks, R&D Activities
   - Collapsible full text view

9. source-reference.tsx
   - Small component showing page and eCDF code reference
   - Tooltip with source details and Note content
   - Clickable to open PDF in Google Drive

10. extraction-warnings.tsx
    - Display validation warnings and flags
    - Color-coded by severity:
      * Red: Arithmetic errors, missing mandatory disclosures
      * Yellow: Low confidence items, potential data quality issues
      * Blue: Informational (abridged accounts, etc.)
    - Explain what each warning means for TP analysis

11. validation-summary.tsx
    - Summary card showing all validation checks
    - Green check / Red X for each:
      * Balance sheet balances
      * Note totals match BS/PL
      * IC consistency
      * Mandatory disclosures present
    - Overall "Ready for Analysis" indicator

Design should allow user to verify extraction accuracy before proceeding to analysis.
Show eCDF codes to allow cross-reference with official filings.
```

### Prompt 3.4 — Create Extraction Review Page

```
Create the extraction review page where users verify and approve extractions.

Create src/app/extraction/[id]/page.tsx that:

1. Fetches financial year by ID with:
   - Company information
   - Extraction data
   - Extraction status and warnings

2. Shows different states:
   - If extraction_status is 'pending': Show "Extract" button
   - If extraction_status is 'processing': Show loading spinner
   - If extraction_status is 'completed': Show ExtractionViewer
   - If extraction_status is 'failed': Show error and retry button

3. For completed extractions:
   - Display full ExtractionViewer component
   - Show link to PDF in Google Drive
   - Show "Approve for Analysis" button
   - Show "Re-extract" button if needed

4. "Approve for Analysis" action:
   - Confirms extraction is verified
   - Enables the Analyze button
   - Could update a field in database or just check extraction_status = 'completed'

5. Link to Google Drive PDF opens in new tab

Include proper loading states and error handling.
```

---

## Phase 4: Analysis Layer

### Prompt 4.1 — Create Claude Analysis Client

```
Create the Claude API client and TP analysis prompts leveraging the enhanced Luxembourg GAAP extraction.

CRITICAL PRINCIPLE: Claude receives PRE-COMPUTED deterministic metrics. Claude must NEVER recalculate arithmetic - it uses the metrics provided and cites data_references for every conclusion.

Create these files in src/lib/analysis/:

1. client.ts
   - Initialize Anthropic client with API key
   - Export function to call Claude with messages
   - Handle rate limiting and errors

2. prompts.ts
   - Export function: buildTPAnalysisPrompt(extractionData: StructuredExtraction) => string
   
   The prompt should:
   - CRITICAL: Only include the structured extraction JSON, never PDF content
   - Include account_type, company_size, unit_scale from metadata
   - Include consolidation_gate from pre_analysis_gates
   - Sanitize data to include:
     * company_profile (with size determination)
     * canonical_balance_sheet (full line items with status)
     * canonical_profit_loss (full line items with status)
     * deterministic_metrics (PRE-COMPUTED - Claude uses these, doesn't recalculate)
     * ic_transactions_from_notes
     * related_party_transactions (Note 7ter) - PRIORITY
     * related_party_disclosure_scope (disclosure limitations)
     * ownership_structure
     * management_report (for FAR analysis)
     * extraction_flags (including ic_disclosure_limitation)
     * validation_results
   
   - CRITICAL INSTRUCTIONS FOR CLAUDE:
     
     A. DATA USAGE RULES:
        - USE the deterministic_metrics provided - DO NOT recalculate
        - If a metric is null or flagged incomplete, output "insufficient data"
        - NEVER estimate or infer missing amounts
        - CITE data_references (lux_code, page, note_ref) for every conclusion
        - Respect status fields: 'not_disclosed' ≠ 'zero'
     
     A2. CALCULABLE-ONLY METRICS (CRITICAL):
        - Check *_calculable boolean for each metric before using
        - If operating_profit_calculable = false:
          * Opportunities relying on operating PLIs must return "inconclusive"
          * List the missing_inputs from metrics_not_calculable
        - If ebitda_calculable = false, do not cite EBITDA-based conclusions
        - NEVER derive a metric that the extraction flagged as not calculable
     
     A3. CONSOLIDATION AWARENESS (CRITICAL):
        - Check consolidation_gate.analysis_mode FIRST
        - If analysis_mode = 'group_level_only':
          * IC transactions may be eliminated - note this limitation
          * DO NOT make entity-level TP conclusions
          * Focus on group-level indicators only
        - If analysis_mode = 'blocked':
          * Return "Analysis not available for consolidated accounts at entity level"
        - If analysis_mode = 'entity_level':
          * Full TP analysis allowed
     
     A4. ANALYSIS READINESS LEVEL (CRITICAL):
        - Check readiness_level FIRST before generating opportunities
        
        If readiness_level = 'READY_FULL':
          * All opportunity types allowed
          * Full analysis scope
        
        If readiness_level = 'READY_LIMITED':
          * Check limited_mode_rules.allowed_opportunity_types
          * ONLY generate opportunities from allowed list
          * Check module_trust_levels for each module before using
          
          ALLOWED in LIMITED mode (if high-confidence):
          - IC financing spread checks
          - Substance flags (employees, staff costs)
          - Thin cap ratio
          - Zero-spread detection
          
          DISALLOWED in LIMITED mode:
          - Operating PLIs / margin-based opportunities
          - Service fee base erosion analysis
          - Cost-plus benchmarking
          - Opportunities requiring abridged P&L lines
          - Note-based opportunities if module_b trust_level = 'low'
          
          * Label output as "Limited Analysis - see scope_limitations"
        
        If readiness_level = 'BLOCKED':
          * DO NOT generate any opportunities
          * Return "Analysis blocked - see blocking_issues"
     
     B. FUNCTIONAL ANALYSIS (using management_report):
        - Classify company type (operational, holding, financing, IP holding, mixed)
        - Identify functions performed (based on activity description)
        - Assess substance indicators (employees, office, local management)
     
     C. ASSET ANALYSIS (using canonical_balance_sheet):
        - Identify key assets owned/used
        - USE asset_intensity_ratio from deterministic_metrics
     
     D. RISK ANALYSIS (using management_report.principal_risks):
        - Identify risks borne by the company
        - Assess financial vs operational risks
     
     E. IC TRANSACTION ANALYSIS:
        - For IC FINANCING:
          * USE implied_lending_rate and implied_borrowing_rate from deterministic_metrics
          * USE ic_spread_bps from deterministic_metrics
          * Flag zero-spread if ic_spread_bps < 10
          * Analyze maturity structure
          * Compare to benchmark (25-75 bps)
          * If metrics are null, explain why (e.g., "IC loans without IC interest")
        
        - For IC SERVICES:
          * Identify service fee arrangements
          * Flag undocumented fees
        
        - For GUARANTEES:
          * Identify unremunerated guarantees
     
     F. RELATED PARTY ANALYSIS - NOTE 7ter SEMANTIC ENFORCEMENT (CRITICAL):
        - CRITICAL: Check related_party_disclosure_scope first
        - If limitation_applied = true, note that absence of data ≠ no IC transactions
        
        NOTE 7ter INTERPRETATION (MUST FOLLOW):
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Note 7ter ONLY discloses transactions NOT concluded under normal market conditions.
        
        "No Note 7ter entries" means ONE of:
        - All IC transactions ARE at arm's length (good)
        - Company is exempt from disclosure (check size)
        - Disclosure is incomplete (check disclosure_scope)
        
        NEVER conclude: "No 7ter entries = all IC is arm's length confirmed"
        This is a LOGICAL FALLACY and must be avoided.
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        - Flag any Note 7ter transactions marked is_arms_length = false
        - These are PRE-IDENTIFIED TP issues requiring immediate attention
     
     G. LEVERAGE ANALYSIS:
        - USE debt_equity_ratio from deterministic_metrics
        - USE total_interest_bearing_debt from deterministic_metrics
        - Check debt_capture_complete flag - if false, note incomplete debt data
        - Flag thin cap if ratio > 85%
     
     H. COMPLIANCE RISK SCORING:
        - Score 1-100 based on weighted factors:
          * IC position size (from metrics)
          * Zero-spread flag (ic_spread_bps < 10)
          * Thin cap flag (debt_equity_ratio > 85%)
          * Note 7ter issues (non_arms_length_transactions > 0)
          * Substance concerns
          * Data quality issues (from extraction_flags)
     
     I. ACCOUNT TYPE AWARENESS - CRITICAL FOR ABRIDGED:
        - Check account_type from metadata
        - If 'abridged' OR is_abridged_pnl = true:
          
          DO NOT CALCULATE:
          * Net Margin (turnover is hidden in Gross Result)
          * COGS-based metrics
          * Operating margin using Gross Result as proxy (technically incorrect for TP)
          
          INSTEAD FOCUS ON:
          * Balance Sheet substance analysis
          * Intercompany financing spreads (these ARE calculable)
          * Debt/equity ratios
          * IC position analysis
          * Substance indicators
          
          * Check which canonical lines have status='aggregated'
          * Flag that full accounts would reveal more
          * Note: "Gross Result cannot be used as proxy for Turnover in TP benchmarking"
     
     J. YEAR-ON-YEAR TREND ANALYSIS:
        - USE yoy_analysis from deterministic_metrics
        - Flag significant volatility:
          * Margin erosion >5pp → investigate cost allocation
          * IC debt spike >50% → potential financing restructure
          * Staff reduction → substance erosion concern
          * Interest rate changes >50bps → market benchmark shift
        - Note: TP opportunities are rarely found in a single year
        - Reference both CY and PY values when citing trends
     
     K. OUTPUT REQUIREMENTS - CRITICAL PCN CITATION RULE:
        - EVERY identified opportunity MUST cite specific PCN codes
        - Format: "Based on PCN 1171 (IC Receivables: €X) and PCN 6311 (IC Interest: €Y)..."
        - Include page numbers from extraction data
        - Include regulatory_reference (e.g., "Art. 56bis LIR", "Circular 56/1")
        - Include affected_amount from extraction data
        - If an opportunity cannot be supported by specific PCN codes, do NOT include it
        - Executive summary must cite key metrics and PCN codes used
        - If validation_results.all_checks_passed = false, note data quality concerns
        
     L. AUDIT TRAIL REQUIREMENT:
        - For TP documentation purposes, every conclusion must be verifiable
        - Claude's output must allow a human to trace back to:
          * Specific PCN code in the accounts
          * Specific note number (e.g., Note 7ter, Note 20)
          * Page number in source document
        - This enables instant verification by TP professionals
   
   - Request structured JSON response matching TPAnalysisResult type

3. response-parser.ts
   - Parse Claude's response into TPAnalysisResult
   - Handle cases where Claude doesn't return valid JSON
   - VALIDATE: Every opportunity has PCN code citations
   - Validate that data_references are present and formatted correctly
   - Map Claude's FAR analysis to structured format
   - Reject responses without proper citations

4. opportunity-gate.ts - NEW (CRITICAL: Mechanical Enforcement)
   - READY_LIMITED is a HARD PRODUCT MODE, not a soft warning
   - Opportunity generation MECHANICALLY depends on:
     * readiness_level
     * *_calculable flags from DeterministicMetrics
     * module_trust_levels
     * abridged/aggregated status
   
   ```typescript
   // This is CODE-LEVEL enforcement, not prompt-level
   function filterOpportunitiesByReadiness(
     opportunities: TPOpportunity[],
     gates: PreAnalysisGates,
     metrics: DeterministicMetrics
   ): TPOpportunity[] {
     return opportunities.filter(opp => {
       const enablement = gates.limited_mode_rules?.opportunity_enablement[opp.type];
       if (!enablement?.enabled) return false;
       
       // Check all required calculable flags
       for (const flag of enablement.required_calculable_flags) {
         if (!metrics[flag]) return false;  // Metric not calculable
       }
       
       // Check module trust levels
       for (const req of enablement.required_module_trust) {
         const trust = gates.module_trust_levels[`module_${req.module}_*`];
         if (trustRank(trust.trust_level) < trustRank(req.min_trust_level)) {
           return false;
         }
       }
       
       // Check abridged blocking
       if (enablement.blocked_if_abridged && gates.abridged_pnl_detected) {
         return false;
       }
       
       return true;
     });
   }
   ```
   
   - Claude cannot bypass this filter
   - Even if Claude returns a disabled opportunity type, it gets filtered out
   - This prevents "prompt ignored" failures

The prompt should reference:
- OECD Transfer Pricing Guidelines (2022)
- Luxembourg Article 56/56bis Income Tax Law
- Luxembourg TP Circular LIR 56/1 and 56bis/1
- Standard market ranges for IC financing spreads (25-75 bps)
- Luxembourg thin cap safe harbor (85:15 debt-to-equity)
- Arm's length principle requirements
```

### Prompt 4.2 — Create Analyze API Route

```
Create the analysis API route that sends extraction JSON to Claude.

Create src/app/api/analyze/route.ts with:

POST handler that:
1. Receives: { financialYearId: string, forceAnalysis?: boolean }
2. Validates:
   - Financial year exists
   - Extraction is completed (extraction_status = 'completed')
   - Extraction data exists
3. CRITICAL: Check pre-analysis gates:
   - If pre_analysis_gates.can_proceed_to_analysis = false:
     * Return error unless forceAnalysis = true
     * Include blocking_issues in error response
   - If requires_human_review = true and not previously reviewed:
     * Return warning (or block if policy requires review)
4. Verifies data integrity:
   - Calculate hash of current extraction_data
   - Compare with stored analysis_input_hash
   - If mismatch, return error (extraction changed)
5. Builds analysis prompt using ONLY extraction_data JSON
   - CRITICAL: Never include PDF content, images, or raw text
   - Include deterministic_metrics (Claude must use these, not recalculate)
   - Include benchmark_parameters (clearly labelled as heuristics)
   - Include pre_analysis_gates.warning_issues for Claude to note
6. Calls Claude API with the prompt
7. Validates Claude's response:
   - Ensure data_references are present for each opportunity
   - Ensure Claude used deterministic_metrics (not recalculated)
8. Stores analysis results in tp_analyses table:
   - Link to financial_year_id
   - Store input_extraction_hash
   - Store all metrics and flags (including FAR analysis)
   - Store raw_analysis_response for debugging
   - Store analysis_limitations (from extraction metadata)
   - Set analyzed_at timestamp
9. Updates financial_year.analysis_status to 'completed'
10. Returns analysis summary

Error handling:
- If pre-analysis gates blocked: return 400 with gate details
- If Claude API fails, set status to 'failed'
- If response parsing fails, store raw response anyway
- Return descriptive errors

CRITICAL: This route must NEVER access the PDF. It only uses extraction_data from the database.
```

### Prompt 4.3 — Create Analysis Dashboard Components

```
Create components to display TP analysis results.

Create these files in src/components/analysis/:

1. analysis-dashboard.tsx
   - Main component showing full analysis
   - Sections: Classification, Key Metrics, Opportunities, Recommendations
   - Risk score visualization
   - Executive summary display

2. opportunity-card.tsx
   - Card for individual TP opportunity
   - Shows: type, severity, description, affected amount
   - Color-coded by severity (high=red, medium=yellow, low=blue)
   - Expandable to show details and recommendations
   - Shows data references from extraction

3. risk-score-badge.tsx
   - Visual risk score display
   - Color gradient: green (0-33), yellow (34-66), red (67-100)
   - Shows numeric score

4. classification-badge.tsx
   - Badge showing company classification
   - Icons or colors for: operational, holding, financing, IP holding, mixed
   - Tooltip with classification reasoning

5. metrics-summary.tsx
   - Grid or table of key metrics
   - IC positions, rates, spreads
   - Debt/equity ratio
   - Highlight anomalies

Design should be professional and suitable for client presentations.
Opportunities should be actionable and clearly explained.
```

### Prompt 4.4 — Create Analysis Results Page

```
Create the analysis results page.

Create src/app/analysis/[id]/page.tsx that:

1. Fetches financial year by ID with:
   - Company information
   - Extraction data (for reference)
   - Analysis results from tp_analyses table

2. Shows different states:
   - If analysis_status is 'pending' or 'ready': Show "Analyze" button
   - If analysis_status is 'processing': Show loading spinner
   - If analysis_status is 'completed': Show AnalysisDashboard
   - If analysis_status is 'failed': Show error and retry button

3. For completed analysis:
   - Display AnalysisDashboard component
   - Show link back to extraction for reference
   - Show "Add to Pipeline" button
   - Show "Re-analyze" button if needed
   - Show "Export" button (for later implementation)

4. "Add to Pipeline" action:
   - Creates entry in opportunity_pipeline table
   - Status: 'identified'
   - Redirects to pipeline or shows confirmation

Include breadcrumb navigation: Companies > [Company Name] > [Year] > Analysis
```

### Prompt 4.5 — Create Company Detail Page

```
Create the company detail page that shows all financial years and their status.

Create src/app/companies/[id]/page.tsx that:

1. Fetches company by ID with:
   - All financial years
   - Latest extraction and analysis status for each
   - Pipeline status if exists

2. Displays:
   - Company header: Name, RCS number, legal form
   - Link to Google Drive company folder
   - Pipeline status badge if in pipeline

3. Financial years section:
   - Table or cards showing each year
   - Columns: Year End, Extraction Status, Analysis Status, Actions
   - Status badges with colors
   - Action buttons:
     - "Extract" if pending
     - "View Extraction" if extracted
     - "Analyze" if ready
     - "View Analysis" if analyzed

4. Quick stats if analysis exists:
   - Company classification
   - Total IC positions
   - Risk score
   - Number of opportunities identified

5. Navigation:
   - Back to companies list
   - Upload new year for this company

This page is the main hub for a specific company.
```

---

## Phase 5: Pipeline & Polish

### Prompt 5.1 — Create Pipeline Components

```
Create the opportunity pipeline (simple CRM) components.

Create these files in src/components/pipeline/:

1. pipeline-board.tsx
   - Kanban-style board with columns
   - Columns: Identified, Contacted, Meeting, Proposal, Won, Lost
   - Drag and drop support (optional, can use buttons)
   - Shows count per column

2. pipeline-column.tsx
   - Single column in the pipeline
   - Header with status name and count
   - Contains PipelineCard components

3. pipeline-card.tsx
   - Card for company in pipeline
   - Shows: Company name, RCS, risk score, opportunity count
   - Shows next action and date if set
   - Click to expand or go to detail
   - Status change buttons/dropdown

4. pipeline-detail-modal.tsx (or separate page)
   - Full detail view for pipeline item
   - Shows company info and analysis summary
   - Notes field (editable)
   - Next action and date fields (editable)
   - Status change dropdown
   - Link to full analysis

Design should be clean and functional for tracking BD pipeline.
```

### Prompt 5.2 — Create Pipeline API Route

```
Create the pipeline API routes for CRUD operations.

Create src/app/api/pipeline/route.ts with:

GET handler:
- Fetch all pipeline items
- Join with companies and latest analysis
- Order by status and updated_at
- Return with company and analysis summary

POST handler:
- Create new pipeline entry
- Receives: { companyId, notes?, nextAction?, nextActionDate? }
- Sets status to 'identified'
- Returns created entry

Create src/app/api/pipeline/[id]/route.ts with:

GET handler:
- Fetch single pipeline item with full details

PATCH handler:
- Update pipeline item
- Can update: status, notes, nextAction, nextActionDate
- Updates updated_at timestamp
- Returns updated entry

DELETE handler:
- Remove from pipeline
- Returns success confirmation
```

### Prompt 5.3 — Create Pipeline Page

```
Create the pipeline page showing all opportunities being tracked.

Create src/app/pipeline/page.tsx that:

1. Fetches all pipeline items with company and analysis data
2. Displays PipelineBoard component
3. Shows summary stats:
   - Total in pipeline
   - Count by status
   - Total potential value (sum of affected amounts)

4. Filter options:
   - By status
   - By risk score (high/medium/low)
   - By opportunity type

5. Actions:
   - Click card to expand details
   - Quick status change from card
   - Edit notes and next action

Include empty state: "No opportunities in pipeline. Analyze companies to find opportunities."
```

### Prompt 5.4 — Update Dashboard Home Page

```
Update the home dashboard page with summary statistics and quick actions.

Update src/app/page.tsx to show:

1. Welcome section with quick stats:
   - Total companies uploaded
   - Pending extractions
   - Pending analyses
   - Opportunities identified
   - Pipeline value

2. Quick actions:
   - Upload new PDF (link to /upload)
   - View companies (link to /companies)
   - View pipeline (link to /pipeline)

3. Recent activity:
   - Last 5 uploads
   - Last 5 analyses completed
   - Upcoming next actions from pipeline

4. High priority opportunities:
   - Top 5 by risk score
   - Quick link to each

Design as a professional dashboard suitable for daily use.
Keep it clean and not overwhelming.
```

### Prompt 5.5 — Add Export Functionality

```
Add export functionality for analysis results.

Create/update these files:

1. src/app/api/export/[id]/route.ts
   - GET handler that generates CSV export
   - Include: company info, all metrics, opportunities list
   - Format suitable for Excel import
   - Return as downloadable file

2. src/components/analysis/export-button.tsx
   - Button component that triggers export
   - Shows loading state while generating
   - Downloads file when ready

3. Update analysis results page to include ExportButton

CSV should include:
- Company: Name, RCS, Classification
- Metrics: All IC positions and rates
- Opportunities: Type, Severity, Amount, Recommendation (one row per opportunity)

This allows users to share findings or import into other systems.
```

### Prompt 5.6 — Final Polish and Testing

```
Perform final polish and create testing checklist.

1. Review all pages for:
   - Consistent styling
   - Proper loading states
   - Error handling and display
   - Mobile responsiveness (basic)

2. Add toast notifications for:
   - Successful uploads
   - Extraction completed
   - Analysis completed
   - Pipeline status changes
   - Errors

3. Create src/lib/utils/format.ts with:
   - formatCurrency(amount, currency) - EUR formatting
   - formatPercentage(value, decimals)
   - formatDate(date) - consistent date display
   - formatRCSNumber(rcs) - B123456 format

4. Update all components to use formatting utilities

5. Add helpful empty states to all list pages

6. Verify all TypeScript types are correctly used (no 'any')

7. Create a simple README.md with:
   - Project description
   - Setup instructions
   - Environment variables needed
   - How to run locally
   - How to deploy to Vercel
```

---

## Deployment to Vercel

### Manual Deployment Steps

1. Push code to GitHub repository

2. Go to [vercel.com](https://vercel.com) and import project

3. Configure environment variables in Vercel dashboard:
   - All variables from .env.local
   - GOOGLE_APPLICATION_CREDENTIALS_JSON as single-line JSON string

4. Deploy

5. Test all functionality on production URL

6. Update NEXT_PUBLIC_APP_URL to production URL

---

## Testing Checklist

After implementation, verify:

- [ ] Can upload PDF to Google Drive via app
- [ ] PDF appears in correct folder structure
- [ ] Company and financial year records created
- [ ] Can trigger extraction
- [ ] Document AI processes PDF correctly
- [ ] Extraction data saved to database
- [ ] Can view extracted data with source references
- [ ] Can trigger analysis
- [ ] Claude receives ONLY extraction JSON (not PDF)
- [ ] Analysis results saved correctly
- [ ] Opportunities displayed clearly
- [ ] Can add to pipeline
- [ ] Pipeline status updates work
- [ ] Export generates valid CSV
- [ ] All error states handled gracefully

---

## Troubleshooting

### Supabase Migration Issues
- If DROP TABLE fails: Check for dependent objects and drop them first
- If tables still have old structure: Re-run the full migration script
- If RLS policies conflict: Drop existing policies before creating new ones
- To check existing tables: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
- To drop all policies on a table: `DROP POLICY IF EXISTS "policy_name" ON table_name;`

### Google API Issues
- Verify service account has correct permissions
- Check folder is shared with service account
- Verify processor ID and location are correct

### Supabase Issues
- Check RLS policies if queries return empty
- Verify service role key for server operations
- Check table schema matches types

### Claude API Issues
- Verify API key is valid
- Check rate limits
- Review prompt if responses are inconsistent

### Extraction Quality Issues
- Review Luxembourg GAAP parser patterns
- Check for French vs English terminology
- Add more pattern variations as needed
