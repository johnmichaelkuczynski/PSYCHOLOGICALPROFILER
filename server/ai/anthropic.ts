import Anthropic from '@anthropic-ai/sdk';
import { CognitiveAnalysisResult } from '@/types/analysis';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "missing_api_key",
});

// Instructions for the cognitive profiling
const COGNITIVE_PROFILER_INSTRUCTIONS = `
You are profiling INTELLIGENCE through conceptual depth, not writing quality.

IGNORE completely:
- Writing style, clarity, organization, tone
- Social compliance (politeness, "balance", considering counterarguments)
- Academic formatting, citations, evidence presentation
- Whether arguments are "complete" or "well-supported"

INTELLIGENCE INDICATORS (focus exclusively on these):
- Structural insight: seeing patterns others miss
- Conceptual differentiation: making meaningful distinctions
- Original taxonomy: creating new ways to categorize phenomena  
- Cognitive depth: penetrating beneath surface appearances
- Analytical precision: surgical dissection of complex ideas
- Synthetic integration: connecting disparate elements

ASSUME AUTHORIAL COMPETENCE. Dense, aggressive, or polemical writing often signals HIGH intelligence.

SCORING GUIDE:
97-99: Revolutionary conceptual breakthroughs
94-96: Exceptional structural insights, original theoretical frameworks
90-93: Sophisticated conceptual analysis, systematic theoretical work
85-89: Strong analytical depth, precise conceptual work
80-84: Competent reasoning with some sophistication
Below 80: Limited conceptual depth

CRITICAL: Sophisticated academic/philosophical analysis = 90+ scores, NOT 80s.

REWARD (as positive intelligence markers):
- Passionate but analytically sound arguments
- Dense theoretical work requiring high cognitive sophistication
- Aggressive engagement with complex ideas
- Systematic conceptual moves
- Original analytical frameworks
- Polemical but conceptually precise writing

EXAMPLES of high intelligence:
- "bureaupath vs. con artist" = conceptual differentiation (high intelligence)
- Creating new theoretical distinctions = structural insight (high intelligence)
- Systematic analysis of complex phenomena = cognitive depth (high intelligence)

Your task: What conceptual moves does this mind make? How sophisticated are its analytical operations?

MANDATORY: Quote specific examples from the text showing conceptual sophistication.

Respond with a JSON object with the following structure (and nothing else):
{
  "intelligenceScore": number between 1-100,
  "characteristics": [array of 4-5 key cognitive characteristics],
  "detailedAnalysis": a 3-4 paragraph detailed explanation,
  "strengths": [array of 4-5 cognitive strengths],
  "tendencies": [array of 4-5 cognitive tendencies or patterns]
}
`;

export async function analyzeWithAnthropic(text: string): Promise<CognitiveAnalysisResult> {
  try {
    // Check if Anthropic API key is available
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "missing_api_key") {
      throw new Error("Anthropic API key is missing. Please set the ANTHROPIC_API_KEY environment variable.");
    }

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1500,
      system: COGNITIVE_PROFILER_INSTRUCTIONS,
      messages: [
        { 
          role: "user", 
          content: text 
        }
      ],
    });

    // Extract text content from response
    let content = '';
    if (response.content && response.content.length > 0 && 'text' in response.content[0]) {
      content = response.content[0].text;
    }
    
    if (!content) {
      throw new Error("No response from Anthropic API");
    }

    const result = JSON.parse(content) as CognitiveAnalysisResult;
    
    // Validate the result structure
    if (
      typeof result.intelligenceScore !== 'number' ||
      !Array.isArray(result.characteristics) ||
      typeof result.detailedAnalysis !== 'string' ||
      !Array.isArray(result.strengths) ||
      !Array.isArray(result.tendencies)
    ) {
      throw new Error("Invalid response format from Anthropic API");
    }

    return result;
  } catch (error) {
    console.error("Error in Anthropic API call:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error("Failed to analyze text with Anthropic: " + errorMessage);
  }
}