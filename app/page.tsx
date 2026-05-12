import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowRight,
  BookOpen,
  Link2,
  FileText,
  Copy,
  CheckCircle,
  Zap,
  Languages,
  Pencil,
  ScanLine,
  SpellCheck,
  Sparkles,
} from "lucide-react";

const researchTools = [
  {
    icon: Languages,
    title: "Translate",
    description: "Academic English ↔ Arabic translation with MSA register.",
  },
  {
    icon: Pencil,
    title: "Paraphrase",
    description: "Rewrite passages with formal academic precision.",
  },
  {
    icon: ScanLine,
    title: "AI Detect",
    description: "Score any text for AI-generated patterns.",
  },
  {
    icon: SpellCheck,
    title: "Grammar",
    description: "Catch grammar, spelling, and style errors instantly.",
  },
  {
    icon: Sparkles,
    title: "Humanize",
    description: "Rewrite AI-generated text to sound natural.",
  },
];

const citationStyles = ["APA 7th", "MLA 9th", "IEEE", "Chicago 17th", "Harvard", "Vancouver"];

const steps = [
  {
    icon: Link2,
    title: "Input Source",
    description: "Paste a DOI, URL, or upload a PDF/DOCX file. Or enter details manually.",
  },
  {
    icon: BookOpen,
    title: "Select Style",
    description: "Choose from APA, MLA, Chicago, IEEE, Harvard, or Vancouver citation format.",
  },
  {
    icon: Copy,
    title: "Copy Citation",
    description: "Instantly copy your formatted citation or save it to your history.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Instant Generation",
    description: "Generate accurate citations in under a second using live metadata from CrossRef.",
  },
  {
    icon: FileText,
    title: "Multiple Sources",
    description: "DOIs, URLs, PDFs, DOCX files, and manual entry — all in one place.",
  },
  {
    icon: CheckCircle,
    title: "6 Citation Styles",
    description: "APA 7th, MLA 9th, Chicago 17th, IEEE, Harvard, and Vancouver formats.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-[1200px] mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] text-sm text-[var(--text-secondary)] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            Free to use &bull; No signup required
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] leading-tight mb-6 max-w-3xl mx-auto">
            Generate accurate citations{" "}
            <span className="text-brand">in seconds</span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-10">
            Paste a DOI, URL, or upload a paper. CiteOut extracts the metadata and formats it
            perfectly in APA, MLA, Chicago, IEEE, Harvard, or Vancouver.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link
              href="/cite"
              className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors font-medium"
            >
              Generate a citation
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--surface)] transition-colors"
            >
              Create free account
            </Link>
          </div>

          {/* Citation style pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {citationStyles.map((style: any) => (
              <span
                key={style}
                className="px-3 py-1.5 border border-[var(--border)] rounded-full text-sm text-[var(--text-secondary)] bg-[var(--surface)]"
              >
                {style}
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="max-w-[1200px] mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
                How it works
              </h2>
              <p className="text-[var(--text-secondary)]">Three steps to a perfect citation</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-8">
              {steps.map((step: any, i: any) => (
                <div key={step.title} className="text-center">
                  <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mx-auto mb-4">
                    <step.icon size={22} className="text-brand" />
                  </div>
                  <div className="text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                    Step {i + 1}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
              Everything you need
            </h2>
            <p className="text-[var(--text-secondary)]">
              Built for researchers, students, and academics
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((f: any) => (
              <div
                key={f.title}
                className="p-6 border border-[var(--border)] rounded-lg bg-[var(--surface)] hover:border-brand/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center mb-4">
                  <f.icon size={18} className="text-brand" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Research Tools showcase */}
        <section className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="max-w-[1200px] mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-medium mb-4">
                <Sparkles size={13} />
                AI-powered research suite
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] mb-3">
                More than citations
              </h2>
              <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
                A full toolkit of AI tools for academic writing — included free with every account.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
              {researchTools.map((tool) => (
                <Link
                  key={tool.title}
                  href="/tools"
                  className="group p-5 border border-[var(--border)] rounded-lg bg-[var(--bg)] hover:border-brand/40 hover:bg-[var(--surface)] transition-colors flex flex-col"
                >
                  <div className="w-9 h-9 rounded-md bg-brand/10 flex items-center justify-center mb-3 group-hover:bg-brand/20 transition-colors">
                    <tool.icon size={17} className="text-brand" />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-1">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {tool.description}
                  </p>
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--bg)] hover:border-brand/40 transition-colors text-sm font-medium"
              >
                Explore Research Tools
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-[var(--border)] bg-[var(--bg)]">
          <div className="max-w-[1200px] mx-auto px-6 py-20 text-center">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">
              Ready to generate your first citation?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              No account needed. Start with 5 free citations, then sign up for unlimited access.
            </p>
            <Link
              href="/cite"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors font-medium"
            >
              Try it now — it&apos;s free
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
