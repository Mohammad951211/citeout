import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Download, Zap, Globe, BookOpen, Copy } from "lucide-react";

const steps = [
  {
    step: "1",
    title: "Download the extension",
    description: 'Click "Download Extension" to get the .zip file.',
  },
  {
    step: "2",
    title: "Open Chrome Extensions",
    description: "Navigate to chrome://extensions/ in your Chrome browser.",
  },
  {
    step: "3",
    title: "Enable Developer Mode",
    description: "Toggle on Developer Mode in the top right corner.",
  },
  {
    step: "4",
    title: "Load unpacked",
    description: 'Click "Load unpacked" and select the extracted extension folder.',
  },
];

const features = [
  {
    icon: Zap,
    title: "One-click citation",
    description: "Click the CiteOut icon on any webpage to generate a citation instantly.",
  },
  {
    icon: Globe,
    title: "Auto-detect metadata",
    description: "Automatically extracts title, author, date, and publication info.",
  },
  {
    icon: BookOpen,
    title: "All 6 styles supported",
    description: "APA, MLA, Chicago, IEEE, Harvard, and Vancouver — right in your browser.",
  },
  {
    icon: Copy,
    title: "Instant copy",
    description: "Copy formatted citations to clipboard with a single click.",
  },
];

export default function ExtensionPage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-[1200px] mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
            CiteOut Browser Extension
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Generate citations from any webpage without leaving your browser. Available for Chrome
            (Manifest V3).
          </p>
          <a
            href="/extension/citeout-extension.zip"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors font-medium"
          >
            <Download size={18} />
            Download Extension
          </a>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Chrome · Manifest V3 · Free
          </p>
        </section>

        {/* Features */}
        <section className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="max-w-[1200px] mx-auto px-6 py-16">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-8 text-center">
              Features
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f: any) => (
                <div key={f.title} className="p-5 border border-[var(--border)] rounded-lg bg-bg">
                  <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center mb-3">
                    <f.icon size={18} className="text-brand" />
                  </div>
                  <h3 className="font-medium text-[var(--text-primary)] mb-1">{f.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Installation steps */}
        <section className="max-w-[1200px] mx-auto px-6 py-16">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-8 text-center">
            Installation
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {steps.map((s: any) => (
              <div
                key={s.step}
                className="flex gap-4 p-5 border border-[var(--border)] rounded-lg bg-[var(--surface)]"
              >
                <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-medium text-[var(--text-primary)] mb-1">{s.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
