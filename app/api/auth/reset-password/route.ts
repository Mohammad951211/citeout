import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// Single reusable response — identical wording for "not found" and "expired"
// so an attacker cannot distinguish between the two states.
const INVALID_TOKEN_RES = NextResponse.json(
  { error: "Invalid or expired reset token" },
  { status: 400 }
);

// ── Route ─────────────────────────────────────────────────────────────────────
//
// TODO: Apply rate limiting before this handler.
//   Even though brute-forcing a 64-char hex token is computationally infeasible,
//   rate limiting prevents enumeration of partial matches and protects server
//   resources.  Recommended: max 5 attempts per IP per 15 minutes.

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      token?: string;
      newPassword?: string;
    };

    const { token: rawToken, newPassword } = body;

    // ── Basic input validation ─────────────────────────────────────────────
    if (!rawToken || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // ── Lookup by hash (the raw token is never stored) ─────────────────────
    const tokenHash = hashToken(rawToken);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken) return INVALID_TOKEN_RES;

    // ── Expiry check ───────────────────────────────────────────────────────
    if (resetToken.expiresAt < new Date()) {
      // Clean up the stale record eagerly; ignore if it was already deleted.
      await prisma.passwordResetToken
        .delete({ where: { tokenHash } })
        .catch(() => null);

      return INVALID_TOKEN_RES;
    }

    // ── Atomic: update password + consume (delete) token ──────────────────
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      // 1. Set the new password on the user.
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      // 2. Invalidate the token so it can never be reused.
      prisma.passwordResetToken.delete({
        where: { tokenHash },
      }),
    ]);

    return NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
