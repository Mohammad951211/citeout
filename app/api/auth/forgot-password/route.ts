import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

// ── Config ────────────────────────────────────────────────────────────────────
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// ── Route ─────────────────────────────────────────────────────────────────────
//
// TODO: Apply rate limiting before this handler.
//   Recommended: max 3 requests per email per 15 minutes (per IP as a secondary
//   guard) using Upstash Ratelimit or a Redis-backed custom middleware.
//   Without it, an attacker can flood reset emails for any address.

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Generic response — never reveal whether the email is registered.
    const GENERIC_OK = NextResponse.json(
      {
        success: true,
        message: "If that email is registered, a password reset link has been sent.",
      },
      { status: 200 }
    );

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return GENERIC_OK; // silently drop unknown emails

    // Invalidate any outstanding tokens for this user (one active token at a time).
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Generate a cryptographically secure 32-byte token (64-char hex string).
    // Only this raw value is shared with the user via email — never stored.
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    // Send the reset link to the user's email.
    await sendPasswordResetEmail(email, rawToken);

    return GENERIC_OK;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
