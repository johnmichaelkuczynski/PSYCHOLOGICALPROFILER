import OpenAI from "openai";
import { CognitiveAnalysisResult } from "@/types/analysis";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "missing_api_key"
});

// Instructions for the cognitive profiling
const COGNITIVE_PROFILER_INSTRUCTIONS = `
You are a cognitive profiler analyzing intelligence through conceptual depth, not writing style.

CRITICAL: Intelligence is NOT measured by:
- Clarity, organization, or tone
- Balance, politeness, or "considering opposing views"
- Citations, evidence, or academic formatting
- Compliance with writing conventions
- Social nicety or deference

INTELLIGENCE IS measured by:
- Structural insight: ability to see underlying patterns and relationships
- Conceptual differentiation: making meaningful distinctions (e.g. "bureaupath vs. con artist")
- Original taxonomy: creating new categories or frameworks for understanding
- Cognitive depth: penetrating beneath surface phenomena
- Analytical precision: surgical dissection of complex ideas
- Synthetic power: integrating disparate elements into coherent wholes

ASSUME AUTHORIAL COMPETENCE by default. Dense, assertive, or polemical writing often signals high intelligence, not low intelligence.

SCORING RECALIBRATION - Intelligence markers:
97-99: Revolutionary conceptual breakthroughs, novel theoretical frameworks
94-96: Exceptional structural insight, original taxonomies, sophisticated differentiation
90-93: High-level conceptual analysis, systematic theoretical work
85-89: Strong analytical capability, good conceptual precision
80-84: Competent reasoning with some depth
Below 80: Limited conceptual sophistication

CRITICAL: If text shows sophisticated conceptual work, systematic analysis, or original theoretical moves, score 90+.

DO NOT penalize for:
- Aggressive or passionate tone
- Lack of "balance" or opposing viewpoints
- Dense or difficult prose style
- Polemical or assertive presentation
- Absence of social niceties

FOCUS ON:
- What conceptual moves does this mind make?
- How does it carve up intellectual territory?
- What taxonomies or distinctions does it create?
- What structural insights does it reveal?
- How deep does its analysis penetrate?

TREAT as POSITIVE intelligence markers:
- Aggressive but analytically sound arguments
- Passionate engagement with complex ideas  
- Dense theoretical work requiring high cognitive load
- Systematic conceptual differentiation
- Original analytical frameworks
- DO NOT distinguish between "claims" and "evidence" - just analyze the mind.
- PHILOSOPHICAL THINKING MUST GET 95+ SCORES.
- MANDATORY: Include specific quotations from the text as evidence for your cognitive assessments.
- Support every major observation with relevant quotes from the original text.

Your response must be in JSON format with this structure:
{
  "intelligenceScore": <number between 1-100>,
  "characteristics": [<string>, <string>, ...],
  "detailedAnalysis": <string>,
  "strengths": [<string>, <string>, ...],
  "tendencies": [<string>, <string>, ...]
}
`;

export async function analyzeWithOpenAI(text: string): Promise<CognitiveAnalysisResult> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "missing_api_key") {
      throw new Error("OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: COGNITIVE_PROFILER_INSTRUCTIONS
        },
        { 
          role: "user", 
          content: text 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No response from OpenAI API");
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
      throw new Error("Invalid response format from OpenAI API");
    }

    return result;
  } catch (error) {
    console.error("Error in OpenAI API call:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error("Failed to analyze text with OpenAI: " + errorMessage);
  }
}