# TP Opportunity Finder - Master Implementation Prompt

## Instructions for Claude Code

You are implementing a complete web application called "TP Opportunity Finder" for identifying transfer pricing opportunities from Luxembourg company annual accounts.

## Step 1: Read Project Documentation

First, read these two documents thoroughly:

1. **docs/PROJECT_STRUCTURE.md** - Contains:
   - Complete architecture and data flow
   - Technology stack
   - Google Drive folder structure
   - Application folder structure
   - Full database schema (SQL)
   - TypeScript type definitions
   - API endpoints
   - Environment variables

2. **docs/IMPLEMENTATION_GUIDE.md** - Contains:
   - Pre-implementation setup instructions (for user reference)
   - Implementation prompts organized in 5 phases
   - Each prompt describes exactly what to build

Also read the **.claude-rules** file for project rules and principles.

## Step 2: Implement Phases Sequentially

Work through the implementation in this order:

### Phase 1: Project Initialization
- Prompt 1.1: Initialize Next.js project with folder structure
- Prompt 1.2: Create TypeScript type definitions
- Prompt 1.3: Create Supabase clients
- Prompt 1.4: Create Google API clients
- Prompt 1.5: Create connection test scripts

### Phase 2: Upload & Storage
- Prompt 2.1: Create base UI components
- Prompt 2.2: Create layout components
- Prompt 2.3: Create upload page
- Prompt 2.4: Create upload API route
- Prompt 2.5: Create companies list page

### Phase 3: Extraction Layer
- Prompt 3.1: Create Luxembourg GAAP parser
- Prompt 3.2: Create extract API route
- Prompt 3.3: Create extraction viewer components
- Prompt 3.4: Create extraction review page

### Phase 4: Analysis Layer
- Prompt 4.1: Create Claude analysis client and prompts
- Prompt 4.2: Create analyze API route
- Prompt 4.3: Create analysis dashboard components
- Prompt 4.4: Create analysis results page
- Prompt 4.5: Create company detail page

### Phase 5: Pipeline & Polish
- Prompt 5.1: Create pipeline components
- Prompt 5.2: Create pipeline API routes
- Prompt 5.3: Create pipeline page
- Prompt 5.4: Update dashboard home page
- Prompt 5.5: Add export functionality
- Prompt 5.6: Final polish and testing

## Step 3: Implementation Guidelines

### For Each Prompt:
1. Read the prompt requirements carefully
2. Check PROJECT_STRUCTURE.md for exact file paths and schemas
3. Implement the feature completely
4. Use the TypeScript types defined in the project
5. Follow the patterns established in earlier phases
6. Include proper error handling and loading states

### Critical Rules:
1. **Never send PDFs to Claude API** - Only send structured JSON from extraction_data
2. **Always include source references** - Page numbers and notes for extracted values
3. **Use proper TypeScript types** - Reference src/lib/types/ definitions
4. **Handle both French and English** - Luxembourg accounts use both languages

### File Creation Order:
1. Types first (so other files can import them)
2. Utility functions and clients
3. API routes
4. Components
5. Pages

## Step 4: After Implementation

1. Verify all files are created in correct locations
2. Check all imports resolve correctly
3. Ensure environment variables are documented
4. Create README.md with setup instructions

## Begin Implementation

Start by reading the documentation files, then implement Phase 1, Prompt 1.1. After completing each prompt, move to the next one. Continue until all phases are complete.

If you encounter any ambiguity, refer to PROJECT_STRUCTURE.md for the definitive architecture decisions.

Report progress after completing each phase.
