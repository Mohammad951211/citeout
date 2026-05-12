"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BookOpen, MailCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Always show the same success state — never reveal whether the email is registered.
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <BookOpen size={22} className="text-brand" />
            <span className="text-lg font-semibold text-[var(--text-primary)]">CiteOut</span>
          </div>

          <div className="border border-[var(--border)] rounded-lg p-8 bg-[var(--surface)]">
            {sent ? (
              <div className="text-center">
                <MailCheck size={40} className="mx-auto mb-4 text-brand" />
                <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  Check your inbox
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  If <strong>{email}</strong> is registered, we&apos;ve sent a password reset link.
                  The link expires in <strong>1 hour</strong>.
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-3">
                  Didn&apos;t receive it? Check your spam folder or{" "}
                  <button
                    className="text-brand hover:underline"
                    onClick={() => setSent(false)}
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                  Forgot your password?
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  Enter your account email and we&apos;ll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <Button type="submit" loading={loading} className="w-full">
                    Send reset link
                  </Button>
                </form>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Remembered your password?{" "}
            <Link href="/login" className="text-brand hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
