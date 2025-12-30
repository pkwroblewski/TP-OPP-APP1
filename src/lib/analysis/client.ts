// src/lib/analysis/client.ts
// Claude API client for TP analysis

import Anthropic from '@anthropic-ai/sdk';

// Initialize client lazily
let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface CallClaudeOptions {
  messages: ClaudeMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Call Claude API with messages
 */
export async function callClaude(options: CallClaudeOptions): Promise<ClaudeResponse> {
  const {
    messages,
    systemPrompt,
    maxTokens = 8192,
    temperature = 0.2, // Low temperature for consistent analysis
  } = options;

  const client = getClient();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    const content = textContent && 'text' in textContent ? textContent.text : '';

    return {
      content,
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.error('[Claude] Rate limit exceeded:', error.message);
      throw new Error('Rate limit exceeded. Please try again in a few minutes.');
    }

    if (error instanceof Anthropic.APIError) {
      console.error('[Claude] API error:', error.message);
      throw new Error(`Claude API error: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Simple analysis call with a single prompt
 */
export async function analyzeWithClaude(
  prompt: string,
  systemPrompt?: string
): Promise<ClaudeResponse> {
  return callClaude({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt,
    maxTokens: 8192,
    temperature: 0.2,
  });
}
