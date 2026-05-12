"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BookOpen, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

// ── Inner component (needs useSearchParams, must be wrapped in Suspense) ──────

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    if (!token) setTokenMissing(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to reset password");
        return;
      }

      setDone(true);
      // Redirect to login after 3 s
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── No token in URL ────────────────────────────────────────────────────────
  if (tokenMissing) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-8 bg-[var(--surface)] text-center">
        <XCircle size={40} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Invalid reset link
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          This link is missing the reset token. Please request a new one.
        </p>
        <Link href="/forgot-password" className="text-brand hover:underline text-sm">
          Request a new link →
        </Link>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-8 bg-[var(--surface)] text-center">
        <CheckCircle size={40} className="mx-auto mb-4 text-green-500" />
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Password updated!
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Your password has been changed successfully. Redirecting you to sign in…
        </p>
      </div>
    );
  }

  // ── Default: password form ─────────────────────────────────────────────────
  return (
    <div className="border border-[var(--border)] rounded-lg p-8 bg-[var(--surface)]">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
        Set a new password
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Choose a strong password for your CiteOut account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="new-password"
          label="New password"
          type="password"
          placeholder="Min. 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Input
          id="confirm-password"
          label="Confirm new password"
          type="password"
          placeholder="Repeat your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} className="w-full">
          Update password
        </Button>
      </form>
    </div>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <BookOpen size={22} className="text-brand" />
            <span className="text-lg font-semibold text-[var(--text-primary)]">CiteOut</span>
          </div>

          <Suspense fallback={<div className="text-center text-sm text-[var(--text-secondary)]">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>

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
