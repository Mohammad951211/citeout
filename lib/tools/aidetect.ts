/**
 * AI Content Detection
 *
 * Two backends, selected automatically:
 *
 *  1. Originality.ai — preferred when `ORIGINALITY_API_KEY` is set.
 *     Sign up at https://originality.ai and add the key to Vercel.
 *
 *  2. Gemini-powered analyser — default fallback. No extra key needed;
 *     reuses the existing GOOGLE_GEMINI_API_KEY. Gemini scores the text
 *     by analysing stylistic markers of AI authorship.
 *
 * Both paths return the same `AIDetectionResult` shape so the UI is
 * agnostic to which engine produced the score.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIDetectionResult {
  /** 0–100: percentage probability the text was AI-generated */
  score: number;
  /** Human-readable classification */
  classification: "AI Generated" | "Mixed Content" | "Human Written";
  /** Supporting detail message */
  details: string;
  /** Whether the detection service is configured and working */
  configured: boolean;
}

// ── Originality.ai response shape ─────────────────────────────────────────────

interface OriginalityResponse {
  score: {
    ai: number;       // 0–1 probability of AI
    original: number; // 0–1 probability of human
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function detectAI(text: string): Promise<AIDetectionResult> {
  if (process.env.ORIGINALITY_API_KEY) {
    return detectViaOriginality(text, process.env.ORIGINALITY_API_KEY);
  }
  return detectViaGemini(text);
}

// ── Path 1: Originality.ai ────────────────────────────────────────────────────

async function detectViaOriginality(
  text: string,
  apiKey: string
): Promise<AIDetectionResult> {
  const res = await fetch("https://api.originality.ai/api/v1/scan/ai", {
    method: "POST",
    headers: {
      "X-OAI-API-KEY": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      content: text,
      aiModelVersion: "1",
      storeScan: "false",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Originality.ai error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as OriginalityResponse;
  const aiScore = Math.round(data.score.ai * 100);
  return formatResult(aiScore, "originality.ai", true);
}

// ── Path 2: Gemini-powered detector ───────────────────────────────────────────

async function detectViaGemini(text: string): Promise<AIDetectionResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return {
      score: 0,
      classification: "Human Written",
      details: "AI detection is unavailable: GOOGLE_GEMINI_API_KEY is not set.",
      configured: false,
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You are an expert forensic linguist who evaluates whether text was likely produced by an AI language model.

Analyse the user's text for these AI-authorship signals:
1. Uniform sentence rhythm and length (low burstiness).
2. Mechanical transitions ("Furthermore", "Moreover", "In conclusion") used as sentence openers.
3. Generic, hedged phrasing without concrete specifics, anecdotes, or named examples.
4. Overly balanced "on the one hand / on the other hand" structures.
5. Repetitive vocabulary patterns and a flat analytical voice.
6. Perfect grammar that lacks idiomatic colour or personal idiosyncrasy.
7. Vague topic sentences followed by listy support.

Also weigh signals of HUMAN authorship: typos, idioms, hedges, personal voice, abrupt shifts, opinions, humour, specific dates/names, irregular sentence length.

Return ONLY a valid JSON object — no markdown, no commentary — in exactly this shape:
{"score": <integer 0-100>, "reasoning": "<one-sentence summary of the strongest signal>"}
Where score = estimated probability (0-100) that the text was AI-generated.`,
    generationConfig: {
      temperature: 0.2,
      // gemini-2.5-flash uses "thinking" tokens before output (~400 typical).
      // Allow enough headroom for thinking + the ~80-token JSON response.
      maxOutputTokens: 2048,
    },
  });

  let aiScore = 0;
  let reasoning = "Analysed using stylistic AI-authorship markers.";

  try {
    const result = await model.generateContent(text);
    const raw = result.response.text().trim();

    // Strip markdown fences, then locate the first JSON object in the string
    // (Gemini occasionally prefixes a short preamble despite instructions).
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    const jsonMatch = stripped.match(/\{[\s\S]*?\}/);
    const candidate = jsonMatch ? jsonMatch[0] : stripped;

    const parsed = JSON.parse(candidate) as { score?: unknown; reasoning?: unknown };
    if (typeof parsed.score === "number") {
      aiScore = Math.max(0, Math.min(100, Math.round(parsed.score)));
    }
    if (typeof parsed.reasoning === "string" && parsed.reasoning.trim()) {
      reasoning = parsed.reasoning.trim();
    }
  } catch {
    aiScore = 0;
    reasoning = "The detector returned an unparseable response; defaulting to a neutral score.";
  }

  return formatResult(aiScore, "gemini", true, reasoning);
}

// ── Shared formatting ─────────────────────────────────────────────────────────

function formatResult(
  aiScore: number,
  source: "originality.ai" | "gemini",
  configured: boolean,
  geminiReasoning?: string
): AIDetectionResult {
  const humanScore = 100 - aiScore;

  const classification: AIDetectionResult["classification"] =
    aiScore >= 70 ? "AI Generated" : aiScore >= 35 ? "Mixed Content" : "Human Written";

  const sourceTag =
    source === "originality.ai"
      ? "Powered by Originality.ai."
      : "Powered by Gemini stylistic analysis.";

  let details: string;
  if (aiScore >= 70) {
    details = `${aiScore}% probability of AI generation. The text exhibits strong patterns consistent with AI authorship. ${sourceTag}`;
  } else if (aiScore >= 35) {
    details = `${aiScore}% probability of AI generation. Mixed signals — some sections may be AI-assisted. ${sourceTag}`;
  } else {
    details = `${humanScore}% probability of human authorship. The text reads as predominantly human-written. ${sourceTag}`;
  }

  if (geminiReasoning) {
    details += ` Reasoning: ${geminiReasoning}`;
  }

  return { score: aiScore, classification, details, configured };
}
