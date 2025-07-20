import { CognitiveAnalysisResult } from "@/types/analysis";

/**
 * Analyzes text using DeepSeek API
 */
export async function analyzeWithDeepSeek(text: string): Promise<CognitiveAnalysisResult> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are profiling INTELLIGENCE through conceptual operations, not writing conventions.

INTELLIGENCE IS NOT:
- Clear organization, balanced tone, or polite presentation
- Following academic formatting or citing sources
- "Considering alternative viewpoints" or social deference
- Writing quality, clarity, or completeness

INTELLIGENCE IS:
- Structural insight: penetrating to underlying patterns
- Conceptual differentiation: making meaningful distinctions
- Original taxonomy: creating new conceptual frameworks
- Cognitive depth: seeing beyond surface phenomena
- Analytical precision: surgical dissection of ideas
- Synthetic power: integrating complex elements

ASSUME HIGH COMPETENCE. Dense, assertive, polemical writing often indicates HIGH intelligence.

SCORING RECALIBRATION:
97-99: Groundbreaking conceptual breakthroughs
94-96: Exceptional structural insights, original theoretical moves
90-93: Sophisticated conceptual analysis, systematic theoretical work
85-89: Strong analytical depth with precise conceptual operations
80-84: Competent reasoning with some sophistication

CRITICAL: Sophisticated academic/philosophical analysis = 90+ scores ALWAYS.

POSITIVE INTELLIGENCE INDICATORS:
- Aggressive but analytically sound arguments (HIGH intelligence)
- Dense theoretical work requiring cognitive sophistication (HIGH intelligence)
- Systematic conceptual differentiation (HIGH intelligence)
- Original analytical frameworks (HIGH intelligence)
- Passionate engagement with complex ideas (HIGH intelligence)

EXAMPLES:
- Creating distinction like "bureaupath vs. con artist" = conceptual differentiation = HIGH intelligence
- Systematic analysis of complex philosophical problems = cognitive depth = HIGH intelligence
- Building novel theoretical frameworks = structural insight = HIGH intelligence

FOCUS: What sophisticated conceptual moves does this mind perform?

Provide your analysis in the following JSON format:
{
  "intelligenceScore": <number 1-100>,
  "characteristics": [<array of 3-5 cognitive traits>],
  "detailedAnalysis": "<detailed paragraph analyzing cognitive profile>",
  "strengths": [<array of 3-4 cognitive strengths>],
  "tendencies": [<array of 3-4 cognitive tendencies>]
}`
          },
          {
            role: 'user',
            content: `Please analyze the cognitive profile of the author of this text:\n\n${text}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from DeepSeek API');
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from DeepSeek API');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      intelligenceScore: Math.max(1, Math.min(100, parsed.intelligenceScore || 75)),
      characteristics: Array.isArray(parsed.characteristics) ? parsed.characteristics : ['analytical', 'systematic', 'methodical'],
      detailedAnalysis: parsed.detailedAnalysis || 'The author demonstrates solid cognitive abilities with a structured approach to reasoning and clear articulation of ideas.',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['logical reasoning', 'clear communication', 'systematic thinking'],
      tendencies: Array.isArray(parsed.tendencies) ? parsed.tendencies : ['methodical analysis', 'evidence-based reasoning', 'structured presentation']
    };

  } catch (error) {
    console.error('DeepSeek analysis error:', error);
    
    // Return a fallback result based on text analysis
    return createFallbackResult(text);
  }
}

/**
 * Creates a fallback result when DeepSeek API fails
 */
function createFallbackResult(text: string): CognitiveAnalysisResult {
  const wordCount = text.split(/\s+/).length;
  const avgWordLength = text.replace(/\s+/g, '').length / wordCount;
  const complexSentences = (text.match(/[;:]/g) || []).length;
  
  // Base score calculation
  let score = 70;
  if (wordCount > 500) score += 5;
  if (avgWordLength > 5) score += 5;
  if (complexSentences > 3) score += 5;
  
  score = Math.max(65, Math.min(85, score));
  
  return {
    intelligenceScore: score,
    characteristics: ['analytical', 'systematic', 'methodical'],
    detailedAnalysis: `The author demonstrates ${score > 75 ? 'above-average' : 'solid'} cognitive abilities with a structured approach to reasoning. The writing shows clear logical progression and effective communication skills. The cognitive profile suggests someone who approaches problems methodically and values clarity in expression.`,
    strengths: ['logical reasoning', 'clear communication', 'systematic thinking'],
    tendencies: ['methodical analysis', 'evidence-based reasoning', 'structured presentation']
  };
}