"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Sun,
  Moon,
  BookOpen,
  User,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Shield,
  Menu,
  X,
  Sparkles,
  Puzzle,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Primary site navigation.
 *
 * - Desktop (≥ md): horizontal nav bar with Generator / Research Tools / Extension
 *   in the centre, plus account dropdown on the right.
 * - Mobile (< md): hamburger button opens a slide-down panel listing the same
 *   primary routes. Critical so users can reach Research Tools on phones.
 */
export function Navbar() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-[var(--text-primary)] hover:opacity-80 transition-opacity"
          onClick={closeMobile}
        >
          <BookOpen size={20} className="text-brand" />
          <span className="text-lg">CiteOut</span>
        </Link>

        {/* Center nav — desktop only */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/cite"
            className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
          >
            Generator
          </Link>
          <Link
            href="/tools"
            className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
          >
            Research Tools
          </Link>
          <Link
            href="/extension"
            className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
          >
            Extension
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>

          {session ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] rounded-md transition-colors"
              >
                <span className="hidden sm:block max-w-[140px] truncate">
                  {session.user?.name ?? session.user?.email}
                </span>
                <span className="sm:hidden">
                  <User size={17} />
                </span>
                {(session.user as { role?: string })?.role === "ADMIN" && (
                  <span className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/10 text-brand border border-brand/20">
                    <Shield size={10} />
                    ADMIN
                  </span>
                )}
                <ChevronDown size={14} />
              </button>
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                    >
                      <LayoutDashboard size={15} />
                      Dashboard
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                    >
                      <BookOpen size={15} />
                      History
                    </Link>
                    {(session.user as { role?: string })?.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                      >
                        <User size={15} />
                        Admin
                      </Link>
                    )}
                    <hr className="my-1 border-[var(--border)]" />
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-[var(--border)] transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className={cn(
                  "px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-md"
                )}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm bg-brand text-white rounded-md hover:bg-brand-hover transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile hamburger — visible on phones only */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="px-4 py-3 flex flex-col gap-1">
            <Link
              href="/cite"
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            >
              <FileText size={18} className="text-brand" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Citation Generator</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Create accurate citations in APA, MLA, Chicago and more
                </span>
              </div>
            </Link>

            <Link
              href="/tools"
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            >
              <Sparkles size={18} className="text-brand" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Research Tools</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Translate, paraphrase, grammar, AI detect, humanize
                </span>
              </div>
            </Link>

            <Link
              href="/extension"
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            >
              <Puzzle size={18} className="text-brand" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Browser Extension</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  One-click citation capture from any page
                </span>
              </div>
            </Link>

            {!session && (
              <>
                <hr className="my-2 border-[var(--border)]" />
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className="flex-1 text-center px-4 py-2 text-sm rounded-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobile}
                    className="flex-1 text-center px-4 py-2 text-sm bg-brand text-white rounded-md hover:bg-brand-hover transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
