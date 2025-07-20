import Anthropic from '@anthropic-ai/sdk';
import { CognitiveAnalysisResult } from '@/types/analysis';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "missing_api_key",
});

// Instructions for the cognitive profiling
const COGNITIVE_PROFILER_INSTRUCTIONS = `
You are measuring RAW INTELLECTUAL HORSEPOWER, not academic compliance.

CORE QUESTION: Setting aside all university and publishing protocols, focusing ONLY on the actual cognitive force of this intellect - does this text show genuine intelligence?

NOT: "Would credentialed academics think this was smart?"
YES: "Is this mind generating real cognitive force?"

GENUINE INTELLIGENCE MARKERS:
- Epistemic friction: wrestling with genuinely resistant problems
- Generative strain: creating new conceptual territory under pressure
- Argumentative heat: internal struggle with difficult ideas
- Cognitive disequilibrium: showing intellectual tension, not resolution
- Novel risk-taking: pursuing ideas that could genuinely fail
- Forced synthesis: integration under cognitive pressure, not organizing lists

FAKE INTELLIGENCE (academic performance):
- Taxonomic organization without conceptual generation
- Safe categorization of existing views
- Terminology deployment without epistemic risk
- Summary and structure without cognitive strain
- Clean resolutions that avoid intellectual struggle
- Modular outlines that show no synthetic pressure

FRICTION TEST:
1. Is this mind under genuine epistemic strain?
2. Are these ideas risky, novel, potentially wrong?
3. Is there real argumentative heat and intellectual struggle?
4. Does this generate genuinely new conceptual territory?
5. Would these conclusions surprise other intelligent minds?

SCORING:
95-99: Breakthrough thinking under extreme cognitive pressure
90-94: High-friction intellectual work with genuine novelty
85-89: Some real cognitive strain with original risk-taking
75-84: Competent but intellectually safe
Below 75: Academic theater without cognitive force

CRITICAL: Reward messy, struggling, risky intellectual work. Penalize organized, clean academic performance.

Focus: Is this intellect generating actual cognitive force or just performing academic compliance?

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