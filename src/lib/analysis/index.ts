// src/lib/analysis/index.ts
// Export all analysis module functions

export { callClaude, analyzeWithClaude, type ClaudeMessage, type ClaudeResponse } from './client';
export { buildTPSystemPrompt, buildTPAnalysisPrompt, buildTestPrompt } from './prompts';
export { parseAnalysisResponse, createBlockedAnalysisResult, type ParseResult } from './response-parser';
export {
  filterOpportunitiesByReadiness,
  getAllowedOpportunityTypes,
  validateOpportunity,
  enrichOpportunitiesWithScope,
} from './opportunity-gate';
