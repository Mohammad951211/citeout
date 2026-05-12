/**
 * POST /api/tools
 *
 * Central handler for all Research Tool requests.
 * Dispatches to the appropriate AI service based on `toolType`.
 *
 * Auth model:
 *  - HUMANIZE requires a session (registered users only).
 *  - All other tools allow guests with fingerprint-based usage (shared 5-use limit).
 *  - Registered users are never gated — session bypasses the guest counter.
 *
 * AI backend: Google Gemini 1.5 Flash (via @google/generative-ai)
 * Env var required: GOOGLE_GEMINI_API_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  translateText,
  paraphraseText,
  checkGrammar,
  humanizeText,
} from "@/lib/tools/gemini";
import { detectAI } from "@/lib/tools/aidetect";

// ── Runtime config ────────────────────────────────────────────────────────────
// REQUIRED: @google/generative-ai uses Node.js-only APIs (fetch internals,
// Buffer, etc.) that are not available on the Edge runtime. Without this
// declaration Next.js may silently route the handler to the Edge worker,
// causing the Gemini client to fail before it even sends a request.
export const runtime = "nodejs";

// Give AI calls up to 60 s to complete (Vercel Hobby plan maximum).
export const maxDuration = 60;

// ── Constants ─────────────────────────────────────────────────────────────────

const GUEST_LIMIT = 5;
const MAX_WORDS = 1500;

type ToolType = "TRANSLATE" | "PARAPHRASE" | "AI_DETECT" | "GRAMMAR" | "HUMANIZE";

interface ToolRequest {
  toolType: ToolType;
  inputText: string;
  targetLang?: "en" | "ar"; // TRANSLATE only
  fingerprint?: string;      // guests only
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Extract a human-readable message from any error, including Google API errors
 * which embed the HTTP status code in their message string, e.g.:
 *   "[400 Bad Request] API key not valid."
 *   "[429 Too Many Requests] Resource has been exhausted."
 */
function extractErrorMessage(error: unknown): {
  message: string;
  status: number;
} {
  if (!(error instanceof Error)) {
    return { message: "An unexpected error occurred.", status: 500 };
  }

  const msg = error.message;

  // Google SDK embeds the HTTP status in square brackets, e.g.
  //   "[GoogleGenerativeAI Error]: Error fetching ...: [429 Too Many Requests] ..."
  // Match the first [DDD Reason] block anywhere in the message.
  const googleMatch = msg.match(/\[(\d{3})[^\]]*\]\s*([^\n]*)/);
  if (googleMatch) {
    const httpStatus = parseInt(googleMatch[1], 10);
    const detail = googleMatch[2].trim().split("\n")[0];

    if (httpStatus === 400) return { message: `The AI request was malformed. (${detail})`, status: 502 };
    if (httpStatus === 401) return { message: "The AI service is not authorized. Check API credentials.", status: 502 };
    if (httpStatus === 403) return { message: "The AI service does not have permission for this operation.", status: 502 };
    if (httpStatus === 429) return { message: "Rate limit reached. Please try again in a few seconds.", status: 429 };
    if (httpStatus === 500 || httpStatus === 503) return { message: "The AI provider returned an error. Please try again.", status: 502 };

    return { message: detail || msg, status: 502 };
  }

  if (msg.includes("GOOGLE_GEMINI_API_KEY")) {
    return { message: "The AI service is not configured.", status: 500 };
  }

  return { message: msg, status: 500 };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = (await req.json()) as ToolRequest;
    const { toolType, inputText, targetLang = "en", fingerprint } = body;

    // ── 1. Basic validation ────────────────────────────────────────────────
    if (!toolType || !inputText?.trim()) {
      return NextResponse.json(
        { error: "toolType and inputText are required." },
        { status: 400 }
      );
    }

    const validTools: ToolType[] = [
      "TRANSLATE",
      "PARAPHRASE",
      "AI_DETECT",
      "GRAMMAR",
      "HUMANIZE",
    ];
    if (!validTools.includes(toolType)) {
      return NextResponse.json({ error: "Invalid toolType." }, { status: 400 });
    }

    // ── 2. Word limit ──────────────────────────────────────────────────────
    const wordCount = countWords(inputText);
    if (wordCount > MAX_WORDS) {
      return NextResponse.json(
        {
          error: `Text exceeds the ${MAX_WORDS.toLocaleString()}-word limit. Your text has ${wordCount.toLocaleString()} words.`,
        },
        { status: 422 }
      );
    }

    // ── 3. Auth gate: HUMANIZE requires a registered account ──────────────
    if (toolType === "HUMANIZE" && !session?.user) {
      return NextResponse.json(
        { error: "The Humanizer tool is available to registered users only. Please sign in." },
        { status: 401 }
      );
    }

    // ── 4. Guest usage gate (only when not logged in) ─────────────────────
    if (!session?.user) {
      if (!fingerprint) {
        return NextResponse.json(
          { error: "Fingerprint is required for guest usage." },
          { status: 400 }
        );
      }

      const usage = await prisma.guestUsage.findUnique({
        where: { fingerprint },
      });

      if (usage && usage.count >= GUEST_LIMIT) {
        return NextResponse.json(
          {
            error: "You have reached the free usage limit. Sign up for unlimited access.",
            limitReached: true,
          },
          { status: 429 }
        );
      }

      // Increment usage before processing (prevents double-submit abuse)
      await prisma.guestUsage.upsert({
        where: { fingerprint },
        update: { count: { increment: 1 }, lastUsedAt: new Date() },
        create: { fingerprint, count: 1, lastUsedAt: new Date() },
      });
    }

    // ── 5. Dispatch to tool ────────────────────────────────────────────────
    switch (toolType) {
      case "TRANSLATE": {
        const output = await translateText(inputText, targetLang);
        return NextResponse.json({ output, targetLang });
      }

      case "PARAPHRASE": {
        const output = await paraphraseText(inputText);
        return NextResponse.json({ output });
      }

      case "AI_DETECT": {
        const result = await detectAI(inputText);
        return NextResponse.json({
          output: result.details,
          score: result.score,
          classification: result.classification,
          configured: result.configured,
        });
      }

      case "GRAMMAR": {
        const result = await checkGrammar(inputText);
        return NextResponse.json({
          output: result.corrected,
          changes: result.changes,
        });
      }

      case "HUMANIZE": {
        const output = await humanizeText(inputText);
        return NextResponse.json({ output });
      }

      default:
        return NextResponse.json({ error: "Unknown toolType." }, { status: 400 });
    }
  } catch (error) {
    const { message, status } = extractErrorMessage(error);
    console.error(`[/api/tools] ${status} —`, error);
    return NextResponse.json({ error: message }, { status });
  }
}
