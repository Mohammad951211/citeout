import { Resend } from "resend";

// Lazy getter — Resend is only instantiated at request time, never at build time.
// This prevents "Missing API key" errors during `next build` when env vars are absent.
function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY environment variable is not set.");
  return new Resend(apiKey);
}

// The "from" address must belong to a domain you have verified in Resend.
// While testing you can use Resend's shared sandbox: onboarding@resend.dev
function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? "CiteOut <noreply@citeout.site>";
}

// ── Password Reset ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  toEmail: string,
  rawToken: string
): Promise<void> {
  const resend = getResend();
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`;

  await resend.emails.send({
    from: getFromAddress(),
    to: toEmail,
    subject: "Reset your CiteOut password",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0"
                  style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="background:#2563EB;padding:28px 40px;text-align:center;">
                      <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                        📖 CiteOut
                      </span>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:36px 40px 28px;">
                      <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#09090b;">
                        Reset your password
                      </h1>
                      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b;">
                        We received a request to reset the password for your CiteOut account.
                        Click the button below — this link expires in <strong>1 hour</strong>.
                      </p>

                      <!-- CTA button -->
                      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                        <tr>
                          <td style="border-radius:8px;background:#2563EB;">
                            <a href="${resetUrl}"
                               style="display:inline-block;padding:13px 28px;font-size:15px;
                                      font-weight:600;color:#ffffff;text-decoration:none;
                                      border-radius:8px;">
                              Reset Password →
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 8px;font-size:13px;color:#71717a;">
                        Or copy this link into your browser:
                      </p>
                      <p style="margin:0 0 24px;font-size:12px;color:#2563EB;word-break:break-all;">
                        ${resetUrl}
                      </p>

                      <p style="margin:0;font-size:13px;color:#a1a1aa;">
                        If you didn't request this, you can safely ignore this email.
                        Your password won't change.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 40px;border-top:1px solid #f4f4f5;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#a1a1aa;">
                        © ${new Date().getFullYear()} CiteOut ·
                        <a href="https://citeout.site" style="color:#a1a1aa;">citeout.site</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}
