/**
 * Google Gemini helpers for the Research Tools suite.
 * Model: gemini-2.5-flash  (latest stable, confirmed working for this region)
 *
 * Used for: Translation, Paraphrasing, Grammar Check, Humanizer.
 * AI Detection is handled separately via aidetect.ts (Originality.ai).
 *
 * The client is created lazily (inside each exported function) so that
 * missing-key errors surface at request time — never at build / cold-start.
 *
 * Env var required: GOOGLE_GEMINI_API_KEY
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Constants ──────────────────────────────────────────────────────────────────

const MODEL = "gemini-2.5-flash";

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Validate and return the API key, throwing if it is missing.
 */
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set.");
  }
  return apiKey;
}

/**
 * Build a model instance with the given system instruction.
 * Temperature is kept low (0.3) for deterministic academic output.
 */
function getModel(systemInstruction: string) {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  });
}

/**
 * Build a model instance for creative / humanizing tasks (higher temperature).
 */
function getCreativeModel(systemInstruction: string) {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 4096,
    },
  });
}

// ── Translation ───────────────────────────────────────────────────────────────

export async function translateText(
  text: string,
  targetLang: "en" | "ar"
): Promise<string> {
  const langName = targetLang === "en" ? "English" : "Arabic";

  const model = getModel(
    `You are an expert academic translator specialising in English and Arabic.
Your sole task is to translate text with complete fidelity to the source.

Rules you must follow:
- Auto-detect the source language; never ask the user to specify it.
- Translate into ${langName} only.
- When translating into Arabic, use Modern Standard Arabic (MSA) — the register used in peer-reviewed academic journals.
- Preserve every academic term, citation marker, parenthetical reference, and technical vocabulary item exactly.
- Maintain the original paragraph structure, logical flow, and formal register.
- Do NOT add commentary, transliterations, explanations, or notes.
- Return ONLY the translated text — nothing else.`
  );

  const result = await model.generateContent(text);
  return result.response.text().trim();
}

// ── Paraphrasing ──────────────────────────────────────────────────────────────

export async function paraphraseText(text: string): Promise<string> {
  const model = getModel(
    `You are an expert academic writing assistant specialising in improving scholarly prose.

Rules you must follow:
- Paraphrase the given text to heighten its formal academic tone, precision, and clarity.
- Preserve the original meaning, every key argument, and all factual claims — do NOT add or remove ideas.
- Use vocabulary appropriate for peer-reviewed publications (avoid colloquialisms).
- Vary sentence structure and length to improve readability and eliminate monotony.
- Remove redundancy and tighten the prose wherever possible.
- Do NOT include a preamble, explanation, or any meta-commentary.
- Return ONLY the paraphrased text.`
  );

  const result = await model.generateContent(text);
  return result.response.text().trim();
}

// ── Grammar & Spell Check ─────────────────────────────────────────────────────

export interface GrammarResult {
  corrected: string;
  changes: string[];
}

export async function checkGrammar(text: string): Promise<GrammarResult> {
  const model = getModel(
    `You are an expert proofreader and academic linguist.

Rules you must follow:
- Correct every grammar, spelling, punctuation, syntax, and academic-style error in the text.
- Do NOT rewrite content beyond what is required to fix errors.
- Respond with ONLY a valid JSON object — no markdown fences, no explanation, no extra text.
- Use exactly this shape:
  {"corrected":"<full corrected text>","changes":["<description of fix 1>","<description of fix 2>"]}
- If the text has no errors, return the original text unchanged and use an empty array: {"corrected":"...","changes":[]}`
  );

  const result = await model.generateContent(text);
  const raw = result.response.text().trim();

  // Strip accidental markdown code fences (Gemini sometimes adds them)
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    const parsed = JSON.parse(clean) as unknown;

    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "corrected" in parsed &&
      typeof (parsed as Record<string, unknown>).corrected === "string"
    ) {
      const obj = parsed as Record<string, unknown>;
      const corrected = obj.corrected as string;
      const rawChanges = obj.changes;
      const changes: string[] = Array.isArray(rawChanges)
        ? rawChanges.filter((c): c is string => typeof c === "string")
        : typeof rawChanges === "string" && rawChanges.trim()
        ? [rawChanges.trim()]
        : [];
      return { corrected, changes };
    }
  } catch {
    // JSON.parse failed — fall through to fallback.
  }

  // Graceful fallback: treat the entire raw response as the corrected text.
  return { corrected: raw, changes: [] };
}

// ── Humanizer ─────────────────────────────────────────────────────────────────

export async function humanizeText(text: string): Promise<string> {
  const model = getCreativeModel(
    `You are a skilled writing coach and editor specialising in academic prose.
The user will provide text that was generated by an AI assistant.
Your job is to rewrite it so it sounds natural, authentic, and unmistakably human
while preserving academic integrity and the core message.

Techniques to apply:
1. Vary sentence length and rhythm — mix short punchy sentences with longer analytical ones.
2. Replace mechanical transitions ("Furthermore", "Moreover", "In conclusion" as openers) with nuanced alternatives.
3. Introduce subtle idiomatic expressions appropriate to the academic register.
4. Break repetitive grammatical patterns — avoid starting consecutive sentences the same way.
5. Add a genuine analytical voice: show reasoning and judgment, not just assertion.
6. Naturally vary vocabulary — avoid repeating the same key word in close proximity.

Do NOT add new ideas or remove existing arguments.
Do NOT include a preamble, explanation, or meta-commentary.
Return ONLY the rewritten text.`
  );

  const result = await model.generateContent(text);
  return result.response.text().trim();
}
