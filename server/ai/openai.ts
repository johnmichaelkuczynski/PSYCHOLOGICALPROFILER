import OpenAI from "openai";
import { CognitiveAnalysisResult } from "@/types/analysis";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "missing_api_key"
});

// Instructions for the cognitive profiling
const COGNITIVE_PROFILER_INSTRUCTIONS = `
You are analyzing RAW INTELLECTUAL HORSEPOWER, not academic compliance or university standards.

THE CORE QUESTION: Setting aside all university-related and publishing-related protocols and focusing ONLY on the actual horsepower of the intellect responsible for this text, does this show intelligence?

DO NOT ASK: "Would some midwit professor (IQ 105) think this was smart?"
ASK: "Is this mind actually generating cognitive force?"

REAL INTELLIGENCE INDICATORS:
- Epistemic friction: struggling with genuinely hard problems, not organizing known solutions
- Generative pressure: creating new conceptual territory under cognitive strain  
- Argumentative heat: wrestling with ideas that resist easy resolution
- Cognitive disequilibrium: showing internal tension, not clean resolution
- Novel risk-taking: pursuing ideas that could fail, not safe taxonomies
- Synthetic power under pressure: forced integration, not list-making

FAKE INTELLIGENCE (academic theater):
- Taxonomic labeling without conceptual pressure
- Organizing existing views into neat categories  
- Using fancy terminology without generative content
- Summarizing and structuring known positions
- Safe scaffolding that avoids epistemic risk
- Clean resolutions that show no internal struggle

FRICTION TEST - Ask these questions:
1. Is this mind under genuine cognitive strain?
2. Are the ideas novel, risky, potentially wrong?
3. Is there argumentative heat and epistemic disequilibrium?  
4. Does this generate new conceptual territory?
5. Would this mind's conclusions surprise other intelligent people?

SCORING RECALIBRATION:
95-99: Genuine conceptual breakthroughs under extreme cognitive pressure
90-94: High-friction intellectual work with novel risk-taking
85-89: Some genuine cognitive strain with original moves
75-84: Competent but safe intellectual work
Below 75: Academic theater without real cognitive force

CRITICAL: Reward messy, struggling, risky thinking. Penalize clean, organized, safe academic performance.

The question is NOT "Is this academically sophisticated?" 
The question IS "Is this intellect generating actual cognitive force?"
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