import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
        <p>
          &copy; 2026 All rights reserved - CiteOut |{" "}
          <a
            href="https://malghweri.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-primary)] hover:text-brand transition-colors"
          >
            Eng.Mohammad Alghweri
          </a>{" "}
          | Research is creating new knowledge
        </p>
        <div className="flex items-center gap-4">
          <Link href="/cite" className="hover:text-[var(--text-primary)] transition-colors">
            Generator
          </Link>
          <Link href="/extension" className="hover:text-[var(--text-primary)] transition-colors">
            Extension
          </Link>
        </div>
      </div>
    </footer>
  );
}
